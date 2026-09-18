-- ============================================================
-- PROJETO MAIS ALEGRIA - DADOS FICTÍCIOS ADAPTADOS (20 REGISTROS POR TABELA) cole em um script e rode usando alt + x
-- ============================================================

BEGIN;

TRUNCATE
    usuarios, clientes, funcionarios, fornecedores, produtos,
    orcamentos, eventos, documentos, catalogos, escala,
    evento_produto, orcamento_produto,
    locais, funcoes, categorias_fornecedor, categorias_produto
RESTART IDENTITY CASCADE;

-- 0. USUARIOS
INSERT INTO usuarios (usr_nome, usr_email, usr_senha, usr_role) VALUES
('Gerente',  'gerente@celebri.com',  '$2a$10$Nq.Tgkmz8Dz4/s9KWP.NDOSD33LH4pGBrGsnd5R3F/kqoymkRpyoa', 'gerente'),
('Operador',  'operador@celebri.com', '$2a$10$Nq.Tgkmz8Dz4/s9KWP.NDOSD33LH4pGBrGsnd5R3F/kqoymkRpyoa', 'operador');

-- L. LOCAIS
INSERT INTO locais (loc_nome, loc_logradouro, loc_numero, loc_bairro, loc_cidade, loc_estado, loc_cep, loc_capacidade_maxima) VALUES
('Local 1', 'Rua 1', '100', 'Bairro 1', 'Cidade 1', 'SP', '00000-001', 150),
('Local 2', 'Rua 2', '200', 'Bairro 2', 'Cidade 2', 'SP', '00000-002', 250),
('Local 3', 'Rua 3', '300', 'Bairro 3', 'Cidade 3', 'SP', '00000-003', NULL),
('Local 4', 'Rua 4', '400', 'Bairro 4', 'Cidade 4', 'SP', '00000-004', NULL),
('Local 5', 'Rua 5', '500', 'Bairro 5', 'Cidade 5', 'SP', '00000-005', NULL),
('Local 6', 'Rua 6', '600', 'Bairro 6', 'Cidade 6', 'SP', '00000-006', NULL),
('Local 7', 'Rua 7', '700', 'Bairro 7', 'Cidade 7', 'SP', '00000-007', NULL),
('Local 8', 'Rua 8', '800', 'Bairro 8', 'Cidade 8', 'SP', '00000-008', NULL),
('Local 9', 'Rua 9', '900', 'Bairro 9', 'Cidade 9', 'SP', '00000-009', NULL),
('Local 10', 'Rua 10', '1000', 'Bairro 10', 'Cidade 10', 'SP', '00000-010', NULL),
('Local 11', 'Rua 11', '1100', 'Bairro 11', 'Cidade 11', 'SP', '00000-011', NULL),
('Local 12', 'Rua 12', '1200', 'Bairro 12', 'Cidade 12', 'SP', '00000-012', NULL),
('Local 13', 'Rua 13', '1300', 'Bairro 13', 'Cidade 13', 'SP', '00000-013', NULL),
('Local 14', 'Rua 14', '1400', 'Bairro 14', 'Cidade 14', 'SP', '00000-014', NULL),
('Local 15', 'Rua 15', '1500', 'Bairro 15', 'Cidade 15', 'SP', '00000-015', NULL),
('Local 16', 'Rua 16', '1600', 'Bairro 16', 'Cidade 16', 'SP', '00000-016', NULL),
('Local 17', 'Rua 17', '1700', 'Bairro 17', 'Cidade 17', 'SP', '00000-017', NULL),
('Local 18', 'Rua 18', '1800', 'Bairro 18', 'Cidade 18', 'SP', '00000-018', NULL),
('Local 19', 'Rua 19', '1900', 'Bairro 19', 'Cidade 19', 'SP', '00000-019', NULL),
('Local 20', 'Rua 20', '2000', 'Bairro 20', 'Cidade 20', 'SP', '00000-020', NULL);

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
('Cliente 1', 'cliente1@email.com', '111.111.111-01', '(11) 90000-0001'),
('Cliente 2', 'cliente2@email.com', '111.111.111-02', '(11) 90000-0002'),
('Cliente 3', 'cliente3@email.com', '111.111.111-03', '(11) 90000-0003'),
('Cliente 4', 'cliente4@email.com', '111.111.111-04', '(11) 90000-0004'),
('Cliente 5', 'cliente5@email.com', '111.111.111-05', '(11) 90000-0005'),
('Cliente 6', 'cliente6@email.com', '111.111.111-06', '(11) 90000-0006'),
('Cliente 7', 'cliente7@email.com', '111.111.111-07', '(11) 90000-0007'),
('Cliente 8', 'cliente8@email.com', '111.111.111-08', '(11) 90000-0008'),
('Cliente 9', 'cliente9@email.com', '111.111.111-09', '(11) 90000-0009'),
('Cliente 10', 'cliente10@email.com', '111.111.111-10', '(11) 90000-0010'),
('Cliente 11', 'cliente11@email.com', '111.111.111-11', '(11) 90000-0011'),
('Cliente 12', 'cliente12@email.com', '111.111.111-12', '(11) 90000-0012'),
('Cliente 13', 'cliente13@email.com', '111.111.111-13', '(11) 90000-0013'),
('Cliente 14', 'cliente14@email.com', '111.111.111-14', '(11) 90000-0014'),
('Cliente 15', 'cliente15@email.com', '111.111.111-15', '(11) 90000-0015'),
('Cliente 16', 'cliente16@email.com', '111.111.111-16', '(11) 90000-0016'),
('Cliente 17', 'cliente17@email.com', '111.111.111-17', '(11) 90000-0017'),
('Cliente 18', 'cliente18@email.com', '111.111.111-18', '(11) 90000-0018'),
('Cliente 19', 'cliente19@email.com', '111.111.111-19', '(11) 90000-0019'),
('Cliente 20', 'cliente20@email.com', '111.111.111-20', '(11) 90000-0020');

