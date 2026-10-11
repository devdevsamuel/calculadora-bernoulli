import { formatNumber, formatScientific } from './format.js';
import { toSI, fromSI } from './units.js';

export const STATUS = {
  UNICO: 'unico',
  MULTIPLES: 'multiples',
  INSUFICIENTE: 'insuficiente',
  IMPOSIBLE: 'imposible',
  INVALIDO: 'invalido',
};

export const STATUS_LABELS = {
  unico: 'Resultado único',
  multiples: 'Múltiples soluciones',
  insuficiente: 'Datos insuficientes',
  imposible: 'Sin solución física',
  invalido: 'Datos inválidos',
};

export const SOURCE_LABELS = {
  ingresado: 'ingresado',
  derivado: 'derivado',
  calculado: 'calculado',
  supuesto: 'supuesto',
  resultado: 'resultado de la incógnita',
  faltante: 'faltante',
};

export const SYMBOLS = {
  P1: 'P₁', P2: 'P₂',
  z1: 'z₁', z2: 'z₂',
  V1: 'V₁', V2: 'V₂',
  Q1: 'Q₁', Q2: 'Q₂',
  D1: 'D₁', D2: 'D₂',
  A1: 'A₁', A2: 'A₂',
  HB: 'H_B', HT: 'H_T',
  hL: 'h_L', hf: 'h_f', hm: 'h_m',
  L: 'L', f: 'f', sumK: 'ΣK', Re: 'Re',
};

export const UNITS = {
  P1: 'Pa', P2: 'Pa',
  z1: 'm', z2: 'm',
  V1: 'm/s', V2: 'm/s',
  Q1: 'm³/s', Q2: 'm³/s',
  D1: 'm', D2: 'm',
  A1: 'm²', A2: 'm²',
  HB: 'm', HT: 'm',
  hL: 'm', hf: 'm', hm: 'm',
  L: 'm',
  f: '(adimensional)', sumK: '(adimensional)', Re: '(adimensional)',
};

const ENERGY_EQ = 'z₁ + P₁/γ + α₁·V₁²/(2g) + H_B = z₂ + P₂/γ + α₂·V₂²/(2g) + H_T + h_L';
const CONTINUITY_EQ = 'Q = V·A  ·  A = π·D²/4  ·  V determinada por la ecuación de energía';
const LOSSES_EQ = 'h_L = h_f + h_m  ·  h_f = f·(L/D)·V²/(2g)  ·  h_m = ΣK·V²/2g  ·  h_L = H₁ + H_B − H₂ − H_T';
const RE_EQ = 'Re = V·D/ν';

