-- ============================================================
-- PROJETO MAIS ALEGRIA - DADOS FICTÍCIOS (20 REGISTROS POR TABELA)
-- ============================================================

TRUNCATE
    usuarios, clientes, funcionarios, fornecedores, produtos,
    orcamentos, eventos, documentos, catalogos, escala,
    evento_produto, orcamento_produto,
    locais, funcoes, categorias_fornecedor, categorias_produto
RESTART IDENTITY CASCADE;

-- ------------------------------------------------------------
-- Este arquivo é anterior à migration 005 (multilocação) e nunca foi
-- atualizado para preencher emp_id. Em vez de reescrever as 300+ linhas
-- abaixo, define um DEFAULT temporário em cada coluna *_emp_id apontando
-- pro tenant inaugural (mais-alegria) — removido no fim do arquivo.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_emp_id UUID;
BEGIN
    SELECT emp_id INTO v_emp_id FROM empresas WHERE emp_slug = 'mais-alegria';
    IF v_emp_id IS NULL THEN
        RAISE EXCEPTION 'Empresa "mais-alegria" não encontrada — rode as migrations antes do seed.';
    END IF;

    EXECUTE format('ALTER TABLE usuarios ALTER COLUMN usr_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE locais ALTER COLUMN loc_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE funcoes ALTER COLUMN fnc_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE categorias_fornecedor ALTER COLUMN caf_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE categorias_produto ALTER COLUMN cap_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE clientes ALTER COLUMN cli_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE fornecedores ALTER COLUMN for_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE funcionarios ALTER COLUMN fun_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE produtos ALTER COLUMN prd_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE orcamentos ALTER COLUMN orc_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE eventos ALTER COLUMN evt_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE documentos ALTER COLUMN doc_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE catalogos ALTER COLUMN cat_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE escala ALTER COLUMN esc_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE evento_produto ALTER COLUMN evp_emp_id SET DEFAULT %L', v_emp_id);
    EXECUTE format('ALTER TABLE orcamento_produto ALTER COLUMN orp_emp_id SET DEFAULT %L', v_emp_id);
END $$;

-- 0. USUARIOS
INSERT INTO usuarios (usr_nome, usr_email, usr_senha, usr_role) VALUES
('Gerente',  'gerente@festify.com',  '$2a$10$Nq.Tgkmz8Dz4/s9KWP.NDOSD33LH4pGBrGsnd5R3F/kqoymkRpyoa', 'gerente'),
('Operador',  'operador@festify.com', '$2a$10$Nq.Tgkmz8Dz4/s9KWP.NDOSD33LH4pGBrGsnd5R3F/kqoymkRpyoa', 'operador');

-- L. LOCAIS
INSERT INTO locais (loc_nome, loc_logradouro, loc_numero, loc_bairro, loc_cidade, loc_estado, loc_cep, loc_capacidade_maxima) VALUES
('Salão 1', 'Rua Treze de Maio', '749', 'Santo Antônio', 'Jaú', 'SP', '17202-180', 150),
('Salão 2', 'Avenida Isaltino do Amaral Carvalho', 'S/N', 'Chácara Bela Vista', 'Jaú', 'SP', '17209-010', 250),
('Externo', 'Local Externo', 'S/N', 'Zona Rural', 'Jaú', 'SP', '00000-000', NULL);

-- F. FUNCOES
INSERT INTO funcoes (fnc_nome, fnc_descricao) VALUES
('Recreador', 'Descrição para Recreador'),
('Garçom', 'Descrição para Garçom'),
('Cozinheiro', 'Descrição para Cozinheiro'),
('Segurança', 'Descrição para Segurança'),
('Recepcionista', 'Descrição para Recepcionista'),
('Fotógrafo', 'Descrição para Fotógrafo'),
('Animador', 'Descrição para Animador'),
('DJ', 'Descrição para DJ'),
('Auxiliar Limpeza', 'Descrição para Auxiliar Limpeza'),
('Bartender', 'Descrição para Bartender'),
('Mestre Cerimônias', 'Descrição para Mestre Cerimônias'),
('Decorador', 'Descrição para Decorador'),
('Cerimonialista', 'Descrição para Cerimonialista'),
('Manobrista', 'Descrição para Manobrista'),
('Técnico Som', 'Descrição para Técnico Som'),
('Técnico Luz', 'Descrição para Técnico Luz'),
('Maquiador', 'Descrição para Maquiador'),
('Mágico', 'Descrição para Mágico'),
('Palhaço', 'Descrição para Palhaço'),
('Coordenador', 'Descrição para Coordenador');

