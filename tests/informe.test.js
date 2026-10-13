import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function montar() {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html
    .replace(/^[\s\S]*?<html[^>]*>/, '')
    .replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  window.__impresos = 0;
  window.print = () => {
    window.__impresos += 1;
    window.dispatchEvent(new window.Event('beforeprint'));
  };
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';

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

function textoInforme(document) {
  return `${document.getElementById('informe-meta').textContent} ${document.getElementById('informe-contenido').textContent}`;
}

test('informe: ejemplo válido genera las seis secciones y gráficas reales sin imprimir aún', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { initInforme } = await import('../src/ui/report.js');
  initCalculator();
  initInforme();

  document.getElementById('btn-ejemplo').click();
  document.getElementById('btn-informe').click();
  await new Promise((r) => setTimeout(r, 50));

  const bloque = document.getElementById('informe');
  assert.equal(bloque.hidden, false, 'el informe se muestra al generarlo');
  assert.equal(window.__impresos, 0, 'generar el informe NO dispara window.print()');
  assert.ok(document.getElementById('informe-aviso').hidden, 'no queda ningún aviso de bloqueo');

  const meta = document.getElementById('informe-meta').textContent;
  assert.match(meta, /Generado:/, 'incluye la fecha de generación');
  assert.match(meta, /Incógnita:\s*Presión P2/, 'incluye la incógnita seleccionada');

  const texto = textoInforme(document);
  assert.match(texto, /Cálculo válido/, 'declara el cálculo como válido');
  assert.match(texto, /Datos del ejercicio/);
  assert.match(texto, /Procedimiento matemático/);
  assert.match(texto, /Resultados/);
  assert.match(texto, /Gráficas hidráulicas/);
  assert.match(texto, /Comprobación del balance de energía/);
  assert.match(texto, /Observaciones/);

  assert.match(texto, /Ecuación|ecuación/, 'incluye la ecuación original');
  assert.match(texto, /Despeje simbólico/);
  assert.match(texto, /Conversiones de unidades/);
  assert.match(texto, /Sustitución numérica/);
  assert.match(texto, /106,6/, 'incluye el valor del resultado con formato local');
  assert.match(texto, /kPa/);
  assert.match(texto, /forma cerrada/, 'declara el método real de solución');
  assert.match(texto, /Swamee-Jain/, 'incluye el método del factor de fricción');
  assert.match(texto, /h_f \(fricción\)|h_f \(pérdida mayor/, 'incluye la pérdida por fricción');
  assert.match(texto, /Balance verificado/, 'la comprobación queda verificada');
  assert.match(texto, /Criterio: \|H_izq/, 'incluye el criterio de tolerancia');
  assert.match(texto, /Hipótesis del modelo/, 'incluye las limitaciones del modelo');

  const imagenes = [...document.querySelectorAll('#informe-contenido img')];
  assert.equal(imagenes.length, 3, 'las tres gráficas reales se insertan como imágenes');
  for (const img of imagenes) {
    assert.match(img.getAttribute('src'), /^data:image\/png/, 'la imagen proviene del lienzo real');
    assert.ok(img.getAttribute('alt').length > 10, 'la imagen tiene descripción textual');
  }

  document.getElementById('btn-informe-imprimir').click();
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(window.__impresos >= 1, 'window.print() se invoca al pulsar «Imprimir / Guardar PDF»');
  assert.match(document.querySelector('#informe-contenido').innerHTML, /Criterio/, 'contenido insertado');

  document.getElementById('btn-informe-cerrar').click();
  assert.equal(document.getElementById('informe').hidden, true, 'cerrar vuelve a ocultar el informe');
});

test('informe: pérdidas ingresadas manualmente se declaran y no se inventa la composición', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { initInforme } = await import('../src/ui/report.js');
  initCalculator();
  initInforme();

  document.getElementById('btn-ejemplo').click();
  const radio = document.getElementById('modo-ingresadas');
  radio.checked = true;
  radio.dispatchEvent(new window.Event('change', { bubbles: true }));
  const hL = document.getElementById('inp-hL');
  hL.value = '3,2';
  hL.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  document.getElementById('btn-informe').click();
  await new Promise((r) => setTimeout(r, 50));

  const texto = textoInforme(document);
  assert.match(texto, /Pérdidas ingresadas por el usuario/, 'declara el modo manual de pérdidas');
  assert.match(texto, /3,2/, 'muestra el h_L ingresado');
  assert.match(texto, /sin gráfica en este cálculo/, 'la composición vacía se explica en lugar de inventarse');

  const imagenes = [...document.querySelectorAll('#informe-contenido img')];
  assert.equal(imagenes.length, 2, 'solo se insertan las gráficas con datos reales (perfil y barras)');
  assert.equal(window.__impresos, 0, 'generar no imprime; la impresión requiere el botón dedicado');
});

