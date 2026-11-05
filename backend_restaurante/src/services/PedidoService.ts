import { DURACAO_RESERVA_MINUTOS } from '../config/reservas.js'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import {
  FORMAS_PAGAMENTO,
  TIPOS_PEDIDO,
  type FormaPagamento,
  type Pedido,
  type StatusEntrega,
  type StatusPedido,
  type TipoPedido,
} from '../models/Pedido.js'
import type { ClienteRepository } from '../repositories/ClienteRepository.js'
import type { GarcomRepository } from '../repositories/GarcomRepository.js'
import type { ItemCardapioRepository } from '../repositories/ItemCardapioRepository.js'
import type { MesaRepository } from '../repositories/MesaRepository.js'
import type { PedidoRepository } from '../repositories/PedidoRepository.js'
import type { ReservaRepository } from '../repositories/ReservaRepository.js'
import { formatarDataHora, paraData } from '../utils/datas.js'

// Limites (ajuste aqui se precisar)
const MAX_QTD_ITEM = 99
const MAX_TAXA = 999.99
const MAX_ENDERECO = 200
const MAX_OBSERVACOES = 200

const JANELA_MS = DURACAO_RESERVA_MINUTOS * 60000

const PROXIMA_ENTREGA: Record<StatusEntrega, StatusEntrega | null> = {
  preparando: 'saiu para entrega',
  'saiu para entrega': 'entregue',
  entregue: null,
}

export interface DadosPedido {
  tipo?: string
  idMesa?: string | number | null
  idGarcom?: string | number | null
  idCliente?: string | number | null
  idReserva?: string | number | null
  endereco?: string
  taxaEntrega?: number | string
}

export interface DadosItemPedido {
  idCardapio?: string | number
  quantidade?: number | string
  observacoes?: string
}

export interface DadosPagamento {
  forma?: string
  valor?: number | string
}

export interface FiltroListagem {
  tipo?: TipoPedido
  status?: StatusPedido
  inicio?: string // 'AAAA-MM-DD'
  fim?: string // 'AAAA-MM-DD', inclusive
}

export type PedidoDetalhado = Pedido & { totalPago: number; restante: number; quitado: boolean }

const centavos = (n: number) => Math.round(n * 100)
const reais = (c: number) => c / 100
const dinheiro = (n: number) => n.toFixed(2).replace('.', ',')
const texto = (v: unknown) => String(v ?? '').trim()

export class PedidoService {
  constructor(
    private repo: PedidoRepository,
    private mesaRepo: MesaRepository,
    private garcomRepo: GarcomRepository,
    private clienteRepo: ClienteRepository,
    private reservaRepo: ReservaRepository,
    private cardapioRepo: ItemCardapioRepository,
  ) {}

  // ----- consultas -----

  async listar(filtro: FiltroListagem): Promise<Pedido[]> {
    const inicio = this.validarData(filtro.inicio, 'inicial')
    const fim = this.validarData(filtro.fim, 'final')
    if (inicio && fim && inicio > fim) {
      throw new ErroDeNegocio('A data inicial não pode ser depois da data final.')
    }

    const de = inicio ? `${inicio} 00:00:00` : undefined
    let ate: string | undefined
    if (fim) {
      const [a, m, d] = fim.split('-').map(Number) as [number, number, number]
      ate = formatarDataHora(new Date(a, m - 1, d + 1))
    }

    const pedidos = await this.repo.listar({ tipo: filtro.tipo, status: filtro.status, de, ate })
    return pedidos.sort((a, b) => Number(b.id) - Number(a.id)) // mais recentes primeiro
  }

  async buscarPorId(id: string): Promise<PedidoDetalhado> {
    const pedido = await this.repo.buscarPorId(id)
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 404)

