import type { Categoria, ItemCardapio, ItemComposicao } from '../models/ItemCardapio.js'

export interface FiltroItens {
  categoria?: Categoria | 'combos'
  disponivel?: boolean
  nome?: string
}

export interface NovoItem {
  codigo: string
  categoria: Categoria | null
  nome: string
  descricao: string
  preco: number
  tempoPreparoMinutos: number
  ehCombo: boolean
}

export interface AtualizacaoItem {
  nome: string
  descricao: string
  preco: number
  tempoPreparoMinutos: number
  disponivel: boolean
}

export interface ItemCardapioRepository {
  listar(filtro: FiltroItens): Promise<ItemCardapio[]>
  buscarPorId(id: string): Promise<ItemCardapio | null>
  buscarPorCodigo(codigo: string): Promise<ItemCardapio | null>
  inserir(dados: NovoItem): Promise<ItemCardapio>
  atualizar(id: string, dados: AtualizacaoItem): Promise<ItemCardapio | null>
  temHistoricoDeVendas(id: string): Promise<boolean>
  inativar(id: string): Promise<void>
  excluir(id: string): Promise<void>

  atualizarImagem(id: string, imagem: string | null): Promise<void>
  listarComposicao(idCombo: string): Promise<ItemComposicao[]>
  adicionarNaComposicao(idCombo: string, idItem: string, quantidade: number): Promise<void>
  atualizarQuantidadeNaComposicao(idCombo: string, idItem: string, quantidade: number): Promise<void>
  removerDaComposicao(idCombo: string, idItem: string): Promise<void>
}