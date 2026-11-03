import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { LOCALIZACOES, type Localizacao, type Mesa, type StatusMesa } from '../models/Mesa.js'
import type { FiltroMesas, MesaRepository } from '../repositories/MesaRepository.js'

// Limites (ajuste aqui se precisar)
const MAX_NUMERO = 999
const MAX_CAPACIDADE = 50

export interface DadosMesa {
  numero?: number | string
  localizacao?: string | null
  capacidade?: number | string
  status?: string
}

export class MesaService {
  constructor(private repo: MesaRepository) {}

  async listar(filtro: FiltroMesas): Promise<Mesa[]> {
    const mesas = await this.repo.listar(filtro)
    return mesas.sort((a, b) => a.numero - b.numero)
  }

  async buscarPorId(id: string): Promise<Mesa> {
    const mesa = await this.repo.buscarPorId(id)
    if (!mesa || mesa.status === 'removida') throw new ErroDeNegocio('Mesa não encontrada.', 404)
    return mesa
  }

  async criar(d: DadosMesa): Promise<Mesa> {
    const numero = this.validarNumero(d.numero)
    const localizacao = this.validarLocalizacao(d.localizacao)
    const capacidade = this.validarCapacidade(d.capacidade)

    const existente = await this.repo.buscarPorNumero(numero)
    if (existente) {
      if (existente.status !== 'removida') throw new ErroDeNegocio('Já existe uma mesa com esse número.', 409)
      // o número é UNIQUE no banco: reaproveita a mesa removida
      const reativada = await this.repo.atualizar(existente.id, { localizacao, capacidade, status: 'ativa' })
      return reativada!
    }

    return this.repo.inserir({ numero, localizacao, capacidade })
  }

  async atualizar(id: string, d: DadosMesa): Promise<Mesa> {
    const mesa = await this.buscarPorId(id)
    const localizacao = this.validarLocalizacao(d.localizacao)
    const capacidade = this.validarCapacidade(d.capacidade)
    const status = this.validarStatus(d.status ?? mesa.status)
    this.exigirSemPedidoSeQuebrar(mesa, status)

    const atualizada = await this.repo.atualizar(id, { localizacao, capacidade, status })
    if (!atualizada) throw new ErroDeNegocio('Mesa não encontrada.', 404)
    return atualizada
  }

  async alterarStatus(id: string, statusRecebido: unknown): Promise<Mesa> {
    const mesa = await this.buscarPorId(id)
    const status = this.validarStatus(statusRecebido)
    this.exigirSemPedidoSeQuebrar(mesa, status)
    await this.repo.alterarStatus(id, status)
    return this.buscarPorId(id)
  }

  /** Com histórico (pedidos/reservas) só marca como removida; sem histórico apaga. */
  async remover(id: string): Promise<{ comHistorico: boolean }> {
    const mesa = await this.buscarPorId(id)
    if (mesa.idPedidoAberto) throw new ErroDeNegocio('A mesa possui um pedido aberto e não pode ser removida.', 409)

    if (await this.repo.temHistorico(id)) {
      await this.repo.alterarStatus(id, 'removida')
      return { comHistorico: true }
    }
    await this.repo.excluir(id)
    return { comHistorico: false }
  }

  // ----- validações privadas (ordem: número, localização, capacidade) -----

  private validarNumero(valor: unknown): number {
    if (String(valor ?? '').trim() === '') throw new ErroDeNegocio('Informe o número da mesa.')
    const n = Number(valor)
    if (!Number.isInteger(n) || n < 1 || n > MAX_NUMERO) {
      throw new ErroDeNegocio(`O número da mesa deve ser um inteiro entre 1 e ${MAX_NUMERO}.`)
    }
    return n
  }

  private validarLocalizacao(valor: unknown): Localizacao {
    if (!LOCALIZACOES.includes(valor as Localizacao)) throw new ErroDeNegocio('Selecione a localização da mesa.')
    return valor as Localizacao
  }

  private validarCapacidade(valor: unknown): number {
    if (String(valor ?? '').trim() === '') throw new ErroDeNegocio('Informe a capacidade da mesa.')
    const n = Number(valor)
    if (!Number.isInteger(n) || n < 1 || n > MAX_CAPACIDADE) {
      throw new ErroDeNegocio(`A capacidade deve ser um inteiro entre 1 e ${MAX_CAPACIDADE}.`)
    }
    return n
  }

  private validarStatus(valor: unknown): StatusMesa {
    if (valor !== 'ativa' && valor !== 'quebrada') throw new ErroDeNegocio('Status inválido.')
    return valor
  }

  private exigirSemPedidoSeQuebrar(mesa: Mesa, novoStatus: StatusMesa): void {
    if (novoStatus === 'quebrada' && mesa.idPedidoAberto) {
      throw new ErroDeNegocio('Feche o pedido aberto antes de marcar a mesa como quebrada.', 409)
    }
  }
}