import { pool } from '../../db/connection.js'
import { Mesa } from '../../models/Mesa.js'
import type {
  AtualizacaoMesa,
  FiltroMesas,
  MesaRepository,
  NovaMesa,
} from '../MesaRepository.js'
import type { StatusMesa } from '../../models/Mesa.js'

const SELECT_MESA = `
  SELECT m.*,
         (SELECT p.id_pedido FROM pedido p
           WHERE p.id_mesa = m.id_mesa AND p.status_pedido = 'aberto'
           LIMIT 1) AS id_pedido_aberto
    FROM mesa m`

function paraModelo(l: any): Mesa {
  return new Mesa(
    String(l.id_mesa),
    l.numero_mesa,
    l.localizacao,
    l.capacidade_pessoas,
    l.status_mesa,
    l.id_pedido_aberto ? String(l.id_pedido_aberto) : null,
  )
}

export class MesaRepositoryPg implements MesaRepository {
  async listar(filtro: FiltroMesas): Promise<Mesa[]> {
    const condicoes: string[] = [`m.status_mesa <> 'removida'`]
    const params: unknown[] = []

    if (filtro.busca) {
      params.push(`%${filtro.busca}%`)
      condicoes.push(`m.numero_mesa::text LIKE $${params.length}`)
    }
    if (filtro.apenasLivres) {
      condicoes.push(`m.status_mesa = 'ativa'`)
      condicoes.push(
        `NOT EXISTS (SELECT 1 FROM pedido p WHERE p.id_mesa = m.id_mesa AND p.status_pedido = 'aberto')`,
      )
    }
    if (filtro.localizacao) {
      params.push(filtro.localizacao)
      condicoes.push(`m.localizacao = $${params.length}`)
    }

    const { rows } = await pool.query(`${SELECT_MESA} WHERE ${condicoes.join(' AND ')}`, params)
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<Mesa | null> {
    const { rows } = await pool.query(`${SELECT_MESA} WHERE m.id_mesa = $1`, [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async buscarPorNumero(numero: number): Promise<Mesa | null> {
    const { rows } = await pool.query(`${SELECT_MESA} WHERE m.numero_mesa = $1`, [numero])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async inserir(d: NovaMesa): Promise<Mesa> {
    const { rows } = await pool.query(
      `INSERT INTO mesa (numero_mesa, localizacao, capacidade_pessoas)
       VALUES ($1, $2, $3) RETURNING id_mesa`,
      [d.numero, d.localizacao, d.capacidade],
    )
    return (await this.buscarPorId(String(rows[0].id_mesa)))!
  }

  async atualizar(id: string, d: AtualizacaoMesa): Promise<Mesa | null> {
    const { rows } = await pool.query(
      `UPDATE mesa SET localizacao = $2, capacidade_pessoas = $3, status_mesa = $4
        WHERE id_mesa = $1 RETURNING id_mesa`,
      [id, d.localizacao, d.capacidade, d.status],
    )
    return rows[0] ? this.buscarPorId(id) : null
  }

  async alterarStatus(id: string, status: StatusMesa): Promise<void> {
    await pool.query('UPDATE mesa SET status_mesa = $2 WHERE id_mesa = $1', [id, status])
  }

  async temHistorico(id: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM pedido WHERE id_mesa = $1
       UNION ALL
       SELECT 1 FROM reserva_mesa WHERE id_mesa = $1
       LIMIT 1`,
      [id],
    )
    return rows.length > 0
  }

  async excluir(id: string): Promise<void> {
    await pool.query('DELETE FROM mesa WHERE id_mesa = $1', [id])
  }
}