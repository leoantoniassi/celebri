# Política de Backup e Restauração

> **Modelo — ajuste aos recursos reais da hospedagem e revise com o responsável de TI/jurídico.**

## 1. Escopo

| O que | Como |
|---|---|
| Banco PostgreSQL (todos os buffets) | `pg_dump -Fc` (formato custom, compactado) |
| Uploads/documentos (`/app/uploads`, volume `backend_uploads`) | `tar.gz` |
| Segredos (`.env`, `JWT_SECRET`, senhas) | **fora** do backup de dados; guardar em cofre de senhas |

## 2. Frequência e retenção

| Tipo | Frequência | Retenção |
|---|---|---|
| Backup completo (banco + uploads) | **diário** (madrugada, ex.: 02:30) | **30 dias** (`BACKUP_RETENCAO_DIAS=30`) |
| Cópia mensal (opcional) | 1º dia do mês, copiar o diário para armazenamento frio | **12 meses** |
| Antes de mudanças de risco (migration, purge de retenção) | manual | até validar a mudança |

Meta: **RPO 24 h** (perda máxima de um dia de dados) e **RTO 4 h** (tempo para voltar). Ajuste se o negócio exigir menos.

## 3. Onde guardar

* **Nunca só no mesmo servidor/volume da aplicação.** Enviar a cópia para outro local (outro provedor/região, bucket com versionamento e acesso restrito).
* Permissões: arquivos `600`, diretório `700` (o script já aplica). Acesso apenas ao responsável de TI.
* Cada arquivo tem um `.sha256` para conferir integridade antes de restaurar.

## 4. Criptografia

* Defina `BACKUP_PASSPHRASE` (longa, aleatória, guardada no cofre de senhas, **separada** do backup): o script grava `*.enc` com
  `openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt`. Sem a senha, o backup é irrecuperável — guarde-a com redundância.
* Sem `BACKUP_PASSPHRASE` o backup sai **sem criptografia** (o script avisa). Em produção, use sempre a senha, pois o dump contém CPF, telefones e hashes de senha.
* Transporte: use canal criptografado (SFTP/HTTPS) ao enviar para fora.

## 5. Scripts

```bash
# Backup (diretório padrão ./backups; usa docker compose exec no serviço db/backend)
BACKUP_PASSPHRASE='...' BACKUP_DIR=/srv/backups/celebri scripts/backup.sh

# Fora do compose (banco gerenciado): defina DATABASE_URL (e UPLOADS_DIR para os documentos)
DATABASE_URL='postgres://usuario:senha@host:5432/celebri?sslmode=require' scripts/backup.sh

# Verificar (restaura o mais recente em banco TEMPORÁRIO, confere tabelas e remove o banco)
BACKUP_PASSPHRASE='...' scripts/verificar-backup.sh

# Restaurar em banco novo (recomendado)
scripts/restore.sh --arquivo backups/celebri-db-AAAAMMDD-HHMMSS.dump.enc --banco celebri_restaurado

# Restaurar uploads (extrai numa pasta; copie depois para o volume)
scripts/restore.sh --arquivo <dump> --banco celebri_restaurado --uploads backups/celebri-uploads-...tar.gz.enc --uploads-destino /tmp/uploads-restaurados

# Sobrescrever PRODUÇÃO (último recurso): exige --confirmar e digitar "RESTAURAR <banco>"
scripts/restore.sh --arquivo <dump> --banco <DB_NAME> --confirmar
```

Agendamento (cron do servidor, exemplo):

```cron
30 2 * * *  cd /srv/celebri && BACKUP_PASSPHRASE="$(cat /etc/celebri/backup.pass)" BACKUP_DIR=/srv/backups/celebri scripts/backup.sh >> /var/log/celebri-backup.log 2>&1
```

Monitore o log e alerte se o backup falhar ou não houver arquivo novo em 26 h.

Salvaguardas do `restore.sh`: nunca sobrescreve produção sem `--confirmar` + confirmação digitada; recusa banco existente sem `--confirmar`; valida o nome do banco; confere o checksum e se a senha abre o arquivo **antes** de alterar qualquer coisa; remove o banco novo se a restauração falhar; uploads só são extraídos em pasta informada.
Uso de `DATABASE_URL` coloca a senha na linha de comando do processo — prefira variáveis `PG*`/`~/.pgpass` em servidores compartilhados.

## 6. Teste de restauração — **trimestral**

1. Rodar `scripts/verificar-backup.sh` (restaura o último backup num banco temporário, confere a contagem de tabelas e tabelas-chave: `usuarios`, `clientes`, `empresas`, `schema_migrations`).
2. Uma vez por ano, fazer um **ensaio completo**: restaurar em banco novo + uploads, subir a API apontando para ele e abrir uma empresa de teste, medindo o tempo (RTO).
3. Registrar: data, arquivo, resultado, tempo, responsável.

| Data | Arquivo | Resultado | Tempo | Responsável |
|---|---|---|---|---|
| | | | | |

## 7. Backups e direitos do titular

Backups contêm os dados como eram no momento da cópia. Quando um titular pede eliminação/anonimização, o dado sai da base viva imediatamente e dos backups
quando estes expiram (≤ 30 dias; cópias mensais ≤ 12 meses). Em qualquer **restauração**, reaplique as anonimizações/eliminações registradas na tabela `auditoria`
após a data do backup (ver `plano-de-resposta-a-incidentes.md`, seção 5) para não ressuscitar dados eliminados.

## 8. Responsável

`[NOME DO RESPONSÁVEL DE TI]` — revisão desta política: anual.
