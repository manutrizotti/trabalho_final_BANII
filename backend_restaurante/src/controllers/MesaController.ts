import type { Request, Response } from 'express'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import type { FiltroMesas } from '../repositories/MesaRepository.js'
import type { MesaService } from '../services/MesaService.js'
import { LOCALIZACOES, type Localizacao } from '../models/Mesa.js'

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

export class MesaController {
  constructor(private service: MesaService) {}

  listar = async (req: Request, res: Response) => {
    try {
      const filtro: FiltroMesas = {}
      const busca = texto(req.query.busca)
      if (busca) filtro.busca = busca
      if (texto(req.query.livres) === 'true') filtro.apenasLivres = true
      const localizacao = texto(req.query.localizacao)
      if (localizacao && localizacao !== 'todas') {
        if (!LOCALIZACOES.includes(localizacao as Localizacao)) {
          throw new ErroDeNegocio('Localização inválida.')
        }
        filtro.localizacao = localizacao as Localizacao
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

  alterarStatus = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.alterarStatus(String(req.params.id), req.body.status))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  remover = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.remover(String(req.params.id)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }
}