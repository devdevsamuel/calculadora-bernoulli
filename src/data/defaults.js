export const DEFAULTS = {
  g: 9.80665,
  rho: 998.2,
  nu: 1.004e-6,
  alpha: 1,
  HB: 0,
  HT: 0,
  hL: 0,
  lossesMode: 'ingresadas',
  decimals: 4,
  frictionMethod: 'auto',
};

export const FLUID_PRESETS = [
  { id: 'agua-4', label: 'Agua 4 °C (valores de manual, aprox.)', rho: 999.97, nu: 1.567e-6 },
  { id: 'agua-10', label: 'Agua 10 °C (valores de manual, aprox.)', rho: 999.7, nu: 1.307e-6 },
  { id: 'agua-20', label: 'Agua 20 °C (defecto)', rho: 998.2, nu: 1.004e-6 },
  { id: 'agua-30', label: 'Agua 30 °C (valores de manual, aprox.)', rho: 995.65, nu: 0.801e-6 },
  { id: 'agua-40', label: 'Agua 40 °C (valores de manual, aprox.)', rho: 992.22, nu: 0.658e-6 },
  { id: 'agua-60', label: 'Agua 60 °C (valores de manual, aprox.)', rho: 983.2, nu: 0.475e-6 },
  { id: 'agua-80', label: 'Agua 80 °C (valores de manual, aprox.)', rho: 971.8, nu: 0.365e-6 },
  { id: 'agua-100', label: 'Agua 100 °C (valores de manual, aprox.)', rho: 958.4, nu: 0.294e-6 },
];

export const FLUID_CUSTOM = 'personalizado';

export function presetById(id) {
  return FLUID_PRESETS.find((p) => p.id === id) ?? null;
}

export const REFERENCE_EXAMPLE = {
  z1: 102,
  P1: 150,
  P1Unit: 'kPa',
  V1: 1.4324,
  z2: 115,
  Q2: 45,
  Q2Unit: 'L/s',
  D2: 150,
  D2Unit: 'mm',
  HB: 12,
  HT: 0,
  L: 88.3,
  epsilon: 0.0015,
  epsilonUnit: 'mm',
  sumK: 1.5,
  unknown: 'P2',
  lossesMode: 'automaticas',
};

export const UNKNOWN_OPTIONS = [
  { id: 'P2', label: 'Presión P2', unit: 'presión' },
  { id: 'P1', label: 'Presión P1', unit: 'presión' },
  { id: 'z2', label: 'Cota z2', unit: 'm' },
  { id: 'z1', label: 'Cota z1', unit: 'm' },
  { id: 'HB', label: 'Carga de bomba H_B', unit: 'm' },
  { id: 'HT', label: 'Carga de turbina H_T', unit: 'm' },
  { id: 'hL', label: 'Pérdidas totales h_L', unit: 'm' },
  { id: 'V1', label: 'Velocidad V1', unit: 'm/s' },
  { id: 'V2', label: 'Velocidad V2', unit: 'm/s' },
  { id: 'Q1', label: 'Caudal Q1', unit: 'caudal' },
  { id: 'Q2', label: 'Caudal Q2', unit: 'caudal' },
  { id: 'D1', label: 'Diámetro D1', unit: 'longitud' },
  { id: 'D2', label: 'Diámetro D2', unit: 'longitud' },
  { id: 'A1', label: 'Área A1', unit: 'm²' },
  { id: 'A2', label: 'Área A2', unit: 'm²' },
  { id: 'L', label: 'Longitud L', unit: 'm' },
  { id: 'f', label: 'Factor de fricción f (Darcy)', unit: '' },
  { id: 'sumK', label: 'Coeficientes ΣK', unit: '' },
  { id: 'hf', label: 'Pérdida mayor h_f', unit: 'm' },
  { id: 'hm', label: 'Pérdida menor h_m', unit: 'm' },
  { id: 'Re', label: 'Número de Reynolds Re', unit: '' },
];

export const UNKNOWN_LABELS = Object.fromEntries(
  UNKNOWN_OPTIONS.map((opt) => [opt.id, opt.label]),
);

export const FRICTION_METHODS = [
  { id: 'auto', label: 'Automático (laminar 64/Re o Swamee-Jain)' },
  { id: 'swamee-jain', label: 'Swamee-Jain (explícita)' },
  { id: 'colebrook', label: 'Colebrook-White (iterativa)' },
  { id: 'f ingresado', label: 'Factor de fricción ingresado' },
];
