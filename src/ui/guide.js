export function renderGuide(root) {
  root.innerHTML = `
    <section class="rounded-md border border-rosa-borde bg-white shadow-sm">
      <h2 class="rounded-t-md bg-rosa-primario px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
        Ecuación general de energía y convención de signos
      </h2>
      <div class="space-y-3 p-4 text-sm">
        <p class="font-mono">z₁ + P₁/γ + α₁·V₁²/(2g) + H_B = z₂ + P₂/γ + α₂·V₂²/(2g) + H_T + h_L</p>
        <ul class="list-disc space-y-1 pl-5">
          <li><strong>H_B</strong> (bomba) es carga <em>añadida</em>: aparece en el lado izquierdo (junto al punto 1).</li>
          <li><strong>H_T</strong> (turbina) es carga <em>extraída</em>: aparece en el lado derecho.</li>
          <li><strong>h_L</strong> son las pérdidas entre los puntos: siempre en el lado derecho.</li>
          <li>La carga total en cada punto es <span class="font-mono">H = z + P/γ + α·V²/(2g)</span>, y la comprobación es <span class="font-mono">H₁ + H_B = H₂ + H_T + h_L</span>.</li>
          <li>La bomba <em>entrega</em> energía al fluido; la turbina y las pérdidas la <em>extraen</em>. Todas las cargas se expresan en metros del fluido.</li>
        </ul>
      </div>
    </section>

    <section class="rounded-md border border-rosa-borde bg-white shadow-sm">
      <h2 class="rounded-t-md bg-rosa-primario px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
        Símbolos, significado y unidades
      </h2>
      <div class="overflow-x-auto p-4">
        <table class="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr class="border-b border-rosa-borde text-left">
              <th scope="col" class="py-2 pr-2 font-bold">Símbolo</th>
              <th scope="col" class="py-2 px-2 font-bold">Significado</th>
              <th scope="col" class="py-2 pl-2 font-bold">Unidad</th>
            </tr>
          </thead>
          <tbody class="[&>tr]:border-b [&>tr]:border-rosa-borde/50">
            <tr><td class="py-1.5 pr-2 font-mono">z</td><td class="px-2">Cota geométrica del punto</td><td class="pl-2">m</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">P</td><td class="px-2">Presión estática (manométrica o absoluta, de forma coherente)</td><td class="pl-2">Pa, kPa, bar, m.c.a., psi</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">γ = ρg</td><td class="px-2">Peso específico del fluido</td><td class="pl-2">N/m³</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">V</td><td class="px-2">Velocidad media de la sección</td><td class="pl-2">m/s</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">α</td><td class="px-2">Corrección de la energía cinética (1 en el modo básico)</td><td class="pl-2">adimensional</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">g</td><td class="px-2">Aceleración de la gravedad (9,80665 por defecto)</td><td class="pl-2">m/s²</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">H_B, H_T</td><td class="px-2">Carga de bomba / de turbina</td><td class="pl-2">m</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">h_L, h_f, h_m</td><td class="px-2">Pérdida total / mayor (fricción) / menor (accesorios)</td><td class="pl-2">m</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">Q, D, A</td><td class="px-2">Caudal, diámetro interno y área de la sección</td><td class="pl-2">m³/s, m, m²</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">f</td><td class="px-2">Factor de fricción de <strong>Darcy</strong> (no Fanning)</td><td class="pl-2">adimensional</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">ε, ΣK</td><td class="px-2">Rugosidad absoluta y suma de coeficientes de pérdidas menores</td><td class="pl-2">m, adimensional</td></tr>
            <tr><td class="py-1.5 pr-2 font-mono">Re, ν</td><td class="px-2">Número de Reynolds y viscosidad cinemática</td><td class="pl-2">adimensional, m²/s</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="rounded-md border border-rosa-borde bg-white shadow-sm">
      <h2 class="rounded-t-md bg-rosa-primario px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
        Relaciones auxiliares utilizadas
      </h2>
      <div class="grid gap-2 p-4 font-mono text-sm sm:grid-cols-2">
        <p>A = π·D²/4 (tubería circular llena)</p>
        <p>Q = V·A → V = 4Q/(π·D²)</p>
        <p>D = √(4Q/(π·V))</p>
        <p>Carga de presión = P/γ</p>
        <p>Carga de velocidad = α·V²/(2g)</p>
        <p>Re = V·D/ν</p>
        <p>h_f = f·(L/D)·V²/(2g) &nbsp;(Darcy–Weisbach)</p>
        <p>h_m = ΣK·V²/(2g)</p>
        <p>h_L = h_f + h_m</p>
        <p>Laminar (Re &lt; 2300): f = 64/Re</p>
        <p>Turbulento: Swamee–Jain f = 0,25/[log₁₀(ε/(3,7D) + 5,74/Re^0,9)]²</p>
        <p>Colebrook–White: 1/√f = −2·log₁₀(ε/(3,7D) + 2,51/(Re·√f))</p>
      </div>
    </section>

    <section class="rounded-md border border-rosa-borde bg-white shadow-sm">
      <h2 class="rounded-t-md bg-rosa-primario px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
        Procedimiento para usar la calculadora
      </h2>
      <ol class="list-decimal space-y-1 p-4 pl-8 text-sm">
        <li>Seleccione la incógnita a despejar (por ejemplo, Presión P2).</li>
        <li>Elija el modo de pérdidas: <strong>ingresadas</strong> (usted da h<sub>L</sub> o h<sub>f</sub>+h<sub>m</sub>) o <strong>automático</strong> (L, D, ε, ν, Q/V y ΣK).</li>
        <li>Complete los datos de fluido y de los puntos 1 y 2. Si conoce Q y D, cambie el “método de velocidad” a “calculada desde Q y D”.</li>
        <li>La app convierte las unidades al SI, deriva velocidades/áreas, calcula pérdidas, resuelve el despeje y comprueba el balance.</li>
        <li>Revise la fórmula y la sustitución del panel “Procedimiento”, y el perfil de cargas gráfico.</li>
      </ol>
    </section>

    <section class="rounded-md border border-rosa-borde bg-white shadow-sm">
      <h2 class="rounded-t-md bg-rosa-primario px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
        Advertencias y límites del modelo
      </h2>
      <ul class="list-disc space-y-1 p-4 pl-5 text-sm">
        <li>El fluido por defecto es <strong>agua a 20 °C</strong> (ρ ≈ 998,2 kg/m³, ν ≈ 1,004·10⁻⁶ m²/s). Hay presets de agua a otras temperaturas (4–100 °C, valores de manual, aproximados) y <strong>ρ y ν siempre son editables</strong>: cualquier otro fluido se modela ajustando esas dos propiedades (γ = ρg se recalcula solo).</li>
        <li>Use presión <strong>manométrica en ambos puntos o absoluta en ambos</strong>; no mezcle convenciones.</li>
        <li>Modo básico con α₁ = α₂ = 1: hipótesis de distribución uniforme de la energía cinética (editable en “Datos avanzados”).</li>
        <li>En régimen de <strong>transición</strong> (2300 ≤ Re ≤ 4000) el factor de fricción es incierto: la calculadora lo advierte y no lo presenta como exacto.</li>
        <li>Si faltan datos o la solución no es única o no es física (por ejemplo, radicando negativo), se muestra un mensaje concreto: nunca se devuelve un cero inventado.</li>
        <li>Las velocidades se resuelven con la raíz física no negativa; la dirección requiere análisis aparte.</li>
        <li>La interpolación entre los dos puntos en el perfil es ilustrativa.</li>
        <li>El factor <strong>f es el de Darcy</strong> (el de Fanning sería la mitad).</li>
        <li>Los coeficientes ΣK de accesorios son editables: la app no inventa valores.</li>
      </ul>
    </section>

    <section class="rounded-md border border-rosa-borde bg-white shadow-sm">
      <h2 class="rounded-t-md bg-rosa-primario px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
        Ejemplo de referencia incluido
      </h2>
      <div class="space-y-2 p-4 text-sm">
        <p>Caso de integración del modo automático (botón “Cargar ejemplo”):</p>
        <ul class="list-disc space-y-1 pl-5">
          <li>Punto 1: z₁ = 102 m, P₁ = 150 kPa, V₁ = 1,4324 m/s.</li>
          <li>Punto 2: z₂ = 115 m, Q = 45 L/s, D = 150 mm.</li>
          <li>H_B = 12 m, H_T = 0 m.</li>
          <li>Tubería: L = 88,3 m, ε = 0,0015 mm, ΣK = 1,5, ν = 1,004·10⁻⁶ m²/s, agua ρ ≈ 998,2 kg/m³, g = 9,80665 m/s².</li>
        </ul>
        <p class="text-xs text-texto/70">
          Valores de referencia de las capturas (aproximados): V₂ ≈ 2,5465 m/s, f ≈ 0,013891, h_f ≈ 2,7026 m,
          h_m ≈ 0,4958 m, h_L ≈ 3,1983 m y P₂ ≈ 106,6 kPa. La calculadora los obtiene desde las fórmulas;
          pequeñas diferencias se explican por el redondeo de las cifras publicadas.
        </p>
        <button id="btn-ejemplo-guia" type="button" class="rounded border border-rosa-medio bg-rosa-pale px-3 py-1.5 text-xs font-semibold text-rosa-primario hover:bg-white">
          Cargar el ejemplo en la calculadora
        </button>
      </div>
    </section>
  `;

  const btn = root.querySelector('#btn-ejemplo-guia');
  btn?.addEventListener('click', () => {
    document.getElementById('btn-ejemplo')?.click();
    document.getElementById('tab-calculadora')?.click();
    document.getElementById('btn-calcular')?.focus();
  });
}
