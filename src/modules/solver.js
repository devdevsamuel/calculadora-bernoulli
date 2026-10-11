import { areaFromDiameter, energyAtPoint, verifyBalance } from './bernoulli.js';
import {
  calculateFrictionFactor,
  calculateReynolds,
  computeAutomaticLosses,
  flowRegime,
} from './losses.js';
import { formatNumber } from './format.js';

const BISECTION_MAX_ITER = 100;
const BISECTION_TOL = 1e-12;

const SEARCH_RANGES = {
  V: [1e-6, 100],
  Q: [1e-9, 20],
  D: [1e-4, 10],
  A: [1e-10, 50],
};

export const UNKNOWN_IDS = [
  'P1', 'P2', 'z1', 'z2', 'HB', 'HT', 'hL', 'V1', 'V2',
  'Q1', 'Q2', 'D1', 'D2', 'A1', 'A2',
  'L', 'f', 'sumK', 'hf', 'hm', 'Re',
];

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function derivePoint(p) {
  const out = { z: null, P: null, Q: null, D: null, V: null, A: null, ...p };
  const aExplicit = out.A != null;
  if (!aExplicit && out.D != null && out.D > 0) {
    out.A = areaFromDiameter(out.D);
  }
  if (out.V == null) {
    if (out.Q != null && aExplicit && out.A > 0) {
      out.V = out.Q / out.A;
    } else if (out.Q != null && out.D != null && out.D > 0) {
      out.V = (4 * out.Q) / (Math.PI * out.D * out.D);
    } else if (out.Q != null && out.A != null && out.A > 0) {
      out.V = out.Q / out.A;
    }
  }
  if (out.Q == null && out.V != null && out.A != null) {
    out.Q = out.V * out.A;
  }
  if (out.D == null && out.Q != null && out.V != null && out.V > 0) {
    out.D = Math.sqrt((4 * out.Q) / (Math.PI * out.V));
  }
  return out;
}

function deriveAll(state) {
  const s = cloneState(state);
  s.points = { 1: derivePoint(s.points[1]), 2: derivePoint(s.points[2]) };
  return s;
}

export function pipeDiameter(state) {
  const pipe = state.losses.pipe;
  if (pipe.D != null) return pipe.D;
  if (state.points[2].D != null) return state.points[2].D;
  if (state.points[1].D != null) return state.points[1].D;
  return null;
}

export function pipeVelocity(state) {
  const pipe = state.losses.pipe;
  if (pipe.V != null) return pipe.V;
  const D = pipeDiameter(state);
  if (pipe.Q != null && D != null && D > 0) {
    return (4 * pipe.Q) / (Math.PI * D * D);
  }
  if (state.points[2].V != null) return state.points[2].V;
  if (state.points[1].V != null) return state.points[1].V;
  return null;
}

function resolveHL(state) {
  const { mode, hL, hf, hm, pipe } = state.losses;
  const g = state.fluid.g;
  if (mode === 'ingresadas') {
    if (hL != null) return { hL, source: 'ingresada', hf: null, hm: null };
    if (hf != null && hm != null) {
      return { hL: hf + hm, source: 'hf+hm', hf, hm };
    }
    return { error: 'Falta h_L (o bien h_f y h_m) en el modo de pérdidas ingresadas.' };
  }
  const V = pipeVelocity(state);
  const D = pipeDiameter(state);
  if (V == null || D == null) {
    return { error: 'Pérdidas automáticas incompletas: se necesita la velocidad y el diámetro de la tubería.' };
  }
  if (pipe.L == null) {
    return { error: 'Falta la longitud L de la tubería para el cálculo automático de pérdidas.' };
  }
  if (pipe.epsilon == null) {
    return { error: 'Falta la rugosidad absoluta ε para el cálculo automático de pérdidas.' };
  }
  try {
    const result = computeAutomaticLosses({
      V,
      D,
      L: pipe.L,
      epsilon: pipe.epsilon,
      nu: state.fluid.nu,
      g,
      sumK: pipe.sumK ?? 0,
      frictionMethod: pipe.frictionMethod ?? 'auto',
      fInput: pipe.frictionMethod === 'f ingresado' ? pipe.fInput : null,
    });
    return { hL: result.hL, hf: result.hf, hm: result.hm, source: 'automática', pipe: result };
  } catch (err) {
    return { error: err.message };
  }
}

