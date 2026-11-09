import { chamar, pool } from '../../db/connection.js'
import {
  Pedido,
  type FormaPagamento,
  type ItemPedido,
  type Pagamento,
  type StatusEntrega,
} from '../../models/Pedido.js'
import type {
  FiltroPedidos,
  NovoItemPedido,
  NovoPedido,
  PedidoRepository,
} from '../PedidoRepository.js'

const SELECT_PEDIDO = `
  SELECT p.id_pedido, p.tipo, p.status_pedido, p.pagou_dez_porcento, p.valor_total,
         p.id_cliente, c.nome_cliente, p.id_reserva, p.endereco_entrega, p.taxa_entrega,
         p.status_entrega,
         to_char(p.data_hora_abertura, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_abertura,
         p.id_mesa, m.numero_mesa, p.id_garcom, g.nome AS nome_garcom
    FROM pedido p
    LEFT JOIN cliente c ON c.id_cliente = p.id_cliente
    LEFT JOIN mesa m ON m.id_mesa = p.id_mesa
    LEFT JOIN garcom g ON g.id_garcom = p.id_garcom`

const idOuNulo = (v: unknown) => (v === null || v === undefined ? null : String(v))

function paraModelo(l: any): Pedido {
  return new Pedido(
    String(l.id_pedido),
    l.tipo === 1 ? 'salao' : 'delivery',
    l.status_pedido,
    l.pagou_dez_porcento,
    Number(l.valor_total),
    idOuNulo(l.id_cliente),
    l.nome_cliente ?? null,
    idOuNulo(l.id_reserva),
    l.endereco_entrega ?? null,
    l.taxa_entrega === null ? null : Number(l.taxa_entrega),
    l.status_entrega ?? null,
    l.data_hora_abertura,
    idOuNulo(l.id_mesa),
    l.numero_mesa ?? null,
    idOuNulo(l.id_garcom),
    l.nome_garcom ?? null,
  )
}

