import { Schema } from 'mongoose'
import { publicar, registrar } from './publicar.js'

const schema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    campeonatoId: { type: String, required: true, index: true },
    participanteId: { type: String, required: true },
    mangaId: { type: String, required: true },
    longitud: {
      type: Number,
      required: true,
      validate: {
        validator: (valor: number) => valor > 0,
        message: 'La longitud tiene que ser mayor que cero.',
      },
    },
    fechaHora: { type: String, required: true },
  },
  { id: false, timestamps: true, collection: 'capturas' },
)

schema.index({ campeonatoId: 1, participanteId: 1, mangaId: 1 })

publicar(schema, ['id', 'participanteId', 'mangaId', 'longitud', 'fechaHora'])

export const Captura = registrar('Captura', schema)