-- 2. FORNECEDORES
INSERT INTO fornecedores (for_nome, for_email, for_cnpj, for_telefone, for_caf_id) VALUES
('Fornecedor 1', 'forn1@email.com', '11.111.111/0001-01', '(11) 80000-0001', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Alimentos')),
('Fornecedor 2', 'forn2@email.com', '11.111.111/0001-02', '(11) 80000-0002', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Decoração')),
('Fornecedor 3', 'forn3@email.com', '11.111.111/0001-03', '(11) 80000-0003', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Bebidas')),
('Fornecedor 4', 'forn4@email.com', '11.111.111/0001-04', '(11) 80000-0004', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Som')),
('Fornecedor 5', 'forn5@email.com', '11.111.111/0001-05', '(11) 80000-0005', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Iluminação')),
('Fornecedor 6', 'forn6@email.com', '11.111.111/0001-06', '(11) 80000-0006', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Mobiliário')),
('Fornecedor 7', 'forn7@email.com', '11.111.111/0001-07', '(11) 80000-0007', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Flores')),
('Fornecedor 8', 'forn8@email.com', '11.111.111/0001-08', '(11) 80000-0008', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Brinquedos')),
('Fornecedor 9', 'forn9@email.com', '11.111.111/0001-09', '(11) 80000-0009', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Impressão')),
('Fornecedor 10', 'forn10@email.com', '11.111.111/0001-10', '(11) 80000-0010', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Transporte')),
('Fornecedor 11', 'forn11@email.com', '11.111.111/0001-11', '(11) 80000-0011', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Tecidos')),
('Fornecedor 12', 'forn12@email.com', '11.111.111/0001-12', '(11) 80000-0012', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Embalagens')),
('Fornecedor 13', 'forn13@email.com', '11.111.111/0001-13', '(11) 80000-0013', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Limpeza')),
('Fornecedor 14', 'forn14@email.com', '11.111.111/0001-14', '(11) 80000-0014', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Segurança Privada')),
('Fornecedor 15', 'forn15@email.com', '11.111.111/0001-15', '(11) 80000-0015', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Descartáveis')),
('Fornecedor 16', 'forn16@email.com', '11.111.111/0001-16', '(11) 80000-0016', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Lembrancinhas')),
('Fornecedor 17', 'forn17@email.com', '11.111.111/0001-17', '(11) 80000-0017', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Fotografia')),
('Fornecedor 18', 'forn18@email.com', '11.111.111/0001-18', '(11) 80000-0018', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Vídeo')),
('Fornecedor 19', 'forn19@email.com', '11.111.111/0001-19', '(11) 80000-0019', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Atrações')),
('Fornecedor 20', 'forn20@email.com', '11.111.111/0001-20', '(11) 80000-0020', (SELECT caf_id FROM categorias_fornecedor WHERE caf_nome = 'Geradores'));

-- 3. FUNCIONARIOS
INSERT INTO funcionarios (fun_nome, fun_email, fun_telefone, fun_fnc_id) VALUES
('Funcionario 1', 'func1@email.com', '(11) 70000-0001', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Recreador')),
('Funcionario 2', 'func2@email.com', '(11) 70000-0002', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Garçom')),
('Funcionario 3', 'func3@email.com', '(11) 70000-0003', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Cozinheiro')),
('Funcionario 4', 'func4@email.com', '(11) 70000-0004', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Segurança')),
('Funcionario 5', 'func5@email.com', '(11) 70000-0005', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Recepcionista')),
('Funcionario 6', 'func6@email.com', '(11) 70000-0006', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Fotógrafo')),
('Funcionario 7', 'func7@email.com', '(11) 70000-0007', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Animador')),
('Funcionario 8', 'func8@email.com', '(11) 70000-0008', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'DJ')),
('Funcionario 9', 'func9@email.com', '(11) 70000-0009', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Auxiliar Limpeza')),
('Funcionario 10', 'func10@email.com', '(11) 70000-0010', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Bartender')),
('Funcionario 11', 'func11@email.com', '(11) 70000-0011', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Mestre Cerimônias')),
('Funcionario 12', 'func12@email.com', '(11) 70000-0012', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Decorador')),
('Funcionario 13', 'func13@email.com', '(11) 70000-0013', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Cerimonialista')),
('Funcionario 14', 'func14@email.com', '(11) 70000-0014', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Manobrista')),
('Funcionario 15', 'func15@email.com', '(11) 70000-0015', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Técnico Som')),
('Funcionario 16', 'func16@email.com', '(11) 70000-0016', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Técnico Luz')),
('Funcionario 17', 'func17@email.com', '(11) 70000-0017', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Maquiador')),
('Funcionario 18', 'func18@email.com', '(11) 70000-0018', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Mágico')),
('Funcionario 19', 'func19@email.com', '(11) 70000-0019', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Palhaço')),
('Funcionario 20', 'func20@email.com', '(11) 70000-0020', (SELECT fnc_id FROM funcoes WHERE fnc_nome = 'Coordenador'));

-- 4. PRODUTOS
INSERT INTO produtos (prd_nome, prd_cap_id, prd_quantidade, prd_estoque_minimo, prd_unidade_medida, prd_custo_unitario) VALUES
('Produto 1', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Alimento'), 335, 33, 'un', 15.00),
('Produto 2', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Bebida'), 8, 41, 'un', 35.00),
('Produto 3', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Descartável'), 445, 31, 'un', 97.00),
('Produto 4', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Decoração'), 144, 19, 'un', 8.00),
('Produto 5', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Limpeza'), 179, 34, 'un', 9.00),
('Produto 6', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'EPI'), 222, 20, 'un', 22.00),
('Produto 7', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Móvel'), 295, 43, 'un', 99.00),
('Produto 8', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Eletrônico'), 55, 40, 'un', 7.00),
('Produto 9', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Brinquedo'), 493, 48, 'un', 46.00),
('Produto 10', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Ferramenta'), 313, 38, 'un', 71.00),
('Produto 11', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Utensílio'), 325, 21, 'un', 43.00),
('Produto 12', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Papelaria'), 16, 33, 'un', 36.00),
('Produto 13', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Embalagem'), 215, 15, 'un', 60.00),
('Produto 14', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Uniforme'), 117, 18, 'un', 16.00),
('Produto 15', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Som'), 142, 48, 'un', 28.00),
('Produto 16', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Iluminação'), 406, 44, 'un', 76.00),
('Produto 17', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Lembrança'), 397, 34, 'un', 64.00),
('Produto 18', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Ingrediente'), 283, 16, 'un', 90.00),
('Produto 19', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Bebida Alcoólica'), 49, 34, 'un', 65.00),
('Produto 20', (SELECT cap_id FROM categorias_produto WHERE cap_nome = 'Doce'), 287, 49, 'un', 68.00);

-- 5. ORCAMENTOS (Corrigidos para minúsculo e 'reprovado' de acordo com o CHECK do DDL)
INSERT INTO orcamentos (orc_cli_id, orc_loc_id, orc_valor_total, orc_data_validade, orc_status, orc_observacoes) VALUES
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 1'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 1'), 9225.00, '2026-01-15', 'aprovado', 'Obs do orcamento 1'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 2'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 2'), 5426.00, '2026-03-15', 'reprovado', 'Obs do orcamento 2'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 3'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 3'), 5725.00, '2026-03-15', 'pendente', 'Obs do orcamento 3'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 4'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 4'), 3368.00, '2026-11-15', 'pendente', 'Obs do orcamento 4'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 5'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 5'), 3339.00, '2026-09-15', 'aprovado', 'Obs do orcamento 5'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 6'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 6'), 5356.00, '2026-07-15', 'aprovado', 'Obs do orcamento 6'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 7'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 7'), 5383.00, '2026-08-15', 'aprovado', 'Obs do orcamento 7'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 8'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 8'), 4042.00, '2026-09-15', 'pendente', 'Obs do orcamento 8'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 9'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 9'), 7947.00, '2026-01-15', 'reprovado', 'Obs do orcamento 9'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 10'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 10'), 3546.00, '2026-11-15', 'reprovado', 'Obs do orcamento 10'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 11'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 11'), 6028.00, '2026-06-15', 'pendente', 'Obs do orcamento 11'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 12'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 12'), 2232.00, '2026-04-15', 'aprovado', 'Obs do orcamento 12'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 13'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 13'), 8889.00, '2026-01-15', 'aprovado', 'Obs do orcamento 13'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 14'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 14'), 8479.00, '2026-10-15', 'pendente', 'Obs do orcamento 14'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 15'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 15'), 4415.00, '2026-03-15', 'pendente', 'Obs do orcamento 15'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 16'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 16'), 2975.00, '2026-03-15', 'pendente', 'Obs do orcamento 16'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 17'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 17'), 7400.00, '2026-01-15', 'aprovado', 'Obs do orcamento 17'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 18'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 18'), 2689.00, '2026-12-15', 'aprovado', 'Obs do orcamento 18'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 19'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 19'), 9864.00, '2026-01-15', 'aprovado', 'Obs do orcamento 19'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 20'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 20'), 8430.00, '2026-05-15', 'pendente', 'Obs do orcamento 20');

-- 6. EVENTOS (Corrigidos para letras minúsculas conforme exigido pelo CHECK)
INSERT INTO eventos (evt_cli_id, evt_orc_id, evt_loc_id, evt_nome, evt_data_evento, evt_horario_termino, evt_status, evt_qtd_pessoas, evt_qtd_adultos, evt_qtd_criancas, evt_qtd_bebes, evt_observacoes) VALUES
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 1'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 1'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 1'), 'Evento 1', '2026-05-17 14:00:00', '2026-05-17 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 1'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 2'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 2'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 2'), 'Evento 2', '2026-12-14 14:00:00', '2026-12-14 18:00:00', 'concluido', 100, 80, 20, 0, 'Obs Evento 2'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 3'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 3'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 3'), 'Evento 3', '2026-01-27 14:00:00', '2026-01-27 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 3'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 4'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 4'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 4'), 'Evento 4', '2026-01-27 14:00:00', '2026-01-27 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 4'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 5'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 5'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 5'), 'Evento 5', '2026-05-06 14:00:00', '2026-05-06 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 5'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 6'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 6'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 6'), 'Evento 6', '2026-07-28 14:00:00', '2026-07-28 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 6'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 7'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 7'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 7'), 'Evento 7', '2026-04-16 14:00:00', '2026-04-16 18:00:00', 'cancelado', 100, 80, 20, 0, 'Obs Evento 7'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 8'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 8'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 8'), 'Evento 8', '2026-05-17 14:00:00', '2026-05-17 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 8'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 9'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 9'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 9'), 'Evento 9', '2026-10-15 14:00:00', '2026-10-15 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 9'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 10'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 10'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 10'), 'Evento 10', '2026-10-06 14:00:00', '2026-10-06 18:00:00', 'concluido', 100, 80, 20, 0, 'Obs Evento 10'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 11'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 11'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 11'), 'Evento 11', '2026-03-01 14:00:00', '2026-03-01 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 11'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 12'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 12'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 12'), 'Evento 12', '2026-07-16 14:00:00', '2026-07-16 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 12'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 13'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 13'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 13'), 'Evento 13', '2026-08-20 14:00:00', '2026-08-20 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 13'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 14'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 14'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 14'), 'Evento 14', '2026-12-21 14:00:00', '2026-12-21 18:00:00', 'cancelado', 100, 80, 20, 0, 'Obs Evento 14'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 15'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 15'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 15'), 'Evento 15', '2026-05-22 14:00:00', '2026-05-22 18:00:00', 'cancelado', 100, 80, 20, 0, 'Obs Evento 15'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 16'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 16'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 16'), 'Evento 16', '2026-06-01 14:00:00', '2026-06-01 18:00:00', 'cancelado', 100, 80, 20, 0, 'Obs Evento 16'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 17'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 17'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 17'), 'Evento 17', '2026-09-10 14:00:00', '2026-09-10 18:00:00', 'cancelado', 100, 80, 20, 0, 'Obs Evento 17'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 18'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 18'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 18'), 'Evento 18', '2026-01-10 14:00:00', '2026-01-10 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 18'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 19'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 19'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 19'), 'Evento 19', '2026-10-08 14:00:00', '2026-10-08 18:00:00', 'pendente', 100, 80, 20, 0, 'Obs Evento 19'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 20'), (SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 20'), (SELECT loc_id FROM locais WHERE loc_nome = 'Local 20'), 'Evento 20', '2026-05-22 14:00:00', '2026-05-22 18:00:00', 'concluido', 100, 80, 20, 0, 'Obs Evento 20');

-- 7. DOCUMENTOS
INSERT INTO documentos (doc_cli_id, doc_evt_id, doc_nome_arquivo, doc_caminho_url, doc_tipo_arquivo) VALUES
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 1'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 1'), 'Doc 1.pdf', 'http://url/doc1.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 2'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 2'), 'Doc 2.pdf', 'http://url/doc2.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 3'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 3'), 'Doc 3.pdf', 'http://url/doc3.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 4'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 4'), 'Doc 4.pdf', 'http://url/doc4.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 5'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 5'), 'Doc 5.pdf', 'http://url/doc5.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 6'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 6'), 'Doc 6.pdf', 'http://url/doc6.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 7'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 7'), 'Doc 7.pdf', 'http://url/doc7.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 8'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 8'), 'Doc 8.pdf', 'http://url/doc8.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 9'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 9'), 'Doc 9.pdf', 'http://url/doc9.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 10'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 10'), 'Doc 10.pdf', 'http://url/doc10.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 11'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 11'), 'Doc 11.pdf', 'http://url/doc11.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 12'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 12'), 'Doc 12.pdf', 'http://url/doc12.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 13'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 13'), 'Doc 13.pdf', 'http://url/doc13.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 14'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 14'), 'Doc 14.pdf', 'http://url/doc14.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 15'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 15'), 'Doc 15.pdf', 'http://url/doc15.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 16'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 16'), 'Doc 16.pdf', 'http://url/doc16.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 17'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 17'), 'Doc 17.pdf', 'http://url/doc17.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 18'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 18'), 'Doc 18.pdf', 'http://url/doc18.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 19'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 19'), 'Doc 19.pdf', 'http://url/doc19.pdf', 'pdf'),
((SELECT cli_id FROM clientes WHERE cli_nome = 'Cliente 20'), (SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 20'), 'Doc 20.pdf', 'http://url/doc20.pdf', 'pdf');

-- 8. ESCALA
INSERT INTO escala (esc_evt_id, esc_fun_id, esc_observacoes) VALUES
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 1'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 1'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 2'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 2'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 3'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 3'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 4'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 4'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 5'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 5'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 6'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 6'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 7'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 7'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 8'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 8'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 9'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 9'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 10'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 10'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 11'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 11'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 12'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 12'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 13'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 13'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 14'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 14'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 15'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 15'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 16'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 16'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 17'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 17'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 18'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 18'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 19'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 19'), 'Turno integral'),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 20'), (SELECT fun_id FROM funcionarios WHERE fun_nome = 'Funcionario 20'), 'Turno integral');

-- 9. EVENTO_PRODUTO
INSERT INTO evento_produto (evp_evt_id, evp_prd_id, evp_quantidade) VALUES
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 1'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 1'), 46),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 2'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 2'), 47),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 3'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 3'), 41),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 4'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 4'), 16),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 5'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 5'), 13),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 6'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 6'), 17),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 7'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 7'), 2),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 8'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 8'), 11),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 9'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 9'), 43),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 10'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 10'), 50),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 11'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 11'), 8),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 12'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 12'), 15),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 13'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 13'), 30),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 14'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 14'), 32),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 15'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 15'), 2),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 16'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 16'), 46),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 17'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 17'), 26),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 18'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 18'), 32),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 19'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 19'), 35),
((SELECT evt_id FROM eventos WHERE evt_nome = 'Evento 20'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 20'), 50);

-- 10. ORCAMENTO_PRODUTO
INSERT INTO orcamento_produto (orp_orc_id, orp_prd_id, orp_quantidade, orp_preco_unitario) VALUES
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 1'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 1'), 28, 36.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 2'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 2'), 19, 44.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 3'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 3'), 34, 36.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 4'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 4'), 43, 7.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 5'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 5'), 35, 47.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 6'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 6'), 8, 34.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 7'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 7'), 40, 13.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 8'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 8'), 25, 41.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 9'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 9'), 28, 17.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 10'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 10'), 1, 27.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 11'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 11'), 25, 30.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 12'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 12'), 44, 32.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 13'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 13'), 24, 44.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 14'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 14'), 8, 33.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 15'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 15'), 25, 14.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 16'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 16'), 17, 5.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 17'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 17'), 27, 22.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 18'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 18'), 38, 11.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 19'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 19'), 16, 14.00),
((SELECT orc_id FROM orcamentos WHERE orc_observacoes = 'Obs do orcamento 20'), (SELECT prd_id FROM produtos WHERE prd_nome = 'Produto 20'), 29, 14.00);

