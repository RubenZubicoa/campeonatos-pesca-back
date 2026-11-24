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

export function asignarControles(asignaciones: AsignacionControl[], tramos: TramoControl[]): ControlAsignado[] {
  const porId = new Map(tramos.map((tramo) => [tramo.id, tramo]))
  const porSector = new Map<string, TramoControl[]>()
  for (const tramo of tramos) {
    if (!tramo.sectorId) continue
    const lista = porSector.get(tramo.sectorId) ?? []
    lista.push(tramo)
    porSector.set(tramo.sectorId, lista)
  }
  for (const [sectorId, lista] of porSector) {
    porSector.set(sectorId, ordenarTramos(lista))
  }

  return asignaciones.map((asignacion) => {
    const propio = porId.get(asignacion.tramoId)
    const nombre = propio?.nombre ?? asignacion.tramoId
    const controlado = asignacion.turno === 1 ? propio : tramoSiguiente(propio, porSector, tramos)
    return {
      participanteId: asignacion.participanteId,
      tramo: nombre,
      control: controlado?.nombre ?? nombre,
    }
  })
}

function tramoSiguiente(
  propio: TramoControl | undefined,
  porSector: Map<string, TramoControl[]>,
  todos: TramoControl[],
) {
  if (!propio) return undefined
  const numeroPropio = numeroDe(propio.nombre)
  if (numeroPropio !== null) {
    const delSector = propio.sectorId ? (porSector.get(propio.sectorId) ?? []) : []
    const enSector = delSector.find((tramo) => numeroDe(tramo.nombre) === numeroPropio + 1)
    if (enSector) return enSector
    const enCualquierSector = todos.find((tramo) => numeroDe(tramo.nombre) === numeroPropio + 1)
    if (enCualquierSector) return enCualquierSector
  }
  if (!propio.sectorId) return propio
  const lista = porSector.get(propio.sectorId) ?? []
  const indice = lista.findIndex((tramo) => tramo.id === propio.id)
  if (indice < 0 || lista.length === 0) return propio
  return lista[(indice + 1) % lista.length]
}

function ordenarTramos(tramos: TramoControl[]) {
  return [...tramos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }))
}

function numeroDe(nombre: string) {
  const coincidencia = nombre.match(/\d+/)
  return coincidencia ? Number(coincidencia[0]) : null
}
