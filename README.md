# Radio Nacional Huanuni — Museo 3D Interactivo

## Estructura del proyecto

```
radio-huanuni-3d/
├── index.html                 # Estructura HTML + contenedores de UI del museo
├── css/
│   └── styles.css             # Estilos: HUD, hotspots, panel de exhibición 3D, bienvenida
├── js/
│   └── main.js                # TODO el sistema (ver secciones comentadas dentro del archivo)
└── models/
    ├── radio_nacional.glb     # ⚠️ Tu modelo principal del edificio
    └── logo.glb                # Logo institucional (flotante en bienvenida y en el panel de "img_logo")
```

## Qué cambió en esta versión

### 1. Inicio 100% automático, sin botones
Antes había una pantalla de bienvenida con un botón "EXPLORAR EL ENTORNO 3D".
Ahora el flujo es:

1. **Pantalla de carga** (única pantalla que ve el usuario antes de entrar).
2. Al terminar de cargar, aparece **solo, automáticamente**, un texto grande
   *"Bienvenido a Radio Nacional Huanuni"* durante unos segundos
   (`CONFIG.welcome.bannerDuration` en `main.js`, por defecto 3.6s).
3. El texto se desvanece y **arranca directo el recorrido cinemático
   guiado**, sin ningún click.

La única pantalla que sí pide un click es la de **"TOMA EL CONTROL"**, que
aparece *después* de terminar el recorrido guiado, para pasar a exploración
manual. Eso no se pudo quitar: los navegadores exigen un gesto real del
usuario para poder activar el bloqueo del puntero (Pointer Lock API), así
que ese único click es una limitación del navegador, no una decisión de
diseño.

### 2. Colliders retirados (se "bugueaban")
Se quitó por completo el sistema de colisiones AABB (piso/paredes/puertas)
que traía el proyecto. El vuelo ahora es 100% libre en las 3 direcciones,
sin bloqueos ni atascos.

**Por qué se bugueaba y cómo hacerlo bien si lo quieres de vuelta** (por
ejemplo para un modo "caminar" en vez de volar): está explicado en detalle
como comentario justo arriba de `tryMovePlayerAxis()` en `main.js`. Resumen:

- Las cajas (`Box3`) alineadas a los ejes casi nunca coinciden con la forma
  real de un edificio con ángulos, escaleras o huecos — eso es lo que
  produce que el jugador se quede atascado o "vibre" contra una esquina
  invisible.
- Para el piso: mejor usar un `Raycaster` hacia abajo desde los pies del
  jugador contra la malla real (`raycaster.intersectObject(buildingGroup, true)`)
  en vez de una lista de nombres + caja.
- Para paredes/objetos sólidos: usar la librería `three-mesh-bvh` para
  construir un BVH sobre la malla real y resolver colisión jugador
  (cápsula) vs. malla — es el enfoque estándar en three.js y evita el
  atasco típico de cajas mal ajustadas.
- Si prefieres mantenerlo simple con cajas: computar cada `Box3` después de
  aplicar escala/posición final, revisar en consola que el tamaño tenga
  sentido, separar colisión de piso (sólo bloquea hacia abajo) de colisión
  de pared (bloquea X/Z), y resolver siempre eje por eje (X, luego Y, luego
  Z) — mezclar todo en un solo array de cajas suele ser la causa principal
  de que el jugador quede pegado al entrar a una habitación.

### 3. Interacción 3D real al presionar "E" (no solo texto)
Cada hotspot (`antena`, `cuadro_teatro`, `TV`, `img_che`, `img_minero`,
etc.) ahora, al presionar `E`, abre un panel que además del título y la
descripción muestra **el objeto 3D real recuperado de
`radio_nacional.glb`**, girando sobre sí mismo con su propia iluminación —
no es una foto ni un ícono, es el mismo mesh clonado del edificio.

