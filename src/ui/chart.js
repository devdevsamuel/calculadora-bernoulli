import Chart from 'chart.js/auto';

let perfilChart = null;
let barrasChart = null;
let perdidasChart = null;

const COLOR_Z = '#64748b';
const COLOR_HGL = '#ec4899';
const COLOR_EGL = '#7c3aed';
const COLOR_GRID = 'rgba(190, 24, 93, 0.12)';
const COLOR_TEXTO = '#334155';

function baseOptions(titulo) {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
  return {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: mobile ? 1.15 : 2,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: COLOR_TEXTO, boxWidth: 28, font: { size: 12 } },
      },
      title: {
        display: true,
        text: titulo,
        color: COLOR_TEXTO,
        font: { size: 13, weight: '600' },
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const v = ctx.parsed.y ?? ctx.parsed;
            return ` ${ctx.dataset.label}: ${Number(v).toFixed(4)} m`;
          },
        },
      },
    },
    scales: {
      y: {
        title: { display: true, text: 'Carga (m)', color: COLOR_TEXTO },
        grid: { color: COLOR_GRID },
        ticks: { color: COLOR_TEXTO },
      },
      x: {
        title: { display: true, text: 'Posición', color: COLOR_TEXTO },
        grid: { color: COLOR_GRID },
        ticks: { color: COLOR_TEXTO },
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
    vacio.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  vacio.style.display = 'none';

  const mkData = (label, data, color, borderDash) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderDash: borderDash ?? [],
    borderWidth: 2,
    pointRadius: 5,
    pointHoverRadius: 6,
    tension: 0,
    fill: false,
  });

  let config;
  if (xIsLinear) {
    config = {
      type: 'line',
      data: {
        datasets: [
          mkData('Cota geométrica z', labels.map((x, i) => ({ x, y: z[i] })), COLOR_Z),
          mkData('Línea piezométrica (HGL)', labels.map((x, i) => ({ x, y: hgl[i] })), COLOR_HGL, [8, 4]),
          mkData('Línea de energía (EGL)', labels.map((x, i) => ({ x, y: egl[i] })), COLOR_EGL, [2, 3]),
        ],
      },
      options: {
        ...baseOptions('Perfil de cargas en los dos puntos (m)'),
        parsing: false,
      },
    };
  } else {
    config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          mkData('Cota geométrica z', z, COLOR_Z),
          mkData('Línea piezométrica (HGL)', hgl, COLOR_HGL, [8, 4]),
          mkData('Línea de energía (EGL)', egl, COLOR_EGL, [2, 3]),
        ],
      },
      options: baseOptions('Perfil de cargas en los dos puntos (m)'),
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
    vacio.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  vacio.style.display = 'none';

  const options = baseOptions('Componentes de energía por punto (m)');
  options.scales.y.beginAtZero = true;
  barrasChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Punto 1', 'Punto 2'],
      datasets: [
        { label: 'Cota z', data: z, backgroundColor: '#f9a8d4' },
        { label: 'Carga de presión P/γ', data: hP, backgroundColor: '#c4b5fd' },
        { label: 'Carga de velocidad αV²/2g', data: hV, backgroundColor: '#bae6fd' },
        { label: 'Carga total H', data: H, backgroundColor: '#bbf7d0' },
      ],
    },
    options,
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
    vacio.style.display = 'block';
    return;
  }
  canvas.style.display = 'block';
  vacio.style.display = 'none';

  const mobile = typeof window !== 'undefined' && window.innerWidth < 640;
  perdidasChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Pérdida total h_L'],
      datasets: [
        {
          label: 'Pérdida mayor h_f (fricción)',
          data: [hf],
          backgroundColor: '#ec4899',
          stack: 'perdidas',
        },
        {
          label: 'Pérdida menor h_m (accesorios)',
          data: [hm],
          backgroundColor: '#c4b5fd',
          stack: 'perdidas',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: mobile ? 1.3 : 2.4,
      plugins: {
        legend: { position: 'top', labels: { color: COLOR_TEXTO, boxWidth: 28, font: { size: 12 } } },
        title: {
          display: true,
          text: 'h_f (fricción) + h_m (accesorios) = h_L',
          color: COLOR_TEXTO,
          font: { size: 13, weight: '600' },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(4)} m`;
            },
            footer(items) {
              const total = items.reduce((s, it) => s + Number(it.parsed.y ?? 0), 0);
              return `Total h_L: ${total.toFixed(4)} m`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: COLOR_GRID },
          ticks: { color: COLOR_TEXTO },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: { display: true, text: 'Carga perdida (m)', color: COLOR_TEXTO },
          grid: { color: COLOR_GRID },
          ticks: { color: COLOR_TEXTO },
        },
      },
    },
  });
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
