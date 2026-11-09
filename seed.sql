--=====================================================================
-- BALDO - DADOS FICTÍCIOS PARA DEMONSTRAÇÃO
-- Rodar DEPOIS do schema.sql, em banco vazio:
--   psql -U postgres -d Restaurante -f seed.sql
-- Telefones e CPFs são inventados. Reservas e pedidos usam datas
-- relativas a "agora", então o seed vale em qualquer dia.
--=====================================================================

-- MESAS
SELECT fn_inserir_mesa(1, 'salão', 4);
SELECT fn_inserir_mesa(2, 'salão', 4);
SELECT fn_inserir_mesa(3, 'salão', 6);
SELECT fn_inserir_mesa(4, 'salão', 2);
SELECT fn_inserir_mesa(5, 'varanda', 4);
SELECT fn_inserir_mesa(6, 'varanda', 4);
SELECT fn_inserir_mesa(7, 'mezanino', 8);
SELECT fn_inserir_mesa(8, 'mezanino', 2);
UPDATE mesa SET status_mesa = 'quebrada' WHERE numero_mesa = 8;

-- GARÇONS
SELECT fn_inserir_garcom('G001', '11122233344', 'Ana Souza',    5);
SELECT fn_inserir_garcom('G002', '22233344455', 'Bruno Lima',   7);
SELECT fn_inserir_garcom('G003', '33344455566', 'Carla Dias',   5);
SELECT fn_inserir_garcom('G004', '44455566677', 'Diego Rocha',  10);
SELECT fn_inserir_garcom('G005', '55566677788', 'Elisa Prado',  6);
UPDATE garcom SET status = 'de ferias', data_admissao = '2024-05-20' WHERE codigo_garcom = 'G003';
UPDATE garcom SET status = 'demitido', data_admissao = '2022-11-15' WHERE codigo_garcom = 'G004';
UPDATE garcom SET data_admissao = '2024-02-10' WHERE codigo_garcom = 'G001';
UPDATE garcom SET data_admissao = '2023-08-01' WHERE codigo_garcom = 'G002';
UPDATE garcom SET data_admissao = '2025-01-12' WHERE codigo_garcom = 'G005';

-- CLIENTES
SELECT fn_inserir_cliente('Amanda Ribeiro',   '47991110001');
SELECT fn_inserir_cliente('Bernardo Alves',   '47991110002');
SELECT fn_inserir_cliente('Camila Fontes',    '47991110003');
SELECT fn_inserir_cliente('Daniel Moreira',   '47991110004');
SELECT fn_inserir_cliente('Eduarda Nunes',    '47991110005');
SELECT fn_inserir_cliente('Fábio Teixeira',   '47991110006');
SELECT fn_inserir_cliente('Gabriela Santos',  '47991110007');
SELECT fn_inserir_cliente('Henrique Costa',   '47991110008');

-- CARDÁPIO
SELECT fn_inserir_item('ENT01', 'entradas', 'Bruschetta de Tomate',
    'Pão italiano tostado com tomate fresco, manjericão e azeite.', 28.00, 10);
SELECT fn_inserir_item('ENT02', 'entradas', 'Carpaccio de Carne',
    'Fatias finas de carne com rúcula, parmesão e alcaparras.', 42.00, 12);
SELECT fn_inserir_item('ENT03', 'entradas', 'Burrata com Tomates',
    'Burrata cremosa servida com tomates confitados e pesto.', 48.00, 8);
SELECT fn_inserir_item('PRA01', 'pratos principais', 'Fettuccine Alfredo',
    'Massa fresca ao molho cremoso de manteiga e parmesão.', 58.00, 20);
SELECT fn_inserir_item('PRA02', 'pratos principais', 'Spaghetti Carbonara',
    'Spaghetti com pancetta, gema, pecorino e pimenta-do-reino.', 62.00, 20);
SELECT fn_inserir_item('PRA03', 'pratos principais', 'Risoto de Cogumelos',
    'Arroz arbóreo com mix de cogumelos e finalização de parmesão.', 68.00, 30);
SELECT fn_inserir_item('PRA04', 'pratos principais', 'Lasanha à Bolonhesa',
    'Camadas de massa, molho de carne e queijo gratinado.', 64.00, 25);
SELECT fn_inserir_item('PRA05', 'pratos principais', 'Filé ao Molho Madeira',
    'Filé mignon grelhado com molho madeira e batatas rústicas.', 89.00, 30);
SELECT fn_inserir_item('SOB01', 'sobremesas', 'Tiramisù',
    'Clássico italiano com café, mascarpone e cacau.', 30.00, 5);
SELECT fn_inserir_item('SOB02', 'sobremesas', 'Panna Cotta',
    'Creme de baunilha com calda de frutas vermelhas.', 28.00, 5);
