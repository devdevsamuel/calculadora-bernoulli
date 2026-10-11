import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'src/style.css'), 'utf8');
const chartSrc = readFileSync(join(root, 'src/ui/chart.js'), 'utf8');
const guideSrc = readFileSync(join(root, 'src/ui/guide.js'), 'utf8');

function parseDocument() {
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html
    .replace(/^[\s\S]*?<html[^>]*>/, '')
    .replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  return { window, document };
}

function montar() {
  const { window, document } = parseDocument();
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  return { window, document };
}

function luminancia(hex) {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const l1 = luminancia(a);
  const l2 = luminancia(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function tokensDe(bloque) {
  const tokens = {};
  for (const m of bloque.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

function hexDeSeries(bloque) {
  return [...new Set(
    bloque
      .split('\n')
      .filter((linea) => !linea.includes('etiquetaDentro'))
      .flatMap((linea) => [...linea.matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0])),
  )];
}

function colorDeClave(bloque, clave) {
  const m = bloque.match(new RegExp(`${clave}:\\s*'(#[0-9a-fA-F]{6})'`));
  assert.ok(m, `falta el color ${clave}`);
  return m[1];
}

function nombreAccesible(el, document) {
  if (el.getAttribute('title')) return true;
  if (el.getAttribute('aria-label')) return true;
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy && labelledBy.split(/\s+/).some((id) => document.getElementById(id))) return true;
  if (el.id && document.querySelector(`label[for="${el.id}"]`)) return true;
  if (el.closest?.('label')) return true;
  if (['BUTTON', 'A'].includes(el.tagName) && el.textContent.trim().length > 0) return true;
  return false;
}

test('a11y: un solo h1 y jerarquía de encabezados sin saltos de nivel', () => {
  for (const [nombre, fuente, minimo] of [['index.html', html, 1], ['guide.js', guideSrc, 2]]) {
    const niveles = [...fuente.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    assert.ok(niveles.length > 0, `${nombre} debe tener encabezados`);
    if (minimo === 1) {
      assert.equal(niveles.filter((n) => n === 1).length, 1, `${nombre} debe tener exactamente un h1`);
    } else {
      assert.ok(niveles.every((n) => n >= 2), 'la guía se inyecta bajo el h1 de la página: sus títulos parten de h2');
    }
    let anterior = niveles[0];
    for (const nivel of niveles.slice(1)) {
      assert.ok(nivel <= anterior + 1, `${nombre}: salto de h${anterior} a h${nivel}`);
      anterior = nivel;
    }
  }
});

test('a11y: todo control de formulario tiene nombre accesible', () => {
  const { document } = parseDocument();
  const controles = [...document.querySelectorAll('input, select, textarea, button')]
    .filter((el) => el.type !== 'hidden');
  assert.ok(controles.length >= 40, 'se esperaban todos los controles del formulario');
  const sinNombre = controles
    .filter((el) => !nombreAccesible(el, document))
    .map((el) => el.outerHTML.slice(0, 120));
  assert.deepEqual(sinNombre, [], `controles sin nombre accesible: ${sinNombre.join(' | ')}`);
});

test('a11y: pestañas con ARIA correcto y el botón de tema fuera del tablist', () => {
  const { document } = parseDocument();
  const tablist = document.querySelector('[role="tablist"]');
  assert.ok(tablist, 'debe existir un contenedor role=tablist');
  assert.ok(tablist.getAttribute('aria-label'), 'el tablist debe etiquetarse');
  for (const hijo of tablist.children) {
    assert.equal(hijo.getAttribute('role'), 'tab', 'los hijos directos del tablist deben ser pestañas');
  }
  assert.ok(
    !document.getElementById('btn-tema').closest('[role="tablist"]'),
    'el botón de tema no puede estar dentro del tablist',
  );

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const seleccionada = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
  assert.equal(seleccionada.length, 1, 'una sola pestaña debe estar seleccionada');
  assert.equal(seleccionada[0].getAttribute('tabindex'), '0', 'la pestaña activa entra en el orden de tabulación');
  for (const t of tabs.filter((t) => t !== seleccionada[0])) {
    assert.equal(t.getAttribute('tabindex'), '-1', 'las pestañas inactivas no deben acumularse en Tab');
  }
  for (const t of tabs) {
    const controls = t.getAttribute('aria-controls');
    assert.ok(controls && document.getElementById(controls), 'aria-controls debe apuntar a un panel existente');
  }
});

test('a11y: enlace de salto con destino enfocable y regiones con scroll accesibles por teclado', () => {
  const { document } = parseDocument();
  const salto = document.querySelector('a[href^="#"]');
  assert.ok(salto, 'debe existir un enlace de salto al contenido');
  const destino = document.getElementById(salto.getAttribute('href').slice(1));
  assert.ok(destino, 'el destino del enlace de salto debe existir');
  assert.equal(destino.getAttribute('tabindex'), '-1', 'el destino del salto debe poder recibir el foco');

  const conScroll = [...document.querySelectorAll('*')].filter((el) => {
    const c = typeof el.className === 'string' ? el.className : '';
    return /\boverflow-(x|y)-auto\b/.test(c);
  });
  assert.ok(conScroll.length >= 4, 'deben existir contenedores con desplazamiento');
  for (const el of conScroll) {
    assert.equal(el.getAttribute('tabindex'), '0', `región con scroll sin tabindex=0: ${el.className}`);
    const etiqueta = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
    assert.ok(etiqueta, `región con scroll sin nombre accesible: ${el.className}`);
  }
});

test('a11y: cada gráfica tiene nombre y descripción textual asociada', () => {
  const { document } = parseDocument();
  const lienzos = [...document.querySelectorAll('canvas')];
  assert.equal(lienzos.length, 3, 'hay tres gráficas');
  for (const lienzo of lienzos) {
    assert.equal(lienzo.getAttribute('role'), 'img');
    assert.ok((lienzo.getAttribute('aria-label') ?? '').length > 20, 'descripción larga de la gráfica');
    const desc = lienzo.getAttribute('aria-describedby');
    assert.ok(desc, 'la gráfica debe apuntar a su resumen textual');
    const resumen = document.getElementById(desc);
    assert.ok(resumen, `resumen textual inexistente: ${desc}`);
    assert.ok(!resumen.hasAttribute('aria-live'), 'los resúmenes no deben ser regiones vivas (evita anuncios continuos)');
  }
});

test('a11y: grupos de radios y listas etiquetados', () => {
  const { document } = parseDocument();
  const grupo = document.querySelector('[role="radiogroup"]');
  assert.ok(grupo, 'el modo de pérdidas debe ser un radiogroup');
  const ref = grupo.getAttribute('aria-labelledby');
  assert.ok(ref && document.getElementById(ref), 'aria-labelledby del radiogroup debe existir');
  for (const radio of grupo.querySelectorAll('input[type="radio"]')) {
    assert.ok(nombreAccesible(radio, document), 'cada radio debe tener etiqueta visible');
  }
  const lista = document.getElementById('accesorios-lista');
  const etiquetaLista = lista.getAttribute('aria-labelledby') || lista.getAttribute('aria-label');
  assert.ok(etiquetaLista && document.getElementById(etiquetaLista), 'la lista de accesorios debe etiquetarse');
});

test('contraste claro: tokens de texto ≥ 4,5:1, foco ≥ 3:1 y foco visible en la franja azul', () => {
  const claro = tokensDe(css.match(/:root\s*{([\s\S]*?)}/)[1]);
  const texto = [
    ['ink', 'surface'], ['ink', 'page'], ['ink', 'surface-2'],
    ['ink-soft', 'surface'], ['ink-soft', 'page'], ['ink-soft', 'surface-2'],
    ['accent', 'surface'], ['accent', 'page'],
    ['on-accent', 'accent-strong'],
    ['ok-text', 'ok-bg'], ['err-text', 'err-bg'], ['warn-text', 'warn-bg'],
    ['edit-ink', 'edit-bg'], ['ink', 'calc-bg'],
  ];
  for (const [a, b] of texto) {
    const r = contraste(claro[a], claro[b]);
    assert.ok(r >= 4.5, `claro: ${a} sobre ${b} = ${r.toFixed(2)} (mínimo 4,5)`);
  }
  for (const fondo of ['surface', 'page', 'edit-bg', 'calc-bg']) {
    const r = contraste(claro.focus, claro[fondo]);
    assert.ok(r >= 3, `claro: foco sobre ${fondo} = ${r.toFixed(2)} (mínimo 3)`);
  }
  assert.match(
    css,
    /\.franja-resultado :focus-visible\s*{[^}]*var\(--color-on-accent\)/,
    'la franja azul debe usar un contorno oscuro para que el foco sea visible',
  );
  const rFranja = contraste(claro['on-accent'], claro['accent-strong']);
  assert.ok(rFranja >= 3, `contorno de la franja = ${rFranja.toFixed(2)} (mínimo 3)`);
});

test('contraste oscuro: tokens de texto ≥ 4,5:1 y foco ≥ 3:1', () => {
  const oscuro = tokensDe(css.match(/html\.dark\s*{([\s\S]*?)}/)[1]);
  const texto = [
    ['ink', 'surface'], ['ink', 'page'], ['ink', 'surface-2'],
    ['ink-soft', 'surface'], ['ink-soft', 'page'],
    ['accent', 'surface'],
    ['on-accent', 'accent-strong'],
    ['ok-text', 'ok-bg'], ['err-text', 'err-bg'], ['warn-text', 'warn-bg'],
    ['edit-ink', 'edit-bg'], ['ink', 'calc-bg'],
  ];
  for (const [a, b] of texto) {
    const r = contraste(oscuro[a], oscuro[b]);
    assert.ok(r >= 4.5, `oscuro: ${a} sobre ${b} = ${r.toFixed(2)} (mínimo 4,5)`);
  }
  for (const fondo of ['surface', 'page', 'calc-bg']) {
    const r = contraste(oscuro.focus, oscuro[fondo]);
    assert.ok(r >= 3, `oscuro: foco sobre ${fondo} = ${r.toFixed(2)} (mínimo 3)`);
  }
});

test('contraste: series de Chart.js ≥ 3:1 y etiquetas dentro de barras ≥ 4,5:1', () => {
  const bloqueClaro = chartSrc.match(/light:\s*{([\s\S]*?)\n  },/)[1];
  const bloqueOscuro = chartSrc.match(/dark:\s*{([\s\S]*?)\n  },/)[1];

  for (const color of hexDeSeries(bloqueClaro)) {
    const r = contraste(color, '#ffffff');
    assert.ok(r >= 3, `paleta clara ${color} sobre blanco = ${r.toFixed(2)} (mínimo 3)`);
  }
  for (const color of hexDeSeries(bloqueOscuro)) {
    const r = contraste(color, '#162633');
    assert.ok(r >= 3, `paleta oscura ${color} sobre panel = ${r.toFixed(2)} (mínimo 3)`);
  }

  const dentroClaro = colorDeClave(bloqueClaro, 'etiquetaDentro');
  const dentroOscuro = colorDeClave(bloqueOscuro, 'etiquetaDentro');
  for (const clave of ['hf', 'hm']) {
    const rClaro = contraste(dentroClaro, colorDeClave(bloqueClaro, clave));
    assert.ok(rClaro >= 4.5, `etiqueta sobre ${clave} (claro) = ${rClaro.toFixed(2)} (mínimo 4,5)`);
    const rOscuro = contraste(dentroOscuro, colorDeClave(bloqueOscuro, clave));
    assert.ok(rOscuro >= 4.5, `etiqueta sobre ${clave} (oscuro) = ${rOscuro.toFixed(2)} (mínimo 4,5)`);
  }
});

test('a11y: el campo de la incógnita queda de solo lectura (no deshabilitado) y enfocable', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { setupTabs } = await import('../src/ui/tabs.js');
  setupTabs();
  initCalculator();

  const campo = document.getElementById('p2-P');
  assert.equal(campo.readOnly, true, 'la celda de la incógnita debe ser de solo lectura');
  assert.equal(campo.disabled, false, 'no debe quedar deshabilitada: el foco y la lectura deben ser posibles');
  assert.equal(campo.placeholder, 'calculado');

  document.getElementById('btn-ejemplo').click();
  const velocidad = document.getElementById('p2-V');
  assert.equal(velocidad.disabled, false, 'la velocidad calculada desde Q y D no debe deshabilitarse');
  assert.equal(velocidad.readOnly, true, 'la velocidad calculada debe quedar de solo lectura');

  const estado = document.getElementById('resultado-estado');
  const oculto = estado.querySelector('.sr-only');
  assert.ok(oculto, 'el estado debe incluir el resultado para los lectores de pantalla');
  assert.match(oculto.textContent, /Presión P2 = [\d.,]+ kPa/, 'el texto oculto repite incógnita, valor y unidad');
});

test('a11y: teclado en pestañas (flechas, Home/End) mueve foco y selección', async () => {
  montar();
  const { setupTabs } = await import('../src/ui/tabs.js');
  const { initCalculator } = await import('../src/ui/calculator.js');
  setupTabs();
  initCalculator();

  const tabCalc = document.getElementById('tab-calculadora');
  const tabGuia = document.getElementById('tab-guia');
  const tecla = (el, key) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

  tabCalc.focus();
  tecla(tabCalc, 'ArrowRight');
  assert.equal(tabGuia.getAttribute('aria-selected'), 'true', 'ArrowRight cambia a la siguiente pestaña');
  assert.equal(document.activeElement, tabGuia, 'el foco sigue a la pestaña');
  assert.equal(document.getElementById('panel-guia').hidden, false);
  assert.equal(tabCalc.getAttribute('tabindex'), '-1');

  tecla(tabGuia, 'End');
  assert.equal(document.activeElement, tabGuia, 'End va a la última pestaña');
  tecla(tabGuia, 'Home');
  assert.equal(document.activeElement, tabCalc, 'Home vuelve a la primera pestaña');
  assert.equal(tabCalc.getAttribute('aria-selected'), 'true');
  assert.equal(document.getElementById('panel-calculadora').hidden, false);

  tecla(tabCalc, 'ArrowLeft');
  assert.equal(tabGuia.getAttribute('aria-selected'), 'true', 'ArrowLeft también navega hacia atrás');
});

test('a11y: un valor inválido muestra mensaje visible junto al campo y en el resumen', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  const campo = document.getElementById('p1-z');
  campo.value = 'abc';
  campo.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  assert.equal(campo.getAttribute('aria-invalid'), 'true');
  const describedBy = campo.getAttribute('aria-describedby');
  assert.ok(describedBy, 'el campo inválido debe describir su error');
  const msg = document.getElementById(describedBy.split(/\s+/).pop());
  assert.ok(msg, 'el mensaje de error debe existir en el DOM');
  assert.match(msg.className, /msg-error/, 'el mensaje debe usar la clase de error visible');
  assert.match(msg.textContent, /no es un número válido/, 'el mensaje debe explicar el problema');
  assert.match(msg.textContent, /coma decimal/, 'el mensaje debe explicar cómo corregirlo');

  const alerta = document.querySelector('#resultado-alertas [role="alert"]');
  assert.ok(alerta, 'el resumen de errores debe anunciarse');
  assert.match(alerta.textContent, /Cota z1/, 'el resumen debe nombrar el campo con error');
  assert.match(alerta.textContent, /cada campo con un valor incorrecto/i, 'el resumen debe explicar dónde corregir');

  campo.value = '102';
  campo.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(campo.hasAttribute('aria-invalid'), false, 'al corregir se limpia aria-invalid');
  assert.equal(document.getElementById('error-p1-z'), null, 'al corregir desaparece el mensaje visible');
  const alertaFinal = document.querySelector('#resultado-alertas [role="alert"]');
  assert.ok(
    !alertaFinal || !alertaFinal.textContent.includes('abc'),
    'el resumen ya no debe mencionar el valor corregido',
  );
});

test('a11y: los mensajes de validación indican el rango permitido', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  const g = document.getElementById('gen-g');
  g.value = '-1';
  g.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  assert.equal(g.getAttribute('aria-invalid'), 'true');
  const msg = document.getElementById(g.getAttribute('aria-describedby'));
  assert.match(msg.textContent, /mayor que 0/, 'debe indicar el rango permitido');
  assert.match(msg.textContent, /Gravedad g/, 'debe nombrar el campo');

  const rho = document.getElementById('gen-rho');
  rho.value = '998.2';
  rho.dispatchEvent(new window.Event('input', { bubbles: true }));
  g.value = '9.80665';
  g.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(document.getElementById('error-gen-g'), null, 'el mensaje desaparece al corregir');
});

