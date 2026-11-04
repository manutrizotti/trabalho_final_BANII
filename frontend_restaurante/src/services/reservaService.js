import { requisicao } from './api'

export const reservaService = {
  listar({ status, periodo } = {}) {
    const params = new URLSearchParams()
    if (status && status !== 'todas') params.set('status', status)
    if (periodo && periodo !== 'todas') params.set('periodo', periodo)
    const query = params.toString()
    return requisicao(`/reservas${query ? `?${query}` : ''}`)
  },
  criar(dados) {
    return requisicao('/reservas', { method: 'POST', body: JSON.stringify(dados) })
  },
  atualizar(id, dados) {
    return requisicao(`/reservas/${id}`, { method: 'PUT', body: JSON.stringify(dados) })
  },
}