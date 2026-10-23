-- ============================================================
-- PROJETO Celebri - DDL (PostgreSQL)
-- Script de inicialização para Docker
-- O banco 'projeto_mais_alegria' é criado automaticamente
-- pelo Docker via variável POSTGRES_DB
-- ============================================================

-- Ativando a extensão nativa para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Remove tabelas existentes (em ordem reversa de dependência)
DROP TABLE IF EXISTS orcamento_produto     CASCADE;
DROP TABLE IF EXISTS evento_produto        CASCADE;
DROP TABLE IF EXISTS escala                CASCADE;
DROP TABLE IF EXISTS documentos            CASCADE;
DROP TABLE IF EXISTS catalogos             CASCADE;
DROP TABLE IF EXISTS eventos               CASCADE;
DROP TABLE IF EXISTS orcamentos            CASCADE;
DROP TABLE IF EXISTS produtos              CASCADE;
DROP TABLE IF EXISTS funcionarios          CASCADE;
DROP TABLE IF EXISTS fornecedores          CASCADE;
DROP TABLE IF EXISTS clientes              CASCADE;
DROP TABLE IF EXISTS usuarios              CASCADE;
DROP TABLE IF EXISTS locais                CASCADE;
DROP TABLE IF EXISTS funcoes               CASCADE;
DROP TABLE IF EXISTS categorias_fornecedor CASCADE;
DROP TABLE IF EXISTS categorias_produto    CASCADE;

-- ============================================================
-- 0. USUARIOS
-- ============================================================
CREATE TABLE usuarios (
    usr_id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    usr_nome              VARCHAR(150) NOT NULL,
    usr_email             VARCHAR(150) NOT NULL UNIQUE,
    usr_senha             VARCHAR(255),
    usr_role              VARCHAR(20)  NOT NULL DEFAULT 'operador',
    usr_status            VARCHAR(30)  NOT NULL DEFAULT 'ativo',
    usr_convite_token     VARCHAR(100) UNIQUE,
    usr_convite_expiracao TIMESTAMP,
    usr_reset_token       VARCHAR(255),
    usr_reset_expiracao   TIMESTAMP,
    usr_criado_em         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_usuarios_role CHECK (usr_role IN ('gerente', 'operador')),
    CONSTRAINT ck_usuarios_status CHECK (usr_status IN ('pendente', 'ativo'))
);

CREATE INDEX idx_usuarios_convite_token ON usuarios(usr_convite_token);
CREATE INDEX idx_usuarios_reset_token ON usuarios(usr_reset_token) WHERE usr_reset_token IS NOT NULL;

COMMENT ON TABLE  usuarios          IS 'Usuários do sistema com controle de acesso por role.';
COMMENT ON COLUMN usuarios.usr_role IS 'Papel no sistema: gerente ou operador.';
COMMENT ON COLUMN usuarios.usr_status IS 'Status da conta: pendente ou ativo.';

-- ============================================================
-- L. LOCAIS
-- Endereços completos de locais de evento
-- ============================================================
CREATE TABLE locais (
    loc_id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    loc_nome          VARCHAR(150) NOT NULL,
    loc_logradouro    VARCHAR(200) NOT NULL,
    loc_numero        VARCHAR(10)  NOT NULL,
    loc_complemento   VARCHAR(100),
    loc_bairro        VARCHAR(100) NOT NULL,
    loc_cidade        VARCHAR(100) NOT NULL,
    loc_estado        CHAR(2)      NOT NULL,
    loc_cep           VARCHAR(9)   NOT NULL,
    loc_observacoes        TEXT,
    loc_capacidade_maxima  INTEGER,
    loc_criado_em          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    loc_atualizado_em      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    loc_deletado_em        TIMESTAMP,

    CONSTRAINT ck_locais_estado CHECK (char_length(loc_estado) = 2),
    CONSTRAINT ck_locais_capacidade_maxima CHECK (loc_capacidade_maxima IS NULL OR loc_capacidade_maxima >= 0)
  );

COMMENT ON TABLE  locais                     IS 'Locais de realização dos eventos (endereço completo).';
COMMENT ON COLUMN locais.loc_estado          IS 'UF com 2 caracteres. Ex: SP, RJ, MG.';
COMMENT ON COLUMN locais.loc_cep             IS 'CEP no formato 00000-000.';
COMMENT ON COLUMN locais.loc_capacidade_maxima IS 'Capacidade máxima de pessoas suportada pelo local. Nullable — locais externos podem não ter limite definido.';

