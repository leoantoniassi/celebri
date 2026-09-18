-- ============================================================
-- CELEBRI — Migration 008: Atualiza nome e slug padrão para Celebri
-- ============================================================
-- Alinha a empresa padrão inaugural com o nome e identidade do sistema (Celebri).
-- ============================================================

DO $$
DECLARE
    v_celebri_id UUID;
    v_antigo_id  UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'mais-alegria') AND NOT EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'celebri') THEN
        UPDATE empresas
        SET emp_nome = 'Celebri',
            emp_nome_fantasia = 'Celebri',
            emp_slug = 'celebri'
        WHERE emp_slug = 'mais-alegria';
    ELSIF EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'mais-alegria') AND EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'celebri') THEN
        SELECT emp_id INTO v_celebri_id FROM empresas WHERE emp_slug = 'celebri';
        SELECT emp_id INTO v_antigo_id  FROM empresas WHERE emp_slug = 'mais-alegria';
        
        UPDATE usuarios SET usr_emp_id = v_celebri_id WHERE usr_emp_id = v_antigo_id;
        UPDATE locais SET loc_emp_id = v_celebri_id WHERE loc_emp_id = v_antigo_id;
        UPDATE funcoes SET fnc_emp_id = v_celebri_id WHERE fnc_emp_id = v_antigo_id;
        UPDATE categorias_fornecedor SET caf_emp_id = v_celebri_id WHERE caf_emp_id = v_antigo_id;
        UPDATE categorias_produto SET cap_emp_id = v_celebri_id WHERE cap_emp_id = v_antigo_id;
        UPDATE clientes SET cli_emp_id = v_celebri_id WHERE cli_emp_id = v_antigo_id;
        UPDATE fornecedores SET for_emp_id = v_celebri_id WHERE for_emp_id = v_antigo_id;
        UPDATE funcionarios SET fun_emp_id = v_celebri_id WHERE fun_emp_id = v_antigo_id;
        UPDATE produtos SET prd_emp_id = v_celebri_id WHERE prd_emp_id = v_antigo_id;
        UPDATE orcamentos SET orc_emp_id = v_celebri_id WHERE orc_emp_id = v_antigo_id;
        UPDATE eventos SET evt_emp_id = v_celebri_id WHERE evt_emp_id = v_antigo_id;
        UPDATE documentos SET doc_emp_id = v_celebri_id WHERE doc_emp_id = v_antigo_id;
        UPDATE escala SET esc_emp_id = v_celebri_id WHERE esc_emp_id = v_antigo_id;
        UPDATE evento_produto SET evp_emp_id = v_celebri_id WHERE evp_emp_id = v_antigo_id;
        UPDATE orcamento_produto SET orp_emp_id = v_celebri_id WHERE orp_emp_id = v_antigo_id;
        UPDATE catalogos SET cat_emp_id = v_celebri_id WHERE cat_emp_id = v_antigo_id;
        
        DELETE FROM empresas WHERE emp_id = v_antigo_id;
    END IF;
END $$;
