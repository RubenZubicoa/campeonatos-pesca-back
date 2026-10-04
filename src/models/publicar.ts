import mongoose, { model, type Schema } from 'mongoose'

export function publicar(schema: Schema, campos: readonly string[]) {
  const transform = (_doc: unknown, ret: Record<string, unknown>) => {
    const salida: Record<string, unknown> = {}
    for (const campo of campos) {
      if (ret[campo] !== undefined) salida[campo] = ret[campo]
    }
    return salida
  }
  schema.set('toJSON', { versionKey: false, transform })
  schema.set('toObject', { versionKey: false, transform })
}

export function registrar(nombre: string, schema: Schema) {
  return mongoose.models[nombre] ?? model(nombre, schema)
}
