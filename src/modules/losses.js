export const REGIME_LAMINAR = 'laminar';
export const REGIME_TRANSITION = 'transición';
export const REGIME_TURBULENT = 'turbulento';

export const RE_LAMINAR_MAX = 2300;
export const RE_TURBULENT_MIN = 4000;

export function calculateReynolds(V, D, nu) {
  if (!Number.isFinite(V)) {
    throw new Error('La velocidad no es válida');
  }
  if (!Number.isFinite(D) || D <= 0) {
    throw new Error('El diámetro debe ser un número positivo');
  }
  if (!Number.isFinite(nu) || nu <= 0) {
    throw new Error('La viscosidad cinemática debe ser positiva');
  }
  return (Math.abs(V) * D) / nu;
}

export function flowRegime(Re) {
  if (!Number.isFinite(Re) || Re < 0) {
    throw new Error('Número de Reynolds no válido');
  }
  if (Re < RE_LAMINAR_MAX) return REGIME_LAMINAR;
  if (Re <= RE_TURBULENT_MIN) return REGIME_TRANSITION;
  return REGIME_TURBULENT;
}

export function laminarFrictionFactor(Re) {
  if (!Number.isFinite(Re) || Re <= 0) {
    throw new Error('Se requiere un Reynolds positivo para el régimen laminar');
  }
  return 64 / Re;
}

export function swameeJainFrictionFactor(Re, relativeRoughness) {
  if (!Number.isFinite(Re) || Re <= 0) {
    throw new Error('Se requiere un Reynolds positivo');
  }
  if (!Number.isFinite(relativeRoughness) || relativeRoughness < 0) {
    throw new Error('La rugosidad relativa no es válida');
  }
  const term = relativeRoughness / 3.7 + 5.74 / Math.pow(Re, 0.9);
  const denominator = Math.pow(Math.log10(term), 2);
  if (!Number.isFinite(denominator) || denominator === 0) {
    throw new Error('No se pudo evaluar Swamee-Jain con estos datos');
  }
  return 0.25 / denominator;
}

export function colebrookWhiteFrictionFactor(Re, relativeRoughness, { tol = 1e-13, maxIter = 100 } = {}) {
  if (!Number.isFinite(Re) || Re <= 0) {
    throw new Error('Se requiere un Reynolds positivo');
  }
  if (!Number.isFinite(relativeRoughness) || relativeRoughness < 0) {
    throw new Error('La rugosidad relativa no es válida');
  }
  let f = swameeJainFrictionFactor(Re, relativeRoughness);
  for (let i = 0; i < maxIter; i += 1) {
    const sqrtF = Math.sqrt(f);
    const term = relativeRoughness / 3.7 + 2.51 / (Re * sqrtF);
    const fNew = 1 / Math.pow(-2 * Math.log10(term), 2);
    if (!Number.isFinite(fNew) || fNew <= 0) {
      throw new Error('La iteración de Colebrook-White no converge con estos datos');
    }
    if (Math.abs(fNew - f) < tol) {
      return fNew;
    }
    f = fNew;
  }
  throw new Error('La iteración de Colebrook-White no converge con estos datos');
}

export function calculateFrictionFactor(Re, epsilon, D, method = 'auto') {
  if (!Number.isFinite(D) || D <= 0) {
    throw new Error('El diámetro debe ser un número positivo');
  }
  if (!Number.isFinite(epsilon) || epsilon < 0) {
    throw new Error('La rugosidad absoluta no es válida');
  }
  const relativeRoughness = epsilon / D;
  const regime = flowRegime(Re);
  const warning =
    regime === REGIME_TRANSITION
      ? 'Régimen de transición (2300 ≤ Re ≤ 4000): el factor de fricción es incierto.'
      : null;

  if (method === 'f ingresado') {
    throw new Error('El factor de fricción ingresado no debe calcularse, solo usarse');
  }

  if (regime === REGIME_LAMINAR) {
    return { f: laminarFrictionFactor(Re), regime, warning, method: 'laminar (64/Re)' };
  }

  if (method === 'colebrook') {
    return {
      f: colebrookWhiteFrictionFactor(Re, relativeRoughness),
      regime,
      warning,
      method: 'Colebrook-White iterativo',
    };
  }

  if (method === 'swamee-jain') {
    return {
      f: swameeJainFrictionFactor(Re, relativeRoughness),
      regime,
      warning,
      method: 'Swamee-Jain (explícita)',
    };
  }

  if (method === 'auto') {
    return {
      f: swameeJainFrictionFactor(Re, relativeRoughness),
      regime,
      warning,
      method: regime === REGIME_TRANSITION ? 'Swamee-Jain (transición, incierto)' : 'Swamee-Jain (explícita)',
    };
  }

  throw new Error(`Método de factor de fricción desconocido: ${method}`);
}

export function calculateMajorLoss(f, L, D, V, g) {
  if (!Number.isFinite(f) || f < 0) {
    throw new Error('El factor de fricción de Darcy no es válido');
  }
  if (!Number.isFinite(L) || L < 0) {
    throw new Error('La longitud no es válida');
  }
  if (!Number.isFinite(D) || D <= 0) {
    throw new Error('El diámetro debe ser un número positivo');
  }
  if (!Number.isFinite(V)) {
    throw new Error('La velocidad no es válida');
  }
  if (!Number.isFinite(g) || g <= 0) {
    throw new Error('La gravedad debe ser positiva');
  }
  return f * (L / D) * ((V * V) / (2 * g));
}

export function calculateMinorLoss(sumK, V, g) {
  if (!Number.isFinite(sumK)) {
    throw new Error('La suma de coeficientes K no es válida');
  }
  if (!Number.isFinite(V)) {
    throw new Error('La velocidad no es válida');
  }
  if (!Number.isFinite(g) || g <= 0) {
    throw new Error('La gravedad debe ser positiva');
  }
  return sumK * ((V * V) / (2 * g));
}

export function calculateTotalLoss(hf, hm) {
  if (!Number.isFinite(hf) || hf < 0) {
    throw new Error('La pérdida mayor no es válida');
  }
  if (!Number.isFinite(hm) || hm < 0) {
    throw new Error('La pérdida menor no es válida');
  }
  return hf + hm;
}

export function computeAutomaticLosses({
  V,
  D,
  L,
  epsilon,
  nu,
  g,
  sumK = 0,
  frictionMethod = 'auto',
  fInput = null,
}) {
  if (!Number.isFinite(V)) {
    throw new Error('Se necesita la velocidad de la tubería para calcular pérdidas');
  }
  const Re = calculateReynolds(V, D, nu);
  let f;
  let fMethod;
  let warning = null;
  let regime;
  if (fInput !== null && fInput !== undefined) {
    if (!Number.isFinite(fInput) || fInput < 0) {
      throw new Error('El factor de fricción ingresado no es válido');
    }
    regime = flowRegime(Re);
    f = fInput;
    fMethod = 'factor de fricción ingresado (Darcy)';
    warning =
      regime === REGIME_TRANSITION
        ? 'Régimen de transición (2300 ≤ Re ≤ 4000): el factor de fricción es incierto.'
        : null;
  } else {
    const result = calculateFrictionFactor(Re, epsilon, D, frictionMethod);
    f = result.f;
    fMethod = result.method;
    warning = result.warning;
    regime = result.regime;
  }
  const hf = calculateMajorLoss(f, L, D, V, g);
  const hm = calculateMinorLoss(sumK, V, g);
  const hL = calculateTotalLoss(hf, hm);
  return { Re, regime, f, fMethod, warning, hf, hm, hL, sumK, V, D, L };
}
