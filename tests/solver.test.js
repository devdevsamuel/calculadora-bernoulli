import test from 'node:test';
import assert from 'node:assert/strict';
import { solve, buildModel, applyUnknown } from '../src/modules/solver.js';
import { toSI, fromSI } from '../src/modules/units.js';

const G = 9.80665;
const RHO = 998.2;
const NU = 1.004e-6;

function baseState(overrides = {}) {
  return {
    fluid: { g: G, rho: RHO, nu: NU, alpha1: 1, alpha2: 1, ...overrides.fluid },
    HB: 'HB' in overrides ? overrides.HB : 12,
    HT: 'HT' in overrides ? overrides.HT : 0,
    losses: {
      mode: 'automaticas',
      hL: null,
      hf: null,
      hm: null,
      pipe: {
        L: 88.3,
        D: null,
        epsilon: 0.0015e-3,
        sumK: 1.5,
        Q: null,
        V: null,
        frictionMethod: 'auto',
        fInput: null,
        ...overrides.pipe,
      },
      ...overrides.losses,
    },
    points: {
      1: { z: 102, P: 150000, Q: null, D: null, V: 1.4324, A: null, ...(overrides.p1 ?? {}) },
      2: { z: 115, P: null, Q: 0.045, D: 0.15, V: null, A: null, ...(overrides.p2 ?? {}) },
    },
    unknown: overrides.unknown ?? 'P2',
  };
}

test('caso de referencia: P2 ≈ 106.6 kPa con pérdidas automáticas', () => {
  const result = solve(baseState());
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  const P2kPa = result.value / 1000;
  assert.ok(Math.abs(P2kPa - 106.598) < 0.2, `P2=${P2kPa} kPa`);
  assert.ok(result.formula.includes('P₂'));
  const losses = result.model.losses;
  assert.ok(Math.abs(losses.hf - 2.7026) < 0.01, `hf=${losses.hf}`);
  assert.ok(Math.abs(losses.hm - 0.4958) < 0.005, `hm=${losses.hm}`);
  assert.ok(Math.abs(losses.hL - 3.1983) < 0.01, `hL=${losses.hL}`);
  const finalModel = buildModel(applyUnknown(baseState(), 'P2', result.value));
  assert.equal(finalModel.balance.ok, true);
  assert.ok(Math.abs(finalModel.points[2].energy.H - 126.2296) < 0.05, `H2=${finalModel.points[2].energy.H}`);
});

test('caso de referencia: V2 por Q y D coincide con ~2.5465 m/s', () => {
  const model = buildModel(baseState());
  assert.ok(Math.abs(model.points[2].V - 2.5465) < 1e-4, `V2=${model.points[2].V}`);
});

test('despeje inverso: con P2 conocido, V2 (numérico) ≈ 2.5465 m/s', () => {
  const P2 = solve(baseState()).value;
  const result = solve(baseState({ unknown: 'V2', p2: { P: P2 } }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 2.5465) < 1e-3, `V2=${result.value}`);
  assert.equal(result.numerical, true);
});

test('despeje de H_B desde el balance', () => {
  const state = baseState({
    unknown: 'HB',
    HB: null,
    losses: { mode: 'ingresadas', hL: 3.1983 },
    p2: { P: 106598 },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 12) < 0.05, `HB=${result.value}`);
});

test('despeje de h_L con pérdidas ingresadas', () => {
  const state = baseState({
    unknown: 'hL',
    losses: { mode: 'ingresadas', hL: null },
    p2: { P: 106598 },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 3.1983) < 0.05, `hL=${result.value}`);
});

test('despeje de z2', () => {
  const state = baseState({
    unknown: 'z2',
    p2: { z: null, P: 106598 },
    losses: { mode: 'ingresadas', hL: 3.1983 },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 115) < 0.05, `z2=${result.value}`);
});

