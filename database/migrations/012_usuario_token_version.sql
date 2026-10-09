-- ============================================================
-- CELEBRI — Migration 012: versão do token de sessão (revogação de JWT)
-- ============================================================
-- O JWT carrega a versão (claim "tv") e o middleware auth compara com esta
-- coluna. Incrementar invalida todos os tokens já emitidos do usuário:
-- troca de senha, mudança de papel, suspensão da empresa.
--
-- Os tokens de convite/redefinição (usr_convite_token, usr_reset_token) passam
-- a guardar o SHA-256 do token (64 hex). Tokens antigos, em texto puro, não
-- são migrados: deixam de funcionar e apenas expiram (convite 24h, reset 1h).
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_token_version INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN usuarios.usr_token_version IS 'Versão do JWT; incrementar revoga as sessões abertas.';
COMMENT ON COLUMN usuarios.usr_convite_token IS 'SHA-256 do token de convite enviado por e-mail.';
COMMENT ON COLUMN usuarios.usr_reset_token IS 'SHA-256 do token de redefinição de senha enviado por e-mail.';