test('gráficas: alternativas textuales con los mismos datos tras cargar el ejemplo', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { renderGuide } = await import('../src/ui/guide.js');
  renderGuide(document.getElementById('panel-guia'));
  initCalculator();

  document.getElementById('btn-ejemplo').click();

  const perfil = document.getElementById('chart-perfil-resumen').textContent;
  assert.match(perfil, /Punto 1/);
  assert.match(perfil, /z=\d/, 'el resumen del perfil incluye la cota');
  assert.match(perfil, /EGL=\d/, 'el resumen del perfil incluye la línea de energía');

  const barras = document.getElementById('chart-barras-resumen').textContent;
  assert.match(barras, /Punto 1/);
  assert.match(barras, /P\/γ=\d/, 'el resumen de barras incluye la carga de presión');
  assert.match(barras, /H=\d/, 'el resumen de barras incluye la carga total');

  const perdidas = document.getElementById('chart-perdidas-resumen').textContent;
  assert.match(perdidas, /h_f \(fricción\) = [\d.,]+ m/);
  assert.match(perdidas, /h_m \(accesorios\) = [\d.,]+ m/);

  const tablaComponentes = document.getElementById('comp-H1').textContent;
  assert.notEqual(tablaComponentes, '—', 'la tabla de componentes comparte los mismos datos de la gráfica');
  const hTabla = Number(tablaComponentes.replace(',', '.'));
  const hResumen = Number(barras.match(/H=([\d.,]+)\./)[1].replace(',', '.'));
  assert.ok(Math.abs(hTabla - hResumen) < 0.01, 'la tabla y el resumen deben mostrar el mismo H₁');
});

