import Chart from 'chart.js/auto';

let perfilChart = null;
let barrasChart = null;
let perdidasChart = null;
let tema = 'light';

const PALETTAS = {
  light: {
    z: '#7a93a8',
    hgl: '#2a8fd8',
    egl: '#15998c',
    grid: 'rgba(86, 184, 255, 0.16)',
    texto: '#162633',
    barras: ['#4a90d9', '#15998c', '#2a8fd8', '#1d9a5f'],
    hf: '#4a90d9',
    hm: '#15998c',
    bandaHgl: '#2a8fd8',
    bandaEgl: '#15998c',
    etiquetaDentro: '#0c1722',
    tooltipBg: 'rgba(255, 255, 255, 0.97)',
    tooltipBorde: 'rgba(200, 220, 234, 1)',
    crosshair: 'rgba(86, 184, 255, 0.5)',
    hoverBorder: 'rgba(255, 255, 255, 1)',
  },
  dark: {
    z: '#a8bbcb',
    hgl: '#8ecfff',
    egl: '#8ce8dc',
    grid: 'rgba(142, 207, 255, 0.14)',
    texto: '#a8bbcb',
    barras: ['#8ecfff', '#8ce8dc', '#56b8ff', '#5cdea1'],
    hf: '#8ecfff',
    hm: '#8ce8dc',
    bandaHgl: '#8ecfff',
    bandaEgl: '#8ce8dc',
    etiquetaDentro: '#0c1722',
    tooltipBg: 'rgba(22, 38, 51, 0.97)',
    tooltipBorde: 'rgba(43, 66, 83, 1)',
    crosshair: 'rgba(142, 207, 255, 0.45)',
    hoverBorder: 'rgba(12, 23, 34, 1)',
  },
};

export function setChartTheme(nuevo) {
  tema = nuevo === 'dark' ? 'dark' : 'light';
}

const P = () => PALETTAS[tema];

export function prefiereReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const n = Number.parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function bandaGradiente(chart, hex) {
  const area = chart.chartArea;
  if (!area) return hexToRgba(hex, 0.15);
  const key = `__grad_${hex}`;
  const sig = `${area.top}_${area.bottom}`;
  if (!chart[key] || chart[key].sig !== sig) {
    const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    g.addColorStop(0, hexToRgba(hex, 0.3));
    g.addColorStop(1, hexToRgba(hex, 0.05));
    chart[key] = { g, sig };
  }
  return chart[key].g;
}

const pluginEtiquetasValor = {
  id: 'etiquetasValor',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = P().texto;
    ctx.textAlign = 'center';
    for (let i = 0; i < chart.data.datasets.length; i += 1) {
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden) continue;
      const esBarras = chart.config.type === 'bar';
      ctx.fillStyle = esBarras ? P().etiquetaDentro : P().texto;
      for (const el of meta.data) {
        const v = el.options?.parsed?.y ?? el.parsed?.y;
        if (v == null || !Number.isFinite(Number(v))) continue;
        const texto = Number(v).toFixed(2);
        if (esBarras) {
          ctx.textBaseline = 'middle';
          ctx.fillText(texto, el.x, (el.y + el.base) / 2);
        } else {
          ctx.textBaseline = 'bottom';
          ctx.fillText(texto, el.x, el.y - 6);
        }
      }
    }
    ctx.restore();
  },
};

