import styles from './CardCozinha.module.css'

const ACAO = {
  'aguardando preparo': { rotulo: 'Começar preparo', classe: 'comecar' },
  'em preparo': { rotulo: 'Finalizar', classe: 'finalizar' },
  pronto: { rotulo: 'Servir', classe: 'servir' },
}

function CardCozinha({ item, desabilitado, onAvancar }) {
  const acao = ACAO[item.status]

  return (
    <article className={styles.card}>
      <span className={styles.furo} />
      <p className={styles.prato}>{item.nomeProduto}</p>
      <p>{item.numeroMesa ? `Mesa ${item.numeroMesa}` : 'Delivery'}</p>
      <p>{item.quantidade} {item.quantidade === 1 ? 'unidade' : 'unidades'}</p>
      <button
        className={`${styles.botao} ${styles[acao.classe]}`}
        onClick={() => onAvancar(item)}
        disabled={desabilitado}
      >
        {acao.rotulo}
      </button>
    </article>
  )
}

export default CardCozinha