import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseEses(value) {
  return Number(String(value).replace(/[^\d,.\-]/g, '').replace(/\./g, '').replace(',', '.'));
}

const esperarResultado = () => new Promise((r) => setTimeout(r, 700));

test('humo de UI: ejemplo de referencia calcula P2 y verifica el balance', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;

  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  const { renderGuide } = await import('../src/ui/guide.js');

  renderGuide(document.getElementById('panel-guia'));
  initCalculator();

  assert.ok(document.getElementById('panel-guia').innerHTML.includes('Ecuación general'), 'la guía debe renderizarse');
  assert.equal(
    document.getElementById('chart-perfil-vacio').style.display,
    'flex',
    'con datos vacíos se muestra el estado vacío del perfil',
  );

  document.getElementById('btn-ejemplo').click();
  await esperarResultado();

  const valor = parseEses(document.getElementById('resultado-valor').textContent);
  assert.ok(Math.abs(valor - 106.69) < 0.2, `P2 mostrada: ${document.getElementById('resultado-valor').textContent}`);
  assert.match(document.getElementById('resultado-unidad').textContent, /kPa/);
  assert.match(document.getElementById('resultado-estado').textContent, /verificado/i);
  assert.match(document.getElementById('comprobacion-estado').textContent, /Balance verificado/);

  const hL = parseEses(document.getElementById('pipe-hL').textContent);
  assert.ok(Math.abs(hL - 3.1983) < 0.01, `h_L mostrado: ${document.getElementById('pipe-hL').textContent}`);

  const regimen = document.getElementById('pipe-regimen').textContent;
  assert.equal(regimen, 'turbulento');

  const procedimiento = document.getElementById('procedimiento-formula').textContent;
  assert.ok(procedimiento.includes('P₂'), 'la fórmula del despeje debe mostrarse');

  const despeje = document.getElementById('procedimiento-despeje').innerHTML;
  assert.ok(despeje.includes('P₂/γ'), 'el despeje simbólico debe aislarse en P₂/γ');
  const conversiones = document.getElementById('procedimiento-conversiones').textContent;
  assert.ok(/kPa|L\/s|mm/.test(conversiones), `las conversiones de la interfaz deben listarse: ${conversiones}`);

  const usados = document.getElementById('valores-usados').innerHTML;
  assert.ok(usados.includes('H_B'), 'los valores usados deben listarse');

  const perfilZ2 = parseEses(document.getElementById('perfil-z2').textContent);
  assert.equal(perfilZ2, 115);

  const resumenPerfil = document.getElementById('chart-perfil-resumen').textContent;
  assert.ok(resumenPerfil.includes('Punto 1') && resumenPerfil.includes('EGL'), `resumen perfil: ${resumenPerfil}`);

  const resumenBarras = document.getElementById('chart-barras-resumen').textContent;
  const mZ1 = resumenBarras.match(/Punto 1 — z=([\d.,]+)/);
  const mH1 = resumenBarras.match(/H=([\d.,]+)\./);
  assert.ok(mZ1 && mH1, `resumen barras: ${resumenBarras}`);
  assert.equal(parseEses(mZ1[1]), 102, 'z₁ del resumen debe ser el valor real');
  assert.ok(Math.abs(parseEses(mH1[1]) - 117.43) < 0.05, `H₁ del resumen: ${mH1[1]}`);

  const resumenPerdidas = document.getElementById('chart-perdidas-resumen').textContent;
  const mHf = resumenPerdidas.match(/h_f \(fricción\) = ([\d.,]+) m/);
  const mHm = resumenPerdidas.match(/h_m \(accesorios\) = ([\d.,]+) m/);
  assert.ok(mHf && mHm, `resumen de pérdidas: ${resumenPerdidas}`);
  assert.ok(Math.abs(parseEses(mHf[1]) - 2.7026) < 0.01, `h_f: ${mHf[1]}`);
  assert.ok(Math.abs(parseEses(mHm[1]) - 0.4958) < 0.005, `h_m: ${mHm[1]}`);
});

