import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================
const CONFIG = {

    computer: {
        streamUrl: 'https://stream.alfasistemas.com:8030/stream',
    },
    computers: [
        { name: 'compu', label: 'la radio' },
    ],

    renderer: {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        pixelRatioLimit: 2,
        shadows: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
    },
    camera: {
        fov: 45,
        near: 0.1,
        far: 150,
        initialPosition: [0, 5, 18],
        lookAt: [0, 2, 0],
        flyFov: 65,
    },
    player: {
        startPosition: [0, 8, 10], // Fallback si no se encuentra el marcador spawn_player
        eyeHeight: 1.7,            // Altura de ojos sobre el marcador de spawn
        mouseSensitivity: 0.002,
        moveSpeed: 0.5,            // caminar (antes 3.2: era demasiado rápido)
        runSpeed: 3.0,             // correr con Shift (antes 6.0: idem)
        verticalSpeed: 4.0,
        smoothing: 8.0,
        acceleration: 8.0,         // qué tan rápido el personaje alcanza la velocidad objetivo (horizontal)
        interactionDistance: 4.0,  // Distancia máxima para poder interactuar (además hay que apuntar: ver interactionScreenRadius)
        interactionScreenRadius: 0.16, // Qué tan cerca del centro de la pantalla (crosshair) debe estar el objeto, en coords de pantalla normalizadas (0 = centro exacto, 1 = borde). Más alto = más fácil de apuntar.
        cameraDistance: 0.5,       // Qué tan lejos, detrás del personaje, se ancla la cámara (estilo "over the shoulder")
        cameraMinDistance: 0.8,    // distancia mínima de la cámara al personaje (colisión contra muros)
        cameraMaxDistance: 3.2,    // distancia máxima de la cámara al personaje (zoom con rueda del mouse)
        cameraZoomSpeed: 0.3,      // cuánto cambia la distancia por "muesca" de rueda del mouse
        cameraCollisionBuffer: 0.3, // separación que deja la cámara respecto a una pared al chocar
        cameraHeight: 0.55,        // Altura del ANCLA de la cámara sobre los pies del personaje ("detrás de las rodillas", estilo God of War 2018)
        cameraBasePitch: 0.12,     // Inclinación fija hacia arriba (radianes) sumada al pitch del mouse, para que la cámara "baja" siga enmarcando al personaje en vez de mirar sólo al horizonte
        pitchMin: -0.5,            // límite inferior de inclinación de cámara (mirar hacia abajo)
        pitchMax: 0.85,            // límite superior de inclinación de cámara (mirar hacia arriba)
        characterTurnSpeed: 9.0,   // Qué tan rápido gira el personaje hacia la dirección en la que camina
        gravity: -14,          // "peso" del personaje: aceleración hacia abajo cuando no vuela manualmente
        maxFallSpeed: 20,      // velocidad máxima de caída
        groundSnapMargin: 0.05,// margen para considerar que ya está tocando el piso
        floorStepUpAllowance: 0.45, // cuánto puede "subir" el piso de un frame a otro (altura de un escalón) sin que se considere caída; SUBIR este valor si tus gradas tienen escalones más altos, pero sin acercarlo a la altura libre entre pisos (o volverá a "engancharse" con el piso de arriba)
        floorDebug: false, // ponlo en true y abre la consola (F12): cada vez que el piso encontrado esté ARRIBA de tus pies (el caso sospechoso del "teletransporte"), te dice el nombre exacto de la malla "COL_*" responsable
        voidRespawnDrop: 18,   // si el personaje cae más de esto por debajo del spawn, se reposiciona
        wallCollisionBuffer: 0.18, // separación que se deja frente a un muro ("pared*") antes de bloquear el paso (si sigues atascándote en un hueco/puerta angosto, baja este número)
        wallCollisionDebug: false, // ponlo en true para ver en la consola (F12) qué malla "pared*" te está bloqueando y dónde
    },
    model: {
        // Rutas relativas a index.html (carpeta /models)
        building: 'models/radio_nacional.glb',
        logo: 'models/logo.glb',
        character: 'models/personaje.glb',
        scaleFactor: 20,
        buildingYOffset: 1,
        logoYBase: 3.5,
        spawnNodeName: 'spawn_player',
        characterTargetHeight: 1.75, // altura "base" (en metros de escena) a la que se escala personaje.glb
        // 👉 CONTROL DE TAMAÑO: si el personaje sigue viéndose muy grande o muy chico,
        // ajusta SOLO este número (no toques characterTargetHeight). 1 = tamaño base,
        // 0.5 = mitad de tamaño, 1.5 = 50% más grande, etc.
        characterScale: 0.05,
        // Si el personaje camina "de espaldas" a hacia donde apunta la cámara, cambia este valor a 0.
        characterYawOffset: Math.PI,
        // Palabras clave (fragmentos de nombre, sin distinguir mayúsculas) para identificar los
        // clips de animación dentro de personaje.glb. Se prueban EN ORDEN y en varios idiomas,
        // porque muchos modelos (sobre todo hechos a mano, no de Mixamo) no usan nombres en
        // inglés. Si ninguna palabra clave calza con ningún clip, se usa un análisis de
        // "movimiento" (ver pickWalkAndIdleClips) para adivinar cuál es cuál sin depender del
        // nombre — así se evita el bug de "idle/walk mal detectados" aunque el .glb tenga
        // nombres raros o en otro idioma.
        characterWalkClipKeywords: ['walk', 'caminar', 'caminata', 'andar', 'run', 'correr', 'marcha'],
        characterIdleClipKeywords: ['idle', 'reposo', 'inactivo', 'quieto', 'parado', 'parada', 'standing', 'stand', 'rest', 'bind', 'tpose', 't-pose'],
    },
    tour: {
        duration: 18, // segundos que dura el recorrido cinemático guiado
    },
    welcome: {
        bannerDuration: 3600, // ms que el texto de bienvenida permanece en pantalla
    },
    // Puntos de interés: se buscan por nombre de nodo dentro del modelo del edificio.
    // Si un nodo no existe en el .glb, simplemente se omite (sin errores).
    // `useLogoModel: true` hace que ese hotspot muestre el logo.glb independiente
    // en vez de clonar el nodo del edificio (pensado para "img_logo").
    hotspots: [

      {
            name: 'poster_sala2',
            title: 'Póster "La Primera del País"',
            desc: 'El póster institucional de Radio Nacional Huanuni: su mascota, un minero con casco y lámpara frente al micrófono, representa el espíritu con el que la emisora se ganó el título de "La Primera del País" entre los oyentes del distrito.',
        },
        
        {
            name: 'poster_sala1',
            title: 'Póster de Canal Minero',
            desc: 'El póster de Canal Minero (Canal 2 HD), medio televisivo hermano de Radio Nacional de Huanuni: juntos, radio y televisión, llevaron por años la señal abierta y la voz del distrito minero a toda la región.',
        },

        {
            name: 'poster_sala',
            title: 'Póster de la Radio',
            desc: 'El póster promocional de Radio Nacional de Huanuni (RNH), FM 94.5: la imagen que identifica a la emisora en la sala, con su mascota minera y la dirección de su sitio web, símbolo de la voz que acompaña al distrito día a día.',
        },
        
        {
            name: 'cuadro_teatro1',
            title: 'Cuadro del Teatro Popular II',
            desc: 'Otra escena del teatro popular: entre los cerros y el pueblo se alza una figura protectora que vela por la comunidad minera, mientras las manos del pueblo se elevan en súplica y esperanza, retratando la fe y la memoria colectiva de Huanuni.',
        },

        {
            name: 'cuadro_radio',
            title: 'Mural del Socavón',
            desc: 'Un mural que retrata el alma minera de Huanuni: el trabajador con su dinamita y su lámpara, el Tío del socavón —figura protectora y temida de las minas—, y las imágenes de lucha y memoria revolucionaria que marcaron la historia del distrito.',
        },

        {
            name: 'antena',
            title: 'Antena de Transmisión',
            desc: 'El símbolo más visible de Radio Nacional Huanuni: desde aquí la señal llegaba a los campamentos mineros y viajaba por todo el distrito, llevando información, música y la voz de los trabajadores.',
        },
        {
            name: 'cuadro_teatro',
            title: 'Cuadro del Teatro Popular',
            desc: 'Un homenaje a las expresiones culturales y comunitarias que Radio Nacional Huanuni siempre acompañó y difundió.',
        },
        {
            name: 'img_che',
            title: 'Fotografía Histórica',
            desc: 'Una imagen emblemática de la memoria revolucionaria y sindical que acompañó por décadas a los trabajadores mineros de Huanuni.',
        },
        {
            name: 'img_logo',
            title: 'Logotipo Institucional',
            desc: 'La identidad visual de Radio Nacional Huanuni, símbolo reconocido por generaciones de oyentes del distrito minero.',
            useLogoModel: true,
        },
        {
            name: 'img_minero',
            title: 'Fotografía del Minero',
            desc: 'Un tributo a los trabajadores mineros de Huanuni, protagonistas de la historia que esta radio nació para acompañar y difundir.',
        },
        {
            name: 'banner',
            title: 'Banner de la Radio Nacional Huanuni ',
            desc: 'Banner oficila de la Radio Nacional de Huanuni, que se encuentra en la parte frontal del edificio y es visible desde la plaza principal del distrito minero.',
        },
    ],
    // Puertas y portones: se buscan por nombre y se les añade un aviso de
    // "Presiona E para abrir/cerrar" además de una animación simple de giro.
    // Nota: ya no bloquean el paso (ver sección de MOVIMIENTO más abajo),
    // es sólo una animación visual de apertura/cierre.
    //
    // `flip: true` invierte el sentido de apertura (por si la puerta gira "hacia adentro"
    // o "hacia la pared" en vez de abrirse limpiamente) — útil cuando el pivote del objeto
    // en el .glb quedó orientado al revés respecto a las demás puertas.
    doors: [
        { name: 'puerta1', label: 'la puerta' },
        { name: 'puerta2', label: 'la puerta' },
        { name: 'puerta3', label: 'la puerta' },
        { name: 'porton_iz', label: 'el portón' },
        // 🔧 FIX: el nombre tenía un punto de más ("porton._de"), por lo que nunca
        // coincidía con el nodo real del modelo y este portón quedaba siempre omitido
        // (en silencio, sin ningún error en consola). Si en tu .glb el nodo se llama
        // distinto, cambia sólo el valor de "name" por el nombre real del objeto.
        { name: 'porton_de', label: 'el portón' },
    ],
    doorAnimation: {
        openAngle: Math.PI * 0.55, // ~100°
        speed: 3.0,                // velocidad de interpolación del giro
    },
    lighting: {
        day: {
            skyColor: '#87CEEB',
            fogColor: '#a0c4e0',
            ambientColor: '#334466',
            ambientIntensity: 1.8,
            keyLightColor: '#ffe8cc',
            keyLightIntensity: 4.5,
            hemisphereSky: '#c5d8ef',
            hemisphereGround: '#2d1a0e',
            hemisphereIntensity: 0.6,
            sunColor: '#fff4e0',
            sunIntensity: 3.5,
        },
        night: {
            skyColor: '#0a0a1a',
            fogColor: '#0a0a1a',
            ambientColor: '#112244',
            ambientIntensity: 0.8,
            keyLightColor: '#ccddff',
            keyLightIntensity: 0.8,
            hemisphereSky: '#1a1a3a',
            hemisphereGround: '#0a0a0a',
            hemisphereIntensity: 0.2,
            sunColor: '#ccddff',
            sunIntensity: 0.8,
        },
        sunset: {
            skyColor: '#e07b39',
            fogColor: '#c06030',
            ambientColor: '#553322',
            ambientIntensity: 1.2,
            keyLightColor: '#ffccaa',
            keyLightIntensity: 3.0,
            hemisphereSky: '#d0a080',
            hemisphereGround: '#302010',
            hemisphereIntensity: 0.5,
            sunColor: '#ffccaa',
            sunIntensity: 2.5,
        },
    },
    particles: {
        count: 600,
        size: 0.04,
        opacity: 0.6,
    },
    stars: {
        count: 1000,
        radius: 60,
    }
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================
let mode = 'welcome';       // 'welcome' | 'fly'
let cameraMode = 'manual';  // 'tour' | 'manual'  (sólo aplica cuando mode === 'fly')
let currentTimeOfDay = 'day';
let locked = false;
let soundEnabled = false;
let audioContext = null;
let modelLoaded = false;
let buildingBox = null;
let panelOpen = false;
let aimedInteractable = null;
let tourElapsed = 0;
let tourCurves = null;
let logoModelTemplate = null; // copia "limpia" (sin escalar/posicionar) del logo.glb, para el panel de exhibición
const floorMeshes = []; // mallas "COL_*" (piso, gradas, rampas...), usadas para la colisión de piso (quedan invisibles)
const wallMeshes = [];  // mallas "pared*", usadas para bloquear el paso del personaje (colisión real de muros)
const collisionMeshes = []; // TODAS las mallas del edificio: colisión de cámara + respaldo de piso
let currentCameraDistance = CONFIG.player.cameraDistance; // distancia actual de la cámara (zoom con rueda del mouse)
// --- Personaje jugable (tercera persona) ---
let characterMixer = null;                 // THREE.AnimationMixer del personaje
let characterActions = { idle: null, walk: null };
let currentCharacterAction = null;         // acción actualmente en reproducción (para hacer crossfade)
let characterFacingYaw = 0;                // hacia dónde MIRA/gira el personaje (distinto del yaw de la cámara)
let characterHasAnimations = false;        // true sólo si personaje.glb trajo al menos un clip utilizable
let proceduralWalkPhase = 0;               // fase del "bamboleo" procedural de emergencia (ver updateProceduralWalkFallback)

// Punto de spawn: se completa (si existe) al cargar el modelo con el nodo "spawn_player"
const spawnPoint = {
    position: new THREE.Vector3(...CONFIG.player.startPosition),
    yaw: 0,
    found: false,
};

// ============================================
// INICIALIZACIÓN DE THREE.JS
// ============================================
const canvas = document.getElementById('main-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: CONFIG.renderer.antialias, alpha: CONFIG.renderer.alpha, powerPreference: CONFIG.renderer.powerPreference });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.renderer.pixelRatioLimit));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = CONFIG.renderer.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = CONFIG.renderer.toneMapping;
renderer.toneMappingExposure = CONFIG.renderer.toneMappingExposure;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.lighting.day.skyColor);
scene.fog = new THREE.Fog(CONFIG.lighting.day.fogColor, 15, 40);

const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far
);
camera.position.set(...CONFIG.camera.initialPosition);
camera.lookAt(...CONFIG.camera.lookAt);

