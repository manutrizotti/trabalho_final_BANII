--=====================================================================
-- BALDO - SISTEMA DE GESTÃO DE RESTAURANTE
-- Tabelas + funções que espelham os métodos dos repositories.
-- As regras de negócio completas ficam nos services do back; as funções
-- abaixo fazem o mesmo acesso a dados e as validações essenciais.
--=====================================================================

--===================================
-- 0) TABELAS
--===================================

CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nome_cliente VARCHAR(150) NOT NULL,
    telefone VARCHAR(20) UNIQUE NOT NULL
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
    eh_combo BOOLEAN NOT NULL DEFAULT FALSE,
    imagem VARCHAR(255)
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
-- 1) CARDÁPIO  (ItemCardapioRepository)
--===================================

-- Parâmetro NULL = todos. p_categoria aceita 'combos'.
CREATE OR REPLACE FUNCTION fn_listar_itens(
    p_categoria TEXT DEFAULT NULL, p_disponivel BOOLEAN DEFAULT NULL, p_nome TEXT DEFAULT NULL
) RETURNS SETOF itens_cardapio AS $$
    SELECT * FROM itens_cardapio
     WHERE (p_categoria IS NULL
            OR (p_categoria = 'combos' AND eh_combo)
            OR (p_categoria <> 'combos' AND categoria = p_categoria))
       AND (p_disponivel IS NULL OR disponibilidade = p_disponivel)
       AND (p_nome IS NULL OR nome ILIKE '%' || p_nome || '%')
     ORDER BY nome;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_inserir_item(
    p_codigo VARCHAR, p_categoria VARCHAR, p_nome VARCHAR, p_descricao TEXT,
    p_preco NUMERIC, p_tempo INTEGER, p_eh_combo BOOLEAN DEFAULT FALSE
) RETURNS INTEGER AS $$
    INSERT INTO itens_cardapio (codigo_cardapio, categoria, nome, descricao, preco, tempo_preparo_minutos, eh_combo)
    VALUES (p_codigo, p_categoria, p_nome, p_descricao, p_preco, p_tempo, p_eh_combo)
    RETURNING id_cardapio;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_atualizar_item(
    p_id INTEGER, p_nome VARCHAR, p_descricao TEXT, p_preco NUMERIC, p_tempo INTEGER, p_disponivel BOOLEAN
) RETURNS VOID AS $$
    UPDATE itens_cardapio
       SET nome = p_nome, descricao = p_descricao, preco = p_preco,
           tempo_preparo_minutos = p_tempo, disponibilidade = p_disponivel
     WHERE id_cardapio = p_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_atualizar_imagem(p_id INTEGER, p_imagem VARCHAR) RETURNS VOID AS $$
    UPDATE itens_cardapio SET imagem = p_imagem WHERE id_cardapio = p_id;
$$ LANGUAGE sql;

-- Com histórico de vendas só inativa. Retorna TRUE se inativou.
CREATE OR REPLACE FUNCTION fn_excluir_item(p_id INTEGER) RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM item_pedido WHERE id_cardapio = p_id) THEN
        UPDATE itens_cardapio SET disponibilidade = FALSE WHERE id_cardapio = p_id;
        RETURN TRUE;
    END IF;
    DELETE FROM itens_cardapio WHERE id_cardapio = p_id;
    RETURN FALSE;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_listar_composicao(p_id_combo INTEGER)
RETURNS TABLE (id_item INTEGER, nome VARCHAR, quantidade INTEGER) AS $$
    SELECT i.id_cardapio, i.nome, c.quantidade
      FROM composicao c JOIN itens_cardapio i ON i.id_cardapio = c.id_item
     WHERE c.id_combo = p_id_combo
     ORDER BY i.nome;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_adicionar_composicao(p_id_combo INTEGER, p_id_item INTEGER, p_qtd INTEGER)
