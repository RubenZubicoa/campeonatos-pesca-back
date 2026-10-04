import { Schema } from 'mongoose'
import { publicar, registrar } from './publicar.js'

const schema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    campeonatoId: { type: String, required: true, index: true },
    nombre: { type: String, required: true, trim: true },
    fechaNacimiento: { type: String, required: true },
    dni: { type: String, required: true },
  },
  { id: false, timestamps: true, collection: 'participantes' },
)

schema.index({ campeonatoId: 1, dni: 1 }, { unique: true })

publicar(schema, ['id', 'nombre', 'fechaNacimiento', 'dni'])

export const Participante = registrar('Participante', schema)
