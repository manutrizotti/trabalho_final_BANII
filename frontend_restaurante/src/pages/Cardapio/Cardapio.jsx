import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/PageLayout/PageLayout'
import ModalAviso from '../../components/ModalAviso/ModalAviso'
import { cardapioService } from '../../services/cardapioService'
import CardItem from './CardItem'
import ModalItem from './ModalItem'
import styles from './Cardapio.module.css'

const FILTRO_CATEGORIA = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'combos', rotulo: 'Combos' },
  { valor: 'entradas', rotulo: 'Entradas' },
  { valor: 'pratos principais', rotulo: 'Pratos principais' },
  { valor: 'sobremesas', rotulo: 'Sobremesas' },
  { valor: 'bebidas alcoólicas', rotulo: 'Bebidas alcoólicas' },
  { valor: 'bebidas não alcoólicas', rotulo: 'Bebidas não alcoólicas' },
]

const FILTRO_ESTADO = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'true', rotulo: 'Disponível' },
  { valor: 'false', rotulo: 'Indisponível' },
]

function Cardapio() {
  const [itens, setItens] = useState([])
  const [categoria, setCategoria] = useState('todas')
  const [estado, setEstado] = useState('todos')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')

  // modal: null | { item: objeto|null }
  const [modal, setModal] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    try {
      setErro('')
      const lista = await cardapioService.listar({
        categoria,
        disponivel: estado === 'todos' ? undefined : estado === 'true',
        nome: busca.trim() || undefined,
      })
      setItens(lista)
    } catch (e) {
      setErro(e.message)
    }
  }, [categoria, estado, busca])

  // recarrega ao mudar qualquer filtro (a busca espera 300ms depois de parar de digitar)
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

  async function confirmarExclusao() {
    try {
      const resultado = await cardapioService.excluir(paraExcluir.id)
      setParaExcluir(null)
      setModal(null)
      setSucesso(
        resultado.inativado
          ? 'O item já foi vendido, por isso foi inativado em vez de excluído.'
          : 'Item excluído com sucesso!',
      )
      carregar()
      setTimeout(() => setSucesso(''), 2500)
    } catch (e) {
      setParaExcluir(null)
      setErro(e.message)
    }
  }

  async function enviarImagem(item, arquivo) {
    try {
      setErro('')
      await cardapioService.enviarImagem(item.id, arquivo)
      carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  async function removerImagem(item) {
    try {
      setErro('')
      await cardapioService.removerImagem(item.id)
      carregar()
    } catch (e) {
      setErro(e.message)
    }
  }

  return (
    <PageLayout fundo="cardapio.jpg">
      <div className={styles.barra}>
        <div className={styles.filtros}>
          <select className={styles.select} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {FILTRO_CATEGORIA.map((c) => (
              <option key={c.valor} value={c.valor}>{c.rotulo}</option>
            ))}
          </select>
          <select className={styles.select} value={estado} onChange={(e) => setEstado(e.target.value)}>
            {FILTRO_ESTADO.map((c) => (
              <option key={c.valor} value={c.valor}>{c.rotulo}</option>
            ))}
          </select>
        </div>

        <input
          className={styles.busca}
          placeholder="Pesquisar item"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <button className={styles.adicionar} onClick={() => setModal({ item: null })}>
        + Adicionar item ao cardápio
      </button>

      <div className={styles.lista}>
        {itens.map((item) => (
          <CardItem
            key={item.id}
            item={item}
            onEditar={(i) => setModal({ item: i })}
            onImagem={enviarImagem}
            onRemoverImagem={removerImagem}
            onErro={setErro}
          />
        ))}
        {itens.length === 0 && !erro && <p className={styles.vazio}>Nenhum item encontrado.</p>}
      </div>

      {modal && (
        <ModalItem
          item={modal.item}
          onFechar={() => setModal(null)}
          onSalvar={aoSalvar}
          onExcluir={(i) => setParaExcluir(i)}
        />
      )}

      {paraExcluir && (
        <ModalAviso
          tipo="confirmar"
          mensagem="Tem certeza de que deseja excluir esse item?"
          onCancelar={() => setParaExcluir(null)}
          onConfirmar={confirmarExclusao}
        />
      )}

      {sucesso && <ModalAviso tipo="sucesso" mensagem={sucesso} onFechar={() => setSucesso('')} />}
    </PageLayout>
  )
}

export default Cardapio