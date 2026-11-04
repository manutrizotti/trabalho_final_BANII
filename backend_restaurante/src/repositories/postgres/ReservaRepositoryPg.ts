import { pool } from '../../db/connection.js'
import { Reserva } from '../../models/Reserva.js'
import type {
  AtualizacaoReserva,
  FiltroReservas,
  NovaReserva,
  ReservaRepository,
} from '../ReservaRepository.js'

const SELECT_RESERVA = `
  SELECT r.id_reserva, r.id_cliente, c.nome_cliente,
         to_char(r.data_hora, 'YYYY-MM-DD HH24:MI:SS') AS data_hora,
         r.numero_pessoas, r.status, r.observacoes,
         COALESCE((
           SELECT json_agg(json_build_object('id', m.id_mesa, 'numero', m.numero_mesa)
                           ORDER BY m.numero_mesa)
             FROM reserva_mesa rm JOIN mesa m ON m.id_mesa = rm.id_mesa
            WHERE rm.id_reserva = r.id_reserva
         ), '[]'::json) AS mesas
    FROM reserva r JOIN cliente c ON c.id_cliente = r.id_cliente`

function paraModelo(l: any): Reserva {
  return new Reserva(
    String(l.id_reserva),
    String(l.id_cliente),
    l.nome_cliente,
    l.data_hora,
    l.numero_pessoas,
    l.status,
    l.observacoes ?? '',
    l.mesas.map((m: any) => ({ id: String(m.id), numero: m.numero })),
  )
}

export class ReservaRepositoryPg implements ReservaRepository {
  async listar(filtro: FiltroReservas): Promise<Reserva[]> {
    const condicoes: string[] = []
    const params: unknown[] = []

    if (filtro.status) {
      params.push(filtro.status)
      condicoes.push(`r.status = $${params.length}`)
    }
    if (filtro.de) {
      params.push(filtro.de)
      condicoes.push(`r.data_hora >= $${params.length}::timestamp`)
    }
    if (filtro.ate) {
      params.push(filtro.ate)
      condicoes.push(`r.data_hora < $${params.length}::timestamp`)
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
    const { rows } = await pool.query(`${SELECT_RESERVA} ${where}`, params)
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<Reserva | null> {
    const { rows } = await pool.query(`${SELECT_RESERVA} WHERE r.id_reserva = $1`, [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async inserir(d: NovaReserva): Promise<Reserva> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO reserva (id_cliente, data_hora, numero_pessoas, status, observacoes)
         VALUES ($1, $2::timestamp, $3, 'confirmada', $4) RETURNING id_reserva`,
        [d.idCliente, d.dataHora, d.numeroPessoas, d.observacoes || null],
      )
      const idReserva = rows[0].id_reserva
      for (const idMesa of d.idMesas) {
        await client.query('INSERT INTO reserva_mesa (id_reserva, id_mesa) VALUES ($1, $2)', [idReserva, idMesa])
      }
      await client.query('COMMIT')
      return (await this.buscarPorId(String(idReserva)))!
    } catch (erro) {
      await client.query('ROLLBACK')
      throw erro
    } finally {
      client.release()
    }
  }

  async atualizar(id: string, d: AtualizacaoReserva): Promise<Reserva | null> {
    const { rows } = await pool.query(
      'UPDATE reserva SET status = $2, observacoes = $3 WHERE id_reserva = $1 RETURNING id_reserva',
      [id, d.status, d.observacoes || null],
    )
    return rows[0] ? this.buscarPorId(id) : null
  }

  async mesaTemConflito(idMesa: string, dataHora: string, duracaoMinutos: number): Promise<boolean> {
    const { rows } = await pool.query(
      `SELECT 1
         FROM reserva_mesa rm JOIN reserva r ON r.id_reserva = rm.id_reserva
        WHERE rm.id_mesa = $1
          AND r.status IN ('pendente', 'confirmada', 'em andamento')
          AND r.data_hora > ($2::timestamp - make_interval(mins => $3::int))
          AND r.data_hora < ($2::timestamp + make_interval(mins => $3::int))
        LIMIT 1`,
      [idMesa, dataHora, duracaoMinutos],
    )
    return rows.length > 0
  }
}