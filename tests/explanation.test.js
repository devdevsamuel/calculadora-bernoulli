import test from 'node:test';
import assert from 'node:assert/strict';
import { solve } from '../src/modules/solver.js';

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

function dataByKey(explanation) {
  return Object.fromEntries(explanation.data.map((e) => [e.key, e]));
}

test('solución única: la explicación lista datos con origen, ecuación, operaciones y resultado con unidad', () => {
  const result = solve(baseState());
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.equal(result.status, 'unico');
  assert.equal(result.unit, 'Pa');
  assert.ok(Math.abs(result.value / 1000 - 106.598) < 0.2, `P2=${result.value / 1000} kPa`);

  const exp = result.explanation;
  assert.ok(exp.equation.general.includes('P₂'), 'la ecuación general debe incluir P₂');
  assert.ok(exp.equation.general.includes('h_L'), 'la ecuación general debe incluir h_L');
  assert.ok(exp.equation.isolated.includes('P₂ ='), 'la ecuación despejada debe aislar P₂');
  assert.ok(exp.equation.why.length > 20, 'debe explicarse por qué aplica la ecuación');

  const data = dataByKey(exp);
  assert.equal(data.z1.source, 'ingresado');
  assert.equal(data.z1.unit, 'm');
  assert.equal(data.P1.source, 'ingresado');
  assert.equal(data.V2.source, 'derivado', 'V₂ se deriva de Q₂ y D₂');
  assert.ok(data.V2.note.includes('4Q/(π·D²)'));
  assert.equal(data.A2.source, 'derivado');
  assert.equal(data.gamma.source, 'derivado');
  assert.ok(data.gamma.note.includes('ρ·g'));
  assert.equal(data.H1.source, 'calculado');
  assert.equal(data.HB.source, 'ingresado');
  assert.equal(data.Re.source, 'calculado');
  assert.equal(data.f.source, 'calculado');
  assert.equal(data.sumK.source, 'ingresado');

  assert.ok(exp.operations.some((op) => op.startsWith('γ = ρ·g')), 'operación de γ');
  assert.ok(exp.operations.some((op) => op.includes('H₁ =')), 'operación de H₁');
  assert.ok(exp.operations.some((op) => op.startsWith('Balance:')), 'operación de balance');

  assert.equal(exp.result.value, result.value);
  assert.equal(exp.result.unit, 'Pa');
  assert.deepEqual(result.alternatives, [], 'P₂ no tiene alternativas de raíz');
});

test('datos insuficientes: se explica qué falta y por qué, sin inventar valores', () => {
  const state = baseState({
    unknown: 'P2',
    p1: { z: null, P: null, V: null },
    p2: { z: null, Q: null, D: null, V: null },
    losses: { mode: 'ingresadas', hL: null },
  });
  const result = solve(state);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'insuficiente');
  assert.ok(Array.isArray(result.missing) && result.missing.length >= 4);
  assert.ok(result.missing.some((m) => m.includes('z1')));
  assert.equal(result.value, undefined);

  const exp = result.explanation;
  assert.equal(exp.insufficient.length, result.missing.length);
  for (const item of exp.insufficient) {
    assert.ok(item.reason.includes('P₂'), `la razón debe referenciar la incógnita: ${item.reason}`);
    assert.ok(item.reason.includes('despejar'), `la razón debe explicar por qué no es determinable: ${item.reason}`);
  }
  assert.ok(exp.equation.general.includes('h_L'), 'se muestra la ecuación que no pudo completarse');
  assert.ok(exp.statusReason.includes('P₂'));
  const data = dataByKey(exp);
  assert.equal(data.P2.source, 'faltante');
  assert.equal(data.P2.value, null);
});

