export type AsignacionControl = {
  participanteId: string
  tramoId: string
  turno: 1 | 2
}

export type TramoControl = {
  id: string
  nombre: string
  sectorId: string | null
}

export type ControlAsignado = {
  participanteId: string
  tramo: string
  control: string
}

const sinTramosEnLaOtraFranja = 'En cada franja tiene que pescarse algún tramo para poder asignar los controles.'

export function asignarControles(asignaciones: AsignacionControl[], tramos: TramoControl[]): ControlAsignado[] {
  const porId = new Map(tramos.map((tramo) => [tramo.id, tramo]))
  const pescados = new Map<1 | 2, TramoControl[]>()
  for (const asignacion of asignaciones) {
    const tramo = porId.get(asignacion.tramoId)
    if (!tramo) continue
    const lista = pescados.get(asignacion.turno) ?? []
    if (!lista.some((item) => item.id === tramo.id)) lista.push(tramo)
    pescados.set(asignacion.turno, lista)
  }
  for (const hora of [1, 2] as const) {
    pescados.set(hora, ordenarTramos(pescados.get(hora) ?? []))
  }
  if (asignaciones.some((asignacion) => (pescados.get(horaDeControl(asignacion.turno)) ?? []).length === 0)) {
    throw new Error(sinTramosEnLaOtraFranja)
  }

  const elegido = new Map<string, TramoControl>()
  for (const hora of [1, 2] as const) {
    const objetivos = pescados.get(hora) ?? []
    const controladores = asignaciones
      .filter((asignacion) => horaDeControl(asignacion.turno) === hora)
      .sort((a, b) => nombreTramo(porId, a).localeCompare(nombreTramo(porId, b), 'es', { numeric: true }))
    const usados = new Set<string>()
    for (const controlador of controladores) {
      const propio = porId.get(controlador.tramoId)
      const tramo = tramoControlado(propio, controlador.turno, objetivos, usados)
      if (!tramo) continue
      usados.add(tramo.id)
      elegido.set(controlador.participanteId, tramo)
    }
  }

  return asignaciones.map((asignacion) => {
    const propio = porId.get(asignacion.tramoId)
    const controlado = elegido.get(asignacion.participanteId)
    return {
      participanteId: asignacion.participanteId,
      tramo: propio?.nombre ?? asignacion.tramoId,
      control: controlado?.nombre ?? propio?.nombre ?? asignacion.tramoId,
    }
  })
}

export function horaDeControl(turnoPesca: 1 | 2): 1 | 2 {
  return turnoPesca === 1 ? 2 : 1
}

function tramoControlado(
  propio: TramoControl | undefined,
  turno: 1 | 2,
  objetivos: TramoControl[],
  usados: Set<string>,
) {
  const libres = objetivos.filter((tramo) => !usados.has(tramo.id))
  const candidatos = libres.length > 0 ? libres : objetivos
  if (candidatos.length === 0) return undefined
  if (turno === 1 && propio) {
    const mismo = candidatos.find((tramo) => tramo.id === propio.id)
    if (mismo) return mismo
  }
  return tramoSiguienteEntre(propio, candidatos)
}

function tramoSiguienteEntre(propio: TramoControl | undefined, candidatos: TramoControl[]) {
  const ordenados = ordenarTramos(candidatos)
  if (!propio) return ordenados[0]
  const numeroPropio = numeroDe(propio.nombre)
  if (numeroPropio !== null) {
    const mismoSector = ordenados.filter((tramo) => propio.sectorId && tramo.sectorId === propio.sectorId)
    const posteriorSector = posteriorA(numeroPropio, mismoSector)
    if (posteriorSector) return posteriorSector
    const posterior = posteriorA(numeroPropio, ordenados)
    if (posterior) return posterior
    return mismoSector.find((tramo) => tramo.id !== propio.id) ?? ordenados.find((tramo) => tramo.id !== propio.id) ?? ordenados[0]
  }
  const mismoSector = ordenados.filter((tramo) => propio.sectorId && tramo.sectorId === propio.sectorId)
  const indice = mismoSector.findIndex((tramo) => tramo.id === propio.id)
  if (indice >= 0 && mismoSector.length > 1) return mismoSector[(indice + 1) % mismoSector.length]
  return ordenados.find((tramo) => tramo.id !== propio.id) ?? ordenados[0]
}

function posteriorA(numero: number, tramos: TramoControl[]) {
  return tramos.find((tramo) => {
    const actual = numeroDe(tramo.nombre)
    return actual !== null && actual > numero
  })
}

function nombreTramo(porId: Map<string, TramoControl>, asignacion: AsignacionControl) {
  return porId.get(asignacion.tramoId)?.nombre ?? asignacion.tramoId
}

function ordenarTramos(tramos: TramoControl[]) {
  return [...tramos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
}

function numeroDe(nombre: string) {
  const coincidencia = nombre.match(/\d+/)
  return coincidencia ? Number(coincidencia[0]) : null
}
