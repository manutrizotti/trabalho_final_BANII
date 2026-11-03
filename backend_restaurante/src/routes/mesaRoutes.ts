import { Router } from 'express'
import type { MesaController } from '../controllers/MesaController.js'

export function criarMesaRoutes(c: MesaController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.post('/', c.criar)
  router.get('/:id', c.buscarPorId)
  router.put('/:id', c.atualizar)
  router.patch('/:id/status', c.alterarStatus)
  router.delete('/:id', c.remover)

  return router
}