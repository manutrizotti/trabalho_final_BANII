import styles from './CardMesa.module.css'

function CardMesa({ mesa, onMenu, onRecuperar, onOcupar, onVisualizar }) {
  const quebrada = mesa.status === 'quebrada'
  const ocupada = Boolean(mesa.idPedidoAberto)

  let rotulo = 'Ocupar'
  let acao = () => onOcupar(mesa)
  if (quebrada) {
    rotulo = 'Recuperar mesa'
    acao = () => onRecuperar(mesa)
  } else if (ocupada) {
    rotulo = 'Visualizar pedido'
    acao = () => onVisualizar(mesa)
  }

  return (
    <article className={styles.card}>
      <header className={styles.topo}>
        <h3 className={`${styles.titulo} ${quebrada ? styles.riscado : ''}`}>MESA {mesa.numero}</h3>
        <button className={styles.menu} onClick={() => onMenu(mesa)} aria-label="Editar mesa">
          ☰
        </button>
      </header>

      <p>Local: {mesa.localizacao}</p>
      <p>Capacidade: {mesa.capacidade}</p>
      <p>Status: {mesa.status}</p>

      {mesa.reservaHoje && (
        <div className={styles.selo}>
          <strong>Reservada às {mesa.reservaHoje.hora}</strong>
          <span>{mesa.reservaHoje.nomeCliente}</span>
        </div>
      )}

      <button className={styles.acao} onClick={acao}>{rotulo}</button>
    </article>
  )
}

export default CardMesa