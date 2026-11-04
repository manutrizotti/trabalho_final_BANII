import type { Request, Response } from 'express'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import type { FiltroClientes } from '../repositories/ClienteRepository.js'
import type { ClienteService } from '../services/ClienteService.js'

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

export class ClienteController {
  constructor(private service: ClienteService) {}

  listar = async (req: Request, res: Response) => {
    try {
      const filtro: FiltroClientes = {}
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

  excluir = async (req: Request, res: Response) => {
    try {
      await this.service.excluir(String(req.params.id))
      res.json({ ok: true })
    } catch (erro) {
      responderErro(res, erro)
    }
  }
}