test('responsive: reglas móviles, una sola columna y objetivos táctiles ampliados', () => {
  const media = css.match(/@media\s*\(max-width:\s*640px\)\s*{([\s\S]*?)\n}/);
  assert.ok(media, 'debe existir una media query móvil');
  assert.match(media[1], /font-size:\s*16px/, 'los campos deben medir 16px en móvil (evita el zoom automático)');
  assert.match(media[1], /min-height:\s*2\.5rem/, 'los campos deben ampliarse a 40px en móvil');

  assert.match(html, /grid grid-cols-1 gap-4 lg:grid-cols-2/, 'el tablero parte de una columna en móvil');
  assert.match(html, /grid-cols-1 gap-3 p-4 sm:grid-cols-2/, 'los rejillados internos parten de una columna');

  for (const id of ['btn-calcular', 'btn-ejemplo', 'btn-restablecer']) {
    const boton = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0] ?? '';
    assert.match(boton, /py-2/, `${id} necesita más altura táctil en móvil`);
    assert.match(boton, /sm:py-1\.5/, `${id} conserva la densidad en escritorio`);
  }

  const { document } = parseDocument();
  const tablas = [...document.querySelectorAll('.overflow-x-auto')];
  assert.ok(tablas.length >= 3, 'las tablas anchas deben desplazarse dentro de su contenedor');
  for (const tabla of tablas) {
    assert.ok(tabla.contains(tabla.querySelector('table')), 'cada región de scroll debe envolver una tabla');
  }
});