export const EQUATION_INFO = {
  P1: {
    general: ENERGY_EQ,
    isolated: 'P₁ = γ·[z₂ − z₁ + P₂/γ + α₂·V₂²/(2g) − α₁·V₁²/(2g) + H_T + h_L − H_B]',
    why: 'Se aplica la ecuación de energía entre los puntos 1 y 2: P₁ es el único término desconocido y aparece linealmente multiplicado por 1/γ (γ > 0), por lo que el despeje es único.',
  },
  P2: {
    general: ENERGY_EQ,
    isolated: 'P₂ = γ·[z₁ − z₂ + P₁/γ + α₁·V₁²/(2g) − α₂·V₂²/(2g) + H_B − H_T − h_L]',
    why: 'Se aplica la ecuación de energía entre los puntos 1 y 2: P₂ es el único término desconocido y aparece linealmente multiplicado por 1/γ (γ > 0), por lo que el despeje es único.',
  },
  z1: {
    general: ENERGY_EQ,
    isolated: 'z₁ = z₂ + P₂/γ + α₂·V₂²/(2g) + H_T + h_L − H_B − P₁/γ − α₁·V₁²/(2g)',
    why: 'La cota z₁ es el único término lineal desconocido de la ecuación de energía: la diferencia de energías entre ambos puntos se resuelve directamente en metros.',
  },
  z2: {
    general: ENERGY_EQ,
    isolated: 'z₂ = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − P₂/γ − α₂·V₂²/(2g) − H_T − h_L',
    why: 'La cota z₂ es el único término lineal desconocido de la ecuación de energía: la diferencia de energías entre ambos puntos se resuelve directamente en metros.',
  },
  HB: {
    general: ENERGY_EQ,
    isolated: 'H_B = H₂ + H_T + h_L − H₁',
    why: 'H_B entra linealmente como aporte de energía de la bomba; despejándolo se obtiene la carga que la bomba debe entregar para cuadrar el balance entre los estados de energía 1 y 2.',
  },
  HT: {
    general: ENERGY_EQ,
    isolated: 'H_T = H₁ + H_B − H₂ − h_L',
    why: 'H_T entra linealmente como energía extraída por la turbina; despejándolo se obtiene la carga que la turbina debe extraer para cuadrar el balance de energía.',
  },
  hL: {
    general: ENERGY_EQ,
    isolated: 'h_L = H₁ + H_B − H₂ − H_T',
    why: 'h_L es el único término lineal desconocido del segundo miembro: las pérdidas se obtienen como el descargo entre la energía disponible (H₁ + H_B) y la energía restante (H₂ + H_T), sin necesitar datos de la tubería.',
  },
  V1: {
    general: ENERGY_EQ,
    isolated: 'V₁ = √(2g·S/α₁), con S = H₂ + H_T + h_L − H_B − z₁ − P₁/γ',
    why: 'V₁ solo aparece en la carga de velocidad α₁·V₁²/(2g); despejando e igualando a la raíz se obtiene la velocidad. La ecuación determina V₁², no su signo (ver alternativas).',
  },
  V2: {
    general: ENERGY_EQ,
    isolated: 'V₂ = √(2g·S/α₂), con S = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − z₂ − P₂/γ',
    why: 'V₂ solo aparece en la carga de velocidad α₂·V₂²/(2g); despejando e igualando a la raíz se obtiene la velocidad. La ecuación determina V₂², no su signo (ver alternativas).',
  },
  Q1: {
    general: CONTINUITY_EQ,
    isolated: 'Q₁ = V₁·A₁',
    why: 'La ecuación de energía determina la velocidad V₁ del punto y la continuidad Q = V·A la convierte en caudal; se necesita el área del punto (A₁ o D₁).',
  },
  Q2: {
    general: CONTINUITY_EQ,
    isolated: 'Q₂ = V₂·A₂',
    why: 'La ecuación de energía determina la velocidad V₂ del punto y la continuidad Q = V·A la convierte en caudal; se necesita el área del punto (A₂ o D₂).',
  },
  A1: {
    general: CONTINUITY_EQ,
    isolated: 'A₁ = Q₁/V₁',
    why: 'La ecuación de energía determina V₁ y la continuidad A = Q/V da el área; se necesita el caudal Q₁ del punto.',
  },
  A2: {
    general: CONTINUITY_EQ,
    isolated: 'A₂ = Q₂/V₂',
    why: 'La ecuación de energía determina V₂ y la continuidad A = Q/V da el área; se necesita el caudal Q₂ del punto.',
  },
  D1: {
    general: CONTINUITY_EQ,
    isolated: 'D₁ = √(4·Q₁/(π·V₁))',
    why: 'La ecuación de energía determina V₁ y la continuidad D = √(4Q/(π·V)) da el diámetro; se necesita el caudal Q₁ del punto.',
  },
  D2: {
    general: CONTINUITY_EQ,
    isolated: 'D₂ = √(4·Q₂/(π·V₂))',
    why: 'La ecuación de energía determina V₂ y la continuidad D = √(4Q/(π·V)) da el diámetro; se necesita el caudal Q₂ del punto.',
  },
  L: {
    general: LOSSES_EQ,
    isolated: 'L = h_f·D/(f·V²/2g), con h_f = h_L − h_m',
    why: 'En Darcy–Weisbach h_f es lineal en L; una vez obtenido h_f = h_L − h_m (pérdidas totales del balance menos pérdidas menores), L se despeja de forma única.',
  },
  f: {
    general: LOSSES_EQ,
    isolated: 'f = h_f·D/(L·V²/2g), con h_f = h_L − h_m',
    why: 'h_f es lineal en el factor de fricción f (Darcy); con h_f, L, D y la carga de velocidad conocidos, el despeje es único.',
  },
  sumK: {
    general: LOSSES_EQ,
    isolated: 'ΣK = h_m/(V²/2g), con h_m = h_L − h_f',
    why: 'h_m es lineal en ΣK (h_m = ΣK·V²/2g); con h_m = h_L − h_f y la carga de velocidad de la tubería conocidas, ΣK es único.',
  },
  hf: {
    general: LOSSES_EQ,
    isolated: 'h_f = h_L − h_m, con h_L = H₁ + H_B − H₂ − H_T',
    why: 'Las pérdidas totales se reparten aditivamente h_L = h_f + h_m; conocido h_m (ΣK·V²/2g) y h_L (balance de energía), h_f es único.',
  },
  hm: {
    general: LOSSES_EQ,
    isolated: 'h_m = h_L − h_f, con h_L = H₁ + H_B − H₂ − H_T',
    why: 'Las pérdidas totales se reparten aditivamente h_L = h_f + h_m; conocido h_f (Darcy–Weisbach) y h_L (balance de energía), h_m es único.',
  },
  Re: {
    general: RE_EQ,
    isolated: 'Re = V·D/ν',
    why: 'Re = V·D/ν es la definición del régimen del flujo en la tubería; con la velocidad y el diámetro de la tubería y la viscosidad del fluido, la evaluación es directa.',
  },
};

