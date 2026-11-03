import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import { CATEGORIAS, type Categoria, type ItemCardapio, type ItemComposicao } from '../models/ItemCardapio.js'
import type { FiltroItens, ItemCardapioRepository } from '../repositories/ItemCardapioRepository.js'

// Limites (ajuste aqui se precisar)
const MAX_CODIGO = 10
const MAX_NOME = 60
const MAX_DESCRICAO = 150
const MAX_PRECO = 9999.99
const MAX_TEMPO = 240
const MAX_QTD_NO_COMBO = 99

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
  constructor(private repo: ItemCardapioRepository) {}

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
    const codigo = (d.codigo ?? '').trim()
    if (!codigo) throw new ErroDeNegocio('Informe o código do produto.')
    if (codigo.length > MAX_CODIGO) throw new ErroDeNegocio(`O código deve ter no máximo ${MAX_CODIGO} caracteres.`)

    let categoria: Categoria | null = null
    if (!ehCombo) {
      if (!CATEGORIAS.includes(d.categoria as Categoria)) throw new ErroDeNegocio('Selecione uma categoria válida.')
      categoria = d.categoria as Categoria
    }

    const campos = this.validarCampos(d)

    if (await this.repo.buscarPorCodigo(codigo)) {
      throw new ErroDeNegocio('Já existe um item com esse código.', 409)
    }

    const itens = d.itens ?? []
    if (ehCombo) {
      if (itens.length === 0) throw new ErroDeNegocio('O combo precisa ter ao menos um item.')
      for (const i of itens) await this.validarItemDoCombo(i.idItem, i.quantidade)
    }

    const criado = await this.repo.inserir({ codigo, categoria, ehCombo, ...campos })

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
    const campos = this.validarCampos(d)
    const atualizado = await this.repo.atualizar(id, {
      ...campos,
      disponivel: d.disponivel !== false,
    })
    if (!atualizado) throw new ErroDeNegocio('Item não encontrado.', 404)
    return atualizado
  }

  /** Se o item já foi vendido, apenas inativa. Retorna true se inativou. */
  async excluir(id: string): Promise<{ inativado: boolean }> {
    await this.buscarPorId(id)
    if (await this.repo.temHistoricoDeVendas(id)) {
      await this.repo.inativar(id)
      return { inativado: true }
    }
    await this.repo.excluir(id)
    return { inativado: false }
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

  // ----- validações privadas -----

  private validarCampos(d: DadosItem) {
    const nome = (d.nome ?? '').trim()
    if (!nome) throw new ErroDeNegocio('Informe o nome do produto.')
    if (nome.length > MAX_NOME) throw new ErroDeNegocio(`O nome deve ter no máximo ${MAX_NOME} caracteres.`)

    const descricao = (d.descricao ?? '').trim()
    if (descricao.length > MAX_DESCRICAO) {
      throw new ErroDeNegocio(`A descrição deve ter no máximo ${MAX_DESCRICAO} caracteres.`)
    }

    const preco = Number(d.preco)
    if (!Number.isFinite(preco) || preco <= 0 || preco > MAX_PRECO) {
      throw new ErroDeNegocio(`O preço deve estar entre 0,01 e ${MAX_PRECO.toFixed(2).replace('.', ',')}.`)
    }

    const tempo = Number(d.tempoPreparoMinutos ?? 0)
    if (!Number.isInteger(tempo) || tempo < 0 || tempo > MAX_TEMPO) {
      throw new ErroDeNegocio(`O tempo de preparo deve ser um número inteiro entre 0 e ${MAX_TEMPO} minutos.`)
    }

    return { nome, descricao, preco, tempoPreparoMinutos: tempo }
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