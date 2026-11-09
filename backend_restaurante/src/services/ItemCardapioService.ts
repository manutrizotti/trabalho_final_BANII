import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { CATEGORIAS, type Categoria, type ItemCardapio, type ItemComposicao } from '../models/ItemCardapio.js'
import type { FiltroItens, ItemCardapioRepository } from '../repositories/ItemCardapioRepository.js'
import type { ArmazenamentoImagens } from '../storage/ArmazenamentoImagens.js'

// Limites (ajuste aqui se precisar)
const MAX_CODIGO = 10
const MAX_NOME = 60
const MAX_DESCRICAO = 300
const MAX_PRECO = 9999.99
const MAX_TEMPO = 240
const MAX_QTD_NO_COMBO = 99
const MAX_IMAGEM_BYTES = 2 * 1024 * 1024
const TIPOS_IMAGEM: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface ArquivoEnviado {
  buffer: Buffer
  mimetype: string
  size: number
}

export interface DadosItem {
  codigo?: string
  categoria?: string | null
  nome?: string
  descricao?: string
  preco?: number
  tempoPreparoMinutos?: number
  disponivel?: boolean
  ehCombo?: boolean
  itens?: { idItem: string; quantidade: number }[] // só para combos
}

export class ItemCardapioService {
  constructor(
    private repo: ItemCardapioRepository,
    private imagens: ArmazenamentoImagens,
  ) {}

