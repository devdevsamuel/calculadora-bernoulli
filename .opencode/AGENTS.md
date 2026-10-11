# Especificación para OpenCode: Calculadora universal de la ecuación de Bernoulli

## 1. Objetivo del proyecto

Construir una calculadora web para ingeniería civil que permita
seleccionar **cualquier incógnita compatible con el modelo**, ingresar
los datos conocidos en distintas unidades y calcular el resultado
automáticamente. Debe desarrollarse con **HTML, CSS y JavaScript
vanilla**, sin frameworks.

La interfaz debe inspirarse en las capturas de referencia: resultado
principal destacado, datos generales, datos de los puntos 1 y 2,
componentes de energía, comprobación del balance, cálculo automático de
pérdidas y perfil gráfico de cargas.

La aplicación debe: - Resolver la ecuación de Bernoulli entre dos
puntos. - Permitir seleccionar la incógnita desde una lista
desplegable. - Mostrar solo los datos necesarios para la incógnita
elegida y validar que el problema tenga suficientes datos. - Convertir
las unidades de entrada al Sistema Internacional antes de calcular. -
Calcular las pérdidas de energía por fricción y pérdidas menores cuando
se elija el modo automático. - Mostrar fórmula utilizada, sustitución
numérica, resultado, unidad y comprobaciones. - Indicar claramente
cuándo no hay solución única, faltan datos o los datos son físicamente
inválidos.

## 2. Modelo físico y convenciones

### 2.1 Ecuación general de energía

Entre los puntos 1 y 2:

\[
z_1+`\frac{P_1}{\gamma}`{=tex}+`\alpha`{=tex}\_1`\frac{V_1^2}{2g}`{=tex}+H_B
=
z_2+`\frac{P_2}{\gamma}`{=tex}+`\alpha`{=tex}\_2`\frac{V_2^2}{2g}`{=tex}+H_T+h_L
\]

Donde: - (z): cota geométrica, m. - (P): presión estática, Pa. -
(`\gamma`{=tex}=`\rho `{=tex}g): peso específico del fluido, N/m³. -
(V): velocidad media, m/s. - (`\alpha`{=tex}): coeficiente de corrección
de energía cinética. Usar 1 por defecto, editable como dato avanzado. -
(g): aceleración de la gravedad, m/s². - (H_B): carga agregada por una
bomba, m. - (H_T): carga extraída por una turbina, m. - (h_L): pérdida
total de carga entre los puntos, m.

Para el modo básico, usar (`\alpha`{=tex}\_1=`\alpha`{=tex}\_2=1). El
modelo debe mostrar esa hipótesis al usuario.

Definir la carga total en cada punto:

\[
H_i=z_i+`\frac{P_i}{\gamma}`{=tex}+`\alpha`{=tex}\_i`\frac{V_i^2}{2g}`{=tex}
\]

Por tanto, la comprobación será:

\[ H_1+H_B=H_2+H_T+h_L \]

Convención de signos: (H_B) es carga añadida por bomba y aparece en el
lado izquierdo; (H_T) es carga extraída por turbina y aparece en el lado
derecho. Todas las cargas se expresan en metros del fluido.

### 2.2 Fluido y constantes

En el modo estándar, usar agua a 20 °C como valor inicial, pero permitir
editar propiedades: - Densidad (`\rho`{=tex}), kg/m³. - Viscosidad
cinemática (`\nu`{=tex}), m²/s. - Gravedad (g), m/s². - Peso específico
(`\gamma`{=tex}=`\rho `{=tex}g), N/m³.

Valores iniciales recomendados para agua a aproximadamente 20 °C: -
(`\rho=998.2`{=tex} `\mathrm{kg/m^3}`{=tex}). -
(`\nu=1.004`{=tex}`\times10`{=tex}\^{-6} `\mathrm{m^2/s}`{=tex}). -
(g=9.80665 `\mathrm{m/s^2}`{=tex}). - Calcular (`\gamma`{=tex}) a partir
de (`\rho `{=tex}g), no introducirlo como una constante independiente
salvo que se permita edición avanzada.

La presión debe ser coherente en ambos puntos: usar presión manométrica
en ambos o presión absoluta en ambos. Como la ecuación usa diferencias
de presión, ambas convenciones dan el mismo resultado si se aplican
consistentemente. No mezclar convenciones.

## 3. Variables que se deben poder despejar

### 3.1 Incógnitas principales de Bernoulli

La lista de selección debe incluir, como mínimo:

  --------------------------------------------------------------------------------------------------------------------------------------------------
  Variable interna  Nombre visible    Unidad de salida  Despeje
  ----------------- ----------------- ----------------- --------------------------------------------------------------------------------------------
  `P2`              Presión P2        kPa o unidad      (P_2=`\gamma[z_1-z_2+P_1/\gamma+\alpha_1V_1^2/(2g)-\alpha_2V_2^2/(2g)+H_B-H_T-h_L]`{=tex})
                                      elegida           

  `P1`              Presión P1        kPa o unidad      Despejar algebraicamente la ecuación general para (P_1).
                                      elegida           

  `z2`              Cota z2           m                 Despejar la ecuación general para (z_2).

  `z1`              Cota z1           m                 Despejar la ecuación general para (z_1).

  `HB`              Carga de bomba    m                 (H_B=H_2+H_T+h_L-H_1)

  `HT`              Carga de turbina  m                 (H_T=H_1+H_B-H_2-h_L)

  `hL`              Pérdidas totales  m                 (h_L=H_1+H_B-H_2-H_T)

  `V1`              Velocidad V1      m/s               Resolver la ecuación para (V_1), considerando el término (V_1\^2).

  `V2`              Velocidad V2      m/s               Resolver la ecuación para (V_2), considerando el término (V_2\^2).
  --------------------------------------------------------------------------------------------------------------------------------------------------

Para las velocidades, no asumir que la raíz positiva siempre existe.
Reorganizar la ecuación como un término conocido más un término
cuadrático; comprobar que el radicando sea no negativo y elegir la raíz
física no negativa. Si se necesita una velocidad con signo o dirección,
ese caso debe tratarse como modo avanzado.

### 3.2 Variables hidráulicas adicionales

