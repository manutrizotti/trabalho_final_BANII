import Navbar from '../Navbar/Navbar'
import styles from './PageLayout.module.css'

function PageLayout({ fundo, children }) {
  const estiloFundo = fundo
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 100%), url(/fundos/${fundo})`,
      }
    : {}

  return (
    <div className={styles.pagina} style={estiloFundo}>
      <Navbar />
      <main className={styles.conteudo}>{children}</main>
    </div>
  )
}

export default PageLayout