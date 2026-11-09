import { chamar, pool } from '../../db/connection.js'
import { ItemCozinha, type StatusCozinha } from '../../models/ItemCozinha.js'
import type { CozinhaRepository } from '../CozinhaRepository.js'

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
    const { rows } = await chamar('SELECT * FROM fn_listar_cozinha()')
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<ItemCozinha | null> {
    const { rows } = await pool.query(
      `SELECT ip.id_item_pedido, ic.nome, m.numero_mesa, ip.quantidade, ip.status_cozinha
         FROM item_pedido ip
         JOIN pedido p ON p.id_pedido = ip.id_pedido
         JOIN itens_cardapio ic ON ic.id_cardapio = ip.id_cardapio
         LEFT JOIN mesa m ON m.id_mesa = p.id_mesa
        WHERE ip.id_item_pedido = $1`,
      [id],
    )
    return rows[0] ? paraModelo(rows[0]) : null
  }

  // fn_avancar_item sempre dá o próximo passo (a única transição permitida);
  // os parâmetros `de` e `para` não são necessários aqui
  async alterarStatus(id: string, _de: StatusCozinha, _para: StatusCozinha): Promise<boolean> {
    await chamar('SELECT fn_avancar_item($1)', [id])
    return true
  }
}