import { HttpError } from './httpError.js'

const idCampeonato = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const hora = /^([01]\d|2[0-3]):[0-5]\d$/
const fechaHoraLocal = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

export function parametro(valor: string | string[] | undefined, mensaje = 'Falta un identificador en la ruta.') {
  const id = Array.isArray(valor) ? valor[0] : valor
  if (!id) throw new HttpError(400, mensaje)
  return id
}

export function cuerpo(valor: unknown) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new HttpError(400, 'El cuerpo de la petición tiene que ser un objeto JSON.')
  }
  return valor as Record<string, unknown>
}

export function textoObligatorio(valor: unknown, mensaje: string) {
  if (typeof valor !== 'string' || valor.trim() === '') throw new HttpError(400, mensaje)
  return valor.trim()
}

export function identificadorCampeonato(valor: string) {
  if (!idCampeonato.test(valor)) {
    throw new HttpError(400, 'El identificador solo puede tener minúsculas, números y guiones.')
  }
  return valor
}

export function fechaNacimiento(valor: unknown) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new HttpError(400, 'La fecha de nacimiento tiene que usar el formato AAAA-MM-DD.')
  }
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    throw new HttpError(400, 'La fecha de nacimiento no es válida.')
  }
  if (valor > hoyLocal()) {
    throw new HttpError(400, 'La fecha de nacimiento no puede ser posterior a hoy.')
  }
  return valor
}

export function fechaHora(valor: unknown) {
  if (typeof valor !== 'string' || !fechaHoraLocal.test(valor)) {
    throw new HttpError(400, 'La fecha y hora tienen que usar el formato AAAA-MM-DDTHH:MM.')
  }
  return valor
}

export function rangoHorario(valor: unknown, etiqueta: string) {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new HttpError(400, `${etiqueta} no es válida.`)
  }
  const datos = valor as Record<string, unknown>
  const inicio = typeof datos.inicio === 'string' ? datos.inicio : ''
  const fin = typeof datos.fin === 'string' ? datos.fin : ''
  if (!hora.test(inicio) || !hora.test(fin)) {
    throw new HttpError(400, `${etiqueta} tiene que usar el formato HH:MM.`)
  }
  if (inicio >= fin) {
    throw new HttpError(400, 'En cada franja, la hora de inicio tiene que ser anterior a la de fin.')
  }
  return { inicio, fin }
}

export function numeroFinito(valor: unknown, mensaje: string) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) throw new HttpError(400, mensaje)
  return valor
}

export function booleano(valor: unknown, mensaje: string) {
  if (typeof valor !== 'boolean') throw new HttpError(400, mensaje)
  return valor
}

function hoyLocal() {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}
