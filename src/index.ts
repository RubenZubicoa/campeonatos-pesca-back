import app from './app.js'
import { asegurarListo } from './config/listo.js'

export default app

if (!process.env.VERCEL) {
  const puertoLeido = Number(process.env.PORT)
  const puerto = Number.isInteger(puertoLeido) && puertoLeido > 0 ? puertoLeido : 4000

  try {
    await asegurarListo()
    app.listen(puerto, () => {
      console.log(`API escuchando en http://localhost:${puerto}`)
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
