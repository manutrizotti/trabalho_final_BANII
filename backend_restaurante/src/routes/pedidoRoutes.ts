import { Router } from 'express'
import type { PedidoController } from '../controllers/PedidoController.js'

export function criarPedidoRoutes(c: PedidoController): Router {
  const router = Router()

  router.get('/', c.listar)
  router.post('/', c.criar)
  router.get('/:id', c.buscarPorId)

  router.post('/:id/itens', c.adicionarItem)
  router.delete('/:id/itens/:idItem', c.removerItem)

  router.post('/:id/fechar', c.fechar)
  router.post('/:id/cancelar', c.cancelar)
  router.post('/:id/pagamentos', c.registrarPagamento)
  router.patch('/:id/entrega', c.avancarEntrega)

  return router
}