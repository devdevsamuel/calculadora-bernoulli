export const TOL_ABS_DEFAULT = 1e-6;
export const TOL_REL_DEFAULT = 1e-8;

export function areaFromDiameter(D) {
  if (!Number.isFinite(D) || D <= 0) {
    throw new Error('El diámetro debe ser un número positivo');
  }
  return (Math.PI * D * D) / 4;
}

export function diameterFromArea(A) {
  if (!Number.isFinite(A) || A <= 0) {
    throw new Error('El área debe ser un número positivo');
  }
  return Math.sqrt((4 * A) / Math.PI);
}

export function diameterFromFlowVelocity(Q, V) {
  if (!Number.isFinite(Q) || Q <= 0) {
    throw new Error('El caudal debe ser un número positivo');
  }
  if (!Number.isFinite(V) || V <= 0) {
    throw new Error('La velocidad debe ser un número positiva');
  }
  return Math.sqrt((4 * Q) / (Math.PI * V));
}

export function velocityFromFlow(Q, A) {
  if (!Number.isFinite(Q)) {
    throw new Error('El caudal no es válido');
  }
  if (!Number.isFinite(A) || A <= 0) {
    throw new Error('El área debe ser un número positivo');
  }
  return Q / A;
}

export function flowFromVelocity(V, A) {
  if (!Number.isFinite(V)) {
    throw new Error('La velocidad no es válida');
  }
  if (!Number.isFinite(A) || A <= 0) {
    throw new Error('El área debe ser un número positivo');
  }
  return V * A;
}

export function velocityFromFlowDiameter(Q, D) {
  const A = areaFromDiameter(D);
  return velocityFromFlow(Q, A);
}

export function pressureHead(P, gamma) {
  if (!Number.isFinite(P)) {
    throw new Error('La presión no es válida');
  }
  if (!Number.isFinite(gamma) || gamma <= 0) {
    throw new Error('El peso específico debe ser positivo');
  }
  return P / gamma;
}

export function velocityHead(V, g, alpha = 1) {
  if (!Number.isFinite(V)) {
    throw new Error('La velocidad no es válida');
  }
  if (!Number.isFinite(g) || g <= 0) {
    throw new Error('La gravedad debe ser positiva');
  }
  if (!Number.isFinite(alpha) || alpha <= 0) {
    throw new Error('El coeficiente alpha debe ser positivo');
  }
  return (alpha * V * V) / (2 * g);
}

export function energyAtPoint({ z, P, V, gamma, g, alpha = 1 }) {
  if (!Number.isFinite(z)) {
    throw new Error('La cota no es válida');
  }
  const hP = pressureHead(P, gamma);
  const hV = velocityHead(V, g, alpha);
  return { z, hP, hV, H: z + hP + hV };
}

export function totalHead({ z, P, V, gamma, g, alpha = 1 }) {
  return energyAtPoint({ z, P, V, gamma, g, alpha }).H;
}

export function verifyBalance(
  { H1, HB = 0, H2, HT = 0, hL = 0 },
  { tolAbs = TOL_ABS_DEFAULT, tolRel = TOL_REL_DEFAULT } = {},
) {
  const left = H1 + HB;
  const right = H2 + HT + hL;
  const diff = left - right;
  const ok = Math.abs(diff) <= tolAbs + tolRel * Math.max(Math.abs(left), Math.abs(right));
  return { left, right, diff, ok, tolAbs, tolRel };
}