export const SYMBOLIC_DERIVATION = {
  P1: [
    'Reordenamos la ecuación de energía para el término de presión del punto 1: P₁/γ = z₂ − z₁ + P₂/γ + α₂·V₂²/(2g) + H_T + h_L − H_B − α₁·V₁²/(2g)',
    'Multiplicamos por γ (> 0): P₁ = γ·[z₂ − z₁ + P₂/γ + α₂·V₂²/(2g) + H_T + h_L − H_B − α₁·V₁²/(2g)]',
  ],
  P2: [
    'Reordenamos la ecuación de energía para el término de presión del punto 2: P₂/γ = z₁ − z₂ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − α₂·V₂²/(2g)',
    'Multiplicamos por γ (> 0): P₂ = γ·[z₁ − z₂ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − α₂·V₂²/(2g)]',
  ],
  z1: [
    'La cota entra linealmente: z₁ = z₂ + P₂/γ + α₂·V₂²/(2g) + H_T + h_L − H_B − P₁/γ − α₁·V₁²/(2g)',
  ],
  z2: [
    'La cota entra linealmente: z₂ = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − P₂/γ − α₂·V₂²/(2g) − H_T − h_L',
  ],
  HB: [
    'Con Hᵢ = zᵢ + Pᵢ/γ + αᵢ·Vᵢ²/(2g), la bomba entra linealmente en el balance: H_B = H₂ + H_T + h_L − H₁',
  ],
  HT: [
    'Con Hᵢ = zᵢ + Pᵢ/γ + αᵢ·Vᵢ²/(2g), la turbina entra linealmente en el balance: H_T = H₁ + H_B − H₂ − h_L',
  ],
  hL: [
    'Las pérdidas son el descargo lineal entre la energía disponible y la restante: h_L = H₁ + H_B − H₂ − H_T',
  ],
  V1: [
    'Aislamos la carga de velocidad del punto 1: α₁·V₁²/(2g) = H₂ + H_T + h_L − H_B − z₁ − P₁/γ ≡ S',
    'Despejamos la raíz: V₁ = √(2g·S/α₁). Se toma la raíz positiva (convención V ≥ 0 con sentido 1→2); la negativa se lista como alternativa verificada.',
  ],
  V2: [
    'Aislamos la carga de velocidad del punto 2: α₂·V₂²/(2g) = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − z₂ − P₂/γ ≡ S',
    'Despejamos la raíz: V₂ = √(2g·S/α₂). Se toma la raíz positiva (convención V ≥ 0 con sentido 1→2); la negativa se lista como alternativa verificada.',
  ],
  Q1: [
    'La energía determina la velocidad del punto 1: V₁ = √(2g·S/α₁), con S = H₂ + H_T + h_L − H_B − z₁ − P₁/γ',
    'Geometría de la sección (tubería circular llena): A₁ = π·D₁²/4',
    'Continuidad: Q₁ = V₁·A₁',
  ],
  Q2: [
    'La energía determina la velocidad del punto 2: V₂ = √(2g·S/α₂), con S = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − z₂ − P₂/γ',
    'Geometría de la sección (tubería circular llena): A₂ = π·D₂²/4',
    'Continuidad: Q₂ = V₂·A₂',
  ],
  A1: [
    'La energía determina la velocidad del punto 1: V₁ = √(2g·S/α₁), con S = H₂ + H_T + h_L − H_B − z₁ − P₁/γ',
    'Continuidad despejada en área: A₁ = Q₁/V₁',
  ],
  A2: [
    'La energía determina la velocidad del punto 2: V₂ = √(2g·S/α₂), con S = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − z₂ − P₂/γ',
    'Continuidad despejada en área: A₂ = Q₂/V₂',
  ],
  D1: [
    'La energía determina la velocidad del punto 1: V₁ = √(2g·S/α₁), con S = H₂ + H_T + h_L − H_B − z₁ − P₁/γ',
    'Continuidad despejada en diámetro: D₁ = √(4·Q₁/(π·V₁))',
  ],
  D2: [
    'La energía determina la velocidad del punto 2: V₂ = √(2g·S/α₂), con S = z₁ + P₁/γ + α₁·V₁²/(2g) + H_B − H_T − h_L − z₂ − P₂/γ',
    'Continuidad despejada en diámetro: D₂ = √(4·Q₂/(π·V₂))',
  ],
  hf: [
    'Pérdidas totales desde el balance de energía: h_L = H₁ + H_B − H₂ − H_T',
    'Pérdida menor por accesorios: h_m = ΣK·V²/(2g)',
    'Resta: h_f = h_L − h_m',
  ],
  hm: [
    'Pérdidas totales desde el balance de energía: h_L = H₁ + H_B − H₂ − H_T',
    'Pérdida mayor (Darcy–Weisbach): h_f = f·(L/D)·V²/(2g)',
    'Resta: h_m = h_L − h_f',
  ],
  sumK: [
    'Pérdidas totales desde el balance de energía: h_L = H₁ + H_B − H₂ − H_T',
    'Pérdida mayor (Darcy–Weisbach): h_f = f·(L/D)·V²/(2g) → h_m = h_L − h_f',
    'Despeje lineal: ΣK = h_m/(V²/(2g))',
  ],
  L: [
    'Pérdidas totales desde el balance de energía: h_L = H₁ + H_B − H₂ − H_T; pérdida menor: h_m = ΣK·V²/(2g) → h_f = h_L − h_m',
    'Darcy–Weisbach despejado en L: L = h_f·D/(f·V²/(2g))',
  ],
  f: [
    'Pérdidas totales desde el balance de energía: h_L = H₁ + H_B − H₂ − H_T; pérdida menor: h_m = ΣK·V²/(2g) → h_f = h_L − h_m',
    'Darcy–Weisbach despejado en f (factor de Darcy): f = h_f·D/(L·V²/(2g))',
  ],
  Re: [
    'Sin despeje algebraico: se evalúa la definición del número de Reynolds con la velocidad y el diámetro de la tubería.',
  ],
};

const CONVERSION_FIELDS = [
  { key: 'P1', type: 'pressure' },
  { key: 'P2', type: 'pressure' },
  { key: 'Q1', type: 'flow' },
  { key: 'Q2', type: 'flow' },
  { key: 'Qpipe', type: 'flow' },
  { key: 'D1', type: 'length' },
  { key: 'D2', type: 'length' },
  { key: 'Dpipe', type: 'length' },
  { key: 'epsilon', type: 'length' },
];

const SI_UNIT_BY_TYPE = { pressure: 'Pa', flow: 'm³/s', length: 'm' };

function siValueFor(state, key) {
  switch (key) {
    case 'P1': return state.points?.[1]?.P ?? null;
    case 'P2': return state.points?.[2]?.P ?? null;
    case 'Q1': return state.points?.[1]?.Q ?? null;
    case 'Q2': return state.points?.[2]?.Q ?? null;
    case 'D1': return state.points?.[1]?.D ?? null;
    case 'D2': return state.points?.[2]?.D ?? null;
    case 'Dpipe': return state.losses?.pipe?.D ?? null;
    case 'Qpipe': return state.losses?.pipe?.Q ?? null;
    case 'epsilon': return state.losses?.pipe?.epsilon ?? null;
    default: return null;
  }
}

