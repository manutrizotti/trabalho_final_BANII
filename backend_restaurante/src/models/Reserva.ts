export const STATUS_RESERVA = ['pendente', 'confirmada', 'em andamento', 'finalizada', 'cancelada'] as const
export type StatusReserva = (typeof STATUS_RESERVA)[number]

export const PERIODOS = ['hoje', 'amanha', 'proximos7', 'proximos30', '7dias', 'mes', 'todas'] as const
export type Periodo = (typeof PERIODOS)[number]

export interface MesaDaReserva {
  id: string
  numero: number
}

export class Reserva {
  constructor(
    public id: string,
    public idCliente: string,
    public nomeCliente: string,
    public dataHora: string, // 'AAAA-MM-DD HH:mm:ss'
    public numeroPessoas: number,
    public status: StatusReserva,
    public observacoes: string,
    public mesas: MesaDaReserva[],
  ) {}
}