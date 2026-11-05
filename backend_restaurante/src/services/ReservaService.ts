import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { STATUS_RESERVA, type Periodo, type Reserva, type StatusReserva } from '../models/Reserva.js'
import type { ClienteRepository } from '../repositories/ClienteRepository.js'
import type { MesaRepository } from '../repositories/MesaRepository.js'
import type { FiltroReservas, ReservaRepository } from '../repositories/ReservaRepository.js'
import { DURACAO_RESERVA_MINUTOS } from '../config/reservas.js'
import { formatarDataHora as formatar, paraData } from '../utils/datas.js'

// Limites (ajuste aqui se precisar)
const MAX_PESSOAS = 100
const MAX_OBSERVACOES = 200

const TRANSICOES: Record<StatusReserva, StatusReserva[]> = {
  pendente: ['confirmada', 'cancelada'],
  confirmada: ['em andamento', 'cancelada'],
  'em andamento': ['finalizada', 'cancelada'],
  finalizada: [],
  cancelada: [],
}

export interface DadosReserva {
  idCliente?: string | number
  dataHora?: string
  numeroPessoas?: number | string
  idMesas?: unknown
  observacoes?: string
  status?: string
}

export interface FiltroListagem {
  status?: StatusReserva
  periodo?: Periodo
}

function intervaloDoPeriodo(periodo?: Periodo): { de?: string; ate?: string } {
  if (!periodo || periodo === 'todas') return {}
  const agora = new Date()
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  const somar = (dias: number) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + dias)
    return d
  }

  let de: Date
  let ate: Date
  switch (periodo) {
    case 'hoje': de = hoje; ate = somar(1); break
    case 'amanha': de = somar(1); ate = somar(2); break
    case 'proximos7': de = hoje; ate = somar(7); break
    case 'proximos30': de = hoje; ate = somar(30); break
    case '7dias': de = somar(-6); ate = somar(1); break
    default: de = somar(-29); ate = somar(1) // 'mes'
  }
  return { de: formatar(de), ate: formatar(ate) }
}

export class ReservaService {
  constructor(
    private repo: ReservaRepository,
    private mesaRepo: MesaRepository,
    private clienteRepo: ClienteRepository,
  ) {}

  async listar(filtro: FiltroListagem): Promise<Reserva[]> {
    const filtroRepo: FiltroReservas = { ...intervaloDoPeriodo(filtro.periodo) }
    if (filtro.status) filtroRepo.status = filtro.status

    const reservas = await this.repo.listar(filtroRepo)

    // vigentes e futuras primeiro (mais próximas antes); depois as passadas (mais recentes antes)
    const limite = Date.now() - DURACAO_RESERVA_MINUTOS * 60000
    const hora = (r: Reserva) => paraData(r.dataHora).getTime()
    const vigentes = reservas.filter((r) => hora(r) >= limite).sort((a, b) => hora(a) - hora(b))
    const passadas = reservas.filter((r) => hora(r) < limite).sort((a, b) => hora(b) - hora(a))
    return [...vigentes, ...passadas]
  }

  async buscarPorId(id: string): Promise<Reserva> {
    const reserva = await this.repo.buscarPorId(id)
    if (!reserva) throw new ErroDeNegocio('Reserva não encontrada.', 404)
    return reserva
  }

