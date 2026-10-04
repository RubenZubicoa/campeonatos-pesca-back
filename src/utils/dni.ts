const letrasDni = 'TRWAGMYFPDXBNJZSQVHLCKE'

export function normalizarDni(valor: string) {
  return valor.toUpperCase().replace(/[\s-]/g, '')
}

export function dniValido(valor: string) {
  const documento = normalizarDni(valor)
  const dni = /^(\d{8})([A-Z])$/.exec(documento)
  if (dni) return letrasDni[Number(dni[1]) % 23] === dni[2]

  const nie = /^([XYZ])(\d{7})([A-Z])$/.exec(documento)
  if (!nie) return false
  const prefijo = nie[1] === 'X' ? '0' : nie[1] === 'Y' ? '1' : '2'
  return letrasDni[Number(prefijo + nie[2]) % 23] === nie[3]
}
