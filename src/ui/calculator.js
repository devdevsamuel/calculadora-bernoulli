import { toSI, fromSI, unitsFor } from '../modules/units.js';
import { solve, buildModel, applyUnknown } from '../modules/solver.js';
import { formatNumber, formatScientific } from '../modules/format.js';
import {
  DEFAULTS,
  REFERENCE_EXAMPLE,
  UNKNOWN_OPTIONS,
  FRICTION_METHODS,
  FLUID_PRESETS,
  FLUID_CUSTOM,
  presetById,
} from '../data/defaults.js';
import { updatePerfilChart, updateBarrasChart, updatePerdidasChart } from './chart.js';

const $ = (id) => document.getElementById(id);

let accesorios = [];
let debounceTimer = null;
let lastResult = null;

function fillSelect(el, options, selected) {
  el.innerHTML = '';
  for (const opt of options) {
    const o = document.createElement('option');
    if (typeof opt === 'string') {
      o.value = opt;
      o.textContent = opt;
    } else {
      o.value = opt.id;
      o.textContent = opt.label;
    }
    el.appendChild(o);
  }
  if (selected != null) el.value = selected;
}

function readNumber(el) {
  const raw = (el.value ?? '').trim();
  if (raw === '') return { value: null };
  const v = Number(raw.replace(',', '.'));
  if (!Number.isFinite(v)) {
    return { value: null, error: `«${raw}» no es un número válido` };
  }
  return { value: v };
}

function markInvalid(el) {
  el.setAttribute('aria-invalid', 'true');
}

function formatInput(value, digits = 6) {
  if (value == null || !Number.isFinite(value)) return '';
  if (value !== 0 && (Math.abs(value) < 1e-4 || Math.abs(value) >= 1e7)) {
    return value.toExponential(5);
  }
  return String(Number(value.toFixed(digits)));
}

function setupUnitSelect(id, quantity, selected) {
  const el = $(id);
  fillSelect(el, unitsFor(quantity), selected);
  el.dataset.prev = el.value;
}

function convertInPlace(inputEl, unitEl, quantity, gamma) {
  const r = readNumber(inputEl);
  if (r.value == null) return;
  const prev = unitEl.dataset.prev ?? unitEl.value;
  if (prev === unitEl.value) return;
  try {
    const si = toSI(r.value, prev, quantity, { gamma });
    inputEl.value = formatInput(fromSI(si, unitEl.value, quantity, { gamma }));
  } catch {
    /* si la unidad anterior era inválida, se conserva el texto */
  }
  unitEl.dataset.prev = unitEl.value;
}

function renderAccesorios() {
  const lista = $('accesorios-lista');
  lista.innerHTML = '';
  accesorios.forEach((acc, i) => {
    const li = document.createElement('li');
    li.className = 'flex flex-wrap items-center gap-2';
    li.innerHTML = `
      <input type="text" class="campo-editable w-40" data-campo="nombre" data-i="${i}" value="${acc.nombre}" aria-label="Nombre del accesorio ${i + 1}" placeholder="Nombre" />
      <input type="number" min="1" step="1" class="campo-editable w-20" data-campo="n" data-i="${i}" value="${acc.n}" aria-label="Cantidad del accesorio ${i + 1}" />
      <input type="number" step="any" min="0" class="campo-editable w-24" data-campo="K" data-i="${i}" value="${acc.K}" aria-label="Coeficiente K del accesorio ${i + 1}" />
      <span class="text-xs text-texto/70">(n·K = ${formatNumber(acc.n * acc.K)})</span>
      <button type="button" class="rounded border border-error-texto px-2 py-0.5 text-xs font-semibold text-error-texto hover:bg-error-fondo" data-quitar="${i}" aria-label="Quitar accesorio ${i + 1}">×</button>
    `;
    lista.appendChild(li);
  });
  const sumK = accesorios.reduce((s, a) => s + (Number(a.n) || 0) * (Number(a.K) || 0), 0);
  const input = $('pipe-sumK');
  if (accesorios.length > 0) {
    input.readOnly = true;
    input.value = formatInput(sumK);
  } else {
    input.readOnly = false;
  }
}

