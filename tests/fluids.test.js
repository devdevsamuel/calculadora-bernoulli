import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, FLUID_PRESETS, FLUID_CUSTOM, presetById } from '../src/data/defaults.js';
import { solve } from '../src/modules/solver.js';

function referenceState(fluidOverrides = {}) {
  return {
    fluid: {
      g: DEFAULTS.g,
      rho: DEFAULTS.rho,
      nu: DEFAULTS.nu,
      alpha1: 1,
      alpha2: 1,
      ...fluidOverrides,
    },
    HB: 12,
    HT: 0,
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
      },
    },
    points: {
      1: { z: 102, P: 150000, Q: null, D: null, V: 1.4324, A: null },
      2: { z: 115, P: null, Q: 0.045, D: 0.15, V: null, A: null },
    },
    unknown: 'P2',
  };
}

test('el preset por defecto coincide con DEFAULTS (agua 20 °C)', () => {
  const agua20 = presetById('agua-20');
  assert.ok(agua20);
  assert.equal(agua20.rho, DEFAULTS.rho);
  assert.equal(agua20.nu, DEFAULTS.nu);
});

test('todos los presets son de agua con ρ y ν positivas', () => {
  assert.ok(FLUID_PRESETS.length >= 5);
  const ids = new Set();
  for (const p of FLUID_PRESETS) {
    assert.match(p.label, /Agua/);
    assert.ok(Number.isFinite(p.rho) && p.rho > 900 && p.rho < 1010, `${p.id} rho`);
    assert.ok(Number.isFinite(p.nu) && p.nu > 0 && p.nu < 2e-6, `${p.id} nu`);
    assert.ok(!ids.has(p.id), `id duplicado ${p.id}`);
    ids.add(p.id);
  }
  assert.equal(presetById('no-existe'), null);
  assert.equal(FLUID_CUSTOM, 'personalizado');
});

test('las propiedades del fluido afectan a Reynolds, pérdidas y P2', () => {
  const base = solve(referenceState());
  assert.equal(base.ok, true);

  const agua4 = solve(referenceState({ nu: 1.567e-6, rho: 999.97 }));
  assert.equal(agua4.ok, true);
  const ReBase = base.model.losses.pipe?.Re ?? base.model.pipe.Re;
  const Re4 = agua4.model.losses.pipe?.Re ?? agua4.model.pipe.Re;
  assert.ok(Math.abs(Re4 - ReBase) > 1, `Re debe cambiar con ν: base=${ReBase} agua4=${Re4}`);
  assert.ok(Math.abs(agua4.model.losses.hL - base.model.losses.hL) > 1e-4, 'h_L debe cambiar con ν');
  assert.ok(Math.abs(agua4.value - base.value) > 1e-3, 'P2 debe cambiar con ρ y ν');

  const otroFluido = solve(referenceState({ nu: 1.5e-5, rho: 870 }));
  assert.equal(otroFluido.ok, true);
  assert.ok(Math.abs(otroFluido.value - base.value) > 1e-3, 'P2 debe cambiar para un fluido no agua');
});