SELECT fn_inserir_item('SOB03', 'sobremesas', 'Gelato Artesanal',
    'Duas bolas de gelato, sabores do dia.', 24.00, 3);
SELECT fn_inserir_item('BAL01', 'bebidas alcoólicas', 'Vinho Tinto (taça)',
    'Taça de vinho tinto da casa.', 32.00, 2);
SELECT fn_inserir_item('BAL02', 'bebidas alcoólicas', 'Aperol Spritz',
    'Aperol, espumante e água com gás, com fatia de laranja.', 34.00, 4);
SELECT fn_inserir_item('BAL03', 'bebidas alcoólicas', 'Chope Pilsen',
    'Chope gelado de 300 ml.', 14.00, 2);
SELECT fn_inserir_item('BNA01', 'bebidas não alcoólicas', 'Água com Gás',
    'Garrafa de 500 ml.', 8.00, 1);
SELECT fn_inserir_item('BNA02', 'bebidas não alcoólicas', 'Suco de Laranja',
    'Suco natural de laranja, 400 ml.', 12.00, 3);
SELECT fn_inserir_item('BNA03', 'bebidas não alcoólicas', 'Limonata Italiana',
    'Limão siciliano, hortelã e água com gás.', 14.00, 3);
UPDATE itens_cardapio SET disponibilidade = FALSE WHERE codigo_cardapio = 'PRA05';

-- COMBOS (sem categoria)
SELECT fn_inserir_item('CMB01', NULL, 'Combo Casal',
    'Entrada para dividir, dois pratos principais e uma sobremesa.', 190.00, 30, TRUE);
SELECT fn_inserir_item('CMB02', NULL, 'Combo Massa e Vinho',
    'Um prato de massa com uma taça de vinho tinto.', 82.00, 20, TRUE);

SELECT fn_adicionar_composicao((SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'CMB01'),
                               (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'ENT01'), 1);
SELECT fn_adicionar_composicao((SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'CMB01'),
                               (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'PRA01'), 2);
SELECT fn_adicionar_composicao((SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'CMB01'),
                               (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'SOB01'), 1);
SELECT fn_adicionar_composicao((SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'CMB02'),
                               (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'PRA02'), 1);
SELECT fn_adicionar_composicao((SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'CMB02'),
                               (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'BAL01'), 1);

-- RESERVAS (datas relativas a agora)
SELECT fn_inserir_reserva(
    (SELECT id_cliente FROM cliente WHERE telefone = '47991110001'),
    (date_trunc('day', now()) + INTERVAL '1 day 20 hours')::timestamp,
    4, 'Aniversário, levar vela para o tiramisù.',
    ARRAY[(SELECT id_mesa FROM mesa WHERE numero_mesa = 1)]);

SELECT fn_inserir_reserva(
    (SELECT id_cliente FROM cliente WHERE telefone = '47991110002'),
    (now() + INTERVAL '3 days')::timestamp,
    6, 'Prefere mesa mais reservada.',
    ARRAY[(SELECT id_mesa FROM mesa WHERE numero_mesa = 3)]);

SELECT fn_inserir_reserva(
    (SELECT id_cliente FROM cliente WHERE telefone = '47991110003'),
    (now() + INTERVAL '5 days')::timestamp,
    10, 'Jantar de empresa.',
    ARRAY[(SELECT id_mesa FROM mesa WHERE numero_mesa = 7),
          (SELECT id_mesa FROM mesa WHERE numero_mesa = 4)]);

SELECT fn_inserir_reserva(
    (SELECT id_cliente FROM cliente WHERE telefone = '47991110004'),
    (now() + INTERVAL '10 days')::timestamp,
    2, NULL,
    ARRAY[(SELECT id_mesa FROM mesa WHERE numero_mesa = 6)]);

-- reservas passadas para o histórico (inseridas direto, pois a função recusa passado)
INSERT INTO reserva (id_cliente, data_hora, numero_pessoas, status, observacoes)
SELECT id_cliente, now() - INTERVAL '2 days', 4, 'finalizada', 'Mesa perto da janela.'
  FROM cliente WHERE telefone = '47991110005';
INSERT INTO reserva_mesa (id_reserva, id_mesa)
SELECT currval('reserva_id_reserva_seq'), id_mesa FROM mesa WHERE numero_mesa = 2;

INSERT INTO reserva (id_cliente, data_hora, numero_pessoas, status, observacoes)
SELECT id_cliente, now() - INTERVAL '6 days', 2, 'cancelada', 'Cliente avisou que não poderia vir.'
  FROM cliente WHERE telefone = '47991110006';
