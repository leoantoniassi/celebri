// Garantias de configuração de infraestrutura (Docker/CI) — Fase 7.
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const raiz = path.resolve(__dirname, '../../..');
const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
const carregarYaml = (rel) => (yaml.safeLoad ? yaml.safeLoad(ler(rel)) : yaml.load(ler(rel)));

describe('docker-compose.yml', () => {
  const compose = carregarYaml('docker-compose.yml');
  const { db, backend, frontend } = compose.services;

  test('postgres e backend não publicam portas no host', () => {
    expect(db.ports).toBeUndefined();
    expect(backend.ports).toBeUndefined();
  });

  test('somente o frontend publica porta (8080 do container)', () => {
    expect(frontend.ports).toHaveLength(1);
    expect(String(frontend.ports[0])).toMatch(/:8080$/);
  });

  test('override de dev publica apenas em loopback', () => {
    const dev = carregarYaml('docker-compose.dev.yml');
    [dev.services.db.ports, dev.services.backend.ports].forEach((ports) => {
      ports.forEach((p) => expect(String(p)).toMatch(/^127\.0\.0\.1:/));
    });
  });

  test('montagens de arquivos do host são somente leitura', () => {
    const binds = backend.volumes.filter((v) => /^\.\//.test(v));
    expect(binds.length).toBeGreaterThan(0);
    binds.forEach((v) => expect(v).toMatch(/:ro$/));
  });

  test('rede interna, healthchecks e hardening', () => {
    expect(compose.networks).toHaveProperty('backend');
    ['db', 'backend', 'frontend'].forEach((n) => {
      const s = compose.services[n];
      expect(s.networks).toContain('backend');
      expect(s.restart).toBe('unless-stopped');
      expect(s.healthcheck).toBeDefined();
      expect(s.security_opt).toContain('no-new-privileges:true');
    });
    expect(backend.cap_drop).toContain('ALL');
    expect(frontend.cap_drop).toContain('ALL');
    expect(backend.depends_on.db.condition).toBe('service_healthy');
    expect(frontend.depends_on.backend.condition).toBe('service_healthy');
  });

  test('imagens do compose sem :latest', () => {
    expect(db.image).not.toMatch(/:latest$|^[^:]+$/);
  });
});

describe('Dockerfiles', () => {
  test.each(['backend/Dockerfile', 'frontend/Dockerfile'])('%s não usa :latest', (f) => {
    const froms = ler(f).split('\n').filter((l) => /^FROM\s/i.test(l));
    expect(froms.length).toBeGreaterThan(0);
    froms.forEach((l) => expect(l).not.toMatch(/:latest|^FROM\s+[^:\s]+(\s|$)/i));
  });

  test('backend roda como node, em produção, com healthcheck', () => {
    const d = ler('backend/Dockerfile');
    expect(d).toMatch(/^USER node$/m);
    expect(d).toMatch(/NODE_ENV=production/);
    expect(d).toMatch(/npm ci --omit=dev/);
    expect(d).toMatch(/^HEALTHCHECK/m);
  });

  test('frontend usa nginx sem root e a porta bate com o nginx.conf', () => {
    const d = ler('frontend/Dockerfile');
    expect(d).toMatch(/nginxinc\/nginx-unprivileged/);
    expect(d).toMatch(/^EXPOSE 8080$/m);
    expect(ler('frontend/nginx.conf')).toMatch(/^\s*listen 8080;/m);
  });
});

describe('.dockerignore e repositório', () => {
  test('backend/.dockerignore exclui itens sensíveis', () => {
    const linhas = ler('backend/.dockerignore').split('\n').map((l) => l.trim());
    ['node_modules', '.env', '.env.*', 'uploads', 'test-db.js', 'test_email.js', 'src/__tests__'].forEach((i) => {
      expect(linhas).toContain(i);
    });
  });

  test('frontend/.dockerignore exclui itens essenciais', () => {
    const linhas = ler('frontend/.dockerignore').split('\n').map((l) => l.trim());
    ['node_modules', 'dist', '.env', '.env.*'].forEach((i) => expect(linhas).toContain(i));
  });

  test('scripts de dev saíram da raiz do backend', () => {
    expect(fs.existsSync(path.join(raiz, 'backend/test-db.js'))).toBe(false);
    expect(fs.existsSync(path.join(raiz, 'backend/test_email.js'))).toBe(false);
    expect(fs.existsSync(path.join(raiz, 'backend/scripts/dev/test-db.js'))).toBe(true);
  });

  test.each([
    '.github/workflows/ci.yml',
    '.github/workflows/codeql.yml',
    '.github/dependabot.yml',
    'SECURITY.md',
  ])('%s existe', (f) => {
    expect(fs.existsSync(path.join(raiz, f))).toBe(true);
  });

  test('workflows são YAML válido e CI audita dependências', () => {
    const ci = carregarYaml('.github/workflows/ci.yml');
    expect(Object.keys(ci.jobs)).toEqual(expect.arrayContaining(['backend', 'frontend']));
    expect(ler('.github/workflows/ci.yml')).toMatch(/npm audit --omit=dev --audit-level=high/);
    expect(carregarYaml('.github/workflows/codeql.yml')).toHaveProperty('jobs.analyze');
    expect(carregarYaml('.github/dependabot.yml').updates.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Auditoria de segurança da Fase 7', () => {
  const textoCompose = ler('docker-compose.yml');
  const compose = carregarYaml('docker-compose.yml');

  test('compose sem privileged, docker.sock, host network ou trust auth', () => {
    expect(textoCompose).not.toMatch(/privileged\s*:\s*true/);
    expect(textoCompose).not.toMatch(/docker\.sock/);
    expect(textoCompose).not.toMatch(/network_mode\s*:\s*["']?host/);
    expect(textoCompose).not.toMatch(/POSTGRES_HOST_AUTH_METHOD\s*:/);
    expect(textoCompose).not.toMatch(/:latest/);
  });

  test('credenciais do banco são obrigatórias no compose (sem default vazio)', () => {
    const { db, backend } = compose.services;
    expect(db.environment.POSTGRES_PASSWORD).toMatch(/^\$\{DB_PASS:\?/);
    expect(db.environment.POSTGRES_USER).toMatch(/^\$\{DB_USER:\?/);
    expect(backend.environment.DB_PASS).toMatch(/^\$\{DB_PASS:\?/);
    expect(backend.environment.JWT_SECRET).toMatch(/^\$\{JWT_SECRET:\?/);
  });

  test('script de init do banco montado somente leitura', () => {
    compose.services.db.volumes
      .filter((v) => /^\.\//.test(v))
      .forEach((v) => expect(v).toMatch(/:ro$/));
  });

  test.each(['backend/.dockerignore', 'frontend/.dockerignore'])('%s exclui chaves, dumps e .git', (f) => {
    const linhas = ler(f).split('\n').map((l) => l.trim());
    ['.git', '.env', '.env.*', '*.pem', '*.key', '*.sql'].forEach((i) => expect(linhas).toContain(i));
  });

  test('backend/.dockerignore exclui scripts de dev da imagem', () => {
    expect(ler('backend/.dockerignore').split('\n').map((l) => l.trim())).toContain('scripts/dev');
  });

  test('Dockerfiles sem segredos em ARG/ENV e sem curl|sh', () => {
    ['backend/Dockerfile', 'frontend/Dockerfile'].forEach((f) => {
      const d = ler(f);
      expect(d).not.toMatch(/^\s*(ARG|ENV)\s+\w*(SECRET|PASS|TOKEN|KEY)\w*/im);
      expect(d).not.toMatch(/(curl|wget)[^\n]*\|\s*(sh|bash)/);
    });
  });

  test.each(['ci.yml', 'codeql.yml'])('workflow %s: permissões mínimas, sem injeção, com timeout', (f) => {
    const texto = ler(`.github/workflows/${f}`);
    const wf = carregarYaml(`.github/workflows/${f}`);
    expect(wf.permissions).toEqual({ contents: 'read' });
    expect(texto).not.toMatch(/pull_request_target/);
    expect(texto).not.toMatch(/\$\{\{\s*github\.event/);
    expect(texto).not.toMatch(/secrets\./);
    Object.values(wf.jobs).forEach((job) => {
      expect(job['timeout-minutes']).toBeGreaterThan(0);
      (job.steps || []).filter((st) => /actions\/checkout/.test(st.uses || '')).forEach((st) => {
        expect(st.with['persist-credentials']).toBe(false);
      });
    });
  });

  test('security-events: write somente no job do CodeQL', () => {
    expect(ler('.github/workflows/ci.yml')).not.toMatch(/security-events/);
    expect(carregarYaml('.github/workflows/codeql.yml').jobs.analyze.permissions['security-events']).toBe('write');
  });

  test('Postgres do CI usa a mesma major do compose', () => {
    const ci = carregarYaml('.github/workflows/ci.yml');
    expect(ci.jobs.backend.services.postgres.image).toMatch(/^postgres:15/);
  });

  test('segredo de CI é claramente de teste', () => {
    const { JWT_SECRET, DB_PASS } = carregarYaml('.github/workflows/ci.yml').jobs.backend.env;
    expect(JWT_SECRET).toMatch(/ci-only/);
    expect(DB_PASS).toMatch(/ci-only/);
  });

  test('SECURITY.md destaca o placeholder e não promete bug bounty', () => {
    const t = ler('SECURITY.md');
    expect(t).toMatch(/PLACEHOLDER/);
    expect(t).toMatch(/n[ãa]o oferece programa de recompensa/i);
  });

  test('dev-up exporta COMPOSE_FILE só no processo do script e não usa eval', () => {
    const sh = ler('dev-up.sh');
    expect(sh).not.toMatch(/\beval\b/);
    expect(sh).toMatch(/export COMPOSE_FILE=/);
    expect(ler('dev-up.ps1')).not.toMatch(/Invoke-Expression|\biex\b/i);
  });

  test('scripts de dev recusam produção e não imprimem o erro completo', () => {
    ['test-db.js', 'test_email.js'].forEach((f) => {
      const t = ler(`backend/scripts/dev/${f}`);
      expect(t).toMatch(/NODE_ENV === 'production'/);
      expect(t).not.toMatch(/console\.error\([^)]*,\s*(err|error)\)/);
      expect(t).not.toMatch(/EMAIL_PASS|DB_PASS/);
    });
    expect(ler('backend/scripts/dev/test_email.js')).toMatch(/--enviar/);
  });
});
