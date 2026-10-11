import test from 'node:test';
import assert from 'node:assert/strict';
import { toSI, fromSI, unitsFor } from '../src/modules/units.js';

const GAMMA_AGUA = 998.2 * 9.80665;

test('presión: kPa ↔ Pa', () => {
  assert.equal(toSI(150, 'kPa', 'pressure'), 150000);
  assert.equal(fromSI(150000, 'kPa', 'pressure'), 150);
});

test('presión: bar ↔ Pa', () => {
  assert.equal(toSI(1, 'bar', 'pressure'), 100000);
});

test('presión: psi ↔ Pa', () => {
  assert.equal(toSI(1, 'psi', 'pressure'), 6894.757293168);
});

test('presión: m.c.a. usa gamma del fluido', () => {
  const pa = toSI(10, 'm.c.a.', 'pressure', { gamma: GAMMA_AGUA });
  assert.ok(Math.abs(pa - 10 * GAMMA_AGUA) < 1e-9);
  const back = fromSI(pa, 'm.c.a.', 'pressure', { gamma: GAMMA_AGUA });
  assert.ok(Math.abs(back - 10) < 1e-12);
});

test('presión: m.c.a. sin gamma lanza error', () => {
  assert.throws(() => toSI(1, 'm.c.a.', 'pressure'), /gamma/);
});

test('caudal: L/s ↔ m³/s y m³/h ↔ m³/s', () => {
  assert.equal(toSI(45, 'L/s', 'flow'), 0.045);
  assert.equal(toSI(3600, 'm³/h', 'flow'), 1);
  assert.equal(fromSI(0.045, 'L/s', 'flow'), 45);
});

test('longitud: mm ↔ m y in ↔ m', () => {
  assert.equal(toSI(150, 'mm', 'length'), 0.15);
  assert.equal(toSI(1, 'in', 'length'), 0.0254);
  assert.equal(fromSI(0.15, 'mm', 'length'), 150);
});

test('viscosidad: mm²/s ↔ m²/s', () => {
  assert.equal(toSI(1.004, 'mm²/s', 'viscosity'), 1.004e-6);
});

test('unidades inválidas lanzan error', () => {
  assert.throws(() => toSI(1, 'km', 'length'), /no válida/);
  assert.throws(() => toSI(NaN, 'm', 'length'), /no válido/);
  assert.throws(() => toSI('x', 'm', 'length'), /no válido/);
});

test('unitsFor devuelve listas por magnitud', () => {
  assert.ok(unitsFor('pressure').includes('kPa'));
  assert.ok(unitsFor('flow').includes('L/s'));
});
