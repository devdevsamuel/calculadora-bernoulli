export function setupTabs() {
  const tabs = [...document.querySelectorAll('.tab-btn')];
  const panels = {
    'panel-calculadora': document.getElementById('panel-calculadora'),
    'panel-guia': document.getElementById('panel-guia'),
  };

  const select = (tab, { focus = true } = {}) => {
    tabs.forEach((t) => {
      const seleccionada = t === tab;
      t.setAttribute('aria-selected', String(seleccionada));
      t.tabIndex = seleccionada ? 0 : -1;
    });
    for (const [id, panel] of Object.entries(panels)) {
      if (panel) panel.hidden = id !== tab.dataset.panel;
    }
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab, { focus: false }));
    tab.addEventListener('keydown', (ev) => {
      let next = null;
      if (ev.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      else if (ev.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (ev.key === 'Home') next = tabs[0];
      else if (ev.key === 'End') next = tabs[tabs.length - 1];
      if (!next) return;
      ev.preventDefault();
      select(next);
    });
  });

  const inicial = tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0];
  if (inicial) select(inicial, { focus: false });
}
