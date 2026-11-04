export const STATUS_COZINHA = ['aguardando preparo', 'em preparo', 'pronto', 'servido'] as const
export type StatusCozinha = (typeof STATUS_COZINHA)[number]

export class ItemCozinha {
  constructor(
    public id: string,
    public nomeProduto: string,
    public numeroMesa: number | null, // null = delivery
    public quantidade: number,
    public status: StatusCozinha,
  ) {}
}