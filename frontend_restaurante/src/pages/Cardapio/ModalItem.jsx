import { useEffect, useMemo, useState } from 'react'
import Modal from '../../components/Modal/Modal'
import Campo from '../../components/Campo/Campo'
import { cardapioService } from '../../services/cardapioService'
import styles from './ModalItem.module.css'

const CATEGORIAS = [
  { valor: 'entradas', rotulo: 'Entrada' },
  { valor: 'pratos principais', rotulo: 'Prato principal' },
  { valor: 'sobremesas', rotulo: 'Sobremesa' },
  { valor: 'bebidas alcoólicas', rotulo: 'Bebida alcoólica' },
  { valor: 'bebidas não alcoólicas', rotulo: 'Bebida não alcoólica' },
]

const MAX_NOME = 60
const MAX_CODIGO = 10
const MAX_DESCRICAO = 300
const MAX_PRECO = 9999.99
const MAX_TEMPO = 240

const VAZIO = {
  codigo: '',
  categoria: '',
  nome: '',
  descricao: '',
  preco: '',
  tempoPreparoMinutos: '', // vazio de propósito: é obrigatório (0 é permitido)
  disponivel: true,
}

const vazio = (v) => String(v ?? '').trim() === ''

// Retorna { campo: mensagem } na ordem: nome, código, categoria, (itens), descrição, preço, tempo
function validar(form, { editando, ehCombo, qtdItens }) {
  const e = {}

  if (vazio(form.nome)) e.nome = 'Informe o nome do produto.'

  if (!editando) {
    if (vazio(form.codigo)) e.codigo = 'Informe o código do produto.'
    if (!ehCombo && !form.categoria) e.categoria = 'Selecione uma categoria.'
  }

  if (ehCombo && qtdItens === 0) e.itens = 'Adicione ao menos um item ao combo.'

  if (vazio(form.descricao)) e.descricao = 'Descreva o produto.'

  if (vazio(form.preco)) {
    e.preco = 'Informe o preço do produto.'
  } else {
    const preco = Number(String(form.preco).replace(',', '.'))
    if (!Number.isFinite(preco) || preco <= 0 || preco > MAX_PRECO) {
      e.preco = 'O preço deve estar entre 0,01 e 9999,99.'
    }
  }

  if (vazio(form.tempoPreparoMinutos)) {
    e.tempo = 'Informe o tempo de preparo.'
  } else {
    const t = Number(form.tempoPreparoMinutos)
    if (!Number.isInteger(t) || t < 0 || t > MAX_TEMPO) {
      e.tempo = `O tempo deve ser um inteiro entre 0 e ${MAX_TEMPO} minutos.`
    }
  }

  return e
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
          tempoPreparoMinutos: String(item.tempoPreparoMinutos),
          disponivel: item.disponivel,
        }
      : VAZIO,
  )
  const [errosCampo, setErrosCampo] = useState({})
  const [erro, setErro] = useState('') // erro geral (vindo do servidor)
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

  const itensOrdenados = useMemo(() => {
    const dentro = todosItens.filter((i) => selecionados[i.id] !== undefined)
    const fora = todosItens.filter((i) => selecionados[i.id] === undefined)
    return [...dentro, ...fora]
  }, [todosItens, selecionados])

  // limpa o erro do campo assim que a pessoa mexe nele
  function limparErro(chave) {
    setErrosCampo((e) => {
      if (!e[chave]) return e
      const { [chave]: _, ...resto } = e
      return resto
    })
  }

  function mudar(campo, valor, chaveErro = campo) {
    setForm((f) => ({ ...f, [campo]: valor }))
    limparErro(chaveErro)
    setErro('')
  }

  function alternarItem(id) {
    setSelecionados((s) => {
      const novo = { ...s }
      if (novo[id] !== undefined) delete novo[id]
      else novo[id] = 1
      return novo
    })
    limparErro('itens')
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

    const erros = validar(form, { editando, ehCombo, qtdItens: Object.keys(selecionados).length })
    setErrosCampo(erros)
    if (Object.keys(erros).length > 0) return // não chama a API

    setSalvando(true)
    try {
      const preco = Number(String(form.preco).replace(',', '.'))
      const tempo = Number(form.tempoPreparoMinutos)
      const itens = Object.entries(selecionados).map(([idItem, quantidade]) => ({ idItem, quantidade }))

      if (editando) {
        const salvo = await cardapioService.atualizar(item.id, {
          nome: form.nome,
          descricao: form.descricao,
          preco,
          tempoPreparoMinutos: tempo,
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
          tempoPreparoMinutos: tempo,
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
  const abaTravada = editando
  const cls = (chave, extra = '') =>
    `${styles.campo} ${extra} ${errosCampo[chave] ? styles.invalido : ''}`

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
        <Campo rotulo="Informe o nome do produto" obrigatorio erro={errosCampo.nome}>
          <input
            className={cls('nome')}
            value={form.nome}
            maxLength={MAX_NOME}
            onChange={(e) => mudar('nome', e.target.value)}
            placeholder="Texto"
          />
        </Campo>

        <div className={styles.linha}>
          <Campo rotulo="Informe o código do produto" obrigatorio={!editando} erro={errosCampo.codigo}>
            <input
              className={cls('codigo', editando ? styles.desabilitado : '')}
              value={form.codigo}
              maxLength={MAX_CODIGO}
              disabled={editando}
              onChange={(e) => mudar('codigo', e.target.value)}
              placeholder="Texto"
            />
          </Campo>

          {!ehCombo && (
            <Campo rotulo="Selecione a categoria" obrigatorio={!editando} erro={errosCampo.categoria}>
              <select
                className={cls('categoria', editando ? styles.desabilitado : '')}
                value={form.categoria}
                disabled={editando}
                onChange={(e) => mudar('categoria', e.target.value)}
              >
                <option value="">Selecione a categoria</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.rotulo}</option>
                ))}
              </select>
            </Campo>
          )}
        </div>

        {ehCombo && (
          <Campo rotulo="Itens do combo" obrigatorio erro={errosCampo.itens}>
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
          </Campo>
        )}

        <Campo rotulo="Descreva o produto" obrigatorio erro={errosCampo.descricao}>
          <textarea
            className={cls('descricao', styles.descricao)}
            value={form.descricao}
            maxLength={MAX_DESCRICAO}
            onChange={(e) => mudar('descricao', e.target.value)}
          />
          <small className={styles.contador}>{form.descricao.length}/{MAX_DESCRICAO}</small>
        </Campo>

        <div className={styles.linha}>
          <Campo rotulo="Informe o preço do produto" obrigatorio erro={errosCampo.preco}>
            <div className={`${styles.comPrefixo} ${errosCampo.preco ? styles.invalido : ''}`}>
              <span>R$</span>
              <input
                className={styles.campoSemBorda}
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => mudar('preco', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </Campo>

          <Campo rotulo="Tempo de preparo" obrigatorio erro={errosCampo.tempo}>
            <div className={`${styles.comPrefixo} ${errosCampo.tempo ? styles.invalido : ''}`}>
              <input
                className={styles.campoSemBorda}
                type="number"
                min="0"
                max={MAX_TEMPO}
                value={form.tempoPreparoMinutos}
                onChange={(e) => mudar('tempoPreparoMinutos', e.target.value, 'tempo')}
              />
              <span>minutos</span>
            </div>
          </Campo>
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