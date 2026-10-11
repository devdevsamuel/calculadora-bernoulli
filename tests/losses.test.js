import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFrictionFactor,
  calculateMajorLoss,
  calculateMinorLoss,
  calculateReynolds,
  calculateTotalLoss,
  colebrookWhiteFrictionFactor,
  computeAutomaticLosses,
  flowRegime,
  laminarFrictionFactor,
  swameeJainFrictionFactor,
  REGIME_LAMINAR,
  REGIME_TRANSITION,
  REGIME_TURBULENT,
} from '../src/modules/losses.js';

const G = 9.80665;
const NU = 1.004e-6;

test('Reynolds V·D/ν', () => {
  const Re = calculateReynolds(2.5465, 0.15, NU);
  assert.ok(Math.abs(Re - (2.5465 * 0.15) / NU) < 1e-6);
});

test('régimen laminar / transición / turbulento', () => {
  assert.equal(flowRegime(1000), REGIME_LAMINAR);
  assert.equal(flowRegime(3000), REGIME_TRANSITION);
  assert.equal(flowRegime(5000), REGIME_TURBULENT);
});

test('factor laminar f = 64/Re', () => {
  assert.ok(Math.abs(laminarFrictionFactor(1600) - 0.04) < 1e-12);
  const auto = calculateFrictionFactor(1600, 1e-6, 0.1, 'auto');
  assert.ok(Math.abs(auto.f - 0.04) < 1e-12);
  assert.equal(auto.regime, REGIME_LAMINAR);
});

test('Swamee-Jain coincide con el caso de referencia', () => {
  const V = 2.5465;
  const D = 0.15;
  const Re = calculateReynolds(V, D, NU);
  const epsilon = 0.0015e-3;
  const f = swameeJainFrictionFactor(Re, epsilon / D);
  assert.ok(Math.abs(f - 0.013891) < 2e-5, `f=${f}`);
});

test('Colebrook-White satisface la ecuación implícita y se aproxima a Swamee-Jain', () => {
  const Re = 380453;
  const epsRel = 1e-5;
  const fj = swameeJainFrictionFactor(Re, epsRel);
  const fc = colebrookWhiteFrictionFactor(Re, epsRel);
  const residual = 1 / Math.sqrt(fc) + 2 * Math.log10(epsRel / 3.7 + 2.51 / (Re * Math.sqrt(fc)));
  assert.ok(Math.abs(residual) < 1e-8, `residual Colebrook=${residual}`);
  assert.ok(Math.abs(fc - fj) < 2e-4, `fc=${fc} fj=${fj}`);
});

test('transición genera advertencia', () => {
  const result = calculateFrictionFactor(3000, 1e-6, 0.1, 'auto');
  assert.ok(result.warning && result.warning.includes('transición'));
});

test('Darcy-Weisbach y pérdidas menores', () => {
  const f = 0.013891;
  const L = 88.3;
  const D = 0.15;
  const V = 2.5465;
  const hf = calculateMajorLoss(f, L, D, V, G);
  assert.ok(Math.abs(hf - 2.7026) < 0.01, `hf=${hf}`);
  const hm = calculateMinorLoss(1.5, V, G);
  assert.ok(Math.abs(hm - 0.4958) < 0.005, `hm=${hm}`);
  const hL = calculateTotalLoss(hf, hm);
  assert.ok(Math.abs(hL - (hf + hm)) < 1e-15);
});

test('validaciones de dominio en pérdidas', () => {
  assert.throws(() => calculateMajorLoss(0.01, 10, 0, 1, G), /positivo/);
  assert.throws(() => calculateMajorLoss(-0.01, 10, 0.1, 1, G), /Darcy/);
  assert.throws(() => calculateMinorLoss(1, 1, 0), /gravedad/);
  assert.throws(() => calculateReynolds(1, 0.1, 0), /viscosidad/);
  assert.throws(() => calculateTotalLoss(-1, 0), /mayor/);
});

test('pérdidas automáticas del caso de referencia', () => {
  const result = computeAutomaticLosses({
    V: 2.5465,
    D: 0.15,
    L: 88.3,
    epsilon: 0.0015e-3,
    nu: NU,
    g: G,
    sumK: 1.5,
    frictionMethod: 'auto',
  });
  assert.ok(Math.abs(result.hf - 2.7026) < 0.01, `hf=${result.hf}`);
  assert.ok(Math.abs(result.hm - 0.4958) < 0.005, `hm=${result.hm}`);
  assert.ok(Math.abs(result.hL - 3.1983) < 0.01, `hL=${result.hL}`);
  assert.equal(result.regime, REGIME_TURBULENT);
});
