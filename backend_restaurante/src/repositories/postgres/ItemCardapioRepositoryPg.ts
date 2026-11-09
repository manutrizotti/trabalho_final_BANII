import { chamar, pool } from '../../db/connection.js'
import { ItemCardapio, ItemComposicao } from '../../models/ItemCardapio.js'
import type {
  AtualizacaoItem,
  FiltroItens,
  ItemCardapioRepository,
  NovoItem,
} from '../ItemCardapioRepository.js'

function paraModelo(linha: any): ItemCardapio {
  return new ItemCardapio(
    String(linha.id_cardapio),
    linha.codigo_cardapio,
    linha.categoria,
    linha.nome,
    linha.descricao ?? '',
    Number(linha.preco),
    linha.tempo_preparo_minutos ?? 0,
    linha.disponibilidade,
    linha.eh_combo,
    linha.imagem ?? null,
  )
}

export class ItemCardapioRepositoryPg implements ItemCardapioRepository {
  async listar(filtro: FiltroItens): Promise<ItemCardapio[]> {
    const { rows } = await chamar('SELECT * FROM fn_listar_itens($1, $2, $3)', [
      filtro.categoria ?? null,
      filtro.disponivel ?? null,
      filtro.nome ?? null,
    ])
    return rows.map(paraModelo)
  }

  async buscarPorId(id: string): Promise<ItemCardapio | null> {
    const { rows } = await pool.query('SELECT * FROM itens_cardapio WHERE id_cardapio = $1', [id])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async buscarPorCodigo(codigo: string): Promise<ItemCardapio | null> {
    const { rows } = await pool.query('SELECT * FROM itens_cardapio WHERE codigo_cardapio = $1', [codigo])
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async inserir(d: NovoItem): Promise<ItemCardapio> {
    const { rows } = await chamar('SELECT fn_inserir_item($1, $2, $3, $4, $5, $6, $7) AS id', [
      d.codigo, d.categoria, d.nome, d.descricao, d.preco, d.tempoPreparoMinutos, d.ehCombo,
    ])
    return (await this.buscarPorId(String(rows[0].id)))!
  }

  async atualizar(id: string, d: AtualizacaoItem): Promise<ItemCardapio | null> {
    await chamar('SELECT fn_atualizar_item($1, $2, $3, $4, $5, $6)', [
      id, d.nome, d.descricao, d.preco, d.tempoPreparoMinutos, d.disponivel,
    ])
    return this.buscarPorId(id)
  }

  async temHistoricoDeVendas(id: string): Promise<boolean> {
    const { rows } = await pool.query('SELECT 1 FROM item_pedido WHERE id_cardapio = $1 LIMIT 1', [id])
    return rows.length > 0
  }

  // fn_excluir_item inativa se houver histórico e apaga se não houver
  async inativar(id: string): Promise<void> {
    await chamar('SELECT fn_excluir_item($1)', [id])
  }

  async excluir(id: string): Promise<void> {
    await chamar('SELECT fn_excluir_item($1)', [id])
  }

  async listarComposicao(idCombo: string): Promise<ItemComposicao[]> {
    const { rows } = await chamar('SELECT * FROM fn_listar_composicao($1)', [idCombo])
    return rows.map((r) => new ItemComposicao(String(r.id_item), r.nome, r.quantidade))
  }

  async adicionarNaComposicao(idCombo: string, idItem: string, quantidade: number): Promise<void> {
    await chamar('SELECT fn_adicionar_composicao($1, $2, $3)', [idCombo, idItem, quantidade])
  }

  async atualizarQuantidadeNaComposicao(idCombo: string, idItem: string, quantidade: number): Promise<void> {
    await chamar('SELECT fn_atualizar_qtd_composicao($1, $2, $3)', [idCombo, idItem, quantidade])
  }

  async removerDaComposicao(idCombo: string, idItem: string): Promise<void> {
    await chamar('SELECT fn_remover_composicao($1, $2)', [idCombo, idItem])
  }

  async atualizarImagem(id: string, imagem: string | null): Promise<void> {
    await chamar('SELECT fn_atualizar_imagem($1, $2)', [id, imagem])
  }
}