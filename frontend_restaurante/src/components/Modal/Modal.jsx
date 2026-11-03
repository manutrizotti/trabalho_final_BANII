import styles from './Modal.module.css'

function Modal({ titulo, onFechar, children }) {
  return (
    <div className={styles.fundo} onMouseDown={onFechar}>
      <div className={styles.caixa} onMouseDown={(e) => e.stopPropagation()}>
        {titulo && <h2 className={styles.titulo}>{titulo}</h2>}
        {children}
      </div>
    </div>
  )
}

export default Modal