import { requisicao } from './api'

export const garcomService = {
  listar({ status, nome } = {}) {
    const params = new URLSearchParams()
    if (status && status !== 'todos') params.set('status', status)
    if (nome) params.set('nome', nome)
    const query = params.toString()
    return requisicao(`/garcons${query ? `?${query}` : ''}`)
  },
  criar(dados) {
    return requisicao('/garcons', { method: 'POST', body: JSON.stringify(dados) })
  },
  atualizar(id, dados) {
    return requisicao(`/garcons/${id}`, { method: 'PUT', body: JSON.stringify(dados) })
  },
}