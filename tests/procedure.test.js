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
      mode: overrides.mode ?? 'automaticas',
      hL: overrides.hL ?? null,
      hf: null,
      hm: null,
      pipe: {
        L: overrides.L ?? 88.3,
        D: null,
        epsilon: 0.0015e-3,
        sumK: overrides.sumK ?? 1.5,
        Q: null,
        V: null,
        frictionMethod: 'auto',
        fInput: null,
        ...overrides.pipe,
      },
    },
    points: {
      1: { z: 102, P: 150000, Q: null, D: null, V: 'V1' in overrides ? overrides.V1 : 1.4324, A: null, ...(overrides.p1 ?? {}) },
      2: { z: 115, P: null, Q: 0.045, D: 0.15, V: null, A: null, ...(overrides.p2 ?? {}) },
    },
    displayUnits: overrides.displayUnits ?? null,
    unknown: overrides.unknown ?? 'P2',
  };
}

test('procedimiento de P₂: cinco pasos con método real y conversiones desde displayUnits', () => {
  const state = baseState({
    displayUnits: { P1: 'kPa', P2: 'psi', Q2: 'L/s', D2: 'mm', epsilon: 'mm' },
  });
  const result = solve(state);
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  const proc = result.explanation.procedure;

  assert.equal(proc.complete, true);
  assert.equal(proc.method, 'forma cerrada');
  assert.ok(proc.equation.includes('P₂') && proc.equation.includes('h_L'), 'paso 1: ecuación original');

  assert.ok(proc.symbolic.length >= 2, 'paso 2: despeje simbólico con pasos');
  assert.ok(proc.symbolic[0].includes('P₂/γ'), 'aislamiento simbólico de P₂/γ');
  assert.ok(proc.symbolic.some((l) => l.includes('γ·[')), 'multiplicación por γ');

  assert.ok(proc.conversions.some((l) => l.includes('kPa') && /× 1\.?000 =/.test(l)), 'factor kPa → Pa');
  assert.ok(proc.conversions.some((l) => l.includes('psi')), 'conversión del resultado a psi');
  assert.ok(proc.conversions.some((l) => l.includes('L/s')), 'factor L/s → m³/s');

  assert.ok(proc.substitution.includes('N/m³'), 'paso 4: sustitución con unidades');
  assert.ok(proc.substitution.includes(' Pa'));
  assert.ok(proc.substitution.includes(' m'));

  assert.equal(proc.result.unit, 'Pa');
  assert.equal(proc.result.displayUnit, 'psi');
  assert.ok(Math.abs(proc.result.displayValue - result.value / 6894.757293168) < 1e-9);
  assert.ok(proc.presentationNote.includes('sin redondeo intermedio'));
});

test('procedimiento dinámico: cada incógnita genera un despeje distinto y específico', () => {
  const P2 = solve(baseState()).value;
  const scenarios = [
    ['P2', baseState(), 'P₂/γ'],
    ['V2', baseState({ unknown: 'V2', p2: { P: P2 } }), 'V₂ = √(2g·S/α₂)'],
    ['Q2', baseState({ unknown: 'Q2', p2: { D: 0.15, V: 2.546479089470325, P: P2 } }), 'Q₂ = V₂·A₂'],
    ['L', baseState({ unknown: 'L', L: null, p2: { P: P2 } }), 'L = h_f·D/(f·V²/(2g))'],
    ['hL', baseState({ unknown: 'hL', mode: 'ingresadas', hL: null, p2: { P: P2 } }), 'h_L = H₁ + H_B − H₂ − H_T'],
  ];
  const seen = new Set();
  for (const [name, state, marker] of scenarios) {
    const result = solve(state);
    assert.equal(result.ok, true, `${name}: ${JSON.stringify({ error: result.error, missing: result.missing })}`);
    const proc = result.explanation.procedure;
    assert.ok(proc.symbolic.join(' ').includes(marker), `${name}: despeje debe contener «${marker}»`);
    assert.ok(proc.equation, `${name}: ecuación original presente`);
    const key = proc.symbolic.join('|');
    assert.ok(!seen.has(key), `${name}: el despeje debe diferir de los anteriores`);
    seen.add(key);
  }
});

test('procedimiento con método numérico: Q₂ resuelta por bisección lo declara con iteraciones', () => {
  const P2 = solve(baseState()).value;
  const result = solve(baseState({
    unknown: 'Q2',
    p2: { D: 0.15, V: 2.5465, P: P2 },
  }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  const proc = result.explanation.procedure;
  assert.equal(proc.complete, true);
  assert.match(proc.method, /^bisección numérica \(\d+ iteraciones\)$/);
  assert.ok(result.numerical && result.iterations > 0);
  assert.ok(proc.substitution.includes('m³/s'), 'la sustitución posterior a la bisección conserva unidades');
});

test('procedimiento de Re: definición directa, sin despeje y sin conversiones', () => {
  const result = solve(baseState({ unknown: 'Re' }));
  assert.equal(result.ok, true, JSON.stringify({ error: result.error, missing: result.missing }));
  const proc = result.explanation.procedure;
  assert.equal(proc.method, 'forma cerrada');
  assert.ok(proc.symbolic[0].includes('Sin despeje'));
  assert.equal(proc.conversions.length, 1);
  assert.ok(proc.conversions[0].startsWith('No se requieren conversiones'));
  assert.ok(proc.substitution.includes('m²/s'));
  assert.ok(Math.abs(result.value - 380450) < 1, `Re=${result.value}`);
});

test('procedimiento sin displayUnits declara el cálculo íntegramente en SI', () => {
  const result = solve(baseState());
  const proc = result.explanation.procedure;
  assert.equal(proc.conversions.length, 1);
  assert.ok(proc.conversions[0].startsWith('No se requieren conversiones'));
  assert.equal(proc.conversionResult, null);
  assert.equal(proc.result.displayUnit, null, 'sin unidad de pantalla no hay valor de presentación convertido');
});

test('procedimiento incompleto cuando faltan datos: no inventa sustitución ni resultado', () => {
  const result = solve(baseState({
    p1: { z: null, P: null, V: null },
    p2: { z: null, Q: null, D: null, V: null },
    mode: 'ingresadas',
    hL: null,
  }));
  assert.equal(result.ok, false);
  const proc = result.explanation.procedure;
  assert.equal(proc.complete, false);
  assert.equal(proc.method, 'no se completó el cálculo');
  assert.equal(proc.substitution, null, 'sin sustitución fabricada');
  assert.equal(proc.result, null, 'sin resultado fabricado');
  assert.deepEqual(proc.conversions, [], 'sin paso de conversiones incompleto');
  assert.ok(proc.symbolic.length > 0, 'se muestra el despeje que se aplicaría');
  assert.ok(result.explanation.insufficient.length >= 4, 'y las razones del faltante');
});

test('procedimiento con m.c.a.: el factor de conversión de presión usa γ', () => {
  const result = solve(baseState({ displayUnits: { P1: 'm.c.a.', P2: 'm.c.a.' } }));
  assert.equal(result.ok, true);
  const proc = result.explanation.procedure;
  const line = proc.conversions.find((l) => l.includes('m.c.a.'));
  assert.ok(line, JSON.stringify(proc.conversions));
  assert.ok(line.includes('factor hacia SI = γ'), line);
  assert.equal(proc.result.displayUnit, 'm.c.a.');
});
