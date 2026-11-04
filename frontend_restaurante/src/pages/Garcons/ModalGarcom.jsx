import { useState } from 'react'
import Modal from '../../components/Modal/Modal'
import Campo from '../../components/Campo/Campo'
import { garcomService } from '../../services/garcomService'
import { formatarCpf, soDigitos } from '../../utils/formatacao'
import styles from './ModalGarcom.module.css'

const MAX_NOME = 60
const MAX_CODIGO = 10
const MAX_COMISSAO = 100

const STATUS = [
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'de ferias', rotulo: 'De férias' },
  { valor: 'demitido', rotulo: 'Demitido' },
]

const VAZIO = { nome: '', codigo: '', cpf: '', comissao: '', status: 'ativo' }

const vazio = (v) => String(v ?? '').trim() === ''

// Ordem: nome, código, CPF, comissão
function validar(form, { editando }) {
  const e = {}

  if (vazio(form.nome)) e.nome = 'Informe o nome do garçom.'

  if (!editando) {
    if (vazio(form.codigo)) e.codigo = 'Informe o código do garçom.'
    if (vazio(form.cpf)) e.cpf = 'Informe o CPF do garçom.'
    else if (soDigitos(form.cpf).length !== 11) e.cpf = 'O CPF deve ter 11 dígitos.'
  }

  if (vazio(form.comissao)) {
    e.comissao = 'Informe o percentual de comissão.'
  } else {
    const c = Number(String(form.comissao).replace(',', '.'))
    if (!Number.isFinite(c) || c < 0 || c > MAX_COMISSAO) {
      e.comissao = `A comissão deve estar entre 0 e ${MAX_COMISSAO}%.`
    }
  }

  return e
}

// garcom: quando for edição, o garçom existente. Quando nulo, é inserção.
function ModalGarcom({ garcom, onFechar, onSalvar }) {
  const editando = Boolean(garcom)
  const [form, setForm] = useState(
    garcom
      ? {
          nome: garcom.nome,
          codigo: garcom.codigo,
          cpf: formatarCpf(garcom.cpf),
          comissao: String(garcom.comissao),
          status: garcom.status,
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
      const comissao = Number(String(form.comissao).replace(',', '.'))
      if (editando) {
        await garcomService.atualizar(garcom.id, { nome: form.nome, comissao, status: form.status })
      } else {
        await garcomService.criar({
          nome: form.nome,
          codigo: form.codigo,
          cpf: soDigitos(form.cpf),
          comissao,
        })
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
    <Modal titulo={editando ? 'Editar garçom' : 'Inserir garçom'} onFechar={onFechar}>
      <div className={styles.corpo}>
        <Campo rotulo="Informe o nome do garçom" obrigatorio erro={errosCampo.nome}>
          <input
            className={cls('nome')}
            value={form.nome}
            maxLength={MAX_NOME}
            onChange={(e) => mudar('nome', e.target.value)}
            placeholder="Texto"
          />
        </Campo>

        <div className={styles.linha}>
          <Campo rotulo="Informe o código" obrigatorio={!editando} erro={errosCampo.codigo}>
            <input
              className={cls('codigo', editando ? styles.desabilitado : '')}
              value={form.codigo}
              maxLength={MAX_CODIGO}
              disabled={editando}
              onChange={(e) => mudar('codigo', e.target.value)}
              placeholder="Texto"
            />
          </Campo>

          <Campo rotulo="Informe o CPF" obrigatorio={!editando} erro={errosCampo.cpf}>
            <input
              className={cls('cpf', editando ? styles.desabilitado : '')}
              value={form.cpf}
              inputMode="numeric"
              disabled={editando}
              onChange={(e) => mudar('cpf', formatarCpf(e.target.value))}
              placeholder="000.000.000-00"
            />
          </Campo>
        </div>

        <div className={styles.linha}>
          <Campo rotulo="Percentual de comissão" obrigatorio erro={errosCampo.comissao}>
            <div className={`${styles.comPrefixo} ${errosCampo.comissao ? styles.invalido : ''}`}>
              <input
                className={styles.campoSemBorda}
                inputMode="decimal"
                value={form.comissao}
                onChange={(e) => mudar('comissao', e.target.value)}
                placeholder="0"
              />
              <span>%</span>
            </div>
          </Campo>

          {editando && (
            <Campo rotulo="Situação">
              <select
                className={styles.campo}
                value={form.status}
                onChange={(e) => mudar('status', e.target.value)}
              >
                {STATUS.map((s) => (
                  <option key={s.valor} value={s.valor}>{s.rotulo}</option>
                ))}
              </select>
            </Campo>
          )}
        </div>

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.rodape}>
          <button className={styles.icone} onClick={onFechar} aria-label="Cancelar">✕</button>
          <button className={styles.icone} onClick={salvar} disabled={salvando} aria-label="Salvar">💾</button>
        </div>
      </div>
    </Modal>
  )
}

export default ModalGarcom