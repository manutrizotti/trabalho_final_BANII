import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import type { Cliente } from '../models/Cliente.js'
import type { ClienteRepository, FiltroClientes } from '../repositories/ClienteRepository.js'

// Limites (ajuste aqui se precisar)
const MAX_NOME = 60

export interface DadosCliente {
  nome?: string
  telefone?: string
}

const soDigitos = (v: unknown) => String(v ?? '').replace(/\D/g, '')

export class ClienteService {
  constructor(private repo: ClienteRepository) {}

  async listar(filtro: FiltroClientes): Promise<Cliente[]> {
    const clientes = await this.repo.listar(filtro)
    return clientes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  async buscarPorId(id: string): Promise<Cliente> {
    const cliente = await this.repo.buscarPorId(id)
    if (!cliente) throw new ErroDeNegocio('Cliente não encontrado.', 404)
    return cliente
  }

  async criar(d: DadosCliente): Promise<Cliente> {
    const nome = this.validarNome(d.nome)
    const telefone = this.validarTelefone(d.telefone)

    if (await this.repo.buscarPorTelefone(telefone)) {
      throw new ErroDeNegocio('Já existe um cliente com esse telefone.', 409)
    }
    return this.repo.inserir({ nome, telefone })
  }

  async atualizar(id: string, d: DadosCliente): Promise<Cliente> {
    await this.buscarPorId(id)
    const nome = this.validarNome(d.nome)
    const telefone = this.validarTelefone(d.telefone)

    const outro = await this.repo.buscarPorTelefone(telefone)
    if (outro && outro.id !== id) {
      throw new ErroDeNegocio('Já existe um cliente com esse telefone.', 409)
    }

    const atualizado = await this.repo.atualizar(id, { nome, telefone })
    if (!atualizado) throw new ErroDeNegocio('Cliente não encontrado.', 404)
    return atualizado
  }

  async excluir(id: string): Promise<void> {
    await this.buscarPorId(id)
    if (await this.repo.temHistorico(id)) {
      throw new ErroDeNegocio(
        'Não é possível excluir: o cliente possui histórico de pedidos ou reservas.',
        409,
      )
    }
    await this.repo.excluir(id)
  }

  // ----- validações privadas (ordem: nome, telefone) -----

  private validarNome(valor: unknown): string {
    const nome = String(valor ?? '').trim()
    if (!nome) throw new ErroDeNegocio('Informe o nome do cliente.')
    if (nome.length > MAX_NOME) throw new ErroDeNegocio(`O nome deve ter no máximo ${MAX_NOME} caracteres.`)
    return nome
  }

  private validarTelefone(valor: unknown): string {
    const tel = soDigitos(valor)
    if (!tel) throw new ErroDeNegocio('Informe o telefone do cliente.')
    if ((tel.length !== 10 && tel.length !== 11) || Number(tel.slice(0, 2)) < 11) {
      throw new ErroDeNegocio('Informe um telefone válido com DDD.')
    }
    return tel
  }
}