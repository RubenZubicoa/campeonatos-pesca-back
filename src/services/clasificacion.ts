export type FilaManga = {
  participanteId: string
  puntos: number | null
  puesto: number | null
}

export type FilaFinal = {
  participanteId: string
  puestos: (number | null)[]
  suma: number | null
  puntosTotales: number | null
  puesto: number | null
}

type MangaRef = {
  id: string
  asignaciones: { participanteId: string }[]
}

type ParticipanteRef = { id: string }

/** La fórmula de puntos se conectará aquí. De momento no hay puntuación. */
export function puntosDeManga(_manga: MangaRef, _participanteId: string): number | null {
  return null
}

export function clasificarManga(manga: MangaRef, participantes: ParticipanteRef[]): FilaManga[] {
  const ids = idsDeManga(manga, participantes)
  const filas = ids.map((participanteId) => ({
    participanteId,
    puntos: puntosDeManga(manga, participanteId),
    puesto: null as number | null,
  }))
  return conPuestos(filas, (fila) => fila.puntos, false)
}

export function clasificacionFinal(mangas: MangaRef[], participantes: ParticipanteRef[]): FilaFinal[] {
  const ids = new Set<string>()
  for (const manga of mangas) {
    for (const id of idsDeManga(manga, participantes)) ids.add(id)
  }

  const porManga = mangas.map((manga) => clasificarManga(manga, participantes))
  const filas = [...ids].map((participanteId) => {
    const puestos = porManga.map(
      (filasManga) => filasManga.find((fila) => fila.participanteId === participanteId)?.puesto ?? null,
    )
    const completa = puestos.every((puesto) => puesto !== null)
    return {
      participanteId,
      puestos,
      suma: completa ? puestos.reduce<number>((total, puesto) => total + (puesto ?? 0), 0) : null,
      puntosTotales: sumarPuntos(porManga, participanteId),
      puesto: null as number | null,
    }
  })

  return conPuestos(filas, (fila) => fila.suma, true)
}

function sumarPuntos(porManga: FilaManga[][], participanteId: string) {
  let total = 0
  for (const filas of porManga) {
    const fila = filas.find((item) => item.participanteId === participanteId)
    if (!fila) continue
    if (fila.puntos === null) return null
    total += fila.puntos
  }
  return total
}

function idsDeManga(manga: MangaRef, participantes: ParticipanteRef[]) {
  const asignados = [...new Set(manga.asignaciones.map((asignacion) => asignacion.participanteId))]
  return asignados.length > 0 ? asignados : participantes.map((participante) => participante.id)
}

function conPuestos<T extends { puesto: number | null }>(
  filas: T[],
  valor: (fila: T) => number | null,
  menorEsMejor: boolean,
): T[] {
  if (filas.some((fila) => valor(fila) === null)) return filas
  const ordenadas = [...filas].sort((a, b) => {
    const diferencia = (valor(a) ?? 0) - (valor(b) ?? 0)
    return menorEsMejor ? diferencia : -diferencia
  })
  let puesto = 1
  return ordenadas.map((fila, indice) => {
    if (indice > 0 && valor(fila) !== valor(ordenadas[indice - 1])) puesto = indice + 1
    return { ...fila, puesto }
  })
}