INSERT INTO reserva_mesa (id_reserva, id_mesa)
SELECT currval('reserva_id_reserva_seq'), id_mesa FROM mesa WHERE numero_mesa = 5;

-- PEDIDOS FECHADOS E PAGOS (histórico)
DO $$
DECLARE v_ped INTEGER;
BEGIN
    -- salão, mesa 2, com 10%, pago em dinheiro e PIX
    v_ped := fn_abrir_pedido_salao(
        (SELECT id_mesa FROM mesa WHERE numero_mesa = 2),
        (SELECT id_garcom FROM garcom WHERE codigo_garcom = 'G001'),
        (SELECT id_cliente FROM cliente WHERE telefone = '47991110005'));
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'PRA01'), 2, NULL);
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'BNA03'), 2, 'Sem gelo');
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'SOB01'), 1, NULL);
    UPDATE item_pedido SET status_cozinha = 'servido' WHERE id_pedido = v_ped;
    PERFORM fn_fechar_pedido(v_ped, TRUE);
    PERFORM fn_registrar_pagamento(v_ped, 'dinheiro', 100);
    PERFORM fn_registrar_pagamento(v_ped, 'PIX', (SELECT valor_total - 100 FROM pedido WHERE id_pedido = v_ped));
    UPDATE pedido SET data_hora_abertura = now() - INTERVAL '2 days' WHERE id_pedido = v_ped;

    -- salão, mesa 5, sem 10%, cartão
    v_ped := fn_abrir_pedido_salao(
        (SELECT id_mesa FROM mesa WHERE numero_mesa = 5),
        (SELECT id_garcom FROM garcom WHERE codigo_garcom = 'G002'));
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'PRA03'), 1, NULL);
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'BAL02'), 1, NULL);
    UPDATE item_pedido SET status_cozinha = 'servido' WHERE id_pedido = v_ped;
    PERFORM fn_fechar_pedido(v_ped, FALSE);
    PERFORM fn_registrar_pagamento(v_ped, 'cartão de crédito', (SELECT valor_total FROM pedido WHERE id_pedido = v_ped));
    UPDATE pedido SET data_hora_abertura = now() - INTERVAL '1 day' WHERE id_pedido = v_ped;

    -- delivery entregue e pago
    v_ped := fn_abrir_pedido_delivery(
        (SELECT id_cliente FROM cliente WHERE telefone = '47991110007'), 'Rua das Flores, 120, Centro', 8.00);
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'PRA04'), 2, NULL);
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'BNA02'), 2, NULL);
    UPDATE item_pedido SET status_cozinha = 'servido' WHERE id_pedido = v_ped;
    PERFORM fn_avancar_entrega(v_ped);
    PERFORM fn_avancar_entrega(v_ped);
    PERFORM fn_fechar_pedido(v_ped, FALSE);
    PERFORM fn_registrar_pagamento(v_ped, 'PIX', (SELECT valor_total FROM pedido WHERE id_pedido = v_ped));
    UPDATE pedido SET data_hora_abertura = now() - INTERVAL '3 hours' WHERE id_pedido = v_ped;

    -- pedido cancelado
    v_ped := fn_abrir_pedido_salao(
        (SELECT id_mesa FROM mesa WHERE numero_mesa = 6),
        (SELECT id_garcom FROM garcom WHERE codigo_garcom = 'G005'));
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'ENT02'), 1, NULL);
    PERFORM fn_cancelar_pedido(v_ped);
    UPDATE pedido SET data_hora_abertura = now() - INTERVAL '4 days' WHERE id_pedido = v_ped;
END $$;

-- PEDIDOS ABERTOS (aparecem na Cozinha e deixam mesas ocupadas)
DO $$
DECLARE v_ped INTEGER;
BEGIN
    -- mesa 3, itens em estados diferentes
    v_ped := fn_abrir_pedido_salao(
        (SELECT id_mesa FROM mesa WHERE numero_mesa = 3),
        (SELECT id_garcom FROM garcom WHERE codigo_garcom = 'G001'));
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'ENT03'), 1, NULL);
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'PRA02'), 3, 'Uma sem pimenta');
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'BAL01'), 3, NULL);
    PERFORM fn_avancar_item((SELECT min(id_item_pedido) FROM item_pedido WHERE id_pedido = v_ped));

    -- delivery em andamento
    v_ped := fn_abrir_pedido_delivery(
        (SELECT id_cliente FROM cliente WHERE telefone = '47991110008'), 'Av. Beira Rio, 450, apto 31', 6.50);
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'PRA01'), 1, NULL);
    PERFORM fn_inserir_item_pedido(v_ped, (SELECT id_cardapio FROM itens_cardapio WHERE codigo_cardapio = 'SOB02'), 1, NULL);
END $$;