export function buildConversions(target, state, { ok = false, value = null } = {}) {
  const displayUnits = state?.displayUnits ?? {};
  const fluid = state?.fluid ?? {};
  const gamma = fluid.gamma ?? (fluid.rho != null && fluid.g != null ? fluid.rho * fluid.g : null);
  const opts = { gamma };
  const lines = [];
  let result = null;

  for (const { key, type } of CONVERSION_FIELDS) {
    const unit = displayUnits[key];
    const siUnit = SI_UNIT_BY_TYPE[type];
    if (!unit || unit === siUnit) continue;
    const si = siValueFor(state, key);
    if (si == null) continue;
    let factor;
    let original;
    try {
      factor = toSI(1, unit, type, opts);
      original = fromSI(si, unit, type, opts);
    } catch {
      continue;
    }
    lines.push(`${FIELD[key]?.symbol ?? key}: ${formatNumber(original, 4)} ${unit} × ${formatNumber(factor, 6)} = ${si !== 0 && Math.abs(si) < 1e-4 ? formatScientific(si) : formatNumber(si, 4)} ${siUnit} (factor hacia SI${unit === 'm.c.a.' ? ' = γ' : ''})`);
  }

  if (ok && value != null) {
    const field = CONVERSION_FIELDS.find((f2) => f2.key === target);
    if (field) {
      const unit = displayUnits[target];
      const siUnit = SI_UNIT_BY_TYPE[field.type];
      if (unit && unit !== siUnit) {
        try {
          const factor = toSI(1, unit, field.type, opts);
          const displayValue = fromSI(value, unit, field.type, opts);
          result = { displayValue, displayUnit: unit, factor };
          lines.push(`${FIELD[target]?.symbol ?? target} (resultado): ${formatNumber(value, 2)} ${siUnit} = ${formatNumber(displayValue, 4)} ${unit} (factor hacia SI: ×${formatNumber(factor, 6)})`);
        } catch {
          result = null;
        }
      }
    }
  }

  if (!lines.length) {
    lines.push('No se requieren conversiones: los datos y el resultado se manejan en unidades SI (Pa, m, m³/s, m/s, m², N/m³).');
  }
  return { needed: lines.length > 1 || !(lines[0] ?? '').startsWith('No se requieren'), lines, result };
}

export function buildProcedure({
  state,
  target,
  ok = false,
  value = null,
  substitution = null,
  numerical = false,
  iterations = null,
}) {
  const info = EQUATION_INFO[target] ?? {};
  const conversions = buildConversions(target, state, { ok, value });
  const method = !ok
    ? 'no se completó el cálculo'
    : numerical
      ? `bisección numérica (${iterations ?? '—'} iteraciones)`
      : 'forma cerrada';
  return {
    complete: ok,
    method,
    equation: info.general ?? null,
    isolated: info.isolated ?? null,
    symbolic: SYMBOLIC_DERIVATION[target] ?? [],
    conversions: ok ? conversions.lines : [],
    conversionResult: ok ? conversions.result : null,
    substitution: ok ? substitution : null,
    result: ok
      ? {
        value,
        unit: UNITS[target] ?? null,
        displayValue: conversions.result?.displayValue ?? null,
        displayUnit: conversions.result?.displayUnit ?? null,
      }
      : null,
    presentationNote: ok
      ? 'El cálculo usa precisión completa (sin redondeo intermedio); el valor mostrado se redondea solo para presentación.'
      : null,
  };
}

const FIELD = {
  g: { symbol: 'g', label: 'Gravedad', unit: 'm/s²', decimals: 5 },
  rho: { symbol: 'ρ', label: 'Densidad', unit: 'kg/m³', decimals: 2 },
  nu: { symbol: 'ν', label: 'Viscosidad cinemática', unit: 'm²/s', decimals: -1 },
  alpha1: { symbol: 'α₁', label: 'Corrección cinética punto 1', unit: '(adimensional)', decimals: 3 },
  alpha2: { symbol: 'α₂', label: 'Corrección cinética punto 2', unit: '(adimensional)', decimals: 3 },
  gamma: { symbol: 'γ', label: 'Peso específico', unit: 'N/m³', decimals: 2 },
  z1: { symbol: 'z₁', label: 'Cota punto 1', unit: 'm' },
  P1: { symbol: 'P₁', label: 'Presión punto 1', unit: 'Pa', decimals: 2 },
  V1: { symbol: 'V₁', label: 'Velocidad punto 1', unit: 'm/s', decimals: 5 },
  Q1: { symbol: 'Q₁', label: 'Caudal punto 1', unit: 'm³/s', decimals: 6 },
  D1: { symbol: 'D₁', label: 'Diámetro punto 1', unit: 'm', decimals: 6 },
  A1: { symbol: 'A₁', label: 'Área punto 1', unit: 'm²', decimals: 6 },
  H1: { symbol: 'H₁', label: 'Carga total punto 1', unit: 'm' },
  z2: { symbol: 'z₂', label: 'Cota punto 2', unit: 'm' },
  P2: { symbol: 'P₂', label: 'Presión punto 2', unit: 'Pa', decimals: 2 },
  V2: { symbol: 'V₂', label: 'Velocidad punto 2', unit: 'm/s', decimals: 5 },
  Q2: { symbol: 'Q₂', label: 'Caudal punto 2', unit: 'm³/s', decimals: 6 },
  D2: { symbol: 'D₂', label: 'Diámetro punto 2', unit: 'm', decimals: 6 },
  A2: { symbol: 'A₂', label: 'Área punto 2', unit: 'm²', decimals: 6 },
  H2: { symbol: 'H₂', label: 'Carga total punto 2', unit: 'm' },
  HB: { symbol: 'H_B', label: 'Carga de bomba', unit: 'm' },
  HT: { symbol: 'H_T', label: 'Carga de turbina', unit: 'm' },
  hL: { symbol: 'h_L', label: 'Pérdidas totales', unit: 'm' },
  hf: { symbol: 'h_f', label: 'Pérdida mayor (fricción)', unit: 'm' },
  hm: { symbol: 'h_m', label: 'Pérdida menor (accesorios)', unit: 'm' },
  L: { symbol: 'L', label: 'Longitud de tubería', unit: 'm' },
  epsilon: { symbol: 'ε', label: 'Rugosidad absoluta', unit: 'm', decimals: 6 },
  sumK: { symbol: 'ΣK', label: 'Coeficientes de pérdidas menores', unit: '(adimensional)', decimals: 4 },
  f: { symbol: 'f', label: 'Factor de fricción (Darcy)', unit: '(adimensional)', decimals: 6 },
  Re: { symbol: 'Re', label: 'Número de Reynolds (tubería)', unit: '(adimensional)', decimals: 0 },
  Qpipe: { symbol: 'Q_tubo', label: 'Caudal de tubería', unit: 'm³/s', decimals: 6 },
  Dpipe: { symbol: 'D_tubo', label: 'Diámetro de tubería', unit: 'm', decimals: 6 },
  Vpipe: { symbol: 'V_tubo', label: 'Velocidad de tubería', unit: 'm/s', decimals: 5 },
};