function readPoint(idx, errors, gamma) {
  const zEl = $(`p${idx}-z`);
  const pEl = $(`p${idx}-P`);
  const qEl = $(`p${idx}-Q`);
  const dEl = $(`p${idx}-D`);
  const vEl = $(`p${idx}-V`);
  const method = $(`p${idx}-vel-method`).value;

  const readBasic = (el, label, { positive = false, nonNegative = false } = {}) => {
    const r = readNumber(el);
    if (r.error) {
      errors.push(`${label}: ${r.error}`);
      markInvalid(el);
      return null;
    }
    if (r.value == null) return null;
    if (positive && r.value <= 0) {
      errors.push(`${label}: debe ser un número positivo`);
      markInvalid(el);
      return null;
    }
    if (nonNegative && r.value < 0) {
      errors.push(`${label}: no puede ser negativo`);
      markInvalid(el);
      return null;
    }
    return r.value;
  };

  const readUnit = (el, unitId, quantity, label, opts = {}) => {
    const unit = $(unitId).value;
    const v = readBasic(el, label, opts);
    if (v == null) return null;
    try {
      return toSI(v, unit, quantity, { gamma });
    } catch (err) {
      errors.push(`${label}: ${err.message}`);
      markInvalid(el);
      return null;
    }
  };

  const z = readBasic(zEl, `Cota z${idx}`, { nonNegative: false });
  const P = readUnit(pEl, `p${idx}-P-unit`, 'pressure', `Presión P${idx}`);
  const Q = readUnit(qEl, `p${idx}-Q-unit`, 'flow', `Caudal Q${idx}`, { positive: true });
  const D = readUnit(dEl, `p${idx}-D-unit`, 'length', `Diámetro D${idx}`, { positive: true });
  let V = null;
  if (method === 'directo') {
    V = readBasic(vEl, `Velocidad V${idx}`, { nonNegative: true });
  }
  return { z, P, Q, D, V, A: null, method };
}

function readState() {
  const errors = [];
  document.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

  const readPositive = (id, label) => {
    const el = $(id);
    const r = readNumber(el);
    if (r.error) {
      errors.push(`${label}: ${r.error}`);
      markInvalid(el);
      return null;
    }
    if (r.value == null) return null;
    if (r.value <= 0) {
      errors.push(`${label}: debe ser un número positivo`);
      markInvalid(el);
      return null;
    }
    return r.value;
  };

  const g = readPositive('gen-g', 'Gravedad g') ?? DEFAULTS.g;
  const rho = readPositive('gen-rho', 'Densidad ρ') ?? DEFAULTS.rho;
  const nuRaw = readNumber($('gen-nu'));
  let nu = DEFAULTS.nu;
  if (nuRaw.error) {
    errors.push(`Viscosidad ν: ${nuRaw.error}`);
    markInvalid($('gen-nu'));
  } else if (nuRaw.value != null) {
    if (nuRaw.value <= 0) {
      errors.push('Viscosidad ν: debe ser un número positivo');
      markInvalid($('gen-nu'));
    } else {
      nu = nuRaw.value;
    }
  }
  const gamma = rho * g;

  const readPlain = (id, label, { nonNegative = false } = {}) => {
    const el = $(id);
    const r = readNumber(el);
    if (r.error) {
      errors.push(`${label}: ${r.error}`);
      markInvalid(el);
      return null;
    }
    if (r.value == null) return null;
    if (nonNegative && r.value < 0) {
      errors.push(`${label}: no puede ser negativo`);
      markInvalid(el);
      return null;
    }
    return r.value;
  };

  const alpha1 = readNumber($('gen-alpha1')).value ?? DEFAULTS.alpha;
  const alpha2 = readNumber($('gen-alpha2')).value ?? DEFAULTS.alpha;
  if (alpha1 <= 0 || alpha2 <= 0) {
    errors.push('Los coeficientes α deben ser positivos');
  }

  const HB = readPlain('gen-HB', 'Carga de bomba H_B', { nonNegative: true });
  const HT = readPlain('gen-HT', 'Carga de turbina H_T', { nonNegative: true });

  const mode = document.querySelector('input[name="modo-perdidas"]:checked').value;
  let hL = null;
  let hf = null;
  let hm = null;
  if (mode === 'ingresadas') {
    hL = readPlain('inp-hL', 'Pérdidas h_L', { nonNegative: true });
    if (hL == null) {
      hf = readPlain('inp-hf', 'Pérdida mayor h_f', { nonNegative: true });
      hm = readPlain('inp-hm', 'Pérdida menor h_m', { nonNegative: true });
    }
  }

  const frictionMethod = $('pipe-f-method').value;
  let fInput = null;
  if (frictionMethod === 'f ingresado') {
    fInput = readNumber($('pipe-f-input')).value;
    if (fInput != null && fInput <= 0) {
      errors.push('El factor de fricción ingresado debe ser positivo');
      markInvalid($('pipe-f-input'));
    }
  }

  let sumK = null;
  if (accesorios.length > 0) {
    sumK = accesorios.reduce((s, a) => s + (Number(a.n) || 0) * (Number(a.K) || 0), 0);
  } else {
    sumK = readPlain('pipe-sumK', 'Coeficientes ΣK', { nonNegative: true });
  }

  const pipe = {
    L: readPlain('pipe-L', 'Longitud L', { nonNegative: true }),
    D: (() => {
      const r = readNumber($('pipe-D'));
      if (r.error) {
        errors.push(`Diámetro de tubería: ${r.error}`);
        markInvalid($('pipe-D'));
        return null;
      }
      if (r.value == null) return null;
      if (r.value <= 0) {
        errors.push('Diámetro de tubería: debe ser positivo');
        markInvalid($('pipe-D'));
        return null;
      }
      return toSI(r.value, $('pipe-D-unit').value, 'length');
    })(),
    epsilon: (() => {
      const r = readNumber($('pipe-eps'));
      if (r.error) {
        errors.push(`Rugosidad ε: ${r.error}`);
        markInvalid($('pipe-eps'));
        return null;
      }
      if (r.value == null) return null;
      if (r.value < 0) {
        errors.push('Rugosidad ε: no puede ser negativa');
        markInvalid($('pipe-eps'));
        return null;
      }
      return toSI(r.value, $('pipe-eps-unit').value, 'length');
    })(),
    sumK,
    Q: (() => {
      const r = readNumber($('pipe-Q'));
      if (r.error) {
        errors.push(`Caudal de tubería: ${r.error}`);
        markInvalid($('pipe-Q'));
        return null;
      }
      if (r.value == null) return null;
      return toSI(r.value, $('pipe-Q-unit').value, 'flow');
    })(),
    V: null,
    frictionMethod,
    fInput,
  };
  if (pipe.L != null && pipe.L < 0) errors.push('Longitud L: no puede ser negativa');

  const state = {
    fluid: { g, rho, nu, gamma, alpha1, alpha2 },
    HB,
    HT,
    losses: { mode, hL, hf, hm, pipe },
    points: {
      1: readPoint(1, errors, gamma),
      2: readPoint(2, errors, gamma),
    },
    unknown: $('incognita').value,
  };
  return { state, errors, gamma };
}

