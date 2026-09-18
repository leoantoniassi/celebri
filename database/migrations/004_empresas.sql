-- ============================================================
-- CELEBRI — Migration 004: tabela empresas (raiz da multilocação)
-- ============================================================
-- Cada linha é um buffet/salão contratante do SaaS. É a partir daqui
-- que sai a identidade visual white label (logo + 3 cores base) e o
-- escopo de todos os dados de negócio (migration 005).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS empresas (
    emp_id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    emp_nome           VARCHAR(150) NOT NULL,
    emp_nome_fantasia  VARCHAR(150) NOT NULL,
    emp_slug           VARCHAR(60)  NOT NULL UNIQUE,
    emp_logo_url       VARCHAR(255),
    emp_cor_primaria   CHAR(7)      NOT NULL DEFAULT '#FEDC57',
    emp_cor_secundaria CHAR(7)      NOT NULL DEFAULT '#7DBA00',
    emp_cor_terciaria  CHAR(7)      NOT NULL DEFAULT '#6600A1',
    emp_email_contato  VARCHAR(150),
    emp_telefone       VARCHAR(20),
    emp_plano          VARCHAR(20)  NOT NULL DEFAULT 'basico',
    emp_status         VARCHAR(20)  NOT NULL DEFAULT 'ativo',
    emp_criado_em      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    emp_atualizado_em  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    emp_deletado_em    TIMESTAMP,

    CONSTRAINT ck_empresas_status CHECK (emp_status IN ('ativo', 'suspenso', 'cancelado')),
    CONSTRAINT ck_empresas_plano  CHECK (emp_plano  IN ('basico', 'profissional', 'enterprise')),
    CONSTRAINT ck_empresas_slug   CHECK (emp_slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
    CONSTRAINT ck_empresas_cores  CHECK (
        emp_cor_primaria   ~* '^#[0-9a-f]{6}$' AND
        emp_cor_secundaria ~* '^#[0-9a-f]{6}$' AND
        emp_cor_terciaria  ~* '^#[0-9a-f]{6}$'
    )
);

CREATE INDEX IF NOT EXISTS idx_empresas_slug
    ON empresas (emp_slug) WHERE emp_deletado_em IS NULL;

COMMENT ON TABLE  empresas                    IS 'Buffets/salões contratantes do SaaS Celebri (tenants).';
COMMENT ON COLUMN empresas.emp_slug           IS 'Identificador público e estável. É o "código da empresa" informado no login.';
COMMENT ON COLUMN empresas.emp_cor_primaria   IS 'Cor base do white label. As demais tonalidades Material 3 são derivadas no frontend.';
COMMENT ON COLUMN empresas.emp_status         IS 'ativo | suspenso | cancelado. Suspenso bloqueia login mas preserva os dados.';
