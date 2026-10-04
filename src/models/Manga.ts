import { Schema } from 'mongoose'
import { publicar, registrar } from './publicar.js'

const rango = new Schema(
  {
    inicio: { type: String, required: true },
    fin: { type: String, required: true },
  },
  { _id: false },
)

const asignacion = new Schema(
  {
    participanteId: { type: String, required: true },
    tramoId: { type: String, required: true },
    sectorId: { type: String, required: true },
    turno: { type: Number, required: true, enum: [1, 2] },
  },
  { _id: false },
)

const schema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    campeonatoId: { type: String, required: true, index: true },
    orden: { type: Number, required: true },
    nombre: { type: String, required: true, trim: true },
    rangos: {
      type: [rango],
      required: true,
      validate: [(valor: unknown[]) => valor.length === 2, 'Una manga tiene dos franjas horarias.'],
    },
    asignaciones: { type: [asignacion], default: [] },
    visibleParaParticipantes: { type: Boolean, default: false },
  },
  { id: false, timestamps: true, collection: 'mangas' },
)

schema.index({ campeonatoId: 1, orden: 1 }, { unique: true })

publicar(schema, ['id', 'nombre', 'rangos', 'asignaciones', 'visibleParaParticipantes'])

export const Manga = registrar('Manga', schema)
