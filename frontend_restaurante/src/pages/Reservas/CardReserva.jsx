import { formatarData } from '../../utils/formatacao'
import styles from './CardReserva.module.css'

const ROTULO = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  'em andamento': 'Em andamento',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

function CardReserva({ reserva, onAbrir }) {
  const [data, hora] = reserva.dataHora.split(' ')
  const numeros = reserva.mesas.map((m) => m.numero).join(', ')
  const rotuloMesa = reserva.mesas.length > 1 ? `Mesas ${numeros}` : `Mesa ${numeros}`

  return (
    <article
      className={styles.card}
      onClick={() => onAbrir(reserva)}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir(reserva)}
      role="button"
      tabIndex={0}
    >
      <div className={styles.interno}>
        <span className={styles.furo} />
        <h3 className={styles.titulo}>Reserva {reserva.id}</h3>

        <svg className={styles.rabisco} viewBox="0 0 80 20" aria-hidden="true">
          <path d="M2 14 C10 4, 14 4, 18 12 S28 12, 34 8 S50 14, 78 10" fill="none" stroke="#000" strokeWidth="2.5" />
        </svg>

        <p className={styles.data}>{formatarData(data)}</p>
        <p className={styles.data}>{hora}</p>

        <div className={styles.resumo}>
          <p>{rotuloMesa}</p>
          <p>{reserva.nomeCliente}</p>
          <p>{reserva.numeroPessoas} {reserva.numeroPessoas === 1 ? 'pessoa' : 'pessoas'}</p>
        </div>

        <h4 className={styles.subtitulo}>Observações</h4>
        <p className={styles.observacoes}>{reserva.observacoes}</p>

        <span className={styles.status}>{ROTULO[reserva.status]}</span>
      </div>
    </article>
  )
}

export default CardReserva