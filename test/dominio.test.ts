import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dniValido, normalizarDni } from '../src/utils/dni.ts'
import { asignarManga, asignarMangaPermitiendoRepeticion } from '../src/services/asignacion.ts'
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

  it('con cuatro participantes y cuatro tramos usa un tramo distinto para cada uno', () => {
    const cuatro = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }]
    const resultado = asignarManga(cuatro, sectores, tramos, [])
    assert.equal(resultado.ok, true)
    if (!resultado.ok) return
    assert.equal(new Set(resultado.asignaciones.map((asignacion) => asignacion.tramoId)).size, 4)
    assert.deepEqual(
      resultado.asignaciones.map((asignacion) => asignacion.turno).sort(),
      [1, 1, 2, 2],
    )
  })

  it('rellena todos los tramos cuando hay más participantes que tramos', () => {
    const seis = Array.from({ length: 6 }, (_, indice) => ({ id: `p${indice}` }))
    const resultado = asignarManga(seis, sectores, tramos, [])
    assert.equal(resultado.ok, true)
    if (!resultado.ok) return
    assert.equal(new Set(resultado.asignaciones.map((asignacion) => asignacion.tramoId)).size, tramos.length)
  })

  it('el reparto flexible también ocupa tramos distintos antes de repetir', () => {
    const cuatro = [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }]
    const resultado = asignarMangaPermitiendoRepeticion(cuatro, sectores, tramos, [])
    assert.equal(resultado.ok, true)
    if (!resultado.ok) return
    assert.equal(new Set(resultado.asignaciones.map((asignacion) => asignacion.tramoId)).size, 4)
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

  it('quien pesca a primera controla un tramo que se pesca a segunda', () => {
    const controles = asignarControles(
      [
        { participanteId: 'p1', tramoId: 't6', turno: 1 },
        { participanteId: 'p2', tramoId: 't7', turno: 2 },
      ],
      tramos,
    )
    const primero = controles.find((control) => control.participanteId === 'p1')
    assert.equal(primero?.tramo, '6')
    assert.equal(primero?.control, '7')
  })

  it('quien pesca a segunda controla el tramo siguiente si se pesca a primera', () => {
    const controles = asignarControles(
      [
        { participanteId: 'p1', tramoId: 't7', turno: 1 },
        { participanteId: 'p2', tramoId: 't6', turno: 2 },
      ],
      tramos,
    )
    const segundo = controles.find((control) => control.participanteId === 'p2')
    assert.equal(segundo?.tramo, '6')
    assert.equal(segundo?.control, '7')
  })

  it('si su tramo se vuelve a pescar, quien pescó a primera lo controla', () => {
    const controles = asignarControles(
      [
        { participanteId: 'p1', tramoId: 't6', turno: 1 },
        { participanteId: 'p2', tramoId: 't6', turno: 2 },
      ],
      tramos,
    )
    const primero = controles.find((control) => control.participanteId === 'p1')
    assert.equal(primero?.control, '6')
  })

  it('no asigna un tramo que no se pesca en la hora del control', () => {
    const controles = asignarControles(
      [
        { participanteId: 'a', tramoId: 't5', turno: 1 },
        { participanteId: 'b', tramoId: 't6', turno: 1 },
        { participanteId: 'c', tramoId: 't7', turno: 2 },
      ],
      tramos,
    )
    const dePrimera = new Set(['5', '6'])
    const deSegunda = new Set(['7'])
    const porParticipante = new Map([
      ['a', 1],
      ['b', 1],
      ['c', 2],
    ] as const)
    for (const control of controles) {
      const turno = porParticipante.get(control.participanteId as 'a' | 'b' | 'c')
      const validos = turno === 1 ? deSegunda : dePrimera
      assert.equal(validos.has(control.control), true)
    }
  })

  it('falla si una franja no tiene tramos pescados', () => {
    assert.throws(
      () => asignarControles([{ participanteId: 'p1', tramoId: 't6', turno: 1 }], tramos),
      /cada franja/i,
    )
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
