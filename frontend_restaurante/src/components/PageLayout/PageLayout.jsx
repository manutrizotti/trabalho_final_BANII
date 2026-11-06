import Navbar from '../Navbar/Navbar'
import styles from './PageLayout.module.css'

function PageLayout({ fundo, lado = 'direita', largura = '55%', posicao = 'center', children }) {
  const estilo = fundo
    ? {
        '--foto': `url(/fundos/${fundo})`,
        '--largura': largura,
        '--posicao': posicao,
      }
    : {}

  return (
    <div
      className={`${styles.pagina} ${fundo ? styles.comFundo : ''} ${lado === 'esquerda' ? styles.esquerda : styles.direita}`}
      style={estilo}
    >
      <Navbar />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}

export default PageLayout