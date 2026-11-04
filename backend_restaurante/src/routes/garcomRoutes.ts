import { Router } from 'express'
import type { GarcomController } from '../controllers/GarcomController.js'

export function criarGarcomRoutes(c: GarcomController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.post('/', c.criar)
  router.get('/:id', c.buscarPorId)
  router.put('/:id', c.atualizar)

  return router
}