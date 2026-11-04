import { useEffect, useState } from 'react'
import Modal from '../../components/Modal/Modal'
import Campo from '../../components/Campo/Campo'
import { reservaService } from '../../services/reservaService'
import { clienteService } from '../../services/clienteService'
import { mesaService } from '../../services/mesaService'
import { formatarData, formatarTelefone } from '../../utils/formatacao'
import styles from './ModalReserva.module.css'

const MAX_PESSOAS = 100
const MAX_OBSERVACOES = 200

const ROTULO = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  'em andamento': 'Em andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const TRANSICOES = {
  pendente: ['confirmada', 'cancelada'],
  confirmada: ['em andamento', 'cancelada'],
  'em andamento': ['finalizada', 'cancelada'],
  finalizada: [],
  cancelada: [],
}

const VAZIO = { idCliente: '', dataHora: '', pessoas: '', mesas: [], observacoes: '' }

const vazio = (v) => String(v ?? '').trim() === ''

// valor do <input type="datetime-local"> do momento atual (para o min)
function agoraLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

// Ordem: cliente, data/hora, pessoas, mesas, observações
function validar(form) {
  const e = {}

  if (!form.idCliente) e.idCliente = 'Selecione o cliente.'

  if (vazio(form.dataHora)) e.dataHora = 'Informe a data e a hora.'
  else if (new Date(form.dataHora) < new Date()) e.dataHora = 'A data e a hora não podem estar no passado.'

  if (vazio(form.pessoas)) {
    e.pessoas = 'Informe o número de pessoas.'
  } else {
    const n = Number(form.pessoas)
    if (!Number.isInteger(n) || n < 1 || n > MAX_PESSOAS) {
      e.pessoas = `O número de pessoas deve ser um inteiro entre 1 e ${MAX_PESSOAS}.`
    }
  }

  if (form.mesas.length === 0) e.mesas = 'Selecione ao menos uma mesa.'

  return e
}

