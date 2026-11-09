import { pool } from '../../db/connection.js'
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
    const condicoes: string[] = []
    const params: unknown[] = []

    if (filtro.categoria === 'combos') {
      condicoes.push('eh_combo = TRUE')
    } else if (filtro.categoria) {
      params.push(filtro.categoria)
      condicoes.push(`categoria = $${params.length}`)
    }
    if (filtro.disponivel !== undefined) {
      params.push(filtro.disponivel)
      condicoes.push(`disponibilidade = $${params.length}`)
    }
    if (filtro.nome) {
      params.push(`%${filtro.nome}%`)
      condicoes.push(`nome ILIKE $${params.length}`)
    }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : ''
    const { rows } = await pool.query(`SELECT * FROM itens_cardapio ${where}`, params)
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
    const { rows } = await pool.query(
      `INSERT INTO itens_cardapio
         (codigo_cardapio, categoria, nome, descricao, preco, tempo_preparo_minutos, eh_combo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [d.codigo, d.categoria, d.nome, d.descricao, d.preco, d.tempoPreparoMinutos, d.ehCombo],
    )
    return paraModelo(rows[0])
  }

  async atualizar(id: string, d: AtualizacaoItem): Promise<ItemCardapio | null> {
    const { rows } = await pool.query(
      `UPDATE itens_cardapio
          SET nome = $2, descricao = $3, preco = $4, tempo_preparo_minutos = $5, disponibilidade = $6
        WHERE id_cardapio = $1 RETURNING *`,
      [id, d.nome, d.descricao, d.preco, d.tempoPreparoMinutos, d.disponivel],
    )
    return rows[0] ? paraModelo(rows[0]) : null
  }

  async temHistoricoDeVendas(id: string): Promise<boolean> {
    const { rows } = await pool.query('SELECT 1 FROM item_pedido WHERE id_cardapio = $1 LIMIT 1', [id])
    return rows.length > 0
  }

  async inativar(id: string): Promise<void> {
    await pool.query('UPDATE itens_cardapio SET disponibilidade = FALSE WHERE id_cardapio = $1', [id])
  }

  async excluir(id: string): Promise<void> {
    await pool.query('DELETE FROM itens_cardapio WHERE id_cardapio = $1', [id])
  }

  async listarComposicao(idCombo: string): Promise<ItemComposicao[]> {
    const { rows } = await pool.query(
      `SELECT i.id_cardapio, i.nome, c.quantidade
         FROM composicao c JOIN itens_cardapio i ON i.id_cardapio = c.id_item
        WHERE c.id_combo = $1`,
      [idCombo],
    )
    return rows.map((r) => new ItemComposicao(String(r.id_cardapio), r.nome, r.quantidade))
  }

  async adicionarNaComposicao(idCombo: string, idItem: string, quantidade: number): Promise<void> {
    await pool.query(
      'INSERT INTO composicao (id_combo, id_item, quantidade) VALUES ($1, $2, $3)',
      [idCombo, idItem, quantidade],
    )
  }

  async atualizarQuantidadeNaComposicao(idCombo: string, idItem: string, quantidade: number): Promise<void> {
    await pool.query(
      'UPDATE composicao SET quantidade = $3 WHERE id_combo = $1 AND id_item = $2',
      [idCombo, idItem, quantidade],
    )
  }

  async removerDaComposicao(idCombo: string, idItem: string): Promise<void> {
    await pool.query('DELETE FROM composicao WHERE id_combo = $1 AND id_item = $2', [idCombo, idItem])
  }

  async atualizarImagem(id: string, imagem: string | null): Promise<void> {
    await pool.query('UPDATE itens_cardapio SET imagem = $2 WHERE id_cardapio = $1', [id, imagem])
  }
}