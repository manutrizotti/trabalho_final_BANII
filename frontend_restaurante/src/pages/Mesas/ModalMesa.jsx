import { useState } from 'react'
import Modal from '../../components/Modal/Modal'
import Campo from '../../components/Campo/Campo'
import { mesaService } from '../../services/mesaService'
import styles from './ModalMesa.module.css'

const LOCALIZACOES = [
  { valor: 'salão', rotulo: 'Salão' },
  { valor: 'varanda', rotulo: 'Varanda' },
  { valor: 'mezanino', rotulo: 'Mezanino' },
]

const MAX_NUMERO = 999
const MAX_CAPACIDADE = 50

const VAZIO = { numero: '', localizacao: '', capacidade: '', status: 'ativa' }

const vazio = (v) => String(v ?? '').trim() === ''

// Ordem: número, localização, capacidade
function validar(form, { editando }) {
  const e = {}

  if (!editando) {
    if (vazio(form.numero)) {
      e.numero = 'Informe o número da mesa.'
    } else {
      const n = Number(form.numero)
      if (!Number.isInteger(n) || n < 1 || n > MAX_NUMERO) {
        e.numero = `O número deve ser um inteiro entre 1 e ${MAX_NUMERO}.`
      }
    }
  }

  if (!form.localizacao) e.localizacao = 'Selecione a localização.'

  if (vazio(form.capacidade)) {
    e.capacidade = 'Informe a capacidade.'
  } else {
    const c = Number(form.capacidade)
    if (!Number.isInteger(c) || c < 1 || c > MAX_CAPACIDADE) {
      e.capacidade = `A capacidade deve ser um inteiro entre 1 e ${MAX_CAPACIDADE}.`
    }
  }

  return e
}

// mesa: quando for edição, a mesa existente. Quando nula, é inserção.
function ModalMesa({ mesa, onFechar, onSalvar, onExcluir }) {
  const editando = Boolean(mesa)
  const [form, setForm] = useState(
    mesa
      ? {
          numero: String(mesa.numero),
          localizacao: mesa.localizacao ?? '',
          capacidade: String(mesa.capacidade),
          status: mesa.status,
        }
      : VAZIO,
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
    const erros = validar(form, { editando })
    setErrosCampo(erros)
    if (Object.keys(erros).length > 0) return

    setSalvando(true)
    try {
      const dados = {
        localizacao: form.localizacao,
        capacidade: Number(form.capacidade),
      }
      if (editando) {
        await mesaService.atualizar(mesa.id, { ...dados, status: form.status })
      } else {
        await mesaService.criar({ ...dados, numero: Number(form.numero) })
      }
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
    <Modal titulo={editando ? 'Editar mesa' : 'Inserir mesa'} onFechar={onFechar}>
      <div className={styles.corpo}>
        <div className={styles.linha}>
          <Campo rotulo="Informe o número da mesa" obrigatorio={!editando} erro={errosCampo.numero}>
            <input
              className={cls('numero', editando ? styles.desabilitado : '')}
              value={form.numero}
              inputMode="numeric"
              maxLength={3}
              disabled={editando}
              onChange={(e) => mudar('numero', e.target.value)}
              placeholder="Número"
            />
          </Campo>

          <Campo rotulo="Selecione a localização" obrigatorio erro={errosCampo.localizacao}>
            <select
              className={cls('localizacao')}
              value={form.localizacao}
              onChange={(e) => mudar('localizacao', e.target.value)}
            >
              <option value="">Selecione a localização</option>
              {LOCALIZACOES.map((l) => (
                <option key={l.valor} value={l.valor}>{l.rotulo}</option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo rotulo="Informe a capacidade (pessoas)" obrigatorio erro={errosCampo.capacidade}>
          <input
            className={cls('capacidade')}
            value={form.capacidade}
            inputMode="numeric"
            maxLength={2}
            onChange={(e) => mudar('capacidade', e.target.value)}
            placeholder="Número de lugares"
          />
        </Campo>

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.rodape}>
          {editando ? (
            <div className={styles.esquerda}>
              <button className={styles.excluir} onClick={() => onExcluir(mesa)}>🗑 Excluir mesa</button>
              <button
                className={`${styles.estado} ${form.status === 'ativa' ? styles.estadoSim : styles.estadoNao}`}
                onClick={() => mudar('status', form.status === 'ativa' ? 'quebrada' : 'ativa')}
              >
                {form.status === 'ativa' ? 'Ativa' : 'Quebrada'}
              </button>
            </div>
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

export default ModalMesa