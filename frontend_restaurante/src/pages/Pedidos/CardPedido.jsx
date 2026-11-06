import styles from './CardPedido.module.css'

const ROTULO = { aberto: 'Aberto', fechado: 'Fechado', cancelado: 'Cancelado' }

function Rabisco({ longo }) {
  return (
    <svg className={styles.rabisco} viewBox="0 0 110 24" aria-hidden="true">
      {longo ? (
        <path d="M2 16 C8 4, 12 4, 16 14 S24 4, 30 14 S40 4, 46 14 S56 4, 62 14 S72 4, 78 14 S90 6, 108 12"
          fill="none" stroke="#000" strokeWidth="2.5" />
      ) : (
        <path d="M30 14 C38 4, 42 4, 46 12 S56 12, 62 8 S72 14, 80 10" fill="none" stroke="#000" strokeWidth="2.5" />
      )}
    </svg>
  )
}

function CardPedido({ pedido, onAbrir }) {
  const titulo = pedido.tipo === 'salao' ? `Mesa ${pedido.numeroMesa}` : 'Delivery'

  return (
    <article
      className={styles.card}
      onClick={() => onAbrir(pedido)}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir(pedido)}
      role="button"
      tabIndex={0}
    >
      <span className={styles.furo} />
      <h3 className={styles.titulo}>{titulo}</h3>
      <Rabisco longo={Number(pedido.id) % 2 === 0} />
      <p className={styles.cliente}>{pedido.nomeCliente ?? ''}</p>
      <span className={`${styles.estado} ${styles[pedido.status]}`}>{ROTULO[pedido.status]}</span>
    </article>
  )
}

export default CardPedido