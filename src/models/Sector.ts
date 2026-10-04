import { Schema } from 'mongoose'
import { publicar, registrar } from './publicar.js'

const schema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    campeonatoId: { type: String, required: true, index: true },
    nombre: { type: String, required: true, trim: true },
  },
  { id: false, timestamps: true, collection: 'sectores' },
)

publicar(schema, ['id', 'nombre'])

export const Sector = registrar('Sector', schema)