// reserva: quando for edição, a reserva existente. Quando nula, é inserção.
function ModalReserva({ reserva, onFechar, onSalvar }) {
  const editando = Boolean(reserva)
  const proximos = editando ? TRANSICOES[reserva.status] : []
  const encerrada = editando && proximos.length === 0

  const [form, setForm] = useState(editando ? { ...VAZIO, observacoes: reserva.observacoes } : VAZIO)
  const [status, setStatus] = useState(editando ? reserva.status : 'confirmada')
  const [clientes, setClientes] = useState([])
  const [mesas, setMesas] = useState([])
  const [errosCampo, setErrosCampo] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (editando) return
    clienteService.listar().then(setClientes).catch((e) => setErro(e.message))
    mesaService.listar().then((lista) => setMesas(lista.filter((m) => m.status === 'ativa')))
      .catch((e) => setErro(e.message))
  }, [editando])

  function mudar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrosCampo((e) => {
      if (!e[campo]) return e
      const { [campo]: _, ...resto } = e
      return resto
    })
    setErro('')
  }

  function alternarMesa(id) {
    mudar('mesas', form.mesas.includes(id) ? form.mesas.filter((m) => m !== id) : [...form.mesas, id])
  }

  async function salvar() {
    setErro('')

    if (!editando) {
      const erros = validar(form)
      setErrosCampo(erros)
      if (Object.keys(erros).length > 0) return
    }

    setSalvando(true)
    try {
      if (editando) {
        await reservaService.atualizar(reserva.id, { status, observacoes: form.observacoes })
      } else {
        await reservaService.criar({
          idCliente: form.idCliente,
          dataHora: form.dataHora,
          numeroPessoas: Number(form.pessoas),
          idMesas: form.mesas,
          observacoes: form.observacoes,
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

  const [dataRes, horaRes] = editando ? reserva.dataHora.split(' ') : []

  return (
    <Modal titulo={editando ? `Reserva ${reserva.id}` : 'Fazer reserva'} onFechar={onFechar}>
      <div className={styles.corpo}>
        {editando ? (
          <>
            <Campo rotulo="Cliente">
              <input className={`${styles.campo} ${styles.desabilitado}`} value={reserva.nomeCliente} disabled />
            </Campo>
            <div className={styles.linha}>
              <Campo rotulo="Data e hora">
                <input
                  className={`${styles.campo} ${styles.desabilitado}`}
                  value={`${formatarData(dataRes)} ${horaRes}`}
                  disabled
                />
              </Campo>
              <Campo rotulo="Pessoas">
                <input className={`${styles.campo} ${styles.desabilitado}`} value={reserva.numeroPessoas} disabled />
              </Campo>
            </div>
            <Campo rotulo="Mesas">
              <input
                className={`${styles.campo} ${styles.desabilitado}`}
                value={reserva.mesas.map((m) => m.numero).join(', ')}
                disabled
              />
            </Campo>
            <Campo rotulo="Situação">
              <select
                className={styles.campo}
                value={status}
                disabled={encerrada}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value={reserva.status}>{ROTULO[reserva.status]}</option>
                {proximos.map((s) => (
                  <option key={s} value={s}>{ROTULO[s]}</option>
                ))}
              </select>
            </Campo>
          </>
        ) : (
          <>
            <Campo rotulo="Selecione o cliente" obrigatorio erro={errosCampo.idCliente}>
              <select
                className={cls('idCliente')}
                value={form.idCliente}
                onChange={(e) => mudar('idCliente', e.target.value)}
              >
                <option value="">Selecione o cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} - {formatarTelefone(c.telefone)}</option>
                ))}
              </select>
            </Campo>

            <div className={styles.linha}>
              <Campo rotulo="Data e hora" obrigatorio erro={errosCampo.dataHora}>
                <input
                  type="datetime-local"
                  className={cls('dataHora')}
                  value={form.dataHora}
                  min={agoraLocal()}
                  onChange={(e) => mudar('dataHora', e.target.value)}
                />
              </Campo>
              <Campo rotulo="Número de pessoas" obrigatorio erro={errosCampo.pessoas}>
                <input
                  className={cls('pessoas')}
                  value={form.pessoas}
                  inputMode="numeric"
                  maxLength={3}
                  onChange={(e) => mudar('pessoas', e.target.value)}
                  placeholder="Número"
                />
              </Campo>
            </div>

            <Campo rotulo="Selecione as mesas" obrigatorio erro={errosCampo.mesas}>
              <ul className={`${styles.listaMesas} ${errosCampo.mesas ? styles.invalido : ''}`}>
                {mesas.map((m) => (
                  <li key={m.id}>
                    <label className={styles.itemMesa}>
                      <input
                        type="checkbox"
                        checked={form.mesas.includes(m.id)}
                        onChange={() => alternarMesa(m.id)}
                      />
                      Mesa {m.numero} ({m.capacidade} lugares, {m.localizacao})
                    </label>
                  </li>
                ))}
                {mesas.length === 0 && <li className={styles.vazio}>Nenhuma mesa ativa cadastrada.</li>}
              </ul>
            </Campo>
          </>
        )}

        <Campo rotulo="Observações">
          <textarea
            className={`${styles.campo} ${styles.observacoes} ${encerrada ? styles.desabilitado : ''}`}
            value={form.observacoes}
            maxLength={MAX_OBSERVACOES}
            disabled={encerrada}
            onChange={(e) => mudar('observacoes', e.target.value)}
          />
          <small className={styles.contador}>{form.observacoes.length}/{MAX_OBSERVACOES}</small>
        </Campo>

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.rodape}>
          <button className={styles.icone} onClick={onFechar} aria-label="Cancelar">✕</button>
          <button
            className={styles.icone}
            onClick={salvar}
            disabled={salvando || encerrada}
            aria-label="Salvar"
          >
            💾
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ModalReserva