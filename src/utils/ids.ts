import { randomInt, randomUUID } from 'node:crypto'

const alfabetoId = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function crearId() {
  return randomUUID()
}

export function crearIdAcceso(ocupados: Iterable<string>) {
  const usados = new Set(ocupados)
  let id = ''
  do {
    id = Array.from({ length: 8 }, () => alfabetoId[randomInt(alfabetoId.length)]).join('')
  } while (usados.has(id))
  return id
}

export function idDesdeNombre(nombre: string) {
  const base = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return base || 'campeonato'
}
