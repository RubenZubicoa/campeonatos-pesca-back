import 'dotenv/config'
import mongoose from 'mongoose'
import { conectar, desconectar } from './config/db.js'
import { sembrarCampeonatosIniciales } from './data/iniciales.js'

try {
  await conectar()
  await sembrarCampeonatosIniciales()
  console.log(`Campeonatos iniciales listos en ${mongoose.connection.name}.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await desconectar()
}
