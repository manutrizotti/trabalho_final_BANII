export const TIPOS_PEDIDO = ['salao', 'delivery'] as const
export type TipoPedido = (typeof TIPOS_PEDIDO)[number]

export const STATUS_PEDIDO = ['aberto', 'fechado', 'cancelado'] as const
export type StatusPedido = (typeof STATUS_PEDIDO)[number]

export const STATUS_ENTREGA = ['preparando', 'saiu para entrega', 'entregue'] as const
export type StatusEntrega = (typeof STATUS_ENTREGA)[number]

export const FORMAS_PAGAMENTO = ['dinheiro', 'cartão de crédito', 'cartão de débito', 'PIX'] as const
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number]

export interface ItemPedido {
  id: string
  idCardapio: string
  nomeProduto: string
  quantidade: number
  valorUnitario: number
  observacoes: string
  statusCozinha: string
}

export interface Pagamento {
  forma: FormaPagamento
  valor: number
  dataHora: string // 'AAAA-MM-DD HH:mm:ss'
}

export class Pedido {
  constructor(
    public id: string,
    public tipo: TipoPedido,
    public status: StatusPedido,
    public pagouDezPorcento: boolean,
    public valorTotal: number,
    public idCliente: string | null,
    public nomeCliente: string | null,
    public idReserva: string | null,
    public endereco: string | null,
    public taxaEntrega: number | null,
    public statusEntrega: StatusEntrega | null,
    public dataHoraAbertura: string,
    public idMesa: string | null,
    public numeroMesa: number | null,
    public idGarcom: string | null,
    public nomeGarcom: string | null,
    // só preenchidos em buscarPorId
    public itens: ItemPedido[] = [],
    public pagamentos: Pagamento[] = [],
  ) {}
}