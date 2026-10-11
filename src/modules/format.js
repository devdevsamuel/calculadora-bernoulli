export function formatNumber(value, decimals = 4) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatResult(value, unit, decimals = 4) {
  return `${formatNumber(value, decimals)}${unit ? ` ${unit}` : ''}`;
}

export function formatScientific(value, decimals = 3) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }
  return value.toExponential(decimals).replace('.', ',').replace('e', ' × 10^');
}

export function formatWithUnit(value, unit, decimals = 4) {
  return `${formatNumber(value, decimals)} ${unit}`.trim();
}
