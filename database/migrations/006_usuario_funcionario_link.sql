-- ============================================================
-- FESTIFY — Migration 006: vínculo Usuario ↔ Funcionario
-- ============================================================
-- O app mobile (Festify Staff) precisa que um colaborador de campo
-- (garçom, recreador, recepcionista — tabela `funcionarios`) consiga logar
-- e ver as próprias escalas. Login hoje só existe para `usuarios`
-- (gerente/operador, usado pelo painel web) e as duas tabelas não têm
-- nenhuma relação entre si.
--
-- Esta migration adiciona uma FK opcional em `usuarios` apontando para
-- `funcionarios`, permitindo reaproveitar 100% do login JWT/bcrypt já
-- existente: uma conta de acesso passa a poder representar tanto um
-- operador de sistema quanto um funcionário de campo (ou ambos).
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_fun_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_usuarios_funcionario'
    ) THEN
        ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_funcionario
            FOREIGN KEY (usr_fun_id) REFERENCES funcionarios(fun_id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuarios_fun_id ON usuarios (usr_fun_id);

-- Um funcionário tem no máximo uma conta de login vinculada.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_funcionario ON usuarios (usr_fun_id)
    WHERE usr_fun_id IS NOT NULL;

COMMENT ON COLUMN usuarios.usr_fun_id IS 'Funcionário de campo vinculado a esta conta de login (opcional). Usado pelo app mobile Festify Staff para resolver "minhas escalas".';
