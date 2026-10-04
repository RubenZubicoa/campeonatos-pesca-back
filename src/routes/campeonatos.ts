import { Router, type Request, type Response } from 'express'
import { Captura } from '../models/Captura.js'
import { Manga } from '../models/Manga.js'
import { Participante } from '../models/Participante.js'
import { Sector } from '../models/Sector.js'
import { Tramo } from '../models/Tramo.js'
import { exigirCampeonato } from '../middleware/campeonato.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { crearId, crearIdAcceso, idDesdeNombre } from '../utils/ids.js'
import { dniValido, normalizarDni } from '../utils/dni.js'
import { HttpError } from '../utils/httpError.js'
import {
  booleano,
  cuerpo,
  fechaHora,
  fechaNacimiento,
  identificadorCampeonato,
  numeroFinito,
  parametro,
  rangoHorario,
  textoObligatorio,
} from '../utils/validar.js'
import { asignarManga, asignarMangaPermitiendoRepeticion, type Asignacion } from '../services/asignacion.js'
import { clasificacionFinal, clasificarManga } from '../services/clasificacion.js'
import { Campeonato } from '../models/Campeonato.js'

export const campeonatosRouter = Router()

campeonatosRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const campeonatos = await Campeonato.find().sort({ fecha: 1, nombre: 1 })
    res.json(campeonatos)
  }),
)

campeonatosRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const datos = cuerpo(req.body)
    const nombre = textoObligatorio(datos.nombre, 'Indica el nombre del campeonato.')
    const fecha = textoObligatorio(datos.fecha, 'Indica la fecha del campeonato.')
    const lugar = textoObligatorio(datos.lugar, 'Indica el lugar del campeonato.')
    const id =
      datos.id === undefined
        ? await idLibre(idDesdeNombre(nombre))
        : identificadorCampeonato(textoObligatorio(datos.id, 'El identificador no es válido.'))
    const campeonato = await Campeonato.create({ id, nombre, fecha, lugar })
    res.status(201).json(campeonato)
  }),
)

campeonatosRouter.get(
  '/:campeonatoId',
  asyncHandler(async (req, res) => {
    res.json(await buscarCampeonato(parametro(req.params.campeonatoId)))
  }),
)

campeonatosRouter.patch(
  '/:campeonatoId',
  asyncHandler(async (req, res) => {
    const campeonato = await buscarCampeonato(parametro(req.params.campeonatoId))
    const datos = cuerpo(req.body)
    if ('id' in datos) throw new HttpError(400, 'El identificador no se puede cambiar.')
    if (datos.nombre !== undefined) {
      campeonato.nombre = textoObligatorio(datos.nombre, 'Indica el nombre del campeonato.')
    }
    if (datos.fecha !== undefined) {
      campeonato.fecha = textoObligatorio(datos.fecha, 'Indica la fecha del campeonato.')
    }
    if (datos.lugar !== undefined) {
      campeonato.lugar = textoObligatorio(datos.lugar, 'Indica el lugar del campeonato.')
    }
    if (!campeonato.isModified()) throw new HttpError(400, 'No hay cambios.')
    await campeonato.save()
    res.json(campeonato)
  }),
)

campeonatosRouter.delete(
  '/:campeonatoId',
  asyncHandler(async (req, res) => {
    const campeonatoId = parametro(req.params.campeonatoId)
    const campeonato = await buscarCampeonato(campeonatoId)
    await Promise.all([
      Participante.deleteMany({ campeonatoId }),
      Sector.deleteMany({ campeonatoId }),
      Tramo.deleteMany({ campeonatoId }),
      Manga.deleteMany({ campeonatoId }),
      Captura.deleteMany({ campeonatoId }),
    ])
    await campeonato.deleteOne()
    res.status(204).send()
  }),
)

const recursos = Router({ mergeParams: true })
recursos.use(exigirCampeonato)
recursos.use('/participantes', participantesRouter())
recursos.use(escenarioRouter())
recursos.use('/mangas', mangasRouter())
recursos.use('/capturas', capturasRouter())
recursos.get('/clasificacion', asyncHandler(clasificacion))
campeonatosRouter.use('/:campeonatoId', recursos)

