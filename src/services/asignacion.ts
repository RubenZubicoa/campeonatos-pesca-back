export type Asignacion = {
  participanteId: string
  tramoId: string
  sectorId: string
  turno: 1 | 2
}

type SectorRef = { id: string }
type TramoRef = { id: string; sectorId: string | null }
type MangaPrevia = { asignaciones: Asignacion[] }
type ParticipanteRef = { id: string }

export type ResultadoAsignacion =
  | { ok: true; asignaciones: Asignacion[] }
  | { ok: false; error: string }

export function asignarManga(
  participantes: ParticipanteRef[],
  sectores: SectorRef[],
  tramos: TramoRef[],
  mangasAnteriores: MangaPrevia[],
): ResultadoAsignacion {
  if (participantes.length === 0) {
    return { ok: false, error: 'No hay participantes inscritos en este campeonato.' }
  }

  const sectoresConTramo = sectores.filter((sector) =>
    tramos.some((tramo) => tramo.sectorId === sector.id),
  )
  if (sectoresConTramo.length < 2) {
    return {
      ok: false,
      error: 'Hacen falta al menos dos sectores con tramos para alternar a los participantes.',
    }
  }

  const usados = new Map<string, Set<string>>()
  for (const manga of mangasAnteriores) {
    for (const asignacion of manga.asignaciones) {
      const tramosUsados = usados.get(asignacion.participanteId) ?? new Set<string>()
      tramosUsados.add(asignacion.tramoId)
      usados.set(asignacion.participanteId, tramosUsados)
    }
  }
  const sectorPrevio = new Map<string, string>()
  for (const asignacion of mangasAnteriores.at(-1)?.asignaciones ?? []) {
    sectorPrevio.set(asignacion.participanteId, asignacion.sectorId)
  }

  const candidatos = new Map<string, { tramoId: string; sectorId: string }[]>()
  for (const participante of participantes) {
    const prohibidos = usados.get(participante.id) ?? new Set<string>()
    const anterior = sectorPrevio.get(participante.id)
    const sectoresValidos = anterior
      ? sectoresConTramo.filter((sector) => sector.id !== anterior)
      : sectoresConTramo
    const opciones = tramos
      .filter(
        (tramo) =>
          tramo.sectorId !== null &&
          sectoresValidos.some((sector) => sector.id === tramo.sectorId) &&
          !prohibidos.has(tramo.id),
      )
      .map((tramo) => ({ tramoId: tramo.id, sectorId: tramo.sectorId as string }))
    if (opciones.length === 0) {
      return {
        ok: false,
        error:
          'No hay tramos libres para todos. Un participante no puede repetir tramo y debe cambiar de sector respecto a la manga anterior.',
      }
    }
    candidatos.set(participante.id, opciones)
  }

  const orden = [...participantes].sort(
    (a, b) => (candidatos.get(a.id)?.length ?? 0) - (candidatos.get(b.id)?.length ?? 0),
  )
  const cupo: [number, number] = [
    Math.ceil(participantes.length / 2),
    Math.floor(participantes.length / 2),
  ]
  const ocupados: [Set<string>, Set<string>] = [new Set(), new Set()]
  const conteo: [number, number] = [0, 0]
  const cargaSector = new Map<string, number>()
  const asignaciones: Asignacion[] = []
  let pasos = 0

  function buscar(indice: number): boolean {
    if (indice === orden.length) return true
    if (++pasos > 250000) return false
    const participante = orden[indice]
    const opciones = [...(candidatos.get(participante.id) ?? [])].sort(
      (a, b) => (cargaSector.get(a.sectorId) ?? 0) - (cargaSector.get(b.sectorId) ?? 0),
    )
    const turnos = ([1, 2] as const).filter((turno) => conteo[turno - 1] < cupo[turno - 1])
    for (const turno of turnos) {
      for (const opcion of opciones) {
        if (ocupados[turno - 1].has(opcion.tramoId)) continue
        ocupados[turno - 1].add(opcion.tramoId)
        conteo[turno - 1] += 1
        cargaSector.set(opcion.sectorId, (cargaSector.get(opcion.sectorId) ?? 0) + 1)
        asignaciones.push({
          participanteId: participante.id,
          tramoId: opcion.tramoId,
          sectorId: opcion.sectorId,
          turno,
        })
        if (buscar(indice + 1)) return true
        asignaciones.pop()
        cargaSector.set(opcion.sectorId, (cargaSector.get(opcion.sectorId) ?? 1) - 1)
        conteo[turno - 1] -= 1
        ocupados[turno - 1].delete(opcion.tramoId)
      }
    }
    return false
  }

  if (!buscar(0)) {
    return {
      ok: false,
      error:
        'No se puede repartir esta manga: faltan tramos libres o no se puede cambiar de sector a todos los participantes.',
    }
  }

  return { ok: true, asignaciones }
}

export function asignarMangaPermitiendoRepeticion(
  participantes: ParticipanteRef[],
  sectores: SectorRef[],
  tramos: TramoRef[],
  mangasAnteriores: MangaPrevia[],
): ResultadoAsignacion {
  const disponibles = tramos.filter(
    (tramo) => tramo.sectorId !== null && sectores.some((sector) => sector.id === tramo.sectorId),
  )
  if (participantes.length === 0) {
    return { ok: false, error: 'No hay participantes inscritos en este campeonato.' }
  }
  if (disponibles.length === 0) {
    return { ok: false, error: 'No hay tramos en un sector para asignar a los participantes.' }
  }

  const usados = new Map<string, Set<string>>()
  for (const manga of mangasAnteriores) {
    for (const asignacion of manga.asignaciones) {
      const tramosUsados = usados.get(asignacion.participanteId) ?? new Set<string>()
      tramosUsados.add(asignacion.tramoId)
      usados.set(asignacion.participanteId, tramosUsados)
    }
  }
  const sectorPrevio = new Map<string, string>()
  for (const asignacion of mangasAnteriores.at(-1)?.asignaciones ?? []) {
    sectorPrevio.set(asignacion.participanteId, asignacion.sectorId)
  }

  const cupoPrimero = Math.ceil(participantes.length / 2)
  const conteo: [number, number] = [0, 0]
  const ocupados: [Map<string, number>, Map<string, number>] = [new Map(), new Map()]
  const asignaciones: Asignacion[] = []

  for (const participante of participantes) {
    const turno: 1 | 2 = conteo[0] < cupoPrimero ? 1 : 2
    const prohibidos = usados.get(participante.id) ?? new Set<string>()
    const anterior = sectorPrevio.get(participante.id)
    const elegido = [...disponibles].sort((a, b) => {
      const peso = (tramo: TramoRef) => {
        const libre = (ocupados[turno - 1].get(tramo.id) ?? 0) === 0 ? 0 : 4
        const repetido = prohibidos.has(tramo.id) ? 2 : 0
        const mismoSector = anterior && tramo.sectorId === anterior ? 1 : 0
        return libre + repetido + mismoSector
      }
      return peso(a) - peso(b)
    })[0]
    ocupados[turno - 1].set(elegido.id, (ocupados[turno - 1].get(elegido.id) ?? 0) + 1)
    conteo[turno - 1] += 1
    asignaciones.push({
      participanteId: participante.id,
      tramoId: elegido.id,
      sectorId: elegido.sectorId as string,
      turno,
    })
  }

  return { ok: true, asignaciones }
}