const pluginCrosshair = {
  id: 'crosshair',
  afterDraw(chart) {
    const activo = chart.tooltip?._active;
    if (!activo?.length) return;
    const x = activo[0].element?.x;
    if (x == null) return;
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = P().crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

function animacionEntrada({ stagger = false } = {}) {
  if (prefiereReducedMotion()) return false;
  const anim = { duration: 500, easing: 'easeOutQuart' };
  if (stagger) {
    anim.delay = (ctx) => {
      if (ctx.type !== 'data' || ctx.mode !== 'default') return 0;
      return (ctx.dataIndex ?? 0) * 100 + (ctx.datasetIndex ?? 0) * 80;
    };
  }
  return anim;
}

function opcionesTooltip() {
  const p = P();
  return {
    backgroundColor: p.tooltipBg,
    titleColor: p.texto,
    bodyColor: p.texto,
    footerColor: p.texto,
    borderColor: p.tooltipBorde,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    caretSize: 6,
    displayColors: true,
    boxPadding: 4,
    titleFont: { size: 12, weight: '600' },
    bodyFont: { size: 11 },
  };
}

function baseOptions(titulo, { xTitle = 'Posición', animation = undefined } = {}) {
  const p = P();
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    animation: animation ?? animacionEntrada(),
    plugins: {
      legend: {
        position: 'top',
        labels: { color: p.texto, boxWidth: 28, font: { size: 12 } },
      },
      title: {
        display: true,
        text: titulo,
        color: p.texto,
        font: { size: 13, weight: '600' },
      },
      tooltip: opcionesTooltip(),
    },
    scales: {
      y: {
        title: { display: true, text: 'Carga (m)', color: p.texto },
        grid: { color: p.grid },
        ticks: { color: p.texto },
      },
      x: {
        title: { display: true, text: xTitle, color: p.texto },
        grid: { color: p.grid },
        ticks: { color: p.texto },
      },
    },
  };
}

export function updatePerfilChart({ z, hgl, egl, labels, xIsLinear, empty }) {
  const canvas = document.getElementById('chart-perfil');
  const vacio = document.getElementById('chart-perfil-vacio');
  const wrap = document.getElementById('chart-perfil-wrap');
  if (!canvas || !vacio || !wrap) return;

  if (perfilChart) {
    perfilChart.destroy();
    perfilChart = null;
  }

  if (empty || z.some((v) => v == null) || hgl.some((v) => v == null) || egl.some((v) => v == null)) {
    canvas.style.display = 'none';
    vacio.style.display = 'flex';
    return;
  }
  canvas.style.display = 'block';
  vacio.style.display = 'none';

  const p = P();
  const fmtGap = (a, b, i) => `${(a[i] - b[i]).toFixed(4)} m`;

  const mkData = (label, data, color, borderDash, fillTarget, fillColorHex) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: fillColorHex
      ? (ctx) => bandaGradiente(ctx.chart, fillColorHex)
      : color,
    borderDash: borderDash ?? [],
    borderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 8,
    pointHoverBorderWidth: 2,
    pointHoverBorderColor: p.hoverBorder,
    tension: 0,
    fill: fillTarget ?? false,
    order: fillTarget === false ? 3 : fillTarget === 1 ? 1 : 2,
  });

  const options = baseOptions('Perfil de cargas en los dos puntos (m)', {
    xTitle: xIsLinear ? 'Distancia desde el punto 1 (m)' : 'Punto',
  });
  if (!prefiereReducedMotion()) {
    options.animations = {
      radius: { from: 0, duration: 450, easing: 'easeOutCubic' },
    };
  }
  options.plugins.tooltip = {
    ...opcionesTooltip(),
    callbacks: {
      label(ctx) {
        return ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)} m`;
      },
      afterBody(items) {
        const i = items[0]?.dataIndex ?? 0;
        return [
          `HGL − z = ${fmtGap(hgl, z, i)} (carga de presión P/γ)`,
          `EGL − HGL = ${fmtGap(egl, hgl, i)} (carga de velocidad αV²/2g)`,
        ];
      },
    },
  };

  let config;
  if (xIsLinear) {
    config = {
      type: 'line',
      data: {
        datasets: [
          mkData('Cota geométrica z', labels.map((x, i) => ({ x, y: z[i] })), p.z, null, false),
          mkData('Línea piezométrica (HGL)', labels.map((x, i) => ({ x, y: hgl[i] })), p.hgl, [8, 4], 0, p.bandaHgl),
          mkData('Línea de energía (EGL)', labels.map((x, i) => ({ x, y: egl[i] })), p.egl, [2, 3], 1, p.bandaEgl),
        ],
      },
      options: { ...options, parsing: false },
      plugins: [pluginEtiquetasValor, pluginCrosshair],
    };
  } else {
    config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          mkData('Cota geométrica z', z, p.z, null, false),
          mkData('Línea piezométrica (HGL)', hgl, p.hgl, [8, 4], 0, p.bandaHgl),
          mkData('Línea de energía (EGL)', egl, p.egl, [2, 3], 1, p.bandaEgl),
        ],
      },
      options,
      plugins: [pluginEtiquetasValor, pluginCrosshair],
    };
  }
  perfilChart = new Chart(canvas, config);
}

export function updateBarrasChart({ z, hP, hV, H, empty }) {
  const canvas = document.getElementById('chart-barras');
  const vacio = document.getElementById('chart-barras-vacio');
  if (!canvas || !vacio) return;

  if (barrasChart) {
    barrasChart.destroy();
    barrasChart = null;
  }

  if (empty || z.some((v) => v == null) || hP.some((v) => v == null) || hV.some((v) => v == null) || H.some((v) => v == null)) {
    canvas.style.display = 'none';
    vacio.style.display = 'flex';
    return;
  }
  canvas.style.display = 'block';
  vacio.style.display = 'none';

  const p = P();
  const options = baseOptions('Comparación de componentes de energía (m)', {
    xTitle: 'Punto',
    animation: animacionEntrada({ stagger: true }),
  });
  options.scales.y.beginAtZero = true;
  options.plugins.tooltip = {
    ...opcionesTooltip(),
    callbacks: {
      label(ctx) {
        return ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)} m`;
      },
    },
  };
  barrasChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Punto 1', 'Punto 2'],
      datasets: [
        { label: 'Cota z', data: z, backgroundColor: p.barras[0], borderRadius: 6 },
        { label: 'Carga de presión P/γ', data: hP, backgroundColor: p.barras[1], borderRadius: 6 },
        { label: 'Carga de velocidad αV²/2g', data: hV, backgroundColor: p.barras[2], borderRadius: 6 },
        { label: 'Carga total H', data: H, backgroundColor: p.barras[3], borderRadius: 6 },
      ],
    },
    options,
    plugins: [pluginEtiquetasValor],
  });
}

