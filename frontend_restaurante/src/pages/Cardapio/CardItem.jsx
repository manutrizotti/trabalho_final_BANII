import { useRef, useState } from 'react'
import { BASE_ARQUIVOS } from '../../services/api'
import styles from './CardItem.module.css'

const MAX_BYTES = 2 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp']

function formatarPreco(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CardItem({ item, onEditar, onImagem, onRemoverImagem, onErro }) {
  const entrada = useRef(null)
  const [quebrada, setQuebrada] = useState(false)
  const temFoto = item.imagem && !quebrada

  function escolher(e) {
    const arquivo = e.target.files[0]
    e.target.value = '' // permite escolher o mesmo arquivo de novo
    if (!arquivo) return
    if (!TIPOS.includes(arquivo.type)) return onErro('A imagem deve ser jpg, png ou webp.')
    if (arquivo.size > MAX_BYTES) return onErro('A imagem deve ter no máximo 2 MB.')
    setQuebrada(false)
    onImagem(item, arquivo)
  }

  return (
    <article className={styles.card}>
      <button className={styles.editar} onClick={() => onEditar(item)} aria-label="Editar item">
        ✎
      </button>

      <div className={styles.texto}>
        <h3 className={styles.nome}>
          {item.nome} - {formatarPreco(item.preco)}
        </h3>
        <p className={styles.descricao}>{item.descricao}</p>
      </div>

      <div className={styles.tags}>
        <span className={styles.tag}>{item.codigo}</span>
        <span className={styles.tag}>{item.tempoPreparoMinutos} min</span>
        <span className={styles.tag}>{item.disponivel ? 'DISPONÍVEL' : 'INDISPONÍVEL'}</span>
      </div>

      <div className={styles.foto}>
        <button className={styles.areaFoto} onClick={() => entrada.current.click()} aria-label="Alterar foto">
          {temFoto ? (
            <img
              src={`${BASE_ARQUIVOS}/uploads/cardapio/${item.imagem}`}
              alt={item.nome}
              onError={() => setQuebrada(true)}
            />
          ) : (
            <span>📷</span>
          )}
        </button>
        {item.imagem && (
          <button className={styles.removerFoto} onClick={() => onRemoverImagem(item)} aria-label="Remover foto">
            ✕
          </button>
        )}
        <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={escolher} />
      </div>
    </article>
  )
}

export default CardItem