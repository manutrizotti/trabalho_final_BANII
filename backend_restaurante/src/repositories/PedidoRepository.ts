import type {
  FormaPagamento,
  ItemPedido,
  Pedido,
  StatusEntrega,
  StatusPedido,
  TipoPedido,
} from '../models/Pedido.js'

export interface FiltroPedidos {
  tipo?: TipoPedido // ausente = todos
  status?: StatusPedido // ausente = todos
  de?: string // 'AAAA-MM-DD HH:mm:ss', inclusive
  ate?: string // exclusive
}

export interface NovoPedido {
  tipo: TipoPedido
  idMesa: string | null
  idGarcom: string | null
  idCliente: string | null
  idReserva: string | null
  endereco: string | null
  taxaEntrega: number | null
}

export interface NovoItemPedido {
  idCardapio: string
  quantidade: number
  valorUnitario: number
  observacoes: string
}

export interface PedidoRepository {
  listar(filtro: FiltroPedidos): Promise<Pedido[]> // sem itens e sem pagamentos
  buscarPorId(id: string): Promise<Pedido | null> // com itens e pagamentos
  inserir(dados: NovoPedido): Promise<Pedido>

  inserirItem(idPedido: string, dados: NovoItemPedido): Promise<void>
  buscarItem(idPedido: string, idItem: string): Promise<ItemPedido | null>
  removerItem(idItem: string): Promise<void>
  atualizarTotal(idPedido: string, total: number): Promise<void>

  /** Só alteram se o pedido ainda estiver aberto. Retornam false se não alteraram. */
  fechar(idPedido: string, pagouDezPorcento: boolean, total: number): Promise<boolean>
  cancelar(idPedido: string): Promise<boolean>

  alterarStatusEntrega(idPedido: string, de: StatusEntrega, para: StatusEntrega): Promise<boolean>

  inserirPagamento(idPedido: string, forma: FormaPagamento, valor: number): Promise<void>
  reservaTemPedidoAberto(idReserva: string): Promise<boolean>
}