Cuando los datos disponibles lo permitan, admitir estas incógnitas en un
modo hidráulico extendido:

  --------------------------------------------------------------------------------------------
  Variable          Nombre visible    Unidad            Relación
  ----------------- ----------------- ----------------- --------------------------------------
  `Q`               Caudal            m³/s, L/s o m³/h  (Q=VA)

  `D`               Diámetro interno  m, mm o pulgadas  (D=`\sqrt{4Q/(\pi V)}`{=tex}) para
                                                        tubería circular llena

  `A`               Área hidráulica   m²                (A=Q/V)

  `V`               Velocidad         m/s               (V=Q/A)

  `L`               Longitud de       m                 Despejar Darcy--Weisbach si el resto
                    tubería                             de los términos es conocido

  `f`               Factor de         adimensional      (f=h_fD/\[L(V\^2/(2g))\])
                    fricción Darcy                      

  `K` o `ΣK`        Coeficiente(s) de adimensional      (`\Sigma `{=tex}K=h_m/\[V\^2/(2g)\])
                    pérdidas menores                    

  `h_f`             Pérdida mayor     m                 (h_f=f(L/D)(V\^2/(2g)))

  `h_m`             Pérdida menor     m                 (h_m=`\Sigma `{=tex}K(V\^2/(2g)))

  `Re`              Número de         adimensional      (Re=VD/`\nu`{=tex})
                    Reynolds                            
  --------------------------------------------------------------------------------------------

Para resolver `D`, `L`, `f` o `Q` con pérdidas automáticas, algunas
relaciones pueden ser no lineales porque (V), (Re) y (f) dependen entre
sí. En esos casos implementar un solucionador numérico con límites,
tolerancia y máximo de iteraciones. No mostrar un resultado si el
algoritmo no converge.

## 4. Pérdidas de carga

### 4.1 Pérdida total

\[ h_L=h_f+h_m \]

-   (h_f): pérdida mayor por fricción distribuida en la tubería.
-   (h_m): suma de pérdidas menores por accesorios, válvulas, entradas,
    salidas, codos, etc.

La calculadora debe ofrecer dos modos: 1. **Pérdidas ingresadas:** el
usuario proporciona directamente (h_L), o por separado (h_f) y (h_m). 2.
**Cálculo automático:** el usuario proporciona los datos de tubería,
fluido y accesorios; la app calcula las pérdidas.

Si el usuario introduce directamente (h_L), no volver a sumarle
(h_f+h_m).

### 4.2 Darcy--Weisbach

\[ h_f=f`\frac{L}{D}`{=tex}`\frac{V^2}{2g}`{=tex} \]

Donde (f) es el **factor de fricción de Darcy**, no el factor de
Fanning. La interfaz debe indicarlo para evitar confusiones.

### 4.3 Pérdidas menores

\[ h_m=`\sum `{=tex}K`\frac{V^2}{2g}`{=tex} \]

El usuario puede ingresar (`\Sigma `{=tex}K) directamente o agregar una
lista de accesorios, cada uno con cantidad y coeficiente (K). La suma
será (`\Sigma `{=tex}K=`\sum `{=tex}n_iK_i). Los coeficientes deben ser
editables; no inventar coeficientes de accesorios.

### 4.4 Reynolds y factor de fricción

\[ Re=`\frac{VD}{\nu}`{=tex} \]

Criterio orientativo: - Laminar: (Re\<2300). - Transición:
(2300`\le `{=tex}Re`\le4000`{=tex}). - Turbulento: (Re\>4000).

Para flujo laminar en tubería circular, usar (f=64/Re). Para turbulento,
se puede usar Colebrook--White iterativo o Swamee--Jain como
aproximación explícita:

\[
f=`\frac{0.25}{\left[\log_{10}\left(\frac{\varepsilon}{3.7D}+\frac{5.74}{Re^{0.9}}\right)\right]^2}`{=tex}
\]

Aquí (`\varepsilon`{=tex}) y (D) deben estar en la misma unidad. La
rugosidad absoluta debe convertirse a metros antes de evaluar la
fórmula. En transición, mostrar advertencia porque el factor de fricción
es incierto; no presentar el valor como exacto.

## 5. Entradas, datos calculados y unidades

### 5.1 Datos generales

-   (g): m/s².
-   (`\rho`{=tex}): kg/m³.
-   (`\nu`{=tex}): m²/s.
-   (`\gamma`{=tex}): N/m³, calculado como (`\rho `{=tex}g).
-   Modo de pérdidas: ingresadas o automáticas.
-   (H_B): m.
-   (H_T): m.
-   (h_L), o datos para calcular (h_f) y (h_m).

### 5.2 Datos de los puntos 1 y 2

-   Cota (z_1,z_2): m.
-   Presión (P_1,P_2): Pa, kPa, bar, m.c.a. o psi.
-   Velocidad (V_1,V_2): m/s.
-   Caudal (Q): m³/s, L/s o m³/h.
-   Diámetro interno (D): m, mm o pulgadas.
-   Área (A): m².
-   Método de velocidad: valor ingresado o calculado desde (Q) y (D).

### 5.3 Datos de tubería para pérdidas automáticas

-   Longitud (L): m.
-   Diámetro interno (D): m o mm.
-   Rugosidad absoluta (`\varepsilon`{=tex}): m o mm.
-   Viscosidad cinemática (`\nu`{=tex}): m²/s.
-   Caudal (Q) o velocidad (V).
-   (`\Sigma `{=tex}K) o lista de accesorios.
-   Método para (f): automático (laminar/Colebrook o Swamee--Jain) y,
    opcionalmente, factor de fricción ingresado.

### 5.4 Conversiones mínimas

Convertir todas las entradas a SI internamente: -
(1 `\mathrm{kPa}`{=tex}=1000 `\mathrm{Pa}`{=tex}). -
(1 `\mathrm{bar}`{=tex}=100000 `\mathrm{Pa}`{=tex}). -
(1 `\mathrm{psi}`{=tex}=6894.757293168 `\mathrm{Pa}`{=tex}). -
(1 `\mathrm{m.c.a.}`{=tex}=`\rho `{=tex}g `\mathrm{Pa}`{=tex}), usando
la densidad definida en la aplicación. -
(1 `\mathrm{L/s}`{=tex}=0.001 `\mathrm{m^3/s}`{=tex}). -
(1 `\mathrm{m^3/h}`{=tex}=1/3600 `\mathrm{m^3/s}`{=tex}). -
(1 `\mathrm{mm}`{=tex}=0.001 `\mathrm{m}`{=tex}). -
(1 `\mathrm{in}`{=tex}=0.0254 `\mathrm{m}`{=tex}). - Para rugosidad,
usar unidades de longitud y convertir a m. - Para resultados de presión,
convertir desde Pa a la unidad seleccionada. - Para resultados de carga,
usar m de fluido.

