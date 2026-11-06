import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/PageLayout/PageLayout'
import ModalAviso from '../../components/ModalAviso/ModalAviso'
import { pedidoService } from '../../services/pedidoService'
import CardPedido from './CardPedido'
import ModalNovoPedido from './ModalNovoPedido'
import styles from './Pedidos.module.css'
import ModalPedido from './ModalPedido'

const TIPOS = [
  { valor: 'todas', rotulo: 'Todas as categorias' },
  { valor: 'salao', rotulo: 'Salão' },
  { valor: 'delivery', rotulo: 'Delivery' },
]

const ESTADOS = [
  { valor: 'todos', rotulo: 'Todos os estados' },
  { valor: 'aberto', rotulo: 'Aberto' },
  { valor: 'fechado', rotulo: 'Fechado' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
]

function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [tipo, setTipo] = useState('todas')
  const [status, setStatus] = useState('todos')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [erro, setErro] = useState('')
  const [visualizando, setVisualizando] = useState(null)

  const [novo, setNovo] = useState(false)
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    try {
      setErro('')
      setPedidos(await pedidoService.listar({ tipo, status, inicio, fim }))
    } catch (e) {
      setErro(e.message)
    }
  }, [tipo, status, inicio, fim])

  useEffect(() => {
    carregar()
  }, [carregar])

  function aoSalvar() {
    setNovo(false)
    setSucesso('Pedido aberto com sucesso!')
    carregar()
    setTimeout(() => setSucesso(''), 1500)
  }

  return (
    <PageLayout fundo="pedidos.jpg">
      <div className={styles.filtros}>
        <select className={styles.campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
        </select>
        <select className={styles.campo} value={status} onChange={(e) => setStatus(e.target.value)}>
          {ESTADOS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
        </select>
        <label className={styles.data}>
          Data início
          <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <label className={styles.data}>
          Data fim
          <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </label>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <div className={styles.grade}>
        <button className={styles.adicionar} onClick={() => setNovo(true)}>
          <span className={styles.mais}>+</span>
          Adicionar pedido
        </button>

        {pedidos.map((p) => (
          <CardPedido
            key={p.id}
            pedido={p}
            onAbrir={(p) => setVisualizando(p.id)}
          />
        ))}
      </div>

      {pedidos.length === 0 && !erro && <p className={styles.vazio}>Nenhum pedido encontrado.</p>}

      {novo && <ModalNovoPedido onFechar={() => setNovo(false)} onSalvar={aoSalvar} />}

      {visualizando && (
        <ModalPedido idPedido={visualizando} onFechar={() => setVisualizando(null)} onAlterado={carregar} />
      )}

      {sucesso && <ModalAviso tipo="sucesso" mensagem={sucesso} onFechar={() => setSucesso('')} />}
    </PageLayout>
  )
}

export default Pedidos