// ============================================
// LUCES
// ============================================
const ambientLight = new THREE.AmbientLight(CONFIG.lighting.day.ambientColor, CONFIG.lighting.day.ambientIntensity);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(
    CONFIG.lighting.day.hemisphereSky,
    CONFIG.lighting.day.hemisphereGround,
    CONFIG.lighting.day.hemisphereIntensity
);
scene.add(hemisphereLight);

const keyLight = new THREE.DirectionalLight(CONFIG.lighting.day.keyLightColor, CONFIG.lighting.day.keyLightIntensity);
keyLight.position.set(8, 12, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 40;
keyLight.shadow.camera.left = -15;
keyLight.shadow.camera.right = 15;
keyLight.shadow.camera.top = 15;
keyLight.shadow.camera.bottom = -15;
scene.add(keyLight);

const rimLight = new THREE.PointLight('#c9a84c', 20, 20, 1.5);
rimLight.position.set(-3, 4, -5);
scene.add(rimLight);

const redAccent = new THREE.PointLight('#d60000', 15, 15, 1.5);
redAccent.position.set(4, 2.5, 3);
scene.add(redAccent);

// ============================================
// SOL Y LUNA
// ============================================
function createGlowSprite(color, size) {
    const canvas2 = document.createElement('canvas');
    canvas2.width = 128;
    canvas2.height = 128;
    const ctx = canvas2.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas2);
    const material = new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size, size, 1);
    return sprite;
}

const sunGlow = createGlowSprite('rgba(255,220,100,0.9)', 3.0);
sunGlow.position.set(10, 8, -10);
scene.add(sunGlow);

const moonGlow = createGlowSprite('rgba(200,200,255,0.7)', 2.0);
moonGlow.position.set(-8, 6, 5);
moonGlow.visible = false;
scene.add(moonGlow);

const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xffdd66, fog: false })
);
sunMesh.position.copy(sunGlow.position);
scene.add(sunMesh);

const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xcccccc, fog: false })
);
moonMesh.position.copy(moonGlow.position);
moonMesh.visible = false;
scene.add(moonMesh);

// ============================================
// PARTÍCULAS
// ============================================
const particlesGeo = new THREE.BufferGeometry();
const particlesPositions = new Float32Array(CONFIG.particles.count * 3);
const particlesColors = new Float32Array(CONFIG.particles.count * 3);

for (let i = 0; i < CONFIG.particles.count; i++) {
    particlesPositions[i * 3] = (Math.random() - 0.5) * 30;
    particlesPositions[i * 3 + 1] = Math.random() * 12 + 1;
    particlesPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;

    const isGold = Math.random() < 0.6;
    particlesColors[i * 3] = isGold ? 0.8 : 0.7;
    particlesColors[i * 3 + 1] = isGold ? 0.7 : 0.1;
    particlesColors[i * 3 + 2] = isGold ? 0.4 : 0.1;
}

particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
particlesGeo.setAttribute('color', new THREE.BufferAttribute(particlesColors, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: CONFIG.particles.size,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: CONFIG.particles.opacity
});

const particles = new THREE.Points(particlesGeo, particlesMaterial);
scene.add(particles);

// ============================================
// ESTRELLAS
// ============================================
const starsGeo = new THREE.BufferGeometry();
const starsPositions = new Float32Array(CONFIG.stars.count * 3);

for (let i = 0; i < CONFIG.stars.count * 3; i += 3) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = CONFIG.stars.radius + Math.random() * 30;
    starsPositions[i] = Math.sin(phi) * Math.cos(theta) * r;
    starsPositions[i + 1] = Math.sin(phi) * Math.sin(theta) * r;
    starsPositions[i + 2] = Math.cos(phi) * r;
}

starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));

const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8,
    fog: false
});

const stars = new THREE.Points(starsGeo, starsMaterial);
stars.visible = false;
scene.add(stars);

// ============================================
// GRUPOS PARA MODELOS Y HOTSPOTS
// ============================================
const buildingGroup = new THREE.Group();
const logoGroup = new THREE.Group();
const hotspotGroup = new THREE.Group();
const characterGroup = new THREE.Group(); // contiene a personaje.glb (el jugador, en tercera persona)
characterGroup.visible = false;
hotspotGroup.visible = false;
scene.add(buildingGroup);
scene.add(logoGroup);
scene.add(hotspotGroup);
scene.add(characterGroup);

const hotspots = []; // { title, desc, position, marker, sourceNode, useLogoModel }
const doors = [];    // { node, label, position, isOpen, angle, baseRotationY }
const interactables = []; // lista combinada para el sistema de "mira e interactúa"

const computers = [];
let radioAudio = null;
let radioPlaying = false;

// ============================================
// ESCENARIO DE EXHIBICIÓN 3D (panel al presionar E)
// ============================================
// Mini-escena independiente que renderiza, en su propio <canvas>, el objeto
// real recuperado de radio_nacional.glb (o el logo.glb para "img_logo"),
// girando con su propia iluminación — así el panel deja de ser sólo texto.
const exhibitScene = new THREE.Scene();
const exhibitCamera = new THREE.PerspectiveCamera(35, 1, 0.05, 20);
exhibitCamera.position.set(0, 0.25, 3.1);
exhibitCamera.lookAt(0, 0, 0);

const exhibitPivot = new THREE.Group();
exhibitScene.add(exhibitPivot);
let exhibitObject = null;

exhibitScene.add(new THREE.AmbientLight('#fff4e0', 1.7));
const exhibitKeyLight = new THREE.DirectionalLight('#ffe8cc', 2.6);
exhibitKeyLight.position.set(2.5, 3, 4);
exhibitScene.add(exhibitKeyLight);
const exhibitRimLight = new THREE.PointLight('#c9a84c', 14, 12, 2);
exhibitRimLight.position.set(-2.2, 1, -2.2);
exhibitScene.add(exhibitRimLight);

const exhibitCanvasEl = document.getElementById('exhibit-canvas');
const exhibitRenderer = new THREE.WebGLRenderer({ canvas: exhibitCanvasEl, antialias: true, alpha: true });
exhibitRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
exhibitRenderer.outputColorSpace = THREE.SRGBColorSpace;
exhibitRenderer.toneMapping = THREE.ACESFilmicToneMapping;
exhibitRenderer.toneMappingExposure = 1.15;

function resizeExhibitCanvas() {
    const w = exhibitCanvasEl.clientWidth;
    const h = exhibitCanvasEl.clientHeight;
    if (w === 0 || h === 0) return;
    exhibitRenderer.setSize(w, h, false);
    exhibitCamera.aspect = w / h;
    exhibitCamera.updateProjectionMatrix();
}

function clearExhibitStage() {
    for (let i = exhibitPivot.children.length - 1; i >= 0; i--) {
        exhibitPivot.remove(exhibitPivot.children[i]);
    }
    exhibitObject = null;
}

