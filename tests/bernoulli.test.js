import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areaFromDiameter,
  diameterFromArea,
  diameterFromFlowVelocity,
  energyAtPoint,
  pressureHead,
  verifyBalance,
  velocityHead,
  velocityFromFlow,
  flowFromVelocity,
} from '../src/modules/bernoulli.js';

const G = 9.80665;
const RHO = 998.2;
const GAMMA = RHO * G;

test('área, diámetro y velocidad en tubería circular llena', () => {
  const D = 0.15;
  const A = areaFromDiameter(D);
  assert.ok(Math.abs(A - Math.PI * D * D / 4) < 1e-15);
  assert.ok(Math.abs(diameterFromArea(A) - D) < 1e-12);
  const Q = 0.045;
  const V = velocityFromFlow(Q, A);
  assert.ok(Math.abs(V - (4 * Q) / (Math.PI * D * D)) < 1e-12);
  assert.ok(Math.abs(flowFromVelocity(V, A) - Q) < 1e-12);
  assert.ok(Math.abs(diameterFromFlowVelocity(Q, V) - D) < 1e-12);
});

test('carga de presión P/γ', () => {
  const h = pressureHead(150000, GAMMA);
  assert.ok(Math.abs(h - 150000 / GAMMA) < 1e-12);
});

test('carga de velocidad V²/(2g) con alpha', () => {
  const V = 2;
  assert.ok(Math.abs(velocityHead(V, G) - (V * V) / (2 * G)) < 1e-15);
  assert.ok(Math.abs(velocityHead(V, G, 1.05) - (1.05 * V * V) / (2 * G)) < 1e-15);
});

test('energía en un punto H = z + P/γ + αV²/2g', () => {
  const e = energyAtPoint({ z: 102, P: 150000, V: 1.4324, gamma: GAMMA, g: G, alpha: 1 });
  assert.ok(Math.abs(e.H - (102 + 150000 / GAMMA + (1.4324 ** 2) / (2 * G))) < 1e-12);
});

test('validaciones de dominio', () => {
  assert.throws(() => areaFromDiameter(0), /positivo/);
  assert.throws(() => areaFromDiameter(-1), /positivo/);
  assert.throws(() => pressureHead(1, 0), /positivo/);
  assert.throws(() => velocityHead(1, 0), /positiv/);
  assert.throws(() => velocityHead(1, G, 0), /positiv/);
  assert.throws(() => energyAtPoint({ z: NaN, P: 0, V: 0, gamma: GAMMA, g: G }), /válida/);
});

test('balance verificado con tolerancia', () => {
  const ok = verifyBalance({ H1: 100.5, HB: 2, H2: 101.5, HT: 0, hL: 1 });
  assert.equal(ok.ok, true);
  assert.ok(Math.abs(ok.diff) < 1e-12);
});

test('balance desbalanceado detectado sin igualdad exacta', () => {
  const bad = verifyBalance({ H1: 100, HB: 0, H2: 101, HT: 0, hL: 0 });
  assert.equal(bad.ok, false);
  assert.ok(Math.abs(bad.diff - (-1)) < 1e-12);
  const floating = verifyBalance({ H1: 0.1 + 0.2, HB: 0, H2: 0.3, HT: 0, hL: 0 });
  assert.equal(floating.ok, true);
});
