import { Router } from 'express'
import type { ItemCardapioController } from '../controllers/ItemCardapioController.js'

export function criarCardapioRoutes(c: ItemCardapioController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.post('/', c.criar)
  router.get('/:id', c.buscarPorId)
  router.put('/:id', c.atualizar)
  router.delete('/:id', c.excluir)

  router.put('/:id/composicao', c.substituirComposicao)
  router.get('/:id/composicao', c.listarComposicao)
  router.post('/:id/composicao', c.adicionarNaComposicao)
  router.put('/:id/composicao/:idItem', c.atualizarQuantidade)
  router.delete('/:id/composicao/:idItem', c.removerDaComposicao)

  return router
}