const MISSING_REASONS = [
  { re: /cota z/i, why: 'la cota aporta la energía de posición (z); sin ella el lado de la ecuación de energía de ese punto queda incompleto' },
  { re: /presión P/i, why: 'la presión aporta la carga P/γ; sin ella no se conoce el nivel piezométrico del punto' },
  { re: /velocidad V|caudal Q|área A|diámetro D/i, why: 'sin V (o sin Q y el área/diámetro que la relaciona) no se puede evaluar la carga de velocidad α·V²/(2g) ni la continuidad Q = V·A de ese punto' },
  { re: /carga de bomba/i, why: 'H_B es el término de energía de la bomba en el balance; si no se conoce ni se asume, el balance tiene dos incógnitas' },
  { re: /carga de turbina/i, why: 'H_T es el término de energía extraída por la turbina en el balance; si no se conoce ni se asume, el balance tiene dos incógnitas' },
  { re: /pérdidas|h_L|h_f|h_m/i, why: 'h_L conecta la energía de entrada con la de salida; sin él (ni datos de tubería para calcularlo) la igualdad de energías no cierra' },
  { re: /longitud L/i, why: 'L es necesaria para la pérdida mayor h_f = f·(L/D)·V²/(2g)' },
  { re: /rugosidad/i, why: 'ε permite obtener el factor de fricción f (y con él h_f) a partir de Re y la rugosidad relativa' },
  { re: /factor de fricción/i, why: 'f permite convertir h_f en longitud (o viceversa) mediante Darcy–Weisbach' },
  { re: /coeficiente ΣK/i, why: 'ΣK permite calcular la pérdida menor h_m = ΣK·V²/2g' },
  { re: /viscosidad/i, why: 'ν debe ser un dato físico válido (> 0) para calcular Re y el factor de fricción' },
];

const INVALID_INPUT_RE = /viscosidad|debe ser.*positiv|no válido|no es un número|división por cero|no finito|fuera de dominio/i;

export function classifyFailure({ unknownValid = true, missing = null, error = null } = {}) {
  if (!unknownValid) return STATUS.INVALIDO;
  if (missing && missing.length) {
    if (missing.some((m) => INVALID_INPUT_RE.test(m))) return STATUS.INVALIDO;
    return STATUS.INSUFICIENTE;
  }
  if (error && INVALID_INPUT_RE.test(error)) return STATUS.INVALIDO;
  return STATUS.IMPOSIBLE;
}

export function validateState(state) {
  const problems = [];
  const check = (value, { min = null, strictMin = false, label }) => {
    if (value == null) return;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      problems.push(`${label}: debe ser un número finito`);
      return;
    }
    if (min != null) {
      const bad = strictMin ? value <= min : value < min;
      if (bad) problems.push(`${label}: debe ser ${strictMin ? 'mayor que' : 'mayor o igual a'} ${min}`);
    }
  };
  const fluid = state.fluid ?? {};
  check(fluid.g, { min: 0, strictMin: true, label: 'La gravedad g' });
  check(fluid.rho, { min: 0, strictMin: true, label: 'La densidad ρ' });
  check(fluid.nu, { min: 0, strictMin: true, label: 'La viscosidad ν' });
  check(fluid.alpha1, { min: 0, strictMin: true, label: 'El coeficiente α₁' });
  check(fluid.alpha2, { min: 0, strictMin: true, label: 'El coeficiente α₂' });
  for (const idx of [1, 2]) {
    const p = state.points?.[idx] ?? {};
    check(p.z, { label: `La cota z${idx}` });
    check(p.P, { label: `La presión P${idx}` });
    check(p.Q, { label: `El caudal Q${idx}` });
    check(p.V, { label: `La velocidad V${idx}` });
    check(p.D, { min: 0, strictMin: true, label: `El diámetro D${idx}` });
    check(p.A, { min: 0, strictMin: true, label: `El área A${idx}` });
  }
  check(state.HB, { label: 'La carga de bomba H_B' });
  check(state.HT, { label: 'La carga de turbina H_T' });
  const losses = state.losses ?? {};
  check(losses.hL, { label: 'Las pérdidas h_L' });
  check(losses.hf, { label: 'La pérdida h_f' });
  check(losses.hm, { label: 'La pérdida h_m' });
  const pipe = losses.pipe ?? {};
  check(pipe.L, { label: 'La longitud L' });
  check(pipe.epsilon, { label: 'La rugosidad ε' });
  check(pipe.sumK, { label: 'Los coeficientes ΣK' });
  check(pipe.D, { min: 0, strictMin: true, label: 'El diámetro de tubería' });
  check(pipe.Q, { label: 'El caudal de tubería' });
  check(pipe.fInput, { min: 0, strictMin: true, label: 'El factor de fricción f' });
  return problems;
}