test('múltiples soluciones: V₁ con pérdidas ingresadas admite ±V₁ verificadas por el balance', () => {
  const ref = solve(baseState());
  const state = baseState({
    unknown: 'V1',
    p1: { V: null },
    p2: { P: ref.value },
    losses: { mode: 'ingresadas', hL: ref.model.losses.hL },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.equal(result.status, 'multiples');
  assert.ok(result.value > 0, 'la solución mostrada es la raíz positiva');
  assert.ok(Math.abs(result.value - 1.4324) < 1e-3, `V1=${result.value}`);

  const alt = result.alternatives.find((a) => a.value < 0);
  assert.ok(alt, 'la raíz negativa debe listarse');
  assert.equal(alt.holds, true, 'la raíz negativa satisface el balance con pérdidas ingresadas');
  assert.ok(Math.abs(alt.value + result.value) < 1e-9, `alternativa=${alt.value}`);
  assert.ok(alt.condition.includes('sentido'), 'la condición debe referenciar el sentido del flujo');
  assert.ok(result.explanation.notes.some((n) => n.includes('Existen 2 soluciones')));
});

test('múltiples soluciones: el escaneo del rango no inventa raíces extra en el caso V₂ de referencia', () => {
  const P2 = solve(baseState()).value;
  const result = solve(baseState({ unknown: 'V2', p2: { P: P2 } }));
  assert.equal(result.ok, true);
  const extra = result.alternatives.filter((a) => a.condition.includes('rango de búsqueda'));
  assert.deepEqual(extra, [], 'no debe haber raíces numéricas adicionales espurias');
  assert.equal(result.alternatives.length, 1, 'solo la alternativa de signo');
});

test('raíz negativa de D₂ se descarta por dominio geométrico (D > 0)', () => {
  const P2 = solve(baseState()).value;
  const result = solve(baseState({ unknown: 'D2', p2: { D: null, P: P2 } }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.equal(result.status, 'unico');
  assert.ok(Math.abs(result.value - 0.15) < 1e-6, `D2=${result.value}`);
  const alt = result.alternatives.find((a) => a.value < 0);
  assert.ok(alt, 'la raíz negativa debe documentarse');
  assert.equal(alt.holds, false);
  assert.ok(alt.rejection.includes('dominio'), `rejection=${alt.rejection}`);
});

test('datos inválidos: viscosidad nula se rechaza sin calcular', () => {
  const result = solve(baseState({ fluid: { nu: 0 } }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalido');
  assert.ok(/viscosidad/i.test(result.error), result.error);
  assert.equal(result.value, undefined);
  assert.ok(result.explanation.statusReason.includes('viscosidad'));
});

test('datos inválidos: gravedad nula se rechaza sin calcular', () => {
  const result = solve(baseState({ fluid: { g: 0 } }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalido');
  assert.ok(/gravedad/i.test(result.error), result.error);
});

test('sin solución física: V₁ con S negativo se clasifica como imposible', () => {
  const state = baseState({
    unknown: 'V1',
    HB: 0,
    p1: { z: 100, P: 0, V: null },
    p2: { z: 0, P: 0, Q: null, D: 0.15, V: 0 },
    losses: { mode: 'ingresadas', hL: 0 },
  });
  const result = solve(state);
  assert.equal(result.ok, false);
  assert.equal(result.status, 'imposible');
  assert.ok(/negativo|solución/i.test(result.error), result.error);
});

test('supuestos indicados: ΣK vacío en modo automático se lista como supuesto, no como dato', () => {
  const result = solve(baseState({ pipe: { sumK: null } }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  assert.ok(result.explanation.assumptions.some((a) => a.includes('ΣK')));
  const sumK = dataByKey(result.explanation).sumK;
  assert.equal(sumK.source, 'supuesto');
  assert.equal(sumK.value, 0);
  assert.ok(sumK.note.includes('0 pérdidas menores'));
});

test('h_L sin H_B informado se clasifica como datos insuficientes (no «no finito»)', () => {
  const result = solve(baseState({
    unknown: 'hL',
    HB: null,
    losses: { mode: 'ingresadas', hL: null },
    p2: { P: 106598 },
  }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 'insuficiente');
  assert.ok(result.missing.some((m) => m.includes('H_B')), JSON.stringify(result.missing));
});

test('incógnita desconocida se clasifica como inválida', () => {
  const result = solve(baseState({ unknown: 'noExiste' }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 'invalido');
});