// Clona el nodo fuente (objeto real del edificio, o el logo.glb), lo centra
// en el origen y lo escala para que quepa siempre igual en el panel,
// sin importar el tamaño original que tenga en el modelo.
function setExhibitObject(sourceNode) {
    clearExhibitStage();
    if (!sourceNode) return null;

    // Capturamos la transformación MUNDIAL real del nodo original (incluye
    // toda la escala/posición heredada de buildingGroup y sus padres) ANTES
    // de clonar, porque el clon no tendrá padre y perdería esa herencia.
    sourceNode.updateWorldMatrix(true, false);
    const worldMatrix = sourceNode.matrixWorld.clone();

    const clone = sourceNode.clone(true);

    // Usamos esa matriz mundial capturada como la nueva transformación
    // "local" del clon (que ahora es su propia raíz sin padre).
    worldMatrix.decompose(clone.position, clone.quaternion, clone.scale);
    clone.updateMatrix();
    clone.updateMatrixWorld(true);

    clone.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.visible = true; // por si el nodo original ("COL_*") estaba oculto por ser colisión
        }
    });

    const box = new THREE.Box3().setFromObject(clone);
    if (box.isEmpty()) return null;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.6 / maxDim;

    clone.scale.multiplyScalar(scale);
    clone.position.set(
        (clone.position.x - center.x) * scale,
        (clone.position.y - center.y) * scale,
        (clone.position.z - center.z) * scale
    );
    clone.updateMatrixWorld(true);

    exhibitPivot.rotation.set(0, 0, 0);
    exhibitPivot.add(clone);
    exhibitObject = clone;
    return clone;
}
// Quita el desplazamiento NETO (X/Z, de principio a fin) de cualquier track
// de posición dentro de un AnimationClip, conservando el movimiento relativo
// natural (piernas, rebote vertical, etc.). Así una animación de caminar con
// "root motion" queda "en el sitio" y no se acumula ni "salta" al hacer loop.
// Sólo toca tracks que realmente tienen desplazamiento neto (el root/cadera);
// las demás (que ya vuelven a su posición inicial en cada ciclo) no se tocan.
function stripRootMotion(clip) {
    if (!clip || !clip.tracks) return;
    clip.tracks.forEach((track) => {
        if (!track.name.endsWith('.position') || !track.values || track.values.length < 6) return;
        const values = track.values;
        const times = track.times;
        const count = times.length;
        const startX = values[0];
        const startZ = values[2];
        const endX = values[(count - 1) * 3];
        const endZ = values[(count - 1) * 3 + 2];
        const driftX = endX - startX;
        const driftZ = endZ - startZ;
        if (Math.abs(driftX) < 1e-4 && Math.abs(driftZ) < 1e-4) return; // sin desplazamiento neto: no es el root

        const duration = (times[count - 1] - times[0]) || 1;
        for (let i = 0; i < count; i++) {
            const t = (times[i] - times[0]) / duration;
            values[i * 3] -= driftX * t;
            values[i * 3 + 2] -= driftZ * t;
        }
    });
}

// Hace que un AnimationClip "cierre" perfectamente en loop: por defecto,
// THREE.AnimationMixer usa LoopRepeat, que simplemente SALTA del último
// frame al primero cada vez que el clip termina un ciclo. Si el primer y el
// último frame de la animación no son EXACTAMENTE iguales (muy común: casi
// ningún ciclo de caminata exportado a mano queda perfectamente cerrado),
// ese salto se ve como un pequeño "teletransporte"/tirón que se repite cada
// vez que se completa un ciclo — justo lo que describe el bug de "camina un
// rato y se teletransporta un poco hacia atrás repitiendo la animación".
//
// Esta función corrige eso en TODOS los tracks (posición y rotación de cada
// hueso), redistribuyendo suavemente, a lo largo de todo el clip, la
// pequeña diferencia que exista entre el primer y el último frame — así el
// final queda calzando exactamente con el inicio y el loop no da ningún
// salto perceptible. Se aplica DESPUÉS de stripRootMotion (que ya quitó el
// desplazamiento grande e intencional del root), así que aquí sólo se
// corrigen los pequeños desajustes residuales que sobran del export.
function makeClipLoopSeamless(clip) {
    if (!clip || !clip.tracks) return;
    const _qStart = new THREE.Quaternion();
    const _qEnd = new THREE.Quaternion();
    const _qCorrection = new THREE.Quaternion();
    const _qIdentity = new THREE.Quaternion();
    const _qStep = new THREE.Quaternion();
    const _qFrame = new THREE.Quaternion();

    clip.tracks.forEach((track) => {
        const values = track.values;
        const times = track.times;
        const count = times.length;
        if (!values || count < 2) return;
        const duration = (times[count - 1] - times[0]) || 1;

        if (track.name.endsWith('.quaternion')) {
            _qStart.set(values[0], values[1], values[2], values[3]);
            _qEnd.set(values[(count - 1) * 4], values[(count - 1) * 4 + 1], values[(count - 1) * 4 + 2], values[(count - 1) * 4 + 3]);
            if (_qStart.equals(_qEnd)) return; // ya cierra perfecto: no tocar
            // Rotación que hay que "restar" al final para que quede igual al inicio.
            _qCorrection.copy(_qEnd).invert().premultiply(_qStart);
            for (let i = 0; i < count; i++) {
                const t = (times[i] - times[0]) / duration;
                _qStep.copy(_qIdentity).slerp(_qCorrection, t);
                _qFrame.set(values[i * 4], values[i * 4 + 1], values[i * 4 + 2], values[i * 4 + 3]);
                _qFrame.premultiply(_qStep);
                values[i * 4] = _qFrame.x;
                values[i * 4 + 1] = _qFrame.y;
                values[i * 4 + 2] = _qFrame.z;
                values[i * 4 + 3] = _qFrame.w;
            }
        } else if (track.name.endsWith('.position') || track.name.endsWith('.scale')) {
            for (let c = 0; c < 3; c++) {
                const startV = values[c];
                const endV = values[(count - 1) * 3 + c];
                const diff = endV - startV;
                if (Math.abs(diff) < 1e-5) continue;
                for (let i = 0; i < count; i++) {
                    const t = (times[i] - times[0]) / duration;
                    values[i * 3 + c] -= diff * t;
                }
            }
        }
    });
}

// ============================================
// DETECCIÓN ROBUSTA DE CLIPS "CAMINAR" / "QUIETO"
// ============================================
// Esta es la parte que corrige el bug de "el personaje queda congelado en una
// pose de zancada tanto al caminar como al estar quieto": antes, si ningún
// nombre de clip contenía literalmente "walk" o "idle" (por ejemplo si tu
// personaje.glb trae los clips nombrados en español, o Blender los exportó
// como "Action", "Armature|Action.002", etc.), el código elegía el clip de
// caminar "a ciegas" (el primero de la lista) y eso puede NO ser en absoluto
// una animación de caminata — de ahí que se viera siempre la misma pose fija
// sin importar si te movías o no.
//
// Ahora, además de probar varias palabras clave (inglés y español), si
// ninguna coincide se calcula cuánto "se mueve" cada clip (cuánto cambian sus
// tracks de rotación/posición de principio a fin) y se asume que el clip con
// MÁS movimiento es el de caminar, y el de MENOS movimiento (si hay un
// tercero disponible) es el de estar quieto. Esto funciona sin importar cómo
// se llamen los clips en tu archivo.
function findClipByKeywords(clips, keywords) {
    return clips.find((clip) => {
        const lower = clip.name.toLowerCase();
        return keywords.some((kw) => lower.includes(kw));
    }) || null;
}

// "Cuánto se mueve" un clip: suma, para cada track de rotación/posición, la
// diferencia entre el valor máximo y mínimo de cada componente. Un clip
// estático (o casi) da un número cercano a 0; un ciclo de caminata real da
// un número mucho más alto (piernas, brazos, cadera moviéndose bastante).
function computeClipMotionScore(clip) {
    if (!clip || !clip.tracks) return 0;
    let score = 0;
    clip.tracks.forEach((track) => {
        if (!/\.(position|quaternion|rotation)$/.test(track.name)) return;
        const values = track.values;
        if (!values || values.length < 2) return;
        // Recorremos por "componentes" (x,y,z o x,y,z,w) para no mezclar ejes distintos.
        const stride = track.name.endsWith('.quaternion') ? 4 : 3;
        for (let c = 0; c < stride; c++) {
            let min = Infinity;
            let max = -Infinity;
            for (let i = c; i < values.length; i += stride) {
                const v = values[i];
                if (v < min) min = v;
                if (v > max) max = v;
            }
            if (isFinite(min) && isFinite(max)) score += (max - min);
        }
    });
    return score;
}

// Devuelve { walkClip, idleClip } eligiendo de la forma más confiable posible
// entre TODOS los clips que trae gltf.animations.
function pickWalkAndIdleClips(clips) {
    if (!clips || clips.length === 0) return { walkClip: null, idleClip: null };
    if (clips.length === 1) return { walkClip: clips[0], idleClip: null };

    let walkClip = findClipByKeywords(clips, CONFIG.model.characterWalkClipKeywords);
    let idleClip = findClipByKeywords(clips, CONFIG.model.characterIdleClipKeywords);
    if (idleClip === walkClip) idleClip = null; // por si la misma palabra calzó con ambos

    // Si falta alguno de los dos, usamos el "puntaje de movimiento" para adivinar
    // entre los clips que todavía no fueron asignados por nombre.
    if (!walkClip || !idleClip) {
        const remaining = clips.filter((c) => c !== walkClip && c !== idleClip);
        const scored = remaining
            .map((clip) => ({ clip, score: computeClipMotionScore(clip) }))
            .sort((a, b) => b.score - a.score); // mayor movimiento primero

        if (!walkClip && scored.length > 0) {
            walkClip = scored.shift().clip; // el de más movimiento = caminar
        }
        if (!idleClip && scored.length > 0) {
            idleClip = scored.shift().clip; // el de menos movimiento restante = quieto
        }
    }

    // Última red de seguridad: si por algún motivo seguimos sin walkClip, usamos
    // cualquier clip disponible antes que dejar al personaje sin animación.
    if (!walkClip) walkClip = clips[0];
    if (idleClip === walkClip) idleClip = null;

    return { walkClip, idleClip };
}

// ============================================
// CARGA DE MODELOS GLB
// ============================================
const loader = new GLTFLoader();
const loadingBar = document.getElementById('progress-bar');
let assetsLoaded = 0;
const totalAssets = 3;

function updateLoadingProgress(progress) {
    loadingBar.style.width = `${Math.round(progress * 100)}%`;
}