function derivedNote(kind, raw) {
  if (kind === 'V') {
    if (raw.Q != null && raw.D != null) return 'V = 4Q/(π·D²) · Q y D ingresados';
    if (raw.Q != null && raw.A != null) return 'V = Q/A · Q y A ingresados';
    if (raw.Q != null) return 'V derivada del caudal (continuidad)';
    return 'V derivada';
  }
  if (kind === 'Q') return raw.V != null ? 'Q = V·A · V ingresada' : 'Q derivado (continuidad)';
  if (kind === 'D') return 'D = √(4Q/(π·V)) · derivado';
  if (kind === 'A') return raw.D != null ? 'A = π·D²/4 · derivado de D' : 'A = Q/V · derivado';
  return null;
}

export function describeData(state, model, target, { missing = [], ok = false } = {}) {
  const entries = [];
  const ms = model.state ?? state;
  const raw = state;
  const missingText = missing.join(' | ');
  const isMissing = (re) => re.test(missingText);

  const add = (key, value, source, note = null) => {
    const meta = FIELD[key];
    if (!meta) return;
    if (value == null && key !== target) return;
    entries.push({
      key,
      symbol: meta.symbol,
      label: meta.label,
      value,
      unit: meta.unit,
      source,
      note,
      decimals: meta.decimals ?? 4,
    });
  };

  const fluidRaw = raw.fluid ?? {};
  add('g', fluidRaw.g, 'ingresado');
  add('rho', fluidRaw.rho, 'ingresado');
  add('nu', fluidRaw.nu, 'ingresado');
  add('alpha1', fluidRaw.alpha1, 'ingresado');
  add('alpha2', fluidRaw.alpha2, 'ingresado');
  const gamma = model.gamma ?? (fluidRaw.rho != null && fluidRaw.g != null ? fluidRaw.rho * fluidRaw.g : null);
  add('gamma', gamma, 'derivado', 'γ = ρ·g');

  for (const idx of [1, 2]) {
    const rawP = raw.points?.[idx] ?? {};
    const msP = ms.points?.[idx] ?? {};
    const modelP = model.points?.[idx] ?? {};
    const prefix = ['z', 'P', 'V', 'Q', 'D', 'A'];
    for (const kind of prefix) {
      const key = `${kind}${idx}`;
      if (key === target) {
        if (ok) add(key, msP[kind], 'resultado', 'incógnita resuelta');
        else add(key, null, 'faltante', 'no se pudo determinar con los datos disponibles');
        continue;
      }
      if (rawP[kind] != null) {
        add(key, rawP[kind], 'ingresado');
      } else if (msP[kind] != null) {
        add(key, msP[kind], 'derivado', derivedNote(kind, rawP));
      } else if (isMissing(new RegExp(`${kind}${idx}|${labelRe(kind)}\\s*${idx}`, 'i'))) {
        add(key, null, 'faltante', 'dato requerido por la ecuación');
      }
    }
    if (modelP.energy) {
      add(`H${idx}`, modelP.energy.H, 'calculado', 'H = z + P/γ + α·V²/(2g)');
    }
  }

  const machine = (key, rawValue, label) => {
    if (key === target) {
      if (ok) add(key, ms[key], 'resultado', 'incógnita resuelta');
      else add(key, null, 'faltante', 'no se pudo determinar con los datos disponibles');
      return;
    }
    if (rawValue != null) {
      add(key, rawValue, 'ingresado');
      return;
    }
    if (isMissing(new RegExp(label, 'i'))) {
      add(key, null, 'faltante', 'dato requerido por la ecuación');
      return;
    }
    add(key, 0, 'supuesto', 'no ingresado; se considera 0 m en el balance');
  };
  machine('HB', raw.HB, 'H_B|bomba');
  machine('HT', raw.HT, 'H_T|turbina');

  const lossesRaw = raw.losses ?? {};
  const resolved = model.losses ?? {};
  const auto = lossesRaw.mode !== 'ingresadas';
  if (target === 'hL') {
    if (ok) add('hL', resolved.hL, 'resultado', 'incógnita resuelta');
    else add('hL', null, 'faltante', 'no se pudo determinar con los datos disponibles');
  } else if (lossesRaw.hL != null) {
    add('hL', lossesRaw.hL, 'ingresado');
  } else if (resolved.hL != null) {
    if (auto) add('hL', resolved.hL, 'calculado', 'Darcy–Weisbach + pérdidas menores');
    else add('hL', resolved.hL, 'derivado', 'h_L = h_f + h_m');
  } else if (isMissing(/pérdidas|h_L/)) {
    add('hL', null, 'faltante', 'dato requerido por la ecuación');
  }
  for (const key of ['hf', 'hm']) {
    if (key === target) {
      if (ok) add(key, resolved[key], 'resultado', 'incógnita resuelta');
      else add(key, null, 'faltante', 'no se pudo determinar con los datos disponibles');
    } else if (lossesRaw[key] != null) {
      add(key, lossesRaw[key], 'ingresado');
    } else if (resolved[key] != null) {
      add(key, resolved[key], auto ? 'calculado' : 'derivado', auto ? 'cálculo automático de pérdidas' : 'reparto de h_L');
    } else if (isMissing(key === 'hf' ? /h_f/ : /h_m/)) {
      add(key, null, 'faltante', 'dato requerido por la ecuación');
    }
  }

  const pipeRaw = lossesRaw.pipe ?? {};
  const pipeModel = model.pipe ?? null;
  const lossPipe = (!resolved.error && resolved.pipe) ? resolved.pipe : null;
  if (target === 'L') {
    if (ok) add('L', pipeRaw.L, 'resultado', 'incógnita resuelta');
    else add('L', null, 'faltante', 'no se pudo determinar con los datos disponibles');
  } else if (pipeRaw.L != null) {
    add('L', pipeRaw.L, 'ingresado');
  } else if (isMissing(/longitud L/)) {
    add('L', null, 'faltante', 'dato requerido por la ecuación');
  }
  if (pipeRaw.epsilon != null) add('epsilon', pipeRaw.epsilon, 'ingresado');
  if (target === 'sumK') {
    if (ok) add('sumK', pipeRaw.sumK, 'resultado', 'incógnita resuelta');
    else add('sumK', null, 'faltante', 'no se pudo determinar con los datos disponibles');
  } else if (pipeRaw.sumK != null) {
    add('sumK', pipeRaw.sumK, 'ingresado');
  } else if (auto && !isMissing(/ΣK|coeficiente/)) {
    add('sumK', 0, 'supuesto', 'no ingresado; se consideran 0 pérdidas menores (ΣK = 0)');
  }
  if (pipeRaw.Q != null) add('Qpipe', pipeRaw.Q, 'ingresado');
  if (pipeRaw.D != null) add('Dpipe', pipeRaw.D, 'ingresado');
  else if (pipeModel?.D != null) add('Dpipe', pipeModel.D, 'derivado', 'tomado de los puntos 1/2');
  if (pipeModel?.V != null) {
    const note = pipeRaw.Q != null ? 'V = 4Q/(π·D²) · caudal de tubería ingresado' : 'velocidad derivada de los datos de los puntos';
    add('Vpipe', pipeModel.V, 'derivado', note);
  }
  if (pipeModel?.Re != null) add('Re', pipeModel.Re, 'calculado', 'Re = V·D/ν');
  if (target === 'f') {
    if (ok) add('f', pipeRaw.fInput ?? lossPipe?.f, 'resultado', 'incógnita resuelta');
    else add('f', null, 'faltante', 'no se pudo determinar con los datos disponibles');
  } else if (pipeRaw.frictionMethod === 'f ingresado' && pipeRaw.fInput != null) {
    add('f', pipeRaw.fInput, 'ingresado', 'factor de fricción ingresado por el usuario (Darcy)');
  } else if (lossPipe?.f != null) {
    add('f', lossPipe.f, 'calculado', lossPipe.fMethod ?? 'cálculo automático');
  }
  return entries;
}

