import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/PageLayout/PageLayout'
import { cozinhaService } from '../../services/cozinhaService'
import CardCozinha from './CardCozinha'
import styles from './Cozinha.module.css'

const INTERVALO_MS = 10000

function Cozinha() {
  const [itens, setItens] = useState([])
  const [erro, setErro] = useState('')
  const [processando, setProcessando] = useState(null)

  const carregar = useCallback(async () => {
    try {
      setErro('')
      setItens(await cozinhaService.listar())
    } catch (e) {
      setErro(e.message)
    }
  }, [])

  // recarrega sozinha: os itens novos vêm de outra aba
  useEffect(() => {
    carregar()
    const t = setInterval(carregar, INTERVALO_MS)
    return () => clearInterval(t)
  }, [carregar])

  async function avancar(item) {
    if (processando) return
    setProcessando(item.id)
    try {
      await cozinhaService.avancar(item.id)
    } catch (e) {
      setErro(e.message)
    } finally {
      setProcessando(null)
      carregar()
    }
  }

  return (
    <PageLayout>
      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.grade}>
        {itens.map((i) => (
          <CardCozinha key={i.id} item={i} desabilitado={processando === i.id} onAvancar={avancar} />
        ))}
      </div>

      {itens.length === 0 && !erro && <p className={styles.vazio}>Nenhum item na fila.</p>}
    </PageLayout>
  )
}

export default Cozinha