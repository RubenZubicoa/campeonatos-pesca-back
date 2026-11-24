import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dniValido, normalizarDni } from '../src/utils/dni.ts'
import { asignarManga } from '../src/services/asignacion.ts'
import { clasificacionFinal, clasificarManga } from '../src/services/clasificacion.ts'
import { asignarControles } from '../src/services/controles.ts'

describe('dni', () => {
  it('acepta un DNI con la letra correcta', () => {
    assert.equal(dniValido('12345678Z'), true)
    assert.equal(normalizarDni('12345678-z'), '12345678Z')
  })

  it('rechaza una letra que no corresponde', () => {
    assert.equal(dniValido('12345678A'), false)
  })
})

describe('asignarManga', () => {
  const sectores = [{ id: 'a' }, { id: 'b' }]
  const tramos = [
    { id: 'a1', sectorId: 'a' },
    { id: 'a2', sectorId: 'a' },
    { id: 'b1', sectorId: 'b' },
    { id: 'b2', sectorId: 'b' },
  ]
  const participantes = [{ id: 'p1' }, { id: 'p2' }]

  it('reparte turnos distintos y tramos distintos', () => {
    const resultado = asignarManga(participantes, sectores, tramos, [])
    assert.equal(resultado.ok, true)
    if (!resultado.ok) return
    assert.deepEqual(
      resultado.asignaciones.map((asignacion) => asignacion.turno).sort(),
      [1, 2],
    )
    assert.equal(new Set(resultado.asignaciones.map((asignacion) => asignacion.tramoId)).size, 2)
  })

  it('en la siguiente manga cambia de sector y no repite tramo', () => {
    const primera = asignarManga(participantes, sectores, tramos, [])
    assert.equal(primera.ok, true)
    if (!primera.ok) return
    const segunda = asignarManga(participantes, sectores, tramos, [{ asignaciones: primera.asignaciones }])
    assert.equal(segunda.ok, true)
    if (!segunda.ok) return
    for (const previa of primera.asignaciones) {
      const actual = segunda.asignaciones.find((asignacion) => asignacion.participanteId === previa.participanteId)
      assert.ok(actual)
      assert.notEqual(actual.tramoId, previa.tramoId)
      assert.notEqual(actual.sectorId, previa.sectorId)
    }
  })

  it('exige al menos dos sectores', () => {
    const resultado = asignarManga(
      participantes,
      [{ id: 'a' }],
      tramos.filter((tramo) => tramo.sectorId === 'a'),
      [],
    )
    assert.equal(resultado.ok, false)
  })
})

describe('asignarControles', () => {
  const tramos = [
    { id: 't5', nombre: '5', sectorId: 'a' },
    { id: 't6', nombre: '6', sectorId: 'a' },
    { id: 't7', nombre: '7', sectorId: 'a' },
  ]

  it('quien pesca a primera hora controla su propio tramo', () => {
    const [control] = asignarControles(
      [{ participanteId: 'p1', tramoId: 't6', turno: 1 }],
      tramos,
    )
    assert.equal(control?.tramo, '6')
    assert.equal(control?.control, '6')
  })

  it('quien pesca a segunda hora controla el tramo siguiente', () => {
    const [control] = asignarControles(
      [{ participanteId: 'p2', tramoId: 't6', turno: 2 }],
      tramos,
    )
    assert.equal(control?.tramo, '6')
    assert.equal(control?.control, '7')
  })
})

describe('clasificacion', () => {
  it('deja los puestos pendientes mientras no haya puntos', () => {
    const manga = { id: 'm1', asignaciones: [{ participanteId: 'p1' }] }
    const filas = clasificarManga(manga, [{ id: 'p1' }])
    assert.equal(filas[0]?.puesto, null)
    const final = clasificacionFinal([manga], [{ id: 'p1' }])
    assert.equal(final[0]?.suma, null)
  })
})
