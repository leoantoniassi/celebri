# Checklist de pré-publicação

Itens obrigatórios antes de expor o Celebri na internet. Durante a fase de testes
algumas coisas ficam propositalmente inseguras (marcadas "REMOVER ANTES DE PUBLICAR").

## Contas e segredos
- [ ] Remover contas e senha de teste (`123456`): `database/seed.sql`, `database/setup_producao.sql` (usuário `gerente@celebri.com`), `backend/src/seed.js`, `dev-up.sh`/`dev-up.ps1` (credenciais impressas) e a Postman collection. O seed deve abortar com `NODE_ENV=production`; o `setup_producao.sql` deve exigir senha inicial por variável com troca obrigatória no primeiro acesso.
- [ ] Rotacionar `JWT_SECRET` (novo valor: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`, mín. 32 caracteres) e a senha do banco. Os valores antigos (`mais_alegria_jwt_secret_2026`, `mais_alegria_2026`) estão no histórico do git e devem ser tratados como vazados.
- [ ] Nenhum `.env` versionado; segredos só por variável de ambiente/secret manager.
- [ ] Histórico do git (67 commits): além de `JWT_SECRET`/`DB_PASS` antigos, o histórico contém os nomes de container `mais_alegria_*` e a tabela de credenciais de dev do README antigo. Não há chaves privadas, tokens de API, URLs de conexão com senha nem credenciais SMTP no histórico (varredura feita). Se o repositório for publicado com histórico, rotacione os dois segredos acima e, de preferência, publique um repositório novo (squash) ou reescreva o histórico (`git filter-repo`).
- [ ] Rotacionar ao publicar: `JWT_SECRET`, senha do banco, credenciais SMTP (`EMAIL_USER/EMAIL_PASS`, se algum dia usadas em teste com conta real), senha de qualquer conta de seed que tenha sido usada em ambiente acessível e códigos/tokens de convite pendentes.
- [ ] A API recusa subir em `NODE_ENV=production` com `JWT_SECRET` ou `DB_PASS` ausente, curto ou de exemplo (`troque`, `changeme`, `secret`, `defina`...), e recusa `NODE_ENV` desconhecido (`prod`, `staging`).
- [ ] Segredos no compose chegam como `environment` (visíveis em `docker inspect`): em produção prefira Docker/Swarm secrets, secret manager do orquestrador, ou `env_file` com permissão 600; use `${DB_PASS:?}` também no compose (hoje só `JWT_SECRET` é obrigatório lá; a API valida `DB_PASS` no start).
- [ ] Arquivos versionados que não devem ir ao repositório público: `precificacao.docx`, `precificacao_revisada.md/.pdf/_tmp.html` (material comercial interno), `docs/Contrato de Prestação de Serviços — Celebri.pdf`, `database/coleDbeaver.sql`. Remova (`git rm`) ou mova para fora do repositório.
- [ ] Migrations rodam sob `pg_advisory_lock`: dois containers subindo juntos não aplicam a mesma migration em paralelo.

## Configuração
- [ ] `NODE_ENV=production`.
- [ ] `FRONTEND_URL` com a(s) origem(ns) HTTPS reais (CORS e links de e-mail; nunca `*`).
- [ ] `TRUST_PROXY` igual ao número real de proxies à frente da API (nginx/LB), nunca maior.
- [ ] `DEV_LOG_CODIGO_ACESSO` desligado (false/ausente).
- [ ] SMTP real configurado (`EMAIL_HOST/PORT/USER/PASS/FROM`) e e-mail de convite/recuperação testado.
  - Em `NODE_ENV=production` a API **não sobe** sem `EMAIL_HOST` (falha no start com mensagem clara): o código de primeiro acesso depende do e-mail, e sem provedor ele nunca chegaria.
- [ ] `DOCUMENTOS_DIR` apontando para um volume persistente com backup.
- [ ] SSL do banco com verificação: `DB_SSL=true` e `DB_SSL_CA` com a CA do provedor. Não usar `DB_SSL_REJECT_UNAUTHORIZED=false`.
- [ ] Migrations aplicam sem erro no start (a API aborta se falharem).

## Infraestrutura e transporte
- [ ] TLS 1.2/1.3 com certificado válido, redirect HTTP→HTTPS e HSTS.
- [ ] Firewall: só 80/443 públicos; Postgres e porta 3001 da API sem exposição externa; SSH por chave.
- [ ] Backups automáticos do banco e dos documentos, com restauração testada.
- [ ] Containers sem root, imagens atualizadas, SO com patches.

## Verificação final
- [ ] OWASP ZAP (baseline) e Nikto contra o ambiente publicado.
- [ ] SSL Labs (meta A) e securityheaders.com.
- [ ] Teste de permissões ponta a ponta (papéis e isolamento entre empresas).
- [ ] `npm audit --omit=dev` sem vulnerabilidades altas/críticas em backend e frontend.
