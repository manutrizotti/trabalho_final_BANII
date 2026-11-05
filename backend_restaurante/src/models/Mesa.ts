export const LOCALIZACOES = ['salão', 'varanda', 'mezanino'] as const
export type Localizacao = (typeof LOCALIZACOES)[number]

export type StatusMesa = 'ativa' | 'quebrada' | 'removida'

export interface ReservaDoDia {
  id: string
  idCliente: string
  hora: string
  nomeCliente: string
}

export class Mesa {
  constructor(
    public id: string,
    public numero: number,
    public localizacao: Localizacao | null,
    public capacidade: number,
    public status: StatusMesa,
    public reservaHoje: ReservaDoDia | null = null, // preenchido pelo service
  ) {}
}