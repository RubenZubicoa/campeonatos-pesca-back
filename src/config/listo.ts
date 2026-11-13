import { sembrarCampeonatosIniciales } from '../data/iniciales.js'
import { conectar } from './db.js'

let pendiente: Promise<void> | null = null

export function asegurarListo() {
  pendiente ??= preparar().catch((error: unknown) => {
    pendiente = null
    throw error
  })
  return pendiente
}

async function preparar() {
  await conectar()
  await sembrarCampeonatosIniciales()
}