-- ============================================================
-- F. FUNCOES (lookup de funções de colaboradores)
-- ============================================================
CREATE TABLE funcoes (
    fnc_id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    fnc_nome      VARCHAR(80) NOT NULL,
    fnc_descricao TEXT,
    fnc_criado_em TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_funcoes_nome UNIQUE (fnc_nome)
);

COMMENT ON TABLE  funcoes          IS 'Tabela de referência para funções/cargos dos colaboradores.';
COMMENT ON COLUMN funcoes.fnc_nome IS 'Nome da função. Ex: Recreador, Garçom, Cozinheiro, Segurança.';

-- ============================================================
-- CF. CATEGORIAS_FORNECEDOR (lookup de categorias de fornecedores)
-- ============================================================
CREATE TABLE categorias_fornecedor (
    caf_id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    caf_nome      VARCHAR(80) NOT NULL,
    caf_descricao TEXT,
    caf_criado_em TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_categorias_fornecedor_nome UNIQUE (caf_nome)
);

COMMENT ON TABLE  categorias_fornecedor          IS 'Tabela de referência para categorias de fornecedores.';
COMMENT ON COLUMN categorias_fornecedor.caf_nome IS 'Nome da categoria. Ex: Alimentos, Bebidas, Decoração.';

-- ============================================================
-- CP. CATEGORIAS_PRODUTO (lookup de categorias de itens do estoque)
-- ============================================================
CREATE TABLE categorias_produto (
    cap_id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    cap_nome      VARCHAR(80) NOT NULL,
    cap_descricao TEXT,
    cap_criado_em TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_categorias_produto_nome UNIQUE (cap_nome)
);

COMMENT ON TABLE  categorias_produto          IS 'Tabela de referência para categorias de itens do estoque.';
COMMENT ON COLUMN categorias_produto.cap_nome IS 'Nome da categoria. Ex: Alimento, Bebida, Descartável, Decoração.';

-- ============================================================
-- 1. CLIENTES
-- ============================================================
CREATE TABLE clientes (
    cli_id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    cli_nome                 VARCHAR(150) NOT NULL,
    cli_email                VARCHAR(150),
    cli_rgcpf                VARCHAR(20)  NOT NULL,
    cli_telefone             VARCHAR(20)  NOT NULL,
    cli_telefone_residencial VARCHAR(20),
    cli_criado_em            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cli_atualizado_em        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cli_deletado_em          TIMESTAMP,

    CONSTRAINT uq_clientes_rgcpf UNIQUE (cli_rgcpf),
    CONSTRAINT uq_clientes_email UNIQUE (cli_email)
);

