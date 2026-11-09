import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const PASTA_UPLOADS = path.resolve(process.cwd(), 'uploads')
const PASTA_CARDAPIO = path.join(PASTA_UPLOADS, 'cardapio')

export class ArmazenamentoImagens {
  /** Salva o arquivo com um nome único e devolve esse nome. */
  async salvar(buffer: Buffer, extensao: string): Promise<string> {
    await mkdir(PASTA_CARDAPIO, { recursive: true })
    const nome = `${randomUUID()}.${extensao}`
    await writeFile(path.join(PASTA_CARDAPIO, nome), buffer)
    return nome
  }

  async remover(nome: string | null): Promise<void> {
    if (!nome) return
    try {
      await unlink(path.join(PASTA_CARDAPIO, path.basename(nome)))
    } catch {
      // arquivo já não existe: tudo bem
    }
  }
}