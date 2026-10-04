import { Campeonato } from '../models/Campeonato.js'
import { HttpError } from '../utils/httpError.js'
import { parametro } from '../utils/validar.js'
import { asyncHandler } from './asyncHandler.js'

export const exigirCampeonato = asyncHandler(async (req, _res, next) => {
  const campeonatoId = parametro(req.params.campeonatoId)
  const existe = await Campeonato.exists({ id: campeonatoId })
  if (!existe) throw new HttpError(404, 'Campeonato no encontrado.')
  next()
})