test('informe: sin solución o con datos faltantes no se genera el informe ni se imprime', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { initInforme } = await import('../src/ui/report.js');
  initCalculator();
  initInforme();

  document.getElementById('btn-informe').click();
  await new Promise((r) => setTimeout(r, 50));

  const bloque = document.getElementById('informe');
  assert.equal(bloque.hidden, true, 'el informe permanece oculto sin solución válida');
  const aviso = document.getElementById('informe-aviso');
  assert.equal(aviso.hidden, false, 'se muestra el aviso de bloqueo');
  const textoAviso = aviso.textContent;
  assert.match(textoAviso, /No se generó el informe/, 'explica que no se generó');
  assert.match(textoAviso, /Falta:/, 'enumera los datos faltantes');
  assert.equal(document.querySelectorAll('#informe-contenido img').length, 0);
  assert.equal(window.__impresos, 0, 'no se dispara la impresión del navegador');

  document.getElementById('btn-informe-imprimir').click();
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(window.__impresos, 0, 'imprimir también se bloquea sin cálculo válido');
  assert.equal(bloque.hidden, true);
});

test('informe: el bloque se puede minimizar y volver a desplegar', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { initInforme } = await import('../src/ui/report.js');
  initCalculator();
  initInforme();

  document.getElementById('btn-ejemplo').click();
  document.getElementById('btn-informe').click();
  await new Promise((r) => setTimeout(r, 50));

  const bloque = document.getElementById('informe');
  const boton = document.getElementById('btn-informe-minimizar');
  const cuerpo = document.getElementById('informe-cuerpo');
  assert.ok(boton, 'el botón de minimizar existe');
  assert.equal(boton.getAttribute('aria-expanded'), 'true', 'arranca desplegado');
  assert.ok(bloque.contains(cuerpo), 'el cuerpo del informe está dentro del bloque');

  boton.click();
  assert.ok(bloque.classList.contains('informe-minimizado'), 'la clase de minimizado se aplica');
  assert.equal(boton.getAttribute('aria-expanded'), 'false');
  assert.match(boton.textContent, /Desplegar/);

  boton.click();
  assert.ok(!bloque.classList.contains('informe-minimizado'), 'la clase se retira al desplegar');
  assert.equal(boton.getAttribute('aria-expanded'), 'true');
  assert.match(boton.textContent, /Minimizar/);
});

