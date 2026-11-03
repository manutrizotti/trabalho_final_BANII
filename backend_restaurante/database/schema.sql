--=====================================================================
-- SISTEMA DE GESTÃO DE RESTAURANTE
--=====================================================================

--===================================
-- 0) TABELAS (DDL)
--===================================

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nome_cliente VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL,
    cpf VARCHAR(14) UNIQUE
);

CREATE TABLE mesa (
    id_mesa SERIAL PRIMARY KEY,
    numero_mesa INTEGER UNIQUE NOT NULL,
    localizacao VARCHAR(20) CHECK (localizacao IN ('salão', 'varanda', 'mezanino')),
    capacidade_pessoas INTEGER CHECK (capacidade_pessoas > 0),
    status_mesa VARCHAR(20) DEFAULT 'ativa' CHECK (status_mesa IN ('ativa', 'quebrada', 'removida'))
);

CREATE TABLE reserva (
    id_reserva SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente),
    data_hora TIMESTAMP NOT NULL,
    numero_pessoas INTEGER CHECK (numero_pessoas > 0),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmada', 'em andamento', 'finalizada', 'cancelada')),
    observacoes TEXT
);

CREATE TABLE reserva_mesa (
    id_reserva INTEGER REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    id_mesa INTEGER REFERENCES mesa(id_mesa) ON DELETE CASCADE,
    PRIMARY KEY (id_reserva, id_mesa)
);

CREATE TABLE itens_cardapio (
    id_cardapio SERIAL PRIMARY KEY,
    codigo_cardapio VARCHAR(50) UNIQUE NOT NULL,
    categoria VARCHAR(50) CHECK (categoria IN ('entradas', 'pratos principais', 'sobremesas', 'bebidas alcoólicas', 'bebidas não alcoólicas')),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    tempo_preparo_minutos INTEGER CHECK (tempo_preparo_minutos >= 0),
    disponibilidade BOOLEAN DEFAULT TRUE,
    eh_combo BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE composicao (
    id_combo INTEGER REFERENCES itens_cardapio(id_cardapio) ON DELETE CASCADE,
    id_item INTEGER REFERENCES itens_cardapio(id_cardapio) ON DELETE CASCADE,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    PRIMARY KEY (id_combo, id_item),
    CONSTRAINT chk_combo_diferente_item CHECK (id_combo <> id_item)
);

CREATE TABLE garcom (
    id_garcom SERIAL PRIMARY KEY,
    codigo_garcom VARCHAR(50) UNIQUE NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    data_admissao DATE DEFAULT CURRENT_DATE,
    percentual_comissao NUMERIC(5, 2) CHECK (percentual_comissao >= 0),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'de ferias', 'demitido'))
);

CREATE TABLE forma_pagamento (
    id_pagamento SERIAL PRIMARY KEY,
    descricao VARCHAR(50) UNIQUE NOT NULL CHECK (descricao IN ('dinheiro', 'cartão de crédito', 'cartão de débito', 'PIX'))
);

INSERT INTO forma_pagamento (descricao) VALUES
    ('dinheiro'), ('cartão de crédito'), ('cartão de débito'), ('PIX')
ON CONFLICT (descricao) DO NOTHING;

CREATE TABLE pedido (
    id_pedido SERIAL PRIMARY KEY,
    tipo INTEGER NOT NULL CHECK (tipo IN (1, 2)), -- 1: Salão, 2: Delivery
    status_pedido VARCHAR(20) DEFAULT 'aberto' CHECK (status_pedido IN ('aberto', 'fechado', 'cancelado')),
    pagou_dez_porcento BOOLEAN DEFAULT FALSE,
    valor_total NUMERIC(12, 2) DEFAULT 0 CHECK (valor_total >= 0),
    id_cliente INTEGER REFERENCES cliente(id_cliente),
    id_reserva INTEGER REFERENCES reserva(id_reserva),
    endereco_entrega TEXT,
    taxa_entrega NUMERIC(10, 2) CHECK (taxa_entrega >= 0),
    status_entrega VARCHAR(30) CHECK (status_entrega IN ('preparando', 'saiu para entrega', 'entregue')),
    data_hora_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_mesa INTEGER REFERENCES mesa(id_mesa),
    id_garcom INTEGER REFERENCES garcom(id_garcom),

    CONSTRAINT chk_tipo_pedido CHECK (
        (tipo = 1 AND taxa_entrega IS NULL AND endereco_entrega IS NULL AND status_entrega IS NULL
                  AND id_mesa IS NOT NULL AND id_garcom IS NOT NULL)
        OR
        (tipo = 2 AND taxa_entrega IS NOT NULL AND endereco_entrega IS NOT NULL AND status_entrega IS NOT NULL
                  AND id_mesa IS NULL AND id_garcom IS NULL AND id_reserva IS NULL AND id_cliente IS NOT NULL)
    )
);

