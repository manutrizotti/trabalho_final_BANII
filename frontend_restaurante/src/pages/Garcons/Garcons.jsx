import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/PageLayout/PageLayout'
import ModalAviso from '../../components/ModalAviso/ModalAviso'
import { garcomService } from '../../services/garcomService'
import CardGarcom from './CardGarcom'
import ModalGarcom from './ModalGarcom'
import styles from './Garcons.module.css'

const FILTROS = [
  { valor: 'ativo', rotulo: 'Garçons ativos' },
  { valor: 'de ferias', rotulo: 'Garçons de férias' },
  { valor: 'demitido', rotulo: 'Garçons demitidos' },
  { valor: 'todos', rotulo: 'Todos os garçons' },
]

function Garcons() {
  const [garcons, setGarcons] = useState([])
  const [status, setStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')

  // modal: null | { garcom: objeto|null }
  const [modal, setModal] = useState(null)
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    try {
      setErro('')
      setGarcons(await garcomService.listar({ status, nome: busca.trim() || undefined }))
    } catch (e) {
      setErro(e.message)
    }
  }, [status, busca])

  useEffect(() => {
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [carregar])

  function aoSalvar() {
    setModal(null)
    setSucesso('Salvo com sucesso!')
    carregar()
    setTimeout(() => setSucesso(''), 1500)
  }

  return (
    <PageLayout fundo="garcons.jpg">
      <div className={styles.barra}>
        <div className={styles.busca}>
          <input
            className={styles.campoBusca}
            placeholder="Pesquisar garçom"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span aria-hidden="true">🔍</span>
        </div>

        <div className={styles.filtros}>
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              className={`${styles.filtro} ${status === f.valor ? styles.filtroAtivo : ''}`}
              onClick={() => setStatus(f.valor)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <button className={styles.adicionar} onClick={() => setModal({ garcom: null })}>
        + Adicionar garçom
      </button>

      <div className={styles.lista}>
        {garcons.map((g) => (
          <CardGarcom key={g.id} garcom={g} onEditar={(garcom) => setModal({ garcom })} />
        ))}
        {garcons.length === 0 && !erro && <p className={styles.vazio}>Nenhum garçom encontrado.</p>}
      </div>

      {modal && (
        <ModalGarcom garcom={modal.garcom} onFechar={() => setModal(null)} onSalvar={aoSalvar} />
      )}

      {sucesso && <ModalAviso tipo="sucesso" mensagem={sucesso} onFechar={() => setSucesso('')} />}
    </PageLayout>
  )
}

export default Garcons