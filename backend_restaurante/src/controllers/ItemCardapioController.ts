import type { Request, Response } from 'express'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { CATEGORIAS, type Categoria } from '../models/ItemCardapio.js'
import type { FiltroItens } from '../repositories/ItemCardapioRepository.js'
import type { ItemCardapioService } from '../services/ItemCardapioService.js'

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

export class ItemCardapioController {
  constructor(private service: ItemCardapioService) {}

  listar = async (req: Request, res: Response) => {
    try {
      const filtro: FiltroItens = {}

      const categoria = texto(req.query.categoria)
      if (categoria && categoria !== 'todas') {
        if (categoria !== 'combos' && !CATEGORIAS.includes(categoria as Categoria)) {
          throw new ErroDeNegocio('Categoria inválida.')
        }
        filtro.categoria = categoria as FiltroItens['categoria']
      }

      const disponivel = texto(req.query.disponivel)
      if (disponivel === 'true') filtro.disponivel = true
      else if (disponivel === 'false') filtro.disponivel = false
      else if (disponivel && disponivel !== 'todos') throw new ErroDeNegocio('Estado inválido.')

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
      res.json(await this.service.excluir(String(req.params.id)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  listarComposicao = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.listarComposicao(String(req.params.id)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  adicionarNaComposicao = async (req: Request, res: Response) => {
    try {
      const { idItem, quantidade } = req.body
      await this.service.adicionarNaComposicao(String(req.params.id), String(idItem), Number(quantidade))
      res.status(201).json({ ok: true })
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  atualizarQuantidade = async (req: Request, res: Response) => {
    try {
      await this.service.atualizarQuantidade(
        String(req.params.id),
        String(req.params.idItem),
        Number(req.body.quantidade),
      )
      res.json({ ok: true })
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  removerDaComposicao = async (req: Request, res: Response) => {
    try {
      await this.service.removerDaComposicao(String(req.params.id), String(req.params.idItem))
      res.json({ ok: true })
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  substituirComposicao = async (req: Request, res: Response) => {
    try {
      const itens = Array.isArray(req.body.itens) ? req.body.itens : []
      await this.service.substituirComposicao(
        String(req.params.id),
        itens.map((i: any) => ({ idItem: String(i.idItem), quantidade: Number(i.quantidade) })),
      )
      res.json({ ok: true })
    } catch (erro) {
      responderErro(res, erro)
    }
  }  
}