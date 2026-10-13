# AGENTS.md — Calculadora de Bernoulli

> **Contexto:** la aplicación ya está construida. Este archivo orienta el mantenimiento, la corrección de errores y las mejoras solicitadas; **no es una especificación para volver a construir la aplicación desde cero**.

## 1. Regla principal: mantener lo existente

- Antes de actuar, inspecciona el código y el estado real del proyecto. No deduzcas que una función falta porque este archivo la describa.
- Conserva la estructura, los componentes, los estilos y los flujos que ya funcionan. Evita reescrituras, migraciones o refactorizaciones amplias si no son necesarias para la petición.
- No construyas ni reconstruyas automáticamente la gráfica hidráulica, la pestaña **Guía**, la interfaz, el modo oscuro ni otras funciones ya existentes. Solo modifícalos cuando la solicitud concreta del usuario lo requiera o cuando sean necesarios para corregir un defecto relacionado.
- No añadas funciones, archivos, dependencias, pantallas, pruebas o documentación por iniciativa propia si no aportan a la solicitud actual.
- Si la solicitud es puntual, haz el cambio mínimo que la resuelva. No conviertas una corrección en una nueva implementación general.
- Si algo parece faltar, estar incompleto o contradecir este documento, verifica primero el código y las pruebas. Informa la discrepancia antes de hacer cambios grandes.
- No sobrescribas trabajo del usuario ni elimines comportamiento existente sin autorización. Si una modificación amplia parece necesaria, explica por qué y solicita confirmación.

## 2. Flujo de trabajo para cada solicitud

1. Interpreta la petición actual y determina qué comportamiento debe cambiar.
2. Localiza los archivos y funciones implicados; revisa sus dependencias y el comportamiento relacionado.
3. Comprueba si existe una función equivalente antes de crear otra.
4. Formula un plan breve y limitado al alcance solicitado.
5. Realiza el cambio más pequeño y coherente con la arquitectura existente.
6. Ejecuta las pruebas relevantes y, cuando corresponda, `npm test` y `npm run build`.
7. Revisa posibles regresiones en cálculos, entradas, resultados, procedimiento, balance y componentes visuales afectados.
8. Entrega un resumen de archivos modificados, comportamiento cambiado y pruebas realmente ejecutadas. Identifica claramente lo que no se pudo verificar.

No afirmes que una prueba pasó, que se abrió la aplicación o que una función quedó lista si no lo verificaste realmente.

## 3. Stack y límites técnicos existentes

- Vite.
- Tailwind CSS.
- JavaScript vanilla con módulos ES.
- Chart.js para las gráficas existentes.
- No introducir React, Vue, Angular, Svelte, TypeScript ni otro framework de interfaz sin autorización explícita.
- No cambiar versiones, configuración, estructura de carpetas ni dependencias solo por preferencia personal. Inspecciona primero el repositorio y conserva sus decisiones válidas.
- Evita duplicar lógica, cálculos, validaciones, estilos o componentes que ya existan.

## 4. Reglas de ingeniería hidráulica

Estas reglas son criterios para evaluar y corregir el comportamiento existente, no una orden para implementar de nuevo todas las funciones.

### 4.1 Ecuación de energía

Entre los puntos 1 y 2:

\[
z_1+\frac{P_1}{\gamma}+\alpha_1\frac{V_1^2}{2g}+H_B
=z_2+\frac{P_2}{\gamma}+\alpha_2\frac{V_2^2}{2g}+H_T+h_L
\]

Donde \(\gamma=\rho g\); \(z\) es la cota; \(P\), la presión; \(V\), la velocidad; \(H_B\), la carga añadida por bomba; \(H_T\), la carga extraída por turbina; y \(h_L\), la pérdida total. Usar \(\alpha=1\) como valor predeterminado si así lo establece el comportamiento actual. Mantener consistentes los signos en cálculo, procedimiento y comprobación.

Carga total en cada punto:
\[
H_i=z_i+\frac{P_i}{\gamma}+\alpha_i\frac{V_i^2}{2g}
\]
Balance:
\[
H_1+H_B=H_2+H_T+h_L
\]

### 4.2 Variables contempladas

La calculadora contempla 18 incógnitas: `P1`, `P2`, `z1`, `z2`, `V1`, `V2`, `HB`, `HT`, `hL`, `Q`, `D`, `A`, `L`, `f`, `ΣK`, `hf`, `hm` y `Re`. Al corregir el solucionador, conserva la identificación inequívoca de la incógnita y sus relaciones físicas.

Relaciones principales para tubería circular llena:
\[
A=\frac{\pi D^2}{4},\quad Q=VA,\quad V=\frac{Q}{A},\quad Re=\frac{VD}{\nu}
\]

No supongas que una variable se puede despejar con cualquier combinación de datos. Deben existir suficientes datos independientes para una solución única. Si faltan datos, hay varias soluciones o no converge el método, explícalo y no inventes un resultado.

### 4.3 Pérdidas

\[
h_L=h_f+h_m
\]
\[
h_f=f\frac{L}{D}\frac{V^2}{2g},\qquad h_m=\Sigma K\frac{V^2}{2g}
\]
\[
Re=\frac{VD}{\nu}
\]
Para flujo laminar en tubería circular, \(f=64/Re\). Para turbulento puede usarse el método que ya tenga implementado el proyecto, como Colebrook–White o Swamee–Jain. `f` corresponde al factor de Darcy, no al de Fanning. En régimen de transición, no presentar el factor como exacto. Si el usuario ingresa `hL` directamente, no volver a sumarle `hf` y `hm`.