No mezclar metros de columna de agua con metros de carga geométrica sin
aplicar la conversión correcta.

## 6. Reglas para escoger y resolver la incógnita

1.  El usuario selecciona una variable en el desplegable `Incógnita`.
2.  La aplicación determina qué variables son necesarias para
    calcularla.
3.  Debe diferenciar:
    -   dato obligatorio;
    -   dato derivable a partir de otros (por ejemplo, (V=Q/A));
    -   dato opcional;
    -   dato que no debe solicitarse porque es la incógnita.
4.  Validar que haya suficientes datos independientes para una solución
    única.
5.  Si hay más de una solución matemática, indicar cuál se seleccionó y
    por qué.
6.  Si faltan datos, mostrar una lista concreta de los datos faltantes,
    sin devolver cero como si fuera un resultado.
7.  Si los datos generan división por cero, raíz negativa, logaritmo
    inválido, caudal/diámetro negativo o un estado imposible, mostrar un
    error comprensible.
8.  Permitir introducir cero cuando tenga sentido físico (por ejemplo,
    carga de bomba nula), pero no aceptar silenciosamente un campo vacío
    como cero.
9.  Tras calcular, mostrar la variable despejada, fórmula, sustitución,
    resultado con unidad, datos usados y comprobación del balance.
10. No redondear los valores intermedios. Redondear solo para
    presentación.

## 7. Interfaz recomendada

### Secciones

1.  **Resultado principal:** nombre de la incógnita, resultado grande,
    unidad y estado de cálculo.
2.  **Datos generales:** fluido, gravedad, peso específico, modo de
    pérdidas, bomba y turbina.
3.  **Datos en los puntos 1 y 2:** tabla editable con variable, Punto 1,
    Punto 2 y unidad.
4.  **Componentes de energía:** (z), (P/`\gamma`{=tex}),
    (`\alpha `{=tex}V\^2/(2g)) y carga total para cada punto.
5.  **Comprobación de Bernoulli:** lado izquierdo, lado derecho,
    diferencia y estado "Balance verificado" o "Revisar datos".
6.  **Cálculo automático de pérdidas:**
    (L,D,`\varepsilon`{=tex},`\nu`{=tex},Q/A,V,Re), régimen,
    (f,h_f,h_m,h_L).
7.  **Perfil de cargas:** gráfica de cota geométrica, línea piezométrica
    y línea de energía. Si no hay información espacial suficiente,
    mostrar solo los puntos 1 y 2 y advertir que la interpolación es
    ilustrativa.
8.  **Procedimiento:** fórmula, despeje, sustitución numérica y
    resultado.

### Experiencia de usuario

-   Diseño adaptable a móvil y escritorio.
-   Etiquetas claras y unidades visibles junto a cada campo.
-   Selectores de unidad por magnitud.
-   Botones "Calcular", "Restablecer" y "Cargar ejemplo".
-   Ejemplo de validación con valores de referencia.
-   No cambiar automáticamente la unidad del dato sin convertir su
    valor.
-   Accesibilidad básica: labels, navegación por teclado, contraste y
    mensajes de error legibles.

## 8. Precisión numérica en JavaScript

JavaScript `Number` usa coma flotante binaria IEEE 754 de doble
precisión. Es suficiente para la mayoría de los cálculos hidráulicos de
esta aplicación si se usa correctamente, pero puede producir pequeñas
diferencias como `0.1 + 0.2 !== 0.3`.

Reglas obligatorias: - Usar `Number` para los cálculos de ingeniería por
defecto. - No redondear durante los cálculos intermedios. - Redondear
únicamente al mostrar el resultado. - No comparar números de coma
flotante con `===` para verificar balances. - Usar una tolerancia
absoluta y relativa para el balance, por ejemplo: \[
\|H\_{`\mathrm{izq}`{=tex}}-H\_{`\mathrm{der}`{=tex}}\|`\le `{=tex}`\text{tolAbs}`{=tex}+`\text{tolRel}`{=tex}`\cdot`{=tex}`\max`{=tex}(\|H\_{`\mathrm{izq}`{=tex}}\|,\|H\_{`\mathrm{der}`{=tex}}\|)
\] Configurar y documentar `tolAbs` y `tolRel`; valores iniciales
razonables para cargas expresadas en metros pueden ser `tolAbs = 1e-6` y
`tolRel = 1e-8`, ajustables según las unidades y el problema. - Validar
`Number.isFinite(valor)` después de conversiones y cálculos. - No usar
`parseInt` para magnitudes decimales. - Para leer campos, rechazar
cadenas vacías y valores no numéricos; no convertirlos en cero. - Usar
`Intl.NumberFormat` solo para formatear la salida, nunca para cálculos.
Evitar convertir el texto formateado de vuelta a número. - Mostrar
suficientes cifras para que el usuario pueda revisar el cálculo;
permitir elegir decimales de presentación. - Recordar que las cifras
mostradas no deben confundirse con la precisión real de los datos
experimentales.

### ¿Hace falta una biblioteca decimal?

No es obligatorio usar una biblioteca decimal para esta calculadora. La
física y las fórmulas usan magnitudes continuas, raíces, logaritmos e
iteraciones; `Number` es práctico y preciso para el uso previsto. Si se
exige aritmética decimal exacta en operaciones financieras o contables,
usar `decimal.js`, pero no asumir que eso mejora automáticamente la
exactitud de mediciones físicas. Si se incorpora una biblioteca: -
instalarla o cargarla de forma explícita y documentar la versión; - no
mezclar objetos `Decimal` con `Number` sin conversión explícita; -
verificar compatibilidad con `Math.sqrt`, `Math.log10` y algoritmos
iterativos; - mantener pruebas numéricas de referencia.

No depender de una biblioteca para convertir unidades: crear un módulo
de conversión centralizado y probado. Se puede incorporar una biblioteca
de unidades como `math.js` si el equipo decide que vale la pena, pero no
es necesaria para una versión vanilla pequeña. No cargar librerías
externas sin explicar el motivo y la forma de uso.

## 9. Arquitectura de archivos

Mantener responsabilidades separadas:

-   `index.html`: estructura semántica, formularios y contenedores de
    resultados.
-   `styles.css`: diseño, responsive, estados de error y accesibilidad.
-   `js/main.js`: eventos de interfaz y flujo de cálculo.
-   `js/bernoulli.js`: ecuación general, despejes y balance.
-   `js/losses.js`: Darcy--Weisbach, pérdidas menores, Reynolds y factor
    de fricción.
-   `js/units.js`: conversiones de unidades a SI y desde SI.
-   `js/solver.js`: selección de incógnita, dependencias, validación y
    métodos numéricos.
-   `js/format.js`: formato de resultados y cifras mostradas.
-   `js/chart.js`: perfil de cargas, si se implementa una gráfica.
-   `tests/`: pruebas de fórmulas, conversiones, despejes y casos
    inválidos.

Se puede simplificar el número de archivos en una primera versión, pero
no mezclar toda la lógica en un único bloque de JavaScript.

## 10. Diseño de funciones y pseudocódigo

Funciones sugeridas: - `toSI(value, unit, quantityType)` -
`fromSI(value, unit, quantityType)` - `calculateVelocityFromFlow(Q, D)`
--- para tubería circular llena: (V=4Q/(`\pi `{=tex}D\^2)). -
`calculateReynolds(V, D, nu)` -
`calculateFrictionFactor(Re, epsilon, D, method)` -
`calculateMajorLoss(f, L, D, V, g)` - `calculateMinorLoss(sumK, V, g)` -
`calculateTotalLoss(hf, hm)` -
`calculateEnergyAtPoint(z, P, gamma, alpha, V, g)` -
`solveBernoulli(target, knownValues, options)` -
`verifyBalance(values, tolerance)` -
`formatResult(value, unit, decimals)`

Flujo de cálculo: 1. Leer los valores sin formato visual. 2. Validar los
campos requeridos. 3. Convertir todas las entradas a SI. 4. Resolver las
variables derivables como (A) y (V). 5. Calcular pérdidas ingresadas o
automáticas. 6. Construir el modelo de energía. 7. Resolver la incógnita
seleccionada. 8. Validar el resultado y el dominio físico. 9. Calcular
los componentes de energía y comprobar el balance. 10. Formatear para
pantalla y actualizar la gráfica.

## 11. Pruebas de aceptación

Crear pruebas automatizadas para: - Conversión kPa ↔ Pa, L/s ↔ m³/s, mm
↔ m e in ↔ m. - Caudal, área, diámetro y velocidad en tubería circular
llena. - Carga de presión (P/`\gamma`{=tex}). - Carga de velocidad
(V\^2/(2g)). - Despeje de presión, cota, velocidad, bomba, turbina y
pérdidas. - Darcy--Weisbach y pérdidas menores. - Factor de fricción
laminar y turbulento. - Balance correcto y balance incorrecto. - Campos
vacíos, valores no numéricos, diámetro cero, viscosidad cero, raíz
negativa y falta de datos. - Casos con unidades distintas que
representen físicamente el mismo problema y deban producir el mismo
resultado. - No alterar los valores intermedios por redondeo de
pantalla.

### Caso de referencia basado en las capturas

Usar este ejemplo como prueba de integración del modo de pérdidas
automáticas: - (z_1=102 `\mathrm{m}`{=tex}),
(P_1=150 `\mathrm{kPa}`{=tex}), (V_1=1.4324 `\mathrm{m/s}`{=tex}). -
(z_2=115 `\mathrm{m}`{=tex}), (Q=45 `\mathrm{L/s}`{=tex}),
(D=150 `\mathrm{mm}`{=tex}). - (H_B=12 `\mathrm{m}`{=tex}),
(H_T=0 `\mathrm{m}`{=tex}). - (L=88.3 `\mathrm{m}`{=tex}),
(`\varepsilon=0.0015`{=tex} `\mathrm{mm}`{=tex}),
(`\nu=1.004`{=tex}`\times10`{=tex}\^{-6} `\mathrm{m^2/s}`{=tex}),
(`\Sigma `{=tex}K=1.5). - (g=9.80665 `\mathrm{m/s^2}`{=tex}), agua con
(`\rho`{=tex}`\approx998.2`{=tex} `\mathrm{kg/m^3}`{=tex}). - En las
capturas se reporta aproximadamente (V_2=2.5465 `\mathrm{m/s}`{=tex}),
(f=0.013891), (h_f=2.7026 `\mathrm{m}`{=tex}),
(h_m=0.4958 `\mathrm{m}`{=tex}), (h_L=3.1983 `\mathrm{m}`{=tex}) y
(P_2`\approx106.598`{=tex} `\mathrm{kPa}`{=tex}).

Importante: los valores de las capturas son una referencia de
integración, no deben codificarse como constantes. El resultado
calculado debe surgir de las fórmulas. Si el resultado difiere,
verificar primero conversiones, densidad, factor de fricción,
coeficientes y redondeo. La rugosidad mostrada es muy pequeña; verificar
que la unidad sea realmente mm y no m.

## 12. Instrucciones finales para el agente de OpenCode

Antes de programar: 1. Leer esta especificación completa. 2. Proponer un
plan corto de implementación. 3. Crear la estructura de archivos. 4.
Implementar primero fórmulas y conversiones con pruebas. 5. Después
crear la interfaz y conectar los eventos. 6. Probar el caso de
referencia y documentar cualquier diferencia explicada por las
hipótesis. 7. No afirmar que se puede despejar "cualquier variable" si
faltan datos o si la solución no es única. 8. No inventar coeficientes,
propiedades ni datos faltantes. 9. Documentar claramente las hipótesis
hidráulicas y los límites del modelo. 10. Mantener HTML, CSS y
JavaScript vanilla; no incorporar React, Vue, Angular, TypeScript ni
herramientas de compilación salvo autorización explícita.


## 13. Configuración obligatoria de Vite y Tailwind CSS

### 13.1 Stack tecnológico

- **HTML5** para la estructura.
- **CSS** con **Tailwind CSS** para el diseño, los estados y la adaptación a distintos tamaños de pantalla.
- **JavaScript vanilla (ES modules)** para la lógica de interfaz y los cálculos.
- **Vite** para servidor de desarrollo, resolución de módulos y compilación de producción.
- No usar React, Vue, Angular, Svelte ni otro framework de interfaz.
- No usar TypeScript salvo autorización explícita.