function energyComponents(state, idx) {
  const p = state.points[idx];
  const { g, gamma, alpha1, alpha2 } = state.fluid;
  const alpha = idx === 1 ? alpha1 : alpha2;
  if (p.z == null || p.P == null || p.V == null) return null;
  return energyAtPoint({ z: p.z, P: p.P, V: p.V, gamma, g, alpha });
}

function balanceHLFromEnergy(state) {
  const e1 = energyComponents(state, 1);
  const e2 = energyComponents(state, 2);
  if (!e1 || !e2) return { error: 'Se necesitan z, P y V en ambos puntos para obtener h_L desde el balance.' };
  const HB = state.HB ?? 0;
  const HT = state.HT ?? 0;
  const hL = e1.H + HB - e2.H - HT;
  if (!Number.isFinite(hL)) {
    return { error: 'No se pudo calcular h_L desde el balance de energía.' };
  }
  return { hL, e1, e2 };
}

function lossSplit(state) {
  const pipe = state.losses.pipe;
  const V = pipeVelocity(state);
  const D = pipeDiameter(state);
  const g = state.fluid.g;
  if (V == null) return { error: 'Falta la velocidad de la tubería para repartir las pérdidas.' };
  const vh = (V * V) / (2 * g);
  let hm = null;
  let hf = null;
  if (pipe.sumK != null) {
    hm = pipe.sumK * vh;
  }
  if (pipe.L != null && D != null && D > 0) {
    let f = null;
    if (pipe.frictionMethod === 'f ingresado' && pipe.fInput != null) {
      f = pipe.fInput;
    } else if (V != null && pipe.epsilon != null) {
      const Re = calculateReynolds(V, D, state.fluid.nu);
      f = calculateFrictionFactor(Re, pipe.epsilon, D, pipe.frictionMethod ?? 'auto').f;
    }
    if (f != null) {
      hf = f * (pipe.L / D) * vh;
    }
  }
  return { hf, hm, V, D, vh };
}

export function buildModel(state) {
  const s = deriveAll(state);
  const g = s.fluid.g;
  const gamma = s.fluid.rho * g;
  s.fluid.gamma = gamma;
  const e1 = energyComponents(s, 1);
  const e2 = energyComponents(s, 2);
  const loss = resolveHL(s);
  let balance = null;
  if (e1 && e2 && !loss.error) {
    balance = verifyBalance({
      H1: e1.H,
      H2: e2.H,
      HB: s.HB ?? 0,
      HT: s.HT ?? 0,
      hL: loss.hL,
    });
  }
  const pipeD = pipeDiameter(s);
  const pipeV = pipeVelocity(s);
  let pipeInfo = null;
  if (pipeV != null && pipeD != null && s.fluid.nu > 0) {
    const Re = calculateReynolds(pipeV, pipeD, s.fluid.nu);
    const regime = flowRegime(Re);
    pipeInfo = {
      V: pipeV,
      D: pipeD,
      A: areaFromDiameter(pipeD),
      Re,
      regime,
      Q: s.losses.pipe.Q ?? (s.points[2].Q ?? s.points[1].Q ?? pipeV * areaFromDiameter(pipeD)),
    };
  }
  return {
    state: s,
    gamma,
    points: {
      1: { ...s.points[1], energy: e1 },
      2: { ...s.points[2], energy: e2 },
    },
    HB: s.HB,
    HT: s.HT,
    losses: loss,
    balance,
    pipe: pipeInfo,
  };
}

