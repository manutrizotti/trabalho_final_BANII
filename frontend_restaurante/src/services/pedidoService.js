import { requisicao } from './api'

export const pedidoService = {
  listar({ tipo, status, inicio, fim } = {}) {
    const params = new URLSearchParams()
    if (tipo && tipo !== 'todas') params.set('tipo', tipo)
    if (status && status !== 'todos') params.set('status', status)
    if (inicio) params.set('inicio', inicio)
    if (fim) params.set('fim', fim)
    const query = params.toString()
    return requisicao(`/pedidos${query ? `?${query}` : ''}`)
  },
  buscar(id) {
    return requisicao(`/pedidos/${id}`)
  },
  criar(dados) {
    return requisicao('/pedidos', { method: 'POST', body: JSON.stringify(dados) })
  },
  adicionarItem(id, dados) {
    return requisicao(`/pedidos/${id}/itens`, { method: 'POST', body: JSON.stringify(dados) })
  },
  removerItem(id, idItem) {
    return requisicao(`/pedidos/${id}/itens/${idItem}`, { method: 'DELETE' })
  },
  fechar(id, aplicaDezPorcento) {
    return requisicao(`/pedidos/${id}/fechar`, { method: 'POST', body: JSON.stringify({ aplicaDezPorcento }) })
  },
  cancelar(id) {
    return requisicao(`/pedidos/${id}/cancelar`, { method: 'POST' })
  },
  pagar(id, dados) {
    return requisicao(`/pedidos/${id}/pagamentos`, { method: 'POST', body: JSON.stringify(dados) })
  },
  avancarEntrega(id) {
    return requisicao(`/pedidos/${id}/entrega`, { method: 'PATCH' })
  },
}