// Cargar edificio principal
loader.load(
    CONFIG.model.building,
    (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = maxDim > 0 ? CONFIG.model.scaleFactor / maxDim : 1;
        model.scale.setScalar(scaleFactor);
        model.position.x = -center.x * scaleFactor;
        model.position.y = -center.y * scaleFactor + CONFIG.model.buildingYOffset;
        model.position.z = -center.z * scaleFactor;

        buildingGroup.add(model);
        buildingBox = new THREE.Box3().setFromObject(buildingGroup);
        modelLoaded = true;
                // --- Recolectar TODAS las mallas del edificio (colisión de cámara + respaldo de piso) ---
        model.traverse((child) => {
            if (child.isMesh) collisionMeshes.push(child);
        });
        // --- Recolectar mallas de colisión de piso/gradas (nombres que empiezan con "COL_") ---
        // Estos objetos SON la colisión real (piso, gradas, rampas, etc.) para que el
        // personaje camine sobre ellos, pero deben quedar invisibles: normalmente ya
        // existe geometría visual (la del edificio) justo encima o en el mismo lugar.
        // Ocultarlos NO les quita la colisión: Three.js sigue haciendo raycast sobre
        // mallas con visible = false, así que el volumen de colisión sigue activo.
        model.traverse((child) => {
            if (!child.isMesh) return;
            if (/^col_/i.test(child.name)) {
                floorMeshes.push(child);
                child.visible = false;
                child.castShadow = false;
                child.receiveShadow = false;
            }
        });
        if (floorMeshes.length === 0) {
            console.warn('⚠️ No se encontró ningún objeto con nombre "COL_*" (ej. COL_piso, COL_gradas). Se usará todo el edificio como respaldo para la colisión de piso, para que el personaje no caiga al vacío.');
        }
        console.log(`✅ Colisión de piso/gradas activa en ${floorMeshes.length || collisionMeshes.length} malla(s)${floorMeshes.length ? ` (${floorMeshes.length} oculta(s) por ser "COL_*")` : ''}.`);

        // --- Recolectar muros ("pared*") para colisión real de movimiento del personaje ---
        // A diferencia del piso, estas mallas SÍ permanecen visibles (son las paredes
        // reales del edificio); sólo se usan además como barrera para que el personaje
        // no las atraviese al caminar (ver tryMoveHorizontal / updatePlayer).
        model.traverse((child) => {
            if (child.isMesh && /^pared/i.test(child.name)) {
                wallMeshes.push(child);
            }
        });
        if (wallMeshes.length === 0) {
            console.warn('⚠️ No se encontró ningún objeto con nombre "pared*". El personaje podrá atravesar los muros.');
        }
        console.log(`✅ Colisión de muros activa en ${wallMeshes.length} malla(s) ("pared*").`);
        // --- Buscar el marcador de spawn dentro del modelo ---
        const spawnNode = model.getObjectByName(CONFIG.model.spawnNodeName);
        if (spawnNode) {
            const worldPos = new THREE.Vector3();
            spawnNode.getWorldPosition(worldPos);
            const worldQuat = new THREE.Quaternion();
            spawnNode.getWorldQuaternion(worldQuat);
            const euler = new THREE.Euler().setFromQuaternion(worldQuat, 'YXZ');

            spawnPoint.position.set(worldPos.x, worldPos.y + CONFIG.player.eyeHeight, worldPos.z);
            spawnPoint.yaw = euler.y;
            spawnPoint.found = true;
            console.log('✅ Marcador "spawn_player" encontrado:', spawnPoint.position, 'yaw:', spawnPoint.yaw.toFixed(2));
        } else {
            console.warn(`⚠️ No se encontró el marcador "${CONFIG.model.spawnNodeName}" en el modelo. Se usará la posición por defecto.`);
        }

        // --- Construir hotspots interactivos a partir de nodos con nombre ---
        CONFIG.hotspots.forEach((def) => {
            const node = model.getObjectByName(def.name);
            if (!node) {
                console.warn(`⚠️ Hotspot "${def.name}" no encontrado en el GLB — se omite.`);
                return; // El nodo no existe en este modelo: se omite sin error
            }
            const worldPos = new THREE.Vector3();
            node.getWorldPosition(worldPos);
            // Elevamos el punto de referencia (igual que el marcador visual) para
            // que el punto donde se "apunta e interactúa" coincida con lo que se ve.
            const raisedPos = worldPos.clone();
            raisedPos.y += 0.5;

            const marker = createGlowSprite('rgba(201,168,76,0.95)', 0.55);
            marker.position.copy(raisedPos);
            hotspotGroup.add(marker);

            const hotspotData = {
                title: def.title,
                desc: def.desc,
                position: raisedPos.clone(),
                marker,
                sourceNode: node,               // referencia al objeto real del edificio (para clonarlo en el panel)
                useLogoModel: !!def.useLogoModel, // true sólo para img_logo -> usa logo.glb en vez del nodo del edificio
            };
            hotspots.push(hotspotData);
            interactables.push({ type: 'info', position: hotspotData.position, ref: hotspotData });
        });

        // --- Construir puertas/portones interactivos (abrir/cerrar con E) ---
        CONFIG.doors.forEach((def) => {
            const node = model.getObjectByName(def.name);
            if (!node) {
                // 🔧 FIX: antes esto fallaba EN SILENCIO (igual que el bug del nombre
                // "porton._de" con un punto de más) y no había forma de saber, sin leer
                // el código, por qué una puerta o portón "no hacía nada". Ahora se avisa
                // igual que con los hotspots.
                console.warn(`⚠️ Puerta/portón "${def.name}" no encontrado en el GLB — revisa que el nombre coincida exactamente con el del objeto en Blender/el .glb. Se omite.`);
                return;
            }
            const worldPos = new THREE.Vector3();
            node.getWorldPosition(worldPos);

            const doorData = {
                node,
                label: def.label,
                position: worldPos.clone(),
                isOpen: false,
                angle: 0,
                baseRotationY: node.rotation.y,
                openSign: def.flip ? -1 : 1, // permite invertir el sentido de giro puerta por puerta
            };
            doors.push(doorData);
            interactables.push({ type: 'door', position: doorData.position, ref: doorData });
        });
        console.log(`✅ ${doors.length} puerta(s)/portón(es) interactivo(s) listos: ${doors.map((d) => d.node.name).join(', ') || '(ninguno)'}`);

        // --- Construir computadora(s) interactiva(s): reproducen la radio en vivo ---
        CONFIG.computers.forEach((def) => {
            const node = model.getObjectByName(def.name);
            if (!node) {
                console.warn(`⚠️ Computadora "${def.name}" no encontrada en el GLB — se omite.`);
                return;
            }
            const worldPos = new THREE.Vector3();
            node.getWorldPosition(worldPos);
            const computerData = { node, label: def.label, position: worldPos.clone() };
            computers.push(computerData);
            interactables.push({ type: 'computer', position: computerData.position, ref: computerData });
        });
        console.log(`✅ ${computers.length} computadora(s) interactiva(s) lista(s): ${computers.map((c) => c.node.name).join(', ') || '(ninguna)'}`);

        // NOTA SOBRE COLISIONES:
        // El piso/gradas ("COL_*") y la cámara usan raycast contra la geometría real
        // del edificio (ver getFloorHeightBelow y placeCharacterAndCamera). Los muros
        // ("pared*") ahora también bloquean el movimiento horizontal del personaje
        // mediante raycast a varias alturas (ver tryMoveHorizontal / updatePlayer),
        // permitiendo además "deslizarse" al chocar en diagonal contra un muro.

        // --- Construir la curva del recorrido cinemático guiado ---
        tourCurves = buildTourKeyframes(buildingBox, spawnPoint);

        assetsLoaded++;
        updateLoadingProgress(assetsLoaded / totalAssets);
        checkAllLoaded();
    },
    (xhr) => {
        if (xhr.total > 0) {
            updateLoadingProgress((xhr.loaded / xhr.total) * 0.7);
        }
    },
    (error) => {
        console.warn('⚠️ No se pudo cargar radio_nacional.glb', error);
        assetsLoaded++;
        updateLoadingProgress(assetsLoaded / totalAssets);
        checkAllLoaded();
    }
);

// Cargar logo
loader.load(
    CONFIG.model.logo,
    (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Copia "limpia" (sin escalar/posicionar todavía) para poder mostrarla
        // más tarde, centrada e independiente, dentro del panel de exhibición
        // cuando el usuario interactúa con "img_logo".
        logoModelTemplate = model.clone(true);

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = maxDim > 0 ? 2.5 / maxDim : 1;
        model.scale.setScalar(scaleFactor);
        model.position.set(
            -center.x * scaleFactor,
            -center.y * scaleFactor + CONFIG.model.logoYBase,
            -center.z * scaleFactor + 2
        );

        logoGroup.add(model);
        assetsLoaded++;
        updateLoadingProgress(assetsLoaded / totalAssets);
        checkAllLoaded();
    },
    (xhr) => {
        if (xhr.total > 0) {
            updateLoadingProgress(0.7 + (xhr.loaded / xhr.total) * 0.3);
        }
    },
    (error) => {
        console.warn('⚠️ No se pudo cargar models/logo.glb', error);
        assetsLoaded++;
        updateLoadingProgress(assetsLoaded / totalAssets);
        checkAllLoaded();
    }
);