-- CF. CATEGORIAS_FORNECEDOR
INSERT INTO categorias_fornecedor (caf_nome, caf_descricao) VALUES
('Alimentos', 'Fornecedores de Alimentos'),
('Decoração', 'Fornecedores de Decoração'),
('Bebidas', 'Fornecedores de Bebidas'),
('Som', 'Fornecedores de Som'),
('Iluminação', 'Fornecedores de Iluminação'),
('Mobiliário', 'Fornecedores de Mobiliário'),
('Flores', 'Fornecedores de Flores'),
('Brinquedos', 'Fornecedores de Brinquedos'),
('Impressão', 'Fornecedores de Impressão'),
('Transporte', 'Fornecedores de Transporte'),
('Tecidos', 'Fornecedores de Tecidos'),
('Embalagens', 'Fornecedores de Embalagens'),
('Limpeza', 'Fornecedores de Limpeza'),
('Segurança Privada', 'Fornecedores de Segurança Privada'),
('Descartáveis', 'Fornecedores de Descartáveis'),
('Lembrancinhas', 'Fornecedores de Lembrancinhas'),
('Fotografia', 'Fornecedores de Fotografia'),
('Vídeo', 'Fornecedores de Vídeo'),
('Atrações', 'Fornecedores de Atrações'),
('Geradores', 'Fornecedores de Geradores');

-- CP. CATEGORIAS_PRODUTO
INSERT INTO categorias_produto (cap_nome, cap_descricao) VALUES
('Alimento', 'Produtos de Alimento'),
('Bebida', 'Produtos de Bebida'),
('Descartável', 'Produtos de Descartável'),
('Decoração', 'Produtos de Decoração'),
('Limpeza', 'Produtos de Limpeza'),
('EPI', 'Produtos de EPI'),
('Móvel', 'Produtos de Móvel'),
('Eletrônico', 'Produtos de Eletrônico'),
('Brinquedo', 'Produtos de Brinquedo'),
('Ferramenta', 'Produtos de Ferramenta'),
('Utensílio', 'Produtos de Utensílio'),
('Papelaria', 'Produtos de Papelaria'),
('Embalagem', 'Produtos de Embalagem'),
('Uniforme', 'Produtos de Uniforme'),
('Som', 'Produtos de Som'),
('Iluminação', 'Produtos de Iluminação'),
('Lembrança', 'Produtos de Lembrança'),
('Ingrediente', 'Produtos de Ingrediente'),
('Bebida Alcoólica', 'Produtos de Bebida Alcoólica'),
('Doce', 'Produtos de Doce');

-- 1. CLIENTES
INSERT INTO clientes (cli_nome, cli_email, cli_rgcpf, cli_telefone) VALUES
('Ana Souza', 'ana.souza@email.com', '111.111.111-01', '(11) 90000-0001'),
('Bruno Lima', 'bruno.lima@email.com', '111.111.111-02', '(11) 90000-0002'),
('Carlos Santos', 'carlos.santos@email.com', '111.111.111-03', '(11) 90000-0003'),
('Daniela Ferreira', 'daniela.ferreira@email.com', '111.111.111-04', '(11) 90000-0004'),
('Eduardo Costa', 'eduardo.costa@email.com', '111.111.111-05', '(11) 90000-0005'),
('Fernanda Alves', 'fernanda.alves@email.com', '111.111.111-06', '(11) 90000-0006'),
('Gabriel Pereira', 'gabriel.pereira@email.com', '111.111.111-07', '(11) 90000-0007'),
('Helena Ribeiro', 'helena.ribeiro@email.com', '111.111.111-08', '(11) 90000-0008'),
('Igor Rocha', 'igor.rocha@email.com', '111.111.111-09', '(11) 90000-0009'),
('Juliana Mendes', 'juliana.mendes@email.com', '111.111.111-10', '(11) 90000-0010'),
('Leonardo Silva', 'leonardo.silva@email.com', '111.111.111-11', '(11) 90000-0011'),
('Mariana Carvalho', 'mariana.carvalho@email.com', '111.111.111-12', '(11) 90000-0012'),
('Nicolas Martins', 'nicolas.martins@email.com', '111.111.111-13', '(11) 90000-0013'),
('Olivia Barros', 'olivia.barros@email.com', '111.111.111-14', '(11) 90000-0014'),
('Pedro Gomes', 'pedro.gomes@email.com', '111.111.111-15', '(11) 90000-0015'),
('Quintino Pires', 'quintino.pires@email.com', '111.111.111-16', '(11) 90000-0016'),
('Rafaela Nogueira', 'rafaela.nogueira@email.com', '111.111.111-17', '(11) 90000-0017'),
('Samuel Dias', 'samuel.dias@email.com', '111.111.111-18', '(11) 90000-0018'),
('Tatiana Monteiro', 'tatiana.monteiro@email.com', '111.111.111-19', '(11) 90000-0019'),
('Vinicius Castro', 'vinicius.castro@email.com', '111.111.111-20', '(11) 90000-0020');

