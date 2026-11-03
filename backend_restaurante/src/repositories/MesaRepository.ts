import type { Localizacao, Mesa, StatusMesa } from '../models/Mesa.js'

export interface FiltroMesas {
  busca?: string // trecho do número
  apenasLivres?: boolean // ativa e sem pedido aberto
  localizacao?: Localizacao // ausente = todas
}

export interface NovaMesa {
  numero: number
  localizacao: Localizacao
  capacidade: number
}

export interface AtualizacaoMesa {
  localizacao: Localizacao
  capacidade: number
  status: StatusMesa
}

export interface MesaRepository {
  listar(filtro: FiltroMesas): Promise<Mesa[]> // nunca retorna removidas
  buscarPorId(id: string): Promise<Mesa | null>
  buscarPorNumero(numero: number): Promise<Mesa | null> // inclui removidas
  inserir(dados: NovaMesa): Promise<Mesa>
  atualizar(id: string, dados: AtualizacaoMesa): Promise<Mesa | null>
  alterarStatus(id: string, status: StatusMesa): Promise<void>
  temHistorico(id: string): Promise<boolean>
  excluir(id: string): Promise<void>
}