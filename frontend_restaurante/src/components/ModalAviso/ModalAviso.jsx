import styles from './ModalAviso.module.css'

function ModalAviso({ tipo, mensagem, onConfirmar, onCancelar, onFechar }) {
  const ehErro = tipo === 'confirmar'

  return (
    <div className={styles.fundo} onMouseDown={onFechar || onCancelar}>
      <div
        className={`${styles.caixa} ${ehErro ? styles.vermelho : styles.verde}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`${styles.icone} ${ehErro ? styles.iconeVermelho : styles.iconeVerde}`}>
          {ehErro ? '✕' : '✓'}
        </div>
        <p className={styles.mensagem}>{mensagem}</p>
        {ehErro && (
          <div className={styles.botoes}>
            <button className={styles.cancelar} onClick={onCancelar}>Cancelar</button>
            <button className={styles.confirmar} onClick={onConfirmar}>Confirmar</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModalAviso