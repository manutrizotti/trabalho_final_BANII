import type { ItemCozinha, StatusCozinha } from '../models/ItemCozinha.js'

export interface CozinhaRepository {
  /** Itens não servidos de pedidos não cancelados, na ordem em que foram adicionados. */
  listarPendentes(): Promise<ItemCozinha[]>
  buscarPorId(id: string): Promise<ItemCozinha | null>
  /** Só altera se o status atual ainda for `de`. Retorna false se não alterou. */
  alterarStatus(id: string, de: StatusCozinha, para: StatusCozinha): Promise<boolean>
}