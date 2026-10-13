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

test('buildModel en modo ingresadas calcula f de referencia sin resolver pérdidas automáticamente', () => {
  const model = buildModel(baseState({ losses: { mode: 'ingresadas', hL: 3.1983 } }));
  assert.equal(model.losses.source, 'ingresada');
  assert.equal(model.losses.pipe, undefined, 'en modo ingresadas no hay resultado automático de pérdidas');
  assert.equal(model.losses.hf, null, 'h_f no se descompone en modo ingresadas (spec §4.1)');
  const info = model.pipe;
  assert.ok(info, 'el modelo de tubería existe con V, D y ν disponibles');
  assert.ok(Number.isFinite(info.f), `f de referencia calculado: ${info.f}`);
  assert.ok(Math.abs(info.f - 0.013891) < 5e-4, `f=${info.f}`);
  assert.match(info.fMethod, /Swamee-Jain/, 'el método usado queda etiquetado');
});

test('buildModel en modo ingresadas usa el factor f ingresado si el método lo indica', () => {
  const model = buildModel(baseState({
    losses: { mode: 'ingresadas', hL: 3.2 },
    pipe: { frictionMethod: 'f ingresado', fInput: 0.02 },
  }));
  assert.ok(Math.abs(model.pipe.f - 0.02) < 1e-12, `f=${model.pipe.f}`);
  assert.match(model.pipe.fMethod, /ingresado/);
});