test('despeje de V1 con datos suficientes y pérdidas automáticas consistentes', () => {
  const P2 = solve(baseState()).value;
  const result = solve(baseState({
    unknown: 'V1',
    p1: { V: null },
    p2: { P: P2 },
  }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 1.4324) < 1e-3, `V1=${result.value}`);
});

test('V1 sin solución real (S negativo) produce error comprensible', () => {
  const state = baseState({
    unknown: 'V1',
    HB: 0,
    p1: { z: 100, P: 0, V: null },
    p2: { z: 0, P: 0, Q: null, D: 0.15, V: 0 },
    losses: { mode: 'ingresadas', hL: 0 },
  });
  const result = solve(state);
  assert.equal(result.ok, false);
  assert.ok(/negativo|solución/i.test(result.error), result.error);
});

test('faltan datos: se lista lo concreto, sin devolver cero', () => {
  const state = baseState({
    unknown: 'P2',
    p1: { z: null, P: null, V: null },
    p2: { z: null, Q: null, D: null, V: null },
    losses: { mode: 'ingresadas', hL: null },
  });
  const result = solve(state);
  assert.equal(result.ok, false);
  assert.ok(Array.isArray(result.missing) && result.missing.length >= 4);
  assert.ok(result.missing.some((m) => m.includes('z1')));
  assert.equal(result.value, undefined);
});

test('viscosidad cero en pérdidas automáticas produce error', () => {
  const state = baseState({ fluid: { nu: 0 } });
  const result = solve(state);
  assert.equal(result.ok, false);
  assert.ok(/viscosidad/i.test(JSON.stringify(result.missing ?? result.error)));
});

test('equivalencia de unidades: P1 ingresada en psi (vía conversión) da el mismo P2', () => {
  const p1Pa = toSI(150, 'kPa', 'pressure');
  const asPsi = fromSI(p1Pa, 'psi', 'pressure');
  const backToPa = toSI(asPsi, 'psi', 'pressure');
  const a = solve(baseState());
  const b = solve(baseState({ p1: { P: backToPa } }));
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.ok(Math.abs(a.value - b.value) < 1e-6, `a=${a.value} b=${b.value}`);
});

test('equivalencia de unidades: D2 ingresado en pulgadas (vía conversión) da el mismo P2', () => {
  const dMm = toSI(150, 'mm', 'length');
  const asIn = fromSI(dMm, 'in', 'length');
  const backToM = toSI(asIn, 'in', 'length');
  const a = solve(baseState());
  const b = solve(baseState({ p2: { D: backToM } }));
  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  assert.ok(Math.abs(a.value - b.value) < 1e-6, `a=${a.value} b=${b.value}`);
});

test('despeje de L con pérdidas del balance', () => {
  const P2 = solve(baseState()).value;
  const state = baseState({
    unknown: 'L',
    pipe: { L: null },
    p2: { P: P2 },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 88.3) < 0.5, `L=${result.value}`);
});

test('despeje de ΣK desde h_m del balance', () => {
  const P2 = solve(baseState()).value;
  const state = baseState({
    unknown: 'sumK',
    pipe: { sumK: null },
    p2: { P: P2 },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 1.5) < 0.05, `ΣK=${result.value}`);
});

test('diámetro derivado D2 desde Q2 y V2', () => {
  const P2 = solve(baseState()).value;
  const state = baseState({
    unknown: 'D2',
    p2: { D: null, P: P2 },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 0.15) < 1e-6, `D2=${result.value}`);
});

test('incógnita desconocida rechazada', () => {
  const result = solve(baseState({ unknown: 'noExiste' }));
  assert.equal(result.ok, false);
});

test('applyUnknown permite reconstruir el modelo con el resultado', () => {
  const state = baseState();
  const result = solve(state);
  assert.equal(result.ok, true);
  const withResult = applyUnknown(state, 'P2', result.value);
  const model = buildModel(withResult);
  assert.equal(model.balance.ok, true);
});