export function applyUnknown(state, target, value) {
  const s = cloneState(state);
  const p1 = s.points[1];
  const p2 = s.points[2];
  switch (target) {
    case 'P1': s.points[1] = { ...p1, P: value }; break;
    case 'P2': s.points[2] = { ...p2, P: value }; break;
    case 'z1': s.points[1] = { ...p1, z: value }; break;
    case 'z2': s.points[2] = { ...p2, z: value }; break;
    case 'HB': s.HB = value; break;
    case 'HT': s.HT = value; break;
    case 'hL': s.losses = { ...s.losses, mode: 'ingresadas', hL: value, hf: null, hm: null }; break;
    case 'V1': s.points[1] = { ...p1, V: value }; break;
    case 'V2': s.points[2] = { ...p2, V: value }; break;
    case 'Q1': s.points[1] = { ...p1, Q: value, V: null }; break;
    case 'Q2': s.points[2] = { ...p2, Q: value, V: null }; break;
    case 'D1': s.points[1] = { ...p1, D: value, V: null, A: null }; break;
    case 'D2': s.points[2] = { ...p2, D: value, V: null, A: null }; break;
    case 'A1': s.points[1] = { ...p1, A: value, V: null, D: null }; break;
    case 'A2': s.points[2] = { ...p2, A: value, V: null, D: null }; break;
    case 'L': s.losses = { ...s.losses, pipe: { ...s.losses.pipe, L: value } }; break;
    case 'f':
      s.losses = {
        ...s.losses,
        pipe: { ...s.losses.pipe, frictionMethod: 'f ingresado', fInput: value },
      };
      break;
    case 'sumK': s.losses = { ...s.losses, pipe: { ...s.losses.pipe, sumK: value } }; break;
    case 'hf': s.losses = { ...s.losses, hf: value, hm: null, hL: null }; break;
    case 'hm': s.losses = { ...s.losses, hm: value, hf: null, hL: null }; break;
    case 'Re': break;
    default:
      throw new Error(`Incógnita desconocida: ${target}`);
  }
  return deriveAll(s);
}

function residual(state, target, value) {
  const s = applyUnknown(state, target, value);
  s.fluid.gamma = s.fluid.rho * s.fluid.g;
  const e1 = energyComponents(s, 1);
  const e2 = energyComponents(s, 2);
  if (!e1 || !e2) return null;
  const loss = target === 'hL' || target === 'hf' || target === 'hm'
    ? { hL: value }
    : resolveHL(s);
  if (loss.error) return null;
  const left = e1.H + (s.HB ?? 0);
  const right = e2.H + (s.HT ?? 0) + loss.hL;
  const R = left - right;
  return Number.isFinite(R) ? R : null;
}

function bisect(state, target, { min, max }) {
  let lo = min;
  let hi = max;
  let rLo = residual(state, target, lo);
  let rHi = residual(state, target, hi);
  if (rLo === null || rHi === null) {
    return { error: 'No se pudo evaluar el balance en el rango de búsqueda; revise los datos.' };
  }
  if (rLo === 0) return { value: lo, iterations: 0 };
  if (rHi === 0) return { value: hi, iterations: 0 };
  if (rLo * rHi > 0) {
    return {
      error: 'No existe solución física en el rango buscado para esta incógnita con los datos dados.',
    };
  }
  for (let i = 1; i <= BISECTION_MAX_ITER; i += 1) {
    const mid = 0.5 * (lo + hi);
    const rMid = residual(state, target, mid);
    if (rMid === null) {
      return { error: 'El balance no es evaluable en el rango de búsqueda; revise los datos.' };
    }
    if (rMid === 0 || (hi - lo) / Math.max(1, Math.abs(mid)) < BISECTION_TOL) {
      return { value: mid, iterations: i };
    }
    if (rLo * rMid < 0) {
      hi = mid;
      rHi = rMid;
    } else {
      lo = mid;
      rLo = rMid;
    }
  }
  return { error: `El solucionador numérico no convergió (máx. ${BISECTION_MAX_ITER} iteraciones).` };
}