function participantesRouter() {
  const router = Router({ mergeParams: true })

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const participantes = await Participante.find({ campeonatoId: parametro(req.params.campeonatoId) }).sort({
        createdAt: 1,
      })
      res.json(participantes)
    }),
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const datos = cuerpo(req.body)
      const nombre = textoObligatorio(datos.nombre, 'Completa nombre, fecha de nacimiento y DNI.')
      const nacimiento = fechaNacimiento(datos.fechaNacimiento)
      const dni = normalizarDni(textoObligatorio(datos.dni, 'Completa nombre, fecha de nacimiento y DNI.'))
      if (!dniValido(dni)) throw new HttpError(400, 'El DNI o NIE no es válido.')

      const ocupados = await Participante.distinct('id')
      for (let intento = 0; intento < 5; intento += 1) {
        try {
          const participante = await Participante.create({
            id: crearIdAcceso(ocupados),
            campeonatoId,
            nombre,
            fechaNacimiento: nacimiento,
            dni,
          })
          res.status(201).json(participante)
          return
        } catch (error) {
          if (!esClave(error, 'id') || intento === 4) throw error
        }
      }
    }),
  )

  router.delete(
    '/:participanteId',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const participanteId = parametro(req.params.participanteId)
      const borrado = await Participante.findOneAndDelete({ id: participanteId, campeonatoId })
      if (!borrado) throw new HttpError(404, 'Participante no encontrado.')
      res.status(204).send()
    }),
  )

  return router
}

function escenarioRouter() {
  const router = Router({ mergeParams: true })

  router.get(
    '/escenario',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const [sectores, tramos] = await Promise.all([
        Sector.find({ campeonatoId }).sort({ createdAt: 1 }),
        Tramo.find({ campeonatoId }).sort({ createdAt: 1 }),
      ])
      res.json({ sectores, tramos })
    }),
  )

  router.post(
    '/sectores',
    asyncHandler(async (req, res) => {
      const datos = cuerpo(req.body)
      const sector = await Sector.create({
        id: crearId(),
        campeonatoId: parametro(req.params.campeonatoId),
        nombre: textoObligatorio(datos.nombre, 'Indica el nombre del sector.'),
      })
      res.status(201).json(sector)
    }),
  )

  router.delete(
    '/sectores/:sectorId',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const sectorId = parametro(req.params.sectorId)
      const borrado = await Sector.findOneAndDelete({ id: sectorId, campeonatoId })
      if (!borrado) throw new HttpError(404, 'Sector no encontrado.')
      await Tramo.updateMany({ campeonatoId, sectorId }, { $set: { sectorId: null } })
      res.status(204).send()
    }),
  )

  router.post(
    '/tramos',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const datos = cuerpo(req.body)
      const sectorId = textoObligatorio(datos.sectorId, 'Elige un sector para el tramo.')
      await exigirSector(campeonatoId, sectorId)
      const latitud = numeroFinito(datos.latitud, 'Indica la latitud del tramo.')
      const longitud = numeroFinito(datos.longitud, 'Indica la longitud del tramo.')
      const tramo = await Tramo.create({
        id: crearId(),
        campeonatoId,
        nombre: textoObligatorio(datos.nombre, 'Indica el nombre del tramo.'),
        sectorId,
        latitud,
        longitud,
      })
      res.status(201).json(tramo)
    }),
  )

  router.patch(
    '/tramos/:tramoId',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const tramo = await Tramo.findOne({ id: parametro(req.params.tramoId), campeonatoId })
      if (!tramo) throw new HttpError(404, 'Tramo no encontrado.')
      const datos = cuerpo(req.body)
      if (!('sectorId' in datos)) throw new HttpError(400, 'Indica el sector del tramo.')
      const sectorId = datos.sectorId === null || datos.sectorId === '' ? null : textoObligatorio(datos.sectorId, 'El sector no es válido.')
      if (sectorId) await exigirSector(campeonatoId, sectorId)
      tramo.sectorId = sectorId
      await tramo.save()
      res.json(tramo)
    }),
  )

  router.delete(
    '/tramos/:tramoId',
    asyncHandler(async (req, res) => {
      const borrado = await Tramo.findOneAndDelete({
        id: parametro(req.params.tramoId),
        campeonatoId: parametro(req.params.campeonatoId),
      })
      if (!borrado) throw new HttpError(404, 'Tramo no encontrado.')
      res.status(204).send()
    }),
  )

  return router
}

