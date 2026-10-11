import './style.css';
import { initCalculator, refreshView } from './ui/calculator.js';
import { renderGuide } from './ui/guide.js';
import { setupTabs } from './ui/tabs.js';
import { initTheme } from './ui/theme.js';
import { resizeCharts } from './ui/chart.js';

renderGuide(document.getElementById('panel-guia'));
setupTabs();
document.getElementById('tab-calculadora')?.addEventListener('click', () => {
  setTimeout(() => resizeCharts(), 0);
});
initTheme({ onToggle: () => refreshView() });
initCalculator();
