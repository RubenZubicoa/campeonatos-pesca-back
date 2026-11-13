import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { asegurarListo } from './config/listo.js'
import { errorHandler, noEncontrado } from './middleware/errorHandler.js'
import { accesoRouter } from './routes/acceso.js'
import { campeonatosRouter } from './routes/campeonatos.js'

function origenCors(): cors.CorsOptions['origin'] {
  const permitidos = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean)

  return permitidos.length > 0 ? permitidos : true
}

export function crearApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(
    cors({
      origin: origenCors(),
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 204,
    }),
  )
  app.use(async (_req, _res, next) => {
    try {
      await asegurarListo()
      next()
    } catch (error) {
      next(error)
    }
  })
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

export default crearApp()
