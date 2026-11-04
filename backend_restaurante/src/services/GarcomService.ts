import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { STATUS_GARCOM, type Garcom, type StatusGarcom } from '../models/Garcom.js'
import type { FiltroGarcons, GarcomRepository } from '../repositories/GarcomRepository.js'

// Limites (ajuste aqui se precisar)
const MAX_NOME = 60
const MAX_CODIGO = 10
const MAX_COMISSAO = 100

export interface DadosGarcom {
  nome?: string
  codigo?: string
  cpf?: string
  comissao?: number | string
  status?: string
}

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

function hoje(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export class GarcomService {
  constructor(private repo: GarcomRepository) {}

  async listar(filtro: FiltroGarcons): Promise<Garcom[]> {
    const garcons = await this.repo.listar(filtro)
    return garcons.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  async buscarPorId(id: string): Promise<Garcom> {
    const garcom = await this.repo.buscarPorId(id)
    if (!garcom) throw new ErroDeNegocio('Garçom não encontrado.', 404)
    return garcom
  }

  async criar(d: DadosGarcom): Promise<Garcom> {
    const nome = this.validarNome(d.nome)
    const codigo = this.validarCodigo(d.codigo)
    const cpf = this.validarCpf(d.cpf)
    const comissao = this.validarComissao(d.comissao)

    if (await this.repo.buscarPorCodigo(codigo)) {
      throw new ErroDeNegocio('Já existe um garçom com esse código.', 409)
    }
    if (await this.repo.buscarPorCpf(cpf)) {
      throw new ErroDeNegocio('Já existe um garçom com esse CPF.', 409)
    }
    return this.repo.inserir({ codigo, cpf, nome, comissao, dataAdmissao: hoje() })
  }

  // código e CPF são os campos-chave: não mudam aqui
  async atualizar(id: string, d: DadosGarcom): Promise<Garcom> {
    const atual = await this.buscarPorId(id)
    const nome = this.validarNome(d.nome)
    const comissao = this.validarComissao(d.comissao)
    const status = this.validarStatus(d.status ?? atual.status)

    if (status !== 'ativo' && atual.status === 'ativo' && (await this.repo.temPedidoAberto(id))) {
      throw new ErroDeNegocio(
        'O garçom possui pedido aberto. Feche ou cancele o pedido antes de afastá-lo.',
        409,
      )
    }

    const atualizado = await this.repo.atualizar(id, { nome, comissao, status })
    if (!atualizado) throw new ErroDeNegocio('Garçom não encontrado.', 404)
    return atualizado
  }

  // ----- validações privadas (ordem: nome, código, cpf, comissão) -----

  private validarNome(valor: unknown): string {
    const nome = String(valor ?? '').trim()
    if (!nome) throw new ErroDeNegocio('Informe o nome do garçom.')
    if (nome.length > MAX_NOME) throw new ErroDeNegocio(`O nome deve ter no máximo ${MAX_NOME} caracteres.`)
    return nome
  }

  private validarCodigo(valor: unknown): string {
    const codigo = String(valor ?? '').trim()
    if (!codigo) throw new ErroDeNegocio('Informe o código do garçom.')
    if (codigo.length > MAX_CODIGO) {
      throw new ErroDeNegocio(`O código deve ter no máximo ${MAX_CODIGO} caracteres.`)
    }
    return codigo
  }

  private validarCpf(valor: unknown): string {
    const cpf = soDigitos(valor)
    if (!cpf) throw new ErroDeNegocio('Informe o CPF do garçom.')
    if (cpf.length !== 11) throw new ErroDeNegocio('O CPF deve ter 11 dígitos.')
    return cpf
  }

  private validarComissao(valor: unknown): number {
    if (String(valor ?? '').trim() === '') throw new ErroDeNegocio('Informe o percentual de comissão.')
    const n = Number(String(valor).replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || n > MAX_COMISSAO) {
      throw new ErroDeNegocio(`A comissão deve estar entre 0 e ${MAX_COMISSAO}%.`)
    }
    return n
  }

  private validarStatus(valor: unknown): StatusGarcom {
    if (!STATUS_GARCOM.includes(valor as StatusGarcom)) throw new ErroDeNegocio('Status inválido.')
    return valor as StatusGarcom
  }
}