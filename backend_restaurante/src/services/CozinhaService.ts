import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'
import type { ItemCozinha, StatusCozinha } from '../models/ItemCozinha.js'
import type { CozinhaRepository } from '../repositories/CozinhaRepository.js'

// As únicas transições permitidas
const PROXIMO: Record<StatusCozinha, StatusCozinha | null> = {
  'aguardando preparo': 'em preparo',
  'em preparo': 'pronto',
  pronto: 'servido',
  servido: null,
}

export class CozinhaService {
  constructor(private repo: CozinhaRepository) {}

  // a ordem (de inclusão) vem do repository
  listar(): Promise<ItemCozinha[]> {
    return this.repo.listarPendentes()
  }

  async avancar(id: string): Promise<ItemCozinha> {
    const item = await this.repo.buscarPorId(id)
    if (!item) throw new ErroDeNegocio('Item não encontrado.', 404)

    const proximo = PROXIMO[item.status]
    if (!proximo) throw new ErroDeNegocio('Esse item já foi servido.', 409)

    if (!(await this.repo.alterarStatus(id, item.status, proximo))) {
      throw new ErroDeNegocio('O estado desse item mudou. Atualize a tela.', 409)
    }
    return (await this.repo.buscarPorId(id))!
  }
}