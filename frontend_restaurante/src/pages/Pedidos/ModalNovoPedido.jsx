import { useEffect, useState } from 'react'
import Modal from '../../components/Modal/Modal'
import Campo from '../../components/Campo/Campo'
import { pedidoService } from '../../services/pedidoService'
import { mesaService } from '../../services/mesaService'
import { garcomService } from '../../services/garcomService'
import { clienteService } from '../../services/clienteService'
import { formatarTelefone } from '../../utils/formatacao'
import styles from './ModalNovoPedido.module.css'

const MAX_ENDERECO = 200
const MAX_TAXA = 999.99
const JANELA_MS = 150 * 60000 // mesma duração de reserva do back (2h30)

const vazio = (v) => String(v ?? '').trim() === ''

// o selo traz só 'HH:mm' (hoje): a reserva só é vinculada dentro da janela
function reservaNaJanela(reserva) {
  if (!reserva) return false
  const [h, m] = reserva.hora.split(':').map(Number)
  const quando = new Date()
  quando.setHours(h, m, 0, 0)
  return Math.abs(quando.getTime() - Date.now()) < JANELA_MS
}

// mesa: quando vier da aba Mesas ("Ocupar"), já chega escolhida e travada.
function ModalNovoPedido({ mesa, onFechar, onSalvar }) {
  const [aba, setAba] = useState('salao')
  const [form, setForm] = useState({
    idMesa: mesa ? mesa.id : '',
    idGarcom: '',
    idCliente: '',
    endereco: '',
    taxa: '',
  })
  const [mesas, setMesas] = useState([])
  const [garcons, setGarcons] = useState([])
  const [clientes, setClientes] = useState([])
  const [errosCampo, setErrosCampo] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const reserva = mesa && reservaNaJanela(mesa.reservaHoje) ? mesa.reservaHoje : null
  const salao = aba === 'salao'

  useEffect(() => {
    garcomService.listar({ status: 'ativo' }).then(setGarcons).catch((e) => setErro(e.message))
    clienteService.listar().then(setClientes).catch((e) => setErro(e.message))
    if (!mesa) {
      mesaService.listar({ livres: true }).then(setMesas).catch((e) => setErro(e.message))
    }
  }, [mesa])

  // com reserva, o cliente é o dela
  useEffect(() => {
    if (reserva) setForm((f) => ({ ...f, idCliente: reserva.idCliente }))
  }, [reserva])

  function mudar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrosCampo((e) => {
      if (!e[campo]) return e
      const { [campo]: _, ...resto } = e
      return resto
    })
    setErro('')
  }

  // Ordem salão: mesa, garçom. Delivery: cliente, endereço, taxa.
  function validar() {
    const e = {}
    if (salao) {
      if (!form.idMesa) e.idMesa = 'Selecione a mesa.'
      if (!form.idGarcom) e.idGarcom = 'Selecione o garçom.'
    } else {
      if (!form.idCliente) e.idCliente = 'Selecione o cliente.'
      if (vazio(form.endereco)) e.endereco = 'Informe o endereço de entrega.'
      if (vazio(form.taxa)) {
        e.taxa = 'Informe a taxa de entrega.'
      } else {
        const t = Number(String(form.taxa).replace(',', '.'))
        if (!Number.isFinite(t) || t < 0 || t > MAX_TAXA) e.taxa = 'A taxa deve estar entre 0 e 999,99.'
      }
    }
    return e
  }

  async function salvar() {
    setErro('')
    const erros = validar()
    setErrosCampo(erros)
    if (Object.keys(erros).length > 0) return

    setSalvando(true)
    try {
      const pedido = salao
        ? await pedidoService.criar({
            tipo: 'salao',
            idMesa: form.idMesa,
            idGarcom: form.idGarcom,
            idCliente: form.idCliente || null,
            idReserva: reserva ? reserva.id : null,
          })
        : await pedidoService.criar({
            tipo: 'delivery',
            idCliente: form.idCliente,
            endereco: form.endereco,
            taxaEntrega: Number(String(form.taxa).replace(',', '.')),
          })
      onSalvar(pedido)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const cls = (chave, extra = '') =>
    `${styles.campo} ${extra} ${errosCampo[chave] ? styles.invalido : ''}`

  const opcoesCliente = clientes.map((c) => (
    <option key={c.id} value={c.id}>{c.nome} - {formatarTelefone(c.telefone)}</option>
  ))

  return (
    <Modal titulo="Adicionar pedido" onFechar={onFechar}>
      <div className={styles.abas}>
        <button
          className={`${styles.aba} ${salao ? styles.abaAtiva : ''}`}
          onClick={() => setAba('salao')}
        >
          SALÃO
        </button>
        <button
          className={`${styles.aba} ${!salao ? styles.abaAtiva : ''}`}
          onClick={() => !mesa && setAba('delivery')}
          disabled={Boolean(mesa)}
        >
          DELIVERY
        </button>
      </div>

      <div className={styles.corpo}>
        {salao ? (
          <>
            <Campo rotulo="Mesa" obrigatorio erro={errosCampo.idMesa}>
              {mesa ? (
                <input className={`${styles.campo} ${styles.desabilitado}`} value={`Mesa ${mesa.numero}`} disabled />
              ) : (
                <select className={cls('idMesa')} value={form.idMesa} onChange={(e) => mudar('idMesa', e.target.value)}>
                  <option value="">Selecione a mesa</option>
                  {mesas.map((m) => (
                    <option key={m.id} value={m.id}>Mesa {m.numero} ({m.capacidade} lugares)</option>
                  ))}
                </select>
              )}
            </Campo>

            <Campo rotulo="Garçom responsável" obrigatorio erro={errosCampo.idGarcom}>
              <select className={cls('idGarcom')} value={form.idGarcom} onChange={(e) => mudar('idGarcom', e.target.value)}>
                <option value="">Selecione o garçom</option>
                {garcons.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
              </select>
            </Campo>

            <Campo rotulo={reserva ? `Cliente (reserva das ${reserva.hora})` : 'Cliente (opcional)'}>
              <select
                className={`${styles.campo} ${reserva ? styles.desabilitado : ''}`}
                value={form.idCliente}
                disabled={Boolean(reserva)}
                onChange={(e) => mudar('idCliente', e.target.value)}
              >
                <option value="">Sem cliente</option>
                {opcoesCliente}
              </select>
            </Campo>
          </>
        ) : (
          <>
            <Campo rotulo="Cliente" obrigatorio erro={errosCampo.idCliente}>
              <select className={cls('idCliente')} value={form.idCliente} onChange={(e) => mudar('idCliente', e.target.value)}>
                <option value="">Selecione o cliente</option>
                {opcoesCliente}
              </select>
            </Campo>

            <Campo rotulo="Endereço de entrega" obrigatorio erro={errosCampo.endereco}>
              <input
                className={cls('endereco')}
                value={form.endereco}
                maxLength={MAX_ENDERECO}
                onChange={(e) => mudar('endereco', e.target.value)}
                placeholder="Rua, número, bairro"
              />
            </Campo>

            <Campo rotulo="Taxa de entrega" obrigatorio erro={errosCampo.taxa}>
              <div className={`${styles.comPrefixo} ${errosCampo.taxa ? styles.invalido : ''}`}>
                <span>R$</span>
                <input
                  className={styles.campoSemBorda}
                  inputMode="decimal"
                  value={form.taxa}
                  onChange={(e) => mudar('taxa', e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </Campo>
          </>
        )}

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.rodape}>
          <button className={styles.icone} onClick={onFechar} aria-label="Cancelar">✕</button>
          <button className={styles.icone} onClick={salvar} disabled={salvando} aria-label="Salvar">💾</button>
        </div>
      </div>
    </Modal>
  )
}

export default ModalNovoPedido