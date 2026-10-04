import type { ErrorRequestHandler, RequestHandler } from 'express'
import mongoose from 'mongoose'
import { HttpError } from '../utils/httpError.js'

export const noEncontrado: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' })
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, ...error.extras })
    return
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const mensaje = Object.values(error.errors)[0]?.message ?? 'Los datos no son válidos.'
    res.status(400).json({ error: mensaje })
    return
  }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido.' })
    return
  }
  if (esDuplicado(error)) {
    res.status(409).json({ error: mensajeDuplicado(error) })
    return
  }
  console.error(error)
  res.status(500).json({ error: 'Error interno del servidor.' })
}

function esDuplicado(error: unknown): error is { keyPattern?: Record<string, unknown> } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

function mensajeDuplicado(error: { keyPattern?: Record<string, unknown> }) {
  if (error.keyPattern?.dni) return 'Ese DNI ya está inscrito en este campeonato.'
  if (error.keyPattern?.id) return 'Ese identificador ya existe.'
  return 'Ya existe un registro con esos datos.'
}
