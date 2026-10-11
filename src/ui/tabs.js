export function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = {
    'panel-calculadora': document.getElementById('panel-calculadora'),
    'panel-guia': document.getElementById('panel-guia'),
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      for (const [id, panel] of Object.entries(panels)) {
        panel.hidden = id !== tab.dataset.panel;
      }
    });
    tab.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      const list = [...tabs];
      const i = list.indexOf(tab);
      const next = ev.key === 'ArrowRight'
        ? list[(i + 1) % list.length]
        : list[(i - 1 + list.length) % list.length];
      next.focus();
      next.click();
      ev.preventDefault();
    });
  });
}