test('humo de UI: cambiar la incógnita deshabilita la celda y permite otro despeje', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();
  document.getElementById('btn-ejemplo').click();

  const select = document.getElementById('incognita');
  select.value = 'hL';
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 700));

  const valor = parseEses(document.getElementById('resultado-valor').textContent);
  assert.ok(Math.abs(valor - 3.1983) < 0.01, `h_L mostrado: ${document.getElementById('resultado-valor').textContent}`);
  assert.match(document.getElementById('resultado-estado').textContent, /verificado/i);
  assert.ok(
    document.getElementById('chart-perfil-resumen').textContent.includes('Punto 2'),
    'el perfil debe seguir actualizándose al cambiar la incógnita',
  );
  assert.ok(
    document.getElementById('chart-barras-resumen').textContent.includes('Punto 1'),
    'la comparación de energía debe seguir actualizándose al cambiar la incógnita',
  );
});

test('humo de UI: las pestañas Calculadora/Guía alternan paneles y el botón de la guía carga el ejemplo', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  const { renderGuide } = await import('../src/ui/guide.js');
  const { setupTabs } = await import('../src/ui/tabs.js');

  renderGuide(document.getElementById('panel-guia'));
  setupTabs();
  initCalculator();

  const tabGuia = document.getElementById('tab-guia');
  const tabCalc = document.getElementById('tab-calculadora');
  assert.equal(document.getElementById('panel-guia').hidden, true, 'la guía arranca oculta hasta pulsar su pestaña');
  tabGuia.click();
  assert.equal(tabGuia.getAttribute('aria-selected'), 'true');
  assert.equal(document.getElementById('panel-guia').hidden, false);
  assert.equal(document.getElementById('panel-calculadora').hidden, true);

  document.getElementById('btn-ejemplo-guia').click();
  await esperarResultado();
  assert.equal(document.getElementById('panel-calculadora').hidden, false);
  assert.equal(document.getElementById('panel-guia').hidden, true);
  assert.match(document.getElementById('resultado-estado').textContent, /verificado/i);
  const valor = parseEses(document.getElementById('resultado-valor').textContent);
  assert.ok(Math.abs(valor - 106.69) < 0.2, `P2 tras cargar desde la guía: ${document.getElementById('resultado-valor').textContent}`);

  tabCalc.click();
  assert.equal(tabCalc.getAttribute('aria-selected'), 'true');
});

test('humo de UI: presets de agua rellenan ρ/ν y la edición manual marca Personalizado', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  const sel = document.getElementById('gen-fluido');
  assert.equal(sel.value, 'agua-20', 'el fluido por defecto debe ser agua 20 °C');
  assert.equal(Number(document.getElementById('gen-rho').value), 998.2);
  assert.equal(Number(document.getElementById('gen-nu').value), 1.004e-6);

  sel.value = 'agua-60';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(Number(document.getElementById('gen-rho').value), 983.2);
  assert.equal(Number(document.getElementById('gen-nu').value), 4.75e-7);
  assert.equal(sel.value, 'agua-60');

  const rhoInput = document.getElementById('gen-rho');
  rhoInput.value = '1000';
  rhoInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(sel.value, 'personalizado', 'editar ρ a mano debe marcar Personalizado');

  document.getElementById('btn-restablecer').click();
  assert.equal(sel.value, 'agua-20', 'restablecer vuelve a agua 20 °C');
  assert.equal(Number(rhoInput.value), 998.2);
  assert.equal(Number(document.getElementById('gen-nu').value), 1.004e-6);
});