function mangasRouter() {
  const router = Router({ mergeParams: true })

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const mangas = await Manga.find({ campeonatoId: parametro(req.params.campeonatoId) }).sort({ orden: 1 })
      res.json(mangas)
    }),
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const datos = cuerpo(req.body)
      const nombre = textoObligatorio(datos.nombre, 'Indica el nombre y las dos franjas horarias.')
      if (!Array.isArray(datos.rangos) || datos.rangos.length !== 2) {
        throw new HttpError(400, 'Indica el nombre y las dos franjas horarias.')
      }
      const rangos = [
        rangoHorario(datos.rangos[0], 'La primera franja'),
        rangoHorario(datos.rangos[1], 'La segunda franja'),
      ] as const
      const permitirRepeticion =
        datos.permitirRepeticion === undefined
          ? false
          : booleano(datos.permitirRepeticion, 'permitirRepeticion tiene que ser verdadero o falso.')

      const [participantes, sectores, tramos, mangas] = await Promise.all([
        Participante.find({ campeonatoId }).sort({ createdAt: 1 }),
        Sector.find({ campeonatoId }),
        Tramo.find({ campeonatoId }),
        Manga.find({ campeonatoId }).sort({ orden: 1 }),
      ])
      const anteriores = mangas.map((manga) => ({
        asignaciones: manga.asignaciones.map(asignacionPlana),
      }))
      const estricta = asignarManga(participantes, sectores, tramos, anteriores)
      let asignaciones: Asignacion[]
      if (estricta.ok) {
        asignaciones = estricta.asignaciones
      } else if (!permitirRepeticion) {
        throw new HttpError(409, estricta.error, { requiereConfirmacion: true })
      } else {
        const flexible = asignarMangaPermitiendoRepeticion(participantes, sectores, tramos, anteriores)
        if (!flexible.ok) throw new HttpError(400, flexible.error)
        asignaciones = flexible.asignaciones
      }

      const manga = await Manga.create({
        id: crearId(),
        campeonatoId,
        orden: (mangas.at(-1)?.orden ?? -1) + 1,
        nombre,
        rangos: [...rangos],
        asignaciones,
        visibleParaParticipantes: false,
      })
      res.status(201).json(manga)
    }),
  )

  router.patch(
    '/:mangaId',
    asyncHandler(async (req, res) => {
      const manga = await Manga.findOne({
        id: parametro(req.params.mangaId),
        campeonatoId: parametro(req.params.campeonatoId),
      })
      if (!manga) throw new HttpError(404, 'Manga no encontrada.')
      const datos = cuerpo(req.body)
      manga.visibleParaParticipantes = booleano(
        datos.visibleParaParticipantes,
        'Indica si la manga es visible para los participantes.',
      )
      await manga.save()
      res.json(manga)
    }),
  )

  router.delete(
    '/:mangaId',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const mangaId = parametro(req.params.mangaId)
      const ultima = await Manga.findOne({ campeonatoId }).sort({ orden: -1 })
      if (!ultima || ultima.id !== mangaId) {
        throw new HttpError(409, 'Solo se puede quitar la última manga.')
      }
      await ultima.deleteOne()
      res.status(204).send()
    }),
  )

  return router
}

function capturasRouter() {
  const router = Router({ mergeParams: true })

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const filtro: Record<string, string> = { campeonatoId: parametro(req.params.campeonatoId) }
      if (typeof req.query.participanteId === 'string' && req.query.participanteId) {
        filtro.participanteId = req.query.participanteId
      }
      if (typeof req.query.mangaId === 'string' && req.query.mangaId) {
        filtro.mangaId = req.query.mangaId
      }
      const capturas = await Captura.find(filtro).sort({ fechaHora: 1, id: 1 })
      res.json(capturas)
    }),
  )

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const datos = cuerpo(req.body)
      const participanteId = textoObligatorio(datos.participanteId, 'Indica el participante.')
      const mangaId = textoObligatorio(datos.mangaId, 'Indica la manga.')
      await exigirParticipanteYManga(campeonatoId, participanteId, mangaId)
      const captura = await Captura.create({
        id: crearId(),
        campeonatoId,
        participanteId,
        mangaId,
        longitud: longitudCaptura(datos.longitud),
        fechaHora: fechaHora(datos.fechaHora),
      })
      res.status(201).json(captura)
    }),
  )

  router.patch(
    '/:capturaId',
    asyncHandler(async (req, res) => {
      const campeonatoId = parametro(req.params.campeonatoId)
      const captura = await Captura.findOne({ id: parametro(req.params.capturaId), campeonatoId })
      if (!captura) throw new HttpError(404, 'Captura no encontrada.')
      const datos = cuerpo(req.body)
      if (datos.longitud !== undefined) captura.longitud = longitudCaptura(datos.longitud)
      if (datos.fechaHora !== undefined) captura.fechaHora = fechaHora(datos.fechaHora)
      if (datos.mangaId !== undefined) {
        const mangaId = textoObligatorio(datos.mangaId, 'Indica la manga.')
        const manga = await Manga.findOne({ id: mangaId, campeonatoId })
        if (!manga) throw new HttpError(400, 'Esa manga no pertenece a este campeonato.')
        captura.mangaId = mangaId
      }
      if (!captura.isModified()) throw new HttpError(400, 'No hay cambios.')
      await captura.save()
      res.json(captura)
    }),
  )

  router.delete(
    '/:capturaId',
    asyncHandler(async (req, res) => {
      const borrado = await Captura.findOneAndDelete({
        id: parametro(req.params.capturaId),
        campeonatoId: parametro(req.params.campeonatoId),
      })
      if (!borrado) throw new HttpError(404, 'Captura no encontrada.')
      res.status(204).send()
    }),
  )

  return router
}

