import './style.css';
import { initCalculator } from './ui/calculator.js';
import { renderGuide } from './ui/guide.js';
import { setupTabs } from './ui/tabs.js';

renderGuide(document.getElementById('panel-guia'));
setupTabs();
initCalculator();
