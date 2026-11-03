import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal/Modal'
import { cardapioService } from '../../services/cardapioService'
import styles from './ModalItem.module.css'

const CATEGORIAS = [
  { valor: 'entradas', rotulo: 'Entrada' },
  { valor: 'pratos principais', rotulo: 'Prato principal' },
  { valor: 'sobremesas', rotulo: 'Sobremesa' },
  { valor: 'bebidas alcoólicas', rotulo: 'Bebida alcoólica' },
  { valor: 'bebidas não alcoólicas', rotulo: 'Bebida não alcoólica' },
]

const VAZIO = {
  codigo: '',
  categoria: '',
  nome: '',
  descricao: '',
  preco: '',
  tempoPreparoMinutos: 0,
  disponivel: true,
}

// item: quando for edição, o item existente. Quando nulo, é inserção.
function ModalItem({ item, onFechar, onSalvar, onExcluir }) {
  const editando = Boolean(item)
  const [aba, setAba] = useState(item?.ehCombo ? 'combo' : 'item')
  const [form, setForm] = useState(
    item
      ? {
          codigo: item.codigo,
          categoria: item.categoria ?? '',
          nome: item.nome,
          descricao: item.descricao,
          preco: String(item.preco),
          tempoPreparoMinutos: item.tempoPreparoMinutos,
          disponivel: item.disponivel,
        }
      : VAZIO,
  )
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  // composição do combo: { [idItem]: quantidade }
  const [selecionados, setSelecionados] = useState({})
  const [todosItens, setTodosItens] = useState([])

  const ehCombo = aba === 'combo'

  useEffect(() => {
    cardapioService.listar().then((lista) => setTodosItens(lista.filter((i) => !i.ehCombo)))
  }, [])

  useEffect(() => {
    if (editando && item.ehCombo) {
      cardapioService.listarComposicao(item.id).then((comp) => {
        const mapa = {}
        comp.forEach((c) => { mapa[c.idItem] = c.quantidade })
        setSelecionados(mapa)
      })
    }
  }, [editando, item])

  // itens do combo primeiro (como você pediu), depois os demais; cada grupo em ordem alfabética
  const itensOrdenados = useMemo(() => {
    const dentro = todosItens.filter((i) => selecionados[i.id] !== undefined)
    const fora = todosItens.filter((i) => selecionados[i.id] === undefined)
    return [...dentro, ...fora]
  }, [todosItens, selecionados])

  function mudar(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }))
  }

  function alternarItem(id) {
    setSelecionados((s) => {
      const novo = { ...s }
      if (novo[id] !== undefined) delete novo[id]
      else novo[id] = 1
      return novo
    })
  }

  function mudarQuantidade(id, delta) {
    setSelecionados((s) => {
      const atual = s[id] ?? 1
      const nova = Math.min(99, Math.max(1, atual + delta))
      return { ...s, [id]: nova }
    })
  }

  async function salvar() {
    setErro('')
    setSalvando(true)
    try {
      const preco = Number(String(form.preco).replace(',', '.'))
      const itens = Object.entries(selecionados).map(([idItem, quantidade]) => ({ idItem, quantidade }))

      if (editando) {
        const salvo = await cardapioService.atualizar(item.id, {
          nome: form.nome,
          descricao: form.descricao,
          preco,
          tempoPreparoMinutos: Number(form.tempoPreparoMinutos),
          disponivel: form.disponivel,
        })
        if (item.ehCombo) await cardapioService.atualizarComposicao(item.id, itens)
        onSalvar(salvo)
      } else {
        const salvo = await cardapioService.criar({
          codigo: form.codigo,
          categoria: ehCombo ? null : form.categoria,
          nome: form.nome,
          descricao: form.descricao,
          preco,
          tempoPreparoMinutos: Number(form.tempoPreparoMinutos),
          ehCombo,
          itens: ehCombo ? itens : undefined,
        })
        onSalvar(salvo)
      }
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const titulo = editando ? 'Editar item' : 'Inserir item'
  // ao editar, a aba não troca: item continua item e combo continua combo
  const abaTravada = editando

  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      <div className={styles.abas}>
        <button
          className={`${styles.aba} ${aba === 'item' ? styles.abaAtiva : ''}`}
          onClick={() => !abaTravada && setAba('item')}
          disabled={abaTravada && aba !== 'item'}
        >
          ITEM
        </button>
        <button
          className={`${styles.aba} ${aba === 'combo' ? styles.abaAtiva : ''}`}
          onClick={() => !abaTravada && setAba('combo')}
          disabled={abaTravada && aba !== 'combo'}
        >
          COMBO
        </button>
      </div>

      <div className={styles.corpo}>
        <label className={styles.rotulo}>Informe o nome do produto</label>
        <input
          className={styles.campo}
          value={form.nome}
          maxLength={60}
          onChange={(e) => mudar('nome', e.target.value)}
          placeholder="Texto"
        />

        <div className={styles.linha}>
          <div className={styles.coluna}>
            <label className={styles.rotulo}>Informe o código do produto</label>
            <input
              className={`${styles.campo} ${editando ? styles.desabilitado : ''}`}
              value={form.codigo}
              maxLength={10}
              disabled={editando}
              onChange={(e) => mudar('codigo', e.target.value)}
              placeholder="Texto"
            />
          </div>

          {!ehCombo && (
            <div className={styles.coluna}>
              <label className={styles.rotulo}>Selecione a categoria</label>
              <select
                className={`${styles.campo} ${editando ? styles.desabilitado : ''}`}
                value={form.categoria}
                disabled={editando}
                onChange={(e) => mudar('categoria', e.target.value)}
              >
                <option value="">Selecione a categoria</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.rotulo}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {ehCombo && (
          <>
            <label className={styles.rotulo}>Itens do combo</label>
            <ul className={styles.listaCombo}>
              {itensOrdenados.map((i) => {
                const qtd = selecionados[i.id]
                const dentro = qtd !== undefined
                return (
                  <li key={i.id} className={`${styles.itemCombo} ${dentro ? styles.itemDentro : ''}`}>
                    <span className={styles.nomeCombo}>{i.nome}</span>
                    {dentro ? (
                      <div className={styles.controleQtd}>
                        <button className={styles.botaoQtd} onClick={() => alternarItem(i.id)} aria-label="Remover do combo">−</button>
                        <button className={styles.setinha} onClick={() => mudarQuantidade(i.id, -1)}>‹</button>
                        <span className={styles.qtd}>{qtd}</span>
                        <button className={styles.setinha} onClick={() => mudarQuantidade(i.id, 1)}>›</button>
                      </div>
                    ) : (
                      <button className={styles.botaoQtd} onClick={() => alternarItem(i.id)} aria-label="Adicionar ao combo">+</button>
                    )}
                  </li>
                )
              })}
              {itensOrdenados.length === 0 && <li className={styles.vazio}>Cadastre itens antes de montar um combo.</li>}
            </ul>
          </>
        )}

        <label className={styles.rotulo}>Descreva o produto</label>
        <textarea
          className={`${styles.campo} ${styles.descricao}`}
          value={form.descricao}
          maxLength={150}
          onChange={(e) => mudar('descricao', e.target.value)}
        />
        <small className={styles.contador}>{form.descricao.length}/150</small>

        <div className={styles.linha}>
          <div className={styles.coluna}>
            <label className={styles.rotulo}>Informe o preço do produto</label>
            <div className={styles.comPrefixo}>
              <span>R$</span>
              <input
                className={styles.campoSemBorda}
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => mudar('preco', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className={styles.coluna}>
            <label className={styles.rotulo}>Tempo de preparo</label>
            <div className={styles.comPrefixo}>
              <input
                className={styles.campoSemBorda}
                type="number"
                min="0"
                max="240"
                value={form.tempoPreparoMinutos}
                onChange={(e) => mudar('tempoPreparoMinutos', e.target.value)}
              />
              <span>minutos</span>
            </div>
          </div>
        </div>

        {erro && <p className={styles.erro}>{erro}</p>}

        <div className={styles.rodape}>
          {editando ? (
            <div className={styles.esquerda}>
              <button className={styles.excluir} onClick={() => onExcluir(item)}>🗑 Excluir item</button>
              <button
                className={`${styles.disp} ${form.disponivel ? styles.dispSim : styles.dispNao}`}
                onClick={() => mudar('disponivel', !form.disponivel)}
              >
                {form.disponivel ? 'Disponível' : 'Indisponível'}
              </button>
            </div>
          ) : <span />}

          <div className={styles.direita}>
            <button className={styles.icone} onClick={onFechar} aria-label="Cancelar">✕</button>
            <button className={styles.icone} onClick={salvar} disabled={salvando} aria-label="Salvar">💾</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ModalItem