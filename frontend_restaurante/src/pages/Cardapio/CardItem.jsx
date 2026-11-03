import styles from './CardItem.module.css'

function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CardItem({ item, onEditar }) {
  return (
    <article className={styles.card}>
      <button className={styles.editar} onClick={() => onEditar(item)} aria-label="Editar item">
        ✎
      </button>

      <div className={styles.texto}>
        <h3 className={styles.nome}>
          {item.nome} - {formatarPreco(item.preco)}
        </h3>
        <p className={styles.descricao}>{item.descricao}</p>
      </div>

      <div className={styles.tags}>
        <span className={styles.tag}>{item.codigo}</span>
        <span className={styles.tag}>{item.tempoPreparoMinutos} min</span>
        <span className={styles.tag}>{item.disponivel ? 'DISPONÍVEL' : 'INDISPONÍVEL'}</span>
      </div>

      <div className={styles.foto}>
        {/* a foto virá depois; por ora só o ícone */}
        <span>📷</span>
      </div>
    </article>
  )
}

export default CardItem