export const LOCALIZACOES = ['salão', 'varanda', 'mezanino'] as const
export type Localizacao = (typeof LOCALIZACOES)[number]

// 'removida' só existe no banco; nunca é listada
export type StatusMesa = 'ativa' | 'quebrada' | 'removida'

export class Mesa {
  constructor(
    public id: string,
    public numero: number,
    public localizacao: Localizacao | null,
    public capacidade: number,
    public status: StatusMesa,
    public idPedidoAberto: string | null, // derivado: se não for null, a mesa está ocupada
  ) {}
}