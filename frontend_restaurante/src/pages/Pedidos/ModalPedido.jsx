import { useEffect, useState } from 'react'
import Modal from '../../components/Modal/Modal'
import ModalAviso from '../../components/ModalAviso/ModalAviso'
import Campo from '../../components/Campo/Campo'
import { pedidoService } from '../../services/pedidoService'
import { cardapioService } from '../../services/cardapioService'
import styles from './ModalPedido.module.css'

const FORMAS = ['dinheiro', 'cartão de crédito', 'cartão de débito', 'PIX']
const MAX_OBSERVACOES = 200

const moeda = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ModalPedido({ idPedido, onFechar, onAlterado }) {
  const [pedido, setPedido] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState(null) // produto no mini-formulário
  const [qtd, setQtd] = useState(1)
  const [obs, setObs] = useState('')
  const [dez, setDez] = useState(false)
  const [forma, setForma] = useState('')
  const [valor, setValor] = useState('')
  const [erroPag, setErroPag] = useState({})
  const [erro, setErro] = useState('')
  const [erroItem, setErroItem] = useState('')
  const [confirmaCancelar, setConfirmaCancelar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [confirmaFechar, setConfirmaFechar] = useState(false)

  useEffect(() => {
    pedidoService.buscar(idPedido).then(setPedido).catch((e) => setErro(e.message))
  }, [idPedido])

  useEffect(() => {
    const t = setTimeout(() => {
      cardapioService
        .listar({ disponivel: true, nome: busca.trim() || undefined })
        .then(setProdutos)
        .catch((e) => setErro(e.message))
    }, 300)
    return () => clearTimeout(t)
  }, [busca])

  // executa uma ação do back e atualiza o pedido com a resposta
  async function executar(fn) {
    if (ocupado) return false
    setErro('')
    setOcupado(true)
    try {
      setPedido(await fn())
      onAlterado?.()
      return true
    } catch (e) {
      setErro(e.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  function escolher(produto) {
    setEscolhido(produto)
    setQtd(1)
    setObs('')
    setErroItem('')
  }

  async function confirmarItem() {
    const q = Number(qtd)
    if (!Number.isInteger(q) || q < 1 || q > 99) {
      setErroItem('A quantidade deve ser um inteiro entre 1 e 99.')
      return
    }
    const ok = await executar(() =>
      pedidoService.adicionarItem(idPedido, { idCardapio: escolhido.id, quantidade: q, observacoes: obs }),
    )
    if (ok) setEscolhido(null)
    else setEscolhido(null) // o erro aparece no modal do pedido
  }

  function pagar() {
    const e = {}
    if (!forma) e.forma = 'Selecione a forma de pagamento.'
    const v = Number(String(valor).replace(',', '.'))
    if (String(valor).trim() === '') e.valor = 'Informe o valor.'
    else if (!Number.isFinite(v) || v <= 0) e.valor = 'Informe um valor válido.'
    else if (Math.round(v * 100) > Math.round(pedido.restante * 100)) {
      e.valor = `O valor excede o restante (${moeda(pedido.restante)}).`
    }
    setErroPag(e)
    if (Object.keys(e).length > 0) return

    executar(async () => {
      const p = await pedidoService.pagar(idPedido, { forma, valor: v })
      setValor('')
      setForma('')
      return p
    })
  }

  if (!pedido) {
    return (
      <Modal titulo="Pedido" onFechar={onFechar}>
        {erro ? <p className={styles.erro}>{erro}</p> : <p>Carregando...</p>}
      </Modal>
    )
  }

  const aberto = pedido.status === 'aberto'
  const fechado = pedido.status === 'fechado'
  const salao = pedido.tipo === 'salao'
  const titulo = salao ? `Mesa ${pedido.numeroMesa}` : 'Delivery'
  const totalComDez = Math.round(Math.round(pedido.valorTotal * 100) * 1.1) / 100
  const podeAvancar =
    !salao && pedido.status !== 'cancelado' && pedido.statusEntrega && pedido.statusEntrega !== 'entregue'

  return (
    <>
      <Modal titulo={`${titulo} - pedido ${pedido.id}`} onFechar={onFechar}>
        <div className={styles.corpo}>
          <p className={styles.info}>
            Estado: <strong>{pedido.status === 'fechado' ? (pedido.quitado ? 'fechado e pago' : 'fechado, aguardando pagamento') : pedido.status}</strong>
            {pedido.nomeCliente && <> · Cliente: {pedido.nomeCliente}</>}
            {pedido.nomeGarcom && <> · Garçom: {pedido.nomeGarcom}</>}
          </p>

          {!salao && (
            <p className={styles.info}>
              Endereço: {pedido.endereco} · Taxa: {moeda(pedido.taxaEntrega)} · Entrega:{' '}
              <strong>{pedido.statusEntrega}</strong>
            </p>
          )}

          {podeAvancar && (
            <button className={styles.secundario} onClick={() => executar(() => pedidoService.avancarEntrega(idPedido))}>
              Avançar entrega
            </button>
          )}

          <h4 className={styles.subtitulo}>Itens do pedido</h4>
          <ul className={styles.lista}>
            {pedido.itens.map((i) => {
              const removivel = aberto && i.statusCozinha === 'aguardando preparo'
              return (
                <li key={i.id} className={styles.linhaItem}>
                  <div className={styles.textoItem}>
                    <span>{i.quantidade}x {i.nomeProduto} - {moeda(i.valorUnitario * i.quantidade)}</span>
                    <small>{i.statusCozinha}{i.observacoes && ` · ${i.observacoes}`}</small>
                  </div>
                  {removivel && (
                    <button
                      className={styles.remover}
                      onClick={() => executar(() => pedidoService.removerItem(idPedido, i.id))}
                      aria-label="Remover item"
                    >
                      ✕
                    </button>
                  )}
                </li>
              )
            })}
            {pedido.itens.length === 0 && <li className={styles.vazio}>Nenhum item ainda.</li>}
          </ul>

          <p className={styles.total}>Total: <strong>{moeda(pedido.valorTotal)}</strong></p>

          {aberto && (
            <>
              <h4 className={styles.subtitulo}>Adicionar item</h4>
              <input
                className={styles.campo}
                placeholder="Pesquisar item"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <ul className={`${styles.lista} ${styles.rolavel}`}>
                {produtos.map((p) => (
                  <li key={p.id} className={styles.linhaItem}>
                    <span className={styles.nomeProduto}>{p.nome} - {moeda(p.preco)}</span>
                    <button className={styles.mais} onClick={() => escolher(p)} aria-label="Adicionar ao pedido">+</button>
                  </li>
                ))}
                {produtos.length === 0 && <li className={styles.vazio}>Nenhum item disponível.</li>}
              </ul>

              {salao && (
                <label className={styles.dez}>
                  <input type="checkbox" checked={dez} onChange={(e) => setDez(e.target.checked)} />
                  Incluir 10% de serviço ({moeda(totalComDez)})
                </label>
              )}
            </>
          )}

          {fechado && (
            <>
              <h4 className={styles.subtitulo}>Pagamento</h4>
              <p className={styles.info}>
                Pago: {moeda(pedido.totalPago)} · Restante: <strong>{moeda(pedido.restante)}</strong>
              </p>
              <ul className={styles.lista}>
                {pedido.pagamentos.map((p, idx) => (
                  <li key={idx} className={styles.linhaItem}>
                    <span>{p.forma} - {moeda(p.valor)}</span>
                  </li>
                ))}
              </ul>

              {pedido.quitado ? (
                <p className={styles.quitado}>Pedido quitado</p>
              ) : (
                <div className={styles.pagamento}>
                  <Campo rotulo="Forma de pagamento" obrigatorio erro={erroPag.forma}>
                    <select className={styles.campo} value={forma} onChange={(e) => setForma(e.target.value)}>
                      <option value="">Selecione</option>
                      {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Campo>
                  <Campo rotulo="Valor" obrigatorio erro={erroPag.valor}>
                    <input
                      className={styles.campo}
                      inputMode="decimal"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0,00"
                    />
                  </Campo>
                  <div className={styles.acoesPag}>
                    <button
                      className={styles.secundario}
                      onClick={() => setValor(String(pedido.restante).replace('.', ','))}
                    >
                      Pagar o restante
                    </button>
                    <button className={styles.primario} onClick={pagar} disabled={ocupado}>
                      Registrar pagamento
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {erro && <p className={styles.erro}>{erro}</p>}

          <div className={styles.rodape}>
            {aberto ? (
              <div className={styles.esquerda}>
                <button className={styles.perigo} onClick={() => setConfirmaCancelar(true)}>
                  Cancelar pedido
                </button>
                <button
                  className={styles.primario}
                  disabled={ocupado}
                  onClick={() => setConfirmaFechar(true)}
                >
                  Fechar pedido
                </button>
              </div>
            ) : <span />}
            <button className={styles.icone} onClick={onFechar} aria-label="Fechar">✕</button>
          </div>
        </div>
      </Modal>

      {escolhido && (
        <Modal titulo={escolhido.nome} onFechar={() => setEscolhido(null)}>
          <div className={styles.corpo}>
            <Campo rotulo="Quantidade" obrigatorio erro={erroItem}>
              <input
                className={styles.campo}
                type="number"
                min="1"
                max="99"
                value={qtd}
                onChange={(e) => { setQtd(e.target.value); setErroItem('') }}
              />
            </Campo>
            <Campo rotulo="Observação (opcional)">
              <textarea
                className={`${styles.campo} ${styles.obs}`}
                value={obs}
                maxLength={MAX_OBSERVACOES}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Ex.: sem cebola"
              />
            </Campo>
            <div className={styles.rodape}>
              <button className={styles.icone} onClick={() => setEscolhido(null)} aria-label="Cancelar">✕</button>
              <button className={styles.icone} onClick={confirmarItem} disabled={ocupado} aria-label="Confirmar">✓</button>
            </div>
          </div>
        </Modal>
      )}

      {confirmaCancelar && (
        <ModalAviso
          tipo="confirmar"
          mensagem="Tem certeza de que deseja cancelar este pedido?"
          onCancelar={() => setConfirmaCancelar(false)}
          onConfirmar={async () => {
            setConfirmaCancelar(false)
            await executar(() => pedidoService.cancelar(idPedido))
          }}
        />
      )}

      {confirmaFechar && (
        <ModalAviso
          tipo="confirmar"
          mensagem={`Fechar o pedido? Total: ${moeda(dez ? totalComDez : pedido.valorTotal)}. Depois de fechado, não aceita mais itens.`}
          onCancelar={() => setConfirmaFechar(false)}
          onConfirmar={async () => {
            setConfirmaFechar(false)
            await executar(() => pedidoService.fechar(idPedido, salao && dez))
          }}
        />
      )}
    </>
  )
}

export default ModalPedido