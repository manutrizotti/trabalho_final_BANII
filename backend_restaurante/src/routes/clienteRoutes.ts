import { Router } from 'express'
import type { ClienteController } from '../controllers/ClienteController.js'

export function criarClienteRoutes(c: ClienteController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.post('/', c.criar)
  router.get('/:id', c.buscarPorId)
  router.put('/:id', c.atualizar)
  router.delete('/:id', c.excluir)

  return router
}