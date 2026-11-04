import type { Request, Response } from 'express'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import type { CozinhaService } from '../services/CozinhaService.js'

function responderErro(res: Response, erro: unknown) {
  if (erro instanceof ErroDeNegocio) {
    return res.status(erro.status).json({ erro: erro.message })
  }
  console.error(erro)
  return res.status(500).json({ erro: 'Erro interno do servidor.' })
}

export class CozinhaController {
  constructor(private service: CozinhaService) {}

  listar = async (_req: Request, res: Response) => {
    try {
      res.json(await this.service.listar())
    } catch (erro) {
      responderErro(res, erro)
    }
  }

  avancar = async (req: Request, res: Response) => {
    try {
      res.json(await this.service.avancar(String(req.params.id)))
    } catch (erro) {
      responderErro(res, erro)
    }
  }
}