-- ============================================================
-- 2. FORNECEDORES
-- Referencia categorias_fornecedor via FK
-- ============================================================
CREATE TABLE fornecedores (
    for_id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    for_nome          VARCHAR(150) NOT NULL,
    for_email         VARCHAR(150) NOT NULL,
    for_cnpj          VARCHAR(20)  NOT NULL,
    for_telefone      VARCHAR(20)  NOT NULL,
    for_caf_id        UUID         NOT NULL,
    for_criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    for_atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    for_deletado_em   TIMESTAMP,

    CONSTRAINT uq_fornecedores_cnpj  UNIQUE (for_cnpj),
    CONSTRAINT uq_fornecedores_email UNIQUE (for_email),

    CONSTRAINT fk_fornecedores_categoria
        FOREIGN KEY (for_caf_id) REFERENCES categorias_fornecedor (caf_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE  fornecedores          IS 'Fornecedores de produtos e serviços para os eventos.';
COMMENT ON COLUMN fornecedores.for_caf_id IS 'FK para a tabela de categorias de fornecedores.';

-- ============================================================
-- 3. FUNCIONARIOS
-- Referencia funcoes via FK
-- ============================================================
CREATE TABLE funcionarios (
    fun_id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    fun_nome                 VARCHAR(150) NOT NULL,
    fun_email                VARCHAR(150),
    fun_telefone             VARCHAR(20),
    fun_telefone_residencial VARCHAR(20),
    fun_fnc_id               UUID         NOT NULL,
    fun_criado_em            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fun_atualizado_em        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fun_deletado_em          TIMESTAMP,

    CONSTRAINT uq_funcionarios_email UNIQUE (fun_email),

    CONSTRAINT fk_funcionarios_funcao
        FOREIGN KEY (fun_fnc_id) REFERENCES funcoes (fnc_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE  funcionarios           IS 'Colaboradores que trabalham nos eventos.';
COMMENT ON COLUMN funcionarios.fun_fnc_id IS 'FK para a tabela de funções/cargos.';

-- ============================================================
-- 4. PRODUTOS (ESTOQUE)
-- Referencia categorias_produto via FK
-- ============================================================
CREATE TABLE produtos (
    prd_id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    prd_nome            VARCHAR(150)  NOT NULL,
    prd_cap_id          UUID          NOT NULL,
    prd_quantidade      NUMERIC(10,2) NOT NULL DEFAULT 0,
    prd_estoque_minimo  NUMERIC(10,2) NOT NULL DEFAULT 0,
    prd_unidade_medida  VARCHAR(30)   NOT NULL,
    prd_custo_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
    prd_criado_em       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prd_atualizado_em   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    prd_deletado_em     TIMESTAMP,

    CONSTRAINT fk_produtos_categoria
        FOREIGN KEY (prd_cap_id) REFERENCES categorias_produto (cap_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

COMMENT ON TABLE  produtos                   IS 'Itens do estoque utilizados nos eventos.';
COMMENT ON COLUMN produtos.prd_cap_id        IS 'FK para a tabela de categorias de produto.';
COMMENT ON COLUMN produtos.prd_estoque_minimo IS 'Quantidade mínima antes de disparar alerta de estoque baixo. Alerta ativo quando prd_quantidade <= prd_estoque_minimo.';

-- ============================================================
-- 5. ORCAMENTOS
-- Referencia clientes e locais via FK
-- ============================================================
CREATE TABLE orcamentos (
    orc_id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    orc_cli_id          UUID          NOT NULL,
    orc_loc_id          UUID,
    orc_nome            VARCHAR(150),
    orc_valor_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    orc_data_validade   DATE,
    orc_data_evento      TIMESTAMP,
    orc_horario_termino  TIMESTAMP,
    orc_status          VARCHAR(20)   NOT NULL DEFAULT 'pendente',
    orc_qtd_pessoas     INTEGER       NOT NULL DEFAULT 0,
    orc_qtd_adultos     INTEGER       NOT NULL DEFAULT 0,
    orc_qtd_criancas    INTEGER       NOT NULL DEFAULT 0,
    orc_qtd_bebes       INTEGER       NOT NULL DEFAULT 0,
    orc_observacoes     TEXT,
    orc_criado_em       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    orc_atualizado_em   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    orc_deletado_em     TIMESTAMP,

    CONSTRAINT fk_orcamentos_cliente
        FOREIGN KEY (orc_cli_id) REFERENCES clientes (cli_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_orcamentos_local
        FOREIGN KEY (orc_loc_id) REFERENCES locais (loc_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT ck_orcamentos_status
        CHECK (orc_status IN ('pendente', 'aprovado', 'reprovado')),

    CONSTRAINT ck_orcamentos_horario_termino
        CHECK (orc_horario_termino IS NULL OR orc_data_evento IS NULL OR orc_horario_termino > orc_data_evento)
);

COMMENT ON COLUMN orcamentos.orc_loc_id IS 'FK para o local do orçamento. Nullable — pode não ter local definido ainda.';

-- ============================================================
-- 6. EVENTOS
-- Referencia clientes, orcamentos e locais via FK
-- ============================================================
CREATE TABLE eventos (
    evt_id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    evt_cli_id          UUID          NOT NULL,
    evt_orc_id          UUID,
    evt_loc_id          UUID,
    evt_nome            VARCHAR(150)  NOT NULL,
    evt_data_evento     TIMESTAMP     NOT NULL,
    evt_horario_termino TIMESTAMP     NOT NULL,
    evt_status          VARCHAR(20)   NOT NULL DEFAULT 'pendente',
    evt_qtd_pessoas     INTEGER       NOT NULL DEFAULT 0,
    evt_qtd_adultos     INTEGER       NOT NULL DEFAULT 0,
    evt_qtd_criancas    INTEGER       NOT NULL DEFAULT 0,
    evt_qtd_bebes       INTEGER       NOT NULL DEFAULT 0,
    evt_orcamento       NUMERIC(12,2) NOT NULL DEFAULT 0,
    evt_observacoes     TEXT,
    evt_criado_em       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evt_atualizado_em   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evt_deletado_em     TIMESTAMP,

    CONSTRAINT fk_eventos_cliente
        FOREIGN KEY (evt_cli_id) REFERENCES clientes (cli_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_eventos_orcamento
        FOREIGN KEY (evt_orc_id) REFERENCES orcamentos (orc_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_eventos_local
        FOREIGN KEY (evt_loc_id) REFERENCES locais (loc_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT ck_eventos_status
        CHECK (evt_status IN ('pendente', 'cancelado', 'concluido')),

    CONSTRAINT ck_eventos_horario_termino
        CHECK (evt_horario_termino > evt_data_evento)
);

COMMENT ON COLUMN eventos.evt_loc_id IS 'FK para o local do evento. Nullable — pode não ter local definido ainda.';
COMMENT ON COLUMN eventos.evt_horario_termino IS 'Horário de término do evento. Deve ser maior que evt_data_evento para garantir consistência temporal.';

-- ============================================================
-- 7. DOCUMENTOS
-- ============================================================
CREATE TABLE documentos (
    doc_id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_cli_id        UUID,
    doc_evt_id        UUID,
    doc_nome_arquivo  VARCHAR(255) NOT NULL,
    doc_caminho_url   TEXT         NOT NULL,
    doc_tipo_arquivo  VARCHAR(10)  NOT NULL,
    doc_criado_em     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    doc_atualizado_em TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    doc_deletado_em   TIMESTAMP,

    CONSTRAINT fk_documentos_cliente
        FOREIGN KEY (doc_cli_id) REFERENCES clientes (cli_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_documentos_evento
        FOREIGN KEY (doc_evt_id) REFERENCES eventos (evt_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT ck_documentos_tipo
        CHECK (doc_tipo_arquivo IN ('pdf', 'jpg', 'png'))
);

-- ============================================================
-- 8. CATÁLOGOS DE BUFFET
-- ============================================================
CREATE TABLE catalogos (
    cat_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    cat_titulo        VARCHAR(200)  NOT NULL,
    cat_descricao     TEXT,
    cat_preco_base    NUMERIC(12,2),
    cat_url_externa   TEXT,
    cat_imagem_url    TEXT,
    cat_ativo         BOOLEAN       NOT NULL DEFAULT true,
    cat_criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cat_atualizado_em TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cat_deletado_em   TIMESTAMP
);

COMMENT ON TABLE  catalogos                  IS 'Catálogos de buffet para envio via WhatsApp.';
COMMENT ON COLUMN catalogos.cat_url_externa  IS 'Link externo (Google Drive, Canva, etc.) para o catálogo.';
COMMENT ON COLUMN catalogos.cat_imagem_url   IS 'URL da imagem de capa do catálogo (upload interno).';

-- ============================================================
-- 9. ESCALA (Evento ↔ Funcionário)
-- ============================================================
CREATE TABLE escala (
    esc_id            UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
    esc_evt_id        UUID      NOT NULL,
    esc_fun_id        UUID      NOT NULL,
    esc_observacoes   TEXT,
    esc_criado_em     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    esc_atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    esc_deletado_em   TIMESTAMP,

    CONSTRAINT fk_escala_evento
        FOREIGN KEY (esc_evt_id) REFERENCES eventos (evt_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_escala_funcionario
        FOREIGN KEY (esc_fun_id) REFERENCES funcionarios (fun_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT uq_escala_evento_funcionario
        UNIQUE (esc_evt_id, esc_fun_id)
);

-- ============================================================
-- 10. EVENTO_PRODUTO
-- ============================================================
CREATE TABLE evento_produto (
    evp_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    evp_evt_id        UUID          NOT NULL,
    evp_prd_id        UUID          NOT NULL,
    evp_quantidade    NUMERIC(10,2) NOT NULL DEFAULT 0,
    evp_criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evp_atualizado_em TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    evp_deletado_em   TIMESTAMP,

    CONSTRAINT fk_evento_produto_evento
        FOREIGN KEY (evp_evt_id) REFERENCES eventos (evt_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_evento_produto_produto
        FOREIGN KEY (evp_prd_id) REFERENCES produtos (prd_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_evento_produto
        UNIQUE (evp_evt_id, evp_prd_id)
);

-- ============================================================
-- 11. ORCAMENTO_PRODUTO
-- ============================================================
CREATE TABLE orcamento_produto (
    orp_id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    orp_orc_id         UUID          NOT NULL,
    orp_prd_id         UUID          NOT NULL,
    orp_quantidade     NUMERIC(10,2) NOT NULL DEFAULT 0,
    orp_preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
    orp_criado_em      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    orp_atualizado_em  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    orp_deletado_em    TIMESTAMP,

    CONSTRAINT fk_orcamento_produto_orcamento
        FOREIGN KEY (orp_orc_id) REFERENCES orcamentos (orc_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_orcamento_produto_produto
        FOREIGN KEY (orp_prd_id) REFERENCES produtos (prd_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_orcamento_produto
        UNIQUE (orp_orc_id, orp_prd_id)
);

-- ============================================================
-- ÍNDICES ADICIONAIS
-- ============================================================

-- Lookup tables
CREATE INDEX idx_funcoes_nome                ON funcoes               (fnc_nome);
CREATE INDEX idx_categorias_fornecedor_nome  ON categorias_fornecedor (caf_nome);
CREATE INDEX idx_categorias_produto_nome     ON categorias_produto    (cap_nome);

-- Locais
CREATE INDEX idx_locais_cidade               ON locais                (loc_cidade);
CREATE INDEX idx_locais_estado               ON locais                (loc_estado);

-- Fornecedores
CREATE INDEX idx_fornecedores_categoria      ON fornecedores          (for_caf_id);

-- Funcionários
CREATE INDEX idx_funcionarios_funcao         ON funcionarios          (fun_fnc_id);

-- Produtos
CREATE INDEX idx_produtos_categoria          ON produtos              (prd_cap_id);
CREATE INDEX idx_produtos_estoque_baixo      ON produtos              (prd_quantidade, prd_estoque_minimo);

-- Orçamentos
CREATE INDEX idx_orcamentos_cliente          ON orcamentos            (orc_cli_id);
CREATE INDEX idx_orcamentos_status           ON orcamentos            (orc_status);
CREATE INDEX idx_orcamentos_local            ON orcamentos            (orc_loc_id);

-- Eventos
CREATE INDEX idx_eventos_cliente             ON eventos               (evt_cli_id);
CREATE INDEX idx_eventos_orcamento           ON eventos               (evt_orc_id);
CREATE INDEX idx_eventos_local               ON eventos               (evt_loc_id);
CREATE INDEX idx_eventos_data                ON eventos               (evt_data_evento);

-- Documentos
CREATE INDEX idx_documentos_cliente          ON documentos            (doc_cli_id);
CREATE INDEX idx_documentos_evento           ON documentos            (doc_evt_id);

-- Escala
CREATE INDEX idx_escala_evento               ON escala                (esc_evt_id);
CREATE INDEX idx_escala_funcionario          ON escala                (esc_fun_id);

-- Evento_produto / Orcamento_produto
CREATE INDEX idx_evento_produto_evento       ON evento_produto        (evp_evt_id);
CREATE INDEX idx_orcamento_produto_orc       ON orcamento_produto     (orp_orc_id);

-- ============================================================
-- LGPD (migration 013): auditoria, anonimização e aceite de termos
-- (convites.cnv_anonimizado_em e o restante do multi-tenant vêm das migrations)
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

ALTER TABLE clientes     ADD COLUMN IF NOT EXISTS cli_anonimizado_em TIMESTAMPTZ;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS fun_anonimizado_em TIMESTAMPTZ;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS for_anonimizado_em TIMESTAMPTZ;
ALTER TABLE usuarios     ADD COLUMN IF NOT EXISTS usr_termos_aceitos_em TIMESTAMPTZ;
ALTER TABLE usuarios     ADD COLUMN IF NOT EXISTS usr_termos_versao VARCHAR(20);