test('humo de tema: interruptor aplica modo oscuro, persiste y el recálculo conserva resultados', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  const { initTheme, currentTheme } = await import('../src/ui/theme.js');

  initTheme({ onToggle: () => {} });
  initCalculator();
  document.getElementById('btn-ejemplo').click();
  await esperarResultado();
  const antes = document.getElementById('resultado-valor').textContent;
  assert.ok(Math.abs(parseEses(antes) - 106.69) < 0.2, `P2 base: ${antes}`);

  document.getElementById('btn-tema').click();
  assert.ok(document.documentElement.classList.contains('dark'), 'la clase dark debe aplicarse en <html>');
  assert.equal(currentTheme(), 'dark');
  assert.equal(window.localStorage.getItem('bernoulli-theme'), 'dark', 'la preferencia debe persistirse');
  assert.equal(document.getElementById('btn-tema').getAttribute('aria-pressed'), 'true');
  assert.match(document.getElementById('btn-tema-texto').textContent, /Claro/);

  document.getElementById('btn-calcular').click();
  await esperarResultado();
  assert.equal(document.getElementById('resultado-valor').textContent, antes, 'el resultado no cambia con el tema');
  assert.match(document.getElementById('comprobacion-estado').textContent, /Balance verificado/);

  document.getElementById('btn-tema').click();
  assert.ok(!document.documentElement.classList.contains('dark'), 'vuelve al modo claro');
  assert.equal(window.localStorage.getItem('bernoulli-theme'), 'light');
});