Usa versiones estables y compatibles de Node.js, Vite y Tailwind CSS. Antes de instalar, revisa los requisitos de Node de las versiones elegidas y documenta las dependencias instaladas.

### 13.2 Crear el proyecto

Si la carpeta del proyecto todavía no tiene configuración, inicialízala con npm y Vite. Por ejemplo:

```bash
npm create vite@latest . -- --template vanilla
npm install
npm install -D tailwindcss @tailwindcss/vite
```

Si ya existe un proyecto, inspecciona primero `package.json` y los archivos existentes; no sobrescribas el trabajo sin necesidad. Instala únicamente las dependencias que falten.

### 13.3 Configuración de Vite

Configura `vite.config.js` para activar el plugin oficial de Tailwind CSS. Con Tailwind CSS v4, la configuración esperada es equivalente a:

```js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
```

En `src/style.css`, importa Tailwind:

```css
@import "tailwindcss";
```

Importa `./style.css` desde `src/main.js`. El HTML debe cargar `src/main.js` mediante un módulo, según la estructura estándar de Vite.

**Importante:** esta guía corresponde a Tailwind CSS v4. No agregues directivas antiguas como `@tailwind base`, `@tailwind components` y `@tailwind utilities`, ni crees una configuración v3 sin necesidad. Si el proyecto ya utiliza Tailwind v3, no mezcles ambas configuraciones: conserva la versión instalada o migra deliberadamente y verifica el resultado.

### 13.4 Scripts de npm

Asegúrate de que `package.json` contenga scripts equivalentes a:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Conserva las dependencias y demás metadatos existentes en `package.json`; no reemplaces el archivo completo si basta con actualizar los scripts.

Comandos esperados:

```bash
npm run dev
npm run build
npm run preview
```

- `npm run dev`: inicia el servidor local de desarrollo y muestra la URL que debe abrirse en el navegador.
- `npm run build`: genera los archivos optimizados de producción en `dist/`.
- `npm run preview`: sirve localmente el contenido compilado para revisar la versión de producción.

No afirmes que el proyecto está compilado o probado si no ejecutaste los comandos y verificaste sus resultados.

### 13.5 Uso correcto de Tailwind CSS

- Construye el diseño con utilidades de Tailwind: cuadrículas, flexbox, espaciado, tipografía, bordes, colores, estados y breakpoints responsive.
- Mantén las clases legibles y evita duplicaciones innecesarias.
- Para clases que dependan de datos dinámicos, no construyas nombres de clases de Tailwind por concatenación arbitraria. Usa clases completas explícitas o un mapa de clases permitidas.
- Reserva CSS personalizado para detalles que Tailwind no resuelva de forma clara, como estilos específicos de gráficos o pequeños ajustes.
- Asegura que los formularios, tablas, resultados y gráficas funcionen tanto en escritorio como en móvil.
- Mantén la lógica matemática separada de los estilos: Tailwind nunca debe contener ni sustituir cálculos de ingeniería.

### 13.6 Criterios de aceptación del entorno

Antes de entregar el proyecto, verifica:

1. `npm install` termina correctamente.
2. `npm run dev` inicia Vite sin errores y la página abre.
3. Tailwind CSS se aplica realmente; no basta con instalar el paquete.
4. Los módulos JavaScript se resuelven correctamente y no hay errores en consola.
5. `npm run build` termina con código de salida exitoso y crea `dist/`.
6. `npm run preview` permite abrir la compilación de producción.
7. No hay rutas rotas a CSS, JavaScript, imágenes o recursos.
8. La aplicación sigue usando JavaScript vanilla y no se introdujeron frameworks no solicitados.
9. Las pruebas de las fórmulas y conversiones siguen pasando después de integrar Vite.
10. En la respuesta final, resume los archivos creados, las decisiones técnicas, las pruebas ejecutadas y los comandos para ejecutar el proyecto.


---

# Instrucciones operativas del agente (prioridad alta)

Estas instrucciones complementan la especificación técnica anterior y definen cómo debe ejecutarse el trabajo. Si hay una contradicción sobre el stack o la interfaz, prevalece esta sección.

## A. Stack obligatorio y comandos

- Usar **Vite + Tailwind CSS + JavaScript vanilla + HTML**.
- No usar React, Vue, Angular, Svelte, TypeScript ni otro framework de interfaz.
- Usar npm como gestor de paquetes, salvo que el repositorio ya utilice de forma coherente otro gestor.
- Usar la integración oficial de Tailwind CSS para Vite compatible con la versión elegida. Para Tailwind CSS v4, configurar `@tailwindcss/vite` en `vite.config.js` e importar Tailwind desde el CSS principal mediante `@import "tailwindcss";`.
- No mezclar instrucciones de configuración de Tailwind v3 con v4. Consultar la configuración existente y mantener una única versión coherente.
- Scripts mínimos en `package.json`:
  - `npm run dev`: servidor local de desarrollo.
  - `npm run build`: compilación de producción.
  - `npm run preview`: previsualización local de la compilación.
- La entrega no está terminada hasta que `npm run build` finalice sin errores. Después, comprobar `npm run dev` y `npm run preview`.
- No afirmar que se ejecutó un comando si no se ejecutó realmente. Si una limitación del entorno impide ejecutarlo, informarlo expresamente.
- Antes de modificar un repositorio existente, inspeccionar archivos, `package.json`, configuración de Vite y estilos actuales. No sobrescribir trabajo existente sin entenderlo.

## B. Interpretación visual de las capturas de referencia

Las capturas muestran una interfaz tipo hoja de cálculo técnica, amplia y organizada por secciones. No se debe copiar la escala diminuta de la captura tomada desde un teléfono; hay que reproducir su **jerarquía, distribución, tablas y colores** en una web legible y adaptable.

### B.1 Identidad visual

- Fondo general gris muy claro (`#f8fafc`), paneles blancos y bordes finos y escasos (sin sombras fuertes).
- **Paleta azul pastel/turquesa como identidad**:
  - Azul pastel principal `#8ECFFF` (acentos y texto destacado en modo oscuro).
  - Azul eléctrico suave `#56B8FF` (cabeceras de sección, controles principales, foco).
  - Turquesa hielo `#8CE8DC` (series secundarias de gráficas y detalles).
  - En modo claro, los azules se oscurecen para contraste sobre fondos claros (p. ej. acento de texto `#1976C4`, cabeceras `#56B8FF` con texto oscuro `#0C1722`), conservando la identidad de la paleta.