export class PedidoRepositoryPg implements PedidoRepository {
  // usa fn_listar_pedidos (versão com TIMESTAMP, veja patch_fn_listar_pedidos.sql)
  async listar(filtro: FiltroPedidos): Promise<Pedido[]> {
    const { rows } = await chamar(
      `SELECT id_pedido, tipo, status_pedido, pagou_dez_porcento, valor_total,
              id_cliente, nome_cliente, id_reserva, endereco_entrega, taxa_entrega, status_entrega,
              to_char(data_hora_abertura, 'YYYY-MM-DD HH24:MI:SS') AS data_hora_abertura,
              id_mesa, numero_mesa, id_garcom, nome_garcom
         FROM fn_listar_pedidos($1, $2, $3, $4)`,
      [
        filtro.tipo ? (filtro.tipo === 'salao' ? 1 : 2) : null,
        filtro.status ?? null,
        filtro.de ?? null,
        filtro.ate ?? null,
      ],
    )
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<Pedido | null> {
    const { rows } = await pool.query(`${SELECT_PEDIDO} WHERE p.id_pedido = $1`, [id])
    if (!rows[0]) return null
    const pedido = paraModelo(rows[0])

    const itens = await pool.query(
      `SELECT ip.id_item_pedido, ip.id_cardapio, ic.nome, ip.quantidade, ip.valor_unitario,
              ip.observacoes, ip.status_cozinha
         FROM item_pedido ip JOIN itens_cardapio ic ON ic.id_cardapio = ip.id_cardapio
        WHERE ip.id_pedido = $1 ORDER BY ip.id_item_pedido`,
      [id],
    )
    pedido.itens = itens.rows.map(
      (r): ItemPedido => ({
        id: String(r.id_item_pedido),
        idCardapio: String(r.id_cardapio),
        nomeProduto: r.nome,
        quantidade: r.quantidade,
        valorUnitario: Number(r.valor_unitario),
        observacoes: r.observacoes ?? '',
        statusCozinha: r.status_cozinha,
      }),
    )

    const pagamentos = await pool.query(
      `SELECT fp.descricao, c.valor_atribuido,
              to_char(c.data_hora, 'YYYY-MM-DD HH24:MI:SS') AS data_hora
         FROM conta c JOIN forma_pagamento fp ON fp.id_pagamento = c.id_pagamento
        WHERE c.id_pedido = $1 ORDER BY c.id_conta`,
      [id],
    )
    pedido.pagamentos = pagamentos.rows.map(
      (r): Pagamento => ({ forma: r.descricao, valor: Number(r.valor_atribuido), dataHora: r.data_hora }),
    )
    return pedido
  }

  async inserir(d: NovoPedido): Promise<Pedido> {
    const { rows } =
      d.tipo === 'salao'
        ? await chamar('SELECT fn_abrir_pedido_salao($1, $2, $3, $4) AS id', [
            d.idMesa, d.idGarcom, d.idCliente, d.idReserva,
          ])
        : await chamar('SELECT fn_abrir_pedido_delivery($1, $2, $3) AS id', [
            d.idCliente, d.endereco, d.taxaEntrega,
          ])
    return (await this.buscarPorId(String(rows[0].id)))!
  }

  // o preço é copiado do cardápio dentro da função (valorUnitario não é necessário)
  async inserirItem(idPedido: string, d: NovoItemPedido): Promise<void> {
    await chamar('SELECT fn_inserir_item_pedido($1, $2, $3, $4)', [
      idPedido, d.idCardapio, d.quantidade, d.observacoes || null,
    ])
  }

  async buscarItem(idPedido: string, idItem: string): Promise<ItemPedido | null> {
    const { rows } = await pool.query(
      `SELECT ip.id_item_pedido, ip.id_cardapio, ic.nome, ip.quantidade, ip.valor_unitario,
              ip.observacoes, ip.status_cozinha
         FROM item_pedido ip JOIN itens_cardapio ic ON ic.id_cardapio = ip.id_cardapio
        WHERE ip.id_pedido = $1 AND ip.id_item_pedido = $2`,
      [idPedido, idItem],
    )
    const r = rows[0]
    if (!r) return null
    return {
      id: String(r.id_item_pedido),
      idCardapio: String(r.id_cardapio),
      nomeProduto: r.nome,
      quantidade: r.quantidade,
      valorUnitario: Number(r.valor_unitario),
      observacoes: r.observacoes ?? '',
      statusCozinha: r.status_cozinha,
    }
  }

  async removerItem(idItem: string): Promise<void> {
    await chamar('SELECT fn_remover_item_pedido($1)', [idItem])
  }

  // a função recalcula (itens + taxa) sozinha; o valor recebido não é usado
  async atualizarTotal(idPedido: string, _total: number): Promise<void> {
    await chamar('SELECT fn_recalcular_total($1)', [idPedido])
  }

  // a função confere se está aberto, calcula o total e aplica os 10% (só no salão)
  async fechar(idPedido: string, pagouDezPorcento: boolean, _total: number): Promise<boolean> {
    await chamar('SELECT fn_fechar_pedido($1, $2)', [idPedido, pagouDezPorcento])
    return true
  }

  async cancelar(idPedido: string): Promise<boolean> {
    await chamar('SELECT fn_cancelar_pedido($1)', [idPedido])
    return true
  }

  // a função dá sempre o próximo passo da entrega
  async alterarStatusEntrega(idPedido: string, _de: StatusEntrega, _para: StatusEntrega): Promise<boolean> {
    await chamar('SELECT fn_avancar_entrega($1)', [idPedido])
    return true
  }

  async inserirPagamento(idPedido: string, forma: FormaPagamento, valor: number): Promise<void> {
    await chamar('SELECT fn_registrar_pagamento($1, $2, $3)', [idPedido, forma, valor])
  }

  async reservaTemPedidoAberto(idReserva: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM pedido WHERE id_reserva = $1 AND status_pedido = 'aberto' LIMIT 1`,
      [idReserva],
    )
    return rows.length > 0
  }
}