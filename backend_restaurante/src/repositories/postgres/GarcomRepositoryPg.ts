import { pool } from '../../db/connection.js'
import { Garcom } from '../../models/Garcom.js'
import type {
  AtualizacaoGarcom,
  FiltroGarcons,
  GarcomRepository,
  NovoGarcom,
} from '../GarcomRepository.js'

const SELECT_GARCOM = `
  SELECT id_garcom, codigo_garcom, cpf, nome,
         to_char(data_admissao, 'YYYY-MM-DD') AS data_admissao,
         percentual_comissao, status
    FROM garcom`

function paraModelo(l: any): Garcom {
  return new Garcom(
    String(l.id_garcom),
    l.codigo_garcom,
    l.cpf,
    l.nome,
    l.data_admissao,
    Number(l.percentual_comissao ?? 0),
    l.status,
  )
}

export class GarcomRepositoryPg implements GarcomRepository {
  async listar(filtro: FiltroGarcons): Promise<Garcom[]> {
    const condicoes: string[] = []
    const params: unknown[] = []

    if (filtro.status) {
      params.push(filtro.status)
      condicoes.push(`status = $${params.length}`)
    }
    if (filtro.nome) {
      params.push(`%${filtro.nome}%`)
      condicoes.push(`nome ILIKE $${params.length}`)
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
    const { rows } = await pool.query(`${SELECT_GARCOM} ${where}`, params)
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<Garcom | null> {
    const { rows } = await pool.query(`${SELECT_GARCOM} WHERE id_garcom = $1`, [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async buscarPorCodigo(codigo: string): Promise<Garcom | null> {
    const { rows } = await pool.query(`${SELECT_GARCOM} WHERE codigo_garcom = $1`, [codigo])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async buscarPorCpf(cpf: string): Promise<Garcom | null> {
    const { rows } = await pool.query(`${SELECT_GARCOM} WHERE cpf = $1`, [cpf])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async inserir(d: NovoGarcom): Promise<Garcom> {
    const { rows } = await pool.query(
      `INSERT INTO garcom (codigo_garcom, cpf, nome, data_admissao, percentual_comissao)
       VALUES ($1, $2, $3, $4, $5) RETURNING id_garcom`,
      [d.codigo, d.cpf, d.nome, d.dataAdmissao, d.comissao],
    )
    return (await this.buscarPorId(String(rows[0].id_garcom)))!
  }

  async atualizar(id: string, d: AtualizacaoGarcom): Promise<Garcom | null> {
    const { rows } = await pool.query(
      `UPDATE garcom SET nome = $2, percentual_comissao = $3, status = $4
        WHERE id_garcom = $1 RETURNING id_garcom`,
      [id, d.nome, d.comissao, d.status],
    )
    return rows[0] ? this.buscarPorId(id) : null
  }

  async temPedidoAberto(id: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM pedido WHERE id_garcom = $1 AND status_pedido = 'aberto' LIMIT 1`,
      [id],
    )
    return rows.length > 0
  }
}