function labelRe(kind) {
  return { z: 'cota', P: 'presión', V: 'velocidad', Q: 'caudal', D: 'diámetro', A: 'área' }[kind] ?? kind;
}

export function explainInsufficient(target, missing) {
  const info = EQUATION_INFO[target] ?? {};
  return missing.map((item) => {
    const rule = MISSING_REASONS.find((r) => r.re.test(item));
    const why = rule
      ? rule.why
      : `sin «${item}» la ecuación ${info.general ?? 'de energía'} queda con más de una incógnita`;
    return { item, reason: `${why}. Sin este dato no es posible despejar de forma única ${SYMBOLS[target] ?? target} con la información disponible.` };
  });
}

export function collectAssumptions(state, target, { missing = [] } = {}) {
  const notes = [];
  const missingText = missing.join(' | ');
  if (state.HB == null && target !== 'HB' && !/H_B|bomba/i.test(missingText)) {
    notes.push('Supuesto: H_B no ingresado → se considera 0 m (sin bomba) en el balance.');
  }
  if (state.HT == null && target !== 'HT' && !/H_T|turbina/i.test(missingText)) {
    notes.push('Supuesto: H_T no ingresado → se considera 0 m (sin turbina) en el balance.');
  }
  const pipe = state.losses?.pipe ?? {};
  if (state.losses?.mode !== 'ingresadas' && pipe.sumK == null && target !== 'sumK' && !/ΣK|coeficiente/.test(missingText)) {
    notes.push('Supuesto: ΣK no ingresado → se consideran 0 pérdidas menores en el cálculo automático.');
  }
  return notes;
}

const f = (value, decimals = 4) => formatNumber(value, decimals);

function energyOperations(model) {
  const ops = [];
  const st = model.state ?? {};
  const fluid = st.fluid ?? {};
  const gamma = model.gamma ?? fluid.gamma;
  if (fluid.rho != null && fluid.g != null && gamma != null) {
    ops.push(`γ = ρ·g = ${f(fluid.rho, 2)} · ${f(fluid.g, 5)} = ${f(gamma, 2)} N/m³`);
  }
  const e1 = model.points?.[1]?.energy ?? null;
  const e2 = model.points?.[2]?.energy ?? null;
  for (const idx of [1, 2]) {
    const p = model.points?.[idx] ?? {};
    const e = idx === 1 ? e1 : e2;
    if (e) {
      ops.push(`H${idx === 1 ? '₁' : '₂'} = z${idx === 1 ? '₁' : '₂'} + P${idx === 1 ? '₁' : '₂'}/γ + α${idx === 1 ? '₁' : '₂'}·V${idx === 1 ? '₁' : '₂'}²/(2g) = ${f(p.z)} + ${f(e.hP)} + ${f(e.hV)} = ${f(e.H)} m`);
    } else {
      ops.push(`H${idx === 1 ? '₁' : '₂'} = z${idx === 1 ? '₁' : '₂'} + P${idx === 1 ? '₁' : '₂'}/γ + α·V²/(2g) = — (faltan z, P o V del punto ${idx})`);
    }
  }
  if (e1 && e2) {
    const HB = model.HB ?? 0;
    const HT = model.HT ?? 0;
    const hL = model.losses && !model.losses.error ? model.losses.hL : null;
    ops.push(`Balance: H₁ + H_B = H₂ + H_T + h_L → ${f(e1.H)} + ${f(HB)} = ${f(e2.H)} + ${f(HT)} + ${f(hL)}`);
  }
  return ops;
}

