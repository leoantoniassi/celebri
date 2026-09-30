-- ============================================================
-- CELEBRI — Migration 008: código de primeiro acesso (app mobile)
-- ============================================================
-- No app Celebri Staff o funcionário entra só com o e-mail cadastrado pelo
-- buffet e cria a própria senha. Para ninguém tomar a conta de outra pessoa
-- sabendo apenas o e-mail, a criação da senha exige um código de 6 dígitos
-- enviado para esse e-mail.
--
-- Guarda-se apenas o hash do código, e o número de tentativas erradas
-- limita força bruta (6 dígitos = 1 milhão de combinações).
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_codigo_hash VARCHAR(64);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_codigo_expiracao TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_codigo_tentativas INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN usuarios.usr_codigo_hash IS 'SHA-256 do código de 6 dígitos do primeiro acesso pelo app mobile.';
