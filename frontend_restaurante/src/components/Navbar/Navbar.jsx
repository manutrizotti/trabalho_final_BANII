import { NavLink } from 'react-router-dom'
import styles from './Navbar.module.css'

const abas = [
  { nome: 'Cardápio', rota: '/cardapio' },
  { nome: 'Clientes', rota: '/clientes' },
  { nome: 'Cozinha', rota: '/cozinha' },
  { nome: 'Garçons', rota: '/garcons' },
  { nome: 'Mesas', rota: '/mesas' },
  { nome: 'Pedidos', rota: '/pedidos' },
  { nome: 'Reservas', rota: '/reservas' },
]

function Navbar() {
  return (
    <header className={styles.navbar}>
      <span className={styles.logo}>Baldo</span>
      <nav className={styles.menu}>
        {abas.map((aba) => (
          <NavLink
            key={aba.rota}
            to={aba.rota}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.ativo}` : styles.link
            }
          >
            {aba.nome}
          </NavLink>
        ))}
      </nav>
      <button className={styles.sair}>Sair</button>
    </header>
  )
}

export default Navbar