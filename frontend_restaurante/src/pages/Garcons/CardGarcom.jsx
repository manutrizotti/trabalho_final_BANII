import { formatarCpf, formatarData } from '../../utils/formatacao'
import styles from './CardGarcom.module.css'

const STATUS = {
  ativo: { rotulo: 'ATIVO', classe: 'statusAtivo' },
  'de ferias': { rotulo: 'DE FÉRIAS', classe: 'statusFerias' },
  demitido: { rotulo: 'DEMITIDO', classe: 'statusDemitido' },
}

function CardGarcom({ garcom, onEditar }) {
  const st = STATUS[garcom.status]

  return (
    <article className={styles.card}>
      <div className={styles.principal}>
        <div className={styles.identificacao}>
          <h3 className={styles.nome}>{garcom.nome}</h3>
          <p className={styles.codigo}>{garcom.codigo}</p>
        </div>

        <dl className={styles.dados}>
          <div className={styles.linha}><dt>CPF</dt><dd>{formatarCpf(garcom.cpf)}</dd></div>
          <div className={styles.linha}><dt>DATA DE ADMISSÃO</dt><dd>{formatarData(garcom.dataAdmissao)}</dd></div>
          <div className={styles.linha}><dt>PERCENTUAL DE COMISSÃO</dt><dd>{garcom.comissao}%</dd></div>
        </dl>

        <button className={styles.editar} onClick={() => onEditar(garcom)} aria-label="Editar garçom">
          ✎
        </button>
      </div>

      <footer className={`${styles.rodape} ${styles[st.classe]}`}>{st.rotulo}</footer>
    </article>
  )
}

export default CardGarcom