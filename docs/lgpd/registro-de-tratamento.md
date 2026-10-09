# Registro das Operações de Tratamento (ROPA simplificado — LGPD art. 37)

> **Modelo — requer revisão jurídica.** Controlador: `[NOME DA EMPRESA]` (CNPJ `[CNPJ]`) · Encarregado: `[E-MAIL DO ENCARREGADO]` · Atualizado em: `[DATA]`

Legenda das bases (art. 7º): **I** consentimento · **II** obrigação legal/regulatória · **V** execução de contrato · **VI** exercício regular de direitos · **IX** legítimo interesse.

| # | Operação | Titulares | Dados | Finalidade | Base legal | Onde fica (sistema/tabela) | Compartilhamento | Retenção | Segurança |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Cadastro e relacionamento com clientes | Clientes | nome, CPF/RG, e-mail, telefone(s) | Orçamento, contrato, execução do evento, cobrança | V, II, VI | `clientes` | contador `[SE APLICÁVEL]` | 5 anos após exclusão, depois anonimizado | Acesso por papel, isolamento por empresa, auditoria |
| 2 | Orçamentos e eventos | Clientes | vínculo ao cliente, datas, valores, observações | Prestação do serviço, faturamento | V, II | `orcamentos`, `eventos` | contador | 5 anos (fiscal) | idem |
| 3 | Documentos/contratos | Clientes | arquivos (podem conter CPF, endereço, assinatura) | Prova contratual, obrigações legais | V, VI, II | `documentos` + pasta `uploads/` | — | 5 anos após fim do contrato | Acesso só ao painel; leitura registrada em `auditoria` (`documento.acessado`); caminhos validados |
| 4 | Gestão de equipe e escalas | Funcionários | nome, e-mail, telefone(s), função, escala, confirmação/check-in | Convocar e controlar presença | V, II, IX | `funcionarios`, `escala` | — | 5 anos após desligamento | idem; conta de campo só vê o próprio |
| 5 | Acesso ao app da equipe | Funcionários | e-mail, hash de senha, código de primeiro acesso (hash), aceite dos termos | Autenticação | V, IX | `usuarios` | e-mail (SMTP) para o código | durante o vínculo | bcrypt, expiração, limite de tentativas, revogação de sessão |
| 6 | Cadastro de fornecedores | Fornecedores | nome, CNPJ, e-mail, telefone | Contratação e pagamento | V, II | `fornecedores` | contador | 5 anos após exclusão | idem |
| 7 | Lista de convidados e portaria | Convidados | nome, telefone (opcional), nº de pessoas, entradas | Organização e segurança do evento | IX (I p/ WhatsApp) | `convites` | WhatsApp (`wa.me`), se usado | 180 dias após o evento | token aleatório no QR; acesso restrito à portaria |
| 8 | Gestão de usuários do painel | Usuários | nome, e-mail, papel, hash de senha, aceite de termos | Controle de acesso | V, IX, I (aceite) | `usuarios` | e-mail (SMTP) para convite/redefinição | enquanto houver vínculo | tokens guardados como hash; troca de senha revoga sessões |
| 9 | Envio de e-mails transacionais | Usuários, funcionários | e-mail, nome | Convite, código de acesso, redefinição | V, IX | SMTP `[PROVEDOR]` | provedor SMTP | conforme o provedor `[INFORMAR]` | TLS no SMTP |
| 10 | Auditoria e logs de segurança | Usuários e titulares afetados | IP, data/hora, ação, id interno (sem e-mail/CPF/telefone) | Segurança, investigação, prova | II (MCI art. 15), IX | `auditoria` | autoridades, se exigido | 12 meses | sanitização de chaves proibidas; acesso restrito |
| 11 | Atendimento de direitos do titular | Todos | dados do titular na exportação | Cumprir art. 18 | II | endpoints `/api/lgpd/...` | o próprio titular | exportação não é armazenada; ação registrada em `auditoria` | só gerente; sempre no tenant |
| 12 | Retenção e anonimização | Todos | — | Minimização (art. 16) | II | `npm run purge:retencao` | — | — | simulação por padrão; auditoria |
| 13 | Backup | Todos | cópia do banco e uploads | Continuidade e recuperação | IX, II | `scripts/backup.sh` → `[LOCAL]` | provedor de armazenamento | 30 dias (+12 meses mensal) | AES-256 (`BACKUP_PASSPHRASE`), permissão 600, SHA-256 |

## Operadores e subprocessadores

| Operador | Serviço | País | Contrato/DPA |
|---|---|---|---|
| `[PROVEDOR DA PLATAFORMA CELEBRI]` | Software e suporte | `[PAÍS]` | `[ANEXAR]` |
| `[PROVEDOR DE HOSPEDAGEM/NUVEM]` | Servidores, banco, backups | `[PAÍS]` | `[ANEXAR]` |
| `[PROVEDOR SMTP]` | Envio de e-mails | `[PAÍS]` | `[ANEXAR]` |

## Pendências conhecidas

* Criptografia de colunas sensíveis em repouso (CPF/telefone): **não implementada** nesta rodada; no backlog.
* MFA para gerentes e migração do JWT para cookie HttpOnly: backlog.
* Relatório de impacto (RIPD) — `[AVALIAR COM O DPO]`.
