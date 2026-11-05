import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import { ItemCardapioRepositoryPg } from './repositories/postgres/ItemCardapioRepositoryPg.js'
import { ItemCardapioService } from './services/ItemCardapioService.js'
import { ItemCardapioController } from './controllers/ItemCardapioController.js'
import { criarCardapioRoutes } from './routes/cardapioRoutes.js'
import { MesaRepositoryPg } from './repositories/postgres/MesaRepositoryPg.js'
import { MesaService } from './services/MesaService.js'
import { MesaController } from './controllers/MesaController.js'
import { criarMesaRoutes } from './routes/mesaRoutes.js'
import { ClienteRepositoryPg } from './repositories/postgres/ClienteRepositoryPg.js'
import { ClienteService } from './services/ClienteService.js'
import { ClienteController } from './controllers/ClienteController.js'
import { criarClienteRoutes } from './routes/clienteRoutes.js'
import { GarcomRepositoryPg } from './repositories/postgres/GarcomRepositoryPg.js'
import { GarcomService } from './services/GarcomService.js'
import { GarcomController } from './controllers/GarcomController.js'
import { criarGarcomRoutes } from './routes/garcomRoutes.js'
import { ReservaRepositoryPg } from './repositories/postgres/ReservaRepositoryPg.js'
import { ReservaService } from './services/ReservaService.js'
import { ReservaController } from './controllers/ReservaController.js'
import { criarReservaRoutes } from './routes/reservaRoutes.js'
import { CozinhaRepositoryPg } from './repositories/postgres/CozinhaRepositoryPg.js'
import { CozinhaService } from './services/CozinhaService.js'
import { CozinhaController } from './controllers/CozinhaController.js'
import { criarCozinhaRoutes } from './routes/cozinhaRoutes.js'
import { PedidoRepositoryPg } from './repositories/postgres/PedidoRepositoryPg.js'
import { PedidoService } from './services/PedidoService.js'
import { PedidoController } from './controllers/PedidoController.js'
import { criarPedidoRoutes } from './routes/pedidoRoutes.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/saude', (_req, res) => {
  res.json({ ok: true })
})

// Cardápio: repository -> service -> controller -> rotas
const cardapioRepo = new ItemCardapioRepositoryPg()
const cardapioService = new ItemCardapioService(cardapioRepo)
const cardapioController = new ItemCardapioController(cardapioService)
app.use('/api/cardapio', criarCardapioRoutes(cardapioController))
// Exceção reserva
const reservaRepo = new ReservaRepositoryPg()
// Mesas: repository -> service -> controller -> rotas
const mesaRepo = new MesaRepositoryPg()
const mesaService = new MesaService(mesaRepo, reservaRepo)
const mesaController = new MesaController(mesaService)
app.use('/api/mesas', criarMesaRoutes(mesaController))
// Clientes: repository -> service -> controller -> rotas
const clienteRepo = new ClienteRepositoryPg()
const clienteService = new ClienteService(clienteRepo)
const clienteController = new ClienteController(clienteService)
app.use('/api/clientes', criarClienteRoutes(clienteController))
// Garçons: repository -> service -> controller -> rotas
const garcomRepo = new GarcomRepositoryPg()
const garcomService = new GarcomService(garcomRepo)
const garcomController = new GarcomController(garcomService)
app.use('/api/garcons', criarGarcomRoutes(garcomController))
// Reservas: repository -> service (usa mesas e clientes) -> controller -> rotas
const reservaService = new ReservaService(reservaRepo, mesaRepo, clienteRepo)
const reservaController = new ReservaController(reservaService)
app.use('/api/reservas', criarReservaRoutes(reservaController))
// Cozinha: repository -> service -> controller -> rotas
const cozinhaRepo = new CozinhaRepositoryPg()
const cozinhaService = new CozinhaService(cozinhaRepo)
const cozinhaController = new CozinhaController(cozinhaService)
app.use('/api/cozinha', criarCozinhaRoutes(cozinhaController))
// Pedidos: repository -> service (usa mesas, garçons, clientes, reservas e cardápio) -> controller -> rotas
const pedidoRepo = new PedidoRepositoryPg()
const pedidoService = new PedidoService(
  pedidoRepo,
  mesaRepo,
  garcomRepo,
  clienteRepo,
  reservaRepo,
  cardapioRepo,
)
const pedidoController = new PedidoController(pedidoService)
app.use('/api/pedidos', criarPedidoRoutes(pedidoController))

const porta = Number(process.env.PORT) || 3000
app.listen(porta, () => console.log(`API rodando na porta ${porta}`))