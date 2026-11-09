import { chamar, pool } from '../../db/connection.js'
import { Mesa } from '../../models/Mesa.js'
import type { StatusMesa } from '../../models/Mesa.js'
import type {
  AtualizacaoMesa,
  FiltroMesas,
  MesaRepository,
  NovaMesa,
} from '../MesaRepository.js'

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
    const { rows } = await chamar('SELECT * FROM fn_listar_mesas($1, $2, $3)', [
      filtro.busca ?? null,
      filtro.apenasLivres ?? false,
      filtro.localizacao ?? null,
    ])
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
    const { rows } = await chamar('SELECT fn_inserir_mesa($1, $2, $3) AS id', [
      d.numero, d.localizacao, d.capacidade,
    ])
    return (await this.buscarPorId(String(rows[0].id)))!
  }

  async atualizar(id: string, d: AtualizacaoMesa): Promise<Mesa | null> {
    await chamar('SELECT fn_atualizar_mesa($1, $2, $3, $4)', [id, d.localizacao, d.capacidade, d.status])
    return this.buscarPorId(id)
  }

  async alterarStatus(id: string, status: StatusMesa): Promise<void> {
    if (status === 'removida') {
      await chamar('SELECT fn_remover_mesa($1)', [id])
      return
    }
    const mesa = await this.buscarPorId(id)
    if (mesa) await chamar('SELECT fn_atualizar_mesa($1, $2, $3, $4)', [id, mesa.localizacao, mesa.capacidade, status])
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

  // fn_remover_mesa apaga se não houver histórico (o service só chama aqui nesse caso)
  async excluir(id: string): Promise<void> {
    await chamar('SELECT fn_remover_mesa($1)', [id])
  }
}