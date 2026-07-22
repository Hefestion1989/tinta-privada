# Tinta Privada

Aplicación local y de código abierto para narradores, escritores y personas que quieran experimentar libremente con relatos, personajes y roleplay adulto mediante modelos instalados en LM Studio.

> Escritura libre en tu computadora: tus historias no necesitan salir de ella.

Tinta Privada funciona como un escritorio narrativo: organiza universos, canon, personajes, escenas y memoria, mientras LM Studio ejecuta el modelo. No forma parte de Tinta Viva, no comparte su almacenamiento y no necesita enviar historias a servicios externos.

## Libertad narrativa y privacidad

La aplicación admite narrativa general, romance y contenido erótico o explícito entre personajes adultos. Tinta Privada no agrega filtros de contenido: la respuesta concreta depende del modelo local elegido y de su configuración.

La interfaz funciona en `localhost`, las llamadas al modelo se dirigen al LM Studio del mismo equipo y los relatos se guardan en el perfil local del navegador. El proyecto no incorpora cuentas, telemetría ni una nube propia. El objetivo es ofrecer un espacio discreto para probar ideas, practicar escritura, construir novelas interactivas o desarrollar roleplay sin entregar el material a un servicio externo.

## Funciones

- modos `Relato` y `Roleplay`;
- universos, canon, reglas y tono para novelas extensas;
- fichas de personajes inequívocamente adultos;
- psicología, deseos, necesidades, miedos, voz, relaciones y límites;
- escenas `canon` o `sandbox`;
- memoria fijada y notas de estilo;
- importación de Markdown, texto y paquetes `.tintaprivada.json`;
- exportación portable y Markdown;
- streaming y selección de modelos locales;
- guardado automático en el navegador de este equipo.

## Requisitos

- Windows 10 u 11;
- Node.js 22.13 o posterior;
- [LM Studio](https://lmstudio.ai/) con al menos un modelo de texto instalado;
- Git, solamente si vas a clonar el repositorio.

Los modelos no se incluyen ni se redistribuyen con el proyecto.

## Instalación

```powershell
git clone https://github.com/Hefestion1989/tinta-privada.git
cd tinta-privada
npm install
npm test
.\Iniciar-Tinta-Privada.ps1
```

La aplicación usa `http://localhost:3000` y el servidor local de LM Studio en `http://127.0.0.1:1234`.

El iniciador intenta localizar `lms.exe`, enciende el servidor, espera a que responda y carga un modelo cuando no hay ninguno activo. El selector superior permite cambiar de modelo sin mantener varios cargados a la vez.

## Desarrollo

```powershell
npm run dev
npm run lint
npm run build
npm test
```

## Arquitectura

- `app/`: interfaz y rutas locales para chat y modelos;
- `app/api/chat`: proxy de generación hacia LM Studio;
- `app/api/models`: catálogo y estado del motor;
- `app/api/models/switch`: descarga y carga controlada de modelos;
- `examples/`: ejemplos optativos de persistencia;
- almacenamiento narrativo: `localStorage` del navegador;
- exportación: Markdown o paquetes `.tintaprivada.json`.

La interfaz se sirve localmente y las llamadas a LM Studio pasan por el servidor de Tinta Privada para evitar problemas de CORS. Los puertos locales no están pensados para exponerse a Internet.

## Publicación web

GitHub Pages puede mostrar la documentación del proyecto, pero no ejecutar la aplicación completa: Tinta Privada necesita un servidor Node local y acceso al LM Studio instalado en el mismo equipo.

## Licencia

El código se distribuye bajo la [licencia MIT](LICENSE). Los modelos y materiales importados mantienen sus propias licencias.