Para el hotspot **`img_logo`** en particular, el panel usa el modelo
independiente **`logo.glb`** en vez del nodo del edificio (se activa con
`useLogoModel: true` en su definición dentro de `CONFIG.hotspots`).

Esto se implementa con una mini-escena de three.js independiente
(`exhibitScene` / `exhibitCamera` / `exhibitRenderer`, en `main.js`) que
renderiza dentro de un `<canvas>` propio (`#exhibit-canvas`) colocado
arriba del texto en el panel.

Si agregas un hotspot nuevo, con sólo darle `name` (el nombre exacto del
nodo en el `.glb`) ya se mostrará su objeto 3D real automáticamente — no
hace falta configurar nada más, salvo que quieras forzar `useLogoModel`.

### 4. El resto se mantiene igual
Cámara cinematográfica de acercamiento a hotspots, sistema día/noche/
atardecer, partículas, estrellas, sonido ambiente, ajustes, puertas y
portones (`porton_iz` / `porton_de`, abren/cierran con `E`, ya no bloquean
el paso — es sólo la animación de giro), detección de "mira" por
proximidad + ángulo, y `spawn_player` para la posición inicial.

## ⚠️ Dónde colocar tu información real

Todo está en el array `CONFIG.hotspots`, arriba del todo de `js/main.js`.
Ahí puedes:

- Cambiar `title`, `desc` de cada punto de interés.
- Cambiar `name` si el nodo en tu `.glb` se llama distinto (revisa la
  consola del navegador: cada hotspot no encontrado se avisa con
  `⚠️ Hotspot "..." no encontrado en el GLB`).
- Añadir un hotspot nuevo copiando el patrón de los existentes.
- Marcar `useLogoModel: true` en cualquier hotspot que deba mostrar
  `logo.glb` en vez del nodo del edificio.

Para los portones, ajusta `CONFIG.doorAnimation` (ángulo y velocidad de
apertura) si giran hacia el lado equivocado.

## Nota sobre CDN vs módulos ES

Se mantiene `<script type="importmap">` + `import * as THREE` (módulos
ES), igual que en la versión original — no se convirtió a nada distinto.

## Cómo probar paso a paso

### 1. Inicio automático
1. Abre `index.html` (con servidor local, ver más abajo).
2. Verás sólo la pantalla de carga con la barra de progreso.
3. Al terminar, aparece solo el texto grande de bienvenida.
4. Sin tocar nada, empieza el recorrido cinemático guiado.

### 2. Interacciones con objeto 3D real
1. Al terminar el recorrido, presiona "EXPLORAR LIBREMENTE" (único click
   necesario, por la razón explicada arriba).
2. Vuela hacia un hotspot dorado. Cuando aparezca "Pulsa E para ver...",
   presiona `E`.
3. El panel se abre mostrando el objeto real girando arriba del texto
   (o el `logo.glb` si es `img_logo`).
4. Presiona `E` o el botón `✕` para cerrar y seguir explorando.

### 3. Vuelo libre sin colliders
1. Vuela en cualquier dirección con `WASD` + `Espacio`/`Ctrl` — ya no hay
   bloqueos ni atascos contra el edificio.
2. Si quieres recolisiones más adelante, revisa las recomendaciones en el
   comentario sobre `tryMovePlayerAxis()` en `main.js`.

### 4. Portones
1. Acércate al portón (dentro de 7 metros, mirando hacia él).
2. Verás "Pulsa E para abrir". Al presionar `E`, ambas hojas
   (`porton_iz` / `porton._de`) giran suavemente hacia afuera (sólo
   animación visual, ya no bloquean el paso).
3. Vuelve a presionar `E` estando cerca para cerrarlo.

## Cómo correrlo

Necesitas un servidor local (los módulos ES y la carga de `.glb` no
funcionan con doble clic sobre `index.html`):

```bash
cd radio-huanuni-3d
npx serve .
# o
python3 -m http.server 8000
```

Abre `http://localhost:8000` en tu navegador.