  async criar(d: DadosReserva): Promise<Reserva> {
    // formato dos campos (ordem: cliente, data/hora, pessoas, mesas, observações)
    const idCliente = this.validarCliente(d.idCliente)
    const dataHora = this.validarDataHora(d.dataHora)
    const numeroPessoas = this.validarPessoas(d.numeroPessoas)
    const idMesas = this.validarMesas(d.idMesas)
    const observacoes = this.validarObservacoes(d.observacoes)

    if (!(await this.clienteRepo.buscarPorId(idCliente))) {
      throw new ErroDeNegocio('Cliente não encontrado.', 404)
    }

    let capacidade = 0
    for (const idMesa of idMesas) {
      const mesa = await this.mesaRepo.buscarPorId(idMesa)
      if (!mesa || mesa.status === 'removida') throw new ErroDeNegocio('Mesa não encontrada.', 404)
      if (mesa.status !== 'ativa') throw new ErroDeNegocio(`A mesa ${mesa.numero} não está ativa.`, 409)
      capacidade += mesa.capacidade
    }
    if (capacidade < numeroPessoas) {
      throw new ErroDeNegocio(
        `Capacidade insuficiente: as mesas comportam ${capacidade} pessoas, mas a reserva é para ${numeroPessoas}.`,
        409,
      )
    }

    for (const idMesa of idMesas) {
      if (await this.repo.mesaTemConflito(idMesa, dataHora, DURACAO_RESERVA_MINUTOS)) {
        const mesa = (await this.mesaRepo.buscarPorId(idMesa))!
        throw new ErroDeNegocio(`A mesa ${mesa.numero} não está livre neste horário.`, 409)
      }
    }

    return this.repo.inserir({ idCliente, dataHora, numeroPessoas, observacoes, idMesas })
  }

  // só status e observações mudam; o resto é campo-chave
  async atualizar(id: string, d: DadosReserva): Promise<Reserva> {
    const atual = await this.buscarPorId(id)
    if (TRANSICOES[atual.status].length === 0) {
      throw new ErroDeNegocio('Reserva finalizada ou cancelada não pode ser alterada.', 409)
    }

    const status = this.validarStatus(d.status ?? atual.status)
    if (status !== atual.status && !TRANSICOES[atual.status].includes(status)) {
      throw new ErroDeNegocio(`Transição inválida: de "${atual.status}" para "${status}".`, 409)
    }
    const observacoes = this.validarObservacoes(d.observacoes)

    const atualizada = await this.repo.atualizar(id, { status, observacoes })
    if (!atualizada) throw new ErroDeNegocio('Reserva não encontrada.', 404)
    return atualizada
  }

  // ----- validações privadas -----

  private validarCliente(valor: unknown): string {
    const id = String(valor ?? '').trim()
    if (!id) throw new ErroDeNegocio('Selecione o cliente.')
    return id
  }

  private validarDataHora(valor: unknown): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(valor ?? '').trim())
    if (!m) throw new ErroDeNegocio('Informe a data e a hora da reserva.')
    const [, a, mes, dia, h, min] = m.map(Number) as number[]
    const data = new Date(a, mes - 1, dia, h, min)
    if (data.getMonth() !== mes - 1 || data.getDate() !== dia || h > 23 || min > 59) {
      throw new ErroDeNegocio('Data ou hora inválida.')
    }
    if (data.getTime() < Date.now()) {
      throw new ErroDeNegocio('Não é possível reservar para uma data e hora no passado.')
    }
    return formatar(data)
  }

  private validarPessoas(valor: unknown): number {
    if (String(valor ?? '').trim() === '') throw new ErroDeNegocio('Informe o número de pessoas.')
    const n = Number(valor)
    if (!Number.isInteger(n) || n < 1 || n > MAX_PESSOAS) {
      throw new ErroDeNegocio(`O número de pessoas deve ser um inteiro entre 1 e ${MAX_PESSOAS}.`)
    }
    return n
  }

  private validarMesas(valor: unknown): string[] {
    if (!Array.isArray(valor) || valor.length === 0) throw new ErroDeNegocio('Selecione ao menos uma mesa.')
    return [...new Set(valor.map(String))]
  }

  private validarObservacoes(valor: unknown): string {
    const obs = String(valor ?? '').trim()
    if (obs.length > MAX_OBSERVACOES) {
      throw new ErroDeNegocio(`As observações devem ter no máximo ${MAX_OBSERVACOES} caracteres.`)
    }
    return obs
  }

  private validarStatus(valor: unknown): StatusReserva {
    if (!STATUS_RESERVA.includes(valor as StatusReserva)) throw new ErroDeNegocio('Status inválido.')
    return valor as StatusReserva
  }
}