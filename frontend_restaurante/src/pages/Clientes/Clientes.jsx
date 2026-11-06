import { useCallback, useEffect, useState } from 'react'
import PageLayout from '../../components/PageLayout/PageLayout'
import ModalAviso from '../../components/ModalAviso/ModalAviso'
import { clienteService } from '../../services/clienteService'
import CardCliente from './CardCliente'
import ModalCliente from './ModalCliente'
import styles from './Clientes.module.css'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState('')

  // modal: null | { cliente: objeto|null }
  const [modal, setModal] = useState(null)
  const [paraExcluir, setParaExcluir] = useState(null)
  const [sucesso, setSucesso] = useState('')

  const carregar = useCallback(async () => {
    try {
      setErro('')
      setClientes(await clienteService.listar({ nome: busca.trim() || undefined }))
    } catch (e) {
      setErro(e.message)
    }
  }, [busca])

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

  async function confirmarExclusao() {
    try {
      await clienteService.excluir(paraExcluir.id)
      setParaExcluir(null)
      setModal(null)
      mostrarSucesso('Cliente excluído com sucesso!')
      carregar()
    } catch (e) {
      setParaExcluir(null)
      setModal(null)
      setErro(e.message)
    }
  }

  return (
    <PageLayout fundo="clientes.jpg" lado="esquerda">
      <div className={styles.busca}>
        <input
          className={styles.campoBusca}
          placeholder="Pesquisar cliente"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <span aria-hidden="true">🔍</span>
      </div>

      {erro && <p className={styles.erro}>{erro}</p>}

      <button className={styles.adicionar} onClick={() => setModal({ cliente: null })}>
        + Adicionar cliente
      </button>

      <div className={styles.lista}>
        {clientes.map((c) => (
          <CardCliente key={c.id} cliente={c} onEditar={(cliente) => setModal({ cliente })} />
        ))}
        {clientes.length === 0 && !erro && <p className={styles.vazio}>Nenhum cliente encontrado.</p>}
      </div>

      {modal && (
        <ModalCliente
          cliente={modal.cliente}
          onFechar={() => setModal(null)}
          onSalvar={aoSalvar}
          onExcluir={(c) => setParaExcluir(c)}
        />
      )}

      {paraExcluir && (
        <ModalAviso
          tipo="confirmar"
          mensagem="Tem certeza de que deseja excluir esse cliente?"
          onCancelar={() => setParaExcluir(null)}
          onConfirmar={confirmarExclusao}
        />
      )}

      {sucesso && <ModalAviso tipo="sucesso" mensagem={sucesso} onFechar={() => setSucesso('')} />}
    </PageLayout>
  )
}

export default Clientes