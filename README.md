# Calculadora de Bernoulli

Aplicación para resolver ejercicios de mecánica de fluidos mediante la ecuación general de energía de Bernoulli, considerando variables hidráulicas, pérdidas de carga y unidades de entrada.

El proyecto dispone de una versión web ejecutada con Vite y puede prepararse como aplicación de escritorio mediante Electron. Los comandos exactos dependen de los scripts y las dependencias configurados en `package.json`.

## Requisitos previos

Para ejecutar el proyecto desde el código fuente, necesitas:

- **Node.js**, en una versión compatible con Vite y con las dependencias del proyecto.
- **npm**, que normalmente se instala junto con Node.js.
- Un navegador web actualizado para la versión web.

Comprueba que Node.js y npm estén disponibles:

```bash
node -v
npm -v
```

## Instalación y ejecución de la versión web

1. Abre una terminal en la carpeta raíz del proyecto, donde se encuentra `package.json`.
2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abre en el navegador la dirección que muestre la terminal. Normalmente Vite utiliza `http://localhost:5173/`, aunque el puerto puede cambiar si está ocupado.

### Compilar para producción

Genera la versión web de producción:

```bash
npm run build
```

Para previsualizar localmente la compilación, si el proyecto tiene configurado el script correspondiente:

```bash
npm run preview
```

Los comandos disponibles se encuentran en la sección `scripts` de `package.json`.

## Instalación de la versión de escritorio con Electron

El proyecto puede empaquetarse como una aplicación de escritorio mediante **Electron** y una herramienta de empaquetado como **electron-builder**, siempre que estén configurados en el proyecto.

### Generar el instalador desde el código fuente

1. Instala Node.js.
2. Abre una terminal en la carpeta raíz del proyecto.
3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Revisa los scripts de `package.json` para identificar el comando configurado para generar el instalador. Por ejemplo, si existe un script `dist`, podría ejecutarse con:

   ```bash
   npm run dist
   ```

   **Importante:** `npm run dist` es solo un ejemplo. Utiliza el nombre real definido en `package.json`; no todos los proyectos tienen ese script.

5. Al finalizar, busca el instalador en la carpeta de salida configurada por el empaquetador. Con frecuencia se utiliza `dist/` o `release/`, pero la ruta exacta depende de la configuración del proyecto.

### Instalar y ejecutar la aplicación empaquetada

- En **Windows**, ejecuta el instalador `.exe` generado y sigue las indicaciones.
- En **macOS**, utiliza el paquete generado para macOS, por ejemplo `.dmg` o `.zip`, si el proyecto está configurado para producirlo.
- En **Linux**, utiliza el formato que se haya configurado, si corresponde.

El instalador de escritorio puede incluir la aplicación compilada y el runtime de Electron, de modo que el usuario final normalmente no tenga que instalar Node.js ni ejecutar `npm install`. Esto debe confirmarse revisando el empaquetado generado.

Un instalador creado para Windows no sustituye al paquete de macOS o Linux. Cada sistema operativo requiere generar y probar su propio paquete. La distribución también puede depender de la firma de código y de las advertencias de seguridad del sistema.

### Si todavía no existe un instalador

Si `package.json` no contiene scripts de empaquetado o el proyecto no tiene configurado Electron, primero debe configurarse esa funcionalidad. No basta con ejecutar `npm run build`: ese comando normalmente genera la versión web, no un instalador de escritorio.

Antes de generar el instalador, verifica que la versión web compile correctamente y que la aplicación de escritorio cargue sus archivos, gráficas, informes y recursos sin errores.

## Tecnologías

El proyecto utiliza, según su configuración actual:

- **Vite** para el desarrollo y la compilación web.
- **JavaScript vanilla** para la lógica de la aplicación.
- **Tailwind CSS** para los estilos.
- **Chart.js** para las gráficas, cuando corresponda a la funcionalidad implementada.
- **Electron**, si está configurado, para ejecutar la aplicación como programa de escritorio.
- **electron-builder** u otra herramienta configurada, si se utiliza, para empaquetar instaladores.

