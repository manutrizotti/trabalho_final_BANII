import { chamar, pool } from '../../db/connection.js'
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
    const { rows } = await chamar(
      `SELECT id_reserva, id_cliente, nome_cliente,
              to_char(data_hora, 'YYYY-MM-DD HH24:MI:SS') AS data_hora,
              numero_pessoas, status, observacoes, mesas
         FROM fn_listar_reservas($1, $2, $3)`,
      [filtro.status ?? null, filtro.de ?? null, filtro.ate ?? null],
    )
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<Reserva | null> {
    const { rows } = await pool.query(`${SELECT_RESERVA} WHERE r.id_reserva = $1`, [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  // a função valida data, capacidade e conflito, e grava reserva e mesas na mesma transação
  async inserir(d: NovaReserva): Promise<Reserva> {
    const { rows } = await chamar('SELECT fn_inserir_reserva($1, $2, $3, $4, $5::int[]) AS id', [
      d.idCliente, d.dataHora, d.numeroPessoas, d.observacoes || null, d.idMesas,
    ])
    return (await this.buscarPorId(String(rows[0].id)))!
  }

  async atualizar(id: string, d: AtualizacaoReserva): Promise<Reserva | null> {
    await chamar('SELECT fn_atualizar_reserva($1, $2, $3)', [id, d.status, d.observacoes || null])
    return this.buscarPorId(id)
  }

  // a duração (2h30) está fixa dentro da função SQL, por isso o parâmetro não é usado aqui
  async mesaTemConflito(idMesa: string, dataHora: string, _duracaoMinutos: number): Promise<boolean> {
    const { rows } = await chamar('SELECT fn_mesa_tem_conflito($1, $2) AS conflito', [idMesa, dataHora])
    return rows[0].conflito === true
  }
}