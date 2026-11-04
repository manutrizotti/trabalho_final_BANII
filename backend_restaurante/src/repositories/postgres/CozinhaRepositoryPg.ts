import { pool } from '../../db/connection.js'
import { ItemCozinha, type StatusCozinha } from '../../models/ItemCozinha.js'
import type { CozinhaRepository } from '../CozinhaRepository.js'

const SELECT_ITEM = `
  SELECT ip.id_item_pedido, ic.nome, m.numero_mesa, ip.quantidade, ip.status_cozinha
    FROM item_pedido ip
    JOIN pedido p ON p.id_pedido = ip.id_pedido
    JOIN itens_cardapio ic ON ic.id_cardapio = ip.id_cardapio
    LEFT JOIN mesa m ON m.id_mesa = p.id_mesa`

function paraModelo(l: any): ItemCozinha {
  return new ItemCozinha(
    String(l.id_item_pedido),
    l.nome,
    l.numero_mesa ?? null,
    l.quantidade,
    l.status_cozinha,
  )
}

export class CozinhaRepositoryPg implements CozinhaRepository {
  async listarPendentes(): Promise<ItemCozinha[]> {
    const { rows } = await pool.query(
      `${SELECT_ITEM}
        WHERE ip.status_cozinha <> 'servido' AND p.status_pedido <> 'cancelado'
        ORDER BY ip.id_item_pedido`,
    )
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<ItemCozinha | null> {
    const { rows } = await pool.query(`${SELECT_ITEM} WHERE ip.id_item_pedido = $1`, [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async alterarStatus(id: string, de: StatusCozinha, para: StatusCozinha): Promise<boolean> {
    const r = await pool.query(
      'UPDATE item_pedido SET status_cozinha = $3 WHERE id_item_pedido = $1 AND status_cozinha = $2',
      [id, de, para],
    )
    return r.rowCount === 1
  }
}