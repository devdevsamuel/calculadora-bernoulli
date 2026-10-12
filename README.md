# Calculadora de Bernoulli

Aplicación web para resolver ejercicios de mecánica de fluidos mediante la ecuación general de energía de Bernoulli, considerando las variables hidráulicas, las pérdidas de carga y las unidades de entrada.

## Requisitos previos

Antes de instalar el proyecto, asegúrate de tener instalado:

- **Node.js** en una versión compatible con la versión de Vite utilizada por el proyecto.
- **npm**, que normalmente se instala junto con Node.js.
- Un navegador web actualizado.

Para comprobar que Node.js y npm están disponibles, ejecuta en una terminal:

```bash
node -v
npm -v
```

## Instalación y ejecución local

1. Abre una terminal en la carpeta raíz del proyecto, donde se encuentra `package.json`.
2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. La terminal mostrará la dirección local en la que se ejecuta la aplicación. Abre esa dirección en el navegador; normalmente Vite utiliza `http://localhost:5173/`.

### Compilar para producción

Para comprobar y generar la versión de producción:

```bash
npm run build
```

Si deseas previsualizar localmente el resultado de la compilación:

```bash
npm run preview
```

La dirección exacta que muestra la terminal es la que debes abrir en el navegador. Los comandos disponibles pueden verificarse en la sección `scripts` del archivo `package.json`.

## Tecnologías

El proyecto utiliza las tecnologías definidas en su configuración actual, entre ellas:

- Vite para el entorno de desarrollo y la compilación.
- JavaScript vanilla para la lógica de la aplicación.
- Tailwind CSS para los estilos.
- Chart.js para las gráficas, cuando corresponda a la funcionalidad existente.

No es necesario volver a configurar estas tecnologías para ejecutar la aplicación: instala las dependencias del proyecto con `npm install`.

## Documentación de instrucciones para agentes

El proyecto conserva dos archivos de instrucciones con objetivos distintos:

### Instrucciones originales de construcción

La versión original utilizada durante la construcción de la aplicación se encuentra en:

```text
instrucciones_construccion/AGENTS_V1.MD
```

Este archivo contiene las instrucciones de construcción originales que se usaron como base para desarrollar la aplicación. Se conserva como referencia histórica y técnica; no debe interpretarse como una lista de tareas que haya que repetir en cada modificación.

### Instrucciones de mantenimiento

El archivo `AGENTS.md` ubicado en la carpeta `.opencode` contiene las instrucciones destinadas al **mantenimiento de la aplicación existente**.

Estas instrucciones orientan al agente para trabajar sobre el código actual, corregir errores o implementar cambios solicitados sin reconstruir funcionalidades que ya existen ni modificar partes ajenas a la tarea. La regla general es revisar primero la estructura y el comportamiento actuales, realizar el cambio mínimo necesario y verificar que las funciones relacionadas sigan trabajando correctamente.

En resumen:

- `instrucciones_construccion/AGENTS_V1.MD`: instrucciones originales usadas para construir la aplicación.
- `.opencode/AGENTS.md`: instrucciones de mantenimiento para continuar trabajando sobre la aplicación existente.

Conserva ambos archivos: el primero documenta el proceso original de construcción y el segundo guía las modificaciones futuras.

## Uso y mantenimiento del proyecto

- Trabaja desde la carpeta raíz del proyecto para ejecutar los comandos de npm.
- Antes de cambiar dependencias, revisa `package.json` y la configuración existente.
- Evita reinstalar o reconfigurar herramientas si el proyecto ya funciona correctamente.
- Después de hacer cambios, ejecuta `npm run build` y corrige los errores que aparezcan.
- Si una tarea modifica cálculos hidráulicos, verifica también los resultados numéricos y las unidades correspondientes.

## Solución de problemas

**`npm` o `node` no se reconocen como comandos**

Instala Node.js y abre una terminal nueva. Vuelve a comprobar las versiones con `node -v` y `npm -v`.

**La instalación de dependencias falla**

Comprueba que estás en la carpeta que contiene `package.json` y que tienes conexión a internet. Revisa el mensaje de error antes de eliminar archivos de bloqueo o cambiar versiones de dependencias.

**El servidor de desarrollo no inicia**

Lee los mensajes de la terminal y confirma que las dependencias se instalaron correctamente. Si el puerto predeterminado está ocupado, Vite puede indicar otro puerto disponible.

**La compilación falla**

Ejecuta `npm run build` y revisa el primer error informado. Soluciona el problema concreto sin eliminar funcionalidades ni modificar dependencias innecesariamente.

## Nota

Este README describe el procedimiento habitual para ejecutar un proyecto Vite. Los comandos exactos y las dependencias instaladas están definidos por los archivos de configuración del propio proyecto, especialmente `package.json`.