RETURNS VOID AS $$
BEGIN
    IF NOT COALESCE((SELECT eh_combo FROM itens_cardapio WHERE id_cardapio = p_id_combo), FALSE) THEN
        RAISE EXCEPTION 'O item % não é um combo.', p_id_combo;
    END IF;
    IF COALESCE((SELECT eh_combo FROM itens_cardapio WHERE id_cardapio = p_id_item), TRUE) THEN
        RAISE EXCEPTION 'O item % não existe ou é um combo (combo não contém combo).', p_id_item;
    END IF;
    IF p_qtd < 1 OR p_qtd > 99 THEN RAISE EXCEPTION 'Quantidade deve estar entre 1 e 99.'; END IF;
    INSERT INTO composicao (id_combo, id_item, quantidade) VALUES (p_id_combo, p_id_item, p_qtd);
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_atualizar_qtd_composicao(p_id_combo INTEGER, p_id_item INTEGER, p_qtd INTEGER)
RETURNS VOID AS $$
BEGIN
    IF p_qtd < 1 OR p_qtd > 99 THEN RAISE EXCEPTION 'Quantidade deve estar entre 1 e 99.'; END IF;
    UPDATE composicao SET quantidade = p_qtd WHERE id_combo = p_id_combo AND id_item = p_id_item;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item não faz parte do combo.'; END IF;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_remover_composicao(p_id_combo INTEGER, p_id_item INTEGER) RETURNS VOID AS $$
    DELETE FROM composicao WHERE id_combo = p_id_combo AND id_item = p_id_item;
$$ LANGUAGE sql;

--===================================
-- 2) MESAS  (MesaRepository)
--===================================

-- Nunca lista removidas. Livre = ativa e sem pedido aberto.
CREATE OR REPLACE FUNCTION fn_listar_mesas(
    p_busca TEXT DEFAULT NULL, p_apenas_livres BOOLEAN DEFAULT FALSE, p_localizacao TEXT DEFAULT NULL
) RETURNS TABLE (id_mesa INTEGER, numero_mesa INTEGER, localizacao VARCHAR,
                 capacidade_pessoas INTEGER, status_mesa VARCHAR, id_pedido_aberto INTEGER) AS $$
    SELECT m.id_mesa, m.numero_mesa, m.localizacao, m.capacidade_pessoas, m.status_mesa,
           (SELECT p.id_pedido FROM pedido p
             WHERE p.id_mesa = m.id_mesa AND p.status_pedido = 'aberto' LIMIT 1)
      FROM mesa m
     WHERE m.status_mesa <> 'removida'
       AND (p_busca IS NULL OR m.numero_mesa::text LIKE '%' || p_busca || '%')
       AND (p_localizacao IS NULL OR m.localizacao = p_localizacao)
       AND (NOT p_apenas_livres
            OR (m.status_mesa = 'ativa'
                AND NOT EXISTS (SELECT 1 FROM pedido p
                                 WHERE p.id_mesa = m.id_mesa AND p.status_pedido = 'aberto')))
     ORDER BY m.numero_mesa;
$$ LANGUAGE sql;

-- Se o número pertence a uma mesa removida, ela é reativada.
CREATE OR REPLACE FUNCTION fn_inserir_mesa(p_numero INTEGER, p_localizacao VARCHAR, p_capacidade INTEGER)
RETURNS INTEGER AS $$
DECLARE v_id INTEGER; v_status VARCHAR;
BEGIN
    SELECT id_mesa, status_mesa INTO v_id, v_status FROM mesa WHERE numero_mesa = p_numero;
    IF v_id IS NULL THEN
        INSERT INTO mesa (numero_mesa, localizacao, capacidade_pessoas)
        VALUES (p_numero, p_localizacao, p_capacidade) RETURNING id_mesa INTO v_id;
    ELSIF v_status = 'removida' THEN
        UPDATE mesa SET localizacao = p_localizacao, capacidade_pessoas = p_capacidade, status_mesa = 'ativa'
         WHERE id_mesa = v_id;
    ELSE
        RAISE EXCEPTION 'Já existe uma mesa com o número %.', p_numero;
    END IF;
    RETURN v_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_atualizar_mesa(
    p_id INTEGER, p_localizacao VARCHAR, p_capacidade INTEGER, p_status VARCHAR
) RETURNS VOID AS $$
BEGIN
    IF p_status = 'quebrada' AND EXISTS (SELECT 1 FROM pedido WHERE id_mesa = p_id AND status_pedido = 'aberto') THEN
        RAISE EXCEPTION 'Feche o pedido aberto antes de marcar a mesa como quebrada.';
    END IF;
    UPDATE mesa SET localizacao = p_localizacao, capacidade_pessoas = p_capacidade, status_mesa = p_status
     WHERE id_mesa = p_id;