  async listar(filtro: FiltroItens): Promise<ItemCardapio[]> {
    const itens = await this.repo.listar(filtro)
    return itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  async buscarPorId(id: string): Promise<ItemCardapio> {
    const item = await this.repo.buscarPorId(id)
    if (!item) throw new ErroDeNegocio('Item não encontrado.', 404)
    return item
  }

  async criar(d: DadosItem): Promise<ItemCardapio> {
    const ehCombo = d.ehCombo === true

    const nome = this.validarNome(d.nome)
    const codigo = this.validarCodigo(d.codigo)

    let categoria: Categoria | null = null
    if (!ehCombo) {
      if (!CATEGORIAS.includes(d.categoria as Categoria)) throw new ErroDeNegocio('Selecione uma categoria válida.')
      categoria = d.categoria as Categoria
    }

    const itens = d.itens ?? []
    if (ehCombo && itens.length === 0) throw new ErroDeNegocio('O combo precisa ter ao menos um item.')

    const descricao = this.validarDescricao(d.descricao)
    const preco = this.validarPreco(d.preco)
    const tempoPreparoMinutos = this.validarTempo(d.tempoPreparoMinutos)

    if (await this.repo.buscarPorCodigo(codigo)) {
      throw new ErroDeNegocio('Já existe um item com esse código.', 409)
    }

    if (ehCombo) {
      for (const i of itens) await this.validarItemDoCombo(i.idItem, i.quantidade)
    }

    const criado = await this.repo.inserir({
      codigo, categoria, ehCombo, nome, descricao, preco, tempoPreparoMinutos,
    })

    if (ehCombo) {
      try {
        for (const i of itens) await this.repo.adicionarNaComposicao(criado.id, i.idItem, i.quantidade)
      } catch (erro) {
        await this.repo.excluir(criado.id) // desfaz o combo se a composição falhar
        throw erro
      }
    }
    return criado
  }

  async atualizar(id: string, d: DadosItem): Promise<ItemCardapio> {
    await this.buscarPorId(id)
    const nome = this.validarNome(d.nome)
    const descricao = this.validarDescricao(d.descricao)
    const preco = this.validarPreco(d.preco)
    const tempoPreparoMinutos = this.validarTempo(d.tempoPreparoMinutos)

    const atualizado = await this.repo.atualizar(id, {
      nome, descricao, preco, tempoPreparoMinutos,
      disponivel: d.disponivel !== false,
    })
    if (!atualizado) throw new ErroDeNegocio('Item não encontrado.', 404)
    return atualizado
  }

    /** Se o item já foi vendido, apenas inativa. Retorna true se inativou. */
  async excluir(id: string): Promise<{ inativado: boolean }> {
    const item = await this.buscarPorId(id)
    if (await this.repo.temHistoricoDeVendas(id)) {
      await this.repo.inativar(id)
      return { inativado: true }
    }
    await this.repo.excluir(id)
    await this.imagens.remover(item.imagem)
    return { inativado: false }
  }

  async definirImagem(id: string, arquivo?: ArquivoEnviado): Promise<ItemCardapio> {
    const item = await this.buscarPorId(id)
    if (!arquivo) throw new ErroDeNegocio('Selecione uma imagem.')
    const extensao = TIPOS_IMAGEM[arquivo.mimetype]
    if (!extensao) throw new ErroDeNegocio('A imagem deve ser jpg, png ou webp.')
    if (arquivo.size > MAX_IMAGEM_BYTES) throw new ErroDeNegocio('A imagem deve ter no máximo 2 MB.')

    const nome = await this.imagens.salvar(arquivo.buffer, extensao)
    await this.repo.atualizarImagem(id, nome)
    await this.imagens.remover(item.imagem) // apaga a foto anterior
    return this.buscarPorId(id)
  }

  async removerImagem(id: string): Promise<ItemCardapio> {
    const item = await this.buscarPorId(id)
    await this.repo.atualizarImagem(id, null)
    await this.imagens.remover(item.imagem)
    return this.buscarPorId(id)
  }

  // ----- composição de combos -----

  async listarComposicao(idCombo: string): Promise<ItemComposicao[]> {
    await this.exigirCombo(idCombo)
    const itens = await this.repo.listarComposicao(idCombo)
    return itens.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  async adicionarNaComposicao(idCombo: string, idItem: string, quantidade: number): Promise<void> {
    await this.exigirCombo(idCombo)
    await this.validarItemDoCombo(idItem, quantidade)
    const atuais = await this.repo.listarComposicao(idCombo)
    if (atuais.some((i) => i.idItem === idItem)) throw new ErroDeNegocio('Esse item já está no combo.', 409)
    await this.repo.adicionarNaComposicao(idCombo, idItem, quantidade)
  }

  async atualizarQuantidade(idCombo: string, idItem: string, quantidade: number): Promise<void> {
    await this.exigirCombo(idCombo)
    this.validarQuantidade(quantidade)
    await this.repo.atualizarQuantidadeNaComposicao(idCombo, idItem, quantidade)
  }

  async removerDaComposicao(idCombo: string, idItem: string): Promise<void> {
    await this.exigirCombo(idCombo)
    await this.repo.removerDaComposicao(idCombo, idItem)
  }

  async substituirComposicao(idCombo: string, itens: { idItem: string; quantidade: number }[]): Promise<void> {
    await this.exigirCombo(idCombo)
    if (itens.length === 0) throw new ErroDeNegocio('O combo precisa ter ao menos um item.')
    for (const i of itens) await this.validarItemDoCombo(i.idItem, i.quantidade)

    const atuais = await this.repo.listarComposicao(idCombo)
    const novos = new Map(itens.map((i) => [i.idItem, i.quantidade]))

    for (const a of atuais) {
      if (!novos.has(a.idItem)) await this.repo.removerDaComposicao(idCombo, a.idItem)
    }
    for (const [idItem, qtd] of novos) {
      if (atuais.some((a) => a.idItem === idItem)) await this.repo.atualizarQuantidadeNaComposicao(idCombo, idItem, qtd)
      else await this.repo.adicionarNaComposicao(idCombo, idItem, qtd)
    }
  }

  // ----- validações privadas -----

  private validarNome(valor: unknown): string {
    const nome = String(valor ?? '').trim()
    if (!nome) throw new ErroDeNegocio('Informe o nome do produto.')
    if (nome.length > MAX_NOME) throw new ErroDeNegocio(`O nome deve ter no máximo ${MAX_NOME} caracteres.`)
    return nome
  }

  private validarCodigo(valor: unknown): string {
    const codigo = String(valor ?? '').trim()
    if (!codigo) throw new ErroDeNegocio('Informe o código do produto.')
    if (codigo.length > MAX_CODIGO) throw new ErroDeNegocio(`O código deve ter no máximo ${MAX_CODIGO} caracteres.`)
    return codigo
  }

  private validarDescricao(valor: unknown): string {
    const descricao = String(valor ?? '').trim()
    if (!descricao) throw new ErroDeNegocio('Descreva o produto.')
    if (descricao.length > MAX_DESCRICAO) {
      throw new ErroDeNegocio(`A descrição deve ter no máximo ${MAX_DESCRICAO} caracteres.`)
    }
    return descricao
  }

  private validarPreco(valor: unknown): number {
    if (valor === undefined || valor === null || valor === '') throw new ErroDeNegocio('Informe o preço do produto.')
    const preco = Number(valor)
    if (!Number.isFinite(preco) || preco <= 0 || preco > MAX_PRECO) {
      throw new ErroDeNegocio(`O preço deve estar entre 0,01 e ${MAX_PRECO.toFixed(2).replace('.', ',')}.`)
    }
    return preco
  }

  private validarTempo(valor: unknown): number {
    if (valor === undefined || valor === null || valor === '') throw new ErroDeNegocio('Informe o tempo de preparo.')
    const tempo = Number(valor)
    if (!Number.isInteger(tempo) || tempo < 0 || tempo > MAX_TEMPO) {
      throw new ErroDeNegocio(`O tempo de preparo deve ser um número inteiro entre 0 e ${MAX_TEMPO} minutos.`)
    }
    return tempo
  }

  private validarQuantidade(q: number): void {
    if (!Number.isInteger(q) || q < 1 || q > MAX_QTD_NO_COMBO) {
      throw new ErroDeNegocio(`A quantidade deve ser um inteiro entre 1 e ${MAX_QTD_NO_COMBO}.`)
    }
  }

  private async exigirCombo(idCombo: string): Promise<void> {
    const combo = await this.buscarPorId(idCombo)
    if (!combo.ehCombo) throw new ErroDeNegocio('Esse item não é um combo.')
  }

  private async validarItemDoCombo(idItem: string, quantidade: number): Promise<void> {
    this.validarQuantidade(quantidade)
    const item = await this.repo.buscarPorId(idItem)
    if (!item) throw new ErroDeNegocio(`Item ${idItem} não encontrado.`, 404)
    if (item.ehCombo) throw new ErroDeNegocio('Um combo não pode conter outro combo.')
  }
}