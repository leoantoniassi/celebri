-- ============================================================
-- CELEBRI — Migration 009: escala no app mobile
-- ============================================================
-- 1. Intervalo mínimo entre escalas configurável por buffet (antes fixo
--    em 2h no código).
-- 2. Módulo do app ligado a cada função (cozinha, portaria, garçom), para
--    o app saber qual tela abrir mesmo com nomes de função livres.
-- 3. Função por escala: a mesma pessoa pode ser garçom num evento e
--    porteiro em outro. Nula = vale a função do cadastro.
-- 4. Confirmação de presença e check-in de chegada pelo app.
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

ALTER TABLE empresas ADD COLUMN IF NOT EXISTS emp_intervalo_escala_min INTEGER NOT NULL DEFAULT 120;

ALTER TABLE funcoes ADD COLUMN IF NOT EXISTS fnc_modulo VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_funcoes_modulo') THEN
        ALTER TABLE funcoes ADD CONSTRAINT ck_funcoes_modulo
            CHECK (fnc_modulo IS NULL OR fnc_modulo IN ('cozinha', 'portaria', 'garcom'));
    END IF;
END $$;

-- Palpite inicial pelos nomes mais comuns; o buffet ajusta no painel.
UPDATE funcoes SET fnc_modulo = 'garcom'
 WHERE fnc_modulo IS NULL AND (fnc_nome ILIKE 'gar%om%' OR fnc_nome ILIKE 'bartender%');
UPDATE funcoes SET fnc_modulo = 'cozinha'
 WHERE fnc_modulo IS NULL AND (fnc_nome ILIKE 'cozinh%' OR fnc_nome ILIKE 'copeir%' OR fnc_nome ILIKE 'chef%');
UPDATE funcoes SET fnc_modulo = 'portaria'
 WHERE fnc_modulo IS NULL AND (fnc_nome ILIKE 'recepcion%' OR fnc_nome ILIKE 'porteir%' OR fnc_nome ILIKE 'seguran%');

ALTER TABLE escala ADD COLUMN IF NOT EXISTS esc_fnc_id UUID;
ALTER TABLE escala ADD COLUMN IF NOT EXISTS esc_confirmacao VARCHAR(20) NOT NULL DEFAULT 'pendente';
ALTER TABLE escala ADD COLUMN IF NOT EXISTS esc_confirmado_em TIMESTAMP;
ALTER TABLE escala ADD COLUMN IF NOT EXISTS esc_checkin_em TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_escala_funcao') THEN
        ALTER TABLE escala ADD CONSTRAINT fk_escala_funcao
            FOREIGN KEY (esc_fnc_id) REFERENCES funcoes(fnc_id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_escala_confirmacao') THEN
        ALTER TABLE escala ADD CONSTRAINT ck_escala_confirmacao
            CHECK (esc_confirmacao IN ('pendente', 'confirmado', 'recusado'));
    END IF;
END $$;