CREATE TABLE item_pedido (
    id_item_pedido SERIAL PRIMARY KEY,
    id_pedido INTEGER NOT NULL REFERENCES pedido(id_pedido) ON DELETE CASCADE,
    id_cardapio INTEGER NOT NULL REFERENCES itens_cardapio(id_cardapio),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    valor_unitario NUMERIC(10, 2) NOT NULL CHECK (valor_unitario >= 0),
    observacoes TEXT,
    status_cozinha VARCHAR(30) DEFAULT 'aguardando preparo' CHECK (status_cozinha IN ('aguardando preparo', 'em preparo', 'pronto', 'servido'))
);

CREATE TABLE conta (
    id_conta SERIAL PRIMARY KEY,
    id_pagamento INTEGER NOT NULL REFERENCES forma_pagamento(id_pagamento),
    id_pedido INTEGER NOT NULL REFERENCES pedido(id_pedido),
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valor_atribuido NUMERIC(12, 2) NOT NULL CHECK (valor_atribuido > 0)
);

CREATE INDEX idx_pedido_mesa ON pedido(id_mesa);
CREATE INDEX idx_pedido_cliente ON pedido(id_cliente);
CREATE INDEX idx_pedido_reserva ON pedido(id_reserva);
CREATE INDEX idx_pedido_abertura ON pedido(data_hora_abertura);
CREATE INDEX idx_reserva_data_hora ON reserva(data_hora);
CREATE INDEX idx_item_pedido_pedido ON item_pedido(id_pedido);
CREATE INDEX idx_conta_pedido ON conta(id_pedido);

--===================================
-- 1) CRUD
--===================================

-- CLIENTE
CREATE OR REPLACE FUNCTION fn_gerenciar_cliente(p_nome VARCHAR, p_telefone VARCHAR) RETURNS INTEGER AS $$
DECLARE v_id INTEGER;
BEGIN
    SELECT id_cliente INTO v_id FROM cliente WHERE telefone = p_telefone;
    IF v_id IS NULL THEN
        INSERT INTO cliente (nome_cliente, telefone) VALUES (p_nome, p_telefone) RETURNING id_cliente INTO v_id;
    ELSE
        UPDATE cliente SET nome_cliente = p_nome WHERE id_cliente = v_id;
    END IF;
    RETURN v_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_alterar_cliente(p_id_cliente INTEGER, p_novo_nome VARCHAR, p_novo_telefone VARCHAR) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cliente WHERE id_cliente = p_id_cliente) THEN
        RAISE EXCEPTION 'Cliente % não encontrado.', p_id_cliente;
    END IF;

    IF EXISTS (SELECT 1 FROM cliente WHERE telefone = p_novo_telefone AND id_cliente <> p_id_cliente) THEN
        RAISE EXCEPTION 'O telefone % já está cadastrado para outro cliente.', p_novo_telefone;
    END IF;

    UPDATE cliente 
    SET nome_cliente = p_novo_nome, 
        telefone = p_novo_telefone 
    WHERE id_cliente = p_id_cliente;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_deletar_cliente(p_id INTEGER) RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pedido WHERE id_cliente = p_id)
       OR EXISTS (SELECT 1 FROM reserva WHERE id_cliente = p_id) THEN
        RAISE EXCEPTION 'Não é possível excluir: o cliente possui histórico de pedidos ou reservas.';
    ELSE
        DELETE FROM cliente WHERE id_cliente = p_id;
    END IF;
END; $$ LANGUAGE plpgsql;

-- MESA
CREATE OR REPLACE FUNCTION fn_inserir_mesa(p_num INTEGER, p_loc VARCHAR, p_cap INTEGER) RETURNS VOID AS $$
BEGIN
    INSERT INTO mesa (numero_mesa, localizacao, capacidade_pessoas) VALUES (p_num, p_loc, p_cap);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_alterar_mesa(p_id INTEGER, p_num INTEGER, p_loc VARCHAR, p_cap INTEGER, p_status VARCHAR) RETURNS VOID AS $$
BEGIN
    UPDATE mesa SET numero_mesa = p_num, localizacao = p_loc, capacidade_pessoas = p_cap, status_mesa = p_status WHERE id_mesa = p_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_deletar_mesa(p_id INTEGER) RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pedido WHERE id_mesa = p_id) OR EXISTS (SELECT 1 FROM reserva_mesa WHERE id_mesa = p_id) THEN
        UPDATE mesa SET status_mesa = 'removida' WHERE id_mesa = p_id;
        RAISE NOTICE 'A mesa possui histórico no sistema. O status foi alterado para "removida".';
    ELSE
        DELETE FROM mesa WHERE id_mesa = p_id;
    END IF;
END; $$ LANGUAGE plpgsql;

