import 'dotenv/config'
import pg from 'pg'
import { ErroDeNegocio } from '../errors/ErroDeNegocio.js'

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function chamar(sql: string, params: unknown[] = []) {
  try {
    return await pool.query(sql, params)
  } catch (erro: any) {
    if (erro?.code === 'P0001') throw new ErroDeNegocio(erro.message, 409)
    if (erro?.code === '23505') throw new ErroDeNegocio('Já existe um registro com esse valor.', 409)
    throw erro
  }
}