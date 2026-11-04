import { requisicao } from './api'

export const clienteService = {
  listar({ nome } = {}) {
    const params = new URLSearchParams()
    if (nome) params.set('nome', nome)
    const query = params.toString()
    return requisicao(`/clientes${query ? `?${query}` : ''}`)
  },
  criar(dados) {
    return requisicao('/clientes', { method: 'POST', body: JSON.stringify(dados) })
  },
  atualizar(id, dados) {
    return requisicao(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(dados) })
  },
  excluir(id) {
    return requisicao(`/clientes/${id}`, { method: 'DELETE' })
  },
}