- **Verde `#5CDEA1` exclusivamente para resultados correctos o estados satisfactorios** (en modo oscuro como texto sobre tinte verde oscuro; en modo claro se oscurece el texto verde para legibilidad). Nunca como color decorativo.
- **Amarillo pastel `#FFD68A` exclusivamente para campos editables**, siempre con texto oscuro encima (contraste alto) en ambos temas. Los campos calculados usan un tono neutro.
- **Modo oscuro (tema principal de la paleta)**: fondo `#0C1722`, paneles `#162633`, bordes `#2B4253`, texto principal `#EDF5FC`, texto secundario `#A8BBCB`. El modo claro deriva la misma identidad sobre fondo gris azulado claro y paneles blancos.
- Filas de tablas claras con cebra sutil, bordes finos solo donde aportan (cabecera de tabla) y tipografía compacta pero legible; números alineados con `tabular-nums` y unidades siempre visibles junto al valor.
- Escala tipográfica coherente y espaciado uniforme entre secciones; priorizar la visibilidad del resultado principal.
- Errores y advertencias con color contrastante, sin depender solo del color para comunicar el estado.
- **Modo oscuro completo**: fondos, paneles, campos, tablas, textos, estados, gráficas y controles deben adaptarse con contraste y legibilidad equivalentes al modo claro. Interruptor visible en la cabecera para alternar; la preferencia se persiste (p. ej. `localStorage`) y, en su ausencia, se puede respetar la preferencia del sistema. Aplicar el tema antes del primer pintado para evitar parpadeos.
- Apariencia técnica, limpia y sobria. Evitar gradientes llamativos, sombras excesivas, grandes espacios vacíos, adornos y tarjetas gigantes que hagan perder la sensación de tablero técnico.
- Utilizar Tailwind para la mayoría de los estilos; reservar CSS propio (incluidos tokens semánticos de tema claro/oscuro) para ajustes específicos, tablas, gráficas y detalles que Tailwind no resuelva con claridad.
- Mantener contraste adecuado (también en modo oscuro), foco visible, etiquetas asociadas a sus controles y navegación por teclado.

### B.2 Navegación superior

Crear dos pestañas principales, como en las capturas:
1. **Calculadora**
2. **Guía**

La pestaña activa debe distinguirse visualmente. En “Guía” se debe explicar la ecuación general, símbolos y unidades, relaciones auxiliares, procedimiento, advertencias y ejemplo incluido. La navegación debe funcionar de verdad, no ser decorativa.

### B.3 Distribución de la pestaña Calculadora en escritorio

Usar un tablero responsive con secciones de tamaño contenido y alineación consistente. En pantallas anchas, preferir una distribución en dos columnas para que los datos de entrada y las comprobaciones puedan verse simultáneamente.

Orden y contenido sugeridos:

1. **Título y subtítulo**: “Calculadora de la ecuación de Bernoulli” y una explicación breve de las hipótesis.
2. **Resultado principal**: una franja horizontal prominente con selector de incógnita, valor calculado, unidad y estado. La selección de incógnita debe ser un control funcional.
3. **Columna principal**:
   - Datos generales: gravedad, peso específico/densidad, carga de bomba, carga de turbina, modo de pérdidas y pérdidas ingresadas.
   - Datos en los puntos 1 y 2: tabla con variable, Punto 1, Punto 2 y unidad. Incluir cota, presión, caudal, diámetro, velocidad, método de velocidad y área calculada cuando corresponda.
   - Componentes de energía: carga de elevación, carga de presión, carga de velocidad y carga total en ambos puntos.
   - Comprobación de Bernoulli: lado izquierdo, lado derecho, diferencia y estado.
4. **Columna secundaria**:
   - Valores usados en la verificación, mostrando qué valores se usaron realmente en el cálculo.
   - Tabla de cotas, línea piezométrica y línea de energía para los puntos 1 y 2.
   - Panel de pérdidas automáticas: longitud, diámetro, rugosidad, viscosidad, caudal, área, velocidad, Reynolds, régimen, factor de fricción, pérdida mayor, pérdida menor y pérdida total.
5. **Gráfica del perfil hidráulico**, con una anchura que permita leer ejes, leyenda y valores. En pantallas pequeñas, colocarla debajo de las tablas y permitir que use todo el ancho disponible.
6. **Uso rápido**: pasos breves para seleccionar la incógnita, elegir el modo de pérdidas, completar datos y revisar el balance.

No ocultar información importante solo porque no cabe en una pantalla. En móvil, apilar secciones, conservar las etiquetas y permitir desplazamiento horizontal únicamente dentro de tablas anchas cuando sea necesario. El **procedimiento detallado** (fórmula, sustitución, resultado y notas) puede presentarse plegado (`details`/`summary`) por defecto, siempre que la franja de resultado principal conserve el valor, la unidad y el estado visibles; desplegarlo bajo demanda no elimina información.

### B.4 Tabla de datos

- Las columnas principales son `Variable`, `Punto 1`, `Punto 2` y `Unidad`.
- Mostrar siempre las unidades junto a los campos o en una columna clara.
- Diferenciar visualmente valores ingresados de valores calculados.
- No convertir un campo vacío en cero.
- La celda de la incógnita puede quedar deshabilitada o vacía durante la resolución; indicar que ese valor será calculado.
- Si una variable se calcula desde otras (por ejemplo, velocidad a partir de caudal y diámetro), mostrar el método usado.
- Mantener sincronizados los valores mostrados en la tabla, los usados en la fórmula y los utilizados en la gráfica.

## C. Gráficas obligatorias

La aplicación **debe incluir gráficas funcionales**, no solo una tabla ni una imagen estática.

### C.1 Gráfica principal: perfil de cargas

Crear una gráfica de líneas titulada **“Perfil de cargas en los dos puntos (m)”**. Debe mostrar como mínimo estas tres series:

1. **Cota geométrica**: \(z\).
2. **Línea piezométrica (HGL)**: \(z + P/\gamma\).
3. **Línea de energía (EGL)**: \(z + P/\gamma + \alpha V^2/(2g)\).

