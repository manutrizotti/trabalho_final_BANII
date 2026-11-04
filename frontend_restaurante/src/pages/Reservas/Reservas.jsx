import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/PageLayout/PageLayout'
import ModalAviso from '../../components/ModalAviso/ModalAviso'
import { reservaService } from '../../services/reservaService'
import CardReserva from './CardReserva'
import ModalReserva from './ModalReserva'
import styles from './Reservas.module.css'

const PERIODOS = [
  { valor: 'todas', rotulo: 'Todas as datas' },
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'amanha', rotulo: 'Amanhã' },
  { valor: 'proximos7', rotulo: 'Próximos 7 dias' },
  { valor: 'proximos30', rotulo: 'Próximos 30 dias' },
  { valor: '7dias', rotulo: 'Últimos 7 dias' },
  { valor: 'mes', rotulo: 'Último mês' },
]

const STATUS = [
  { valor: 'todas', rotulo: 'Todos os status' },
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'confirmada', rotulo: 'Confirmadas' },
  { valor: 'em andamento', rotulo: 'Em andamento' },
  { valor: 'finalizada', rotulo: 'Finalizadas' },
  { valor: 'cancelada', rotulo: 'Canceladas' },
]

function Reservas() {
  const [reservas, setReservas] = useState([])
  const [periodo, setPeriodo] = useState('todas')
  const [status, setStatus] = useState('todas')
  const [erro, setErro] = useState('')

  // modal: null | { reserva: objeto|null }
  const [modal, setModal] = useState(null)
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    try {
      setErro('')
      setReservas(await reservaService.listar({ status, periodo }))
    } catch (e) {
      setErro(e.message)
    }
  }, [status, periodo])

  useEffect(() => {
    carregar()
  }, [carregar])

  function aoSalvar() {
    setModal(null)
    setSucesso('Salvo com sucesso!')
    carregar()
    setTimeout(() => setSucesso(''), 1500)
  }

  return (
    <PageLayout fundo="reservas.jpg">
      <div className={styles.barra}>
        <select className={styles.select} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          {PERIODOS.map((p) => (
            <option key={p.valor} value={p.valor}>{p.rotulo}</option>
          ))}
        </select>
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>{s.rotulo}</option>
          ))}
        </select>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.grade}>
        <button className={styles.adicionar} onClick={() => setModal({ reserva: null })}>
          <span className={styles.mais}>+</span>
          Fazer reserva
        </button>

        {reservas.map((r) => (
          <CardReserva key={r.id} reserva={r} onAbrir={(reserva) => setModal({ reserva })} />
        ))}
      </div>

      {reservas.length === 0 && !erro && <p className={styles.vazio}>Nenhuma reserva encontrada.</p>}

      {modal && (
        <ModalReserva reserva={modal.reserva} onFechar={() => setModal(null)} onSalvar={aoSalvar} />
      )}

      {sucesso && <ModalAviso tipo="sucesso" mensagem={sucesso} onFechar={() => setSucesso('')} />}
    </PageLayout>
  )
}

export default Reservas