import 'dotenv/config'
import { crearApp } from './app.js'
import { conectar } from './config/db.js'
import { sembrarCampeonatosIniciales } from './data/iniciales.js'

const puertoLeido = Number(process.env.PORT)
const puerto = Number.isInteger(puertoLeido) && puertoLeido > 0 ? puertoLeido : 4000

try {
  await conectar()
  await sembrarCampeonatosIniciales()
  const app = crearApp()
  app.listen(puerto, () => {
    console.log(`API escuchando en http://localhost:${puerto}`)
  })
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
