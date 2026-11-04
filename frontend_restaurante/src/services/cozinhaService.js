import { requisicao } from './api'

export const cozinhaService = {
  listar() {
    return requisicao('/cozinha')
  },
  avancar(id) {
    return requisicao(`/cozinha/${id}/avancar`, { method: 'PATCH' })
  },
}