END; $$ LANGUAGE plpgsql;

-- Com histórico só marca como removida. Retorna TRUE se havia histórico.
CREATE OR REPLACE FUNCTION fn_remover_mesa(p_id INTEGER) RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pedido WHERE id_mesa = p_id AND status_pedido = 'aberto') THEN
        RAISE EXCEPTION 'A mesa possui um pedido aberto e não pode ser removida.';
    END IF;
    IF EXISTS (SELECT 1 FROM pedido WHERE id_mesa = p_id)
       OR EXISTS (SELECT 1 FROM reserva_mesa WHERE id_mesa = p_id) THEN
        UPDATE mesa SET status_mesa = 'removida' WHERE id_mesa = p_id;
        RETURN TRUE;
    END IF;
    DELETE FROM mesa WHERE id_mesa = p_id;
    RETURN FALSE;
END; $$ LANGUAGE plpgsql;

--===================================
-- 3) CLIENTES  (ClienteRepository)
--===================================

CREATE OR REPLACE FUNCTION fn_listar_clientes(p_nome TEXT DEFAULT NULL) RETURNS SETOF cliente AS $$
    SELECT * FROM cliente WHERE p_nome IS NULL OR nome_cliente ILIKE '%' || p_nome || '%'
     ORDER BY nome_cliente;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_inserir_cliente(p_nome VARCHAR, p_telefone VARCHAR) RETURNS INTEGER AS $$
    INSERT INTO cliente (nome_cliente, telefone) VALUES (p_nome, p_telefone) RETURNING id_cliente;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_atualizar_cliente(p_id INTEGER, p_nome VARCHAR, p_telefone VARCHAR)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM cliente WHERE telefone = p_telefone AND id_cliente <> p_id) THEN
        RAISE EXCEPTION 'O telefone % já está cadastrado para outro cliente.', p_telefone;
    END IF;
    UPDATE cliente SET nome_cliente = p_nome, telefone = p_telefone WHERE id_cliente = p_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_excluir_cliente(p_id INTEGER) RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM pedido WHERE id_cliente = p_id)
       OR EXISTS (SELECT 1 FROM reserva WHERE id_cliente = p_id) THEN
        RAISE EXCEPTION 'Não é possível excluir: o cliente possui histórico de pedidos ou reservas.';
    END IF;
    DELETE FROM cliente WHERE id_cliente = p_id;
END; $$ LANGUAGE plpgsql;

--===================================
-- 4) GARÇONS  (GarcomRepository)
--===================================

CREATE OR REPLACE FUNCTION fn_listar_garcons(p_status TEXT DEFAULT NULL, p_nome TEXT DEFAULT NULL)
RETURNS SETOF garcom AS $$
    SELECT * FROM garcom
     WHERE (p_status IS NULL OR status = p_status)
       AND (p_nome IS NULL OR nome ILIKE '%' || p_nome || '%')
     ORDER BY nome;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_inserir_garcom(p_codigo VARCHAR, p_cpf VARCHAR, p_nome VARCHAR, p_comissao NUMERIC)
RETURNS INTEGER AS $$
    INSERT INTO garcom (codigo_garcom, cpf, nome, percentual_comissao)
    VALUES (p_codigo, p_cpf, p_nome, p_comissao) RETURNING id_garcom;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_atualizar_garcom(p_id INTEGER, p_nome VARCHAR, p_comissao NUMERIC, p_status VARCHAR)
RETURNS VOID AS $$
BEGIN
    IF p_status <> 'ativo' AND EXISTS (SELECT 1 FROM pedido WHERE id_garcom = p_id AND status_pedido = 'aberto') THEN
        RAISE EXCEPTION 'O garçom possui pedido aberto. Feche ou cancele o pedido antes de afastá-lo.';
    END IF;
    UPDATE garcom SET nome = p_nome, percentual_comissao = p_comissao, status = p_status WHERE id_garcom = p_id;
END; $$ LANGUAGE plpgsql;

--===================================
-- 5) RESERVAS  (ReservaRepository)
--===================================

