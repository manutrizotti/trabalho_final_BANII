import type { Cliente } from '../models/Cliente.js'

export interface FiltroClientes {
  nome?: string // trecho do nome
}

export interface NovoCliente {
  nome: string
  telefone: string
}

export interface AtualizacaoCliente {
  nome: string
  telefone: string
}

export interface ClienteRepository {
  listar(filtro: FiltroClientes): Promise<Cliente[]>
  buscarPorId(id: string): Promise<Cliente | null>
  buscarPorTelefone(telefone: string): Promise<Cliente | null>
  inserir(dados: NovoCliente): Promise<Cliente>
  atualizar(id: string, dados: AtualizacaoCliente): Promise<Cliente | null>
  temHistorico(id: string): Promise<boolean> // pedidos ou reservas
  excluir(id: string): Promise<void>
}