import { useState } from 'react'
import Modal from '../../components/Modal/Modal'
import Campo from '../../components/Campo/Campo'
import { clienteService } from '../../services/clienteService'
import { formatarTelefone, soDigitos, telefoneValido } from '../../utils/formatacao'
import styles from './ModalCliente.module.css'

const MAX_NOME = 60

const VAZIO = { nome: '', telefone: ''}

const vazio = (v) => String(v ?? '').trim() === ''

function validar(form) {
  const e = {}
  if (vazio(form.nome)) e.nome = 'Informe o nome do cliente.'
  if (vazio(form.telefone)) e.telefone = 'Informe o telefone do cliente.'
  else if (!telefoneValido(form.telefone)) e.telefone = 'Informe um telefone válido com DDD.'
  return e
}

// cliente: quando for edição, o cliente existente. Quando nulo, é inserção.
function ModalCliente({ cliente, onFechar, onSalvar, onExcluir }) {
  const editando = Boolean(cliente)
  const [form, setForm] = useState(
    cliente ? { nome: cliente.nome, telefone: formatarTelefone(cliente.telefone) } : VAZIO,
  )
  const [errosCampo, setErrosCampo] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  function mudar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrosCampo((e) => {
      if (!e[campo]) return e
      const { [campo]: _, ...resto } = e
      return resto
    })
    setErro('')
  }

  async function salvar() {
    setErro('')
    const erros = validar(form)
    setErrosCampo(erros)
    if (Object.keys(erros).length > 0) return

    setSalvando(true)
    try {
      const dados = { nome: form.nome, telefone: soDigitos(form.telefone) }
      if (editando) await clienteService.atualizar(cliente.id, dados)
      else await clienteService.criar(dados)
      onSalvar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const cls = (chave, extra = '') =>
    `${styles.campo} ${extra} ${errosCampo[chave] ? styles.invalido : ''}`

  return (
    <Modal titulo={editando ? 'Editar cliente' : 'Inserir cliente'} onFechar={onFechar}>
      <div className={styles.corpo}>
        <Campo rotulo="Informe o nome do cliente" obrigatorio erro={errosCampo.nome}>
          <input
            className={cls('nome')}
            value={form.nome}
            maxLength={MAX_NOME}
            onChange={(e) => mudar('nome', e.target.value)}
            placeholder="Texto"
          />
        </Campo>

        <Campo rotulo="Informe o telefone" obrigatorio erro={errosCampo.telefone}>
          <input
            className={cls('telefone')}
            value={form.telefone}
            inputMode="numeric"
            onChange={(e) => mudar('telefone', formatarTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
          />
        </Campo>

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.rodape}>
          {editando ? (
            <button className={styles.excluir} onClick={() => onExcluir(cliente)}>🗑 Excluir cliente</button>
          ) : <span />}

          <div className={styles.direita}>
            <button className={styles.icone} onClick={onFechar} aria-label="Cancelar">✕</button>
            <button className={styles.icone} onClick={salvar} disabled={salvando} aria-label="Salvar">💾</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ModalCliente