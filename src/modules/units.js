export const PRESSURE_UNITS = ['Pa', 'kPa', 'bar', 'm.c.a.', 'psi'];
export const FLOW_UNITS = ['m³/s', 'L/s', 'm³/h'];
export const LENGTH_UNITS = ['m', 'mm', 'in'];
export const VELOCITY_UNITS = ['m/s'];
export const AREA_UNITS = ['m²'];
export const VISCOSITY_UNITS = ['m²/s', 'mm²/s'];
export const DENSITY_UNITS = ['kg/m³', 'g/cm³'];

const PRESSURE_TO_SI = {
  Pa: 1,
  kPa: 1000,
  bar: 100000,
  psi: 6894.757293168,
  'm.c.a.': null,
};

const FLOW_TO_SI = {
  'm³/s': 1,
  'L/s': 0.001,
  'm³/h': 1 / 3600,
};

const LENGTH_TO_SI = {
  m: 1,
  mm: 0.001,
  in: 0.0254,
};

const VELOCITY_TO_SI = { 'm/s': 1 };
const AREA_TO_SI = { 'm²': 1 };

const VISCOSITY_TO_SI = {
  'm²/s': 1,
  'mm²/s': 1e-6,
};

const DENSITY_TO_SI = {
  'kg/m³': 1,
  'g/cm³': 1000,
};

const TABLES = {
  pressure: PRESSURE_TO_SI,
  flow: FLOW_TO_SI,
  length: LENGTH_TO_SI,
  velocity: VELOCITY_TO_SI,
  area: AREA_TO_SI,
  viscosity: VISCOSITY_TO_SI,
  density: DENSITY_TO_SI,
};

const UNIT_LABELS = {
  pressure: PRESSURE_UNITS,
  flow: FLOW_UNITS,
  length: LENGTH_UNITS,
  velocity: VELOCITY_UNITS,
  area: AREA_UNITS,
  viscosity: VISCOSITY_UNITS,
  density: DENSITY_UNITS,
};

function factorToSI(unit, quantityType, options) {
  const table = TABLES[quantityType];
  if (!table) {
    throw new Error(`Tipo de magnitud desconocido: ${quantityType}`);
  }
  if (!(unit in table)) {
    throw new Error(`Unidad "${unit}" no válida para ${quantityType}`);
  }
  const factor = table[unit];
  if (factor === null) {
    if (quantityType === 'pressure' && unit === 'm.c.a.') {
      const gamma = options?.gamma;
      if (typeof gamma !== 'number' || !Number.isFinite(gamma) || gamma <= 0) {
        throw new Error('Se requiere el peso específico gamma (N/m³) para convertir m.c.a.');
      }
      return gamma;
    }
    throw new Error(`Conversión no disponible para ${unit}`);
  }
  return factor;
}

export function unitsFor(quantityType) {
  return UNIT_LABELS[quantityType] ?? [];
}

export function toSI(value, unit, quantityType, options = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Valor numérico no válido');
  }
  return value * factorToSI(unit, quantityType, options);
}

export function fromSI(value, unit, quantityType, options = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Valor numérico no válido');
  }
  return value / factorToSI(unit, quantityType, options);
}
