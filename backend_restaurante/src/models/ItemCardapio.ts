export const CATEGORIAS = [
  'entradas',
  'pratos principais',
  'sobremesas',
  'bebidas alcoólicas',
  'bebidas não alcoólicas',
] as const

export type Categoria = (typeof CATEGORIAS)[number]

export class ItemCardapio {
  constructor(
    public id: string,
    public codigo: string,
    public categoria: Categoria | null, // combo não tem categoria
    public nome: string,
    public descricao: string,
    public preco: number,
    public tempoPreparoMinutos: number,
    public disponivel: boolean,
    public ehCombo: boolean,
  ) {}
}

export class ItemComposicao {
  constructor(
    public idItem: string,
    public nome: string,
    public quantidade: number,
  ) {}
}