function unknownInputId(target) {
  const map = {
    P1: 'p1-P', P2: 'p2-P',
    z1: 'p1-z', z2: 'p2-z',
    V1: 'p1-V', V2: 'p2-V',
    Q1: 'p1-Q', Q2: 'p2-Q',
    D1: 'p1-D', D2: 'p2-D',
    HB: 'gen-HB', HT: 'gen-HT',
    hL: 'inp-hL', hf: 'inp-hf', hm: 'inp-hm',
    L: 'pipe-L', sumK: 'pipe-sumK',
  };
  return map[target] ?? null;
}

function applyUnknownHighlight(target) {
  document.querySelectorAll('[data-fue-incognita]').forEach((el) => {
    el.disabled = el.dataset.origDisabled === 'true';
    el.removeAttribute('data-fue-incognita');
  });
  const id = unknownInputId(target);
  if (!id) return;
  const el = $(id);
  if (!el) return;
  el.dataset.origDisabled = el.disabled ? 'true' : 'false';
  el.dataset.fueIncognita = '1';
  el.disabled = true;
  el.placeholder = 'calculado';
  el.value = '';
}

function setStateValue(inputId, value, digits = 4) {
  const el = $(inputId);
  if (!el) return;
  el.value = formatInput(value, digits);
}

function renderAlerts(errors, result) {
  const box = $('resultado-alertas');
  box.innerHTML = '';
  const items = [...errors];
  if (result?.missing) items.push(...result.missing.map((m) => `Falta: ${m}`));
  if (result?.error) items.push(result.error);
  if (items.length === 0) return;
  const div = document.createElement('div');
  div.className = 'estado-error rounded px-3 py-2 text-sm';
  div.setAttribute('role', 'alert');
  div.innerHTML = `<strong class="font-bold">Revise los datos:</strong>
    <ul class="mt-1 list-disc pl-5">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  box.appendChild(div);
}

function renderEmptyOutputs(estadoTexto, estadoCls) {
  $('resultado-valor').textContent = '—';
  $('resultado-unidad').textContent = '';
  const estado = $('resultado-estado');
  estado.textContent = estadoTexto;
  estado.className = `rounded px-3 py-1.5 text-sm font-semibold ${estadoCls}`;
  $('procedimiento-formula').textContent = '—';
  $('procedimiento-sustitucion').textContent = '—';
  $('procedimiento-resultado').textContent = '—';
  $('procedimiento-notas').innerHTML = '';
  for (const id of ['comp-z1', 'comp-z2', 'comp-hP1', 'comp-hP2', 'comp-hV1', 'comp-hV2', 'comp-H1', 'comp-H2',
    'comprobacion-izq', 'comprobacion-der', 'comprobacion-diff',
    'perfil-z1', 'perfil-z2', 'perfil-hgl1', 'perfil-hgl2', 'perfil-egl1', 'perfil-egl2',
    'pipe-V', 'pipe-A', 'pipe-Re', 'pipe-regimen', 'pipe-f', 'pipe-hf', 'pipe-hm', 'pipe-hL']) {
    $(id).textContent = '—';
  }
  $('pipe-warn').textContent = '—';
  $('comprobacion-estado').textContent = '—';
  $('comprobacion-estado').className = 'mt-1 rounded px-2 py-1 text-sm font-bold';
  $('valores-usados').innerHTML = '';
  $('chart-perfil-resumen').textContent = '';
  $('chart-perdidas-resumen').textContent = '';
  $('p1-A').value = '';
  $('p2-A').value = '';
  safeChart(() => updatePerfilChart({ z: [null, null], hgl: [null, null], egl: [null, null], labels: [], empty: true }));
  safeChart(() => updateBarrasChart({ z: [null, null], hP: [null, null], hV: [null, null], H: [null, null], empty: true }));
  safeChart(() => updatePerdidasChart({ hf: null, hm: null, hL: null, empty: true }));
}

function resultUnit(target, state, model) {
  switch (target) {
    case 'P1':
    case 'P2': {
      const idx = target === 'P1' ? 1 : 2;
      return $(`p${idx}-P-unit`).value;
    }
    case 'Q1':
    case 'Q2': {
      const idx = target === 'Q1' ? 1 : 2;
      return $(`p${idx}-Q-unit`).value;
    }
    case 'D1':
    case 'D2': {
      const idx = target === 'D1' ? 1 : 2;
      return $(`p${idx}-D-unit`).value;
    }
    case 'z1':
    case 'z2':
    case 'HB':
    case 'HT':
    case 'hL':
    case 'hf':
    case 'hm':
    case 'L':
      return 'm';
    case 'V1':
    case 'V2':
      return 'm/s';
    case 'A1':
    case 'A2':
      return 'm²';
    case 'Re':
      return '(adimensional)';
    case 'f':
    case 'sumK':
      return '(adimensional)';
    default:
      return '';
  }
}

function toDisplayUnit(value, target, state) {
  try {
    if (target === 'P1' || target === 'P2') {
      const unit = $(`p${target === 'P1' ? 1 : 2}-P-unit`).value;
      return fromSI(value, unit, 'pressure', { gamma: state.fluid.gamma });
    }
    if (target === 'Q1' || target === 'Q2') {
      const unit = $(`p${target === 'Q1' ? 1 : 2}-Q-unit`).value;
      return fromSI(value, unit, 'flow');
    }
    if (target === 'D1' || target === 'D2') {
      const unit = $(`p${target === 'D1' ? 1 : 2}-D-unit`).value;
      return fromSI(value, unit, 'length');
    }
  } catch {
    return value;
  }
  return value;
}

function writeComputedCell(target, value, state) {
  const id = unknownInputId(target);
  if (!id) return;
  const el = $(id);
  if (!el) return;
  const disp = toDisplayUnit(value, target, state);
  el.value = formatInput(disp, target === 'Re' ? 0 : 6);
}

function applyFluidPreset() {
  const p = presetById($('gen-fluido').value);
  if (!p) return;
  $('gen-rho').value = String(p.rho);
  $('gen-nu').value = String(p.nu);
}

function setFluidPreset(id) {
  $('gen-fluido').value = id;
  applyFluidPreset();
}

function markFluidCustomIfEdited() {
  const sel = $('gen-fluido');
  const p = presetById(sel.value);
  if (!p) return;
  const rho = Number($('gen-rho').value.replace(',', '.'));
  const nu = Number($('gen-nu').value.replace(',', '.'));
  if (rho !== p.rho || nu !== p.nu) {
    sel.value = FLUID_CUSTOM;
  }
}

function safeChart(fn) {
  try {
    fn();
  } catch (err) {
    console.warn('La gráfica no pudo actualizarse:', err);
  }
}

function renderModelTables(model, state) {
  const p1 = model.points[1];
  const p2 = model.points[2];

  $('p1-A').value = p1.A != null ? formatInput(p1.A) : '';
  $('p2-A').value = p2.A != null ? formatInput(p2.A) : '';

  for (const idx of [1, 2]) {
    const p = model.points[idx];
    const method = $(`p${idx}-vel-method`).value;
    const vEl = $(`p${idx}-V`);
    if (method === 'cqd') {
      vEl.disabled = true;
      vEl.value = p.V != null ? formatInput(p.V) : '';
    } else if (!vEl.dataset.fueIncognita) {
      vEl.disabled = false;
    }
    if (p.energy) {
      $(`comp-z${idx}`).textContent = formatNumber(p.energy.z);
      $(`comp-hP${idx}`).textContent = formatNumber(p.energy.hP);
      $(`comp-hV${idx}`).textContent = formatNumber(p.energy.hV);
      $(`comp-H${idx}`).textContent = formatNumber(p.energy.H);
      $(`perfil-z${idx}`).textContent = formatNumber(p.z);
      $(`perfil-hgl${idx}`).textContent = formatNumber(p.z + p.energy.hP);
      $(`perfil-egl${idx}`).textContent = formatNumber(p.energy.H);
    } else {
      for (const kind of ['z', 'hP', 'hV', 'H']) $(`comp-${kind}${idx}`).textContent = '—';
      $(`perfil-z${idx}`).textContent = p.z != null ? formatNumber(p.z) : '—';
      $(`perfil-hgl${idx}`).textContent = '—';
      $(`perfil-egl${idx}`).textContent = '—';
    }
  }

  const bal = model.balance;
  if (bal) {
    $('comprobacion-izq').textContent = formatNumber(bal.left);
    $('comprobacion-der').textContent = formatNumber(bal.right);
    $('comprobacion-diff').textContent = formatNumber(bal.diff, 6);
    const estado = $('comprobacion-estado');
    if (bal.ok) {
      estado.textContent = 'Balance verificado';
      estado.className = 'mt-1 rounded px-2 py-1 text-sm font-bold estado-ok';
    } else {
      estado.textContent = 'Revisar datos';
      estado.className = 'mt-1 rounded px-2 py-1 text-sm font-bold estado-error';
    }
  } else {
    $('comprobacion-izq').textContent = '—';
    $('comprobacion-der').textContent = '—';
    $('comprobacion-diff').textContent = '—';
    const estado = $('comprobacion-estado');
    estado.textContent = 'Datos insuficientes';
    estado.className = 'mt-1 rounded px-2 py-1 text-sm font-bold estado-aviso';
  }

  const loss = model.losses;
  const pipeRes = loss.pipe ?? null;
  if (loss.error) {
    for (const id of ['pipe-hf', 'pipe-hm', 'pipe-hL']) $(id).textContent = '—';
    $('pipe-warn').textContent = loss.error;
  } else {
    $('pipe-hf').textContent = loss.hf != null ? `${formatNumber(loss.hf)} m` : '—';
    $('pipe-hm').textContent = loss.hm != null ? `${formatNumber(loss.hm)} m` : '—';
    $('pipe-hL').textContent = `${formatNumber(loss.hL)} m`;
    $('pipe-warn').textContent = loss.source === 'automática'
      ? (pipeRes?.warning ?? '—')
      : `Pérdidas ingresadas por el usuario (fuente: ${loss.source}).`;
  }
  if (!loss.error && loss.hf != null && loss.hm != null && loss.hL != null) {
    safeChart(() => updatePerdidasChart({ hf: loss.hf, hm: loss.hm, hL: loss.hL, empty: false }));
    $('chart-perdidas-resumen').textContent =
      `Resumen de pérdidas: h_f (fricción) = ${formatNumber(loss.hf)} m, ` +
      `h_m (accesorios) = ${formatNumber(loss.hm)} m, h_L total = ${formatNumber(loss.hL)} m` +
      (pipeRes?.fMethod ? ` · factor de Darcy: ${pipeRes.fMethod}.` : '.');
  } else {
    safeChart(() => updatePerdidasChart({ hf: null, hm: null, hL: null, empty: true }));
    $('chart-perdidas-resumen').textContent = loss.error
      ? `Sin composición de pérdidas: ${loss.error}`
      : 'Sin composición de pérdidas por separado: en el modo «ingresadas» con h_L directo sólo se conoce el total (active el cálculo automático o ingrese h_f y h_m).';
  }
  if (pipeRes) {
    $('pipe-V').textContent = `${formatNumber(pipeRes.V, 5)} m/s`;
    $('pipe-A').textContent = `${formatNumber(pipeRes.A, 6)} m²`;
    $('pipe-Re').textContent = formatNumber(pipeRes.Re, 0);
    $('pipe-regimen').textContent = pipeRes.regime;
    $('pipe-f').textContent = `${formatNumber(pipeRes.f, 6)} (${pipeRes.fMethod})`;
    if (pipeRes.warning && !loss.error) {
      $('pipe-warn').textContent = pipeRes.warning;
    }
  } else if (!loss.error) {
    const info = model.pipe;
    if (info) {
      $('pipe-V').textContent = `${formatNumber(info.V, 5)} m/s`;
      $('pipe-A').textContent = `${formatNumber(info.A, 6)} m²`;
      $('pipe-Re').textContent = formatNumber(info.Re, 0);
      $('pipe-regimen').textContent = info.regime;
    } else {
      for (const id of ['pipe-V', 'pipe-A', 'pipe-Re', 'pipe-regimen', 'pipe-f']) $(id).textContent = '—';
    }
  }

  const usados = [];
  const push = (label, val) => {
    if (val != null) usados.push(`<li><span class="font-semibold">${label}:</span> ${val}</li>`);
  };
  push('γ = ρg', `${formatNumber(model.gamma, 2)} N/m³`);
  push('g', `${formatNumber(state.fluid.g, 5)} m/s²`);
  push('ν', `${formatScientific(state.fluid.nu)} m²/s`);
  push('α₁ / α₂', `${formatNumber(state.fluid.alpha1, 3)} / ${formatNumber(state.fluid.alpha2, 3)}`);
  for (const idx of [1, 2]) {
    const p = model.points[idx];
    push(`z${idx}`, p.z != null ? `${formatNumber(p.z)} m` : null);
    push(`P${idx}`, p.P != null ? `${formatNumber(p.P / 1000, 4)} kPa (${formatNumber(p.P, 2)} Pa)` : null);
    push(`V${idx}`, p.V != null ? `${formatNumber(p.V, 5)} m/s` : null);
    push(`Q${idx}`, p.Q != null ? `${formatNumber(p.Q * 1000, 4)} L/s` : null);
    push(`D${idx}`, p.D != null ? `${formatNumber(p.D * 1000, 3)} mm` : null);
    if (p.energy) push(`H${idx}`, `${formatNumber(p.energy.H)} m`);
  }
  push('H_B', model.HB != null ? `${formatNumber(model.HB)} m` : null);
  push('H_T', model.HT != null ? `${formatNumber(model.HT)} m` : null);
  if (!loss.error) push(`h_L (${loss.source})`, `${formatNumber(loss.hL)} m`);
  if (loss.hf != null) push('h_f', `${formatNumber(loss.hf)} m`);
  if (loss.hm != null) push('h_m', `${formatNumber(loss.hm)} m`);
  if (model.pipe) {
    push('D tubería', `${formatNumber(model.pipe.D * 1000, 3)} mm`);
    push('Re (tubería)', formatNumber(model.pipe.Re, 0));
  }
  $('valores-usados').innerHTML = usados.join('') || '<li class="text-texto/60">Sin datos todavía.</li>';

  const e1 = model.points[1].energy;
  const e2 = model.points[2].energy;
  const L = state.losses.pipe.L;
  const hasBoth = e1 && e2;
  if (hasBoth) {
    const z = [e1.z, e2.z];
    const hgl = [e1.z + e1.hP, e2.z + e2.hP];
    const egl = [e1.H, e2.H];
    const linear = L != null && L > 0;
    const labels = linear ? [0, L] : ['Punto 1', 'Punto 2'];
    safeChart(() => updatePerfilChart({ z, hgl, egl, labels, xIsLinear: linear, empty: false }));
    safeChart(() => updateBarrasChart({
      z: [e1.z, e2.z],
      hP: [e1.hP, e2.hP],
      hV: [e1.hV, e2.hV],
      H: [e1.H, e2.H],
      empty: false,
    }));
    $('chart-perfil-resumen').textContent =
      `Resumen: Punto 1 — z=${formatNumber(e1.z)} m, HGL=${formatNumber(hgl[0])} m, EGL=${formatNumber(egl[0])} m. ` +
      `Punto 2 — z=${formatNumber(e2.z)} m, HGL=${formatNumber(hgl[1])} m, EGL=${formatNumber(egl[1])} m.` +
      (linear ? ` Distancia entre puntos: ${formatNumber(L)} m (interpolación ilustrativa).` : '');
  } else {
    safeChart(() => updatePerfilChart({ z: [null, null], hgl: [null, null], egl: [null, null], labels: [], empty: true }));
    safeChart(() => updateBarrasChart({ z: [null, null], hP: [null, null], hV: [null, null], H: [null, null], empty: true }));
    $('chart-perfil-resumen').textContent =
      'Complete z, P y V en ambos puntos (y resuelva) para representar la cota, la línea piezométrica y la línea de energía.';
  }
}

function calculate() {
  const { state, errors } = readState();
  $('gen-gamma').value = formatInput(state.fluid.rho * state.fluid.g, 2);

  if (errors.length > 0) {
    renderAlerts(errors, null);
    renderEmptyOutputs('Corrija los campos marcados para calcular.', 'estado-error');
    lastResult = null;
    return;
  }

  const result = solve(state);
  lastResult = { result, state };
  renderAlerts([], result.ok ? null : result);

  if (!result.ok) {
    const estado = $('resultado-estado');
    if (result.missing) {
      estado.textContent = 'Faltan datos para una solución única.';
      estado.className = 'rounded px-3 py-1.5 text-sm font-semibold estado-aviso';
    } else {
      estado.textContent = 'Sin solución con los datos actuales.';
      estado.className = 'rounded px-3 py-1.5 text-sm font-semibold estado-error';
    }
    $('resultado-valor').textContent = '—';
    $('resultado-unidad').textContent = '';
    $('resultado-descripcion').textContent =
      (UNKNOWN_OPTIONS.find((o) => o.id === state.unknown)?.label) ?? 'Resultado';
    $('procedimiento-formula').textContent = '—';
    $('procedimiento-sustitucion').textContent = '—';
    $('procedimiento-resultado').textContent = '—';
    $('procedimiento-notas').innerHTML = '';
    renderModelTables(result.model, state);
    return;
  }

  let displayState = state;
  let displayModel = result.model;
  try {
    displayState = applyUnknown(state, state.unknown, result.value);
    displayModel = buildModel(displayState);
    displayState.fluid.gamma = displayState.fluid.rho * displayState.fluid.g;
  } catch {
    displayState = state;
    displayModel = result.model;
  }

  const label = UNKNOWN_OPTIONS.find((o) => o.id === state.unknown)?.label ?? state.unknown;
  const unit = resultUnit(state.unknown, state, displayModel);
  const disp = toDisplayUnit(result.value, state.unknown, displayState);
  $('resultado-descripcion').textContent = label;
  $('resultado-valor').textContent = formatNumber(disp, state.unknown === 'Re' ? 0 : 4);
  $('resultado-unidad').textContent = unit.startsWith('(') ? unit : unit;
  const estado = $('resultado-estado');
  estado.textContent = result.numerical
    ? 'Resultado por solucionador numérico · balance verificado'
    : 'Resultado calculado · balance verificado';
  estado.className = 'rounded px-3 py-1.5 text-sm font-semibold estado-ok';

  $('procedimiento-formula').textContent = result.formula ?? '—';
  $('procedimiento-sustitucion').textContent = result.substitution ?? '—';
  $('procedimiento-resultado').textContent = `${label} = ${formatNumber(disp, 4)} ${unit}`.trim();
  $('procedimiento-notas').innerHTML = (result.notes ?? []).map((n) => `<li>${n}</li>`).join('');

  writeComputedCell(state.unknown, result.value, displayState);
  renderModelTables(displayModel, displayState);
}

function scheduleCalculate() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(calculate, 250);
}

function toggleModoPerdidas() {
  const mode = document.querySelector('input[name="modo-perdidas"]:checked').value;
  $('bloque-perdidas-ingresadas').classList.toggle('hidden', mode !== 'ingresadas');
  scheduleCalculate();
}

function updateVelocityMethod(idx) {
  const method = $(`p${idx}-vel-method`).value;
  const vEl = $(`p${idx}-V`);
  if (method === 'cqd') {
    vEl.disabled = true;
    vEl.placeholder = 'calculada';
  } else if (!vEl.dataset.fueIncognita) {
    vEl.disabled = false;
    vEl.placeholder = '';
  }
  scheduleCalculate();
}

function loadExample() {
  const ex = REFERENCE_EXAMPLE;
  $('incognita').value = ex.unknown;
  setFluidPreset('agua-20');
  $('gen-g').value = String(DEFAULTS.g);
  $('gen-alpha1').value = '1';
  $('gen-alpha2').value = '1';
  $('gen-HB').value = String(ex.HB);
  $('gen-HT').value = String(ex.HT);
  $('modo-automaticas').checked = true;
  $('modo-ingresadas').checked = false;
  $('inp-hL').value = '';
  $('inp-hf').value = '';
  $('inp-hm').value = '';
  $('p1-z').value = String(ex.z1);
  $('p1-P').value = String(ex.P1);
  $('p1-P-unit').value = ex.P1Unit;
  $('p1-P-unit').dataset.prev = ex.P1Unit;
  $('p1-Q').value = '';
  $('p1-D').value = '';
  $('p1-vel-method').value = 'directo';
  $('p1-V').value = String(ex.V1);
  $('p2-z').value = String(ex.z2);
  $('p2-P').value = '';
  $('p2-P-unit').value = 'kPa';
  $('p2-P-unit').dataset.prev = 'kPa';
  $('p2-Q').value = String(ex.Q2);
  $('p2-Q-unit').value = ex.Q2Unit;
  $('p2-Q-unit').dataset.prev = ex.Q2Unit;
  $('p2-D').value = String(ex.D2);
  $('p2-D-unit').value = ex.D2Unit;
  $('p2-D-unit').dataset.prev = ex.D2Unit;
  $('p2-vel-method').value = 'cqd';
  $('p2-V').value = '';
  $('pipe-L').value = String(ex.L);
  $('pipe-D').value = '';
  $('pipe-D-unit').value = 'mm';
  $('pipe-D-unit').dataset.prev = 'mm';
  $('pipe-eps').value = String(ex.epsilon);
  $('pipe-eps-unit').value = ex.epsilonUnit;
  $('pipe-eps-unit').dataset.prev = ex.epsilonUnit;
  $('pipe-Q').value = '';
  $('pipe-Q-unit').value = 'L/s';
  $('pipe-Q-unit').dataset.prev = 'L/s';
  accesorios = [];
  renderAccesorios();
  $('pipe-sumK').value = String(ex.sumK);
  $('pipe-f-method').value = 'auto';
  $('bloque-f-input').classList.add('hidden');
  toggleModoPerdidas();
  applyUnknownHighlight(ex.unknown);
  updateVelocityMethod(2);
  calculate();
}

function resetAll() {
  $('incognita').value = 'P2';
  setFluidPreset('agua-20');
  $('gen-g').value = String(DEFAULTS.g);
  $('gen-alpha1').value = '1';
  $('gen-alpha2').value = '1';
  $('gen-HB').value = '0';
  $('gen-HT').value = '0';
  $('modo-ingresadas').checked = true;
  $('modo-automaticas').checked = false;
  $('inp-hL').value = '0';
  $('inp-hf').value = '';
  $('inp-hm').value = '';
  for (const idx of [1, 2]) {
    $(`p${idx}-z`).value = '';
    $(`p${idx}-P`).value = '';
    $(`p${idx}-Q`).value = '';
    $(`p${idx}-D`).value = '';
    $(`p${idx}-V`).value = '';
    $(`p${idx}-vel-method`).value = 'directo';
    $(`p${idx}-V`).disabled = false;
  }
  $('pipe-L').value = '';
  $('pipe-D').value = '';
  $('pipe-eps').value = '';
  $('pipe-Q').value = '';
  accesorios = [];
  renderAccesorios();
  $('pipe-sumK').value = '';
  $('pipe-f-method').value = 'auto';
  $('pipe-f-input').value = '';
  $('bloque-f-input').classList.add('hidden');
  document.querySelectorAll('[data-fue-incognita]').forEach((el) => {
    el.disabled = false;
    el.removeAttribute('data-fue-incognita');
  });
  toggleModoPerdidas();
  applyUnknownHighlight('P2');
  calculate();
}

export function initCalculator() {
  fillSelect($('incognita'), UNKNOWN_OPTIONS, 'P2');
  fillSelect(
    $('gen-fluido'),
    [
      ...FLUID_PRESETS.map((p) => ({ id: p.id, label: p.label })),
      { id: FLUID_CUSTOM, label: 'Personalizado (editar ρ y ν manualmente)' },
    ],
    'agua-20',
  );
  setupUnitSelect('p1-P-unit', 'pressure', 'kPa');
  setupUnitSelect('p2-P-unit', 'pressure', 'kPa');
  setupUnitSelect('p1-Q-unit', 'flow', 'L/s');
  setupUnitSelect('p2-Q-unit', 'flow', 'L/s');
  setupUnitSelect('p1-D-unit', 'length', 'mm');
  setupUnitSelect('p2-D-unit', 'length', 'mm');
  setupUnitSelect('pipe-D-unit', 'length', 'mm');
  setupUnitSelect('pipe-eps-unit', 'length', 'mm');
  setupUnitSelect('pipe-Q-unit', 'flow', 'L/s');
  fillSelect($('pipe-f-method'), FRICTION_METHODS, 'auto');

  $('gen-g').value = String(DEFAULTS.g);
  setFluidPreset('agua-20');
  $('gen-alpha1').value = '1';
  $('gen-alpha2').value = '1';
  $('gen-HB').value = '0';
  $('gen-HT').value = '0';
  $('inp-hL').value = '0';

  $('gen-fluido').addEventListener('change', () => {
    applyFluidPreset();
    scheduleCalculate();
  });
  $('gen-rho').addEventListener('input', markFluidCustomIfEdited);
  $('gen-nu').addEventListener('input', markFluidCustomIfEdited);

  document.querySelectorAll('input, select').forEach((el) => {
    if (el.type === 'radio' || el.id === 'incognita') return;
    el.addEventListener('change', () => {
      const unitId = el.id;
      const gamma = (() => {
        const g = Number($('gen-g').value.replace(',', '.')) || DEFAULTS.g;
        const rho = Number($('gen-rho').value.replace(',', '.')) || DEFAULTS.rho;
        return rho * g;
      })();
      const unitMap = {
        'p1-P-unit': ['p1-P', 'pressure'],
        'p2-P-unit': ['p2-P', 'pressure'],
        'p1-Q-unit': ['p1-Q', 'flow'],
        'p2-Q-unit': ['p2-Q', 'flow'],
        'p1-D-unit': ['p1-D', 'length'],
        'p2-D-unit': ['p2-D', 'length'],
        'pipe-D-unit': ['pipe-D', 'length'],
        'pipe-eps-unit': ['pipe-eps', 'length'],
        'pipe-Q-unit': ['pipe-Q', 'flow'],
      };
      if (unitMap[unitId]) {
        const [inputId, quantity] = unitMap[unitId];
        convertInPlace($(inputId), el, quantity, gamma);
      }
      scheduleCalculate();
    });
    if (el.tagName === 'INPUT' && el.type !== 'radio' && el.type !== 'button') {
      el.addEventListener('input', scheduleCalculate);
    }
  });

  for (const idx of [1, 2]) {
    $(`p${idx}-vel-method`).addEventListener('change', () => updateVelocityMethod(idx));
  }

  document.querySelectorAll('input[name="modo-perdidas"]').forEach((r) => {
    r.addEventListener('change', toggleModoPerdidas);
  });

  $('pipe-f-method').addEventListener('change', () => {
    const isManual = $('pipe-f-method').value === 'f ingresado';
    $('bloque-f-input').classList.toggle('hidden', !isManual);
  });

  $('incognita').addEventListener('change', () => {
    applyUnknownHighlight($('incognita').value);
    scheduleCalculate();
  });

  $('btn-calcular').addEventListener('click', calculate);
  $('btn-ejemplo').addEventListener('click', loadExample);
  $('btn-restablecer').addEventListener('click', resetAll);

  $('btn-agregar-accesorio').addEventListener('click', () => {
    accesorios.push({ nombre: `Accesorio ${accesorios.length + 1}`, n: 1, K: 0 });
    renderAccesorios();
    scheduleCalculate();
  });

  $('accesorios-lista').addEventListener('input', (ev) => {
    const t = ev.target;
    const i = Number(t.dataset.i);
    if (Number.isNaN(i)) return;
    if (t.dataset.quitar != null) {
      accesorios.splice(Number(t.dataset.quitar), 1);
      renderAccesorios();
      scheduleCalculate();
      return;
    }
    const campo = t.dataset.campo;
    if (!campo) return;
    accesorios[i][campo] = campo === 'nombre' ? t.value : Number(t.value);
    if (accesorios.length > 0) {
      const sumK = accesorios.reduce((s, a) => s + (Number(a.n) || 0) * (Number(a.K) || 0), 0);
      $('pipe-sumK').value = formatInput(sumK);
    }
    scheduleCalculate();
  });
  $('accesorios-lista').addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.dataset.quitar != null) {
      accesorios.splice(Number(t.dataset.quitar), 1);
      renderAccesorios();
      scheduleCalculate();
    }
  });

  applyUnknownHighlight('P2');
  calculate();
}