test('informe: generar en modo oscuro restaura el tema y solo imprime al pulsar el botón de impresión', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { initTheme } = await import('../src/ui/theme.js');
  const { initInforme } = await import('../src/ui/report.js');
  initTheme({ onToggle: () => {} });
  initCalculator();
  initInforme();

  document.getElementById('btn-tema').click();
  assert.ok(document.documentElement.classList.contains('dark'), 'previa: modo oscuro activo');
  document.getElementById('btn-ejemplo').click();
  document.getElementById('btn-informe').click();
  await new Promise((r) => setTimeout(r, 50));

  assert.ok(
    document.documentElement.classList.contains('dark'),
    'la generación restaura el modo oscuro tras capturar las gráficas en paleta clara',
  );
  assert.match(textoInforme(document), /Cálculo válido/);
  assert.equal(document.querySelectorAll('#informe-contenido img').length, 3);
  assert.equal(window.__impresos, 0, 'generar en oscuro no dispara la impresión');

  document.getElementById('btn-informe-imprimir').click();
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(window.__impresos >= 1, 'el botón de impresión sí invoca window.print()');
  assert.ok(document.documentElement.classList.contains('dark'), 'el tema oscuro se conserva tras imprimir');
});

test('informe: CSS de impresión oculta navegación/formularios y protege cortes', () => {
  const css = readFileSync(join(root, 'src/style.css'), 'utf8');
  assert.match(css, /@media print/, 'existe la hoja de impresión');
  const bloquePrint = css.slice(css.indexOf('@media print'));

  for (const referencia of ['body > a', 'body > header', 'body > footer', '#panel-calculadora', '#panel-guia', '.no-imprimir']) {
    assert.ok(bloquePrint.includes(referencia), `impresión debe ocultar ${referencia}`);
  }
  assert.match(bloquePrint, /@page/, 'define márgenes de página');
  assert.match(bloquePrint, /break-inside:\s*avoid/, 'evita cortes dentro de tablas y figuras');
  assert.match(bloquePrint, /table-header-group/, 'repite cabeceras de tabla al paginar');
  assert.match(bloquePrint, /break-after:\s*avoid/, 'evita títulos huérfanos');
  assert.ok(
    !/#informe\s*\{[^}]*display/.test(bloquePrint),
    'el informe no se fuerza con display: depende de su estado hidden',
  );
  assert.match(
    bloquePrint,
    /#informe\.informe-minimizado #informe-cuerpo\s*{\s*display:\s*block/,
    'al imprimir se fuerza el contenido aunque esté minimizado en pantalla',
  );

  assert.match(css, /\.informe-hoja\s*\{[^}]*background:\s*#ffffff/, 'la hoja del informe es siempre clara (papel)');
  assert.match(css, /#informe\.informe-minimizado #informe-cuerpo\s*{\s*display:\s*none/, 'en pantalla el informe minimizado oculta el cuerpo');
});

test('informe: botón integrado, informe fuera de los paneles y estado inicial oculto', async () => {
  montar();
  const { initCalculator } = await import('../src/ui/calculator.js');
  const { initInforme } = await import('../src/ui/report.js');
  initCalculator();
  initInforme();

  const boton = document.getElementById('btn-informe');
  assert.ok(boton, 'el botón existe en la interfaz');
  assert.equal(boton.textContent.trim(), 'Generar informe', 'el botón principal solo genera, no imprime');
  assert.ok(boton.closest('.franja-resultado'), 'el botón vive en la franja de resultado');

  const bloque = document.getElementById('informe');
  assert.equal(bloque.hidden, true, 'arranca oculto');
  assert.ok(bloque.closest('main'), 'el informe está dentro de main');
  assert.equal(bloque.closest('#panel-calculadora'), null, 'no depende de la pestaña activa');
  assert.equal(bloque.closest('#panel-guia'), null);
  assert.equal(document.getElementById('informe-titulo').tagName, 'H2', 'el título del informe es un h2');
  assert.ok(document.getElementById('btn-informe-imprimir').classList.contains('no-imprimir') ||
    document.querySelector('.no-imprimir #btn-informe-imprimir'), 'los botones del informe se ocultan al imprimir');
  const minimizar = document.getElementById('btn-informe-minimizar');
  assert.ok(minimizar, 'el botón de minimizar existe');
  assert.equal(minimizar.getAttribute('aria-controls'), 'informe-cuerpo', 'el control apunta al cuerpo del informe');
});
