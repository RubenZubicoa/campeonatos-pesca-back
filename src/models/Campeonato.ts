import { Schema } from 'mongoose'
import { publicar, registrar } from './publicar.js'

const schema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    nombre: { type: String, required: true, trim: true },
    fecha: { type: String, required: true, trim: true },
    lugar: { type: String, required: true, trim: true },
    medidaMinima: { type: Number, required: true },
    puntosT: { type: Number, required: true },
    duos: { type: Boolean, required: true },
  },
  { id: false, timestamps: true, collection: 'campeonatos' },
)

publicar(schema, ['id', 'nombre', 'fecha', 'lugar', 'medidaMinima', 'puntosT', 'duos'])

export const Campeonato = registrar('Campeonato', schema)
