import { requisicao } from './api'

export const mesaService = {
  listar({ busca, livres, localizacao } = {}) {
    const params = new URLSearchParams()
    if (busca) params.set('busca', busca)
    if (livres) params.set('livres', 'true')
    if (localizacao && localizacao !== 'todas') params.set('localizacao', localizacao)
    const query = params.toString()
    return requisicao(`/mesas${query ? `?${query}` : ''}`)
  },
  criar(dados) {
    return requisicao('/mesas', { method: 'POST', body: JSON.stringify(dados) })
  },
  atualizar(id, dados) {
    return requisicao(`/mesas/${id}`, { method: 'PUT', body: JSON.stringify(dados) })
  },
  alterarStatus(id, status) {
    return requisicao(`/mesas/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  },
  remover(id) {
    return requisicao(`/mesas/${id}`, { method: 'DELETE' })
  },
}