test('despeje inverso: con P2 conocido, V2 (forma cerrada) ≈ 2.5465 m/s', () => {
  const P2 = solve(baseState()).value;
  const result = solve(baseState({ unknown: 'V2', p2: { P: P2 } }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(Math.abs(result.value - 2.5465) < 1e-3, `V2=${result.value}`);
  assert.ok(result.formula.includes('P₂/γ'), 'la fórmula de S debe incluir el término −P₂/γ');
  assert.equal(result.status, 'multiples', '±V₂ cumplen el balance (la energía depende de V²)');
  const alt = result.alternatives.find((a) => a.value < 0);
  assert.ok(alt && alt.holds, 'la raíz negativa debe listarse como alternativa verificada');
  assert.ok(Math.abs(alt.value + result.value) < 1e-9, `alternativa=${alt.value}`);
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

test('despeje de h_f y h_m desde el balance (regresión: antes nunca resolvían)', () => {
  const P2 = solve(baseState()).value;
  const hf = solve(baseState({ unknown: 'hf', p2: { P: P2 } }));
  assert.equal(hf.ok, true, JSON.stringify({ error: hf.error, missing: hf.missing }));
  assert.ok(Math.abs(hf.value - 2.7026) < 0.01, `hf=${hf.value}`);
  const hm = solve(baseState({ unknown: 'hm', p2: { P: P2 } }));
  assert.equal(hm.ok, true, JSON.stringify({ error: hm.error, missing: hm.missing }));
  assert.ok(Math.abs(hm.value - 0.4958) < 0.005, `hm=${hm.value}`);
  assert.ok(Math.abs((hf.value + hm.value) - 3.1994) < 0.01, `hf+hm=${hf.value + hm.value}`);
});

function depositosState(overrides = {}) {
  return {
    fluid: { g: 9.80665, rho: 998.2, nu: 1e-4, gamma: 998.2 * 9.80665, alpha1: 1, alpha2: 1 },
    HB: 'HB' in overrides ? overrides.HB : 0,
    HT: 'HT' in overrides ? overrides.HT : 0,
    losses: {
      mode: 'automaticas',
      hL: null,
      hf: null,
      hm: null,
      pipe: {
        L: 30,
        D: 0.1,
        epsilon: 0.00015,
        sumK: 5,
        Q: null,
        V: null,
        frictionMethod: 'auto',
        fInput: null,
        ...overrides.pipe,
      },
      ...overrides.losses,
    },
    points: {
      1: { z: 12, P: 0, Q: null, D: 0.1, V: 0, A: null, ...(overrides.p1 ?? {}) },
      2: { z: 0, P: 0, Q: null, D: 0.1, V: null, A: null, ...(overrides.p2 ?? {}) },
    },
    displayUnits: {},
    unknown: overrides.unknown ?? 'Q2',
  };
}

test('depósitos abiertos: Q2 se resuelve con pérdidas automáticas y V₁=0', () => {
  const result = solve(depositosState());
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.equal(result.numerical, true, 'la pérdida depende de V: se usa bisección');
  assert.ok(result.value > 0 && result.value < 0.1, `Q2=${result.value} m³/s`);
  const model = buildModel(applyUnknown(depositosState(), 'Q2', result.value));
  assert.equal(model.balance.ok, true);
});

test('depósitos abiertos: D solo en la tubería no impide resolver Q2', () => {
  const result = solve(depositosState({
    p1: { D: null },
    p2: { D: null },
  }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(result.value > 0, `Q2=${result.value}`);
});

test('depósitos abiertos: V1=0 no se usa como velocidad de tubería (sin error de Reynolds laminar)', () => {
  const result = solve(depositosState({ unknown: 'Q1', p1: { z: 0, V: null }, p2: { z: 12, V: 0 } }));
  assert.equal(result.ok, false);
  const texto = `${result.error ?? ''} ${(result.missing ?? []).join(' ')}`;
  assert.doesNotMatch(texto, /Reynolds positivo para el régimen laminar/, 'no debe confundir V=0 de depósito con V de tubería');
  assert.match(texto, /solución física|sentido 1→2|h_L\(V\)/, 'explica la imposibilidad física sin inventar datos');
});

test('V1 con automática y bomba: acoplamiento h_L(V) converge por bisección', () => {
  const result = solve(depositosState({
    unknown: 'V1',
    HB: 25,
    p1: { z: 0, V: null },
    p2: { z: 12, V: 0 },
  }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.equal(result.numerical, true);
  assert.ok(result.value > 0.5 && result.value < 20, `V1=${result.value} m/s`);
});

test('S negativo: el error incluye el valor de S y los términos evaluados', () => {
  const result = solve({
    fluid: { g: 9.81, rho: 1000, nu: 1e-6, gamma: 9810, alpha1: 1, alpha2: 1 },
    HB: 0,
    HT: 0,
    losses: {
      mode: 'ingresadas',
      hL: 0.1,
      hf: null,
      hm: null,
      pipe: { L: null, D: null, epsilon: null, sumK: null, Q: null, V: null, frictionMethod: 'auto', fInput: null },
    },
    points: {
      1: { z: 50, P: 0, Q: null, D: null, V: null, A: null },
      2: { z: 0, P: 0, Q: null, D: null, V: 0, A: null },
    },
    displayUnits: {},
    unknown: 'V1',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'imposible');
  assert.match(result.error, /S = -49,9 m es negativo|S = -49\.9 m es negativo/, 'muestra el valor de S');
  assert.match(result.error, /h_L \(0,1 m\)|h_L \(0\.1 m\)/, 'lista los términos de S');
});

test('auditoría: S negativo con la otra velocidad fijada explica el sobre-determinismo', () => {
  const result = solve({
    fluid: { g: 9.80665, rho: 998.2, nu: 1.004e-6, gamma: 998.2 * 9.80665, alpha1: 1, alpha2: 1 },
    HB: 0,
    HT: 0,
    losses: {
      mode: 'automaticas',
      hL: null,
      hf: null,
      hm: null,
      pipe: { L: 30, D: null, epsilon: 0.15e-3, sumK: 6.65, Q: null, V: null, frictionMethod: 'auto', fInput: null },
    },
    points: {
      1: { z: 12, P: 0, Q: null, D: 0.1, V: 3.437, A: null },
      2: { z: 0, P: 0, Q: null, D: 0.1, V: 3.437, A: null },
    },
    displayUnits: {},
    unknown: 'Q1',
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 'imposible');
  assert.match(result.error, /negativo/, 'mantiene el diagnóstico de S negativo');
  assert.match(result.error, /fijó V₂/, 'menciona la velocidad fijada en el otro punto');
  assert.match(result.error, /sobre-determinado/, 'explica que el sistema queda sobre-determinado');
  assert.match(result.error, /incógnita/, 'indica la acción correcta: seleccionarla como incógnita');
});

test('auditoría: con solo una velocidad fijada no se añade la nota de sobre-determinismo', () => {
  const state = depositosState({ unknown: 'V2', p2: { V: null } });
  const result = solve(state);
  if (!result.ok && result.error) {
    assert.doesNotMatch(result.error, /sobre-determinado/, 'sin ambas velocidades fijadas no aplica la nota');
  } else {
    assert.equal(result.ok, true, 'con una sola velocidad el sistema es resoluble');
  }
});

test('herencia de D de la tubería en derivePoint/applyUnknown', () => {
  const state = depositosState({ p1: { D: null }, p2: { D: null } });
  const model = buildModel(state);
  assert.equal(model.points[2].D, 0.1, 'el punto 2 hereda D de la tubería');
  assert.ok(Math.abs(model.points[2].A - Math.PI * 0.01 / 4) < 1e-15);
});

test('Q1 con tubería en ambos puntos: continuidad deriva V2 y la bisección converge', () => {
  const state = depositosState({
    unknown: 'Q1',
    p1: { z: 12, V: null },
    p2: { z: 0, V: null },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.equal(result.numerical, true);
  assert.ok(result.value > 0, `Q1=${result.value}`);
  const model = buildModel(applyUnknown(state, 'Q1', result.value));
  assert.equal(model.balance.ok, true);
  assert.ok(Math.abs(model.points[1].V - model.points[2].V) < 1e-9, 'mismo D ⇒ misma V por continuidad');
  assert.ok(model.pipe.Re > 0, 'Re se recalcula con la velocidad de la búsqueda');
});

test('Q1 con D solo en la tubería también resuelve por continuidad', () => {
  const result = solve(depositosState({
    unknown: 'Q1',
    p1: { z: 12, V: null, D: null },
    p2: { z: 0, V: null, D: null },
  }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(result.value > 0);
});

test('V fijada en el otro punto no se sobrescribe al resolver Q1', () => {
  const state = depositosState({
    unknown: 'Q1',
    p1: { z: 12, V: null },
    p2: { z: 0, V: 5 },
  });
  const applied = applyUnknown(state, 'Q1', 0.02);
  assert.equal(applied.points[2].V, 5, 'V2 fijada por el usuario se conserva');
  const result = solve(state);
  assert.equal(result.ok, false);
  assert.match(`${result.error ?? ''}`, /solución física|balance|no conver/i);
});

test('V1=0 de superficie no se usa como V de tubería (Q2 de depósitos sigue OK)', () => {
  const result = solve(depositosState({ unknown: 'Q2', p1: { V: 0 }, p2: { V: null } }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(result.value > 0);
});
