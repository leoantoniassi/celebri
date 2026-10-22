# ============================================================
# CELEBRI — sobe o ambiente de dev inteiro em um único comando
# ============================================================
# Uso: .\dev-up.ps1
#
# Faz, em ordem:
#  1. pré-checagens (Docker Compose >= 2.24 e Absence de porta duplicada);
#  2. build + subida dos containers;
#  3. migrations pendentes e seed dos dados fictícios.
# Para no primeiro erro em vez de seguir com o ambiente pela metade.
#
# No dev o frontend é o Vite (HMR) publicado em 127.0.0.1:${WEB_PORT:-8080}
# -> container 5173; Postgres e API ficam só em loopback.
# ============================================================

Set-Location $PSScriptRoot

if (-not (Test-Path .env)) {
    Write-Host "Erro: arquivo .env não encontrado." -ForegroundColor Red
    Write-Host "Copie o template antes de continuar:  Copy-Item .env.example .env"
    Write-Host "Depois ajuste DB_PASS e gere um JWT_SECRET (ex: openssl rand -hex 32)."
    exit 1
}

# Dev: junta o override que publica Postgres/API/frontend em 127.0.0.1
# (o compose principal não publica db/backend).
$env:COMPOSE_PATH_SEPARATOR = ":"
$env:COMPOSE_FILE = "docker-compose.yml:docker-compose.dev.yml"

function Invoke-Step {
    param([string]$Description, [string[]]$Command)
    Write-Host "==> $Description..."
    & $Command[0] $Command[1..($Command.Length - 1)]
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falhou: $Description (exit code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# Porta do host do frontend (mesma variável usada pelo compose).
function Get-WebPort {
    $linha = Select-String -LiteralPath ".env" -Pattern '^\s*WEB_PORT\s*=\s*(\S+)\s*$' |
        Select-Object -First 1
    if ($linha) { return $linha.Matches[0].Groups[1].Value }
    return "8080"
}

# O override de dev usa a tag YAML `!override` (Compose >= 2.24) para
# substituir a lista de portas do compose base em vez de concatená-la
# (duas bindings na mesma porta do host => "port is already allocated").
function Test-ComposeSuportaOverride {
    $raw = & docker compose version --short 2>$null
    if (-not $raw) { return $null }
    $limpo = (($raw -join "").Trim() -replace "^v", "")
    if ($limpo -notmatch "^(\d+)\.(\d+)") { return $null }
    return [version]::new([int]$Matches[1], [int]$Matches[2])
}

# Pré-checagem: nenhuma porta do host pode estar publicada por dois serviços
# ao mesmo tempo (o mesmo defeito que derrubava a subida do ambiente).
function Test-PortaDuplicada {
    $json = & docker compose config --format json 2>$null
    if (-not $json) { return $null }
    try {
        $cfg = (($json -join "`n")) | ConvertFrom-Json
    } catch {
        return $null
    }
    $porPorta = @{}
    foreach ($servico in $cfg.services.PSObject.Properties) {
        foreach ($p in $servico.Value.ports) {
            if (-not $p.published) { continue }
            $chave = [string]$p.published
            if (-not $porPorta.ContainsKey($chave)) {
                $porPorta[$chave] = @()
            }
            $porPorta[$chave] += [pscustomobject]@{
                Servico   = $servico.Name
                HostIp    = if ($p.host_ip) { $p.host_ip } else { "0.0.0.0" }
                Published = $chave
                Target    = $p.target
            }
        }
    }
    foreach ($chave in $porPorta.Keys) {
        $lista = $porPorta[$chave]
        $wildcards = @($lista | Where-Object { $_.HostIp -eq "0.0.0.0" })
        if ($wildcards.Count -gt 0 -and $lista.Count -gt 1) {
            return @($lista)
        }
        $iguais = @($lista | Group-Object HostIp | Where-Object { $_.Count -gt 1 })
        if ($iguais.Count -gt 0) {
            return @($lista)
        }
    }
    return $null
}

$versaoCompose = Test-ComposeSuportaOverride
if ($versaoCompose -and $versaoCompose -lt [version]"2.24.0") {
    Write-Host "Erro: Docker Compose $versaoCompose é antigo demais (mínimo 2.24)." -ForegroundColor Red
    Write-Host "O override de dev usa a tag YAML '!override' (Compose >= 2.24) para evitar"
    Write-Host "portas duplicadas no merge. Atualize o Docker Desktop e tente de novo."
    exit 1
}

$conflito = Test-PortaDuplicada
if ($conflito) {
    Write-Host "Erro: o compose resolvido publica a mesma porta do host mais de uma vez." -ForegroundColor Red
    foreach ($c in $conflito) {
        Write-Host ("  - {0}: host {1}:{2} -> container {3}" -f $c.Servico, $c.HostIp, $c.Published, $c.Target)
    }
    Write-Host "Corrija o override (use a tag '!override' em 'ports') antes de subir."
    exit 1
}

Invoke-Step "Subindo containers (build)" @("docker", "compose", "up", "-d", "--build")
Invoke-Step "Aplicando migrations pendentes" @("docker", "compose", "exec", "backend", "npm", "run", "migrate")
Invoke-Step "Rodando seed" @("docker", "compose", "exec", "backend", "npm", "run", "seed")

$webPort = Get-WebPort
Write-Host ""
Write-Host "Aguardando o frontend responder..."
$url = "http://localhost:$webPort"
$pronto = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $resposta = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($resposta.StatusCode -ge 200 -and $resposta.StatusCode -lt 400) {
            $pronto = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $pronto) {
    Write-Host "Aviso: o frontend ainda não respondeu em $url (veja 'docker compose logs frontend')." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Ambiente no ar (dev):"
Write-Host "  Frontend: http://localhost:$webPort  (Vite, HMR)"
Write-Host "  API:      http://127.0.0.1:3001/api/health"
Write-Host "  Postgres: 127.0.0.1:5432"
Write-Host ""
Write-Host "Credenciais de teste (tenant: celebri):"
Write-Host "  Gerente:  gerente@celebri.com  / 123456"
Write-Host "  Operador: operador@celebri.com / 123456"
