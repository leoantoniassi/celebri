-- ============================================================
-- CELEBRI — Migration 011: garçom e cozinha
-- ============================================================
-- mesas           layout de cada salão (local), montado uma vez no painel
--                 e reaproveitado em todo evento daquele local.
-- evento_servico  cronograma da cozinha: o que será servido, quanto e
--                 a que horas.
-- pedidos/itens   comanda do garçom: pedidos por mesa que aparecem na
--                 tela da cozinha. Não há cobrança (buffet com tudo incluso).
--
-- Idempotente: pode rodar de novo sem efeito colateral.
-- ============================================================

CREATE TABLE IF NOT EXISTS mesas (
    mes_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes_emp_id        UUID          NOT NULL REFERENCES empresas(emp_id),
    mes_loc_id        UUID          NOT NULL REFERENCES locais(loc_id) ON DELETE CASCADE,
    mes_numero        VARCHAR(10)   NOT NULL,
    mes_lugares       INTEGER       NOT NULL DEFAULT 4 CHECK (mes_lugares BETWEEN 1 AND 50),
    -- Posição no mapa em % da largura/altura do salão (0 a 100).
    mes_pos_x         NUMERIC(5,2)  NOT NULL DEFAULT 50 CHECK (mes_pos_x BETWEEN 0 AND 100),
    mes_pos_y         NUMERIC(5,2)  NOT NULL DEFAULT 50 CHECK (mes_pos_y BETWEEN 0 AND 100),
    mes_criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mes_atualizado_em TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mes_deletado_em   TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mesas_local_numero ON mesas (mes_loc_id, mes_numero)
    WHERE mes_deletado_em IS NULL;

CREATE TABLE IF NOT EXISTS evento_servico (
    svc_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    svc_emp_id        UUID          NOT NULL REFERENCES empresas(emp_id),
    svc_evt_id        UUID          NOT NULL REFERENCES eventos(evt_id) ON DELETE CASCADE,
    svc_item          VARCHAR(150)  NOT NULL,
    svc_quantidade    NUMERIC(10,2),
    svc_unidade       VARCHAR(30),
    svc_horario       TIMESTAMP,
    svc_status        VARCHAR(20)   NOT NULL DEFAULT 'pendente'
                      CHECK (svc_status IN ('pendente', 'preparando', 'servido')),
    svc_observacao    TEXT,
    svc_criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    svc_atualizado_em TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    svc_deletado_em   TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evento_servico_evento ON evento_servico (svc_evt_id) WHERE svc_deletado_em IS NULL;

CREATE TABLE IF NOT EXISTS pedidos (
    ped_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    ped_emp_id        UUID          NOT NULL REFERENCES empresas(emp_id),
    ped_evt_id        UUID          NOT NULL REFERENCES eventos(evt_id) ON DELETE CASCADE,
    ped_mes_id        UUID          NOT NULL REFERENCES mesas(mes_id),
    ped_usr_id        UUID          REFERENCES usuarios(usr_id) ON DELETE SET NULL,
    ped_status        VARCHAR(20)   NOT NULL DEFAULT 'enviado'
                      CHECK (ped_status IN ('enviado', 'preparando', 'pronto', 'entregue', 'cancelado')),
    ped_observacao    TEXT,
    ped_criado_em     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ped_atualizado_em TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pedidos_evento_status ON pedidos (ped_evt_id, ped_status);

CREATE TABLE IF NOT EXISTS pedido_itens (
    pit_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    pit_emp_id        UUID          NOT NULL REFERENCES empresas(emp_id),
    pit_ped_id        UUID          NOT NULL REFERENCES pedidos(ped_id) ON DELETE CASCADE,
    pit_descricao     VARCHAR(150)  NOT NULL,
    pit_quantidade    INTEGER       NOT NULL DEFAULT 1 CHECK (pit_quantidade BETWEEN 1 AND 100),
    pit_observacao    VARCHAR(300),
    -- Alergia ou restrição: a cozinha vê em destaque.
    pit_alerta        BOOLEAN       NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens (pit_ped_id);