-- CARDÁPIO

CREATE OR REPLACE FUNCTION fn_inserir_item_cardapio(p_codigo VARCHAR, p_cat VARCHAR, p_nome VARCHAR, p_desc TEXT, p_preco NUMERIC, p_tempo INTEGER, p_eh_combo BOOLEAN DEFAULT FALSE) RETURNS VOID AS $$
BEGIN
    INSERT INTO itens_cardapio (codigo_cardapio, categoria, nome, descricao, preco, tempo_preparo_minutos, eh_combo)
    VALUES (p_codigo, p_cat, p_nome, p_desc, p_preco, p_tempo, p_eh_combo);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_alterar_item_cardapio(p_id INTEGER, p_nome VARCHAR, p_desc TEXT, p_preco NUMERIC, p_tempo INTEGER, p_disp BOOLEAN) RETURNS VOID AS $$
BEGIN
    UPDATE itens_cardapio SET nome = p_nome, descricao = p_desc, preco = p_preco, tempo_preparo_minutos = p_tempo, disponibilidade = p_disp
    WHERE id_cardapio = p_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_deletar_item_cardapio(p_id INTEGER) RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM item_pedido WHERE id_cardapio = p_id) THEN
        UPDATE itens_cardapio SET disponibilidade = FALSE WHERE id_cardapio = p_id;
        RAISE NOTICE 'Item possui histórico de vendas. Foi inativado em vez de excluído.';
    ELSE
        DELETE FROM itens_cardapio WHERE id_cardapio = p_id;
    END IF;
END; $$ LANGUAGE plpgsql;

--COMBO????

CREATE OR REPLACE FUNCTION fn_inserir_composicao(p_id_combo INTEGER, p_id_item INTEGER, p_qtd INTEGER) RETURNS VOID AS $$
BEGIN
    INSERT INTO composicao (id_combo, id_item, quantidade) VALUES (p_id_combo, p_id_item, p_qtd);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_remover_composicao(p_id_combo INTEGER, p_id_item INTEGER) RETURNS VOID AS $$
BEGIN
    DELETE FROM composicao WHERE id_combo = p_id_combo AND id_item = p_id_item;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_valida_composicao() RETURNS TRIGGER AS $$
BEGIN
    IF NOT (SELECT eh_combo FROM itens_cardapio WHERE id_cardapio = NEW.id_combo) THEN
        RAISE EXCEPTION 'O item % não está marcado como combo (eh_combo = FALSE).', NEW.id_combo;
    END IF;
    IF (SELECT eh_combo FROM itens_cardapio WHERE id_cardapio = NEW.id_item) THEN
        RAISE EXCEPTION 'Um combo não pode conter outro combo (item %).', NEW.id_item;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_valida_composicao BEFORE INSERT OR UPDATE ON composicao
FOR EACH ROW EXECUTE FUNCTION fn_valida_composicao();

--COMBO

CREATE OR REPLACE FUNCTION fn_inserir_composicao_combo(p_id_combo INTEGER, p_id_item INTEGER, p_qtd INTEGER) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM itens_cardapio WHERE id_cardapio = p_id_combo) THEN
        RAISE EXCEPTION 'Combo % não encontrado.', p_id_combo;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM itens_cardapio WHERE id_cardapio = p_id_item) THEN
        RAISE EXCEPTION 'Item % não encontrado.', p_id_item;
    END IF;
    
    INSERT INTO composicao (id_combo, id_item, quantidade) 
    VALUES (p_id_combo, p_id_item, p_qtd);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_remover_composicao_combo(p_id_combo INTEGER, p_id_item INTEGER) RETURNS VOID AS $$