Requisitos:
- Eje horizontal: Punto 1 y Punto 2. Si el usuario ingresa distancias o longitud, se puede usar posición longitudinal real; si no, etiquetar los dos puntos sin inventar distancias intermedias.
- Eje vertical: carga en metros.
- Leyenda clara, unidades, cuadrícula discreta y tooltips o etiquetas que permitan inspeccionar los valores.
- Actualizar automáticamente la gráfica después de calcular o cambiar los datos.
- Los datos de la gráfica deben provenir del mismo estado y de los mismos resultados que alimentan las tablas.
- Si la información solo permite calcular dos puntos, representar solo esos dos puntos conectados. No insinuar que la distribución entre ellos se conoce exactamente.
- Si el cálculo no es válido o faltan datos para una serie, mostrar un estado vacío explicativo en lugar de dibujar ceros falsos.
- Debe redimensionarse correctamente al cambiar el tamaño de la ventana y ser legible en móvil.
- Las series, ejes, leyenda y tooltips deben ser legibles **tanto en modo claro como en modo oscuro**, adaptando la paleta al tema activo y re-renderizando al alternarlo.
- Incluir accesibilidad básica: nombre/título descriptivo y resumen textual de los valores.
- La gráfica no puede tapar la tabla ni provocar que toda la página se desborde horizontalmente.

### C.2 Biblioteca gráfica

Preferir **Chart.js** para la gráfica de líneas por su integración sencilla con JavaScript vanilla. Instalarlo como dependencia npm y documentar su uso. No usar una captura, SVG fijo ni valores de ejemplo incrustados como sustituto de la gráfica funcional.

- Gestionar la instancia de la gráfica para actualizarla o destruirla correctamente; no crear una instancia nueva en cada recálculo sin limpiar la anterior.
- Destruir la instancia al reconstruir el componente o al cambiar de vista cuando corresponda.
- Usar los valores calculados, no los valores formateados como texto.
- No es necesario usar una biblioteca de gráficos adicional si Chart.js cumple todos los requisitos.

### C.3 Gráfica complementaria de componentes de energía

Si el diseño y el tiempo lo permiten, agregar una gráfica de barras agrupadas que compare, para Punto 1 y Punto 2:
- carga de elevación \(z\);
- carga de presión \(P/\gamma\);
- carga de velocidad \(\alpha V^2/(2g)\);
- carga total.

Esta gráfica es complementaria. La gráfica del perfil hidráulico de la sección C.1 sí es obligatoria.

## D. Guía de uso y ecuaciones

La pestaña “Guía” debe tener contenido real y estar alineada con las fórmulas implementadas. Incluir:

- Ecuación general de energía y convención de signos para bomba, turbina y pérdidas.
- Tabla de símbolos, significado y unidades.
- Relaciones auxiliares para área circular, caudal, velocidad, carga de presión, Darcy–Weisbach y pérdidas menores.
- Procedimiento numerado para usar la calculadora.
- Advertencias sobre presión manométrica/absoluta, hipótesis del modelo, régimen de transición y datos faltantes.
- El ejemplo de referencia de esta especificación.
- Diseño en tablas y paneles claros, adaptables a móvil. No convertir la guía en un bloque de texto interminable.

## E. Arquitectura sugerida

Mantener separación de responsabilidades, adaptada a Vite:

```text
/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js
│   ├── style.css
│   ├── modules/
│   │   ├── bernoulli.js
│   │   ├── losses.js
│   │   ├── units.js
│   │   ├── solver.js
│   │   └── format.js
│   ├── ui/
│   │   ├── calculator.js
│   │   ├── guide.js
│   │   └── chart.js
│   └── data/
│       └── defaults.js
└── tests/
    ├── units.test.js
    ├── bernoulli.test.js
    └── losses.test.js
```

La estructura puede adaptarse si el repositorio ya tiene una organización razonable. Evitar un único archivo `main.js` con toda la lógica matemática, los eventos y la gráfica.

## F. Reglas de implementación y calidad

1. Primero inspeccionar el proyecto y resumir el plan de trabajo.
2. Configurar Vite y Tailwind correctamente antes de crear todos los componentes.
3. Implementar y probar las conversiones de unidades y las fórmulas.
4. Implementar el motor que selecciona y resuelve la incógnita.
5. Construir la interfaz de Calculadora y Guía.
6. Integrar Chart.js y conectar la gráfica al estado real del cálculo.
7. Verificar que cada cambio en los datos actualice resultados, comprobación y gráfica de forma coherente.
8. Probar diseño de escritorio y móvil.
9. Ejecutar las pruebas disponibles y `npm run build`.
10. Corregir errores reales antes de entregar. No dejar botones sin función, datos simulados en producción, errores en consola ni gráficas desconectadas de la calculadora.
11. No fijar los resultados de referencia como constantes: todos deben calcularse desde las fórmulas.
12. Documentar los comandos para instalar, desarrollar, probar y compilar.

## G. Criterios de aceptación visual y funcional

El trabajo se considera aceptable cuando:

- Las pestañas Calculadora y Guía funcionan.
- La interfaz reproduce la organización técnica de las capturas: resultado principal, datos generales, tabla de los dos puntos, componentes de energía, verificación, valores usados, pérdidas automáticas y uso rápido.
- Los campos y selectores de unidades funcionan.
- El usuario puede elegir una incógnita y recibe resultado, unidad, fórmula, sustitución y mensajes de datos faltantes.
- La comprobación de Bernoulli usa tolerancia numérica y no igualdad exacta de coma flotante.
- La gráfica de perfil incluye cota geométrica, línea piezométrica y línea de energía, y se actualiza con los resultados reales.
- En casos incompletos o inválidos se muestran mensajes útiles y no resultados falsos.
- La guía explica las ecuaciones realmente utilizadas.
- La aplicación se adapta a escritorio y móvil.
- El modo oscuro completo funciona mediante el interruptor visible, se conserva la preferencia entre sesiones y las gráficas y estados mantienen contraste y legibilidad.
- En móvil (ancho < lg) el tablero y todos sus rejillados internos usan **una sola columna**; a partir de `sm`/`lg` se escalan a 2–3 columnas progresivamente.
- El identidad cromática sigue las reglas de B.1: azul pastel/turquesa como acento (con la paleta `#8ECFFF`/`#56B8FF`/`#8CE8DC` y fondo oscuro `#0C1722`), verde `#5CDEA1` solo para aciertos, amarillo pastel `#FFD68A` solo para campos editables.
- `npm run build` termina correctamente.

## H. Entrega final del agente