-- 2. FORNECEDORES
INSERT INTO fornecedores (for_nome, for_email, for_cnpj, for_telefone, for_caf_id) VALUES
('Quitutes da Vovó', 'quitutesdavov@email.com', '11.111.111/0001-01', '(11) 80000-0001', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Alimentos')),
('DecoraFest', 'decorafest@email.com', '11.111.111/0001-02', '(11) 80000-0002', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Decoração')),
('Bebidas Premium', 'bebidaspremium@email.com', '11.111.111/0001-03', '(11) 80000-0003', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Bebidas')),
('Som e Cia', 'somecia@email.com', '11.111.111/0001-04', '(11) 80000-0004', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Som')),
('Luzes Brilhantes', 'luzesbrilhantes@email.com', '11.111.111/0001-05', '(11) 80000-0005', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Iluminação')),
('Móveis Elegance', 'mveiselegance@email.com', '11.111.111/0001-06', '(11) 80000-0006', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Mobiliário')),
('Floricultura Jardim', 'floriculturajardim@email.com', '11.111.111/0001-07', '(11) 80000-0007', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Flores')),
('Brinquedos Divertidos', 'brinquedosdivertidos@email.com', '11.111.111/0001-08', '(11) 80000-0008', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Brinquedos')),
('Gráfica Rápida', 'grficarpida@email.com', '11.111.111/0001-09', '(11) 80000-0009', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Impressão')),
('Transportes Seguros', 'transportesseguros@email.com', '11.111.111/0001-10', '(11) 80000-0010', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Transporte')),
('Tecidos Finos', 'tecidosfinos@email.com', '11.111.111/0001-11', '(11) 80000-0011', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Tecidos')),
('Embalagens Práticas', 'embalagensprticas@email.com', '11.111.111/0001-12', '(11) 80000-0012', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Embalagens')),
('Limpeza Total', 'limpezatotal@email.com', '11.111.111/0001-13', '(11) 80000-0013', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Limpeza')),
('Guardiões Segurança', 'guardiessegurana@email.com', '11.111.111/0001-14', '(11) 80000-0014', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Segurança Privada')),
('Descartáveis Mais', 'descartveismais@email.com', '11.111.111/0001-15', '(11) 80000-0015', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Descartáveis')),
('Lembranças Criativas', 'lembranascriativas@email.com', '11.111.111/0001-16', '(11) 80000-0016', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Lembrancinhas')),
('FotoArte', 'fotoarte@email.com', '11.111.111/0001-17', '(11) 80000-0017', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Fotografia')),
('VídeoMaker Pro', 'vdeomakerpro@email.com', '11.111.111/0001-18', '(11) 80000-0018', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Vídeo')),
('Animação Total', 'animaototal@email.com', '11.111.111/0001-19', '(11) 80000-0019', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Atrações')),
('Geradores de Energia MS', 'geradoresdeenergiams@email.com', '11.111.111/0001-20', '(11) 80000-0020', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Geradores'));

-- 3. FUNCIONARIOS
INSERT INTO funcionarios (fun_nome, fun_email, fun_telefone, fun_fnc_id) VALUES
('Alice Rodrigues', 'alicerodrigues@email.com', '(11) 70000-0001', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Recreador')),
('Bernardo Almeida', 'bernardoalmeida@email.com', '(11) 70000-0002', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Garçom')),
('Camila Neves', 'camilaneves@email.com', '(11) 70000-0003', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Cozinheiro')),
('Diego Farias', 'diegofarias@email.com', '(11) 70000-0004', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Segurança')),
('Elisa Cardoso', 'elisacardoso@email.com', '(11) 70000-0005', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Recepcionista')),
('Felipe Machado', 'felipemachado@email.com', '(11) 70000-0006', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Fotógrafo')),
('Giovana Moura', 'giovanamoura@email.com', '(11) 70000-0007', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Animador')),
('Henrique Castro', 'henriquecastro@email.com', '(11) 70000-0008', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'DJ')),
('Isadora Lopes', 'isadoralopes@email.com', '(11) 70000-0009', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Auxiliar Limpeza')),
('João Batista', 'joobatista@email.com', '(11) 70000-0010', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Bartender')),
('Karina Teixeira', 'karinateixeira@email.com', '(11) 70000-0011', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Mestre Cerimônias')),
('Lucas Moraes', 'lucasmoraes@email.com', '(11) 70000-0012', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Decorador')),
('Mirella Vieira', 'mirellavieira@email.com', '(11) 70000-0013', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Cerimonialista')),
('Nathan Cunha', 'nathancunha@email.com', '(11) 70000-0014', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Manobrista')),
('Otávio Borges', 'otvioborges@email.com', '(11) 70000-0015', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Técnico Som')),
('Paula Assis', 'paulaassis@email.com', '(11) 70000-0016', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Técnico Luz')),
('Renato Mendes', 'renatomendes@email.com', '(11) 70000-0017', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Maquiador')),
('Sabrina Freitas', 'sabrinafreitas@email.com', '(11) 70000-0018', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Mágico')),
('Thiago Viana', 'thiagoviana@email.com', '(11) 70000-0019', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Palhaço')),
('Vanessa Rezende', 'vanessarezende@email.com', '(11) 70000-0020', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Coordenador'));

-- 4. PRODUTOS
INSERT INTO produtos (prd_nome, prd_cap_id, prd_quantidade, prd_estoque_minimo, prd_unidade_medida, prd_custo_unitario) VALUES
('Salgadinhos Sortidos', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Alimento'), 335, 33, 'un', 15.00),
('Refrigerante 2L', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Bebida'), 8, 41, 'un', 35.00),
('Copo Plástico 200ml', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Descartável'), 445, 31, 'un', 97.00),
('Balões Coloridos', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Decoração'), 144, 19, 'un', 8.00),
('Detergente Líquido', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Limpeza'), 179, 34, 'un', 9.00),
('Luvas de Proteção', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'EPI'), 222, 20, 'un', 22.00),
('Cadeira de Plástico', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Móvel'), 295, 43, 'un', 99.00),
('Microfone Sem Fio', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Eletrônico'), 55, 40, 'un', 7.00),
('Pula-Pula Inflável', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Brinquedo'), 493, 48, 'un', 46.00),
('Martelo', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Ferramenta'), 313, 38, 'un', 71.00),
('Bandeja Inox', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Utensílio'), 325, 21, 'un', 43.00),
('Caneta Esferográfica', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Papelaria'), 16, 33, 'un', 36.00),
('Caixa de Papelão', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Embalagem'), 215, 15, 'un', 60.00),
('Avental Personalizado', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Uniforme'), 117, 18, 'un', 16.00),
('Caixa de Som Ativa', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Som'), 142, 48, 'un', 28.00),
('Refletor LED', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Iluminação'), 406, 44, 'un', 76.00),
('Chaveiro Lembrança', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Lembrança'), 397, 34, 'un', 64.00),
('Farinha de Trigo 1kg', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Ingrediente'), 283, 16, 'un', 90.00),
('Cerveja Lata 350ml', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Bebida Alcoólica'), 49, 34, 'un', 65.00),
('Bolo de Chocolate', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Doce'), 287, 49, 'un', 68.00);

-- 5. ORCAMENTOS
INSERT INTO orcamentos (orc_cli_id, orc_loc_id, orc_nome, orc_valor_total, orc_data_validade, orc_data_evento, orc_horario_termino, orc_status, orc_qtd_pessoas, orc_qtd_adultos, orc_qtd_criancas, orc_qtd_bebes, orc_observacoes) VALUES
((SELECT cli_id FROM clientes WHERE cli_nome = 'Ana Souza'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Aniversário da Ana', 9225.00, '2027-01-15', '2027-05-17 14:00:00', '2027-05-17 18:00:00', 'pendente', 150, 110, 35, 5, 'Orçamento para Aniversário da Ana'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Bruno Lima'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Casamento Bruno e Carla', 5426.00, '2027-03-15', '2026-05-14 14:00:00', '2026-05-14 18:00:00', 'aprovado', 80, 65, 10, 5, 'Orçamento para Casamento Bruno e Carla'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Carlos Santos'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Confraternização Empresa X', 5725.00, '2027-03-15', '2027-01-27 14:00:00', '2027-01-27 18:00:00', 'pendente', 120, 90, 25, 5, 'Orçamento para Confraternização Empresa X'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Daniela Ferreira'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Chá de Bebê da Daniela', 3368.00, '2026-11-15', '2027-01-27 14:00:00', '2027-01-27 18:00:00', 'pendente', 50, 40, 8, 2, 'Orçamento para Chá de Bebê da Daniela'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Eduardo Costa'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Festa de 15 Anos da Fernanda', 3339.00, '2026-09-15', '2027-05-06 14:00:00', '2027-05-06 18:00:00', 'pendente', 200, 160, 30, 10, 'Orçamento para Festa de 15 Anos da Fernanda'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Fernanda Alves'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Formatura do Gabriel', 5356.00, '2026-07-15', '2026-07-28 14:00:00', '2026-07-28 18:00:00', 'pendente', 95, 75, 15, 5, 'Orçamento para Formatura do Gabriel'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Gabriel Pereira'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Bodas de Prata Helena', 5383.00, '2026-08-15', '2027-04-16 14:00:00', '2027-04-16 18:00:00', 'pendente', 60, 50, 10, 0, 'Orçamento para Bodas de Prata Helena'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Helena Ribeiro'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Encontro de Ex-Alunos', 4042.00, '2026-09-15', '2027-05-17 14:00:00', '2027-05-17 18:00:00', 'pendente', 115, 95, 15, 5, 'Orçamento para Encontro de Ex-Alunos'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Igor Rocha'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Festa Infantil do João', 7947.00, '2027-01-15', '2026-10-15 14:00:00', '2026-10-15 18:00:00', 'reprovado', 130, 100, 25, 5, 'Orçamento para Festa Infantil do João'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Juliana Mendes'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Baile de Máscaras', 3546.00, '2026-11-15', '2026-04-06 14:00:00', '2026-04-06 18:00:00', 'aprovado', 45, 35, 8, 2, 'Orçamento para Baile de Máscaras'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Leonardo Silva'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Lançamento de Produto', 6028.00, '2027-06-15', '2027-03-01 14:00:00', '2027-03-01 18:00:00', 'pendente', 175, 140, 30, 5, 'Orçamento para Lançamento de Produto'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Mariana Carvalho'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Festa Junina do Bairro', 2232.00, '2027-04-15', '2026-07-16 14:00:00', '2026-07-16 18:00:00', 'pendente', 70, 60, 8, 2, 'Orçamento para Festa Junina do Bairro'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Nicolas Martins'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Reveillon VIP', 8889.00, '2027-01-15', '2026-08-20 14:00:00', '2026-08-20 18:00:00', 'pendente', 105, 85, 15, 5, 'Orçamento para Reveillon VIP'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Olivia Barros'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Festa à Fantasia', 8479.00, '2026-10-15', '2026-12-21 14:00:00', '2026-12-21 18:00:00', 'pendente', 90, 70, 18, 2, 'Orçamento para Festa à Fantasia'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Pedro Gomes'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Casamento Mariana e Pedro', 4415.00, '2027-03-15', '2027-05-22 14:00:00', '2027-05-22 18:00:00', 'pendente', 140, 110, 25, 5, 'Orçamento para Casamento Mariana e Pedro'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Quintino Pires'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Aniversário Surpresa do Nicolas', 2975.00, '2027-03-15', '2027-06-01 14:00:00', '2027-06-01 18:00:00', 'pendente', 65, 55, 8, 2, 'Orçamento para Aniversário Surpresa do Nicolas'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Rafaela Nogueira'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Chá de Panela da Rafaela', 7400.00, '2027-01-15', '2026-09-10 14:00:00', '2026-09-10 18:00:00', 'pendente', 85, 70, 12, 3, 'Orçamento para Chá de Panela da Rafaela'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Samuel Dias'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Batizado do Samuel', 2689.00, '2026-12-15', '2027-01-10 14:00:00', '2027-01-10 18:00:00', 'pendente', 110, 90, 15, 5, 'Orçamento para Batizado do Samuel'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Tatiana Monteiro'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Despedida de Solteiro(a)', 9864.00, '2027-01-15', '2026-10-08 14:00:00', '2026-10-08 18:00:00', 'pendente', 160, 130, 25, 5, 'Orçamento para Despedida de Solteiro(a)'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Vinicius Castro'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Festa de Fim de Ano', 8430.00, '2027-05-15', '2025-12-22 14:00:00', '2025-12-22 18:00:00', 'aprovado', 125, 100, 20, 5, 'Orçamento para Festa de Fim de Ano');

-- 6. EVENTOS
INSERT INTO eventos (evt_cli_id, evt_orc_id, evt_loc_id, evt_nome, evt_data_evento, evt_horario_termino, evt_status, evt_qtd_pessoas, evt_qtd_adultos, evt_qtd_criancas, evt_qtd_bebes, evt_observacoes) VALUES
((SELECT cli_id FROM clientes WHERE cli_nome = 'Ana Souza'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Aniversário da Ana'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Aniversário da Ana', '2027-05-17 14:00:00', '2027-05-17 18:00:00', 'pendente', 150, 110, 35, 5, 'Detalhes adicionais para Aniversário da Ana'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Bruno Lima'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Casamento Bruno e Carla'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Casamento Bruno e Carla', '2026-05-14 14:00:00', '2026-05-14 18:00:00', 'concluido', 80, 65, 10, 5, 'Detalhes adicionais para Casamento Bruno e Carla'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Carlos Santos'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Confraternização Empresa X'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Confraternização Empresa X', '2027-01-27 14:00:00', '2027-01-27 18:00:00', 'pendente', 120, 90, 25, 5, 'Detalhes adicionais para Confraternização Empresa X'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Daniela Ferreira'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Chá de Bebê da Daniela'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Chá de Bebê da Daniela', '2027-01-27 14:00:00', '2027-01-27 18:00:00', 'pendente', 50, 40, 8, 2, 'Detalhes adicionais para Chá de Bebê da Daniela'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Eduardo Costa'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa de 15 Anos da Fernanda'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Festa de 15 Anos da Fernanda', '2027-05-06 14:00:00', '2027-05-06 18:00:00', 'pendente', 200, 160, 30, 10, 'Detalhes adicionais para Festa de 15 Anos da Fernanda'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Fernanda Alves'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Formatura do Gabriel'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Formatura do Gabriel', '2026-07-28 14:00:00', '2026-07-28 18:00:00', 'pendente', 95, 75, 15, 5, 'Detalhes adicionais para Formatura do Gabriel'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Gabriel Pereira'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Bodas de Prata Helena'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Bodas de Prata Helena', '2027-04-16 14:00:00', '2027-04-16 18:00:00', 'cancelado', 60, 50, 10, 0, 'Detalhes adicionais para Bodas de Prata Helena'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Helena Ribeiro'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Encontro de Ex-Alunos'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Encontro de Ex-Alunos', '2027-05-17 14:00:00', '2027-05-17 18:00:00', 'pendente', 115, 95, 15, 5, 'Detalhes adicionais para Encontro de Ex-Alunos'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Igor Rocha'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa Infantil do João'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Festa Infantil do João', '2026-10-15 14:00:00', '2026-10-15 18:00:00', 'pendente', 130, 100, 25, 5, 'Detalhes adicionais para Festa Infantil do João'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Juliana Mendes'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Baile de Máscaras'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Baile de Máscaras', '2026-04-06 14:00:00', '2026-04-06 18:00:00', 'concluido', 45, 35, 8, 2, 'Detalhes adicionais para Baile de Máscaras'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Leonardo Silva'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Lançamento de Produto'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Lançamento de Produto', '2027-03-01 14:00:00', '2027-03-01 18:00:00', 'pendente', 175, 140, 30, 5, 'Detalhes adicionais para Lançamento de Produto'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Mariana Carvalho'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa Junina do Bairro'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Festa Junina do Bairro', '2026-07-16 14:00:00', '2026-07-16 18:00:00', 'pendente', 70, 60, 8, 2, 'Detalhes adicionais para Festa Junina do Bairro'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Nicolas Martins'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Reveillon VIP'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Reveillon VIP', '2026-08-20 14:00:00', '2026-08-20 18:00:00', 'pendente', 105, 85, 15, 5, 'Detalhes adicionais para Reveillon VIP'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Olivia Barros'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa à Fantasia'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Festa à Fantasia', '2026-12-21 14:00:00', '2026-12-21 18:00:00', 'cancelado', 90, 70, 18, 2, 'Detalhes adicionais para Festa à Fantasia'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Pedro Gomes'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Casamento Mariana e Pedro'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Casamento Mariana e Pedro', '2027-05-22 14:00:00', '2027-05-22 18:00:00', 'cancelado', 140, 110, 25, 5, 'Detalhes adicionais para Casamento Mariana e Pedro'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Quintino Pires'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Aniversário Surpresa do Nicolas'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Aniversário Surpresa do Nicolas', '2027-06-01 14:00:00', '2027-06-01 18:00:00', 'cancelado', 65, 55, 8, 2, 'Detalhes adicionais para Aniversário Surpresa do Nicolas'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Rafaela Nogueira'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Chá de Panela da Rafaela'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Chá de Panela da Rafaela', '2026-09-10 14:00:00', '2026-09-10 18:00:00', 'cancelado', 85, 70, 12, 3, 'Detalhes adicionais para Chá de Panela da Rafaela'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Samuel Dias'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Batizado do Samuel'), (SELECT loc_id FROM locais WHERE loc_nome = 'Externo'), 'Batizado do Samuel', '2027-01-10 14:00:00', '2027-01-10 18:00:00', 'pendente', 110, 90, 15, 5, 'Detalhes adicionais para Batizado do Samuel'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Tatiana Monteiro'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Despedida de Solteiro(a)'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 1'), 'Despedida de Solteiro(a)', '2026-10-08 14:00:00', '2026-10-08 18:00:00', 'pendente', 160, 130, 25, 5, 'Detalhes adicionais para Despedida de Solteiro(a)'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Vinicius Castro'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa de Fim de Ano'), (SELECT loc_id FROM locais WHERE loc_nome = 'Salão 2'), 'Festa de Fim de Ano', '2025-12-22 14:00:00', '2025-12-22 18:00:00', 'concluido', 125, 100, 20, 5, 'Detalhes adicionais para Festa de Fim de Ano');

-- 7. DOCUMENTOS
INSERT INTO documentos (doc_cli_id, doc_evt_id, doc_nome_arquivo, doc_caminho_url, doc_tipo_arquivo) VALUES
((SELECT cli_id FROM clientes WHERE cli_nome = 'Ana Souza'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Aniversário da Ana'), 'Contrato_AniversriodaAna.pdf', 'http://arquivos.maisalegria.com/docs/contrato_1.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Bruno Lima'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Casamento Bruno e Carla'), 'Contrato_CasamentoBrunoeCarla.pdf', 'http://arquivos.maisalegria.com/docs/contrato_2.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Carlos Santos'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Confraternização Empresa X'), 'Contrato_ConfraternizaoEmpresaX.pdf', 'http://arquivos.maisalegria.com/docs/contrato_3.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Daniela Ferreira'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Chá de Bebê da Daniela'), 'Contrato_ChdeBebdaDaniela.pdf', 'http://arquivos.maisalegria.com/docs/contrato_4.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Eduardo Costa'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Festa de 15 Anos da Fernanda'), 'Contrato_Festade15AnosdaFernanda.pdf', 'http://arquivos.maisalegria.com/docs/contrato_5.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Fernanda Alves'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Formatura do Gabriel'), 'Contrato_FormaturadoGabriel.pdf', 'http://arquivos.maisalegria.com/docs/contrato_6.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Gabriel Pereira'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Bodas de Prata Helena'), 'Contrato_BodasdePrataHelena.pdf', 'http://arquivos.maisalegria.com/docs/contrato_7.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Helena Ribeiro'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Encontro de Ex-Alunos'), 'Contrato_EncontrodeExAlunos.pdf', 'http://arquivos.maisalegria.com/docs/contrato_8.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Igor Rocha'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Festa Infantil do João'), 'Contrato_FestaInfantildoJoo.pdf', 'http://arquivos.maisalegria.com/docs/contrato_9.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Juliana Mendes'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Baile de Máscaras'), 'Contrato_BailedeMscaras.pdf', 'http://arquivos.maisalegria.com/docs/contrato_10.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Leonardo Silva'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Lançamento de Produto'), 'Contrato_LanamentodeProduto.pdf', 'http://arquivos.maisalegria.com/docs/contrato_11.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Mariana Carvalho'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Festa Junina do Bairro'), 'Contrato_FestaJuninadoBairro.pdf', 'http://arquivos.maisalegria.com/docs/contrato_12.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Nicolas Martins'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Reveillon VIP'), 'Contrato_ReveillonVIP.pdf', 'http://arquivos.maisalegria.com/docs/contrato_13.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Olivia Barros'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Festa à Fantasia'), 'Contrato_FestaFantasia.pdf', 'http://arquivos.maisalegria.com/docs/contrato_14.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Pedro Gomes'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Casamento Mariana e Pedro'), 'Contrato_CasamentoMarianaePedro.pdf', 'http://arquivos.maisalegria.com/docs/contrato_15.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Quintino Pires'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Aniversário Surpresa do Nicolas'), 'Contrato_AniversrioSurpresadoNicolas.pdf', 'http://arquivos.maisalegria.com/docs/contrato_16.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Rafaela Nogueira'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Chá de Panela da Rafaela'), 'Contrato_ChdePaneladaRafaela.pdf', 'http://arquivos.maisalegria.com/docs/contrato_17.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Samuel Dias'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Batizado do Samuel'), 'Contrato_BatizadodoSamuel.pdf', 'http://arquivos.maisalegria.com/docs/contrato_18.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Tatiana Monteiro'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Despedida de Solteiro(a)'), 'Contrato_DespedidadeSolteiroa.pdf', 'http://arquivos.maisalegria.com/docs/contrato_19.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Vinicius Castro'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Festa de Fim de Ano'), 'Contrato_FestadeFimdeAno.pdf', 'http://arquivos.maisalegria.com/docs/contrato_20.pdf', 'pdf');

-- 8. ESCALA
INSERT INTO escala (esc_evt_id, esc_fun_id, esc_observacoes) VALUES
((SELECT evt_id FROM eventos WHERE evt_nome = 'Aniversário da Ana'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Alice Rodrigues'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Casamento Bruno e Carla'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Bernardo Almeida'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Confraternização Empresa X'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Camila Neves'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Chá de Bebê da Daniela'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Diego Farias'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa de 15 Anos da Fernanda'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Elisa Cardoso'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Formatura do Gabriel'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Felipe Machado'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Bodas de Prata Helena'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Giovana Moura'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Encontro de Ex-Alunos'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Henrique Castro'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa Infantil do João'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Isadora Lopes'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Baile de Máscaras'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'João Batista'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Lançamento de Produto'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Karina Teixeira'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa Junina do Bairro'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Lucas Moraes'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Reveillon VIP'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Mirella Vieira'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa à Fantasia'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Nathan Cunha'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Casamento Mariana e Pedro'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Otávio Borges'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Aniversário Surpresa do Nicolas'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Paula Assis'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Chá de Panela da Rafaela'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Renato Mendes'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Batizado do Samuel'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Sabrina Freitas'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Despedida de Solteiro(a)'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Thiago Viana'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa de Fim de Ano'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Vanessa Rezende'), 'Turno integral');

-- 9. EVENTO_PRODUTO
INSERT INTO evento_produto (evp_evt_id, evp_prd_id, evp_quantidade) VALUES
((SELECT evt_id FROM eventos WHERE evt_nome = 'Aniversário da Ana'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Salgadinhos Sortidos'), 46),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Casamento Bruno e Carla'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Refrigerante 2L'), 47),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Confraternização Empresa X'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Copo Plástico 200ml'), 41),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Chá de Bebê da Daniela'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Balões Coloridos'), 16),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa de 15 Anos da Fernanda'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Detergente Líquido'), 13),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Formatura do Gabriel'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Luvas de Proteção'), 17),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Bodas de Prata Helena'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Cadeira de Plástico'), 2),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Encontro de Ex-Alunos'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Microfone Sem Fio'), 11),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa Infantil do João'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Pula-Pula Inflável'), 43),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Baile de Máscaras'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Martelo'), 50),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Lançamento de Produto'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Bandeja Inox'), 8),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa Junina do Bairro'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Caneta Esferográfica'), 15),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Reveillon VIP'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Caixa de Papelão'), 30),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa à Fantasia'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Avental Personalizado'), 32),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Casamento Mariana e Pedro'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Caixa de Som Ativa'), 2),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Aniversário Surpresa do Nicolas'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Refletor LED'), 46),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Chá de Panela da Rafaela'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Chaveiro Lembrança'), 26),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Batizado do Samuel'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Farinha de Trigo 1kg'), 32),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Despedida de Solteiro(a)'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Cerveja Lata 350ml'), 35),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Festa de Fim de Ano'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Bolo de Chocolate'), 50);

-- 10. ORCAMENTO_PRODUTO
INSERT INTO orcamento_produto (orp_orc_id, orp_prd_id, orp_quantidade, orp_preco_unitario) VALUES
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Aniversário da Ana'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Salgadinhos Sortidos'), 28, 36.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Casamento Bruno e Carla'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Refrigerante 2L'), 19, 44.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Confraternização Empresa X'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Copo Plástico 200ml'), 34, 36.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Chá de Bebê da Daniela'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Balões Coloridos'), 43, 7.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa de 15 Anos da Fernanda'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Detergente Líquido'), 35, 47.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Formatura do Gabriel'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Luvas de Proteção'), 8, 34.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Bodas de Prata Helena'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Cadeira de Plástico'), 40, 13.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Encontro de Ex-Alunos'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Microfone Sem Fio'), 25, 41.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa Infantil do João'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Pula-Pula Inflável'), 28, 17.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Baile de Máscaras'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Martelo'), 1, 27.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Lançamento de Produto'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Bandeja Inox'), 25, 30.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa Junina do Bairro'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Caneta Esferográfica'), 44, 32.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Reveillon VIP'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Caixa de Papelão'), 24, 44.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa à Fantasia'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Avental Personalizado'), 8, 33.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Casamento Mariana e Pedro'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Caixa de Som Ativa'), 25, 14.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Aniversário Surpresa do Nicolas'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Refletor LED'), 17, 5.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Chá de Panela da Rafaela'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Chaveiro Lembrança'), 27, 22.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Batizado do Samuel'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Farinha de Trigo 1kg'), 38, 11.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Despedida de Solteiro(a)'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Cerveja Lata 350ml'), 16, 14.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Orçamento para Festa de Fim de Ano'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Bolo de Chocolate'), 29, 14.00);

-- 11. CATALOGOS
INSERT INTO catalogos (cat_titulo, cat_descricao, cat_preco_base, cat_ativo) VALUES
('Pacote Aniversário Premium', 'Descrição completa do pacote para Aniversário da Ana', 1454.00, true),
('Pacote Casamento Premium', 'Descrição completa do pacote para Casamento Bruno e Carla', 1834.00, true),
('Pacote Confraternização Premium', 'Descrição completa do pacote para Confraternização Empresa X', 2452.00, true),
('Pacote Chá Premium', 'Descrição completa do pacote para Chá de Bebê da Daniela', 742.00, true),
('Pacote Festa Premium', 'Descrição completa do pacote para Festa de 15 Anos da Fernanda', 3131.00, true),
('Pacote Formatura Premium', 'Descrição completa do pacote para Formatura do Gabriel', 198.00, true),
('Pacote Bodas Premium', 'Descrição completa do pacote para Bodas de Prata Helena', 1380.00, true),
('Pacote Encontro Premium', 'Descrição completa do pacote para Encontro de Ex-Alunos', 3562.00, true),
('Pacote Festa Premium', 'Descrição completa do pacote para Festa Infantil do João', 2074.00, true),
('Pacote Baile Premium', 'Descrição completa do pacote para Baile de Máscaras', 3932.00, true),
('Pacote Lançamento Premium', 'Descrição completa do pacote para Lançamento de Produto', 291.00, true),
('Pacote Festa Premium', 'Descrição completa do pacote para Festa Junina do Bairro', 2301.00, true),
('Pacote Reveillon Premium', 'Descrição completa do pacote para Reveillon VIP', 910.00, true),
('Pacote Festa Premium', 'Descrição completa do pacote para Festa à Fantasia', 2795.00, true),
('Pacote Casamento Premium', 'Descrição completa do pacote para Casamento Mariana e Pedro', 1930.00, true),
('Pacote Aniversário Premium', 'Descrição completa do pacote para Aniversário Surpresa do Nicolas', 989.00, true),
('Pacote Chá Premium', 'Descrição completa do pacote para Chá de Panela da Rafaela', 107.00, true),
('Pacote Batizado Premium', 'Descrição completa do pacote para Batizado do Samuel', 3013.00, true),
('Pacote Despedida Premium', 'Descrição completa do pacote para Despedida de Solteiro(a)', 2237.00, true),
('Pacote Festa Premium', 'Descrição completa do pacote para Festa de Fim de Ano', 4363.00, true);

-- ------------------------------------------------------------
-- Remove os DEFAULTs temporários definidos no início do arquivo — não
-- devem sobreviver ao seed (inserts fora daqui continuam exigindo emp_id
-- explícito, como esperado pelo resto da aplicação).
-- ------------------------------------------------------------
ALTER TABLE usuarios ALTER COLUMN usr_emp_id DROP DEFAULT;
ALTER TABLE locais ALTER COLUMN loc_emp_id DROP DEFAULT;
ALTER TABLE funcoes ALTER COLUMN fnc_emp_id DROP DEFAULT;
ALTER TABLE categorias_fornecedor ALTER COLUMN caf_emp_id DROP DEFAULT;
ALTER TABLE categorias_produto ALTER COLUMN cap_emp_id DROP DEFAULT;
ALTER TABLE clientes ALTER COLUMN cli_emp_id DROP DEFAULT;
ALTER TABLE fornecedores ALTER COLUMN for_emp_id DROP DEFAULT;
ALTER TABLE funcionarios ALTER COLUMN fun_emp_id DROP DEFAULT;
ALTER TABLE produtos ALTER COLUMN prd_emp_id DROP DEFAULT;
ALTER TABLE orcamentos ALTER COLUMN orc_emp_id DROP DEFAULT;
ALTER TABLE eventos ALTER COLUMN evt_emp_id DROP DEFAULT;
ALTER TABLE documentos ALTER COLUMN doc_emp_id DROP DEFAULT;
ALTER TABLE catalogos ALTER COLUMN cat_emp_id DROP DEFAULT;
ALTER TABLE escala ALTER COLUMN esc_emp_id DROP DEFAULT;
ALTER TABLE evento_produto ALTER COLUMN evp_emp_id DROP DEFAULT;
ALTER TABLE orcamento_produto ALTER COLUMN orp_emp_id DROP DEFAULT;