function closedForm(state, target) {
  const s = deriveAll(state);
  s.fluid.gamma = s.fluid.rho * s.fluid.g;
  const { g, gamma, alpha1, alpha2 } = s.fluid;
  const HB = s.HB;
  const HT = s.HT;
  const p1 = s.points[1];
  const p2 = s.points[2];
  const vh1 = p1.V != null ? (alpha1 * p1.V * p1.V) / (2 * g) : null;
  const vh2 = p2.V != null ? (alpha2 * p2.V * p2.V) / (2 * g) : null;
  const hP1 = p1.P != null ? p1.P / gamma : null;
  const hP2 = p2.P != null ? p2.P / gamma : null;
  const e1 = energyComponents(s, 1);
  const e2 = energyComponents(s, 2);
  const lossInfo = resolveHL(s);
  const hL = lossInfo.error ? null : lossInfo.hL;

  const need = (cond, msg) => {
    if (!cond) return { error: msg };
    return null;
  };

  switch (target) {
    case 'P2': {
      const missing = [];
      if (p1.z == null) missing.push('cota z1');
      if (hP1 == null) missing.push('presión P1');
      if (vh1 == null) missing.push('velocidad V1 (o caudal Q1 y diámetro D1)');
      if (p2.z == null) missing.push('cota z2');
      if (vh2 == null) missing.push('velocidad V2 (o caudal Q2 y diámetro D2)');
      if (HB == null) missing.push('carga de bomba H_B');
      if (HT == null) missing.push('carga de turbina H_T');
      if (hL == null) missing.push(lossInfo.error ?? 'pérdidas h_L (o datos de tubería)');
      if (missing.length) return { missing };
      const bracket = p1.z - p2.z + hP1 + vh1 + HB - HT - hL - vh2;
      const P2 = gamma * bracket;
      if (!Number.isFinite(P2)) return { error: 'Resultado no finito para P2.' };
      return {
        value: P2,
        formula: 'P₂ = γ·[z₁ − z₂ + P₁/γ + α₁·V₁²/(2g) − α₂·V₂²/(2g) + H_B − H_T − h_L]',
        substitution: `P₂ = ${formatNumber(gamma, 2)}·[${formatNumber(p1.z)} − ${formatNumber(p2.z)} + ${formatNumber(hP1)} + ${formatNumber(vh1)} − ${formatNumber(vh2)} + ${formatNumber(HB)} − ${formatNumber(HT)} − ${formatNumber(hL)}]`,
      };
    }
    case 'P1': {
      const missing = [];
      if (p2.z == null) missing.push('cota z2');
      if (hP2 == null) missing.push('presión P2');
      if (vh2 == null) missing.push('velocidad V2 (o caudal Q2 y diámetro D2)');
      if (p1.z == null) missing.push('cota z1');
      if (vh1 == null) missing.push('velocidad V1 (o caudal Q1 y diámetro D1)');
      if (HB == null) missing.push('carga de bomba H_B');
      if (HT == null) missing.push('carga de turbina H_T');
      if (hL == null) missing.push(lossInfo.error ?? 'pérdidas h_L (o datos de tubería)');
      if (missing.length) return { missing };
      const bracket = p2.z - p1.z + hP2 + vh2 + HT + hL - HB - vh1;
      const P1 = gamma * bracket;
      if (!Number.isFinite(P1)) return { error: 'Resultado no finito para P1.' };
      return {
        value: P1,
        formula: 'P₁ = γ·[z₂ − z₁ + P₂/γ + α₂·V₂²/(2g) − α₁·V₁²/(2g) + H_T + h_L − H_B]',
        substitution: `P₁ = ${formatNumber(gamma, 2)}·[${formatNumber(p2.z)} − ${formatNumber(p1.z)} + ${formatNumber(hP2)} + ${formatNumber(vh2)} − ${formatNumber(vh1)} + ${formatNumber(HT)} + ${formatNumber(hL)} − ${formatNumber(HB)}]`,
      };
    }
    case 'z2': {
      const missing = [];
      if (p1.z == null) missing.push('cota z1');
      if (hP1 == null) missing.push('presión P1');
      if (vh1 == null) missing.push('velocidad V1 (o caudal Q1 y diámetro D1)');
      if (p2.P == null) missing.push('presión P2');
      if (vh2 == null) missing.push('velocidad V2 (o caudal Q2 y diámetro D2)');
      if (HB == null) missing.push('carga de bomba H_B');
      if (HT == null) missing.push('carga de turbina H_T');
      if (hL == null) missing.push(lossInfo.error ?? 'pérdidas h_L (o datos de tubería)');
      if (missing.length) return { missing };
      const z2 = p1.z + hP1 + vh1 + HB - hP2 - vh2 - HT - hL;
      if (!Number.isFinite(z2)) return { error: 'Resultado no finito para z2.' };
      return {
        value: z2,
        formula: 'z₂ = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − P₂/γ − α₂·V₂²/(2g) − H_T − h_L',
        substitution: `z₂ = ${formatNumber(p1.z)} + ${formatNumber(hP1)} + ${formatNumber(vh1)} + ${formatNumber(HB)} − ${formatNumber(hP2)} − ${formatNumber(vh2)} − ${formatNumber(HT)} − ${formatNumber(hL)}`,
      };
    }
    case 'z1': {
      const missing = [];
      if (p2.z == null) missing.push('cota z2');
      if (hP2 == null) missing.push('presión P2');
      if (vh2 == null) missing.push('velocidad V2 (o caudal Q2 y diámetro D2)');
      if (p1.P == null) missing.push('presión P1');
      if (vh1 == null) missing.push('velocidad V1 (o caudal Q1 y diámetro D1)');
      if (HB == null) missing.push('carga de bomba H_B');
      if (HT == null) missing.push('carga de turbina H_T');
      if (hL == null) missing.push(lossInfo.error ?? 'pérdidas h_L (o datos de tubería)');
      if (missing.length) return { missing };
      const z1 = p2.z + hP2 + vh2 + HT + hL - HB - hP1 - vh1;
      if (!Number.isFinite(z1)) return { error: 'Resultado no finito para z1.' };
      return {
        value: z1,
        formula: 'z₁ = z₂ + P₂/γ + α₂·V₂²/(2g) + H_T + h_L − H_B − P₁/γ − α₁·V₁²/(2g)',
        substitution: `z₁ = ${formatNumber(p2.z)} + ${formatNumber(hP2)} + ${formatNumber(vh2)} + ${formatNumber(HT)} + ${formatNumber(hL)} − ${formatNumber(HB)} − ${formatNumber(hP1)} − ${formatNumber(vh1)}`,
      };
    }
    case 'HB': {
      if (!e1 || !e2 || hL == null) return { missing: ['z, P y V en ambos puntos, y h_L'] };
      const value = e2.H + HT + hL - e1.H;
      if (!Number.isFinite(value)) return { error: 'Resultado no finito para H_B.' };
      return {
        value,
        formula: 'H_B = H₂ + H_T + h_L − H₁',
        substitution: `H_B = ${formatNumber(e2.H)} + ${formatNumber(HT)} + ${formatNumber(hL)} − ${formatNumber(e1.H)}`,
      };
    }
    case 'HT': {
      if (!e1 || !e2 || hL == null) return { missing: ['z, P y V en ambos puntos, y h_L'] };
      const value = e1.H + HB - e2.H - hL;
      if (!Number.isFinite(value)) return { error: 'Resultado no finito para H_T.' };
      return {
        value,
        formula: 'H_T = H₁ + H_B − H₂ − h_L',
        substitution: `H_T = ${formatNumber(e1.H)} + ${formatNumber(HB)} − ${formatNumber(e2.H)} − ${formatNumber(hL)}`,
      };
    }
    case 'hL': {
      if (!e1 || !e2) return { missing: ['z, P y V en ambos puntos'] };
      const value = e1.H + HB - e2.H - HT;
      if (!Number.isFinite(value)) return { error: 'Resultado no finito para h_L.' };
      if (value < 0) {
        return {
          error: 'Las pérdidas resultan negativas (h_L < 0): revise signos de bomba/turbina y datos de energía.',
        };
      }
      return {
        value,
        formula: 'h_L = H₁ + H_B − H₂ − H_T',
        substitution: `h_L = ${formatNumber(e1.H)} + ${formatNumber(HB)} − ${formatNumber(e2.H)} − ${formatNumber(HT)}`,
        notes: ['Cuando h_L es la incógnita, las pérdidas ingresadas o la tubería no se usan como entrada; el valor automático (si existe) se muestra solo como comparación.'],
      };
    }
    case 'V1': {
      const missing = [];
      if (p1.z == null) missing.push('cota z1');
      if (hP1 == null) missing.push('presión P1');
      if (p2.z == null) missing.push('cota z2');
      if (hP2 == null) missing.push('presión P2');
      if (vh2 == null && p2.V == null) {
        if (p2.V == null) missing.push('velocidad V2 (o caudal Q2 y diámetro D2)');
      }
      if (HB == null) missing.push('carga de bomba H_B');
      if (HT == null) missing.push('carga de turbina H_T');
      if (hL == null) missing.push(lossInfo.error ?? 'pérdidas h_L (o datos de tubería)');
      if (missing.length) return { missing };
      const S = e2.H + HT + hL - HB - p1.z - hP1;
      if (S < 0) {
        return {
          error: 'El término S es negativo: no existe solución real para V₁ con estos datos (revisar energías y pérdidas).',
        };
      }
      const V1 = Math.sqrt((2 * g * S) / alpha1);
      return {
        value: V1,
        formula: 'V₁ = √(2g·S/α₁), con S = H₂ + H_T + h_L − H_B − z₁ − P₁/γ',
        substitution: `S = ${formatNumber(e2.H)} + ${formatNumber(HT)} + ${formatNumber(hL)} − ${formatNumber(HB)} − ${formatNumber(p1.z)} − ${formatNumber(hP1)} = ${formatNumber(S)} → V₁ = √(2·${formatNumber(g, 5)}·${formatNumber(S)}/${formatNumber(alpha1)})`,
      };
    }
    case 'V2': {
      const missing = [];
      if (p1.z == null) missing.push('cota z1');
      if (hP1 == null) missing.push('presión P1');
      if (vh1 == null) missing.push('velocidad V1 (o caudal Q1 y diámetro D1)');
      if (p2.z == null) missing.push('cota z2');
      if (hP2 == null) missing.push('presión P2');
      if (HB == null) missing.push('carga de bomba H_B');
      if (HT == null) missing.push('carga de turbina H_T');
      if (hL == null) missing.push(lossInfo.error ?? 'pérdidas h_L (o datos de tubería)');
      if (missing.length) return { missing };
      const S = p1.z + hP1 + vh1 + HB - HT - hL - p2.z;
      if (S < 0) {
        return {
          error: 'El término S es negativo: no existe solución real para V₂ con estos datos (revisar energías y pérdidas).',
        };
      }
      const V2 = Math.sqrt((2 * g * S) / alpha2);
      return {
        value: V2,
        formula: 'V₂ = √(2g·S/α₂), con S = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − z₂',
        substitution: `S = ${formatNumber(p1.z)} + ${formatNumber(hP1)} + ${formatNumber(vh1)} + ${formatNumber(HB)} − ${formatNumber(HT)} − ${formatNumber(hL)} − ${formatNumber(p2.z)} = ${formatNumber(S)} → V₂ = √(2·${formatNumber(g, 5)}·${formatNumber(S)}/${formatNumber(alpha2)})`,
      };
    }
    case 'Q1':
    case 'Q2':
    case 'A1':
    case 'A2':
    case 'D1':
    case 'D2': {
      const idx = target.endsWith('1') ? 1 : 2;
      const kind = target[0];
      const p = s.points[idx];
      const vel = closedForm(s, `V${idx}`);
      if (vel.error || vel.missing) return vel;
      const V = vel.value;
      if (kind === 'Q') {
        if (p.A == null) return { missing: [`área A${idx} o diámetro D${idx}`] };
        const Q = V * p.A;
        return {
          value: Q,
          formula: `Q${idx === 1 ? '₁' : '₂'} = V${idx === 1 ? '₁' : '₂'}·A${idx === 1 ? '₁' : '₂'}`,
          substitution: `Q = ${formatNumber(V)} · ${formatNumber(p.A, 6)} = ${formatNumber(Q, 6)}`,
        };
      }
      if (kind === 'A') {
        if (p.Q == null) return { missing: [`caudal Q${idx}`] };
        if (V === 0) return { error: 'División por cero: la velocidad es nula.' };
        const A = p.Q / V;
        return {
          value: A,
          formula: `A${idx === 1 ? '₁' : '₂'} = Q${idx === 1 ? '₁' : '₂'}/V${idx === 1 ? '₁' : '₂'}`,
          substitution: `A = ${formatNumber(p.Q, 6)} / ${formatNumber(V)} = ${formatNumber(A, 6)}`,
        };
      }
      if (p.Q == null) return { missing: [`caudal Q${idx}`] };
      if (p.Q <= 0 || V <= 0) return { error: 'Se requieren caudal y velocidad positivos para el diámetro.' };
      const D = Math.sqrt((4 * p.Q) / (Math.PI * V));
      return {
        value: D,
        formula: `D${idx === 1 ? '₁' : '₂'} = √(4·Q${idx === 1 ? '₁' : '₂'}/(π·V${idx === 1 ? '₁' : '₂'}))`,
        substitution: `D = √(4·${formatNumber(p.Q, 6)}/(π·${formatNumber(V)})) = ${formatNumber(D, 6)}`,
      };
    }
    case 'hf': {
      const bal = balanceHLFromEnergy(s);
      if (bal.error) return { missing: [bal.error] };
      const split = lossSplit(s);
      if (split.hm == null) return { missing: ['coeficiente ΣK y velocidad de la tubería (para h_m)'] };
      const hf = bal.hL - split.hm;
      if (!Number.isFinite(hf)) return { error: 'Resultado no finito para h_f.' };
      if (hf < 0) return { error: 'h_f resultaría negativa: h_m supera las pérdidas totales del balance.' };
      return {
        value: hf,
        formula: 'h_f = h_L − h_m, con h_L = H₁ + H_B − H₂ − H_T',
        substitution: `h_L = ${formatNumber(bal.hL)} → h_f = ${formatNumber(bal.hL)} − ${formatNumber(split.hm)} = ${formatNumber(hf)}`,
      };
    }
    case 'hm': {
      const bal = balanceHLFromEnergy(s);
      if (bal.error) return { missing: [bal.error] };
      const split = lossSplit(s);
      if (split.hf == null) {
        return { missing: ['factor f, longitud L, diámetro D y velocidad (para h_f)'] };
      }
      const hm = bal.hL - split.hf;
      if (!Number.isFinite(hm)) return { error: 'Resultado no finito para h_m.' };
      if (hm < 0) return { error: 'h_m resultaría negativa: h_f supera las pérdidas totales del balance.' };
      return {
        value: hm,
        formula: 'h_m = h_L − h_f, con h_L = H₁ + H_B − H₂ − H_T',
        substitution: `h_L = ${formatNumber(bal.hL)} → h_m = ${formatNumber(bal.hL)} − ${formatNumber(split.hf)} = ${formatNumber(hm)}`,
      };
    }
    case 'sumK': {
      const bal = balanceHLFromEnergy(s);
      if (bal.error) return { missing: [bal.error] };
      const split = lossSplit(s);
      if (split.hf == null) {
        return { missing: ['factor f, longitud L, diámetro D y velocidad (para h_f)'] };
      }
      if (split.vh <= 0) return { error: 'La carga de velocidad de la tubería debe ser positiva para obtener ΣK.' };
      const hm = bal.hL - split.hf;
      if (hm < 0) return { error: 'h_m resultaría negativa: h_f supera las pérdidas totales del balance.' };
      const sumK = hm / split.vh;
      return {
        value: sumK,
        formula: 'ΣK = h_m/(V²/2g), con h_m = h_L − h_f',
        substitution: `h_m = ${formatNumber(bal.hL)} − ${formatNumber(split.hf)} = ${formatNumber(hm)} → ΣK = ${formatNumber(hm)} / ${formatNumber(split.vh)} = ${formatNumber(sumK)}`,
      };
    }
    case 'L': {
      const bal = balanceHLFromEnergy(s);
      if (bal.error) return { missing: [bal.error] };
      const split = lossSplit(s);
      if (split.hm == null) return { missing: ['coeficiente ΣK y velocidad de la tubería (para h_m)'] };
      if (split.D == null) return { missing: ['diámetro D de la tubería'] };
      const pipe = s.losses.pipe;
      let f = null;
      if (pipe.frictionMethod === 'f ingresado' && pipe.fInput != null) {
        f = pipe.fInput;
      } else if (pipe.epsilon != null && split.V != null) {
        const Re = calculateReynolds(split.V, split.D, s.fluid.nu);
        f = calculateFrictionFactor(Re, pipe.epsilon, split.D, pipe.frictionMethod ?? 'auto').f;
      }
      if (f == null) return { missing: ['factor de fricción f (o rugosidad ε con velocidad)'] };
      if (split.vh <= 0) return { error: 'La carga de velocidad de la tubería debe ser positiva para obtener L.' };
      const hf = bal.hL - split.hm;
      if (hf < 0) return { error: 'h_f resultaría negativa: h_m supera las pérdidas totales del balance.' };
      const L = (hf * split.D) / (f * split.vh);
      return {
        value: L,
        formula: 'L = h_f·D/(f·V²/2g), con h_f = h_L − h_m',
        substitution: `h_f = ${formatNumber(hf)} → L = ${formatNumber(hf)}·${formatNumber(split.D)} / (${formatNumber(f, 6)}·${formatNumber(split.vh)}) = ${formatNumber(L)}`,
      };
    }
    case 'f': {
      const bal = balanceHLFromEnergy(s);
      if (bal.error) return { missing: [bal.error] };
      const split = lossSplit(s);
      if (split.hm == null) return { missing: ['coeficiente ΣK y velocidad de la tubería (para h_m)'] };
      const pipe = s.losses.pipe;
      if (pipe.L == null) return { missing: ['longitud L de la tubería'] };
      if (split.D == null) return { missing: ['diámetro D de la tubería'] };
      if (split.vh <= 0 || pipe.L <= 0) return { error: 'Se requieren L y V²/2g positivos para obtener f.' };
      const hf = bal.hL - split.hm;
      if (hf < 0) return { error: 'h_f resultaría negativa: h_m supera las pérdidas totales del balance.' };
      const f = (hf * split.D) / (pipe.L * split.vh);
      return {
        value: f,
        formula: 'f = h_f·D/(L·V²/2g), con h_f = h_L − h_m',
        substitution: `h_f = ${formatNumber(hf)} → f = ${formatNumber(hf)}·${formatNumber(split.D)} / (${formatNumber(pipe.L)}·${formatNumber(split.vh)}) = ${formatNumber(f, 6)}`,
        notes: ['El factor f corresponde al factor de Darcy (no al de Fanning).'],
      };
    }
    case 'Re': {
      const V = pipeVelocity(s);
      const D = pipeDiameter(s);
      if (V == null) return { missing: ['velocidad de la tubería'] };
      if (D == null) return { missing: ['diámetro D de la tubería'] };
      const Re = calculateReynolds(V, D, s.fluid.nu);
      return {
        value: Re,
        formula: 'Re = V·D/ν',
        substitution: `Re = ${formatNumber(V)} · ${formatNumber(D)} / ${s.fluid.nu.toExponential(3)} = ${formatNumber(Re, 0)}`,
      };
    }
    default:
      return { error: `Incógnita no soportada: ${target}` };
  }
}

