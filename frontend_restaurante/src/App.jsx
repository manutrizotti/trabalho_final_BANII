import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Cardapio from './pages/Cardapio/Cardapio'
import Clientes from './pages/Clientes/Clientes'
import Cozinha from './pages/Cozinha/Cozinha'
import Garcons from './pages/Garcons/Garcons'
import Mesas from './pages/Mesas/Mesas'
import Pedidos from './pages/Pedidos/Pedidos'
import Reservas from './pages/Reservas/Reservas'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/cardapio" />} />
        <Route path="/cardapio" element={<Cardapio />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/cozinha" element={<Cozinha />} />
        <Route path="/garcons" element={<Garcons />} />
        <Route path="/mesas" element={<Mesas />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/reservas" element={<Reservas />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App