export function updatePerdidasChart({ hf, hm, hL, empty }) {
  const canvas = document.getElementById('chart-perdidas');
  const vacio = document.getElementById('chart-perdidas-vacio');
  if (!canvas || !vacio) return;

  if (perdidasChart) {
    perdidasChart.destroy();
    perdidasChart = null;
  }

  if (empty || hf == null || hm == null || hL == null) {
    canvas.style.display = 'none';
    vacio.style.display = 'flex';
    return;
  }
  canvas.style.display = 'block';
  vacio.style.display = 'none';

  const p = P();
  const options = baseOptions('h_f (fricción) + h_m (accesorios) = h_L', {
    xTitle: 'Pérdidas',
    animation: animacionEntrada({ stagger: true }),
  });
  options.scales.x.stacked = true;
  options.scales.y.stacked = true;
  options.scales.y.beginAtZero = true;
  options.scales.y.title.text = 'Carga perdida (m)';
  options.plugins.tooltip = {
    ...opcionesTooltip(),
    callbacks: {
      label(ctx) {
        return ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)} m`;
      },
      footer(items) {
        const total = items.reduce((s, it) => s + Number(it.parsed.y ?? 0), 0);
        return `Total h_L: ${total.toFixed(4)} m`;
      },
    },
  };
  perdidasChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Pérdida total h_L'],
      datasets: [
        {
          label: 'Pérdida mayor h_f (fricción)',
          data: [hf],
          backgroundColor: p.hf,
          borderRadius: 4,
          stack: 'perdidas',
        },
        {
          label: 'Pérdida menor h_m (accesorios)',
          data: [hm],
          backgroundColor: p.hm,
          borderRadius: 4,
          stack: 'perdidas',
        },
      ],
    },
    options,
    plugins: [pluginEtiquetasValor],
  });
}

export function resizeCharts() {
  for (const chart of [perfilChart, barrasChart, perdidasChart]) {
    if (chart) {
      try {
        chart.resize();
      } catch {
        /* lienzo no disponible */
      }
    }
  }
}

export function destroyCharts() {
  if (perfilChart) {
    perfilChart.destroy();
    perfilChart = null;
  }
  if (barrasChart) {
    barrasChart.destroy();
    barrasChart = null;
  }
  if (perdidasChart) {
    perdidasChart.destroy();
    perdidasChart = null;
  }
}