    const pago = pedido.pagamentos.reduce((s, p) => s + centavos(p.valor), 0)
    const restante = pedido.status === 'fechado' ? centavos(pedido.valorTotal) - pago : 0
    return {
      ...pedido,
      totalPago: reais(pago),
      restante: reais(Math.max(restante, 0)),
      quitado: pedido.status === 'fechado' && restante <= 0,
    }
  }

  // ----- abertura -----

  async criar(d: DadosPedido): Promise<PedidoDetalhado> {
    const tipo = this.validarTipo(d.tipo)
    const id = tipo === 'salao' ? await this.abrirSalao(d) : await this.abrirDelivery(d)
    return this.buscarPorId(id)
  }

  private async abrirSalao(d: DadosPedido): Promise<string> {
    // formato (ordem: mesa, garçom)
    const idMesa = texto(d.idMesa)
    if (!idMesa) throw new ErroDeNegocio('Selecione a mesa.')
    const idGarcom = texto(d.idGarcom)
    if (!idGarcom) throw new ErroDeNegocio('Selecione o garçom.')
    let idCliente: string | null = texto(d.idCliente) || null // opcional no salão
    const idReserva = texto(d.idReserva) || null

    // mesa
    const mesa = await this.mesaRepo.buscarPorId(idMesa)
    if (!mesa || mesa.status === 'removida') throw new ErroDeNegocio('Mesa não encontrada.', 404)
    if (mesa.status !== 'ativa') throw new ErroDeNegocio(`A mesa ${mesa.numero} não está ativa.`, 409)
    if (mesa.idPedidoAberto) throw new ErroDeNegocio(`A mesa ${mesa.numero} já possui um pedido aberto.`, 409)

    // garçom
    const garcom = await this.garcomRepo.buscarPorId(idGarcom)
    if (!garcom) throw new ErroDeNegocio('Garçom não encontrado.', 404)
    if (garcom.status !== 'ativo') throw new ErroDeNegocio('O garçom selecionado não está ativo.', 409)

    // reserva vinculada ou trava da mesa
    let reservaStatus: string | null = null
    if (idReserva) {
      const reserva = await this.reservaRepo.buscarPorId(idReserva)
      if (!reserva) throw new ErroDeNegocio('Reserva não encontrada.', 404)
      if (!reserva.mesas.some((m) => m.id === idMesa)) {
        throw new ErroDeNegocio(`A mesa ${mesa.numero} não pertence a essa reserva.`, 409)
      }
      if (reserva.status !== 'confirmada' && reserva.status !== 'em andamento') {
        throw new ErroDeNegocio('A reserva não está confirmada nem em andamento.', 409)
      }
      if (Math.abs(paraData(reserva.dataHora).getTime() - Date.now()) >= JANELA_MS) {
        throw new ErroDeNegocio(
          `A reserva das ${reserva.dataHora.slice(11, 16)} só pode ser vinculada perto do horário.`,
          409,
        )
      }
      idCliente = reserva.idCliente // o cliente é o da reserva
      reservaStatus = reserva.status
    } else {
      await this.exigirMesaSemReservaProxima(idMesa)
    }

    if (idCliente && !(await this.clienteRepo.buscarPorId(idCliente))) {
      throw new ErroDeNegocio('Cliente não encontrado.', 404)
    }

    const pedido = await this.repo.inserir({
      tipo: 'salao',
      idMesa,
      idGarcom,
      idCliente,
      idReserva,
      endereco: null,
      taxaEntrega: null,
    })

    if (idReserva && reservaStatus === 'confirmada') {
      const reserva = (await this.reservaRepo.buscarPorId(idReserva))!
      await this.reservaRepo.atualizar(idReserva, { status: 'em andamento', observacoes: reserva.observacoes })
    }
    return pedido.id
  }

  private async abrirDelivery(d: DadosPedido): Promise<string> {
    // formato (ordem: cliente, endereço, taxa)
    const idCliente = texto(d.idCliente)
    if (!idCliente) throw new ErroDeNegocio('Selecione o cliente.')
    const endereco = this.validarEndereco(d.endereco)
    const taxaEntrega = this.validarTaxa(d.taxaEntrega)

    if (!(await this.clienteRepo.buscarPorId(idCliente))) {
      throw new ErroDeNegocio('Cliente não encontrado.', 404)
    }

    const pedido = await this.repo.inserir({
      tipo: 'delivery',
      idMesa: null,
      idGarcom: null,
      idCliente,
      idReserva: null,
      endereco,
      taxaEntrega,
    })
    await this.repo.atualizarTotal(pedido.id, taxaEntrega) // total já nasce com a taxa
    return pedido.id
  }

  /** Bloqueia a abertura se a mesa tem reserva pendente/confirmada dentro da janela de 2h30. */
  private async exigirMesaSemReservaProxima(idMesa: string): Promise<void> {
    const agora = Date.now()
    const reservas = await this.reservaRepo.listar({
      de: formatarDataHora(new Date(agora - JANELA_MS)),
      ate: formatarDataHora(new Date(agora + JANELA_MS)),
    })
    const conflito = reservas
      .filter((r) => r.status === 'pendente' || r.status === 'confirmada')
      .filter((r) => r.mesas.some((m) => m.id === idMesa))
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora))[0]

    if (conflito) {
      throw new ErroDeNegocio(
        `Mesa reservada para as ${conflito.dataHora.slice(11, 16)}. Cancele a reserva ou use outra mesa.`,
        409,
      )
    }
  }

  // ----- itens -----

  async adicionarItem(idPedido: string, d: DadosItemPedido): Promise<PedidoDetalhado> {
    // formato (ordem: item, quantidade, observações)
    const idCardapio = texto(d.idCardapio)
    if (!idCardapio) throw new ErroDeNegocio('Selecione o item do cardápio.')
    const quantidade = this.validarQuantidade(d.quantidade)
    const observacoes = this.validarObservacoes(d.observacoes)

    await this.exigirAberto(idPedido)

    const item = await this.cardapioRepo.buscarPorId(idCardapio)
    if (!item) throw new ErroDeNegocio('Item do cardápio não encontrado.', 404)
    if (!item.disponivel) throw new ErroDeNegocio('Este item está indisponível no momento.', 409)

    await this.repo.inserirItem(idPedido, {
      idCardapio,
      quantidade,
      valorUnitario: item.preco, // o preço é copiado agora
      observacoes,
    })
    await this.recalcularTotal(idPedido)
    return this.buscarPorId(idPedido)
  }

  async removerItem(idPedido: string, idItem: string): Promise<PedidoDetalhado> {
    await this.exigirAberto(idPedido)

    const item = await this.repo.buscarItem(idPedido, idItem)
    if (!item) throw new ErroDeNegocio('Item do pedido não encontrado.', 404)
    if (item.statusCozinha !== 'aguardando preparo') {
      throw new ErroDeNegocio('A cozinha já começou esse item e ele não pode mais ser removido.', 409)
    }

    await this.repo.removerItem(idItem)
    await this.recalcularTotal(idPedido)
    return this.buscarPorId(idPedido)
  }

  // ----- fechar, cancelar, entrega -----

  async fechar(idPedido: string, aplicaDezPorcento: unknown): Promise<PedidoDetalhado> {
    const pedido = await this.exigirAberto(idPedido)
    if (pedido.itens.length === 0) throw new ErroDeNegocio('O pedido não possui itens.')

    const dez = pedido.tipo === 'salao' && aplicaDezPorcento === true // delivery nunca paga os 10%
    let total = this.somarCentavos(pedido)
    if (dez) total = Math.round((total * 110) / 100)

    if (!(await this.repo.fechar(idPedido, dez, reais(total)))) {
      throw new ErroDeNegocio('O pedido não está mais aberto. Atualize a tela.', 409)
    }
    await this.finalizarReservaSeUltimo(pedido)
    return this.buscarPorId(idPedido)
  }

  async cancelar(idPedido: string): Promise<PedidoDetalhado> {
    const pedido = await this.exigirAberto(idPedido)
    if (!(await this.repo.cancelar(idPedido))) {
      throw new ErroDeNegocio('O pedido não está mais aberto. Atualize a tela.', 409)
    }
    await this.finalizarReservaSeUltimo(pedido)
    return this.buscarPorId(idPedido)
  }

  async avancarEntrega(idPedido: string): Promise<PedidoDetalhado> {
    const pedido = await this.repo.buscarPorId(idPedido)
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 404)
    if (pedido.tipo !== 'delivery' || !pedido.statusEntrega) {
      throw new ErroDeNegocio('Esse pedido não é de delivery.', 409)
    }
    if (pedido.status === 'cancelado') throw new ErroDeNegocio('O pedido foi cancelado.', 409)

    const proximo = PROXIMA_ENTREGA[pedido.statusEntrega]
    if (!proximo) throw new ErroDeNegocio('Esse pedido já foi entregue.', 409)

    if (!(await this.repo.alterarStatusEntrega(idPedido, pedido.statusEntrega, proximo))) {
      throw new ErroDeNegocio('O estado da entrega mudou. Atualize a tela.', 409)
    }
    return this.buscarPorId(idPedido)
  }

  // ----- pagamento -----

  async registrarPagamento(idPedido: string, d: DadosPagamento): Promise<PedidoDetalhado> {
    // formato (ordem: forma, valor)
    const forma = this.validarForma(d.forma)
    const valorC = this.validarValor(d.valor)

    const pedido = await this.repo.buscarPorId(idPedido)
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 404)
    if (pedido.status !== 'fechado') {
      throw new ErroDeNegocio('A conta só recebe pagamentos depois que o pedido é fechado.', 409)
    }

    const pago = pedido.pagamentos.reduce((s, p) => s + centavos(p.valor), 0)
    const restante = centavos(pedido.valorTotal) - pago
    if (restante <= 0) throw new ErroDeNegocio('Esse pedido já está quitado.', 409)
    if (valorC > restante) {
      throw new ErroDeNegocio(`O valor excede o restante da conta (R$ ${dinheiro(reais(restante))}).`, 409)
    }

    await this.repo.inserirPagamento(idPedido, forma, reais(valorC))
    return this.buscarPorId(idPedido)
  }

  // ----- auxiliares privados -----

  private async exigirAberto(id: string): Promise<Pedido> {
    const pedido = await this.repo.buscarPorId(id)
    if (!pedido) throw new ErroDeNegocio('Pedido não encontrado.', 404)
    if (pedido.status !== 'aberto') throw new ErroDeNegocio('Este pedido não está aberto.', 409)
    return pedido
  }

  private somarCentavos(p: Pedido): number {
    const itens = p.itens.reduce((s, i) => s + centavos(i.valorUnitario) * i.quantidade, 0)
    return itens + centavos(p.taxaEntrega ?? 0)
  }

  private async recalcularTotal(idPedido: string): Promise<void> {
    const atual = (await this.repo.buscarPorId(idPedido))!
    await this.repo.atualizarTotal(idPedido, reais(this.somarCentavos(atual)))
  }

  /** Quando o último pedido aberto de uma reserva em andamento encerra, a reserva é finalizada. */
  private async finalizarReservaSeUltimo(pedido: Pedido): Promise<void> {
    if (!pedido.idReserva) return
    if (await this.repo.reservaTemPedidoAberto(pedido.idReserva)) return
    const reserva = await this.reservaRepo.buscarPorId(pedido.idReserva)
    if (reserva && reserva.status === 'em andamento') {
      await this.reservaRepo.atualizar(reserva.id, { status: 'finalizada', observacoes: reserva.observacoes })
    }
  }

  // ----- validações privadas -----

  private validarTipo(valor: unknown): TipoPedido {
    if (!TIPOS_PEDIDO.includes(valor as TipoPedido)) throw new ErroDeNegocio('Selecione o tipo do pedido.')
    return valor as TipoPedido
  }

  private validarEndereco(valor: unknown): string {
    const e = texto(valor)
    if (!e) throw new ErroDeNegocio('Informe o endereço de entrega.')
    if (e.length > MAX_ENDERECO) {
      throw new ErroDeNegocio(`O endereço deve ter no máximo ${MAX_ENDERECO} caracteres.`)
    }
    return e
  }

  private validarTaxa(valor: unknown): number {
    if (texto(valor) === '') throw new ErroDeNegocio('Informe a taxa de entrega.')
    const n = Number(texto(valor).replace(',', '.'))
    if (!Number.isFinite(n) || n < 0 || n > MAX_TAXA) {
      throw new ErroDeNegocio(`A taxa de entrega deve estar entre 0 e ${dinheiro(MAX_TAXA)}.`)
    }
    return reais(centavos(n))
  }

  private validarQuantidade(valor: unknown): number {
    if (texto(valor) === '') throw new ErroDeNegocio('Informe a quantidade.')
    const n = Number(valor)
    if (!Number.isInteger(n) || n < 1 || n > MAX_QTD_ITEM) {
      throw new ErroDeNegocio(`A quantidade deve ser um inteiro entre 1 e ${MAX_QTD_ITEM}.`)
    }
    return n
  }

  private validarObservacoes(valor: unknown): string {
    const o = texto(valor)
    if (o.length > MAX_OBSERVACOES) {
      throw new ErroDeNegocio(`A observação deve ter no máximo ${MAX_OBSERVACOES} caracteres.`)
    }
    return o
  }

  private validarForma(valor: unknown): FormaPagamento {
    if (!FORMAS_PAGAMENTO.includes(valor as FormaPagamento)) {
      throw new ErroDeNegocio('Selecione a forma de pagamento.')
    }
    return valor as FormaPagamento
  }

  /** Retorna o valor em centavos. */
  private validarValor(valor: unknown): number {
    if (texto(valor) === '') throw new ErroDeNegocio('Informe o valor do pagamento.')
    const n = Number(texto(valor).replace(',', '.'))
    const c = centavos(n)
    if (!Number.isFinite(n) || c <= 0) throw new ErroDeNegocio('Informe um valor de pagamento válido.')
    return c
  }

  private validarData(valor: string | undefined, rotulo: string): string | undefined {
    if (!valor) return undefined
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
    if (!m) throw new ErroDeNegocio(`Data ${rotulo} inválida.`)
    const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
    const d = new Date(a, mes - 1, dia)
    if (d.getMonth() !== mes - 1 || d.getDate() !== dia) throw new ErroDeNegocio(`Data ${rotulo} inválida.`)
    return valor
  }
}