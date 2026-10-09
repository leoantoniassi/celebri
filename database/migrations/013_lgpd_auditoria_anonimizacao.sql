-- ============================================================
-- CELEBRI — Migration 013: LGPD (auditoria, anonimização, aceite de termos)
-- ============================================================
-- 1) auditoria: trilha de ações sensíveis (login, senha, papéis, acesso a
--    documentos, exportação/anonimização de titulares). A coluna aud_detalhes
--    NÃO guarda dados pessoais (e-mail, CPF, telefone, token, senha); a
--    sanitização é feita no serviço da API.
--    Sem FK para usuarios/empresas de propósito: o log sobrevive à remoção
--    do usuário e à exclusão do tenant.
-- 2) *_anonimizado_em: marca titulares cujos dados pessoais foram
--    substituídos (direito do art. 18 ou purge de retenção).
-- 3) usr_termos_*: aceite dos termos de uso/política de privacidade.
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria (
    aud_id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    aud_emp_id      UUID,
    aud_usr_id      UUID,
    aud_acao        VARCHAR(80)  NOT NULL,
    aud_entidade    VARCHAR(60),
    aud_entidade_id UUID,
    aud_ip          VARCHAR(64),
    aud_detalhes    JSONB,
    aud_criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_emp_criado ON auditoria (aud_emp_id, aud_criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidade   ON auditoria (aud_entidade, aud_entidade_id);

COMMENT ON TABLE auditoria IS 'Trilha de auditoria (LGPD). aud_detalhes nunca contém dados pessoais.';

ALTER TABLE clientes     ADD COLUMN IF NOT EXISTS cli_anonimizado_em TIMESTAMPTZ;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS fun_anonimizado_em TIMESTAMPTZ;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS for_anonimizado_em TIMESTAMPTZ;

-- convites nasce na migration 010 (depende de empresas); em bases só com init.sql não existe.
DO $$
BEGIN
    IF to_regclass('public.convites') IS NOT NULL THEN
        ALTER TABLE convites ADD COLUMN IF NOT EXISTS cnv_anonimizado_em TIMESTAMPTZ;
    END IF;
END $$;

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_termos_aceitos_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_termos_versao VARCHAR(20);
