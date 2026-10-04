import { Campeonato } from '../models/Campeonato.js'

export const campeonatosIniciales = [
  {
    id: 'primavera-2026',
    nombre: 'Campeonato de primavera',
    fecha: '12 abril 2026',
    lugar: 'The Lake',
  },
  {
    id: 'otono-2026',
    nombre: 'Campeonato de otoño',
    fecha: '18 octubre 2026',
    lugar: 'The Lake',
  },
]

export async function sembrarCampeonatosIniciales() {
  for (const campeonato of campeonatosIniciales) {
    await Campeonato.updateOne({ id: campeonato.id }, { $setOnInsert: campeonato }, { upsert: true })
  }
}
