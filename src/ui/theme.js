import { setChartTheme } from './chart.js';

const STORAGE_KEY = 'bernoulli-theme';

export function currentTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function applyTheme(theme, { persist = true } = {}) {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  setChartTheme(dark ? 'dark' : 'light');
  const btn = document.getElementById('btn-tema');
  if (btn) {
    btn.setAttribute('aria-pressed', String(dark));
    const icono = document.getElementById('btn-tema-icono');
    const texto = document.getElementById('btn-tema-texto');
    if (icono) icono.textContent = dark ? '☀' : '☾';
    if (texto) texto.textContent = dark ? 'Claro' : 'Oscuro';
  }
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      /* almacenamiento no disponible: se aplica sin persistir */
    }
  }
}

export function initTheme({ onToggle } = {}) {
  let guardado = null;
  try {
    guardado = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    guardado = null;
  }
  const prefiereOscuro =
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const inicial = guardado === 'dark' || guardado === 'light'
    ? guardado
    : (prefiereOscuro ? 'dark' : 'light');
  applyTheme(inicial, { persist: false });

  document.getElementById('btn-tema')?.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    onToggle?.(next);
  });
}
