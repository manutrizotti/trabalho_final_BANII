const BASE = 'http://localhost:3000/api'

export async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  })
  const dados = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new Error(dados?.erro || 'Erro ao comunicar com o servidor.')
  }
  return dados
}