No instales ni reconfigures estas tecnologías manualmente sin revisar primero `package.json` y los archivos de configuración.

## Documentación de instrucciones para agentes

El proyecto conserva dos archivos de instrucciones con objetivos distintos.

### Instrucciones originales de construcción

La versión original utilizada durante la construcción de la aplicación se encuentra en:

```text
instrucciones_construccion/AGENTS_V1.MD
```

Este archivo conserva las instrucciones originales usadas como base para desarrollar la aplicación. Se mantiene como referencia histórica y técnica; no debe interpretarse como una lista de tareas que haya que repetir en cada modificación.

### Instrucciones de mantenimiento

El archivo `AGENTS.md` ubicado en la carpeta `.opencode` contiene las instrucciones destinadas al **mantenimiento de la aplicación existente**.

Estas instrucciones orientan al agente para corregir errores o implementar cambios sobre el código actual, sin reconstruir funcionalidades que ya existen ni modificar partes ajenas a la tarea. La regla general es inspeccionar primero el comportamiento actual, realizar el cambio mínimo necesario y verificar las funciones relacionadas.

En resumen:

- `instrucciones_construccion/AGENTS_V1.MD`: instrucciones originales utilizadas para construir la aplicación.
- `.opencode/AGENTS.md`: instrucciones de mantenimiento para continuar trabajando sobre la aplicación existente.

Conserva ambos archivos: el primero documenta la construcción original y el segundo guía las modificaciones futuras.

## Uso y mantenimiento del proyecto

- Ejecuta los comandos desde la carpeta raíz del proyecto.
- Antes de cambiar dependencias, revisa `package.json`, el archivo de bloqueo y la configuración existente.
- Evita reinstalar o reconfigurar herramientas si el proyecto ya funciona correctamente.
- Después de modificar el código, ejecuta `npm run build` y corrige los errores que aparezcan.
- Si una tarea modifica cálculos hidráulicos, verifica también los resultados numéricos, las unidades y el balance de energía.
- Antes de distribuir una versión de escritorio, prueba la aplicación empaquetada; una compilación web exitosa no garantiza por sí sola que el paquete Electron funcione correctamente.

## Solución de problemas

### `node` o `npm` no se reconocen como comandos

Instala Node.js y abre una terminal nueva. Vuelve a comprobar las versiones con `node -v` y `npm -v`.

### La instalación de dependencias falla

Comprueba que estás en la carpeta que contiene `package.json` y que tienes conexión a internet. Revisa el mensaje de error antes de eliminar archivos de bloqueo o cambiar versiones de dependencias.

### El servidor de desarrollo no inicia

Lee los mensajes de la terminal y confirma que las dependencias se instalaron correctamente. Si el puerto predeterminado está ocupado, Vite puede indicar otro puerto disponible.

### La compilación web falla

Ejecuta:

```bash
npm run build
```

Revisa el primer error informado y soluciona el problema concreto sin eliminar funcionalidades ni modificar dependencias innecesariamente.

### No existe el comando para generar el instalador

Revisa la sección `scripts` de `package.json` y la configuración de Electron y del empaquetador. Si no están configurados, el instalador todavía no está preparado; no inventes ni ejecutes un comando que no exista.

### La aplicación de escritorio se abre en blanco o no carga recursos

Comprueba la ruta de los archivos compilados, la configuración de carga de Electron, las rutas de recursos estáticos y los mensajes de error. Verifica también que las gráficas y la generación de informes funcionen dentro de la aplicación empaquetada.

## Nota

Este README describe los procedimientos habituales para ejecutar y empaquetar un proyecto Vite/Electron. Los comandos disponibles, las dependencias, los formatos de instalador y las rutas de salida reales están definidos por `package.json` y por los archivos de configuración del proyecto. Verifica esos archivos antes de ejecutar comandos de empaquetado.
