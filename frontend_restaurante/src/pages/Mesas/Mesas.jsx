import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/PageLayout/PageLayout'
import ModalAviso from '../../components/ModalAviso/ModalAviso'
import { mesaService } from '../../services/mesaService'
import CardMesa from './CardMesa'
import ModalMesa from './ModalMesa'
import styles from './Mesas.module.css'
const FILTRO_LOCALIZACAO = [
  { valor: 'todas', rotulo: 'Todas as localizações' },
  { valor: 'salão', rotulo: 'Salão' },
  { valor: 'varanda', rotulo: 'Varanda' },
  { valor: 'mezanino', rotulo: 'Mezanino' },
]

function Mesas() {
  const [mesas, setMesas] = useState([])
  const [somenteLivres, setSomenteLivres] = useState(false)
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')
  const [localizacao, setLocalizacao] = useState('todas')

  // modal: null | { mesa: objeto|null }
  const [modal, setModal] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    try {
      setErro('')
      setMesas(
        await mesaService.listar({
          busca: busca.trim() || undefined,
          livres: somenteLivres,
          localizacao,
        }),
      )
    } catch (e) {
      setErro(e.message)
    }
  }, [busca, somenteLivres, localizacao])

  useEffect(() => {
    const t = setTimeout(carregar, 300)
    return () => clearTimeout(t)
  }, [carregar])

  function mostrarSucesso(mensagem, ms = 1500) {
    setSucesso(mensagem)
    setTimeout(() => setSucesso(''), ms)
  }

  function aoSalvar() {
    setModal(null)
    mostrarSucesso('Salvo com sucesso!')
    carregar()
  }

  async function recuperar(mesa) {
    try {
      await mesaService.alterarStatus(mesa.id, 'ativa')
      carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  async function confirmarExclusao() {
    try {
      const r = await mesaService.remover(paraExcluir.id)
      setParaExcluir(null)
      setModal(null)
      mostrarSucesso(
        r.comHistorico
          ? 'A mesa tem histórico, por isso foi removida da lista, mas os registros foram mantidos.'
          : 'Mesa excluída com sucesso!',
        2500,
      )
      carregar()
    } catch (e) {
      setParaExcluir(null)
      setModal(null)
      setErro(e.message)
    }
  }

  return (
    <PageLayout fundo="mesas.jpg">
      <div className={styles.barra}>
        <div className={styles.busca}>
          <input
            className={styles.campoBusca}
            placeholder="Pesquisar mesa"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span aria-hidden="true">🔍</span>
        </div>
        <button
          className={`${styles.filtro} ${somenteLivres ? styles.filtroAtivo : ''}`}
          onClick={() => setSomenteLivres(true)}
        >
          Exibir mesas livres
        </button>
        <button
          className={`${styles.filtro} ${!somenteLivres ? styles.filtroAtivo : ''}`}
          onClick={() => setSomenteLivres(false)}
        >
          Exibir todas as mesas
        </button>
        <select
          className={styles.filtro}
          value={localizacao}
          onChange={(e) => setLocalizacao(e.target.value)}
        >
          {FILTRO_LOCALIZACAO.map((l) => (
            <option key={l.valor} value={l.valor}>{l.rotulo}</option>
          ))}
        </select>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.grade}>
        <button className={styles.adicionar} onClick={() => setModal({ mesa: null })}>
          <span className={styles.mais}>+</span>
          Adicionar mesa
        </button>

        {mesas.map((m) => (
          <CardMesa
            key={m.id}
            mesa={m}
            onMenu={(mesa) => setModal({ mesa })}
            onRecuperar={recuperar}
            onOcupar={() => {/* a abertura do pedido entra na aba Pedidos */}}
            onVisualizar={() => {/* idem: levar para o pedido aberto */}}
          />
        ))}
      </div>

      {mesas.length === 0 && !erro && <p className={styles.vazio}>Nenhuma mesa encontrada.</p>}

      {modal && (
        <ModalMesa
          mesa={modal.mesa}
          onFechar={() => setModal(null)}
          onSalvar={aoSalvar}
          onExcluir={(m) => setParaExcluir(m)}
        />
      )}

      {paraExcluir && (
        <ModalAviso
          tipo="confirmar"
          mensagem="Tem certeza de que deseja excluir essa mesa?"
          onCancelar={() => setParaExcluir(null)}
          onConfirmar={confirmarExclusao}
        />
      )}

      {sucesso && <ModalAviso tipo="sucesso" mensagem={sucesso} onFechar={() => setSucesso('')} />}
    </PageLayout>
  )
}

export default Mesas