test('layout: un valor inválido no añade nodos a la celda ni desordena la tabla', async () => {
  const htmlSrc = readFileSync(join(root, 'index.html'), 'utf8');
  const css = readFileSync(join(root, 'src/style.css'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = htmlSrc
    .replace(/^[\s\S]*?<html[^>]*>/, '')
    .replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  const campo = document.getElementById('p1-z');
  const td = campo.parentElement;
  const hijosAntes = td.children.length;
  campo.value = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  campo.dispatchEvent(new window.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));

  assert.equal(campo.getAttribute('aria-invalid'), 'true', 'el campo queda marcado');
  assert.equal(document.querySelector('.msg-error'), null, 'no se insertan mensajes adyacentes');
  assert.equal(td.children.length, hijosAntes, 'la celda no gana nodos: el contenedor no puede crecer');
  assert.equal(td.querySelectorAll('input').length, 1, 'la celda sigue teniendo solo su input');

  const alerta = document.querySelector('#resultado-alertas [role="alert"]');
  assert.ok(alerta, 'el resumen superior announce el error');
  assert.ok(alerta.textContent.includes('aaaa'), 'el resumen recoge el valor inválido');

  assert.doesNotMatch(css, /\.msg-error\s*{/, 'la clase .msg-error ya no se usa en CSS');
  assert.match(css, /\.tabla-limpia tbody td\s*{[^}]*vertical-align:\s*top/s, 'las celdas de la tabla se alinean arriba');
  assert.match(css, /\.estado-error,\s*#pipe-warn,\s*#resultado-alertas li\s*{[^}]*overflow-wrap:\s*anywhere/s, 'el resumen de alertas parte textos largos');
  assert.match(htmlSrc, /id="resultado-alertas"[^>]*min-h-11/, 'la zona de alertas reserva altura estable');
  assert.match(htmlSrc, /id="resultado-alertas"[^>]*max-h-44/, 'la zona de alertas limita su altura con scroll');
  assert.match(htmlSrc, /id="resultado-alertas"[^>]*tabindex="0"/, 'la región con scroll es accesible por teclado');
  assert.match(css, /\.lista-alertas\s*{/, 'la lista interna de avisos tiene estilo propio para el scroll');
  assert.match(htmlSrc, /id="chart-perdidas-wrap"[^>]*h-64[^>]*sm:h-80/s, 'la gráfica de pérdidas usa el mismo tamaño que las demás');
});

test('accesorios: K admite decimales con coma o punto y ΣK usa n·K', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  document.getElementById('btn-agregar-accesorio').click();
  const kInput = document.querySelector('#accesorios-lista [data-campo="K"]');
  const nInput = document.querySelector('#accesorios-lista [data-campo="n"]');
  assert.ok(kInput && nInput, 'los campos n y K existen');
  assert.equal(kInput.getAttribute('inputmode'), 'decimal', 'K usa inputmode decimal');
  assert.equal(kInput.type, 'text', 'K es texto para aceptar coma o punto');

  nInput.value = '2';
  nInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  kInput.value = '0,5';
  kInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(kInput.getAttribute('aria-invalid'), null, 'la coma no marca inválido');
  const sumK = document.getElementById('pipe-sumK').value;
  assert.equal(Number(String(sumK).replace(',', '.')), 1, `ΣK con coma = 1 (recibido ${sumK})`);

  kInput.value = '0.25';
  kInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(Number(String(document.getElementById('pipe-sumK').value).replace(',', '.')), 0.5, 'punto decimal también');

  kInput.value = 'abc';
  kInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(kInput.getAttribute('aria-invalid'), 'true', 'texto no numérico marca inválido');
  assert.equal(Number(String(document.getElementById('pipe-sumK').value).replace(',', '.')), 0.5, 'ΣK no se corrompe con texto inválido');
});

test('incógnita: al recalcular sin solución se borra la celda calculada', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  document.getElementById('btn-ejemplo').click();
  await esperarResultado();
  const celda = document.getElementById('p2-P');
  assert.ok(celda.value !== '' && celda.value !== '—', `la celda P2 se rellena: ${celda.value}`);
  assert.ok(Math.abs(parseEses(document.getElementById('resultado-valor').textContent) - 106.69) < 0.2);

  const q2 = document.getElementById('p2-Q');
  q2.value = '';
  q2.dispatchEvent(new window.Event('input', { bubbles: true }));
  await esperarResultado();

  assert.equal(celda.value, '', 'la celda de la incógnita se vacía al perder la solución');
  assert.equal(document.getElementById('resultado-valor').textContent, '—', 'el banner no conserva el número viejo');
  assert.match(document.getElementById('resultado-estado').textContent, /Faltan datos|Sin solución|Datos inválidos/i);

  document.getElementById('btn-ejemplo').click();
  await esperarResultado();
  assert.ok(celda.value !== '', 'vuelve a calcularse al cargar el ejemplo');
  const z2 = document.getElementById('p2-z');
  z2.value = 'aaaa';
  z2.dispatchEvent(new window.Event('input', { bubbles: true }));
  await esperarResultado();
  assert.equal(celda.value, '', 'con error de campo también se borra la celda de la incógnita');
  assert.equal(document.getElementById('resultado-valor').textContent, '—', 'con error de campo el banner queda limpio');
  assert.equal(
    document.getElementById('comprobacion-estado').textContent.trim(),
    '—',
    'la comprobación no conserva un balance de un cálculo ya inválido',
  );
});

test('modo ingresadas con panel de tubería completo calcula f de referencia y explica el modo', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  const set = (id, v) => {
    const el = document.getElementById(id);
    el.value = v;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  };

  assert.equal(
    document.querySelector('input[name="modo-perdidas"]:checked').value,
    'ingresadas',
    'el modo por defecto es «ingresadas»',
  );
  set('pipe-L', '88.3');
  set('pipe-D', '150');
  set('pipe-eps', '0.0015');
  set('pipe-Q', '45');
  set('pipe-sumK', '1.5');
  set('p1-z', '102');
  set('p1-P', '150');
  set('p1-V', '1.4324');
  set('p2-z', '115');
  await esperarResultado();

  const f = document.getElementById('pipe-f').textContent;
  assert.notEqual(f, '—', 'el factor de fricción de referencia debe calcularse');
  assert.match(f, /Swamee-Jain/, `método visible en: ${f}`);
  assert.match(f, /0,013/, `valor de referencia ~0,0139 en: ${f}`);
  assert.match(document.getElementById('pipe-Re').textContent, /380/, 'Reynolds también visible');
  assert.equal(document.getElementById('pipe-regimen').textContent, 'turbulento');

  const warn = document.getElementById('pipe-warn').textContent;
  assert.match(warn, /«ingresadas»/, 'el aviso nombra el modo activo');
  assert.match(warn, /Cálculo automático/, 'el aviso indica cómo activar el balance automático');

  assert.equal(document.getElementById('pipe-hf').textContent, '—', 'h_f no se suma en modo ingresadas');
  assert.equal(document.getElementById('pipe-hm').textContent, '—', 'h_m no se suma en modo ingresadas');

  const auto = document.getElementById('modo-automaticas');
  auto.checked = true;
  auto.dispatchEvent(new window.Event('change', { bubbles: true }));
  await esperarResultado();
  const fAuto = document.getElementById('pipe-f').textContent;
  assert.match(fAuto, /Swamee-Jain/, 'en modo automático f sigue calculándose');
  assert.match(document.getElementById('pipe-hf').textContent, /m$/, 'en modo automático h_f se descompone');
  assert.match(document.getElementById('pipe-warn').textContent, /—/, 'en modo automático sin advertencias se muestra «—»');
});

test('auditoría: aviso de continuidad Q/V inconsistente y conflicto con el caudal del panel', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { initCalculator } = await import('../src/ui/calculator.js');
  initCalculator();

  const set = (id, v) => {
    const el = document.getElementById(id);
    el.value = v;
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
    el.dispatchEvent(new window.Event('change', { bubbles: true }));
  };

  const aviso = document.getElementById('puntos-aviso');
  assert.ok(aviso.classList.contains('hidden'), 'sin inconsistencias el aviso arranca oculto');

  set('p1-z', '10');
  set('p1-P', '0');
  set('p1-V', '3.437');
  set('p1-Q', '50');
  set('p1-D', '100');
  await esperarResultado();

  assert.ok(!aviso.classList.contains('hidden'), 'Q=50 L/s con V=3,437 y D=100 mm muestra el aviso de continuidad');
  assert.match(aviso.textContent, /Punto 1/, 'nombra el punto afectado');
  assert.match(aviso.textContent, /no cumplen Q = V·A/, 'explica el conflicto de continuidad');
  assert.match(aviso.textContent, /6,3/, 'indica la velocidad esperada (≈6,37 m/s)');

  set('p1-V', '6.3662');
  await esperarResultado();
  assert.ok(aviso.classList.contains('hidden'), 'al corregir V el aviso desaparece');

  document.getElementById('modo-automaticas').checked = true;
  document.getElementById('modo-automaticas').dispatchEvent(new window.Event('change', { bubbles: true }));
  document.getElementById('incognita').value = 'Q2';
  document.getElementById('incognita').dispatchEvent(new window.Event('change', { bubbles: true }));
  set('pipe-L', '30');
  set('pipe-eps', '0.15');
  set('pipe-Q', '45');
  set('pipe-sumK', '5.65');
  set('p2-z', '0');
  set('p2-P', '0');
  set('p2-D', '100');
  await esperarResultado();

  const warn = document.getElementById('pipe-warn').textContent;
  assert.match(warn, /caudal del panel de tubería/, 'adviete del conflicto entre el caudal del panel y la incógnita');
  assert.match(warn, /acoplar/, 'indica cómo resolverlo (vaciar el campo)');
});

test('guía: documenta superficies libres, ΣK sin salida y ν por enunciado', async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const window = new Window({ url: 'http://localhost/' });
  const document = window.document;
  document.documentElement.innerHTML = html.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<\/html>[\s\S]*$/, '');
  window.innerWidth = 1280;
  globalThis.window = window;
  globalThis.document = document;
  globalThis.HTMLElement = window.HTMLElement;
  globalThis.HTMLCanvasElement = window.HTMLCanvasElement;
  globalThis.Node = window.Node;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

  const { renderGuide } = await import('../src/ui/guide.js');
  const root2 = document.getElementById('panel-guia');
  renderGuide(root2);
  const texto = root2.textContent;
  assert.match(texto, /superficie libre/i, 'explica modelar superficies libres con V = 0');
  assert.match(texto, /excluya la pérdida por salida/, 'documenta la convención de la pérdida de salida en ΣK');
  assert.match(texto, /1×10⁻⁴/, 'recuerda ajustar ν según el enunciado');
  assert.match(texto, /vacío/, 'aconseja dejar vacío el caudal del panel si Q es incógnita');
});