function pipeOperations(model) {
  const ops = [];
  const st = model.state ?? {};
  const fluid = st.fluid ?? {};
  const pipe = model.pipe ?? null;
  const loss = model.losses ?? null;
  const g = fluid.g;
  if (pipe?.V != null && g != null) {
    ops.push(`Carga de velocidad de la tubería: h_V = V²/(2g) = ${f(pipe.V, 5)}² / (2·${f(g, 5)}) = ${f((pipe.V * pipe.V) / (2 * g))} m`);
  }
  if (pipe?.Re != null) {
    ops.push(`Re = V·D/ν = ${f(pipe.V, 5)} · ${f(pipe.D, 6)} / ${formatNumber(fluid.nu, 3)} = ${f(pipe.Re, 0)} → régimen ${pipe.regime}`);
  }
  const pipeLoss = loss && !loss.error ? loss.pipe : null;
  const pipeRaw = (st.losses?.pipe) ?? {};
  if (pipeRaw.frictionMethod === 'f ingresado' && pipeRaw.fInput != null) {
    ops.push(`f (Darcy, ingresado por el usuario) = ${f(pipeRaw.fInput, 6)}`);
  } else if (pipeLoss?.f != null) {
    ops.push(`f (Darcy, ${pipeLoss.fMethod ?? 'automático'}) = ${f(pipeLoss.f, 6)}`);
  }
  if (model.points?.[1]?.energy && model.points?.[2]?.energy) {
    const e1 = model.points[1].energy;
    const e2 = model.points[2].energy;
    const HB = model.HB ?? 0;
    const HT = model.HT ?? 0;
    const hLbal = e1.H + HB - e2.H - HT;
    ops.push(`h_L (balance) = H₁ + H_B − H₂ − H_T = ${f(e1.H)} + ${f(HB)} − ${f(e2.H)} − ${f(HT)} = ${f(hLbal)} m`);
  }
  if (loss && !loss.error) {
    if (loss.hf != null) ops.push(`h_f = f·(L/D)·V²/(2g) = ${f(loss.hf)} m`);
    if (loss.hm != null) ops.push(`h_m = ΣK·V²/(2g) = ${f(loss.hm)} m`);
    if (loss.hL != null) ops.push(`h_L = h_f + h_m = ${f(loss.hf ?? '—')} + ${f(loss.hm ?? '—')} = ${f(loss.hL)} m (fuente: ${loss.source})`);
  }
  return ops;
}

export function buildOperations(target, model) {
  if (!model) return [];
  const energyTargets = new Set(['P1', 'P2', 'z1', 'z2', 'HB', 'HT', 'hL', 'V1', 'V2']);
  if (energyTargets.has(target)) return energyOperations(model);

  const continuityTargets = new Set(['Q1', 'Q2', 'A1', 'A2', 'D1', 'D2']);
  if (continuityTargets.has(target)) {
    const idx = target.endsWith('1') ? 1 : 2;
    const ops = energyOperations(model);
    const p = model.points?.[idx] ?? {};
    const sub = idx === 1 ? '₁' : '₂';
    if (p.V != null) ops.push(`Velocidad del punto ${idx}: V${sub} = ${f(p.V, 5)} m/s`);
    if (p.A != null) ops.push(`Área del punto ${idx}: A${sub} = ${f(p.A, 6)} m²`);
    if (p.Q != null) ops.push(`Caudal del punto ${idx}: Q${sub} = ${f(p.Q, 6)} m³/s`);
    return ops;
  }

  if (['hf', 'hm', 'sumK', 'L', 'f'].includes(target)) return pipeOperations(model);

  if (target === 'Re') {
    const ops = [];
    const pipe = model.pipe ?? null;
    const fluid = (model.state ?? {}).fluid ?? {};
    ops.push(`Velocidad de la tubería: V = ${pipe?.V != null ? `${f(pipe.V, 5)} m/s` : '—'}`);
    ops.push(`Diámetro de la tubería: D = ${pipe?.D != null ? `${f(pipe.D, 6)} m` : '—'}`);
    ops.push(`Viscosidad cinemática: ν = ${fluid.nu != null ? formatNumber(fluid.nu, 3) : '—'} m²/s`);
    if (pipe?.Re != null) ops.push(`Re = V·D/ν = ${f(pipe.Re, 0)} → régimen ${pipe.regime}`);
    return ops;
  }
  return [];
}

export function buildExplanation({
  state,
  model = null,
  target,
  status,
  ok = false,
  value = null,
  formula = null,
  substitution = null,
  notes = [],
  missing = [],
  error = null,
  alternatives = [],
  numerical = false,
  iterations = null,
}) {
  const info = EQUATION_INFO[target] ?? {};
  const insufficient = missing.length ? explainInsufficient(target, missing) : [];
  const statusReason = status === STATUS.INSUFICIENTE
    ? `No es posible determinar ${SYMBOLS[target] ?? target}: faltan ${missing.length} dato(s) que la ecuación ${info.general ?? 'de energía'} necesita para despejar de forma única.`
    : (error ?? null);
  return {
    target,
    status,
    equation: {
      general: info.general ?? null,
      isolated: formula ?? info.isolated ?? null,
      why: info.why ?? null,
    },
    procedure: buildProcedure({ state, target, ok, value, substitution, numerical, iterations }),
    data: model ? describeData(state, model, target, { missing, ok }) : [],
    operations: model ? buildOperations(target, model) : [],
    substitution,
    result: ok ? { value, unit: UNITS[target] ?? null } : null,
    alternatives,
    insufficient,
    assumptions: collectAssumptions(state, target, { missing }),
    statusReason,
    notes,
  };
}
