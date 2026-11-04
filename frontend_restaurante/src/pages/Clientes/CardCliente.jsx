import { formatarTelefone } from '../../utils/formatacao'
import styles from './CardCliente.module.css'

function CardCliente({ cliente, onEditar }) {
  return (
    <article className={styles.card}>
      <header className={styles.topo}>
        <h3 className={styles.nome}>{cliente.nome}</h3>
        <button className={styles.editar} onClick={() => onEditar(cliente)} aria-label="Editar cliente">
          ✎
        </button>
      </header>
      <p className={styles.telefone}>Telefone: {formatarTelefone(cliente.telefone)}</p>
    </article>
  )
}

export default CardCliente