-- p_de inclusivo, p_ate exclusivo; NULL = sem limite.
CREATE OR REPLACE FUNCTION fn_listar_reservas(
    p_status TEXT DEFAULT NULL, p_de TIMESTAMP DEFAULT NULL, p_ate TIMESTAMP DEFAULT NULL
) RETURNS TABLE (id_reserva INTEGER, id_cliente INTEGER, nome_cliente VARCHAR, data_hora TIMESTAMP,
                 numero_pessoas INTEGER, status VARCHAR, observacoes TEXT, mesas JSON) AS $$
    SELECT r.id_reserva, r.id_cliente, c.nome_cliente, r.data_hora, r.numero_pessoas, r.status, r.observacoes,
           COALESCE((SELECT json_agg(json_build_object('id', m.id_mesa, 'numero', m.numero_mesa)
                                     ORDER BY m.numero_mesa)
                       FROM reserva_mesa rm JOIN mesa m ON m.id_mesa = rm.id_mesa
                      WHERE rm.id_reserva = r.id_reserva), '[]'::json)
      FROM reserva r JOIN cliente c ON c.id_cliente = r.id_cliente
     WHERE (p_status IS NULL OR r.status = p_status)
       AND (p_de IS NULL OR r.data_hora >= p_de)
       AND (p_ate IS NULL OR r.data_hora < p_ate)
     ORDER BY r.data_hora;
$$ LANGUAGE sql;

-- Uma reserva ocupa a mesa por 2h30: conflito se houver outra a menos disso.
CREATE OR REPLACE FUNCTION fn_mesa_tem_conflito(p_id_mesa INTEGER, p_data_hora TIMESTAMP)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM reserva_mesa rm JOIN reserva r ON r.id_reserva = rm.id_reserva
         WHERE rm.id_mesa = p_id_mesa
           AND r.status IN ('pendente', 'confirmada', 'em andamento')
           AND r.data_hora > p_data_hora - INTERVAL '150 minutes'
           AND r.data_hora < p_data_hora + INTERVAL '150 minutes');
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_inserir_reserva(
    p_id_cliente INTEGER, p_data_hora TIMESTAMP, p_pessoas INTEGER, p_observacoes TEXT, p_mesas INTEGER[]
) RETURNS INTEGER AS $$
DECLARE v_id INTEGER; v_mesa INTEGER; v_ativas INTEGER; v_capacidade INTEGER;
BEGIN
    IF p_data_hora < CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Não é possível reservar para uma data e hora no passado.';
    END IF;
    IF p_mesas IS NULL OR cardinality(p_mesas) = 0 THEN
        RAISE EXCEPTION 'A reserva precisa de ao menos uma mesa.';
    END IF;

    SELECT COUNT(*), COALESCE(SUM(capacidade_pessoas), 0) INTO v_ativas, v_capacidade
      FROM mesa WHERE id_mesa = ANY(p_mesas) AND status_mesa = 'ativa';
    IF v_ativas <> cardinality(p_mesas) THEN
        RAISE EXCEPTION 'Alguma das mesas não existe, está repetida ou não está ativa.';
    END IF;
    IF v_capacidade < p_pessoas THEN
        RAISE EXCEPTION 'Capacidade insuficiente: as mesas comportam % pessoas, mas a reserva é para %.',
            v_capacidade, p_pessoas;
    END IF;

    FOREACH v_mesa IN ARRAY p_mesas LOOP
        IF fn_mesa_tem_conflito(v_mesa, p_data_hora) THEN
            RAISE EXCEPTION 'A mesa % não está livre neste horário.', v_mesa;
        END IF;
    END LOOP;

    INSERT INTO reserva (id_cliente, data_hora, numero_pessoas, status, observacoes)
    VALUES (p_id_cliente, p_data_hora, p_pessoas, 'confirmada', p_observacoes) RETURNING id_reserva INTO v_id;
    FOREACH v_mesa IN ARRAY p_mesas LOOP
        INSERT INTO reserva_mesa (id_reserva, id_mesa) VALUES (v_id, v_mesa);
    END LOOP;
    RETURN v_id;
END; $$ LANGUAGE plpgsql;

