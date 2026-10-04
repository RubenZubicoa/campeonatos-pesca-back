import cors from 'cors'
import express from 'express'
import { errorHandler, noEncontrado } from './middleware/errorHandler.js'
import { accesoRouter } from './routes/acceso.js'
import { campeonatosRouter } from './routes/campeonatos.js'

export function crearApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, servicio: 'campeonatos-pesca' })
  })
  app.use('/api/campeonatos', campeonatosRouter)
  app.use('/api/acceso', accesoRouter)
  app.use(noEncontrado)
  app.use(errorHandler)
  return app
}