## 5. Datos, unidades y validez numérica

- Distingue entre campo vacío y cero: cero puede ser un valor físico válido.
- Convierte a SI antes de calcular y usa las conversiones centralizadas existentes. No agregues una segunda implementación de conversiones.
- Para presión, mantén coherencia entre presión manométrica y absoluta; no las mezcles.
- Usa \(\gamma=\rho g\) de forma coherente y respeta las propiedades configuradas del fluido.
- JavaScript `Number` (IEEE 754) es suficiente para este alcance, salvo evidencia concreta en contra.
- No redondees valores intermedios. Formatea solo para presentar; nunca conviertas una cifra formateada de pantalla en dato de cálculo.
- Valida valores no finitos, unidades, divisiones por cero, raíces, logaritmos, diámetros y viscosidades no válidos, dominios físicos y convergencia.
- No compares el balance de energía con igualdad exacta (`===`); utiliza una tolerancia absoluta/relativa coherente con el proyecto.
- No muestres ceros ficticios ni resultados de cálculos inválidos o no convergentes.

## 6. Interfaz y experiencia existente

- Respeta la identidad visual actual, la distribución y los patrones de interacción existentes. No rediseñes la interfaz salvo petición expresa.
- Conserva la pestaña **Calculadora**, la pestaña **Guía**, las gráficas y el modo claro/oscuro existentes; no los generes de nuevo en tareas que no los involucren.
- Los datos de las tablas, el procedimiento, la comprobación y las gráficas deben provenir del mismo estado real del cálculo. Corrige inconsistencias si están relacionadas con la solicitud.
- No inventes puntos intermedios en el perfil hidráulico cuando solo se conocen dos puntos.
- Mantén los estados de carga, error, advertencia y éxito veraces. No dependas únicamente del color para comunicar un estado.
- Los controles deben conservar etiquetas, unidades visibles, navegación por teclado, foco visible y mensajes de error accesibles.
- Evita insertar texto del usuario sin escapar en HTML. Mantén la accesibilidad WCAG 2.2 AA en los elementos que modifiques.

## 7. Pruebas y regresiones

Selecciona las pruebas según el alcance del cambio. Como mínimo, cuando aplique:

- Conversiones de unidades y consistencia dimensional.
- Continuidad: área, caudal, diámetro y velocidad.
- Ecuación de Bernoulli y balance de energía.
- Pérdidas mayores/menores, Reynolds y factor de fricción.
- Datos insuficientes, campos vacíos, valores inválidos, soluciones múltiples y falta de convergencia.
- Coherencia entre resultado numérico, procedimiento, tablas, balance y gráfica.
- Accesibilidad y adaptación visual de los componentes tocados.

Caso de referencia para pruebas de regresión (no codificar los resultados como constantes):
- \(z_1=102\,m\), \(P_1=150\,kPa\), \(V_1=1.4324\,m/s\).
- \(z_2=115\,m\), \(Q=45\,L/s\), \(D=150\,mm\).
- \(H_B=12\,m\), \(H_T=0\,m\).
- \(L=88.3\,m\), \(\varepsilon=0.0015\,mm\), \(\nu=1.004\times10^{-6}\,m^2/s\), \(\Sigma K=1.5\).
- \(g=9.80665\,m/s^2\), \(\rho\approx998.2\,kg/m^3\).
- Referencias aproximadas: \(V_2=2.5465\,m/s\), \(f=0.013891\), \(h_f=2.7026\,m\), \(h_m=0.4958\,m\), \(h_L=3.1983\,m\), \(P_2\approx106.598\,kPa\).

Si un resultado difiere, revisa las hipótesis, las unidades y el método de fricción antes de cambiar fórmulas. Los valores son referencias de comprobación, no valores que deban fijarse en el código.

## 8. Documentación y decisiones

- Consulta la documentación existente solo cuando sea pertinente para la tarea; no vuelvas a leer ni reconstruir todo el historial en cada cambio menor.
- Si existe `docs/REGISTRO_DECISIONES_PROYECTO.md`, úsalo para verificar decisiones relevantes antes de alterar arquitectura, modelo físico o comportamiento acordado.
- Si existe `docs/BITACORA_DESARROLLO.md`, actualízala solo ante cambios significativos: decisiones técnicas o matemáticas, correcciones importantes, nuevas funciones solicitadas o cambios de arquitectura.
- No crees estos documentos, nuevas secciones o registros por rutina si no existen y el usuario no lo ha pedido.
- Distingue hechos comprobados, decisiones, inferencias y pendientes. No registres como hecho una prueba que no se ejecutó.

## 9. Formato de entrega

Al terminar una tarea, responde de forma breve y concreta:
- Qué cambió y por qué.
- Qué archivos se modificaron.
- Qué pruebas se ejecutaron y sus resultados reales.
- Qué quedó pendiente o no pudo verificarse.

No describas funciones ya existentes como si fueran nuevas ni presentes un plan de construcción cuando el usuario solo pidió revisar, corregir o ajustar algo puntual.
