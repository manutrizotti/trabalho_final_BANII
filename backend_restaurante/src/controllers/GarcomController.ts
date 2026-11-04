import type { Request, Response } from 'express'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { STATUS_GARCOM, type StatusGarcom } from '../models/Garcom.js'
import type { FiltroGarcons } from '../repositories/GarcomRepository.js'
import type { GarcomService } from '../services/GarcomService.js'

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

export class GarcomController {
  constructor(private service: GarcomService) {}

  listar = async (req: Request, res: Response) => {
    try {
      const filtro: FiltroGarcons = {}

      const status = texto(req.query.status)
      if (status && status !== 'todos') {
        if (!STATUS_GARCOM.includes(status as StatusGarcom)) throw new ErroDeNegocio('Status inválido.')
        filtro.status = status as StatusGarcom
      }

      const nome = texto(req.query.nome)
      if (nome) filtro.nome = nome

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