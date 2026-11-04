import { Router } from 'express'
import type { ReservaController } from '../controllers/ReservaController.js'

export function criarReservaRoutes(c: ReservaController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.post('/', c.criar)
  router.get('/:id', c.buscarPorId)
  router.put('/:id', c.atualizar)

  return router
}