// Cargar personaje (jugador en tercera persona, con animaciones)
loader.load(
    CONFIG.model.character,
    (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Escalar el personaje a una altura objetivo en metros de escena
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const rawHeight = size.y > 0 ? size.y : 1;
        const scaleFactor = (CONFIG.model.characterTargetHeight / rawHeight) * CONFIG.model.characterScale;
        model.scale.setScalar(scaleFactor);

        // Reubicar el modelo dentro de characterGroup para que sus PIES queden
        // exactamente en y=0 del grupo (characterGroup.position ya representa
        // el punto en el suelo donde está parado el jugador).
        const box2 = new THREE.Box3().setFromObject(model);
        model.position.y -= box2.min.y;
        model.position.x -= (box2.max.x + box2.min.x) / 2;
        model.position.z -= (box2.max.z + box2.min.z) / 2;

        characterGroup.add(model);

        // --- Animaciones ---
        if (gltf.animations && gltf.animations.length > 0) {
            characterMixer = new THREE.AnimationMixer(model);

            // 🔧 FIX PRINCIPAL: antes se usaba sólo `find(name => includes('walk'))` /
            // `includes('idle')`, y si ninguno de los clips tenía esas palabras EXACTAS en
            // inglés, "walkClip" terminaba siendo `gltf.animations[0]` sin más — que podía
            // ser cualquier cosa (una pose de reposo, un clip vacío, etc.). Eso es lo que
            // producía al personaje "congelado" en una única pose sin importar si estabas
            // caminando o quieto. Ahora se prueban palabras clave en varios idiomas y,
            // si aun así no hay coincidencia, se elige por cuánto se mueve cada clip.
            const { walkClip, idleClip } = pickWalkAndIdleClips(gltf.animations);

            if (!walkClip) {
                console.warn('⚠️ personaje.glb trae animaciones pero no se pudo identificar ningún clip de caminar utilizable.');
            } else {
                // Muchas animaciones de caminar (típicamente exportadas de Mixamo) traen
                // "root motion": el propio clip desplaza al personaje hacia adelante en
                // cada ciclo. Como nosotros ya lo movemos con WASD, eso se traduce en que
                // camina de más y luego "salta" hacia atrás al reiniciar el loop. Aquí
                // quitamos ese desplazamiento neto (X/Z) de cada track de posición, dejando
                // sólo el vaivén natural de la animación (piernas, rebote en Y, etc.).
                stripRootMotion(walkClip);
                if (idleClip) stripRootMotion(idleClip);
                // Cierra el loop de cada clip para que no "tironee"/teletransporte
                // levemente cada vez que reinicia el ciclo (ver comentario de la función).
                makeClipLoopSeamless(walkClip);
                if (idleClip) makeClipLoopSeamless(idleClip);

                characterActions.walk = characterMixer.clipAction(walkClip);
                // Dejamos la acción de caminar siempre "armada" (enabled + jugando con peso 0)
                // desde el arranque, en vez de crearla y recién llamar a .play() la primera
                // vez que se presiona una tecla. Este patrón (recomendado por los propios
                // ejemplos de three.js para crossfades) evita cualquier caso raro de
                // `.isRunning()` / `.paused` que pudiera hacer que el mixer "no avance" y el
                // personaje se vea congelado aunque técnicamente la acción esté "reproduciéndose".
                characterActions.walk.enabled = true;
                characterActions.walk.setEffectiveWeight(0);
                characterActions.walk.play();

                if (idleClip) {
                    characterActions.idle = characterMixer.clipAction(idleClip);
                    characterActions.idle.enabled = true;
                    characterActions.idle.setEffectiveWeight(1);
                    characterActions.idle.play();
                    currentCharacterAction = characterActions.idle;
                } else {
                    // No hay clip de "quieto" independiente: el personaje se queda
                    // congelado en el frame donde se pausa el clip de caminar (ver
                    // setCharacterAction) en vez de forzar un clip que no existe.
                    characterActions.idle = null;
                    characterActions.walk.setEffectiveWeight(1);
                    characterActions.walk.paused = true;
                    currentCharacterAction = characterActions.walk;
                }

                characterHasAnimations = true;
                console.log(`✅ Personaje cargado con ${gltf.animations.length} animación(es). Walk: "${walkClip.name}"${idleClip ? ` | Idle: "${idleClip.name}"` : ' | Sin clip de idle: quieto = pose congelada del clip de caminar'}`);
            }
        } else {
            // 🔧 Sin esto, antes no había NINGÚN indicio visible (sólo un console.warn)
            // de que el personaje jamás iba a animarse porque el .glb simplemente no
            // trae clips. Ahora, además de avisar más fuerte, se activa un pequeño
            // "bamboleo" procedural (ver updateProceduralWalkFallback) para que al
            // menos se note visualmente cuándo el personaje está caminando, mientras
            // se re-exporta el modelo con las animaciones incluidas.
            console.warn('⚠️ personaje.glb no trae animaciones (gltf.animations vacío). Revisa que, al exportar el .glb desde Blender/otro programa, la opción de incluir "Animations"/"Acciones" esté activada.');
            characterHasAnimations = false;
        }

        assetsLoaded++;
        updateLoadingProgress(assetsLoaded / totalAssets);
        checkAllLoaded();
    },
    (xhr) => {
        if (xhr.total > 0) {
            updateLoadingProgress(Math.min(1, (assetsLoaded + (xhr.loaded / xhr.total)) / totalAssets));
        }
    },
    (error) => {
        console.warn('⚠️ No se pudo cargar models/personaje.glb', error);
        assetsLoaded++;
        updateLoadingProgress(assetsLoaded / totalAssets);
        checkAllLoaded();
    }
);

// Cambia entre la animación "caminar" y quedarse quieto, usando pesos
// (crossfade "manual" pero robusto) en vez de encadenar fadeIn/fadeOut/play
// sueltos. Ambas acciones (si existen) están SIEMPRE en reproducción desde
// que se cargó el modelo (ver arriba); aquí sólo movemos su "weight" de 0 a 1
// y viceversa, que es la forma que three.js recomienda para evitar saltos o
// congelamientos raros.
let walkWeightTarget = 0; // 0 = quieto, 1 = caminando
const ACTION_FADE_SPEED = 6; // qué tan rápido se hace el crossfade (por segundo)

function setCharacterAction(name, delta) {
    if (!characterHasAnimations || !characterActions.walk) return;
    walkWeightTarget = name === 'walk' ? 1 : 0;

    if (!characterActions.idle) {
        // Sin clip de "quieto": simplemente pausamos/reanudamos el de caminar
        // exactamente donde estaba (nunca lo reseteamos), para no producir el
        // "salto"/teletransporte de pose que ya se corrigió antes.
        characterActions.walk.paused = walkWeightTarget === 0;
        return;
    }

    const step = Math.min(1, ACTION_FADE_SPEED * (delta || 0.016));
    const currentWalkWeight = characterActions.walk.getEffectiveWeight();
    const newWalkWeight = currentWalkWeight + (walkWeightTarget - currentWalkWeight) * step;
    characterActions.walk.setEffectiveWeight(newWalkWeight);
    characterActions.idle.setEffectiveWeight(1 - newWalkWeight);
}

// Fallback de emergencia SOLO quando personaje.glb no trae ninguna animación
// utilizable: aplica un pequeño balanceo procedural (sube/baja + leve giro de
// cadera) sobre characterGroup mientras se camina, para que al menos haya
// alguna señal visual de movimiento en vez de un maniquí completamente rígido.
// Esto es un parche temporal — lo correcto es re-exportar personaje.glb con
// sus animaciones incluidas.
function updateProceduralWalkFallback(delta, isWalking, isRunning) {
    if (characterHasAnimations) return;
    const model = characterGroup.children[0];
    if (!model) return;

    if (isWalking) {
        proceduralWalkPhase += delta * (isRunning ? 10 : 6);
        model.position.y = Math.abs(Math.sin(proceduralWalkPhase)) * 0.05;
        model.rotation.z = Math.sin(proceduralWalkPhase) * 0.03;
    } else {
        model.position.y += (0 - model.position.y) * Math.min(1, delta * 8);
        model.rotation.z += (0 - model.rotation.z) * Math.min(1, delta * 8);
    }
}

// ============================================
// SECUENCIA DE INICIO AUTOMÁTICA
// (carga -> bienvenida grande -> recorrido guiado, sin botones)
// ============================================
function checkAllLoaded() {
    if (assetsLoaded >= totalAssets) {
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
            setTimeout(showWelcomeBanner, 500);
        }, 400);
    }
}

function showWelcomeBanner() {
    const banner = document.getElementById('welcome-banner');
    banner.classList.add('visible');
    setTimeout(() => {
        banner.classList.remove('visible');
        setTimeout(beginExperience, 700);
    }, CONFIG.welcome.bannerDuration);
}

function beginExperience() {
    const fade = document.getElementById('fade-transition');
    fade.style.opacity = '1';
    fade.style.pointerEvents = 'auto';

    setTimeout(() => {
        mode = 'fly';
        camera.fov = CONFIG.camera.flyFov;
        camera.updateProjectionMatrix();

        // Ocultar el logo flotante de la bienvenida al iniciar el recorrido
        logoGroup.visible = false;

        document.getElementById('fps-counter').classList.add('visible');

        if (tourCurves) {
            startTour();
        } else {
            // Sin recorrido disponible (p. ej. el edificio no cargó): control manual directo
            endTour();
        }

        fade.style.opacity = '0';
        fade.style.pointerEvents = 'none';
    }, 900);
}

// ============================================
// RECORRIDO CINEMÁTICO GUIADO (CÁMARA DE TOUR)
// ============================================
function buildTourKeyframes(box, spawn) {
    // Si no hay caja del edificio (falló la carga), no se puede construir el recorrido
    if (!box) return null;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.z, 6);
    const topY = box.max.y;

    // Dirección "hacia adelante" del marcador de spawn (misma convención que updatePlayer)
    const forward = new THREE.Vector3(-Math.sin(spawn.yaw), 0, -Math.cos(spawn.yaw));
    const approachPos = spawn.position.clone()
        .addScaledVector(forward, -7)
        .setY(spawn.position.y + 2.2);
    const approachLook = spawn.position.clone().addScaledVector(forward, 3);

    // Puntos de posición: toma aérea amplia -> sobrevuelo -> descenso -> llegada al spawn
    const positions = [
        new THREE.Vector3(center.x + maxDim * 1.3, topY + maxDim * 1.1, center.z + maxDim * 1.3),
        new THREE.Vector3(center.x - maxDim * 1.1, topY + maxDim * 0.7, center.z + maxDim * 0.4),
        new THREE.Vector3(center.x + maxDim * 0.3, topY * 0.6 + 3, center.z - maxDim * 1.2),
        new THREE.Vector3(center.x - maxDim * 0.2, topY * 0.4 + 2, center.z + maxDim * 0.9),
        approachPos,
        spawn.position.clone(),
    ];

    // Puntos hacia donde mira la cámara en cada tramo
    const looks = [
        center.clone().setY(topY * 0.4),
        center.clone().setY(topY * 0.3),
        center.clone().setY(topY * 0.25),
        approachLook.clone().setY(spawn.position.y + 1),
        approachLook,
        spawn.position.clone().add(forward),
    ];

    return {
        positions: new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.4),
        looks: new THREE.CatmullRomCurve3(looks, false, 'catmullrom', 0.4),
    };
}

function startTour() {
    cameraMode = 'tour';
    tourElapsed = 0;
    document.getElementById('tour-overlay').classList.add('visible');
    document.getElementById('tour-progress-bar').style.width = '0%';
}

function endTour() {
    cameraMode = 'manual';
    document.getElementById('tour-overlay').classList.remove('visible');

    player.position.copy(spawnPoint.position);
    player.velocity.set(0, 0, 0);
    player.yaw = spawnPoint.yaw;
    player.pitch = 0;
    characterFacingYaw = spawnPoint.yaw;

    // Aseguramos que el personaje arranque apoyado en un piso real (si existe
    // geometría debajo del spawn) antes de dejar que la gravedad actúe — así
    // se evita que, justo al terminar el recorrido, el personaje empiece a
    // caer porque su altura de spawn no coincidía exactamente con el suelo.
    const snapY = getFloorHeightBelow(player.position.x, player.position.z, player.position.y - CONFIG.player.eyeHeight);
    if (snapY !== null) {
        player.position.y = snapY + CONFIG.player.eyeHeight;
    }

    placeCharacterAndCamera(); // posiciona al personaje y la cámara en tercera persona

    revealManualUI();

    if (!spawnPoint.found) {
        showToast('No se encontró el marcador "spawn_player": usando posición por defecto');
    }
}

function revealManualUI() {
    document.getElementById('top-left').classList.add('visible');
    document.getElementById('flight-data').classList.add('visible');
    document.getElementById('btn-help').classList.add('visible');
    document.getElementById('crosshair').classList.add('visible');
    document.getElementById('center-message').classList.add('visible');
    document.getElementById('center-message').classList.remove('hidden');
    hotspotGroup.visible = true;
    characterGroup.visible = true;
}

document.getElementById('btn-skip-tour').addEventListener('click', () => {
    if (cameraMode === 'tour') endTour();
});

// ============================================
// CONTROL DE DÍA / NOCHE / ATARDECER
// ============================================
const btnDayNight = document.getElementById('btn-daynight');