-- Só status e observações mudam, e o status segue as transições permitidas.
CREATE OR REPLACE FUNCTION fn_atualizar_reserva(p_id INTEGER, p_status VARCHAR, p_observacoes TEXT)
RETURNS VOID AS $$
DECLARE v_atual VARCHAR;
BEGIN
    SELECT status INTO v_atual FROM reserva WHERE id_reserva = p_id;
    IF v_atual IS NULL THEN RAISE EXCEPTION 'Reserva % não encontrada.', p_id; END IF;
    IF p_status <> v_atual AND NOT (
        (v_atual = 'pendente'     AND p_status IN ('confirmada', 'cancelada')) OR
        (v_atual = 'confirmada'   AND p_status IN ('em andamento', 'cancelada')) OR
        (v_atual = 'em andamento' AND p_status IN ('finalizada', 'cancelada'))
    ) THEN
        RAISE EXCEPTION 'Transição inválida: de "%" para "%".', v_atual, p_status;
    END IF;
    UPDATE reserva SET status = p_status, observacoes = p_observacoes WHERE id_reserva = p_id;
END; $$ LANGUAGE plpgsql;

--===================================
-- 6) COZINHA  (CozinhaRepository)
--===================================

-- Itens não servidos de pedidos não cancelados, na ordem em que foram adicionados.
CREATE OR REPLACE FUNCTION fn_listar_cozinha()
RETURNS TABLE (id_item_pedido INTEGER, nome VARCHAR, numero_mesa INTEGER, quantidade INTEGER, status_cozinha VARCHAR) AS $$
    SELECT ip.id_item_pedido, ic.nome, m.numero_mesa, ip.quantidade, ip.status_cozinha
      FROM item_pedido ip
      JOIN pedido p ON p.id_pedido = ip.id_pedido
      JOIN itens_cardapio ic ON ic.id_cardapio = ip.id_cardapio
      LEFT JOIN mesa m ON m.id_mesa = p.id_mesa
     WHERE ip.status_cozinha <> 'servido' AND p.status_pedido <> 'cancelado'
     ORDER BY ip.id_item_pedido;
$$ LANGUAGE sql;

-- Única transição possível: aguardando preparo -> em preparo -> pronto -> servido.
CREATE OR REPLACE FUNCTION fn_avancar_item(p_id INTEGER) RETURNS VARCHAR AS $$
DECLARE v_novo VARCHAR;
BEGIN
    UPDATE item_pedido
       SET status_cozinha = CASE status_cozinha
             WHEN 'aguardando preparo' THEN 'em preparo'
             WHEN 'em preparo' THEN 'pronto'
             WHEN 'pronto' THEN 'servido' END
     WHERE id_item_pedido = p_id AND status_cozinha <> 'servido'
     RETURNING status_cozinha INTO v_novo;
    IF v_novo IS NULL THEN RAISE EXCEPTION 'Item % não encontrado ou já servido.', p_id; END IF;
    RETURN v_novo;
END; $$ LANGUAGE plpgsql;

--===================================
-- 7) PEDIDOS  (PedidoRepository)
--===================================

-- p_de inclusivo, p_ate exclusivo (timestamps); NULL = sem limite. p_tipo: 1 salão, 2 delivery.
CREATE OR REPLACE FUNCTION fn_listar_pedidos(
    p_tipo INTEGER DEFAULT NULL, p_status TEXT DEFAULT NULL,
    p_de TIMESTAMP DEFAULT NULL, p_ate TIMESTAMP DEFAULT NULL
) RETURNS TABLE (
    id_pedido INTEGER, tipo INTEGER, status_pedido VARCHAR, pagou_dez_porcento BOOLEAN,
    valor_total NUMERIC, id_cliente INTEGER, nome_cliente VARCHAR, id_reserva INTEGER,
    endereco_entrega TEXT, taxa_entrega NUMERIC, status_entrega VARCHAR,
    data_hora_abertura TIMESTAMP, id_mesa INTEGER, numero_mesa INTEGER,
    id_garcom INTEGER, nome_garcom VARCHAR
) AS $$
    SELECT p.id_pedido, p.tipo, p.status_pedido, p.pagou_dez_porcento, p.valor_total,
           p.id_cliente, c.nome_cliente, p.id_reserva, p.endereco_entrega, p.taxa_entrega,
           p.status_entrega, p.data_hora_abertura, p.id_mesa, m.numero_mesa,
           p.id_garcom, g.nome
      FROM pedido p
      LEFT JOIN cliente c ON c.id_cliente = p.id_cliente
      LEFT JOIN mesa m ON m.id_mesa = p.id_mesa
      LEFT JOIN garcom g ON g.id_garcom = p.id_garcom
     WHERE (p_tipo IS NULL OR p.tipo = p_tipo)
       AND (p_status IS NULL OR p.status_pedido = p_status)
       AND (p_de IS NULL OR p.data_hora_abertura >= p_de)
       AND (p_ate IS NULL OR p.data_hora_abertura < p_ate)
     ORDER BY p.id_pedido DESC;
