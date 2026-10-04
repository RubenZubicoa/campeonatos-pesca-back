import { Router } from 'express'
import { Manga } from '../models/Manga.js'
import { Participante } from '../models/Participante.js'
import { Sector } from '../models/Sector.js'
import { Tramo } from '../models/Tramo.js'
import { Campeonato } from '../models/Campeonato.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { HttpError } from '../utils/httpError.js'
import { parametro } from '../utils/validar.js'

export const accesoRouter = Router()

accesoRouter.get(
  '/:idAcceso',
  asyncHandler(async (req, res) => {
    const participante = await Participante.findOne({ id: parametro(req.params.idAcceso, 'Identificador de acceso no válido.') })
    if (!participante) throw new HttpError(404, 'Identificador de acceso no válido.')

    const [campeonato, mangas, sectores, tramos] = await Promise.all([
      Campeonato.findOne({ id: participante.campeonatoId }),
      Manga.find({ campeonatoId: participante.campeonatoId, visibleParaParticipantes: true }).sort({ orden: 1 }),
      Sector.find({ campeonatoId: participante.campeonatoId }),
      Tramo.find({ campeonatoId: participante.campeonatoId }),
    ])
    if (!campeonato) throw new HttpError(404, 'Identificador de acceso no válido.')

    const nombresSector = new Map(sectores.map((sector) => [sector.id, sector.nombre]))
    const nombresTramo = new Map(tramos.map((tramo) => [tramo.id, tramo.nombre]))

    res.json({
      participante,
      campeonato,
      mangas: mangas.flatMap((manga) => {
        const asignacion = manga.asignaciones.find(
          (item: { participanteId: string }) => item.participanteId === participante.id,
        )
        if (!asignacion) return []
        return [
          {
            id: manga.id,
            nombre: manga.nombre,
            rangos: manga.rangos,
            asignacion: {
              turno: asignacion.turno,
              sectorId: asignacion.sectorId,
              tramoId: asignacion.tramoId,
              sector: nombresSector.get(asignacion.sectorId) ?? null,
              tramo: nombresTramo.get(asignacion.tramoId) ?? null,
            },
          },
        ]
      }),
    })
  }),
)
