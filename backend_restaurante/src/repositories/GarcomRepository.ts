import type { Garcom, StatusGarcom } from '../models/Garcom.js'

export interface FiltroGarcons {
  status?: StatusGarcom // ausente = todos
  nome?: string // trecho do nome
}

export interface NovoGarcom {
  codigo: string
  cpf: string
  nome: string
  dataAdmissao: string
  comissao: number
}

export interface AtualizacaoGarcom {
  nome: string
  comissao: number
  status: StatusGarcom
}

export interface GarcomRepository {
  listar(filtro: FiltroGarcons): Promise<Garcom[]>
  buscarPorId(id: string): Promise<Garcom | null>
  buscarPorCodigo(codigo: string): Promise<Garcom | null>
  buscarPorCpf(cpf: string): Promise<Garcom | null>
  inserir(dados: NovoGarcom): Promise<Garcom>
  atualizar(id: string, dados: AtualizacaoGarcom): Promise<Garcom | null>
  temPedidoAberto(id: string): Promise<boolean>
}