import { Router } from 'express'
import type { CozinhaController } from '../controllers/CozinhaController.js'

export function criarCozinhaRoutes(c: CozinhaController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.patch('/:id/avancar', c.avancar)

  return router
}