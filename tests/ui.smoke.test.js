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

  document.getElementById('btn-ejemplo').click();

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

  const usados = document.getElementById('valores-usados').innerHTML;
  assert.ok(usados.includes('H_B'), 'los valores usados deben listarse');

  const perfilZ2 = parseEses(document.getElementById('perfil-z2').textContent);
  assert.equal(perfilZ2, 115);

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
  await new Promise((r) => setTimeout(r, 400));

  const valor = parseEses(document.getElementById('resultado-valor').textContent);
  assert.ok(Math.abs(valor - 3.1983) < 0.01, `h_L mostrado: ${document.getElementById('resultado-valor').textContent}`);
  assert.match(document.getElementById('resultado-estado').textContent, /verificado/i);
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