async function clasificacion(req: Request, res: Response) {
  const campeonatoId = parametro(req.params.campeonatoId)
  const [participantes, mangas] = await Promise.all([
    Participante.find({ campeonatoId }).sort({ createdAt: 1 }),
    Manga.find({ campeonatoId }).sort({ orden: 1 }),
  ])
  const nombres = new Map(participantes.map((participante) => [participante.id, participante.nombre]))
  const mangasPlanas = mangas.map((manga) => ({
    id: manga.id,
    asignaciones: manga.asignaciones.map((asignacion: { participanteId: string }) => ({
      participanteId: asignacion.participanteId,
    })),
  }))
  const participantesPlanos = participantes.map((participante) => ({ id: participante.id }))
  const final = clasificacionFinal(mangasPlanas, participantesPlanos)
  res.json({
    mangas: mangas.map((manga) => ({
      id: manga.id,
      nombre: manga.nombre,
      filas: clasificarManga(
        {
          id: manga.id,
          asignaciones: manga.asignaciones.map((asignacion: { participanteId: string }) => ({
            participanteId: asignacion.participanteId,
          })),
        },
        participantesPlanos,
      ).map((fila) => ({ ...fila, nombre: nombres.get(fila.participanteId) ?? null })),
    })),
    final: final.map((fila) => ({ ...fila, nombre: nombres.get(fila.participanteId) ?? null })),
  })
}

async function buscarCampeonato(id: string) {
  const campeonato = await Campeonato.findOne({ id })
  if (!campeonato) throw new HttpError(404, 'Campeonato no encontrado.')
  return campeonato
}

async function idLibre(base: string) {
  let id = base
  let sufijo = 2
  while (await Campeonato.exists({ id })) {
    id = `${base}-${sufijo}`
    sufijo += 1
  }
  return id
}

async function exigirSector(campeonatoId: string, sectorId: string) {
  const sector = await Sector.exists({ id: sectorId, campeonatoId })
  if (!sector) throw new HttpError(400, 'Ese sector no pertenece a este campeonato.')
}

async function exigirParticipanteYManga(campeonatoId: string, participanteId: string, mangaId: string) {
  const [participante, manga] = await Promise.all([
    Participante.exists({ id: participanteId, campeonatoId }),
    Manga.exists({ id: mangaId, campeonatoId }),
  ])
  if (!participante) throw new HttpError(400, 'Ese participante no está inscrito en este campeonato.')
  if (!manga) throw new HttpError(400, 'Esa manga no pertenece a este campeonato.')
}

function longitudCaptura(valor: unknown) {
  const longitud = numeroFinito(valor, 'Indica una longitud en centímetros y la fecha y hora.')
  if (longitud <= 0) throw new HttpError(400, 'Indica una longitud en centímetros y la fecha y hora.')
  return longitud
}

function asignacionPlana(asignacion: { participanteId: string; tramoId: string; sectorId: string; turno: number }): Asignacion {
  return {
    participanteId: asignacion.participanteId,
    tramoId: asignacion.tramoId,
    sectorId: asignacion.sectorId,
    turno: asignacion.turno === 2 ? 2 : 1,
  }
}

function esClave(error: unknown, campo: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000 &&
    'keyPattern' in error &&
    typeof error.keyPattern === 'object' &&
    error.keyPattern !== null &&
    campo in error.keyPattern
  )
}
