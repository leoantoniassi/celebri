-- ============================================================
-- CELEBRI — Migration 005: multilocação (emp_id em todas as tabelas)
-- ============================================================
-- Adiciona o vínculo de tenant nas 16 tabelas de negócio, faz o backfill
-- apontando os dados existentes para a empresa inaugural, e converte as
-- uniques globais em compostas com emp_id (dois buffets podem ter o mesmo
-- CPF de cliente, o mesmo CNPJ de fornecedor, etc).
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

-- ------------------------------------------------------------
-- 1..5. Coluna, backfill, FK, índice e NOT NULL nas 16 tabelas
-- ------------------------------------------------------------
DO $$
DECLARE
    v_emp_id UUID;
    r        RECORD;
    v_coluna TEXT;
BEGIN
    -- Empresa inaugural: recebe todos os dados que já existem no banco.
    -- Mantém as cores originais do Mais Alegria como paleta padrão.
    INSERT INTO empresas (emp_nome, emp_nome_fantasia, emp_slug)
    VALUES ('Mais Alegria', 'Mais Alegria', 'mais-alegria')
    ON CONFLICT (emp_slug) DO NOTHING;

    SELECT emp_id INTO v_emp_id FROM empresas WHERE emp_slug = 'mais-alegria';

    FOR r IN
        SELECT * FROM (VALUES
            ('usuarios',              'usr'),
            ('locais',                'loc'),
            ('funcoes',               'fnc'),
            ('categorias_fornecedor', 'caf'),
            ('categorias_produto',    'cap'),
            ('clientes',              'cli'),
            ('fornecedores',          'for'),
            ('funcionarios',          'fun'),
            ('produtos',              'prd'),
            ('orcamentos',            'orc'),
            ('eventos',               'evt'),
            ('documentos',            'doc'),
            ('catalogos',             'cat'),
            ('escala',                'esc'),
            ('evento_produto',        'evp'),
            ('orcamento_produto',     'orp')
        ) AS t(tabela, prefixo)
    LOOP
        v_coluna := r.prefixo || '_emp_id';

        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I UUID', r.tabela, v_coluna);

        EXECUTE format('UPDATE %I SET %I = $1 WHERE %I IS NULL', r.tabela, v_coluna, v_coluna)
        USING v_emp_id;

        -- FK para empresas
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_' || r.tabela || '_empresa'
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES empresas(emp_id)',
                r.tabela, 'fk_' || r.tabela || '_empresa', v_coluna
            );
        END IF;

        -- Índice: toda query passa a filtrar por esta coluna
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON %I (%I)',
            'idx_' || r.tabela || '_emp_id', r.tabela, v_coluna
        );

        -- usuarios fica de fora: super_admin (dono da plataforma) tem emp_id NULL.
        -- A regra é garantida pelo CHECK ck_usuarios_empresa, mais abaixo.
        IF r.tabela <> 'usuarios' THEN
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL', r.tabela, v_coluna);
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------
-- 6. Uniques globais → compostas com emp_id
-- ------------------------------------------------------------
-- Sem isso, o buffet B não consegue cadastrar um CPF/e-mail/CNPJ que o
-- buffet A já tem — o que é um cenário perfeitamente legítimo.

ALTER TABLE usuarios     DROP CONSTRAINT IF EXISTS usuarios_usr_email_key;
ALTER TABLE clientes     DROP CONSTRAINT IF EXISTS uq_clientes_email;
ALTER TABLE clientes     DROP CONSTRAINT IF EXISTS uq_clientes_rgcpf;
ALTER TABLE funcionarios DROP CONSTRAINT IF EXISTS uq_funcionarios_email;
ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS uq_fornecedores_email;
ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS uq_fornecedores_cnpj;
ALTER TABLE funcoes      DROP CONSTRAINT IF EXISTS uq_funcoes_nome;
ALTER TABLE categorias_fornecedor DROP CONSTRAINT IF EXISTS uq_categorias_fornecedor_nome;
ALTER TABLE categorias_produto    DROP CONSTRAINT IF EXISTS uq_categorias_produto_nome;

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_empresa_email
    ON usuarios (usr_emp_id, usr_email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_empresa_email
    ON clientes (cli_emp_id, cli_email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_empresa_rgcpf
    ON clientes (cli_emp_id, cli_rgcpf);
CREATE UNIQUE INDEX IF NOT EXISTS uq_funcionarios_empresa_email
    ON funcionarios (fun_emp_id, fun_email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedores_empresa_email
    ON fornecedores (for_emp_id, for_email);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedores_empresa_cnpj
    ON fornecedores (for_emp_id, for_cnpj);
CREATE UNIQUE INDEX IF NOT EXISTS uq_funcoes_empresa_nome
    ON funcoes (fnc_emp_id, fnc_nome);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_fornecedor_empresa_nome
    ON categorias_fornecedor (caf_emp_id, caf_nome);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categorias_produto_empresa_nome
    ON categorias_produto (cap_emp_id, cap_nome);

-- usr_convite_token e usr_reset_token continuam únicos globalmente:
-- são tokens aleatórios, e unicidade global é a garantia mais forte.

-- ------------------------------------------------------------
-- 7. Roles: introduz super_admin e resolve o conflito model × banco
-- ------------------------------------------------------------
-- Hoje o model aceita ['admin','gerente','operador'] mas o CHECK só
-- aceita ('gerente','operador') — 'admin' era inalcançável.

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_role;
ALTER TABLE usuarios ADD  CONSTRAINT ck_usuarios_role
    CHECK (usr_role IN ('super_admin', 'gerente', 'operador'));

-- super_admin é o dono da plataforma: não pertence a nenhum buffet.
-- Todo o resto obrigatoriamente pertence a um.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS ck_usuarios_empresa;
ALTER TABLE usuarios ADD  CONSTRAINT ck_usuarios_empresa CHECK (
    (usr_role  = 'super_admin' AND usr_emp_id IS NULL) OR
    (usr_role <> 'super_admin' AND usr_emp_id IS NOT NULL)
);

-- ------------------------------------------------------------
-- 8. Soft delete em usuarios (uniformiza com as outras 13 tabelas)
-- ------------------------------------------------------------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usr_deletado_em TIMESTAMP;

COMMENT ON COLUMN usuarios.usr_emp_id IS 'Buffet ao qual o usuário pertence. NULL apenas para super_admin.';
