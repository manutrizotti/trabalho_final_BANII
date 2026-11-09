import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import type { ItemCardapioController } from '../controllers/ItemCardapioController.js'

// o arquivo fica em memória; o service valida e o ArmazenamentoImagens grava
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }).single('imagem')

function receberImagem(req: Request, res: Response, next: NextFunction) {
  upload(req, res, (erro: unknown) => {
    if (erro) {
      const grande = erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE'
      return res.status(400).json({ erro: grande ? 'A imagem deve ter no máximo 2 MB.' : 'Não foi possível receber a imagem.' })
    }
    next()
  })
}

export function criarCardapioRoutes(c: ItemCardapioController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.post('/', c.criar)
  router.get('/:id', c.buscarPorId)
  router.put('/:id', c.atualizar)
  router.delete('/:id', c.excluir)

  router.post('/:id/imagem', receberImagem, c.definirImagem)
  router.delete('/:id/imagem', c.removerImagem)

  router.put('/:id/composicao', c.substituirComposicao)
  router.get('/:id/composicao', c.listarComposicao)
  router.post('/:id/composicao', c.adicionarNaComposicao)
  router.put('/:id/composicao/:idItem', c.atualizarQuantidade)
  router.delete('/:id/composicao/:idItem', c.removerDaComposicao)

  return router
}