function setTimeOfDay(mode) {
    currentTimeOfDay = mode;
    const config = CONFIG.lighting[mode];
    if (!config) return;

    scene.background = new THREE.Color(config.skyColor);
    scene.fog.color = new THREE.Color(config.fogColor);

    ambientLight.color.set(config.ambientColor);
    ambientLight.intensity = config.ambientIntensity;
    hemisphereLight.color.set(config.hemisphereSky);
    hemisphereLight.groundColor.set(config.hemisphereGround);
    hemisphereLight.intensity = config.hemisphereIntensity;
    keyLight.color.set(config.keyLightColor);
    keyLight.intensity = config.keyLightIntensity;

    const timeValue = document.getElementById('time-value');
    if (timeValue) {
        timeValue.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    if (mode === 'day') {
        sunMesh.visible = true;
        sunGlow.visible = true;
        moonMesh.visible = false;
        moonGlow.visible = false;
        stars.visible = document.getElementById('stars').checked;
        btnDayNight.textContent = '☀️';
    } else if (mode === 'night') {
        sunMesh.visible = false;
        sunGlow.visible = false;
        moonMesh.visible = true;
        moonGlow.visible = true;
        stars.visible = document.getElementById('stars').checked;
        btnDayNight.textContent = '🌙';
    } else if (mode === 'sunset') {
        sunMesh.visible = true;
        sunMesh.material.color.set('#ffaa66');
        sunGlow.visible = true;
        sunGlow.material.color.set('rgba(255,150,80,0.8)');
        moonMesh.visible = false;
        moonGlow.visible = false;
        stars.visible = false;
        btnDayNight.textContent = '🌇';
    }
}

function toggleDayNight() {
    if (currentTimeOfDay === 'day') setTimeOfDay('sunset');
    else if (currentTimeOfDay === 'sunset') setTimeOfDay('night');
    else setTimeOfDay('day');
}

btnDayNight.addEventListener('click', toggleDayNight);

// ============================================
// SONIDO AMBIENTE
// ============================================
const btnSound = document.getElementById('btn-sound');

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (!soundEnabled) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        const volumeSlider = document.getElementById('volume');
        const volumeValue = volumeSlider ? parseFloat(volumeSlider.value) : 0.5;
        gainNode.gain.setValueAtTime(0.02 * volumeValue, audioContext.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        soundEnabled = true;
        btnSound.textContent = '🔊';
        oscillator.onended = () => { soundEnabled = false; btnSound.textContent = '🔇'; };
        window.__ambientOsc = oscillator;
        window.__ambientGain = gainNode;
    } else {
        if (window.__ambientOsc) {
            window.__ambientOsc.stop();
            soundEnabled = false;
            btnSound.textContent = '🔇';
        }
    }
}

btnSound.addEventListener('click', initAudio);

// ============================================
// CONTROL DEL JUGADOR (VUELO LIBRE / MANUAL)
// ============================================
const player = {
    position: new THREE.Vector3(...CONFIG.player.startPosition),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
};

const keys = {};
const mouse = { x: 0, y: 0 };

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyN') toggleDayNight();
    if (e.code === 'KeyZ') resetPosition();

    if (mode === 'fly' && cameraMode === 'manual') {
        if (e.code === 'KeyE') {
            if (panelOpen) {
                closeHotspotPanel();
            } else if (aimedInteractable) {
                if (aimedInteractable.type === 'door') {
                    toggleDoor(aimedInteractable.ref);
                } else if (aimedInteractable.type === 'computer') {
                    toggleRadioStream();
                } else if (aimedInteractable.type === 'info') {
                    openHotspotPanel(aimedInteractable.ref);
                }
            } else {
                player.yaw += 0.05;
            }
        }
        if (e.code === 'KeyQ' && !panelOpen) player.yaw -= 0.05;
    }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (locked && mode === 'fly' && cameraMode === 'manual') {
        const sens = parseFloat(document.getElementById('sensitivity').value);
        player.yaw -= e.movementX * CONFIG.player.mouseSensitivity * sens;
        player.pitch -= e.movementY * CONFIG.player.mouseSensitivity * sens;
        player.pitch = Math.max(CONFIG.player.pitchMin, Math.min(CONFIG.player.pitchMax, player.pitch));
    }
});

// Zoom de la cámara en tercera persona con la rueda del mouse (sólo en modo manual).
window.addEventListener('wheel', (e) => {
    if (mode !== 'fly' || cameraMode !== 'manual' || panelOpen) return;
    currentCameraDistance += Math.sign(e.deltaY) * CONFIG.player.cameraZoomSpeed;
    currentCameraDistance = Math.max(
        CONFIG.player.cameraMinDistance,
        Math.min(CONFIG.player.cameraMaxDistance, currentCameraDistance)
    );
}, { passive: true });

function resetPosition() {
    if (mode !== 'fly' || cameraMode !== 'manual') return;
    player.position.copy(spawnPoint.position);
    player.velocity.set(0, 0, 0);
    player.yaw = spawnPoint.yaw;
    player.pitch = 0;
    characterFacingYaw = spawnPoint.yaw;
    placeCharacterAndCamera();
    showToast('Posición reiniciada al punto de partida');
}

// Reposiciona al jugador en el spawn sin mostrar el mensaje de "reinicio manual"
// — se usa como red de seguridad si el personaje cae fuera de cualquier piso.
function respawnFromVoid() {
    player.position.copy(spawnPoint.position);
    player.velocity.set(0, 0, 0);
    characterFacingYaw = spawnPoint.yaw;
    placeCharacterAndCamera();
    showToast('Fuera de los límites del recorrido: reposicionando…');
}

// Interpola el ángulo `a` hacia `b` por el camino más corto (evita que el
// personaje gire "la vuelta larga" al cruzar de -180° a 180°).
function lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
}

const _cameraRaycaster = new THREE.Raycaster();
const _cameraBackward = new THREE.Vector3();
const _cameraAnchor = new THREE.Vector3();
const _cameraLookDir = new THREE.Vector3();
const _cameraLookTarget = new THREE.Vector3();

// Coloca a personaje.glb en el suelo bajo player.position y ancla la cámara
// DETRÁS de él, en tercera persona — estilo "God of War" (2018): la cámara
// vive en un punto fijo, bajo, justo detrás de las rodillas del personaje.
// Al mover el mouse arriba/abajo, la cámara NO se traslada ni orbita: sólo
// GIRA sobre ese mismo punto (como girar la cabeza), mirando más arriba o
// más abajo. Cuando el personaje gira (yaw), el ancla sí se recalcula cada
// frame para seguir estando detrás de él.
function placeCharacterAndCamera() {
    // player.position representa la altura de "ojos"; los pies del personaje
    // van CONFIG.player.eyeHeight más abajo.
    const groundY = player.position.y - CONFIG.player.eyeHeight;
    characterGroup.position.set(player.position.x, groundY, player.position.z);
    characterGroup.rotation.y = characterFacingYaw + CONFIG.model.characterYawOffset;

    // "Atrás" del personaje = opuesto a hacia dónde mira/camina (mismo yaw
    // que usa updatePlayer para "forward").
    _cameraBackward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw));

    let finalDistance = currentCameraDistance;

    // --- Colisión de cámara contra la geometría real del edificio ---
    // Si hay un muro entre el personaje y el punto donde debería anclarse la
    // cámara, la acercamos justo antes del obstáculo (sin atravesarlo).
    if (collisionMeshes.length > 0) {
        const rayOrigin = new THREE.Vector3(player.position.x, groundY + CONFIG.player.cameraHeight, player.position.z);
        _cameraRaycaster.set(rayOrigin, _cameraBackward);
        _cameraRaycaster.far = currentCameraDistance;
        _cameraRaycaster.near = 0.01;
        const hits = _cameraRaycaster.intersectObjects(collisionMeshes, true);
        if (hits.length > 0) {
            finalDistance = Math.max(
                CONFIG.player.cameraMinDistance,
                hits[0].distance - CONFIG.player.cameraCollisionBuffer
            );
        }
    }

    // Ancla fija: altura constante ("rodillas"), detrás del personaje según su yaw actual.
    _cameraAnchor.set(
        player.position.x + _cameraBackward.x * finalDistance,
        groundY + CONFIG.player.cameraHeight,
        player.position.z + _cameraBackward.z * finalDistance
    );
    camera.position.copy(_cameraAnchor);

    // La cámara sólo ROTA desde ese punto fijo: yaw = misma dirección en la
    // que mira/camina el personaje; pitch = control vertical del mouse, más
    // un sesgo fijo hacia arriba para encuadrar bien al personaje.
    const effectivePitch = player.pitch + CONFIG.player.cameraBasePitch;
    _cameraLookDir.set(
        -Math.sin(player.yaw) * Math.cos(effectivePitch),
        Math.sin(effectivePitch),
        -Math.cos(player.yaw) * Math.cos(effectivePitch)
    );
    _cameraLookTarget.copy(camera.position).add(_cameraLookDir);
    camera.lookAt(_cameraLookTarget);
}
const _floorRaycaster = new THREE.Raycaster();
const _floorDownVec = new THREE.Vector3(0, -1, 0);

// Busca la altura del piso justo debajo de (x, z), lanzando un rayo hacia
// abajo desde un poco arriba de refY. Usa las mallas "COL_*" (piso, gradas,
// rampas...) si existen; si el modelo no trae ningún nodo "COL_*", usa como
// respaldo TODA la geometría del edificio, para que siempre haya algo bajo
// los pies del personaje y nunca caiga al vacío. Devuelve null sólo si de
// verdad no hay ninguna geometría debajo.
//
// `upSearch`: cuánto más ARRIBA de refY empieza a buscar el rayo. Con un
// edificio de varios pisos esto es importante: si vas bajando una grada y
// upSearch es demasiado grande (p. ej. 2m), el rayo puede arrancar por
// ENCIMA de la losa del piso de arriba y "engancharse" con ella en vez de
// seguir bajando hasta el escalón real — eso es lo que se veía como
// "teletransportarse" al piso de arriba al bajar las gradas. Por eso, para
// el chequeo continuo mientras se camina se usa un upSearch chico (sólo lo
// necesario para subir un escalón), y sólo en el reposicionamiento inicial
// (spawn/reset, donde sí puede haber una diferencia grande de altura que
// salvar) se usa uno más generoso.
function getFloorHeightBelow(x, z, refY, upSearch = 2) {
    const meshes = floorMeshes.length > 0 ? floorMeshes : collisionMeshes;
    if (meshes.length === 0) return null;
    _floorRaycaster.set(new THREE.Vector3(x, refY + upSearch, z), _floorDownVec);
    _floorRaycaster.far = 30 + upSearch;
    const hits = _floorRaycaster.intersectObjects(meshes, true);
    if (hits.length === 0) return null;

    if (CONFIG.player.floorDebug && hits[0].point.y > refY + 0.02) {
        // El piso encontrado está ARRIBA de donde están tus pies ahora mismo:
        // este es justo el caso sospechoso de "teletransporte hacia arriba".
        // Si esto se imprime constantemente al bajar una grada, la malla que
        // aparece acá (normalmente el "COL_piso" del piso de arriba) casi
        // seguro NO tiene un hueco real cortado en la geometría donde pasa
        // la escalera — el mismo tipo de problema que el hueco de la puerta.
        console.log(`🧭 [floorDebug] Piso encontrado ARRIBA de los pies: "${hits[0].object.name}" en y=${hits[0].point.y.toFixed(2)} (pies en y=${refY.toFixed(2)})`);
    }

    return hits[0].point.y;
}

