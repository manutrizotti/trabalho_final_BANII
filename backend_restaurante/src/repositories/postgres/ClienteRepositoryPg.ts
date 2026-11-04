import { pool } from '../../db/connection.js'
import { Cliente } from '../../models/Cliente.js'
import type {
  AtualizacaoCliente,
  ClienteRepository,
  FiltroClientes,
  NovoCliente,
} from '../ClienteRepository.js'

function paraModelo(l: any): Cliente {
  return new Cliente(String(l.id_cliente), l.nome_cliente, l.telefone)
}

export class ClienteRepositoryPg implements ClienteRepository {
  async listar(filtro: FiltroClientes): Promise<Cliente[]> {
    const params: unknown[] = []
    let where = ''
    if (filtro.nome) {
      params.push(`%${filtro.nome}%`)
      where = `WHERE nome_cliente ILIKE $1`
    }
    const { rows } = await pool.query(`SELECT * FROM cliente ${where}`, params)
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<Cliente | null> {
    const { rows } = await pool.query('SELECT * FROM cliente WHERE id_cliente = $1', [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async buscarPorTelefone(telefone: string): Promise<Cliente | null> {
    const { rows } = await pool.query('SELECT * FROM cliente WHERE telefone = $1', [telefone])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async inserir(d: NovoCliente): Promise<Cliente> {
    const { rows } = await pool.query(
      'INSERT INTO cliente (nome_cliente, telefone) VALUES ($1, $2) RETURNING *',
      [d.nome, d.telefone],
    )
    return paraModelo(rows[0])
  }

  async atualizar(id: string, d: AtualizacaoCliente): Promise<Cliente | null> {
    const { rows } = await pool.query(
      'UPDATE cliente SET nome_cliente = $2, telefone = $3 WHERE id_cliente = $1 RETURNING *',
      [id, d.nome, d.telefone],
    )
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async temHistorico(id: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM pedido WHERE id_cliente = $1
       UNION ALL
       SELECT 1 FROM reserva WHERE id_cliente = $1
       LIMIT 1`,
      [id],
    )
    return rows.length > 0
  }

  async excluir(id: string): Promise<void> {
    await pool.query('DELETE FROM cliente WHERE id_cliente = $1', [id])
  }
}