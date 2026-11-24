import { Schema } from "mongoose";
import { publicar, registrar } from "./publicar.js";

const schema: Schema = new Schema(
    {
      id: { type: String, required: true, unique: true },
      campeonatoId: { type: String, required: true, index: true },
      mangaId: { type: String, required: true, index: true },
      participanteId: { type: String, required: true, index: true },
      control: { type: String, required: true },
      tramo: { type: String, required: true },
    },
  { id: false, timestamps: true, collection: 'controls' },
)

publicar(schema, ['id', 'mangaId', 'participanteId', 'control', 'tramo'])

export const Controls = registrar('Controls', schema)