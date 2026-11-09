import { chamar, pool } from '../../db/connection.js'
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
    const { rows } = await chamar('SELECT * FROM fn_listar_clientes($1)', [filtro.nome ?? null])
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
    const { rows } = await chamar('SELECT fn_inserir_cliente($1, $2) AS id', [d.nome, d.telefone])
    return (await this.buscarPorId(String(rows[0].id)))!
  }

  async atualizar(id: string, d: AtualizacaoCliente): Promise<Cliente | null> {
    await chamar('SELECT fn_atualizar_cliente($1, $2, $3)', [id, d.nome, d.telefone])
    return this.buscarPorId(id)
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
    await chamar('SELECT fn_excluir_cliente($1)', [id])
  }
}