-- 11. CATALOGOS
INSERT INTO catalogos (cat_titulo, cat_descricao, cat_preco_base, cat_ativo) VALUES
('Catalogo 1', 'Descricao 1', 1454.00, true),
('Catalogo 2', 'Descricao 2', 1834.00, true),
('Catalogo 3', 'Descricao 3', 2452.00, true),
('Catalogo 4', 'Descricao 4', 742.00, true),
('Catalogo 5', 'Descricao 5', 3131.00, true),
('Catalogo 6', 'Descricao 6', 198.00, true),
('Catalogo 7', 'Descricao 7', 1380.00, true),
('Catalogo 8', 'Descricao 8', 3562.00, true),
('Catalogo 9', 'Descricao 9', 2074.00, true),
('Catalogo 10', 'Descricao 10', 3932.00, true),
('Catalogo 11', 'Descricao 11', 291.00, true),
('Catalogo 12', 'Descricao 12', 2301.00, true),
('Catalogo 13', 'Descricao 13', 910.00, true),
('Catalogo 14', 'Descricao 14', 2795.00, true),
('Catalogo 15', 'Descricao 15', 1930.00, true),
('Catalogo 16', 'Descricao 16', 989.00, true),
('Catalogo 17', 'Descricao 17', 107.00, true),
('Catalogo 18', 'Descricao 18', 3013.00, true),
('Catalogo 19', 'Descricao 19', 2237.00, true),
('Catalogo 20', 'Descricao 20', 4363.00, true);

COMMIT;