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
// Mesas: repository -> service -> controller -> rotas
const mesaRepo = new MesaRepositoryPg()
const mesaService = new MesaService(mesaRepo)
const mesaController = new MesaController(mesaService)
app.use('/api/mesas', criarMesaRoutes(mesaController))

const porta = Number(process.env.PORT) || 3000
app.listen(porta, () => console.log(`API rodando na porta ${porta}`))