// ============================================
// COLISIÓN DE MUROS ("pared*")
// ============================================
const _wallRaycaster = new THREE.Raycaster();
// Alturas (en metros, sobre los PIES del personaje) a las que se lanza un
// rayo para comprobar si hay un muro en el camino. Varias alturas cubren
// piernas/torso/cabeza y evitan que el personaje "pase por debajo" o "por
// encima" de un muro fino mal detectado a una sola altura.
const _wallCheckHeights = [0.35, 1.0, 1.6];
const _wallNormal2D = new THREE.Vector3();

// Lanza rayos horizontales (a varias alturas) desde `feetPos` en la
// dirección `dir` (normalizada, sólo X/Z) hasta `distance` metros. Devuelve
// el impacto más cercano entre todas las alturas, o null si no hay muro.
function raycastWalls(feetPos, dir, distance) {
    if (wallMeshes.length === 0 || distance <= 0.0001) return null;
    let closest = null;
    for (const h of _wallCheckHeights) {
        _wallRaycaster.set(new THREE.Vector3(feetPos.x, feetPos.y + h, feetPos.z), dir);
        _wallRaycaster.near = 0;
        _wallRaycaster.far = distance;
        const hits = _wallRaycaster.intersectObjects(wallMeshes, true);
        if (hits.length > 0 && (!closest || hits[0].distance < closest.distance)) {
            closest = hits[0];
        }
    }
    return closest;
}

// Intenta mover al personaje `moveVec` (X/Z) desde `feetPos`, respetando los
// muros ("pared*"). A diferencia de probar X y Z por separado (lo cual hacía
// que el personaje se trabara en el borde de un hueco/puerta aunque el
// camino real en diagonal estuviera libre), primero se prueba el
// desplazamiento COMPLETO en su dirección real. Sólo si ese camino directo
// de verdad choca contra un muro, se desliza a lo largo de él usando la
// normal del impacto (igual que en un juego en 3ª persona real), en vez de
// bloquear por eje.
function tryMoveHorizontal(feetPos, moveVec) {
    const distance = Math.hypot(moveVec.x, moveVec.z);
    if (distance < 0.0001) return moveVec.clone();

    const dir = new THREE.Vector3(moveVec.x, 0, moveVec.z).normalize();
    const checkDist = distance + CONFIG.player.wallCollisionBuffer;
    const hit = raycastWalls(feetPos, dir, checkDist);

    // Si no hay impacto, o el muro más cercano está más lejos de lo que nos
    // vamos a mover ESTE frame (sólo dentro del margen de seguridad), el
    // camino está libre: nos movemos completo (incluida la diagonal).
    if (!hit || hit.distance >= distance) return moveVec.clone();

    if (CONFIG.player.wallCollisionDebug) {
        console.log(`🧱 Bloqueado por "${hit.object.name}" a ${hit.distance.toFixed(2)}m`);
    }

    // Normal horizontal del impacto, para deslizar "a lo largo" de la pared
    // en vez de frenar en seco.
    _wallNormal2D.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
    _wallNormal2D.y = 0;
    if (_wallNormal2D.lengthSq() < 0.0001) return new THREE.Vector3(0, 0, 0);
    _wallNormal2D.normalize();

    const slideVec = moveVec.clone().sub(_wallNormal2D.clone().multiplyScalar(moveVec.dot(_wallNormal2D)));
    const slideDist = Math.hypot(slideVec.x, slideVec.z);
    if (slideDist < 0.0001) return new THREE.Vector3(0, 0, 0);

    const slideDir = new THREE.Vector3(slideVec.x, 0, slideVec.z).normalize();
    const slideHit = raycastWalls(feetPos, slideDir, slideDist + CONFIG.player.wallCollisionBuffer);
    if (!slideHit || slideHit.distance >= slideDist) return slideVec;

    return new THREE.Vector3(0, 0, 0); // ni deslizando hay paso: se queda quieto
}

function updatePlayer(delta) {
    if (!modelLoaded || mode !== 'fly' || cameraMode !== 'manual') return;
    if (panelOpen) {
        player.velocity.set(0, 0, 0);
        return;
    }
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    // "right" = forward rotado 90° en sentido horario (visto desde arriba), para
    // que la tecla D mueva realmente hacia la derecha y A hacia la izquierda.
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const moveDir = new THREE.Vector3(0, 0, 0);
    if (keys['KeyW']) moveDir.add(forward);
    if (keys['KeyS']) moveDir.sub(forward);
    if (keys['KeyA']) moveDir.sub(right);
    if (keys['KeyD']) moveDir.add(right);
    const isWalking = moveDir.length() > 0;
    if (isWalking) moveDir.normalize();

    const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    const speed = isRunning ? CONFIG.player.runSpeed : CONFIG.player.moveSpeed;

    const targetVelX = moveDir.x * speed;
    const targetVelZ = moveDir.z * speed;
    const accel = CONFIG.player.acceleration;
    player.velocity.x += (targetVelX - player.velocity.x) * Math.min(1, accel * delta);
    player.velocity.z += (targetVelZ - player.velocity.z) * Math.min(1, accel * delta);

    let verticalInput = 0;
    if (keys['Space'] || keys['KeyR']) verticalInput += 1;
    if (keys['ControlLeft'] || keys['ControlRight'] || keys['KeyF']) verticalInput -= 1;

    if (verticalInput !== 0) {
        // Vuelo manual (subir/bajar con Espacio/R o Ctrl/F)
        const targetVelY = verticalInput * CONFIG.player.verticalSpeed;
        player.velocity.y += (targetVelY - player.velocity.y) * Math.min(1, CONFIG.player.smoothing * delta);
    } else {
        // "Peso": si no se sube/baja manualmente, la gravedad tira del personaje hacia abajo
        player.velocity.y += CONFIG.player.gravity * delta;
        player.velocity.y = Math.max(player.velocity.y, -CONFIG.player.maxFallSpeed);
    }

    // --- Movimiento horizontal con colisión real de muros ("pared*") ---
    // Se prueba el desplazamiento real (incluida la diagonal) de una sola
    // vez; si choca, desliza a lo largo del muro según su normal. Esto es lo
    // que permite cruzar un hueco/puerta angosto caminando en diagonal, sin
    // quedar atrapado en el borde como pasaba probando X y Z por separado.
        const feetPos = new THREE.Vector3(player.position.x, player.position.y - CONFIG.player.eyeHeight, player.position.z);
    const prevFeetY = feetPos.y; // 🔧 altura de los pies ANTES de moverse
    const desiredMove = new THREE.Vector3(player.velocity.x * delta, 0, player.velocity.z * delta);
    const allowedMove = tryMoveHorizontal(feetPos, desiredMove);
    player.position.x += allowedMove.x;
    player.position.z += allowedMove.z;
    player.position.y += player.velocity.y * delta;

    // --- Colisión de piso (barrida) ---
    // 🔧 El rayo parte desde la altura ANTERIOR de los pies, no la nueva. Así,
    // aunque en un frame el personaje baje mucho, el piso que cruzó sigue siendo detectado.
    const feetY = player.position.y - CONFIG.player.eyeHeight;
    const floorY = getFloorHeightBelow(player.position.x, player.position.z, prevFeetY, CONFIG.player.floorStepUpAllowance);
    if (floorY !== null && feetY <= floorY + CONFIG.player.groundSnapMargin) {
        player.position.y = floorY + CONFIG.player.eyeHeight;
        if (player.velocity.y < 0) player.velocity.y = 0;
    }

    // --- Red de seguridad: si por cualquier motivo no hay piso debajo (fuera
    // de los límites del edificio, hueco en la geometría, etc.) y el personaje
    // cae demasiado por debajo del punto de partida, se reposiciona en el
    // spawn en vez de seguir cayendo indefinidamente "al vacío".
    if (player.position.y < spawnPoint.position.y - CONFIG.player.voidRespawnDrop) {
        respawnFromVoid();
        return;
    }

    // El personaje gira hacia la dirección real en la que se está caminando
    // (no hacia donde mira la cámara): así, al presionar sólo A gira y camina
    // a la izquierda, sólo D gira y camina a la derecha, etc. Si no se
    // presiona ninguna tecla de movimiento, se queda quieto mirando igual.
    if (isWalking) {
        const targetYaw = Math.atan2(-moveDir.x, -moveDir.z);
        characterFacingYaw = lerpAngle(characterFacingYaw, targetYaw, Math.min(1, CONFIG.player.characterTurnSpeed * delta));
    }

    placeCharacterAndCamera();

    // Animación: sólo "camina" mientras se presiona una tecla de movimiento (W/A/S/D)
    if (characterMixer) {
        setCharacterAction(isWalking ? 'walk' : 'idle', delta);
        // La animación de caminar avanza más rápido si el jugador está corriendo (Shift)
        if (characterActions.walk) {
            characterActions.walk.timeScale = isRunning ? 1.6 : 1.0;
        }
    }
    // Si el .glb no trae animaciones utilizables, al menos se ve un pequeño
    // bamboleo procedural mientras se camina (ver función más arriba).
    updateProceduralWalkFallback(delta, isWalking, isRunning);

    const speedMag = Math.sqrt(player.velocity.x**2 + player.velocity.y**2 + player.velocity.z**2);
    document.getElementById('speed-value').textContent = speedMag.toFixed(1);
    document.getElementById('alt-value').textContent = player.position.y.toFixed(1);
}

// ============================================
// PUERTAS Y PORTONES INTERACTIVOS (abrir/cerrar con E)
// ============================================
function toggleDoor(door) {
    door.isOpen = !door.isOpen;
    showToast(door.isOpen ? `Abriendo ${door.label}...` : `Cerrando ${door.label}...`);
}

// ============================================
// COMPUTADORA INTERACTIVA: PRENDE/APAGA LA RADIO EN VIVO
// ============================================
function toggleRadioStream() {
    if (!radioAudio) {
        radioAudio = new Audio(CONFIG.computer.streamUrl);
        radioAudio.crossOrigin = 'anonymous';
        radioAudio.preload = 'none';
    }
    if (radioPlaying) {
        radioAudio.pause();
        radioPlaying = false;
        showToast('Radio apagada');
    } else {
        radioAudio.play().catch((err) => {
            console.warn('No se pudo reproducir el stream:', err);
            showToast('No se pudo conectar con la radio en vivo');
        });
        radioPlaying = true;
        showToast('Sintonizando Radio Nacional de Huanuni FM 94.5...');
    }
}

function updateDoors(delta) {
    if (doors.length === 0) return;
    const { openAngle, speed } = CONFIG.doorAnimation;
    doors.forEach((door) => {
        const target = door.isOpen ? openAngle * door.openSign : 0;
        door.angle += (target - door.angle) * Math.min(1, speed * delta);
        door.node.rotation.y = door.baseRotationY + door.angle;
    });
}

