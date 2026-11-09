import { BASE, requisicao } from './api'

export const cardapioService = {
  listar({ categoria, disponivel, nome } = {}) {
    const params = new URLSearchParams()
    if (categoria && categoria !== 'todas') params.set('categoria', categoria)
    if (disponivel === true) params.set('disponivel', 'true')
    if (disponivel === false) params.set('disponivel', 'false')
    if (nome) params.set('nome', nome)
    const query = params.toString()
    return requisicao(`/cardapio${query ? `?${query}` : ''}`)
  },
  criar(dados) {
    return requisicao('/cardapio', { method: 'POST', body: JSON.stringify(dados) })
  },
  atualizar(id, dados) {
    return requisicao(`/cardapio/${id}`, { method: 'PUT', body: JSON.stringify(dados) })
  },
  excluir(id) {
    return requisicao(`/cardapio/${id}`, { method: 'DELETE' })
  },
  listarComposicao(id) {
    return requisicao(`/cardapio/${id}/composicao`)
  },
  atualizarComposicao(id, itens) {
    return requisicao(`/cardapio/${id}/composicao`, {
      method: 'PUT',
      body: JSON.stringify({ itens }),
    })
  },
  async enviarImagem(id, arquivo) {
    const form = new FormData()
    form.append('imagem', arquivo)
    // sem Content-Type: o navegador define o multipart sozinho
    const resposta = await fetch(`${BASE}/cardapio/${id}/imagem`, { method: 'POST', body: form })
    const dados = await resposta.json().catch(() => null)
    if (!resposta.ok) throw new Error(dados?.erro || 'Erro ao enviar a imagem.')
    return dados
  },
  removerImagem(id) {
    return requisicao(`/cardapio/${id}/imagem`, { method: 'DELETE' })
  },
}