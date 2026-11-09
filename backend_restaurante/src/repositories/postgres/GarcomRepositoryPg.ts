import { chamar, pool } from '../../db/connection.js'
import { Garcom } from '../../models/Garcom.js'
import type {
  AtualizacaoGarcom,
  FiltroGarcons,
  GarcomRepository,
  NovoGarcom,
} from '../GarcomRepository.js'

const COLUNAS = `id_garcom, codigo_garcom, cpf, nome,
         to_char(data_admissao, 'YYYY-MM-DD') AS data_admissao,
         percentual_comissao, status`

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
    const { rows } = await chamar(`SELECT ${COLUNAS} FROM fn_listar_garcons($1, $2)`, [
      filtro.status ?? null,
      filtro.nome ?? null,
    ])
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<Garcom | null> {
    const { rows } = await pool.query(`SELECT ${COLUNAS} FROM garcom WHERE id_garcom = $1`, [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async buscarPorCodigo(codigo: string): Promise<Garcom | null> {
    const { rows } = await pool.query(`SELECT ${COLUNAS} FROM garcom WHERE codigo_garcom = $1`, [codigo])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async buscarPorCpf(cpf: string): Promise<Garcom | null> {
    const { rows } = await pool.query(`SELECT ${COLUNAS} FROM garcom WHERE cpf = $1`, [cpf])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  // a data de admissão é a de hoje (padrão da tabela), igual ao que o service envia
  async inserir(d: NovoGarcom): Promise<Garcom> {
    const { rows } = await chamar('SELECT fn_inserir_garcom($1, $2, $3, $4) AS id', [
      d.codigo, d.cpf, d.nome, d.comissao,
    ])
    return (await this.buscarPorId(String(rows[0].id)))!
  }

  async atualizar(id: string, d: AtualizacaoGarcom): Promise<Garcom | null> {
    await chamar('SELECT fn_atualizar_garcom($1, $2, $3, $4)', [id, d.nome, d.comissao, d.status])
    return this.buscarPorId(id)
  }

  async temPedidoAberto(id: string): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1 FROM pedido WHERE id_garcom = $1 AND status_pedido = 'aberto' LIMIT 1`,
      [id],
    )
    return rows.length > 0
  }
}