function rangeForTarget(target) {
  const kind = target[0];
  const range = SEARCH_RANGES[kind];
  if (!range) return null;
  return { min: range[0], max: range[1] };
}

const NUMERIC_TARGETS = new Set(['V1', 'V2', 'Q1', 'Q2', 'A1', 'A2', 'D1', 'D2']);

export function solve(state) {
  const target = state.unknown;
  if (!UNKNOWN_IDS.includes(target)) {
    return { ok: false, error: `Seleccione una incógnita válida (recibido: ${target}).`, target };
  }
  let model;
  try {
    model = buildModel(state);
  } catch (err) {
    return { ok: false, error: err.message, target };
  }
  const base = closedForm(state, target);
  if (!NUMERIC_TARGETS.has(target)) {
    if (base.missing) {
      return { ok: false, missing: base.missing, target, model };
    }
    if (base.error) {
      return { ok: false, error: base.error, target, model };
    }
  }
  if (base.value !== undefined && Number.isFinite(base.value)) {
    const R = residual(state, target, base.value);
    if (R === null) {
      return { ok: false, error: 'No se pudo evaluar el balance con el resultado obtenido.', target, model };
    }
    const e1 = model.points[1].energy;
    const e2 = model.points[2].energy;
    const scale = e1 && e2 ? Math.max(Math.abs(e1.H), Math.abs(e2.H), 1) : 1;
    const consistent = Math.abs(R) <= 1e-6 + 1e-8 * scale;
    if (consistent) {
      return {
        ok: true,
        value: base.value,
        formula: base.formula,
        substitution: base.substitution,
        notes: base.notes ?? [],
        target,
        model,
      };
    }
  }
  const range = rangeForTarget(target);
  if (!range) {
    if (base.missing) {
      return { ok: false, missing: base.missing, target, model };
    }
    return {
      ok: false,
      error: base.error ?? 'No se pudo resolver la incógnita con los datos disponibles.',
      target,
      model,
    };
  }
  const result = bisect(state, target, range);
  if (result.error) {
    if (base.missing) {
      return { ok: false, missing: base.missing, target, model };
    }
    return { ok: false, error: base.error ?? result.error, target, model };
  }
  const cf = closedForm(applyUnknown(state, target, result.value), target);
  return {
    ok: true,
    value: result.value,
    formula: cf.formula ?? 'Solución numérica del balance de energía (bisección)',
    substitution: cf.substitution
      ?? `x ≈ ${formatNumber(result.value)} tras ${result.iterations} iteraciones de bisección`,
    notes: [
      'La solución requirió un método numérico (bisección) porque la incógnita afecta de forma no lineal a las pérdidas o a las velocidades.',
      ...(cf.notes ?? []),
    ],
    target,
    model,
    numerical: true,
    iterations: result.iterations,
  };
}