// ============================================
// HOTSPOTS Y PUERTAS: DETECCIÓN DE "MIRA" (aim + proximidad)
// ============================================
const _forwardVec = new THREE.Vector3();
const _toHotspotVec = new THREE.Vector3();
const _screenPos = new THREE.Vector3();
// Pequeño margen extra a favor de los hotspots informativos frente a puertas
// cuando ambos están casi igual de centrados en pantalla: evita que una
// puerta cercana "robe" la interacción cuando en realidad se está apuntando
// a un cuadro/foto/logo justo al lado.
const INFO_SCREEN_BIAS = 0.02;

// Sistema de apuntado en ESPACIO DE PANTALLA: en vez de comparar ángulos 3D
// (poco intuitivo y frágil cuando cámara/personaje/objeto no están alineados
// de forma "limpia"), proyectamos cada objeto interactuable a coordenadas de
// pantalla y comprobamos si cae dentro de un pequeño círculo alrededor del
// crosshair central. Esto es exactamente lo que el jugador ve: "si el punto
// de mira está sobre el objeto, se puede interactuar" — y ya no depende de
// la posición/altura exacta del hotspot respecto al personaje.
function updateInteractionAim() {
    if (interactables.length === 0) return;

    camera.getWorldDirection(_forwardVec);
    let best = null;
    let bestScreenDist = Infinity;

    for (const item of interactables) {
        // 1) Debe estar razonablemente cerca del personaje.
        _toHotspotVec.copy(item.position).sub(characterGroup.position);
        const dist = _toHotspotVec.length();
        if (dist > CONFIG.player.interactionDistance || dist < 0.001) continue;

        // 2) Debe estar delante de la cámara (si no, "project" da resultados
        // reflejados y aparecería como si estuviese apuntado por error).
        _toHotspotVec.copy(item.position).sub(camera.position);
        if (_toHotspotVec.dot(_forwardVec) <= 0.05) continue;

        // 3) Debe caer cerca del centro de la pantalla (crosshair).
        _screenPos.copy(item.position).project(camera);
        const screenDist = Math.hypot(_screenPos.x, _screenPos.y);
        const maxRadius = CONFIG.player.interactionScreenRadius + (item.type === 'info' ? INFO_SCREEN_BIAS : 0);
        if (screenDist > maxRadius) continue;

        if (screenDist < bestScreenDist) {
            bestScreenDist = screenDist;
            best = item;
        }
    }

    aimedInteractable = best;
    const hint = document.getElementById('interact-hint');
    if (aimedInteractable && !panelOpen) {
        if (aimedInteractable.type === 'door') {
            const d = aimedInteractable.ref;
            hint.textContent = `Presiona [E] para ${d.isOpen ? 'cerrar' : 'abrir'} ${d.label}`;
        } else if (aimedInteractable.type === 'computer') {
            hint.textContent = `Presiona [E] para ${radioPlaying ? 'apagar' : 'encender'} ${aimedInteractable.ref.label}`;
        } else {
            hint.textContent = `Presiona [E] para ver: ${aimedInteractable.ref.title}`;
        }
        hint.classList.add('visible');
    } else {
        hint.classList.remove('visible');
    }
}

function openHotspotPanel(hotspot) {
    panelOpen = true;
    document.getElementById('interact-hint').classList.remove('visible');
    document.getElementById('hotspot-title').textContent = hotspot.title;
    document.getElementById('hotspot-desc').textContent = hotspot.desc;

    // Mostrar el objeto 3D real (clonado) en vez de sólo texto: el nodo del
    // edificio para la mayoría de hotspots, o el logo.glb independiente
    // cuando el hotspot es "img_logo".
    const exhibitStage = document.getElementById('exhibit-stage');
    const sourceNode = hotspot.useLogoModel ? logoModelTemplate : hotspot.sourceNode;

    if (sourceNode) {
        exhibitStage.classList.add('visible');
        requestAnimationFrame(() => {
            resizeExhibitCanvas();
            setExhibitObject(sourceNode);
        });
    } else {
        exhibitStage.classList.remove('visible');
        clearExhibitStage();
    }

    document.getElementById('hotspot-panel').classList.add('visible');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function closeHotspotPanel() {
    panelOpen = false;
    document.getElementById('hotspot-panel').classList.remove('visible');
    clearExhibitStage();
    player.velocity.set(0, 0, 0); // 🔧
    clock.getDelta();             // 🔧 descarta el tiempo transcurrido con el panel abierto
    if (mode === 'fly' && cameraMode === 'manual') canvas.requestPointerLock();
}

document.getElementById('hotspot-close').addEventListener('click', closeHotspotPanel);

// ============================================
// INTERACCIÓN MOUSE (PARALLAX EN BIENVENIDA)
// ============================================
const baseCameraPos = new THREE.Vector3(...CONFIG.camera.initialPosition);
const baseCameraLook = new THREE.Vector3(...CONFIG.camera.lookAt);

// ============================================
// PANTALLA COMPLETA
// ============================================
document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
    }
});

// ============================================
// AYUDA
// ============================================
document.getElementById('btn-help').addEventListener('click', () => {
    showToast('WASD: mover | Espacio/R: subir | Ctrl/F: bajar | Q/E: rotar (o interactuar) | Shift: correr | Rueda: zoom cámara | N: día/noche | Z: reiniciar');
});

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================
// PANEL DE AJUSTES
// ============================================
const settingsPanel = document.getElementById('settings-panel');
const btnSettings = document.getElementById('btn-settings');

btnSettings.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
});

document.getElementById('quality').addEventListener('change', (e) => {
    const quality = e.target.value;
    if (quality === 'high') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        keyLight.shadow.mapSize.set(2048, 2048);
    } else if (quality === 'medium') {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        keyLight.shadow.mapSize.set(1024, 1024);
    } else {
        renderer.setPixelRatio(1);
        keyLight.shadow.mapSize.set(512, 512);
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('exposure').addEventListener('input', (e) => {
    renderer.toneMappingExposure = parseFloat(e.target.value);
});

document.getElementById('particles').addEventListener('change', (e) => {
    particles.visible = e.target.checked;
});

document.getElementById('stars').addEventListener('change', (e) => {
    stars.visible = e.target.checked && currentTimeOfDay === 'night';
});

document.getElementById('volume').addEventListener('input', (e) => {
    if (window.__ambientGain && audioContext) {
        window.__ambientGain.gain.setValueAtTime(0.02 * parseFloat(e.target.value), audioContext.currentTime);
    }
});

// ============================================
// BOTÓN "TOMAR CONTROL" AL TERMINAR EL RECORRIDO
// ============================================
// Nota: esto sigue necesitando un click porque los navegadores exigen un
// gesto real del usuario para poder bloquear el puntero (Pointer Lock API)
// — por eso el inicio automático (carga -> bienvenida -> recorrido) no
// necesita ningún botón, pero pasar a control manual después sí lo pide.
document.getElementById('btn-start').addEventListener('click', () => {
    canvas.requestPointerLock();
    document.getElementById('center-message').classList.add('hidden');
});

canvas.addEventListener('click', () => {
    if (!locked && mode === 'fly' && cameraMode === 'manual' && !panelOpen) canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (mode === 'fly' && cameraMode === 'manual') {
        if (locked) {
            document.getElementById('center-message').classList.add('hidden');
        } else if (!panelOpen) {
            document.getElementById('center-message').classList.remove('hidden');
        }
    }
});

// ============================================
// FPS
// ============================================
const fpsCounter = document.getElementById('fps-counter');
let frameCount = 0;
let lastFpsTime = performance.now();
function updateFPS() {
    if (mode !== 'fly') return;
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 500) {
        fpsCounter.textContent = `FPS: ${Math.round((frameCount / (now - lastFpsTime)) * 1000)}`;
        frameCount = 0;
        lastFpsTime = now;
    }
}

// ============================================
// ANIMACIÓN PRINCIPAL
// ============================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    if (mode === 'welcome') {
        // Logo volador (solo en modo bienvenida)
        if (logoGroup.children.length > 0 && logoGroup.visible) {
            const angle = time * 0.5;
            const radius = 1.5;
            logoGroup.position.x = Math.sin(angle) * radius;
            logoGroup.position.y = CONFIG.model.logoYBase + Math.sin(time * 1.2) * 0.5;
            logoGroup.position.z = 2 + Math.cos(angle) * radius * 0.5;
            logoGroup.rotation.y += delta * 0.4;
            logoGroup.rotation.x = Math.sin(time * 0.6) * 0.1;
        }

        // Parallax de cámara
        const targetX = baseCameraPos.x + mouse.x * 1.5;
        const targetY = baseCameraPos.y + mouse.y * 0.8;
        camera.position.x += (targetX - camera.position.x) * 0.05;
        camera.position.y += (targetY - camera.position.y) * 0.05;
        camera.position.z = baseCameraPos.z;

        const lookTarget = new THREE.Vector3(
            baseCameraLook.x + mouse.x * 0.3,
            baseCameraLook.y + mouse.y * 0.2,
            baseCameraLook.z
        );
        camera.lookAt(lookTarget);
    } else {
        if (cameraMode === 'tour' && tourCurves) {
            tourElapsed += delta;
            const t = Math.min(tourElapsed / CONFIG.tour.duration, 1);
            const pos = tourCurves.positions.getPoint(t);
            const look = tourCurves.looks.getPoint(t);
            camera.position.copy(pos);
            camera.lookAt(look);

            const bar = document.getElementById('tour-progress-bar');
            if (bar) bar.style.width = `${Math.round(t * 100)}%`;

            if (t >= 1) endTour();
        } else {
            updatePlayer(delta);
            updateInteractionAim();
        }
        updateFPS();
    }

    // Animación de apertura/cierre de puertas y portones (siempre activa)
    updateDoors(delta);

    // Animación (idle/caminar) del personaje jugable
    if (characterMixer) characterMixer.update(delta);

    // Animación sutil de los marcadores de hotspots (pulso)
    if (hotspotGroup.visible) {
        hotspotGroup.children.forEach((marker, i) => {
            const s = 0.55 + Math.sin(time * 2 + i * 1.3) * 0.08;
            marker.scale.set(s, s, 1);
        });
    }

    particles.rotation.y += delta * 0.03;
    particles.rotation.x += delta * 0.01;

    renderer.render(scene, camera);

    // Renderizar el objeto 3D real dentro del panel de exhibición (si está abierto)
    if (panelOpen && exhibitObject) {
        exhibitPivot.rotation.y += delta * 0.6;
        exhibitRenderer.render(exhibitScene, exhibitCamera);
    }
}

animate();

// ============================================
// RESIZE
// ============================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (panelOpen) resizeExhibitCanvas();
});

console.log('🖥️ Experiencia 3D unificada (con recorrido guiado, exhibición 3D real, colisión de muros y COL_* invisibles, detección robusta de animaciones y puertas corregidas, computadora con radio en vivo) cargada correctamente.');