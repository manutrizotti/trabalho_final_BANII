import type { Request, Response } from 'express'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { STATUS_PEDIDO, TIPOS_PEDIDO, type StatusPedido, type TipoPedido } from '../models/Pedido.js'
import type { FiltroListagem, PedidoService } from '../services/PedidoService.js'

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

export class PedidoController {
  constructor(private service: PedidoService) {}

  listar = async (req: Request, res: Response) => {
    try {
      const filtro: FiltroListagem = {}

      const tipo = texto(req.query.tipo)
      if (tipo && tipo !== 'todas') {
        if (!TIPOS_PEDIDO.includes(tipo as TipoPedido)) throw new ErroDeNegocio('Tipo inválido.')
        filtro.tipo = tipo as TipoPedido
      }

      const status = texto(req.query.status)
      if (status && status !== 'todos' && status !== 'ambos') {
        if (!STATUS_PEDIDO.includes(status as StatusPedido)) throw new ErroDeNegocio('Estado inválido.')
        filtro.status = status as StatusPedido
      }

      filtro.inicio = texto(req.query.inicio)
      filtro.fim = texto(req.query.fim)

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

  adicionarItem = async (req: Request, res: Response) => {
    try {
      res.status(201).json(await this.service.adicionarItem(String(req.params.id), req.body))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  removerItem = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.removerItem(String(req.params.id), String(req.params.idItem)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  fechar = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.fechar(String(req.params.id), req.body?.aplicaDezPorcento))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  cancelar = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.cancelar(String(req.params.id)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  registrarPagamento = async (req: Request, res: Response) => {
    try {
      res.status(201).json(await this.service.registrarPagamento(String(req.params.id), req.body))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  avancarEntrega = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.avancarEntrega(String(req.params.id)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }
}