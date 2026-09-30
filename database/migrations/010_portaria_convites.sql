-- ============================================================
-- CELEBRI — Migration 010: portaria (convites com QR e contador)
-- ============================================================
-- Um convite representa 1 pessoa ou um grupo (família) com um único QR
-- code. A lista de convidados é opcional por evento: sem ela a portaria
-- funciona só com o contador de entradas avulsas.
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS evt_usa_convites BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS evt_qtd_avulsos INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS convites (
    cnv_id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnv_emp_id        UUID         NOT NULL REFERENCES empresas(emp_id),
    cnv_evt_id        UUID         NOT NULL REFERENCES eventos(evt_id) ON DELETE CASCADE,
    cnv_nome          VARCHAR(150) NOT NULL,
    cnv_telefone      VARCHAR(20),
    cnv_qtd_pessoas   INTEGER      NOT NULL DEFAULT 1 CHECK (cnv_qtd_pessoas >= 1),
    cnv_qtd_entrou    INTEGER      NOT NULL DEFAULT 0 CHECK (cnv_qtd_entrou >= 0),
    -- Conteúdo do QR: aleatório e único, não revela nada do convite.
    cnv_token         VARCHAR(64)  NOT NULL UNIQUE,
    cnv_criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cnv_atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cnv_deletado_em   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_convites_evento ON convites (cnv_evt_id) WHERE cnv_deletado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_convites_emp ON convites (cnv_emp_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_eventos_qtd_avulsos') THEN
        ALTER TABLE eventos ADD CONSTRAINT ck_eventos_qtd_avulsos CHECK (evt_qtd_avulsos >= 0);
    END IF;
END $$;
