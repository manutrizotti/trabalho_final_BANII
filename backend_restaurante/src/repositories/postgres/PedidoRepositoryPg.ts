import { pool } from '../../db/connection.js'
import { Pedido, type ItemPedido, type Pagamento, type StatusEntrega } from '../../models/Pedido.js'
import type {
  FiltroPedidos,
  NovoItemPedido,
  NovoPedido,
  PedidoRepository,
} from '../PedidoRepository.js'
import type { FormaPagamento } from '../../models/Pedido.js'

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
  async listar(filtro: FiltroPedidos): Promise<Pedido[]> {
    const condicoes: string[] = []
    const params: unknown[] = []

    if (filtro.tipo) {
      params.push(filtro.tipo === 'salao' ? 1 : 2)
      condicoes.push(`p.tipo = $${params.length}`)
    }
    if (filtro.status) {
      params.push(filtro.status)
      condicoes.push(`p.status_pedido = $${params.length}`)
    }
    if (filtro.de) {
      params.push(filtro.de)
      condicoes.push(`p.data_hora_abertura >= $${params.length}::timestamp`)
    }
    if (filtro.ate) {
      params.push(filtro.ate)
      condicoes.push(`p.data_hora_abertura < $${params.length}::timestamp`)
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
    const { rows } = await pool.query(`${SELECT_PEDIDO} ${where} ORDER BY p.id_pedido DESC`, params)
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
    const { rows } = await pool.query(
      `INSERT INTO pedido (tipo, id_cliente, id_mesa, id_garcom, id_reserva,
                           endereco_entrega, taxa_entrega, status_entrega)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id_pedido`,
      [
        d.tipo === 'salao' ? 1 : 2,
        d.idCliente,
        d.idMesa,
        d.idGarcom,
        d.idReserva,
        d.endereco,
        d.taxaEntrega,
        d.tipo === 'delivery' ? 'preparando' : null,
      ],
    )
    return (await this.buscarPorId(String(rows[0].id_pedido)))!
  }

  async inserirItem(idPedido: string, d: NovoItemPedido): Promise<void> {
    await pool.query(
      `INSERT INTO item_pedido (id_pedido, id_cardapio, quantidade, valor_unitario, observacoes)
       VALUES ($1, $2, $3, $4, $5)`,
      [idPedido, d.idCardapio, d.quantidade, d.valorUnitario, d.observacoes || null],
    )
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
    await pool.query('DELETE FROM item_pedido WHERE id_item_pedido = $1', [idItem])
  }

  async atualizarTotal(idPedido: string, total: number): Promise<void> {
    await pool.query('UPDATE pedido SET valor_total = $2 WHERE id_pedido = $1', [idPedido, total])
  }

  async fechar(idPedido: string, pagouDezPorcento: boolean, total: number): Promise<boolean> {
    const r = await pool.query(
      `UPDATE pedido SET status_pedido = 'fechado', pagou_dez_porcento = $2, valor_total = $3
        WHERE id_pedido = $1 AND status_pedido = 'aberto'`,
      [idPedido, pagouDezPorcento, total],
    )
    return r.rowCount === 1
  }

  async cancelar(idPedido: string): Promise<boolean> {
    const r = await pool.query(
      `UPDATE pedido SET status_pedido = 'cancelado'
        WHERE id_pedido = $1 AND status_pedido = 'aberto'`,
      [idPedido],
    )
    return r.rowCount === 1
  }

  async alterarStatusEntrega(idPedido: string, de: StatusEntrega, para: StatusEntrega): Promise<boolean> {
    const r = await pool.query(
      'UPDATE pedido SET status_entrega = $3 WHERE id_pedido = $1 AND status_entrega = $2',
      [idPedido, de, para],
    )
    return r.rowCount === 1
  }

  async inserirPagamento(idPedido: string, forma: FormaPagamento, valor: number): Promise<void> {
    await pool.query(
      `INSERT INTO conta (id_pedido, id_pagamento, valor_atribuido)
       VALUES ($1, (SELECT id_pagamento FROM forma_pagamento WHERE descricao = $2), $3)`,
      [idPedido, forma, valor],
    )
  }

  async reservaTemPedidoAberto(idReserva: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM pedido WHERE id_reserva = $1 AND status_pedido = 'aberto' LIMIT 1`,
      [idReserva],
    )
    return rows.length > 0
  }
}