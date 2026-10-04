import { Schema } from 'mongoose'
import { publicar, registrar } from './publicar.js'

const schema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    campeonatoId: { type: String, required: true, index: true },
    nombre: { type: String, required: true, trim: true },
    sectorId: { type: String, default: null },
    latitud: { type: Number, required: true, min: -90, max: 90 },
    longitud: { type: Number, required: true, min: -180, max: 180 },
  },
  { id: false, timestamps: true, collection: 'tramos' },
)

publicar(schema, ['id', 'nombre', 'sectorId', 'latitud', 'longitud'])

export const Tramo = registrar('Tramo', schema)
