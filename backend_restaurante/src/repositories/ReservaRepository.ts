import type { Reserva, StatusReserva } from '../models/Reserva.js'

export interface FiltroReservas {
  status?: StatusReserva // ausente = todas
  de?: string // 'AAAA-MM-DD HH:mm:ss', inclusive
  ate?: string // exclusive
}

export interface NovaReserva {
  idCliente: string
  dataHora: string
  numeroPessoas: number
  observacoes: string
  idMesas: string[]
}

export interface AtualizacaoReserva {
  status: StatusReserva
  observacoes: string
}

export interface ReservaRepository {
  listar(filtro: FiltroReservas): Promise<Reserva[]>
  buscarPorId(id: string): Promise<Reserva | null>
  inserir(dados: NovaReserva): Promise<Reserva> // reserva + mesas de uma vez
  atualizar(id: string, dados: AtualizacaoReserva): Promise<Reserva | null>
  mesaTemConflito(idMesa: string, dataHora: string, duracaoMinutos: number): Promise<boolean>
}