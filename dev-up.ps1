# ============================================================
# CELEBRI — sobe o ambiente de dev inteiro em um único comando
# ============================================================
# Uso: .\dev-up.ps1
#
# Equivalente PowerShell do dev-up.sh (use este se o "bash" do seu
# PowerShell resolver pro WSL em vez do Git Bash). Faz, em ordem:
# build + subida dos containers, migrations pendentes e seed dos
# dados fictícios. Para no primeiro erro em vez de seguir com o
# ambiente pela metade.
# ============================================================

Set-Location $PSScriptRoot

if (-not (Test-Path .env)) {
    Write-Host "Erro: arquivo .env não encontrado." -ForegroundColor Red
    Write-Host "Copie o template antes de continuar:  Copy-Item .env.example .env"
    Write-Host "Depois ajuste DB_PASS e gere um JWT_SECRET (ex: openssl rand -hex 32)."
    exit 1
}

function Invoke-Step {
    param([string]$Description, [string[]]$Command)
    Write-Host "==> $Description..."
    & $Command[0] $Command[1..($Command.Length - 1)]
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falhou: $Description (exit code $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

Invoke-Step "Subindo containers (build)" @("docker", "compose", "up", "-d", "--build")
Invoke-Step "Aplicando migrations pendentes" @("docker", "compose", "exec", "backend", "npm", "run", "migrate")
Invoke-Step "Rodando seed" @("docker", "compose", "exec", "backend", "npm", "run", "seed")

Write-Host ""
Write-Host "Ambiente no ar:"
Write-Host "  API:      http://localhost:3001/api/health"
Write-Host "  Frontend: http://localhost:8080"
Write-Host ""
Write-Host "Credenciais de teste (tenant: mais-alegria):"
Write-Host "  Gerente:  gerente@celebri.com  / 123456"
Write-Host "  Operador: operador@celebri.com / 123456"
