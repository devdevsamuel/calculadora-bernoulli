import { obtenerSnapshotInforme, refreshView, formatearDato } from './calculator.js';
import { setChartTheme, setModoCaptura } from './chart.js';
import { currentTheme } from './theme.js';
import { formatNumber, formatScientific } from '../modules/format.js';

const $ = (id) => document.getElementById(id);

const GRAFICAS = [
  {
    id: 'chart-perfil',
    resumen: 'chart-perfil-resumen',
    titulo: 'Perfil de cargas (cota, línea piezométrica y línea de energía)',
  },
  {
    id: 'chart-barras',
    resumen: 'chart-barras-resumen',
    titulo: 'Comparación de componentes de energía',
  },
  {
    id: 'chart-perdidas',
    resumen: 'chart-perdidas-resumen',
    titulo: 'Composición de las pérdidas de carga',
  },
];

const CRITERIO_BALANCE =
  'Criterio: |H_izq − H_der| ≤ 1·10⁻⁶ + 1·10⁻⁸·max(|H_izq|, |H_der|).';

function esc(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fechaLocal(iso) {
  try {
    return new Date(iso).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return iso ?? '—';
  }
}

function tabla(cabeceras, filas) {
  if (!filas.length) return '';
  return `<table class="informe-tabla">
    <thead><tr>${cabeceras.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${filas.join('')}</tbody>
  </table>`;
}

function seccion(titulo, cuerpo) {
  return `<section class="informe-seccion"><h3>${esc(titulo)}</h3>${cuerpo}</section>`;
}

function capturarGraficas() {
  const oscuro = currentTheme() === 'dark';
  const panel = document.getElementById('panel-calculadora');
  const panelOculto = panel ? panel.hidden : false;
  if (panelOculto) panel.hidden = false;
  setModoCaptura(true);
  if (oscuro) setChartTheme('light');
  refreshView();
  const salida = GRAFICAS.map((g) => {
    const canvas = document.getElementById(g.id);
    const vacio = document.getElementById(`${g.id}-vacio`);
    const resumenEl = document.getElementById(g.resumen);
    const resumen = (resumenEl?.textContent ?? '').trim();
    const lienzoVisible = canvas && canvas.style.display !== 'none';
    const sinEstadoVacio = vacio ? vacio.style.display === 'none' : true;
    if (!lienzoVisible || !sinEstadoVacio) {
      return { ...g, vacia: true, nota: resumen || 'Sin datos suficientes para representar la gráfica.' };
    }
    let src = null;
    try {
      src = canvas.toDataURL('image/png');
    } catch {
      src = null;
    }
    if (!src) {
      return { ...g, vacia: true, nota: 'La gráfica no pudo capturarse en este navegador.' };
    }
    return { ...g, src, resumen, alt: resumen || g.titulo };
  });
  if (oscuro) setChartTheme('dark');
  setModoCaptura(false);
  refreshView();
  if (panelOculto) panel.hidden = true;
  return salida;
}

function seccionDatos(snap) {
  const entradas = snap.exp?.data ?? [];
  const filas = entradas.map((e) => {
    const d = formatearDato(e, snap.state);
    const origen = d.nota ? `${d.origen} — ${d.nota}` : d.origen;
    return `<tr>
      <td class="font-semibold">${esc(e.symbol)}</td>
      <td>${esc(e.label ?? '')}</td>
      <td class="num">${esc(d.texto)}</td>
      <td>${esc(d.unidad)}</td>
      <td>${esc(origen)}</td>
    </tr>`;
  });
  const datos = filas.length
    ? tabla(['Símbolo', 'Dato', 'Valor', 'Unidad', 'Origen'], filas)
    : '<p class="informe-nota">Sin datos estructurados disponibles: el cálculo no llegó a formularse con los datos ingresados.</p>';

  const f = snap.state?.fluid ?? {};
  const fluido = [
    ['g', 'Gravedad', formatNumber(f.g, 5), 'm/s²'],
    ['ρ', 'Densidad', formatNumber(f.rho, 2), 'kg/m³'],
    ['ν', 'Viscosidad cinemática', formatScientific(f.nu), 'm²/s'],
    ['γ', 'Peso específico (γ = ρ·g)', formatNumber(f.gamma, 2), 'N/m³'],
    ['α₁', 'Corrección cinética punto 1', formatNumber(f.alpha1, 3), '(adimensional)'],
    ['α₂', 'Corrección cinética punto 2', formatNumber(f.alpha2, 3), '(adimensional)'],
  ].map(([s, n, v, u]) => `<tr><td class="font-semibold">${esc(s)}</td><td>${esc(n)}</td><td class="num">${esc(v)}</td><td>${esc(u)}</td></tr>`);

  return seccion('Datos del ejercicio', `
    <p class="informe-linea"><strong>Incógnita seleccionada:</strong> ${esc(snap.etiqueta)}</p>
    <p class="informe-linea"><strong>Estado del cálculo:</strong> ${esc(snap.estado)}</p>
    ${datos}
    <p class="informe-sub">Propiedades del fluido usadas</p>
    ${tabla(['Símbolo', 'Propiedad', 'Valor', 'Unidad'], fluido)}`);
}

function seccionProcedimiento(snap) {
  const proc = snap.exp?.procedure ?? null;
  const ecuacion = proc?.equation ?? snap.exp?.equation?.general ?? null;
  if (!proc && !ecuacion) {
    return seccion(
      'Procedimiento matemático',
      '<p class="informe-nota">Sin procedimiento disponible: el cálculo no llegó a formularse.</p>',
    );
  }

  let resultadoTexto = '— (sin resultado válido)';
  if (snap.valido && snap.valor != null) {
    resultadoTexto = `${snap.etiqueta} = ${formatNumber(snap.valor, snap.decimales)}${snap.unidad ? ` ${snap.unidad}` : ''}`;
    if (snap.resultadoSI?.unidad && snap.resultadoSI.unidad !== snap.unidad) {
      resultadoTexto += ` (SI: ${formatNumber(snap.resultadoSI.valor, 4)} ${snap.resultadoSI.unidad})`;
    }
  }

  const conversiones = (proc?.conversions ?? []).length
    ? proc.conversions
    : (proc?.complete
      ? ['No se requieren conversiones: los datos y el resultado se manejan en unidades SI (Pa, m, m³/s, m/s, m², N/m³).']
      : []);

  const pasos = [
    ['1. Ecuación original', ecuacion ?? '—'],
    ['2. Despeje simbólico', (proc?.symbolic ?? []).join('  ·  ') || '—'],
    ['3. Conversiones de unidades', conversiones.join('  ·  ') || '—'],
    ['4. Sustitución numérica', proc?.substitution ?? '—'],
    ['5. Resultado final', resultadoTexto],
  ].map(([p, d]) => `<tr><td class="font-semibold">${esc(p)}</td><td class="informe-mono">${esc(d)}</td></tr>`);

  const incompleto = proc && proc.complete === false
    ? '<p class="informe-nota"><strong>Procedimiento incompleto:</strong> no se completó el cálculo con los datos disponibles; no se presenta sustitución ni resultado final.</p>'
    : '';

  const extras = [];
  if (proc?.method) extras.push(`<li><strong>Método de solución:</strong> ${esc(proc.method)}</li>`);
  if (proc?.presentationNote) extras.push(`<li>${esc(proc.presentationNote)}</li>`);
  const operaciones = (snap.exp?.operations ?? []).map((o) => `<li>${esc(o)}</li>`).join('');

  return seccion('Procedimiento matemático', `
    ${incompleto}
    ${tabla(['Paso', 'Detalle'], pasos)}
    ${extras.length ? `<ul class="informe-lista">${extras.join('')}</ul>` : ''}
    ${operaciones ? `<p class="informe-sub">Operaciones paso a paso</p><ul class="informe-lista">${operaciones}</ul>` : ''}`);
}

function seccionResultados(snap) {
  const filaResultado = snap.valido && snap.valor != null
    ? `<tr>
        <td class="font-semibold">${esc(snap.etiqueta)}</td>
        <td class="num">${esc(formatNumber(snap.valor, snap.decimales))}</td>
        <td>${esc(snap.unidad || '—')}</td>
        <td>${snap.decimales} decimales · ${snap.numerico ? 'solucionador numérico' : 'forma cerrada'}</td>
      </tr>`
    : `<tr>
        <td class="font-semibold">${esc(snap.etiqueta)}</td>
        <td class="num">—</td>
        <td>—</td>
        <td>Sin resultado válido</td>
      </tr>`;

  const modo = snap.state?.losses?.mode === 'automaticas'
    ? 'Cálculo automático (Darcy–Weisbach + pérdidas menores)'
    : (snap.state?.losses?.mode === 'ingresadas' ? 'Pérdidas ingresadas por el usuario' : '—');
  const perdidas = [['Modo de pérdidas', modo, '', '']];
  const loss = snap.model?.losses ?? null;
  if (loss && !loss.error) {
    perdidas.push(['h_f (pérdida mayor por fricción)', loss.hf != null ? formatNumber(loss.hf) : '—', 'm', '']);
    perdidas.push(['h_m (pérdida menor por accesorios)', loss.hm != null ? formatNumber(loss.hm) : '—', 'm', '']);
    perdidas.push(['h_L (pérdida total)', loss.hL != null ? formatNumber(loss.hL) : '—', 'm', `Fuente: ${loss.source ?? '—'}`]);
    const pipe = loss.pipe ?? null;
    if (pipe) {
      perdidas.push(['f (factor de Darcy)', pipe.f != null ? formatNumber(pipe.f, 6) : '—', '(adimensional)', pipe.fMethod ?? '']);
      perdidas.push(['Re (Reynolds)', pipe.Re != null ? formatNumber(pipe.Re, 0) : '—', '(adimensional)', pipe.regime ?? '']);
    }
  } else if (loss?.error) {
    perdidas.push(['Detalle', loss.error, '', '']);
  } else {
    perdidas.push(['Detalle', 'Sin datos de pérdidas disponibles en este cálculo.', '', '']);
  }

  return seccion('Resultados', `
    ${tabla(['Variable', 'Valor', 'Unidad', 'Precisión de presentación y método'], [filaResultado])}
    <p class="informe-sub">Energía de pérdidas</p>
    ${tabla(['Concepto', 'Valor', 'Unidad', 'Nota'], perdidas.map(([a, b, c, d]) =>
      `<tr><td class="font-semibold">${esc(a)}</td><td class="num">${esc(b)}</td><td>${esc(c)}</td><td>${esc(d)}</td></tr>`))}`);
}

function seccionGraficas(graficas) {
  const figuras = graficas.map((g) => {
    if (g.vacia || !g.src) {
      return `<p class="informe-nota"><strong>${esc(g.titulo)}:</strong> sin gráfica en este cálculo. ${esc(g.nota ?? '')}</p>`;
    }
    return `<figure class="informe-fig">
      <img src="${g.src}" alt="${esc(g.alt ?? g.titulo)}">
      <figcaption><strong>${esc(g.titulo)}.</strong> ${esc(g.resumen ?? '')}</figcaption>
    </figure>`;
  }).join('');
  return seccion('Gráficas hidráulicas', figuras || '<p class="informe-nota">Sin gráficas disponibles.</p>');
}

function seccionBalance(snap) {
  const bal = snap.model?.balance ?? null;
  if (snap.valido && bal) {
    const estado = bal.ok ? 'Balance verificado' : 'Revisar datos (el residual supera la tolerancia)';
    const filas = [
      ['H₁ + H_B (lado izquierdo)', formatNumber(bal.left, 6), 'm'],
      ['H₂ + H_T + h_L (lado derecho)', formatNumber(bal.right, 6), 'm'],
      ['Diferencia residual', formatNumber(bal.diff, 6), 'm'],
      ['Estado', estado, ''],
    ].map(([a, b, c]) => `<tr><td class="font-semibold">${esc(a)}</td><td class="num">${esc(b)}</td><td>${esc(c)}</td></tr>`);
    return seccion('Comprobación del balance de energía', `
      ${tabla(['Término', 'Valor', 'Unidad'], filas)}
      <p class="informe-nota">${esc(CRITERIO_BALANCE)}</p>`);
  }
  return seccion('Comprobación del balance de energía', `
    <p class="informe-estado informe-estado-error"><strong>No verificado.</strong> ${esc(snap.estado)}.</p>
    <p class="informe-nota">${esc(CRITERIO_BALANCE)}</p>`);
}

function seccionObservaciones(snap) {
  const items = [];
  if (!snap.valido) items.push(`El cálculo no es válido ni completo: ${snap.estado}.`);
  for (const e of snap.errores ?? []) items.push(`Error de datos: ${e}`);
  for (const f of snap.faltantes ?? []) items.push(`Falta: ${f}. Complete ese dato en el formulario.`);
  for (const it of snap.exp?.insufficient ?? []) items.push(`Falta ${it.item}: ${it.reason}`);
  if (snap.exp?.statusReason && !snap.valido) items.push(snap.exp.statusReason);
  for (const a of snap.exp?.assumptions ?? []) items.push(`Supuesto: ${a}`);
  const loss = snap.model?.losses ?? null;
  if (loss?.error) items.push(`Pérdidas: ${loss.error}`);
  if (loss?.pipe?.warning) items.push(`Advertencia: ${loss.pipe.warning}`);
  items.push('Hipótesis del modelo: flujo permanente, fluido incompresible y sección uniforme; α según los valores usados; presión coherente en ambos puntos (manométrica o absoluta).');
  items.push('La serie representada entre los dos puntos del perfil es una interpolación ilustrativa: la distribución intermedia no se conoce.');
  items.push('El factor f es el factor de fricción de Darcy (no Fanning); en régimen de transición el factor se considera incierto.');
  items.push('El cálculo no redondea valores intermedios; el redondeo mostrado es solo de presentación.');
  return seccion(
    'Observaciones, hipótesis y limitaciones',
    `<ul class="informe-lista">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`,
  );
}

function mostrarAviso(html) {
  const aviso = $('informe-aviso');
  if (!aviso) return;
  aviso.innerHTML = html;
  aviso.hidden = false;
}

function ocultarAviso() {
  const aviso = $('informe-aviso');
  if (!aviso) return;
  aviso.hidden = true;
  aviso.innerHTML = '';
}

function motivoBloqueo(snap) {
  if (!snap) {
    return '<p><strong>No se generó el informe.</strong> Genere un cálculo en la calculadora («Calcular» o «Cargar ejemplo») y vuelva a pulsar «Generar informe».</p>';
  }
  const motivos = [];
  motivos.push(`<p><strong>No se generó el informe.</strong> ${esc(snap.estado ?? 'El cálculo no tiene solución válida con los datos actuales.')}</p>`);
  const faltantes = (snap.faltantes ?? []).map((f) => `<li>Falta: ${esc(f)}.</li>`).join('');
  const errores = (snap.errores ?? []).map((e) => `<li>Error de datos: ${esc(e)}.</li>`).join('');
  const insuficientes = (snap.exp?.insufficient ?? [])
    .map((it) => `<li>Falta ${esc(it.item)}: ${esc(it.reason)}.</li>`)
    .join('');
  const detalle = faltantes + errores + insuficientes
    || (snap.exp?.statusReason ? `<li>${esc(snap.exp.statusReason)}</li>` : '')
    || '<li>Complete los datos obligatorios de la incógnita seleccionada y pulse «Calcular».</li>';
  return `${motivos.join('')}<ul class="lista-alertas mt-1 list-disc pl-5">${detalle}</ul>
    <p class="mt-1 text-xs">El informe solo se genera cuando el cálculo es válido y el balance queda verificado.</p>`;
}

export function generarInforme() {
  const bloque = $('informe');
  const cont = $('informe-contenido');
  const meta = $('informe-meta');
  if (!bloque || !cont || !meta) return false;

  const snap = obtenerSnapshotInforme();
  if (!snap || !snap.valido) {
    bloque.hidden = true;
    mostrarAviso(motivoBloqueo(snap));
    $('informe-aviso')?.scrollIntoView?.({ block: 'nearest' });
    return false;
  }

  ocultarAviso();

  const graficas = capturarGraficas();
  const banner = '<p class="informe-estado informe-estado-ok"><strong>Cálculo válido.</strong> El balance de energía se verificó con la tolerancia numérica indicada en la sección de comprobación.</p>';

  meta.innerHTML = `
    <span><strong>Generado:</strong> ${esc(fechaLocal(snap.fecha))}</span>
    <span><strong>Incógnita:</strong> ${esc(snap.etiqueta)}</span>
    <span><strong>Estado:</strong> ${esc(snap.estado)}</span>`;

  cont.innerHTML = [
    banner,
    seccionDatos(snap),
    seccionProcedimiento(snap),
    seccionResultados(snap),
    seccionGraficas(graficas),
    seccionBalance(snap),
    seccionObservaciones(snap),
  ].join('\n');

  bloque.hidden = false;
  return true;
}

export async function imprimirInforme() {
  const ok = generarInforme();
  if (!ok) return;
  const cont = $('informe-contenido');
  const imgs = cont ? [...cont.querySelectorAll('img')] : [];
  await Promise.all(
    imgs.map((im) => (typeof im.decode === 'function' ? im.decode().catch(() => {}) : Promise.resolve())),
  );
  window.print();
}

function setMinimizado(minimizado) {
  const bloque = $('informe');
  const boton = $('btn-informe-minimizar');
  if (!bloque || !boton) return;
  bloque.classList.toggle('informe-minimizado', minimizado);
  boton.setAttribute('aria-expanded', String(!minimizado));
  boton.textContent = minimizado ? 'Desplegar informe' : 'Minimizar';
}

export function initInforme() {
  $('btn-informe')?.addEventListener('click', () => {
    const ok = generarInforme();
    if (ok) {
      setMinimizado(false);
      $('informe-titulo')?.focus?.();
    }
  });
  $('btn-informe-imprimir')?.addEventListener('click', () => {
    imprimirInforme();
  });
  $('btn-informe-cerrar')?.addEventListener('click', () => {
    const bloque = $('informe');
    if (bloque) bloque.hidden = true;
    setMinimizado(false);
    $('btn-informe')?.focus();
  });
  $('btn-informe-minimizar')?.addEventListener('click', () => {
    const bloque = $('informe');
    if (!bloque) return;
    const minimizado = !bloque.classList.contains('informe-minimizado');
    setMinimizado(minimizado);
    if (!minimizado) $('informe-titulo')?.focus?.();
  });
  let estabaMinimizado = false;
  window.addEventListener('beforeprint', () => {
    const bloque = $('informe');
    estabaMinimizado = !!(bloque && bloque.classList.contains('informe-minimizado'));
    generarInforme();
    setMinimizado(false);
  });
  window.addEventListener('afterprint', () => {
    if (estabaMinimizado) setMinimizado(true);
    estabaMinimizado = false;
  });
}
