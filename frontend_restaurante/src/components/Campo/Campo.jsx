import styles from './Campo.module.css'

function Campo({ rotulo, obrigatorio = false, erro, className = '', children }) {
  return (
    <div className={`${styles.campo} ${className}`}>
      <label className={styles.rotulo}>
        {rotulo}
        {obrigatorio && <span className={styles.asterisco} aria-hidden="true"> *</span>}
      </label>
      {children}
      {erro && <p className={styles.erro} role="alert">{erro}</p>}
    </div>
  )
}

export default Campo