BEGIN
    DELETE FROM composicao WHERE id_combo = p_id_combo AND id_item = p_id_item;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Composição não encontrada no combo.';
    END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_alterar_composicao_combo(p_id_combo INTEGER, p_id_item INTEGER, p_nova_qtd INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE composicao 
    SET quantidade = p_nova_qtd 
    WHERE id_combo = p_id_combo AND id_item = p_id_item;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'O item % não faz parte da composição do combo %.', p_id_item, p_id_combo;
    END IF;
END; $$ LANGUAGE plpgsql;

-- GARÇOM

CREATE OR REPLACE FUNCTION fn_inserir_garcom(p_codigo VARCHAR, p_cpf VARCHAR, p_nome VARCHAR, p_comissao NUMERIC) RETURNS VOID AS $$
BEGIN
    INSERT INTO garcom (codigo_garcom, cpf, nome, percentual_comissao) VALUES (p_codigo, p_cpf, p_nome, p_comissao);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_alterar_garcom(p_id INTEGER, p_nome VARCHAR, p_comissao NUMERIC, p_status VARCHAR) RETURNS VOID AS $$
BEGIN
    UPDATE garcom SET nome = p_nome, percentual_comissao = p_comissao, status = p_status WHERE id_garcom = p_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_demitir_garcom(p_id INTEGER) RETURNS VOID AS $$
DECLARE
    v_data_admissao DATE; v_nome VARCHAR; v_meses_trabalhados INTEGER;
BEGIN
    SELECT nome, data_admissao INTO v_nome, v_data_admissao FROM garcom WHERE id_garcom = p_id;
    IF v_nome IS NULL THEN RAISE EXCEPTION 'Garçom % não encontrado.', p_id; END IF;
    v_meses_trabalhados := extract(month from age(CURRENT_DATE, v_data_admissao)) + (extract(year from age(CURRENT_DATE, v_data_admissao)) * 12);

    UPDATE garcom SET status = 'demitido' WHERE id_garcom = p_id;
    RAISE NOTICE 'Funcionário % DEMITIDO. Meses trabalhados: %. Preparar cálculo de rescisão.', v_nome, v_meses_trabalhados;
END; $$ LANGUAGE plpgsql;

-- PEDIDO

CREATE OR REPLACE FUNCTION fn_abrir_pedido(
    p_tipo INTEGER,
    p_id_cliente INTEGER DEFAULT NULL,
    p_id_mesa INTEGER DEFAULT NULL,
    p_id_garcom INTEGER DEFAULT NULL,
    p_endereco TEXT DEFAULT NULL,
    p_taxa NUMERIC DEFAULT NULL,
    p_id_reserva INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE v_id_pedido INTEGER;
BEGIN
    INSERT INTO pedido (tipo, id_cliente, id_mesa, id_garcom, endereco_entrega, taxa_entrega, status_entrega, id_reserva)
    VALUES (p_tipo, p_id_cliente, p_id_mesa, p_id_garcom, p_endereco, p_taxa,
            CASE WHEN p_tipo = 2 THEN 'preparando' ELSE NULL END,
            p_id_reserva)
    RETURNING id_pedido INTO v_id_pedido;
    RETURN v_id_pedido;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_valida_abertura_pedido() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo = 1 THEN
        IF (SELECT status_mesa FROM mesa WHERE id_mesa = NEW.id_mesa) IS DISTINCT FROM 'ativa' THEN
            RAISE EXCEPTION 'A mesa % não existe ou não está ativa.', NEW.id_mesa;
        END IF;
        IF EXISTS (SELECT 1 FROM pedido WHERE id_mesa = NEW.id_mesa AND status_pedido = 'aberto') THEN
            RAISE EXCEPTION 'A mesa % já possui um pedido aberto.', NEW.id_mesa;
        END IF;
        IF (SELECT status FROM garcom WHERE id_garcom = NEW.id_garcom) IS DISTINCT FROM 'ativo' THEN
            RAISE EXCEPTION 'O garçom % não está ativo.', NEW.id_garcom;
        END IF;
        IF NEW.id_reserva IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM reserva_mesa WHERE id_reserva = NEW.id_reserva AND id_mesa = NEW.id_mesa) THEN
                RAISE EXCEPTION 'A mesa % não pertence à reserva %.', NEW.id_mesa, NEW.id_reserva;
            END IF;
            IF (SELECT status FROM reserva WHERE id_reserva = NEW.id_reserva) NOT IN ('confirmada', 'em andamento') THEN
                RAISE EXCEPTION 'A reserva % não está confirmada nem em andamento.', NEW.id_reserva;
            END IF;
        END IF;
    END IF;
    -- Total já nasce com a taxa de entrega (delivery sem itens também fica correto)
    NEW.valor_total := COALESCE(NEW.taxa_entrega, 0);
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_valida_abertura_pedido BEFORE INSERT ON pedido
FOR EACH ROW EXECUTE FUNCTION fn_valida_abertura_pedido();

CREATE OR REPLACE FUNCTION fn_reserva_em_andamento() RETURNS TRIGGER AS $$
BEGIN
    UPDATE reserva SET status = 'em andamento'
    WHERE id_reserva = NEW.id_reserva AND status = 'confirmada';
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_reserva_em_andamento AFTER INSERT ON pedido
FOR EACH ROW WHEN (NEW.id_reserva IS NOT NULL) EXECUTE FUNCTION fn_reserva_em_andamento();

CREATE OR REPLACE FUNCTION fn_cancelar_pedido(p_id INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE pedido SET status_pedido = 'cancelado' WHERE id_pedido = p_id AND status_pedido = 'aberto';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pedido % não existe ou não está aberto.', p_id;
    END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_atualizar_status_entrega(p_id_pedido INTEGER, p_novo_status VARCHAR) RETURNS VOID AS $$
DECLARE v_atual VARCHAR; v_tipo INTEGER;
BEGIN
    SELECT status_entrega, tipo INTO v_atual, v_tipo FROM pedido WHERE id_pedido = p_id_pedido;
    IF v_tipo IS DISTINCT FROM 2 THEN RAISE EXCEPTION 'Pedido % não existe ou não é delivery.', p_id_pedido; END IF;
    IF NOT ((v_atual = 'preparando' AND p_novo_status = 'saiu para entrega')
         OR (v_atual = 'saiu para entrega' AND p_novo_status = 'entregue')) THEN
        RAISE EXCEPTION 'Transição de entrega inválida: de "%" para "%".', v_atual, p_novo_status;
    END IF;
    UPDATE pedido SET status_entrega = p_novo_status WHERE id_pedido = p_id_pedido;
END; $$ LANGUAGE plpgsql;

--ITEM PEDIDO

CREATE OR REPLACE FUNCTION fn_inserir_item_pedido(p_id_pedido INTEGER, p_id_cardapio INTEGER, p_qtd INTEGER, p_obs TEXT) RETURNS VOID AS $$
DECLARE v_preco NUMERIC;
BEGIN
    SELECT preco INTO v_preco FROM itens_cardapio WHERE id_cardapio = p_id_cardapio;
    IF v_preco IS NULL THEN RAISE EXCEPTION 'Item de cardápio % não encontrado.', p_id_cardapio; END IF;
    INSERT INTO item_pedido (id_pedido, id_cardapio, quantidade, valor_unitario, observacoes)
    VALUES (p_id_pedido, p_id_cardapio, p_qtd, v_preco, p_obs);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_remover_item_pedido(p_id_item_pedido INTEGER) RETURNS VOID AS $$
DECLARE v_status VARCHAR;
BEGIN
    SELECT p.status_pedido INTO v_status
    FROM item_pedido ip JOIN pedido p ON p.id_pedido = ip.id_pedido
    WHERE ip.id_item_pedido = p_id_item_pedido;
    IF v_status IS NULL THEN RAISE EXCEPTION 'Item de pedido % não encontrado.', p_id_item_pedido; END IF;
    IF v_status <> 'aberto' THEN RAISE EXCEPTION 'Só é possível remover itens de pedidos abertos.'; END IF;
    DELETE FROM item_pedido WHERE id_item_pedido = p_id_item_pedido;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_atualizar_status_item(p_id_item_pedido INTEGER, p_novo_status VARCHAR) RETURNS VOID AS $$
BEGIN
    UPDATE item_pedido SET status_cozinha = p_novo_status WHERE id_item_pedido = p_id_item_pedido;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item de pedido % não encontrado.', p_id_item_pedido; END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_valida_transicao_cozinha() RETURNS TRIGGER AS $$
DECLARE v_old INTEGER; v_new INTEGER;
BEGIN
    v_old := CASE OLD.status_cozinha WHEN 'aguardando preparo' THEN 1 WHEN 'em preparo' THEN 2 WHEN 'pronto' THEN 3 WHEN 'servido' THEN 4 END;
    v_new := CASE NEW.status_cozinha WHEN 'aguardando preparo' THEN 1 WHEN 'em preparo' THEN 2 WHEN 'pronto' THEN 3 WHEN 'servido' THEN 4 END;
    IF v_new <> v_old + 1 THEN
        RAISE EXCEPTION 'Transição inválida: de "%" para "%".', OLD.status_cozinha, NEW.status_cozinha;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_valida_transicao_cozinha BEFORE UPDATE OF status_cozinha ON item_pedido
FOR EACH ROW WHEN (OLD.status_cozinha IS DISTINCT FROM NEW.status_cozinha)
EXECUTE FUNCTION fn_valida_transicao_cozinha();


-- PAGAMENTO

CREATE OR REPLACE FUNCTION fn_inserir_pagamento_conta(p_id_pedido INTEGER, p_id_pagamento INTEGER, p_valor NUMERIC) RETURNS VOID AS $$
DECLARE
    v_total NUMERIC; v_status VARCHAR; v_pago NUMERIC;
BEGIN
    SELECT valor_total, status_pedido INTO v_total, v_status
    FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;

    IF v_status IS NULL THEN RAISE EXCEPTION 'Pedido % não encontrado.', p_id_pedido; END IF;
    IF v_status <> 'fechado' THEN
        RAISE EXCEPTION 'A conta só pode receber pagamentos após o pedido ser fechado (status atual: %).', v_status;
    END IF;

    SELECT COALESCE(SUM(valor_atribuido), 0) INTO v_pago FROM conta WHERE id_pedido = p_id_pedido;
    IF v_pago + p_valor > v_total THEN
        RAISE EXCEPTION 'Pagamento excede o valor da conta. Total: %, já pago: %, restante: %.', v_total, v_pago, v_total - v_pago;
    END IF;

    INSERT INTO conta (id_pedido, id_pagamento, valor_atribuido) VALUES (p_id_pedido, p_id_pagamento, p_valor);

    IF v_pago + p_valor = v_total THEN
        RAISE NOTICE 'Pedido % totalmente quitado.', p_id_pedido;
    ELSE
        RAISE NOTICE 'Restante a pagar no pedido %: %', p_id_pedido, v_total - (v_pago + p_valor);
    END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_pedido_quitado(p_id_pedido INTEGER) RETURNS BOOLEAN AS $$
    SELECT p.status_pedido = 'fechado'
           AND COALESCE((SELECT SUM(valor_atribuido) FROM conta WHERE id_pedido = p.id_pedido), 0) = p.valor_total
    FROM pedido p WHERE p.id_pedido = p_id_pedido;
$$ LANGUAGE sql;

-- RESERVA

CREATE OR REPLACE FUNCTION fn_inserir_reserva(p_id_cliente INTEGER, p_data_hora TIMESTAMP, p_num_pessoas INTEGER, p_array_mesas INTEGER[]) RETURNS INTEGER AS $$
DECLARE
    v_id_reserva INTEGER;
    v_id_mesa INTEGER;
    v_qtd_mesas_ativas INTEGER;
    v_capacidade_total INTEGER;
BEGIN
    IF p_data_hora < CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Erro: Não é possível registrar uma reserva para uma data e hora no passado.';
    END IF;

    IF p_array_mesas IS NULL OR cardinality(p_array_mesas) = 0 THEN
        RAISE EXCEPTION 'A reserva precisa de ao menos uma mesa.';
    END IF;

    SELECT COUNT(*), COALESCE(SUM(capacidade_pessoas), 0)
      INTO v_qtd_mesas_ativas, v_capacidade_total
    FROM mesa
    WHERE id_mesa = ANY(p_array_mesas) AND status_mesa = 'ativa';

    IF v_qtd_mesas_ativas <> cardinality(p_array_mesas) THEN
        RAISE EXCEPTION 'Alguma das mesas informadas não existe, está repetida ou não está ativa.';
    END IF;

    IF v_capacidade_total < p_num_pessoas THEN
        RAISE EXCEPTION 'Capacidade insuficiente: as mesas comportam % pessoas, mas a reserva é para %.', v_capacidade_total, p_num_pessoas;
    END IF;

    FOREACH v_id_mesa IN ARRAY p_array_mesas LOOP
        IF EXISTS (
            SELECT 1 FROM reserva_mesa rm JOIN reserva r ON rm.id_reserva = r.id_reserva
            WHERE rm.id_mesa = v_id_mesa
              AND r.status IN ('pendente', 'confirmada', 'em andamento')
              AND r.data_hora BETWEEN (p_data_hora - INTERVAL '2 hours') AND (p_data_hora + INTERVAL '2 hours')
        ) THEN RAISE EXCEPTION 'A mesa % não está livre neste horário.', v_id_mesa; END IF;
    END LOOP;

    INSERT INTO reserva (id_cliente, data_hora, numero_pessoas, status)
    VALUES (p_id_cliente, p_data_hora, p_num_pessoas, 'confirmada') RETURNING id_reserva INTO v_id_reserva;

    FOREACH v_id_mesa IN ARRAY p_array_mesas LOOP
        INSERT INTO reserva_mesa (id_reserva, id_mesa) VALUES (v_id_reserva, v_id_mesa);
    END LOOP;

    RETURN v_id_reserva;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_atualizar_status_reserva(p_id_reserva INTEGER, p_novo_status VARCHAR) RETURNS VOID AS $$
DECLARE v_atual VARCHAR;
BEGIN
    SELECT status INTO v_atual FROM reserva WHERE id_reserva = p_id_reserva;
    IF v_atual IS NULL THEN RAISE EXCEPTION 'Reserva % não encontrada.', p_id_reserva; END IF;

    IF NOT (
        (v_atual = 'pendente'     AND p_novo_status IN ('confirmada', 'cancelada')) OR
        (v_atual = 'confirmada'   AND p_novo_status IN ('em andamento', 'cancelada')) OR
        (v_atual = 'em andamento' AND p_novo_status IN ('finalizada', 'cancelada'))
    ) THEN
        RAISE EXCEPTION 'Transição de reserva inválida: de "%" para "%".', v_atual, p_novo_status;
    END IF;

    UPDATE reserva SET status = p_novo_status WHERE id_reserva = p_id_reserva;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_cancelar_reserva(p_id_reserva INTEGER) RETURNS VOID AS $$
BEGIN
    PERFORM fn_atualizar_status_reserva(p_id_reserva, 'cancelada');
END; $$ LANGUAGE plpgsql;

--===================================
-- 2) Funções especiais e triggers
--===================================

-- 1. Recalcula o total do pedido
CREATE OR REPLACE FUNCTION fn_atualiza_total_pedido() RETURNS TRIGGER AS $$
DECLARE
    v_id_pedido INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_id_pedido := OLD.id_pedido;
    ELSE
        v_id_pedido := NEW.id_pedido;
    END IF;

    UPDATE pedido
    SET valor_total = COALESCE((SELECT SUM(quantidade * valor_unitario) FROM item_pedido WHERE id_pedido = v_id_pedido), 0)
                      + COALESCE(taxa_entrega, 0)
    WHERE id_pedido = v_id_pedido AND status_pedido = 'aberto';

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualiza_total_pedido
AFTER INSERT OR UPDATE OR DELETE ON item_pedido
FOR EACH ROW EXECUTE FUNCTION fn_atualiza_total_pedido();

-- 2. Fecha o pedido e aplica os 10%
CREATE OR REPLACE FUNCTION fn_fechar_pedido(p_id_pedido INTEGER, p_aplica_dez_porcento BOOLEAN) RETURNS NUMERIC AS $$
DECLARE
    v_total_atual NUMERIC;
    v_tipo_pedido INTEGER;
    v_status VARCHAR;
BEGIN
    SELECT valor_total, tipo, status_pedido INTO v_total_atual, v_tipo_pedido, v_status
    FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;

    IF v_status IS NULL THEN RAISE EXCEPTION 'Pedido % não encontrado.', p_id_pedido; END IF;
    IF v_status <> 'aberto' THEN RAISE EXCEPTION 'Pedido % não está aberto (status: %).', p_id_pedido, v_status; END IF;
    IF NOT EXISTS (SELECT 1 FROM item_pedido WHERE id_pedido = p_id_pedido) THEN
        RAISE EXCEPTION 'Pedido % não possui itens.', p_id_pedido;
    END IF;

    -- Delivery nunca paga taxa de serviço
    IF v_tipo_pedido = 2 THEN
        p_aplica_dez_porcento := FALSE;
    END IF;

    IF p_aplica_dez_porcento = TRUE THEN
        v_total_atual := ROUND(v_total_atual * 1.10, 2);
    END IF;

    UPDATE pedido
    SET status_pedido = 'fechado',
        pagou_dez_porcento = p_aplica_dez_porcento,
        valor_total = v_total_atual
    WHERE id_pedido = p_id_pedido;

    RETURN v_total_atual;
END;
$$ LANGUAGE plpgsql;

-- 3. Finaliza a reserva vinculada ao pedido

CREATE OR REPLACE FUNCTION fn_finaliza_reserva_automatica() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_reserva IS NOT NULL AND NEW.status_pedido IN ('fechado', 'cancelado') THEN
        IF NOT EXISTS (SELECT 1 FROM pedido WHERE id_reserva = NEW.id_reserva AND status_pedido = 'aberto') THEN
            UPDATE reserva SET status = 'finalizada'
            WHERE id_reserva = NEW.id_reserva AND status = 'em andamento';
        END IF;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_finaliza_reserva_automatica AFTER UPDATE OF status_pedido ON pedido
FOR EACH ROW WHEN (OLD.status_pedido IS DISTINCT FROM NEW.status_pedido)
EXECUTE FUNCTION fn_finaliza_reserva_automatica();

-- 4. Valida item do pedido

CREATE OR REPLACE FUNCTION fn_valida_item_pedido() RETURNS TRIGGER AS $$
DECLARE v_disp BOOLEAN; v_status VARCHAR;
BEGIN
    SELECT status_pedido INTO v_status FROM pedido WHERE id_pedido = NEW.id_pedido;
    IF v_status IS DISTINCT FROM 'aberto' THEN
        RAISE EXCEPTION 'Este pedido não está aberto (status: %) e não aceita novos itens.', COALESCE(v_status, 'inexistente');
    END IF;

    SELECT disponibilidade INTO v_disp FROM itens_cardapio WHERE id_cardapio = NEW.id_cardapio;
    IF v_disp IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'Este item está indisponível no momento.'; END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_valida_item_pedido BEFORE INSERT ON item_pedido
FOR EACH ROW EXECUTE FUNCTION fn_valida_item_pedido();

-- Aviso de indisponibilidade
CREATE OR REPLACE FUNCTION fn_aviso_cardapio() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.disponibilidade = FALSE AND OLD.disponibilidade = TRUE THEN
        RAISE NOTICE 'Atenção: O item % foi marcado como INDISPONÍVEL!', NEW.nome;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_aviso_cardapio BEFORE UPDATE ON itens_cardapio
FOR EACH ROW EXECUTE FUNCTION fn_aviso_cardapio();

-- Listar pedidos por intervalo de data

CREATE OR REPLACE FUNCTION fn_listar_pedidos_intervalo(dt_inicio DATE, dt_fim DATE)
RETURNS TABLE (id INTEGER, tipo INTEGER, data_hora TIMESTAMP, cliente VARCHAR, total NUMERIC, status VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id_pedido, p.tipo, p.data_hora_abertura, c.nome_cliente, p.valor_total, p.status_pedido
    FROM pedido p LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
    WHERE p.data_hora_abertura >= dt_inicio
      AND p.data_hora_abertura <  (dt_fim + 1);
END; $$ LANGUAGE plpgsql;

-- Listar pedido aberto por mesa

CREATE OR REPLACE FUNCTION fn_obter_pedido_aberto_mesa(p_id_mesa INTEGER) 
RETURNS INTEGER AS $$
DECLARE 
    v_id_pedido INTEGER;
BEGIN
    SELECT id_pedido INTO v_id_pedido 
    FROM pedido 
    WHERE id_mesa = p_id_mesa AND status_pedido = 'aberto';
    
    RETURN v_id_pedido;
END; $$ LANGUAGE plpgsql;

--===================================
-- 3) Views
--===================================

CREATE OR REPLACE VIEW vw_mesas_livres AS
SELECT id_mesa, numero_mesa, localizacao, capacidade_pessoas
FROM mesa m
WHERE m.status_mesa = 'ativa'
  AND NOT EXISTS (
      SELECT 1 FROM pedido p
      WHERE p.id_mesa = m.id_mesa AND p.status_pedido = 'aberto'
  );

CREATE OR REPLACE VIEW vw_comissoes_pagas AS
SELECT
    g.id_garcom,
    g.nome,
    COUNT(p.id_pedido) AS pedidos_atendidos,
    COALESCE(SUM(p.valor_total), 0) AS total_vendido,
    COALESCE(SUM(p.valor_total * (g.percentual_comissao / 100.0)), 0) AS comissao_total_recebida
FROM garcom g
LEFT JOIN pedido p ON g.id_garcom = p.id_garcom AND p.status_pedido = 'fechado'
GROUP BY g.id_garcom, g.nome
ORDER BY comissao_total_recebida DESC;

CREATE OR REPLACE VIEW vw_saldo_pedidos AS
SELECT
    p.id_pedido,
    p.valor_total,
    COALESCE(SUM(c.valor_atribuido), 0) AS total_pago,
    p.valor_total - COALESCE(SUM(c.valor_atribuido), 0) AS saldo_restante
FROM pedido p
LEFT JOIN conta c ON c.id_pedido = p.id_pedido
WHERE p.status_pedido = 'fechado'
GROUP BY p.id_pedido, p.valor_total;

CREATE OR REPLACE VIEW vw_cardapio_disponivel AS
SELECT * FROM itens_cardapio WHERE disponibilidade = TRUE;

CREATE OR REPLACE VIEW vw_cardapio_todos AS
SELECT * FROM itens_cardapio;

CREATE OR REPLACE VIEW vw_combos_existentes AS
SELECT
    comp.id_combo,
    ic.nome AS nome_combo,
    ic.preco AS preco_combo,
    comp.quantidade,
    i.nome AS item_incluso
FROM itens_cardapio ic
JOIN composicao comp ON ic.id_cardapio = comp.id_combo
JOIN itens_cardapio i ON comp.id_item = i.id_cardapio;

CREATE OR REPLACE VIEW vw_todos_garcons AS
SELECT id_garcom, codigo_garcom, cpf, nome, data_admissao, percentual_comissao, status
FROM garcom
ORDER BY nome;

CREATE OR REPLACE VIEW vw_garcons_ativos AS
SELECT id_garcom, codigo_garcom, nome, percentual_comissao, status
FROM garcom
WHERE status = 'ativo'
ORDER BY nome;

-- View para o Dashboard do Salão (Pedidos em andamento)
CREATE OR REPLACE VIEW vw_pedidos_salao_abertos AS
SELECT * FROM pedido 
WHERE tipo = 1 AND status_pedido = 'aberto' 
ORDER BY data_hora_abertura DESC;

-- View para o Dashboard do Delivery (Pedidos em andamento)
CREATE OR REPLACE VIEW vw_pedidos_delivery_abertos AS
SELECT * FROM pedido 
WHERE tipo = 2 AND status_pedido = 'aberto' 
ORDER BY data_hora_abertura DESC;

-- View para a Bancada (Itens prontos aguardando o garçom levar)
CREATE OR REPLACE VIEW vw_itens_prontos_balcao AS
SELECT ip.id_item_pedido, ip.id_pedido, p.id_mesa, ic.nome, ip.quantidade 
FROM item_pedido ip
JOIN pedido p ON p.id_pedido = ip.id_pedido
JOIN itens_cardapio ic ON ic.id_cardapio = ip.id_cardapio
WHERE ip.status_cozinha = 'pronto' AND p.status_pedido = 'aberto';