Al terminar, informar brevemente:
- Archivos creados o modificados.
- Funciones implementadas.
- Biblioteca gráfica utilizada.
- Pruebas ejecutadas y resultado.
- Resultado real de `npm run build`.
- Comandos exactos para ejecutar el proyecto en desarrollo y previsualizar la versión de producción.
- Limitaciones pendientes, si las hay. No declarar completas las funcionalidades que no estén implementadas.

## I. Reglas de accesibilidad aprobadas (WCAG 2.2 AA)

Estas reglas complementan las secciones anteriores y son de cumplimiento obligatorio en
cualquier cambio de interfaz. No sustituyen a B.1 (identidad cromática): se aplican
ajustando contrastes sin romper la paleta acordada.

### I.1 Jerarquía y semántica

- Un solo `h1` por página; los títulos de sección son `h2` y los subgrupos internos `h3`
  (por ejemplo, «Modo de pérdidas» y «Lista de accesorios»). No se saltan niveles.
- Cada sección se etiqueta con `aria-labelledby` apuntando a su título.
- Controles nativos (`button`, `select`, `input`, `details`); no simular controles con `div`.

### I.2 Etiquetas y nombres accesibles

- Todo `input`, `select` y `textarea` tiene `label[for]`, etiqueta envolvente o `aria-label`.
- Las unidades se ven junto al campo (columna, selector de unidad o texto de la etiqueta).
- Los grupos de radios usan `role="radiogroup"` con `aria-labelledby` a un `h3` visible.
- Las listas dinámicas (accesorios) se etiquetan; cada fila declara `aria-label` completo.
- No se comunica información solo con color: los editables/calculados llevan texto
  («Editable»/«Calculado») además del relleno.

### I.3 Teclado y foco

- El enlace «Saltar al contenido» apunta a un destino con `tabindex="-1"`.
- Pestañas con patrón ARIA completo: `role="tablist"` (solo contiene pestañas; el botón de
  tema está fuera), `tabindex` móvil (0 en la activa, −1 en las demás), flechas y Home/End.
- El foco es siempre visible: `:focus-visible` con `--focus` (≥3:1 sobre el fondo). Dentro de
  la franja azul `bg-accent-strong` se usa la regla `.franja-resultado :focus-visible` con
  contorno de `--on-accent` (el anillo blanco o azul claro no alcanza 3:1).
- Las regiones con desplazamiento (`overflow-x-auto`/`overflow-y-auto`) llevan
  `tabindex="0"`, `role="region"` y `aria-label` para poder recorrerlas con teclado.
- Los valores calculados o de incógnita usan `readonly` (nunca `disabled`): siguen siendo
  enfocables y legibles; el estado se comunica con el texto «calculado»/«calculada».

### I.4 Errores y validaciones

- Un campo inválido recibe `aria-invalid="true"`, un mensaje visible propio
  (clase `.msg-error`, con glifo ⚠ oculto para lectores) y `aria-describedby` hacia ese
  mensaje; al corregir, ambos se limpian.
- Cada mensaje explica el problema **y** cómo corregirlo (rango permitido, formato numérico
  con coma o punto decimal, dejar vacío si no aplica).
- El resumen `#resultado-alertas` mantiene `role="alert"` y lista todos los fallos; indica
  además que el mensaje de cada campo aparece junto al campo.
- Ningún mensaje inyecta texto del usuario sin escapar: usar `escapeHtml` en todo
  `innerHTML` construido dinámicamente.
- El estado `#resultado-estado` (`role="status"`) añade un `span.sr-only` con
  «incógnita = valor unidad» para que el lector anuncie el resultado, no solo el veredicto.

### I.5 Gráficas (Chart.js)

- Cada lienzo lleva `role="img"`, `aria-label` descriptivo y `aria-describedby` a su
  resumen textual (`#chart-perfil-resumen`, `#chart-barras-resumen`,
  `#chart-perdidas-resumen`). Los resúmenes **no** son regiones vivas.
- Los tres resúmenes contienen los mismos números que las tablas (cotas, HGL/EGL,
  componentes, h_f/h_m/h_L); si no hay datos, explican qué falta.
- Series y bordes ≥3:1 contra el fondo del tema (blanco en claro, panel oscuro en oscuro);
  los títulos, ejes, leyendas y etiquetas de valor ≥4,5:1.
- Las etiquetas de valor se dibujan fuera de las barras (fondo limpio) o, dentro de barras
  apiladas, con color de alta contraste del tema (`etiquetaDentro`).
- Las paletas viven en `PALETTAS` de `src/ui/chart.js`; los contrastes están fijados por
  `tests/a11y.test.js` y deben seguir cumpliéndose.

### I.6 Responsive y objetivos táctiles

- En móvil (≤640px) los campos y selectores miden 16px (evita el zoom automático de iOS)
  y alcanzan 40px de alto (`.campo-editable`, `.campo-unidad`).
- Los botones principales usan `py-2 sm:py-1.5` (mayor altura en móvil, densidad en
  escritorio).
- Tablas anchas se desplazan dentro de su contenedor; el tablero usa una sola columna por
  debajo de `lg`.

### I.7 Contraste verificado (tokens)

Umbrales mínimos fijados por `tests/a11y.test.js` (texto ≥4,5:1; foco y elementos gráficos
≥3:1) en ambos temas. Tokens con ajuste aprobado:

- Claro: `--focus: #1976c4`, `--accent: #1873bd`, `--ink-soft: #546a7c` (margen sobre
  `--page` y `--surface-2`).
- Gráficas claras: series en torno a `#7a93a8`/`#2a8fd8`/`#17938a`/`#3f97db`/`#1f9e63`,
  pérdidas `#1976c4` y `#0f7f74`, etiqueta interior `#ffffff`.
- Oscuro: paleta existente (todos los pares ≥7:1); etiqueta interior `#0c1722`.

No se reintroducen colores por debajo de estos umbrales sin actualizar el test y revisar
ambos temas.

### I.8 Verificación obligatoria

- `npm test` incluye `tests/a11y.test.js` (estructura, nombres accesibles, ARIA de
  pestañas, scroll regions, errores por campo, teclado simulado, contrastes de tokens y de
  Chart.js, resúmenes de gráficas y reglas móviles). Debe pasar siempre.
- Antes de entregar, revisar además en navegador: tabulación completa, flechas en las
  pestañas, foco visible en la franja azul, mensaje de campo inválido, ambos temas y un
  viewport móvil (≈360px).
