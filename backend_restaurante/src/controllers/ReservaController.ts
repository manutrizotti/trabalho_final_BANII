import type { Request, Response } from 'express'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { PERIODOS, STATUS_RESERVA, type Periodo, type StatusReserva } from '../models/Reserva.js'
import type { FiltroListagem, ReservaService } from '../services/ReservaService.js'

function responderErro(res: Response, erro: unknown) {
  if (erro instanceof ErroDeNegocio) {
    return res.status(erro.status).json({ erro: erro.message })
  }
  console.error(erro)
  return res.status(500).json({ erro: 'Erro interno do servidor.' })
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : undefined
}

export class ReservaController {
  constructor(private service: ReservaService) {}

  listar = async (req: Request, res: Response) => {
    try {
      const filtro: FiltroListagem = {}

      const status = texto(req.query.status)
      if (status && status !== 'todas') {
        if (!STATUS_RESERVA.includes(status as StatusReserva)) throw new ErroDeNegocio('Status inválido.')
        filtro.status = status as StatusReserva
      }

      const periodo = texto(req.query.periodo)
      if (periodo) {
        if (!PERIODOS.includes(periodo as Periodo)) throw new ErroDeNegocio('Período inválido.')
        filtro.periodo = periodo as Periodo
      }

      res.json(await this.service.listar(filtro))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  buscarPorId = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.buscarPorId(String(req.params.id)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  criar = async (req: Request, res: Response) => {
    try {
      res.status(201).json(await this.service.criar(req.body))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  atualizar = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.atualizar(String(req.params.id), req.body))
    } catch (erro) {
      responderErro(res, erro)
    }
  }
}