$$ LANGUAGE sql;

-- Total = itens + taxa de entrega (enquanto o pedido está aberto).
CREATE OR REPLACE FUNCTION fn_recalcular_total(p_id_pedido INTEGER) RETURNS VOID AS $$
    UPDATE pedido
       SET valor_total = COALESCE((SELECT SUM(quantidade * valor_unitario)
                                     FROM item_pedido WHERE id_pedido = p_id_pedido), 0)
                         + COALESCE(taxa_entrega, 0)
     WHERE id_pedido = p_id_pedido AND status_pedido = 'aberto';
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_abrir_pedido_salao(
    p_id_mesa INTEGER, p_id_garcom INTEGER, p_id_cliente INTEGER DEFAULT NULL, p_id_reserva INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE v_id INTEGER; v_reserva reserva%ROWTYPE;
BEGIN
    IF (SELECT status_mesa FROM mesa WHERE id_mesa = p_id_mesa) IS DISTINCT FROM 'ativa' THEN
        RAISE EXCEPTION 'A mesa % não existe ou não está ativa.', p_id_mesa;
    END IF;
    IF EXISTS (SELECT 1 FROM pedido WHERE id_mesa = p_id_mesa AND status_pedido = 'aberto') THEN
        RAISE EXCEPTION 'A mesa % já possui um pedido aberto.', p_id_mesa;
    END IF;
    IF (SELECT status FROM garcom WHERE id_garcom = p_id_garcom) IS DISTINCT FROM 'ativo' THEN
        RAISE EXCEPTION 'O garçom % não está ativo.', p_id_garcom;
    END IF;

    IF p_id_reserva IS NOT NULL THEN
        SELECT * INTO v_reserva FROM reserva WHERE id_reserva = p_id_reserva;
        IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
        IF NOT EXISTS (SELECT 1 FROM reserva_mesa WHERE id_reserva = p_id_reserva AND id_mesa = p_id_mesa) THEN
            RAISE EXCEPTION 'A mesa não pertence a essa reserva.';
        END IF;
        IF v_reserva.status NOT IN ('confirmada', 'em andamento') THEN
            RAISE EXCEPTION 'A reserva não está confirmada nem em andamento.';
        END IF;
        IF ABS(EXTRACT(EPOCH FROM (v_reserva.data_hora - CURRENT_TIMESTAMP))) >= 150 * 60 THEN
            RAISE EXCEPTION 'A reserva só pode ser vinculada perto do horário.';
        END IF;
        p_id_cliente := v_reserva.id_cliente;
    ELSIF EXISTS (
        SELECT 1 FROM reserva_mesa rm JOIN reserva r ON r.id_reserva = rm.id_reserva
         WHERE rm.id_mesa = p_id_mesa AND r.status IN ('pendente', 'confirmada')
           AND r.data_hora BETWEEN CURRENT_TIMESTAMP - INTERVAL '150 minutes'
                               AND CURRENT_TIMESTAMP + INTERVAL '150 minutes'
    ) THEN
        RAISE EXCEPTION 'Mesa reservada para este horário. Cancele a reserva ou use outra mesa.';
    END IF;

    INSERT INTO pedido (tipo, id_mesa, id_garcom, id_cliente, id_reserva)
    VALUES (1, p_id_mesa, p_id_garcom, p_id_cliente, p_id_reserva) RETURNING id_pedido INTO v_id;

    IF p_id_reserva IS NOT NULL THEN
        UPDATE reserva SET status = 'em andamento' WHERE id_reserva = p_id_reserva AND status = 'confirmada';
    END IF;
    RETURN v_id;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_abrir_pedido_delivery(p_id_cliente INTEGER, p_endereco TEXT, p_taxa NUMERIC)
RETURNS INTEGER AS $$
    INSERT INTO pedido (tipo, id_cliente, endereco_entrega, taxa_entrega, status_entrega, valor_total)
    VALUES (2, p_id_cliente, p_endereco, p_taxa, 'preparando', p_taxa)
    RETURNING id_pedido;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION fn_inserir_item_pedido(
    p_id_pedido INTEGER, p_id_cardapio INTEGER, p_qtd INTEGER, p_obs TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE v_preco NUMERIC; v_disponivel BOOLEAN;
BEGIN
    IF (SELECT status_pedido FROM pedido WHERE id_pedido = p_id_pedido) IS DISTINCT FROM 'aberto' THEN
        RAISE EXCEPTION 'Este pedido não está aberto.';
    END IF;
    IF p_qtd < 1 OR p_qtd > 99 THEN RAISE EXCEPTION 'A quantidade deve estar entre 1 e 99.'; END IF;
    SELECT preco, disponibilidade INTO v_preco, v_disponivel FROM itens_cardapio WHERE id_cardapio = p_id_cardapio;
    IF v_preco IS NULL THEN RAISE EXCEPTION 'Item do cardápio não encontrado.'; END IF;
    IF NOT v_disponivel THEN RAISE EXCEPTION 'Este item está indisponível no momento.'; END IF;

    INSERT INTO item_pedido (id_pedido, id_cardapio, quantidade, valor_unitario, observacoes)
    VALUES (p_id_pedido, p_id_cardapio, p_qtd, v_preco, p_obs);
    PERFORM fn_recalcular_total(p_id_pedido);
END; $$ LANGUAGE plpgsql;

-- Só remove item que a cozinha ainda não começou.
CREATE OR REPLACE FUNCTION fn_remover_item_pedido(p_id_item INTEGER) RETURNS VOID AS $$
DECLARE v_pedido INTEGER; v_status_cozinha VARCHAR; v_status_pedido VARCHAR;
BEGIN
    SELECT ip.id_pedido, ip.status_cozinha, p.status_pedido
      INTO v_pedido, v_status_cozinha, v_status_pedido
      FROM item_pedido ip JOIN pedido p ON p.id_pedido = ip.id_pedido
     WHERE ip.id_item_pedido = p_id_item;
    IF v_pedido IS NULL THEN RAISE EXCEPTION 'Item do pedido não encontrado.'; END IF;
    IF v_status_pedido <> 'aberto' THEN RAISE EXCEPTION 'Este pedido não está aberto.'; END IF;
    IF v_status_cozinha <> 'aguardando preparo' THEN
        RAISE EXCEPTION 'A cozinha já começou esse item e ele não pode mais ser removido.';
    END IF;
    DELETE FROM item_pedido WHERE id_item_pedido = p_id_item;
    PERFORM fn_recalcular_total(v_pedido);
END; $$ LANGUAGE plpgsql;

-- Quando o último pedido aberto de uma reserva em andamento encerra, ela é finalizada.
CREATE OR REPLACE FUNCTION fn_finalizar_reserva_se_ultimo(p_id_pedido INTEGER) RETURNS VOID AS $$
DECLARE v_reserva INTEGER;
BEGIN
    SELECT id_reserva INTO v_reserva FROM pedido WHERE id_pedido = p_id_pedido;
    IF v_reserva IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pedido WHERE id_reserva = v_reserva AND status_pedido = 'aberto') THEN
        UPDATE reserva SET status = 'finalizada' WHERE id_reserva = v_reserva AND status = 'em andamento';
    END IF;
END; $$ LANGUAGE plpgsql;

-- Fecha o pedido (10% opcional só no salão). Retorna o total final.
CREATE OR REPLACE FUNCTION fn_fechar_pedido(p_id_pedido INTEGER, p_dez_porcento BOOLEAN DEFAULT FALSE)
RETURNS NUMERIC AS $$
DECLARE v_status VARCHAR; v_tipo INTEGER; v_total NUMERIC; v_dez BOOLEAN;
BEGIN
    SELECT status_pedido, tipo INTO v_status, v_tipo FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;
    IF v_status IS NULL THEN RAISE EXCEPTION 'Pedido % não encontrado.', p_id_pedido; END IF;
    IF v_status <> 'aberto' THEN RAISE EXCEPTION 'Este pedido não está aberto.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM item_pedido WHERE id_pedido = p_id_pedido) THEN
        RAISE EXCEPTION 'O pedido não possui itens.';
    END IF;

    PERFORM fn_recalcular_total(p_id_pedido);
    SELECT valor_total INTO v_total FROM pedido WHERE id_pedido = p_id_pedido;

    v_dez := (v_tipo = 1 AND p_dez_porcento); -- delivery nunca paga os 10%
    IF v_dez THEN v_total := ROUND(v_total * 1.10, 2); END IF;

    UPDATE pedido SET status_pedido = 'fechado', pagou_dez_porcento = v_dez, valor_total = v_total
     WHERE id_pedido = p_id_pedido;
    PERFORM fn_finalizar_reserva_se_ultimo(p_id_pedido);
    RETURN v_total;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_cancelar_pedido(p_id_pedido INTEGER) RETURNS VOID AS $$
BEGIN
    UPDATE pedido SET status_pedido = 'cancelado' WHERE id_pedido = p_id_pedido AND status_pedido = 'aberto';
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido % não existe ou não está aberto.', p_id_pedido; END IF;
    PERFORM fn_finalizar_reserva_se_ultimo(p_id_pedido);
END; $$ LANGUAGE plpgsql;

-- preparando -> saiu para entrega -> entregue
CREATE OR REPLACE FUNCTION fn_avancar_entrega(p_id_pedido INTEGER) RETURNS VARCHAR AS $$
DECLARE v_novo VARCHAR;
BEGIN
    UPDATE pedido
       SET status_entrega = CASE status_entrega
             WHEN 'preparando' THEN 'saiu para entrega'
             WHEN 'saiu para entrega' THEN 'entregue' END
     WHERE id_pedido = p_id_pedido AND tipo = 2 AND status_pedido <> 'cancelado'
       AND status_entrega <> 'entregue'
     RETURNING status_entrega INTO v_novo;
    IF v_novo IS NULL THEN
        RAISE EXCEPTION 'Pedido % não é um delivery em andamento.', p_id_pedido;
    END IF;
    RETURN v_novo;
END; $$ LANGUAGE plpgsql;

-- Só em pedido fechado, sem exceder o restante da conta.
CREATE OR REPLACE FUNCTION fn_registrar_pagamento(p_id_pedido INTEGER, p_forma VARCHAR, p_valor NUMERIC)
RETURNS NUMERIC AS $$
DECLARE v_total NUMERIC; v_status VARCHAR; v_pago NUMERIC;
BEGIN
    SELECT valor_total, status_pedido INTO v_total, v_status
      FROM pedido WHERE id_pedido = p_id_pedido FOR UPDATE;
    IF v_status IS NULL THEN RAISE EXCEPTION 'Pedido % não encontrado.', p_id_pedido; END IF;
    IF v_status <> 'fechado' THEN
        RAISE EXCEPTION 'A conta só recebe pagamentos depois que o pedido é fechado.';
    END IF;
    IF p_valor <= 0 THEN RAISE EXCEPTION 'Informe um valor de pagamento válido.'; END IF;

    SELECT COALESCE(SUM(valor_atribuido), 0) INTO v_pago FROM conta WHERE id_pedido = p_id_pedido;
    IF v_pago >= v_total THEN RAISE EXCEPTION 'Esse pedido já está quitado.'; END IF;
    IF v_pago + p_valor > v_total THEN
        RAISE EXCEPTION 'O valor excede o restante da conta (%).', v_total - v_pago;
    END IF;

    INSERT INTO conta (id_pedido, id_pagamento, valor_atribuido)
    VALUES (p_id_pedido, (SELECT id_pagamento FROM forma_pagamento WHERE descricao = p_forma), p_valor);
    RETURN v_total - (v_pago + p_valor); -- restante
END; $$ LANGUAGE plpgsql;