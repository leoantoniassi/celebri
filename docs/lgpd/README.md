# Documentação LGPD — Celebri

> **Aviso:** estes documentos são **modelos técnicos-operacionais** preparados a partir do que o sistema realmente faz.
> Antes de publicar ou usar com clientes, **devem passar por revisão jurídica** (advogado/DPO). Preencha os
> campos entre colchetes: `[NOME DA EMPRESA]`, `[CNPJ]`, `[E-MAIL DO ENCARREGADO]` (e demais `[...]`).

## Índice

| Documento | Para quê |
|---|---|
| [politica-de-privacidade.md](politica-de-privacidade.md) | Texto público: quais dados, finalidades, bases legais, direitos e contato |
| [termo-de-uso-e-consentimento.md](termo-de-uso-e-consentimento.md) | Termos aceitos pelos usuários do sistema + texto para o buffet informar convidados |
| [politica-de-retencao.md](politica-de-retencao.md) | Por quanto tempo guardamos cada dado e regra de anonimização |
| [plano-de-resposta-a-incidentes.md](plano-de-resposta-a-incidentes.md) | O que fazer, quem faz e em que prazo se houver vazamento/incidente |
| [politica-de-backup.md](politica-de-backup.md) | Frequência, retenção, criptografia e teste de restauração |
| [registro-de-tratamento.md](registro-de-tratamento.md) | ROPA simplificado (art. 37): tabela de operações de tratamento |

## O que o sistema já faz (implementação técnica)

| Requisito | Implementação |
|---|---|
| Trilha de auditoria | Tabela `auditoria` (migration `013`): login ok/falha, bloqueio de conta, troca/redefinição de senha, criação/remoção/mudança de papel e convite de usuário, acesso a documento, exportação/anonimização de titular, suspensão de empresa. `detalhes` **nunca** contém e-mail, CPF, telefone, nome, token ou senha (`backend/src/services/auditoriaService.js`). |
| Direito de acesso/portabilidade (art. 18, II e V) | `GET /api/lgpd/titulares/:tipo/:id/exportar` (gerente) — JSON em anexo. `tipo` = `cliente`, `funcionario`, `convidado` ou `fornecedor`. |
| Direito de eliminação/anonimização (art. 18, IV e VI) | `POST /api/lgpd/titulares/:tipo/:id/anonimizar` com `{"confirmacao": true}` (gerente). Irreversível; mantém dados financeiros/fiscais; recusa (409) se houver evento futuro ou em andamento. |
| Retenção | `npm run purge:retencao` (simulação) e `npm run purge:retencao -- --executar` em `backend/` — **não roda sozinho**. |
| Aceite de termos | `usuarios.usr_termos_aceitos_em` e `usr_termos_versao`; exigido no convite web (`/definir-senha`), opcional no app mobile. Versão vigente: `TERMOS_VERSAO` (padrão `1.0`). |
| Página pública | `/privacidade` (resumo da política + termos), com link no rodapé do login e no aceite. |
| Backup/restauração | `scripts/backup.sh`, `scripts/restore.sh`, `scripts/verificar-backup.sh`. |

## Decisões desta rodada e limitações

* **Sem criptografia de colunas em repouso** (CPF, telefone etc.) — decisão registrada; entra no backlog. Mitigações: acesso restrito ao banco,
  criptografia de disco/volume do provedor, backups criptografados (`BACKUP_PASSPHRASE`), TLS no banco quando externo.
* **Anonimização, não exclusão física:** orçamentos, eventos e documentos continuam existindo (obrigação legal/contratual, art. 16, I),
  apontando para o titular anonimizado. Arquivos enviados (documentos) **não** são apagados pela anonimização — avalie caso a caso.
* Backups antigos continuam contendo os dados anteriores à anonimização até expirarem (ver política de backup); em uma **restauração**, reaplique
  as anonimizações registradas na tabela `auditoria`.
* O app mobile (fora deste repositório) ainda não envia `aceiteTermos`; o aceite é gravado se vier `true`.
