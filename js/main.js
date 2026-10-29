import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================
const CONFIG = {

    computer: {
        streamUrl: 'https://stream.alfasistemas.com:8030/stream',
        connectTimeout: 12000, // ms esperando a que empiece a sonar antes de dar el error "tardó demasiado"
        stallTimeout: 8000,    // ms sin audio (ya sonando) antes de dar el error "se perdió la señal"
    },
    // Modo foto: marca de agua y texto para compartir
    photo: {
        maxSide: 2048,                      // lado más largo (px) de la imagen final
        siteLabel: 'radionacionaldehuanuni.com',
        shareText: 'Mira mi visita a la Radio Nacional Huanuni en 3D 📻',
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
    outline: {
    enabled: true,
    edgeStrength: 5,
    edgeGlow: 0.5,
    edgeThickness: 2,
    pulsePeriod: 2,
    colorPending: '#e0c878',
    colorSeen: '#6ed796',
    colorDoor: '#ffffff',
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
    // Narración de las historias: voz de locutor leyendo cada capítulo.
    // 1) Si existe una grabación real (ej. otros/narracion/historia_1.mp3, historia_2.mp3 ...
    //    teatro_1.mp3 ...) se usa esa: es la mejor opción para un locutor de verdad.
    // 2) Si no existe, se usa la voz en español del navegador (síntesis de voz).
    narration: {
        enabled: true,
        audioFolder: 'otros/narracion/', // nombres: <historia>_<capitulo>.mp3 → historia_1.mp3, teatro_3.mp3
        storyIds: ['historia', 'teatro'], // mismo orden que HISTORY_STORIES
        rate: 0.93,      // velocidad de la voz de síntesis (1 = normal)
        pitch: 0.8,      // tono: más grave = más "locutor"
        gapAfter: 1.1,   // segundos de pausa al terminar un capítulo antes de pasar al siguiente
        musicDuck: 0.18, // la música baja a este % mientras se cuenta una historia
    },
    // Guía y progreso: contador de descubrimientos + minimapa
    guide: {
        minimapRange: 11,   // metros de escena que se ven desde el centro del minimapa hasta el borde
        minimapSize: 176,   // px
    },
    welcome: {
        bannerDuration: 3600, // ms que el texto de bienvenida permanece en pantalla
    },
    // Historia narrada: se abre al cruzar el cubo "mostrar_historia" (el cubo queda
    // invisible; sólo se usa su volumen como zona disparadora). Los textos están
    // basados en fuentes reales; cada capítulo lleva su referencia al pie en `cite`.
    history: {
        nodeName: 'mostrar_historia',
        margin: 0.35, // margen (m de escena) alrededor del cubo para activar la zona
        // Puntos de cámara (empties de Blender). Capítulo N usa hist_cam_N (dónde se para la
        // cámara) y hist_look_N (hacia dónde mira). Sin puntos ni espacios ni .001 en los nombres.
        camPrefix: 'hist_cam_',
        lookPrefix: 'hist_look_',
        // Paneo de izquierda a derecha durante cada capítulo (grados en total). 0 = cámara fija.
        panDegrees: 30,
        chapters: [
            {
                year: 'XIX', tag: 'Cerro de las Minas', kicker: 'Prólogo · El pueblo del estaño',
                title: 'Huanuni, <span>Kcoya Orco</span>',
                text: [
                    'Antes de que existiera una radio, existía la mina. Según relatos históricos, este lugar se conocía como <strong>Kcoya Orco</strong>, "Cerro de las Minas", y fue descubierto en el siglo XIX.',
                    'Ya en el siglo XX, el yacimiento perteneció a <strong>Simón I. Patiño</strong>, el gran "barón del estaño", uno de los hombres más ricos del mundo en su tiempo.',
                ],
                stats: [{ n: 1919, l: 'el sindicato conquista la jornada de 8 horas' }, { n: 1952, l: 'las minas son nacionalizadas' }],
                cite: 'Fuente: Upside Down World (s. f.)',
            },
            {
                year: '1947', tag: 'Los mineros toman la palabra', kicker: 'Contexto · Radios mineras de Bolivia',
                title: 'Nace la <span>voz del minero</span>',
                text: [
                    'El <strong>31 de octubre de 1947</strong> se fundó La Voz del Minero, la primera de las radios sindicales mineras de Bolivia: emisoras que pertenecían a los trabajadores y hablaban por ellos.',
                    'Después llegaron muchas más: Radio 21 de Diciembre, Radio Vanguardia de Colquiri, Radio 16 de Marzo de mina Bolívar… y, en Oruro, Radio Nacional de Huanuni.',
                ],
                cite: 'Fuente: Aguirre (s. f.)',
            },
            {
                year: '1952', tag: 'Nacionalización de las minas', kicker: 'Revolución Nacional',
                title: 'Las minas pasan al <span>Estado</span>',
                text: [
                    'El <strong>31 de octubre de 1952</strong>, el gobierno de Víctor Paz Estenssoro expropió las minas de Simón I. Patiño, Carlos Víctor Aramayo y Mauricio Hochschild, los tres "barones del estaño".',
                    'Se creó la Corporación Minera de Bolivia (COMIBOL) y, con ella, los mineros pasaron a ser trabajadores del Estado.',
                ],
                stats: [{ n: 3, l: 'grandes empresas expropiadas' }],
                fact: 'La primera emisora de Huanuni se llamó Radio 31 de Octubre, una fecha que coincide con la de la nacionalización.',
                cite: 'Fuentes: Upside Down World (s. f.); Eju.tv (2013)',
            },
            {
                year: '1950', tag: 'Radio 31 de Octubre', kicker: 'El primer micrófono',
                title: 'Antes de ser Nacional, fue <span>"31 de Octubre"</span>',
                text: [
                    'A comienzos de la década de 1950 ya funcionaba en Huanuni una emisora llamada <strong>Radio 31 de Octubre</strong>, propiedad del <strong>Sindicato Mixto de Trabajadores Mineros de Huanuni</strong>.',
                    'Transmitía desde la sección Hullman. Era pequeña, pero sembró la idea: que los mineros tuvieran su propio medio para comunicarse.',
                ],
                cite: 'Fuentes: Villcaez López (s. f.); Resistencias de las radios populares en Bolivia (s. f.)',
            },
            {
                year: '1958', tag: 'Nace Radio Nacional Huanuni', kicker: 'Fundación',
                title: 'Una radio pagada por <span>los mineros</span>',
                text: [
                    'La emisora fue refundada como <strong>Radio Nacional Huanuni</strong>: se le dio ese nombre en 1957 y empezó a funcionar como tal en 1958 (otra fuente la ubica en 1959).',
                    'Nació por iniciativa de los trabajadores. Cada obrero aportó de su bolsillo para adquirirla, y su mantenimiento se sostuvo con parte del salario de todos. Entre sus impulsores se recuerda al dirigente <strong>Celestino Gutiérrez Navarro</strong> y al secretario de cultura <strong>Hilarión Lima</strong>.',
                    'Es una radio de <strong>propiedad social</strong>: pertenece a los mineros, no a una empresa ni a un partido.',
                ],
                stats: [{ n: 5000, l: 'bolivianos aportó cada obrero', suffix: ' Bs' }, { n: 1, l: 'día de salario para mantenerla', suffix: ' día' }],
                cite: 'Fuentes: Resistencias de las radios populares en Bolivia (s. f.); La radio Nacional de Huanuni (2007)',
            },
            {
                year: '70s', tag: 'La emisora piloto', kicker: 'Escuela de radialistas',
                title: 'Su voz <span>cruzó fronteras</span>',
                text: [
                    'Huanuni fue considerada la <strong>emisora piloto</strong> de la gran cadena de radios mineras, y su señal en onda corta llegaba más allá de Bolivia: aún se conservan cortinas de los años 70 que anunciaban su canal en onda corta.',
                    'De sus cabinas salieron reporteros y locutores que luego trabajaron en las capitales del país. Para muchos comunicadores, fue una escuela.',
                ],
                fact: 'Hoy quedan pocas radios mineras en pie. Radio Nacional de Huanuni es una de las que sobrevive.',
                cite: 'Fuentes: La radio Nacional de Huanuni (2007); Wood (s. f.); O\'Connor (2004)',
            },
            {
                year: 'HOY', tag: 'FM 94.5 · Huanuni, Oruro', kicker: 'Un legado vivo',
                title: 'La voz que <span>sigue en el aire</span>',
                text: [
                    'Radio Nacional de Huanuni transmite en <strong>FM 94.5</strong>, las 24 horas, y también por internet. Su lema lo resume todo: <strong>"Voz sindicalista del minero boliviano"</strong>.',
                    'Más de seis décadas después, sigue acompañando el trabajo, las celebraciones y los duelos de Huanuni. Entrar a esta radio es entrar a la memoria de su gente.',
                ],
                stats: [{ n: 94.5, l: 'frecuencia modulada', suffix: ' FM', dec: 1 }, { n: 24, l: 'horas al aire', suffix: ' h' }, { n: 65, l: 'años o más de historia', prefix: '+' }],
                cite: 'Fuente: Radio Nacional de Huanuni (s. f.)',
            },
        ],
    },
    // ============================================================
    // HISTORIA DEL TEATRO (independiente de la historia principal)
    // Se abre al cruzar el cubo "mostrar_historia_1". Cuenta para qué se usa el teatro:
    // reuniones, programas solidarios del canal 2 minero y actividades culturales.
    // Usa sus propios empties de cámara: hist1_cam_N / hist1_look_N (N = número de capítulo).
    // Si faltan los empties, la cámara se queda donde está y mira al personaje (no da error).
    // ============================================================
    historyTheater: {
        nodeName: 'mostrar_historia_1',
        margin: 0.35,
        camPrefix: 'hist1_cam_',
        lookPrefix: 'hist1_look_',
        // Plano único: TODOS los capítulos usan hist1_cam_1 / hist1_look_1 (sin cortes ni
        // fundidos entre capítulos). El paneo de `panDegrees` (izquierda → derecha) se reparte
        // de forma continua a lo largo de toda la historia, no por capítulo.
        fixedShot: 1,
        panDegrees: 30,
        chapters: [
            {
                year: 'TEATRO', tag: 'Un lugar de encuentro', kicker: 'Teatro · Radio Nacional Huanuni',
                title: 'El teatro de <span>la comunidad minera</span>',
                text: [
                    'Este teatro es mucho más que una sala: es el lugar donde Huanuni se junta. Aquí se llevan a cabo <strong>reuniones</strong>, <strong>programas solidarios</strong> y <strong>presentaciones culturales</strong>.',
                    'Trabajadores, familias, escuelas y artistas comparten el mismo escenario.',
                ],
                cite: 'Información sobre el uso del teatro · Radio Nacional Huanuni',
            },
            {
                year: 'REUNIONES', tag: 'Trabajadores y familias', kicker: 'Teatro · Se reúnen los mineros',
                title: 'Reuniones de los <span>trabajadores mineros</span> y sus familias',
                text: [
                    'Aquí se realizan las <strong>reuniones de los trabajadores mineros</strong>, para conversar y tomar decisiones juntos.',
                    'También se reúnen las <strong>amas de casa de los trabajadores mineros</strong>: las esposas y madres de la comunidad, que siempre han sido parte fundamental de la vida del distrito.',
                ],
                cite: 'Información sobre el uso del teatro · Radio Nacional Huanuni',
            },
            {
                year: 'SECCIONES', tag: 'Dirigentes', kicker: 'Teatro · Las voces de cada sección',
                title: 'Dirigentes de <span>cada sección</span>',
                text: [
                    'El teatro también recibe las <strong>reuniones de los dirigentes de cada sección</strong> de la empresa minera Huanuni.',
                    'Allí se juntan quienes representan a los trabajadores de cada sector de la mina para coordinar, compartir información y llevar la voz de su gente.',
                ],
                cite: 'Información sobre el uso del teatro · Radio Nacional Huanuni',
            },
            {
                year: 'SOLIDARIDAD', tag: 'Canal 2 Minero', kicker: 'Teatro · Programas solidarios',
                title: 'El <span>Canal 2 Minero</span> y la solidaridad',
                text: [
                    'El <strong>Canal 2 Minero</strong> utiliza este teatro para sus <strong>programas de solidaridad</strong>.',
                    'Por ejemplo, para celebrar el <strong>Día del Niño</strong>, la <strong>Navidad</strong> y otras fechas especiales, en las que la comunidad se une para compartir con los más pequeños y las familias.',
                ],
                cite: 'Información sobre el uso del teatro · Radio Nacional Huanuni',
            },
            {
                year: 'ESCENARIO', tag: 'Arte y cultura', kicker: 'Teatro · Cultura en vivo',
                title: 'Un escenario para <span>las escuelas y el folklore</span>',
                text: [
                    'Las <strong>escuelas, colegios e instituciones</strong> de Huanuni suben a este escenario con sus <strong>actuaciones de teatro</strong> y sus <strong>coros</strong>.',
                    'También llegan <strong>grupos folklóricos</strong> que llenan la sala de música y danza, manteniendo viva la identidad cultural de la región.',
                ],
                cite: 'Información sobre el uso del teatro · Radio Nacional Huanuni',
            },
        ],
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
    // "Presiona F para abrir/cerrar" además de una animación simple de giro.
    // Nota: ya no bloquean el paso (ver sección de MOVIMIENTO más abajo),
    // es sólo una animación visual de apertura/cierre.
    //
    // `flip: true` invierte el sentido de apertura (por si la puerta gira "hacia adentro"
    // o "hacia la pared" en vez de abrirse limpiamente) — útil cuando el pivote del objeto
    // en el .glb quedó orientado al revés respecto a las demás puertas.
    // Las puertas ahora giran sobre una BISAGRA calculada automaticamente (un borde de la hoja)
    // y se abren ALEJANDOSE de quien las abre. Si alguna queda mal, ajustala con estas opciones:
    //   hinge: 'min' | 'max'   -> en que extremo de la hoja esta la bisagra (la consola dice cual eligio)
    //   hinge: 'outer' + pair:'otra_hoja' -> bisagra en el extremo mas lejano de la otra hoja (ideal para portones de 2 hojas)
    //   dir:   'auto' | 1 | -1 -> 'auto' = se abre alejandose de ti; 1 / -1 = sentido fijo
    //   pivot: 'nombre_empty'  -> (opcional) empty de Blender a usar como bisagra; por defecto se busca 'pivot_<nombre de la hoja>'
    //   flip:  true            -> invierte el sentido que eligio 'auto'
    //   hingeInset: 0.2        -> acerca la bisagra 0.2 hacia el centro de la hoja (si pivota mas afuera del poste)
    //   angle: 95              -> grados de apertura (por defecto doorAnimation.openAngle)
    // Ejemplo: { name: 'porton_iz', label: 'el porton', hinge: 'max', angle: 110 }
    doors: [
        { name: 'puerta1', label: 'la puerta' },
        { name: 'puerta2', label: 'la puerta' },
        { name: 'puerta3', label: 'la puerta' },
        // Portones: prueba con ` (depuracion) para ver la bisagra (rojo). Si pivota en el lado equivocado: hinge:'max' / 'min'.
        // Si se abre hacia el lado equivocado: dir: 1 o dir: -1 (fijo) en vez de 'auto'.
        { name: 'porton_iz', label: 'el portón', hinge: 'outer', pair: 'porton_de', angle: 90 },
        // 🔧 FIX: el nombre tenía un punto de más ("porton._de"), por lo que nunca
        // coincidía con el nodo real del modelo y este portón quedaba siempre omitido
        // (en silencio, sin ningún error en consola). Si en tu .glb el nodo se llama
        // distinto, cambia sólo el valor de "name" por el nombre real del objeto.
        { name: 'porton_de', label: 'el portón', hinge: 'outer', pair: 'porton_iz', angle: 90 },
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
let introDone = false;   // el cartel "Toma el control" solo se muestra hasta la primera vez que tomas el control
let hudDimTimer = 0;
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

// ============================================
// CALIDAD GRÁFICA (Media al arrancar; sólo cambia si la persona la cambia en Ajustes)
// ============================================
const QUALITY_LEVELS = {
    // shadowType: PCFSoft (suave, cara) → PCF (más barata) → sin sombras dinámicas
    high:   { pixelRatio: 2,   scale: 1,    shadows: true,  shadowType: THREE.PCFSoftShadowMap, shadow: 2048, label: 'Alta' },
    medium: { pixelRatio: 1.5, scale: 1,    shadows: true,  shadowType: THREE.PCFShadowMap,     shadow: 1024, label: 'Media' },
    low:    { pixelRatio: 1,   scale: 0.85, shadows: false, shadowType: THREE.PCFShadowMap,     shadow: 512,  label: 'Baja' },
};
const QUALITY_ORDER = ['high', 'medium', 'low'];
const qualitySelect = document.getElementById('quality');
let currentQuality = 'medium';
let composer = null;
let outlinePass = null;

function applyQuality(level) {
    const q = QUALITY_LEVELS[level];
    if (!q) return;
    currentQuality = level;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, q.pixelRatio) * q.scale);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(window.innerWidth, window.innerHeight);
}
    // Sombras: tipo y encendido según el nivel (y respetando CONFIG.renderer.shadows).
    // Cambiar el tipo o apagarlas obliga a recompilar los materiales una vez.
    const shadowsOn = CONFIG.renderer.shadows && q.shadows;
    if (renderer.shadowMap.type !== q.shadowType || renderer.shadowMap.enabled !== shadowsOn) {
        renderer.shadowMap.type = q.shadowType;
        renderer.shadowMap.enabled = shadowsOn;
        keyLight.castShadow = shadowsOn;
        if (!shadowsOn && keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; }
        scene.traverse((o) => {
            if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.needsUpdate = true; });
        });
    }
    if (keyLight.shadow.mapSize.x !== q.shadow) {
        keyLight.shadow.mapSize.set(q.shadow, q.shadow);
        // Three.js no recrea el mapa de sombras al cambiar mapSize: hay que liberarlo
        if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; }
    }
    if (qualitySelect.value !== level) qualitySelect.value = level;
}

applyQuality(QUALITY_LEVELS[qualitySelect.value] ? qualitySelect.value : 'medium'); // el selector manda desde el primer frame

// ============================================
// POST-PROCESADO (OutlinePass)
// ============================================
function initPostProcessing() {
    const pr = renderer.getPixelRatio();
    const w = window.innerWidth, h = window.innerHeight;

    // Render target con MSAA: al usar composer se pierde el antialias nativo del renderer
    const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);

    composer.addPass(new RenderPass(scene, camera));

    const O = CONFIG.outline;
    outlinePass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
    outlinePass.edgeStrength = O.edgeStrength;
    outlinePass.edgeGlow = O.edgeGlow;
    outlinePass.edgeThickness = O.edgeThickness;
    outlinePass.pulsePeriod = O.pulsePeriod;
    outlinePass.visibleEdgeColor.set(O.colorPending);
    // Borde "oculto" en negro: con blending aditivo no se ve, así el contorno
    // NO se ve a través de las paredes.
    outlinePass.hiddenEdgeColor.set('#000000');
    outlinePass.enabled = O.enabled;
    composer.addPass(outlinePass);

    // Aplica tone mapping (ACES + exposición) y color space sRGB al final
    composer.addPass(new OutputPass());
}
initPostProcessing();

function renderFrame() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
}

// Actualiza qué objeto lleva contorno según lo que apuntas
let _outlineLast = null;
function updateOutline() {
    if (!outlinePass) return;
    const active = !panelOpen && !photoMode && mode === 'fly' && cameraMode === 'manual';
    const it = active ? aimedInteractable : null;
    if (it === _outlineLast) return;
    _outlineLast = it;

    if (!it) { outlinePass.selectedObjects = []; return; }

    const r = it.ref;
    const O = CONFIG.outline;
    let obj, color;
    if (it.type === 'info') {
        obj = r.sourceNode;
        color = r.seen ? O.colorSeen : O.colorPending;
    } else if (it.type === 'door') {
        obj = r.node;
        color = O.colorDoor;
    } else { // computer
        obj = r.node;
        color = (radioState === 'live') ? O.colorSeen : O.colorPending;
    }
    outlinePass.visibleEdgeColor.set(color);
    outlinePass.selectedObjects = obj ? [obj] : [];
}

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
const doors = [];    // { node, pivot, label, position, isOpen, angle, openSign }
const doorDebugHelpers = []; // marcas rojas/amarillas de las bisagras (se ven con el modo depuración)
const interactables = []; // lista combinada para el sistema de "mira e interactúa"

const computers = [];

// ============================================
// MARCADORES Y ETIQUETAS EN EL MUNDO (UX)
// ============================================
// Los puntos ahora se colocan en el CENTRO del objeto (no flotando arriba), son anillos
// translucidos discretos, se desvanecen con la distancia y se ocultan si hay una pared
// en medio. El que estas mirando crece y se ilumina.
const _markerTex = {};
function getMarkerTexture(kind) {
    if (_markerTex[kind]) return _markerTex[kind];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const rgb = kind === 'green' ? '110,215,150' : '224,200,120';
    const halo = g.createRadialGradient(64, 64, 18, 64, 64, 64);
    halo.addColorStop(0, `rgba(${rgb},0.22)`); halo.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = halo; g.fillRect(0, 0, 128, 128);
    g.lineWidth = 5; g.strokeStyle = `rgba(${rgb},0.95)`;
    g.beginPath(); g.arc(64, 64, 30, 0, Math.PI * 2); g.stroke();
    g.fillStyle = `rgba(${rgb},0.95)`;
    g.beginPath(); g.arc(64, 64, kind === 'green' ? 14 : 9, 0, Math.PI * 2); g.fill();
    if (kind === 'green') { // check
        g.strokeStyle = 'rgba(10,30,18,0.9)'; g.lineWidth = 3.5;
        g.beginPath(); g.moveTo(57, 64); g.lineTo(62, 69); g.lineTo(71, 58); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (_markerTex[kind] = t);
}
function createMarkerSprite(kind, size) {
    const mat = new THREE.SpriteMaterial({ map: getMarkerTexture(kind), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(size, size, 1); s.renderOrder = 20; s.visible = false;
    return s;
}
// Etiqueta tipo "pildora" con icono + texto (p. ej. ENCENDER RADIO sobre la computadora)
function makeLabelTexture(icon, text, accent) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 160;
    const g = c.getContext('2d');
    const x = 8, y = 20, w = 624, h = 120, r = 60;
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    g.fillStyle = 'rgba(10,10,14,0.86)'; g.fill();
    g.lineWidth = 5; g.strokeStyle = accent; g.stroke();
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = '64px sans-serif'; g.fillStyle = '#fff'; g.fillText(icon, 44, 82);
    g.font = '700 46px Montserrat, Poppins, sans-serif'; g.fillStyle = accent;
    g.fillText(text, 134, 82);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
const worldTags = [];
function addWorldTag(tag) {
    tag.opacity = 0; tag.occluded = false; tag.phase = worldTags.length * 1.3;
    hotspotGroup.add(tag.sprite);
    worldTags.push(tag);
}
const _tagDir = new THREE.Vector3();
const _occRay = new THREE.Raycaster();
let _occIdx = 0, _occFrame = 0;
function updateWorldTags(time, dt) {
    if (!hotspotGroup.visible || worldTags.length === 0) return;
    const hide = panelOpen || historyOpen;
    // oclusion (una etiqueta cada 3 cuadros: muy liviano)
    if ((_occFrame++ % 3) === 0 && collisionMeshes.length) {
        const t = worldTags[_occIdx++ % worldTags.length];
        const dist = camera.position.distanceTo(t.position);
        if (dist < t.maxDist) {
            _tagDir.copy(t.position).sub(camera.position).normalize();
            _occRay.set(camera.position, _tagDir); _occRay.near = 0.05; _occRay.far = dist;
            const hit = _occRay.intersectObjects(collisionMeshes, false).find((h) => h.object.visible !== false);
            t.occluded = !!hit && hit.distance < dist - t.radius;
        }
    }
    for (const t of worldTags) {
        const d = characterGroup.position.distanceTo(t.position);
        const aimed = !!aimedInteractable && aimedInteractable.ref === t.ref;
        const vis = (!hide && !t.occluded && d < t.maxDist) ? Math.min(1, (t.maxDist - d) / 2) : 0;
        const base = t.alwaysBright ? 1 : (t.ref && t.ref.seen ? 0.35 : 0.6);
        const want = vis * (aimed ? 1 : base);
        t.opacity += (want - t.opacity) * Math.min(1, 8 * dt);
        t.sprite.material.opacity = t.opacity;
        t.sprite.visible = t.opacity > 0.02;
        const k = (aimed ? 1.3 : 1) * (1 + Math.sin(time * 2.2 + t.phase) * 0.06);
        t.sprite.scale.set(t.sx * k, t.sy * k, 1);
        if (t.onTick) t.onTick(t);
    }
}
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
// Soporte para modelos comprimidos (ver comprimir_modelos.sh):
//  · Meshopt / Draco → geometría (y animaciones, con Meshopt) mucho más ligera
//  · KTX2 (Basis)    → texturas que se quedan comprimidas en la GPU (menos VRAM y descarga)
// Los modelos sin comprimir siguen cargando igual: estos decodificadores sólo se usan si el .glb los pide.
const THREE_JSM = 'https://unpkg.com/three@0.160.0/examples/jsm/';
const dracoLoader = new DRACOLoader().setDecoderPath(THREE_JSM + 'libs/draco/gltf/');
const ktx2Loader = new KTX2Loader().setTranscoderPath(THREE_JSM + 'libs/basis/').detectSupport(renderer);
const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);
loader.setKTX2Loader(ktx2Loader);
loader.setMeshoptDecoder(MeshoptDecoder);
const loadingBar = document.getElementById('progress-bar');
let assetsLoaded = 0;
const totalAssets = 3;

// Pantalla de carga por etapas: mensaje de lo que se está descargando + tamaño total y avance en MB.
// El tamaño se pide con un HEAD a cada modelo (Content-Length); si el servidor no lo informa,
// se muestra sólo el porcentaje por modelos completados.
const loadingStageEl = document.getElementById('loading-stage');
const loadingSizeEl = document.getElementById('loading-size');
const LOAD_ASSETS = {
    building:  { label: 'Cargando el edificio…',     name: 'el edificio',  url: CONFIG.model.building,  loaded: 0, total: 0, done: false, failed: false },
    character: { label: 'Preparando al personaje…',  name: 'el personaje', url: CONFIG.model.character, loaded: 0, total: 0, done: false, failed: false },
    logo:      { label: 'Cargando el logo…',         name: 'el logo',      url: CONFIG.model.logo,      loaded: 0, total: 0, done: false, failed: false },
};
const fmtMB = (b) => (b / 1048576).toLocaleString('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' MB';

function renderLoading() {
    const list = Object.values(LOAD_ASSETS);
    const allKnown = list.every((a) => a.total > 0);
    const totalBytes = list.reduce((n, a) => n + a.total, 0);
    const loadedBytes = list.reduce((n, a) => n + (a.done && !a.failed ? a.total || a.loaded : a.loaded), 0);
    let pct;
    if (allKnown) pct = loadedBytes / totalBytes;
    else pct = list.reduce((n, a) => n + (a.done ? 1 : a.total > 0 ? a.loaded / a.total : 0), 0) / list.length;
    pct = Math.max(0, Math.min(1, pct));
    loadingBar.style.width = `${Math.round(pct * 100)}%`;

    const current = list.find((a) => !a.done);
    loadingStageEl.textContent = current ? current.label : 'Armando la escena…';

    const failed = list.filter((a) => a.failed);
    if (failed.length && !current) {
        loadingSizeEl.textContent = `No se pudo cargar ${failed.map((a) => a.name).join(' ni ')}. Continuando sin esto…`;
    } else if (allKnown) {
        loadingSizeEl.textContent = loadedBytes > 0
            ? `${fmtMB(Math.min(loadedBytes, totalBytes))} de ${fmtMB(totalBytes)} · ${Math.round(pct * 100)} %`
            : `Descarga total: ${fmtMB(totalBytes)}`;
    } else {
        loadingSizeEl.textContent = totalBytes > 0 ? `Descarga: ${Math.round(pct * 100)} %` : 'Calculando tamaño de descarga…';
    }
}
function loadProgress(key, xhr) {
    const a = LOAD_ASSETS[key];
    if (xhr.total > 0) a.total = xhr.total;
    a.loaded = a.total > 0 ? Math.min(xhr.loaded, a.total) : xhr.loaded;
    renderLoading();
}
function loadDone(key, failed) {
    const a = LOAD_ASSETS[key];
    a.done = true; a.failed = !!failed;
    if (!failed && a.total > 0) a.loaded = a.total;
    renderLoading();
}
renderLoading();
Object.values(LOAD_ASSETS).forEach((a) => {
    fetch(a.url, { method: 'HEAD' }).then((r) => {
        const n = parseInt(r.headers.get('content-length'), 10);
        if (r.ok && n > 0 && !a.done && !(a.total > 0)) { a.total = n; renderLoading(); }
    }).catch(() => { /* sin tamaño: se muestra sólo el porcentaje */ });
});

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

        // --- Cubos de historia ("mostrar_historia", "mostrar_historia_1", ...): sólo se usa su
        // volumen como zona disparadora. Se calcula la caja en coordenadas de mundo, se oculta
        // el cubo por completo y se saca de las listas de colisión para que no bloquee el paso.
        HISTORY_STORIES.forEach((story) => {
            const H = story.cfg;
            const key = H.nodeName.toLowerCase();
            let historyNode = model.getObjectByName(H.nodeName);
            if (!historyNode) {
                // Respaldo (p. ej. "mostrar_historia001"), sin confundir con otra historia
                // cuyo nombre empieza igual ("mostrar_historia" vs "mostrar_historia_1").
                const otherKeys = HISTORY_STORIES.filter((o) => o !== story)
                    .map((o) => o.cfg.nodeName.toLowerCase()).filter((k) => k.length > key.length && k.startsWith(key));
                model.traverse((o) => {
                    if (historyNode || !o.name) return;
                    const n = o.name.toLowerCase();
                    if (n.startsWith(key) && !otherKeys.some((k) => n.startsWith(k))) historyNode = o;
                });
            }
            if (historyNode) {
                historyNode.updateWorldMatrix(true, true);
                story.zone = new THREE.Box3().setFromObject(historyNode);
                const dropFrom = (arr, m) => { const i = arr.indexOf(m); if (i > -1) arr.splice(i, 1); };
                historyNode.traverse((o) => {
                    o.visible = false;
                    if (o.isMesh) {
                        o.castShadow = false;
                        o.receiveShadow = false;
                        dropFrom(collisionMeshes, o); dropFrom(floorMeshes, o); dropFrom(wallMeshes, o);
                    }
                });
                console.log(`✅ Zona "${H.nodeName}" lista (cubo invisible):`, story.zone.min, story.zone.max);
            } else {
                console.warn(`⚠️ No se encontró el nodo "${H.nodeName}" en el GLB — esa historia no se activará.`);
            }

            // --- Puntos de cámara de esta historia (empties de Blender) ---
            const worldOf = (name) => {
                const n = model.getObjectByName(name);
                if (!n) return null;
                n.updateWorldMatrix(true, false);
                return n.getWorldPosition(new THREE.Vector3());
            };
            const missing = [];
            story.shots.length = 0;
            if (H.fixedShot) {
                // Un solo plano (camPrefix+N / lookPrefix+N) compartido por todos los capítulos
                const k = H.fixedShot;
                const pos = worldOf(H.camPrefix + k);
                const look = pos ? worldOf(H.lookPrefix + k) : null;
                if (!pos) missing.push(H.camPrefix + k);
                else if (!look) missing.push(H.lookPrefix + k + ' (opcional: mirará al personaje)');
                const shot = pos ? { pos, look } : null;
                H.chapters.forEach(() => story.shots.push(shot));
            } else H.chapters.forEach((_, i) => {
                const k = i + 1;
                const pos = worldOf(H.camPrefix + k);
                if (!pos) { missing.push(H.camPrefix + k); story.shots.push(null); return; }
                const look = worldOf(H.lookPrefix + k);
                if (!look) missing.push(H.lookPrefix + k + ' (opcional: mirará al personaje)');
                story.shots.push({ pos, look });
            });
            const ok = story.shots.filter(Boolean).length;
            console.log(`✅ Historia "${H.nodeName}": ${ok}/${H.chapters.length} puntos de cámara encontrados.`);
            if (missing.length) console.warn(`⚠️ Historia "${H.nodeName}": faltan estos empties en el GLB →`, missing.join(', '));
        });

        // --- Construir hotspots interactivos a partir de nodos con nombre ---
        CONFIG.hotspots.forEach((def) => {
            const node = model.getObjectByName(def.name);
            if (!node) {
                console.warn(`⚠️ Hotspot "${def.name}" no encontrado en el GLB — se omite.`);
                return; // El nodo no existe en este modelo: se omite sin error
            }
            const worldPos = new THREE.Vector3();
            node.getWorldPosition(worldPos);
            // El marcador va en el CENTRO del objeto (caja envolvente), no flotando arriba.
            // `markerOffset: [x, y, z]` (metros) en el hotspot permite afinarlo a mano.
            const nb = new THREE.Box3().setFromObject(node);
            const centerPos = nb.isEmpty() ? worldPos.clone() : nb.getCenter(new THREE.Vector3());
            const nSize = nb.isEmpty() ? new THREE.Vector3(0.5, 0.5, 0.5) : nb.getSize(new THREE.Vector3());
            if (def.markerOffset) centerPos.add(new THREE.Vector3(...def.markerOffset));

            const marker = createMarkerSprite('gold', 0.42);
            marker.position.copy(centerPos);

            const hotspotData = {
                title: def.title,
                desc: def.desc,
                position: centerPos.clone(),
                marker,
                sourceNode: node,               // referencia al objeto real del edificio (para clonarlo en el panel)
                useLogoModel: !!def.useLogoModel, // true solo para img_logo -> usa logo.glb en vez del nodo del edificio
            };
            hotspots.push(hotspotData);
            addWorldTag({
                sprite: marker, position: hotspotData.position, ref: hotspotData, sx: 0.42, sy: 0.42,
                maxDist: Math.max(9, CONFIG.player.interactionDistance * 2.5),
                radius: Math.min(1.5, Math.max(0.35, Math.max(nSize.x, nSize.y, nSize.z) * 0.5)),
            });
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
            const rig = setupDoorPivot(node, def);
            const doorData = {
                node,
                pivot: rig.pivot,
                label: def.label,
                position: rig.center.clone(),
                centerRel: rig.centerRel, // centro de la hoja respecto a la bisagra
                isOpen: false,
                angle: 0,
                openSign: 1,
                dir: def.dir === undefined ? 'auto' : def.dir,
                flip: !!def.flip,
                maxAngle: def.angle != null ? THREE.MathUtils.degToRad(def.angle) : null,
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
            const cb = new THREE.Box3().setFromObject(node);
            const cCenter = cb.isEmpty() ? worldPos.clone() : cb.getCenter(new THREE.Vector3());
            const computerData = { node, label: def.label, position: cCenter.clone() };
            computers.push(computerData);
            interactables.push({ type: 'computer', position: computerData.position, ref: computerData });

            // Etiqueta flotante encima de la computadora para que se sepa que ahi se escucha la radio
            const texOff = makeLabelTexture('📻', 'ENCENDER RADIO', '#e0c878');
            const texOn = makeLabelTexture('📻', 'RADIO EN VIVO', '#6ed796');
            const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOff, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
            lbl.renderOrder = 21; lbl.visible = false;
            lbl.position.set(cCenter.x, (cb.isEmpty() ? cCenter.y : cb.max.y) + 0.38, cCenter.z);
            addWorldTag({
                sprite: lbl, position: lbl.position, ref: computerData, sx: 1.5, sy: 0.375, alwaysBright: true,
                maxDist: 9, radius: 0.7,
                onTick: (t) => {
                    const on = radioState === 'live' || radioState === 'connecting';
                    if (t.on !== on) { t.on = on; lbl.material.map = on ? texOn : texOff; lbl.material.needsUpdate = true; }
                },
            });
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
        loadDone('building', false);
        checkAllLoaded();
    },
    (xhr) => {
        if (xhr.total > 0) {
            loadProgress('building', xhr);
        }
    },
    (error) => {
        console.warn('⚠️ No se pudo cargar radio_nacional.glb', error);
        assetsLoaded++;
        loadDone('building', true);
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
        loadDone('logo', false);
        checkAllLoaded();
    },
    (xhr) => {
        if (xhr.total > 0) {
            loadProgress('logo', xhr);
        }
    },
    (error) => {
        console.warn('⚠️ No se pudo cargar models/logo.glb', error);
        assetsLoaded++;
        loadDone('logo', true);
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
        loadDone('character', false);
        checkAllLoaded();
    },
    (xhr) => {
        if (xhr.total > 0) {
            loadProgress('character', xhr);
        }
    },
    (error) => {
        console.warn('⚠️ No se pudo cargar models/personaje.glb', error);
        assetsLoaded++;
        loadDone('character', true);
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
        if (!Object.values(LOAD_ASSETS).some((a) => a.failed)) {
            loadingStageEl.textContent = '¡Todo listo!';
            loadingBar.style.width = '100%';
        }
        dracoLoader.dispose();   // libera los workers de descompresión: ya no se necesitan
        ktx2Loader.dispose();
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
    document.getElementById('flight-data').classList.toggle('visible', debugMode);
    document.getElementById('btn-help').classList.add('visible');
    document.getElementById('btn-photo').classList.add('visible');
    document.getElementById('crosshair').classList.add('visible');
    document.getElementById('center-message').classList.add('visible');
    document.getElementById('center-message').classList.remove('hidden');
    hotspotGroup.visible = true;
    storyMarkerGroup.visible = true;
    discoverHud.classList.add('visible');
    buildStoryMarkers();
    updateDiscoveryHud(false);
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
// MÚSICA DE FONDO
// ============================================
const btnSound = document.getElementById('btn-sound');

const MUSIC_CONFIG = {
    src: 'otros/music.mp3', // ruta relativa a index.html
    baseVolume: 0.4,        // volumen máximo real cuando el slider está al 100%
    duckFactor: 0,          // al encender la radio, la música de fondo se apaga por completo (0 = silencio)
    fadeSpeed: 0.6,         // velocidad del fade (1 = un segundo para ir de 0 a 100%)
};

const bgMusic = new Audio(MUSIC_CONFIG.src);
bgMusic.loop = true;
bgMusic.preload = 'auto';
bgMusic.volume = 0;

let musicWanted = true;   // false si el usuario la silenció con el botón 🔊/🔇
let musicDucked = false;  // true mientras suena la radio en vivo
let musicFade = 0;        // 0..1, para entrada/salida suave
let musicFadeTarget = 1;

function getUserVolume() {
    const slider = document.getElementById('volume');
    return slider ? parseFloat(slider.value) : 0.5;
}

// La música baja sola (con transición suave) cuando suena la radio en vivo o se cuenta una historia.
// `musicDuckReasons` permite que varias cosas pidan bajarla a la vez sin pisarse entre sí.
const musicDuckReasons = new Map(); // motivo -> factor (0..1)
let musicDuckLevel = 1;             // factor aplicado ahora mismo (se acerca suavemente al objetivo)
function setMusicDuck(reason, factor) {
    if (factor == null || factor >= 1) musicDuckReasons.delete(reason);
    else musicDuckReasons.set(reason, factor);
}
function musicDuckTarget() {
    let t = musicDucked ? MUSIC_CONFIG.duckFactor : 1;
    musicDuckReasons.forEach((f) => { t = Math.min(t, f); });
    return t;
}

function applyMusicVolume() {
    const v = getUserVolume() * MUSIC_CONFIG.baseVolume * musicDuckLevel * musicFade;
    bgMusic.volume = Math.min(1, Math.max(0, v));
}

// Fade suave (se ejecuta siempre, es muy liviano)
let _lastMusicTick = performance.now();
setInterval(() => {
    const now = performance.now();
    const dt = (now - _lastMusicTick) / 1000;
    _lastMusicTick = now;
    let changed = false;
    if (musicFade !== musicFadeTarget) {
        const step = MUSIC_CONFIG.fadeSpeed * dt;
        musicFade = musicFade < musicFadeTarget
            ? Math.min(musicFadeTarget, musicFade + step)
            : Math.max(musicFadeTarget, musicFade - step);
        changed = true;
    }
    // Ducking suave: baja en ~0.8 s y vuelve a subir más despacio (~1.6 s)
    const duckTarget = musicDuckTarget();
    if (Math.abs(musicDuckLevel - duckTarget) > 0.001) {
        const k = duckTarget < musicDuckLevel ? 3.5 : 1.8;
        musicDuckLevel += (duckTarget - musicDuckLevel) * Math.min(1, k * dt);
        changed = true;
    }
    if (changed) {
        applyMusicVolume();
        if (musicFade === 0 && musicFadeTarget === 0) bgMusic.pause();
    }
}, 50);

function startMusic() {
    if (!musicWanted) return Promise.resolve();
    musicFadeTarget = 1;
    return bgMusic.play().then(() => {
        soundEnabled = true;
        btnSound.textContent = '🔊';
    });
}

function toggleMusic() {
    if (musicWanted) {
        musicWanted = false;
        musicFadeTarget = 0; // baja suave y luego hace pause
        soundEnabled = false;
        btnSound.textContent = '🔇';
    } else {
        musicWanted = true;
        startMusic().catch((err) => console.warn('No se pudo reproducir la música:', err));
    }
}

btnSound.addEventListener('click', toggleMusic);

// Los navegadores bloquean el audio hasta que el usuario hace algo (click,
// tecla o toque). Intentamos arrancar de inmediato; si el navegador lo
// bloquea, arranca solo con la primera interacción.
function setupMusicAutoplay() {
    const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
    const unlock = () => {
        startMusic().then(() => {
            unlockEvents.forEach((ev) => window.removeEventListener(ev, unlock, true));
        }).catch(() => { /* seguimos esperando otra interacción */ });
    };
    startMusic().catch(() => {
        unlockEvents.forEach((ev) => window.addEventListener(ev, unlock, true));
    });
}
setupMusicAutoplay();

// Pausar al cambiar de pestaña y retomar al volver
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (historyOpen && !historyPaused) toggleHistoryPlay();
        bgMusic.pause();
    } else if (musicWanted && musicFadeTarget === 1 && musicFade > 0) {
        bgMusic.play().catch(() => {});
    }
});

// ============================================
// CONTROL DEL JUGADOR (VUELO LIBRE / MANUAL)
// ============================================
const player = {
    position: new THREE.Vector3(...CONFIG.player.startPosition),
    velocity: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
};

// Modo depuración: oculto por defecto. Se activa con la tecla ` (Backquote) o abriendo la
// página con ?debug. Muestra los "datos de vuelo" y habilita el vuelo libre (Espacio/R sube,
// Ctrl/C baja) para revisar el modelo; fuera de él el personaje sólo camina y respeta la gravedad.
let debugMode = new URLSearchParams(location.search).has('debug');
function setDebugMode(on) {
    debugMode = on;
    document.getElementById('flight-data').classList.toggle('visible', on && mode === 'fly');
    doorDebugHelpers.forEach((h) => { h.visible = on; }); // bisagras de puertas/portones: rojo = eje, amarillo = hoja
    showToast(on ? 'Modo depuración: ACTIVADO · bisagras visibles (rojo) · vuelo libre: Espacio/R sube · Ctrl/C baja' : 'Modo depuración: desactivado');
}
const keys = {};
const mouse = { x: 0, y: 0 };

document.addEventListener('keydown', (e) => {
    if (historyOpen) { handleHistoryKey(e); return; } // la historia narrada captura el teclado (no se camina)
    if (photoModalOpen) { if (e.code === 'Escape' || e.code === 'Enter') closePhotoModal(); return; }
    if (radioPanelOpen) { if (e.code === 'Escape' || (e.code === 'KeyF' && !e.repeat)) closeRadioPanel(); return; }
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyN') toggleDayNight();
    if (e.code === 'Backquote' && !e.repeat) setDebugMode(!debugMode);
    if (e.code === 'KeyZ') resetPosition();

    if (mode === 'fly' && cameraMode === 'manual') {
        if (e.code === 'KeyP' && !e.repeat && !panelOpen) togglePhotoMode();
        if (e.code === 'Enter' && !e.repeat && photoMode && !panelOpen) capturePhoto();
        if (e.code === 'KeyH' && !e.repeat && !panelOpen && !photoMode) openHistory(HISTORY_STORIES.find((st) => st.inside)); // la de la zona actual, o la principal // ver la historia desde cualquier lugar
        if (e.code === 'KeyF' && !e.repeat && !photoMode) interact(false);   // F = interactuar (E y Q quedan sólo para rotar)
        if (e.code === 'KeyE' && !panelOpen) player.yaw += 0.05;
        if (e.code === 'KeyQ' && !panelOpen) player.yaw -= 0.05;
    }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });

// Interactuar con lo que se apunta (puertas, computadora, puntos dorados) o, con F, revivir
// la historia de la zona. Se dispara con la tecla F o con clic izquierdo (mira bloqueada).
function interact(fromClick) {
    if (panelOpen) { if (!fromClick) closeHotspotPanel(); return; }
    if (aimedInteractable) {
        if (aimedInteractable.type === 'door') toggleDoor(aimedInteractable.ref);
        else if (aimedInteractable.type === 'computer') openRadioPanel();
        else if (aimedInteractable.type === 'info') openHotspotPanel(aimedInteractable.ref);
    } else if (!fromClick && !historyOpen && HISTORY_STORIES.some((st) => st.inside)) {
        openHistory(HISTORY_STORIES.find((st) => st.inside)); // revivir la historia de esta zona
    }
}
window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && locked && mode === 'fly' && cameraMode === 'manual' && !historyOpen && !photoMode) interact(true);
});
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
    if (debugMode) { // vuelo libre sólo en depuración
        if (keys['Space'] || keys['KeyR']) verticalInput += 1;
        if (keys['ControlLeft'] || keys['ControlRight'] || keys['KeyC']) verticalInput -= 1;
    }

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

    if (debugMode) {
        const speedMag = Math.sqrt(player.velocity.x**2 + player.velocity.y**2 + player.velocity.z**2);
        document.getElementById('speed-value').textContent = speedMag.toFixed(1);
        document.getElementById('alt-value').textContent = player.position.y.toFixed(1);
    }
}

// ============================================
// PUERTAS Y PORTONES INTERACTIVOS (abrir/cerrar con E)
// ============================================
// Crea una bisagra (pivote) en un borde de la hoja y cuelga la puerta de ella: asi gira como una
// puerta real en vez de girar sobre su centro/origen (que era lo que hacia que se abriera mal).
// Caja envolvente de la HOJA sola: ignora carteles/cuadros/logos que cuelgan de ella (p. ej. el poster de Canal 2
// que sobresale del portón) porque agrandaban la caja y movian la bisagra lejos del borde real.
const DOOR_IGNORE_RE = /poster|cuadro|img_|banner|logo|cartel|afiche|flag|bandera/i;
function leafBox(node) {
    const ignored = new Set(CONFIG.hotspots.map((h) => h.name));
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    node.updateWorldMatrix(true, true);
    node.traverse((m) => {
        if (!m.isMesh) return;
        for (let o = m; o && o !== node; o = o.parent) {
            if (DOOR_IGNORE_RE.test(o.name) || ignored.has(o.name)) return;
        }
        tmp.setFromObject(m);
        if (!tmp.isEmpty()) box.union(tmp);
    });
    return box.isEmpty() ? new THREE.Box3().setFromObject(node) : box;
}

function setupDoorPivot(node, def) {
    const parent = node.parent;
    parent.updateWorldMatrix(true, false);
    node.updateWorldMatrix(true, true);
    const box = leafBox(node);
    const size = box.getSize(new THREE.Vector3());
    const centerW = box.getCenter(new THREE.Vector3());
    const origin = node.getWorldPosition(new THREE.Vector3());
    const axis = size.x >= size.z ? 'x' : 'z'; // eje a lo ancho de la hoja
    const lo = box.min[axis], hi = box.max[axis];
    let side = def.hinge || 'auto';
    if (side === 'outer' && def.pair) {
        // bisagra en el extremo MAS LEJANO de la otra hoja (poste exterior), sin importar la orientacion del modelo
        let root = node; while (root.parent) root = root.parent;
        const other = root.getObjectByName(def.pair);
        if (other) {
            const oc = new THREE.Box3().setFromObject(other).getCenter(new THREE.Vector3());
            side = oc[axis] > centerW[axis] ? 'min' : 'max';
        } else side = 'auto';
    }
    if (side === 'auto') {
        // si el origen del objeto ya esta en un extremo, ahi esta la bisagra
        const t = (origin[axis] - lo) / Math.max(1e-6, hi - lo);
        side = t > 0.75 ? 'max' : 'min';
    }
    const hingeW = centerW.clone();
    // 1) Si existe un empty en el .glb llamado "pivot_<nombre>" (p. ej. pivot_porton_iz), ESA es la bisagra.
    let sceneRoot = node; while (sceneRoot.parent) sceneRoot = sceneRoot.parent;
    const pivotEmpty = sceneRoot.getObjectByName(def.pivot || ('pivot_' + node.name));
    if (pivotEmpty) {
        pivotEmpty.updateWorldMatrix(true, false);
        const pw = pivotEmpty.getWorldPosition(new THREE.Vector3());
        hingeW.x = pw.x; hingeW.z = pw.z; // solo importa la posicion horizontal
        side = 'empty ' + pivotEmpty.name;
    } else {
        // 2) Si no, se calcula sola a partir de la hoja
        const inset = def.hingeInset || 0; // ajuste fino: mueve la bisagra hacia el centro de la hoja (unidades del mundo)
        hingeW[axis] = side === 'min' ? lo + inset : hi - inset;
    }
    const pivot = new THREE.Group();
    pivot.name = node.name + '_bisagra';
    parent.add(pivot);
    pivot.position.copy(parent.worldToLocal(hingeW.clone()));
    pivot.updateWorldMatrix(true, false);
    pivot.attach(node); // conserva la posicion/rotacion actual de la puerta

    // Ayuda visual (modo depuracion: tecla ` o ?debug): ROJO = eje de la bisagra, AMARILLO = hacia donde se extiende la hoja
    const ws = parent.getWorldScale(new THREE.Vector3()).x || 1;
    const dbgMat = new THREE.MeshBasicMaterial({ color: 0xff2222, depthTest: false, transparent: true, opacity: 0.95 });
    const dbg = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 8), dbgMat);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), dbgMat);
    post.renderOrder = ball.renderOrder = 999;
    dbg.add(post, ball);
    // etiqueta con el nombre de la hoja y de dónde sale su bisagra (empty o cálculo automático)
    {
        const lc = document.createElement('canvas'); lc.width = 512; lc.height = 128;
        const lg = lc.getContext('2d');
        lg.fillStyle = 'rgba(0,0,0,0.8)'; lg.fillRect(0, 0, 512, 128);
        lg.fillStyle = '#ffdd00'; lg.font = '700 44px sans-serif'; lg.textBaseline = 'middle'; lg.textAlign = 'center';
        lg.fillText(node.name, 256, 44);
        lg.fillStyle = side.startsWith('empty') ? '#6ed796' : '#ff9a9a'; lg.font = '600 34px sans-serif';
        lg.fillText(side.startsWith('empty') ? 'pivote: EMPTY ✓' : 'pivote: AUTOMÁTICO', 256, 92);
        const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), depthTest: false, transparent: true }));
        lbl.scale.set(1.8, 0.45, 1); lbl.position.y = 1.9; lbl.renderOrder = 1000;
        dbg.add(lbl);
    }
    dbg.scale.setScalar(1 / ws);
    const cRel = parent.worldToLocal(centerW.clone()).sub(pivot.position);
    const leafLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(cRel.x * 2, 0, cRel.z * 2)]),
        new THREE.LineBasicMaterial({ color: 0xffdd00, depthTest: false })
    );
    leafLine.renderOrder = 999;
    pivot.add(dbg, leafLine);
    dbg.visible = leafLine.visible = !!debugMode;
    doorDebugHelpers.push(dbg, leafLine);
    const centerRel = parent.worldToLocal(centerW.clone()).sub(pivot.position);
    console.log(`🚪 ${node.name}: hoja de ${(hi - lo).toFixed(2)} de ancho (sin carteles) · bisagra en '${side}'${side.startsWith('empty') ? '' : ` del eje ${axis.toUpperCase()} (si se abre del lado equivocado usa hinge:'${side === 'min' ? 'max' : 'min'}' o flip:true en CONFIG.doors; o crea un empty pivot_${node.name} en Blender)`}`);
    return { pivot, center: centerW, centerRel };
}

// Sentido de apertura: la hoja se aleja de la persona que la abre (como al empujarla)
function autoDoorSign(door) {
    const p = door.pivot.parent.worldToLocal(characterGroup.position.clone()).sub(door.pivot.position);
    const c = door.centerRel;
    const side = p.x * -c.z + p.z * c.x;
    return side >= 0 ? 1 : -1;
}

function toggleDoor(door) {
    if (!door.isOpen) {
        let sign = door.dir === 'auto' ? autoDoorSign(door) : (door.dir < 0 ? -1 : 1);
        if (door.flip) sign = -sign;
        door.openSign = sign;
    }
    door.isOpen = !door.isOpen;
    showToast(door.isOpen ? `Abriendo ${door.label}...` : `Cerrando ${door.label}...`);
}

// ============================================
// COMPUTADORA INTERACTIVA: PRENDE/APAGA LA RADIO EN VIVO
// ============================================
// Estados: idle | connecting | live | paused | error
const radioPanelEl = document.getElementById('radio-panel');
const radioStatusEl = document.getElementById('radio-status');
const radioToggleBtn = document.getElementById('radio-toggle-btn');
const radioBadgeTextEl = radioPanelEl.querySelector('.radio-badge-live');
const radioWavesCanvas = document.getElementById('radio-waves-canvas');
const radioBarsEl = document.getElementById('radio-bars');
const radioBars = [];
for (let i = 0; i < 28; i++) { const b = document.createElement('div'); b.className = 'radio-bar'; radioBarsEl.appendChild(b); radioBars.push(b); }
let radioPanelOpen = false;
let radioState = 'idle';
let radioAttempt = 0;
let radioConnectTimer = 0;
let radioStallTimer = 0;

function setRadioState(state, detail) {
    radioState = state;
    radioPanelEl.classList.toggle('error', state === 'error');
    radioPanelEl.classList.toggle('connecting', state === 'connecting');
    radioPanelEl.classList.toggle('paused', state === 'paused' || state === 'idle');
    radioPlaying = state === 'connecting' || state === 'live';
    const wasDucked = musicDucked;
    musicDucked = state === 'connecting' || state === 'live'; // la musica de fondo se apaga mientras se escucha la radio
    if (musicDucked && !wasDucked && musicWanted) showToast('🎵 Música de fondo en pausa mientras escuchas la radio');
    applyMusicVolume();

    const badge = { connecting: 'CONECTANDO', live: 'EN VIVO', paused: 'EN PAUSA', idle: 'EN PAUSA', error: 'SIN SEÑAL' }[state];
    radioBadgeTextEl.lastChild.nodeValue = badge;
    radioToggleBtn.textContent = { connecting: '✕ Cancelar', live: '⏸ Pausar', paused: '▶ Reanudar', idle: '▶ Escuchar', error: '🔄 Reintentar' }[state];
    radioStatusEl.textContent = detail || {
        connecting: radioAttempt > 1 ? `Sintonizando… (intento ${radioAttempt})` : 'Sintonizando…',
        live: 'En el aire · FM 94.5',
        paused: 'Radio en pausa',
        idle: 'Radio apagada',
    }[state];
}

function stopRadioAudio() {
    clearTimeout(radioConnectTimer); clearTimeout(radioStallTimer);
    if (!radioAudio) return;
    const a = radioAudio;
    radioAudio = null;
    a.onplaying = a.onerror = a.onwaiting = a.onended = null;
    a.pause();
    a.removeAttribute('src');
    a.load(); // corta la descarga del stream
}

function failRadio(msg) {
    if (radioState === 'error') return;
    stopRadioAudio();
    if (radioAttempt >= 2) msg += ' También puedes escucharla en el sitio web.';
    setRadioState('error', msg);
    if (!radioPanelOpen) showToast('La radio perdió la señal · vuelve a la computadora para reintentar');
}

function startRadioStream() {
    stopRadioAudio();
    radioAttempt++;
    if (navigator.onLine === false) { failRadio('Sin conexión a internet. Conéctate e inténtalo de nuevo.'); return; }
    setRadioState('connecting');
    const a = new Audio();
    a.preload = 'none';
    // Sin crossOrigin: el ecualizador es sintético, y pedir CORS haría fallar streams que no lo envían.
    const url = CONFIG.computer.streamUrl;
    a.src = radioAttempt > 1 ? url + (url.includes('?') ? '&' : '?') + 'r=' + Date.now() : url;
    radioAudio = a;
    a.onplaying = () => {
        if (radioAudio !== a) return;
        clearTimeout(radioConnectTimer); clearTimeout(radioStallTimer);
        setRadioState('live');
    };
    a.onwaiting = () => {
        if (radioAudio !== a || radioState !== 'live') return;
        radioStatusEl.textContent = 'Reconectando…';
        clearTimeout(radioStallTimer);
        radioStallTimer = setTimeout(() => { if (radioAudio === a) failRadio('Se perdió la señal de la radio.'); }, CONFIG.computer.stallTimeout);
    };
    a.onerror = () => { if (radioAudio === a) failRadio('No se pudo conectar con la radio en vivo. Revisa tu conexión e inténtalo de nuevo.'); };
    a.onended = () => { if (radioAudio === a) failRadio('La transmisión se interrumpió.'); };
    radioConnectTimer = setTimeout(() => {
        if (radioAudio === a && radioState === 'connecting') failRadio('La radio tardó demasiado en responder. Inténtalo de nuevo.');
    }, CONFIG.computer.connectTimeout);
    a.play().catch((err) => {
        if (radioAudio !== a || (err && err.name === 'AbortError')) return;
        if (err && err.name === 'NotAllowedError') failRadio('El navegador bloqueó el audio. Presiona Reintentar.');
        else failRadio('No se pudo reproducir la transmisión. Inténtalo de nuevo.');
    });
}

radioToggleBtn.addEventListener('click', () => {
    if (radioState === 'live' || radioState === 'connecting') { stopRadioAudio(); setRadioState('paused'); }
    else startRadioStream(); // pausada, apagada o con error → conectar de nuevo (stream fresco, no buffer viejo)
});
window.addEventListener('offline', () => {
    if (radioState === 'live' || radioState === 'connecting') failRadio('Se perdió la conexión a internet.');
});
window.addEventListener('online', () => {
    if (radioState === 'error') radioStatusEl.textContent = 'Conexión recuperada. Presiona Reintentar.';
});

function openRadioPanel() {
    panelOpen = true;
    radioPanelOpen = true;
    document.getElementById('interact-hint').classList.remove('visible');
    radioPanelEl.classList.add('visible');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    if (radioState === 'idle' || radioState === 'error') startRadioStream();
}
function closeRadioPanel() {
    if (!radioPanelOpen) return;
    panelOpen = false;
    radioPanelOpen = false;
    radioPanelEl.classList.remove('visible');
    player.velocity.set(0, 0, 0);
    clock.getDelta();
    if (mode === 'fly' && cameraMode === 'manual') canvas.requestPointerLock();
    showResumeHintSoon();
    if (radioState === 'live') showToast('La radio sigue sonando · vuelve a la computadora para pausarla');
}
document.getElementById('radio-close').addEventListener('click', closeRadioPanel);

// Ecualizador y ondas (sintéticos: siempre se ven vivos aunque el servidor no permita analizar el audio)
function updateRadioVisuals(time) {
    const live = radioState === 'live', connecting = radioState === 'connecting';
    for (let i = 0; i < radioBars.length; i++) {
        const v = live ? 0.12 + 0.88 * Math.abs(Math.sin(time * (2.2 + i * 0.17) + i * 1.7) * Math.cos(time * 1.3 + i * 0.6))
            : connecting ? 0.08 + 0.1 * Math.abs(Math.sin(time * 4 + i * 0.5)) : 0.06;
        radioBars[i].style.transform = `scaleY(${v.toFixed(3)})`;
    }
    const cv = radioWavesCanvas;
    if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; }
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!live && !connecting) return;
    const maxR = Math.hypot(cv.width, cv.height) * 0.45;
    for (let k = 0; k < 5; k++) {
        const pr = ((time * (live ? 0.22 : 0.12)) + k / 5) % 1;
        ctx.strokeStyle = `rgba(201,168,76,${((1 - pr) * (live ? 0.32 : 0.14)).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cv.width / 2, cv.height / 2, 60 + pr * maxR, 0, Math.PI * 2); ctx.stroke();
    }
}

function updateDoors(delta) {
    if (doors.length === 0) return;
    const { openAngle, speed } = CONFIG.doorAnimation;
    doors.forEach((door) => {
        const target = door.isOpen ? (door.maxAngle != null ? door.maxAngle : openAngle) * door.openSign : 0;
        door.angle += (target - door.angle) * Math.min(1, speed * delta);
        door.pivot.rotation.y = door.angle;
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
    const crosshairEl = document.getElementById('crosshair');
    if (aimedInteractable && !panelOpen) {
        const r = aimedInteractable.ref;
        let icon, text;
        if (aimedInteractable.type === 'door') { icon = '🚪'; text = `${r.isOpen ? 'Cerrar' : 'Abrir'} ${r.label}`; }
        else if (aimedInteractable.type === 'computer') {
            icon = '📻';
            text = (radioState === 'live' || radioState === 'connecting') ? 'Abrir la radio (está sonando)' : 'Encender la radio';
        } else { icon = '🔍'; text = r.title.trim(); }
        const key = icon + text;
        if (hint.dataset.key !== key) {
            hint.dataset.key = key;
            const mk = (cls, txt) => { const s = document.createElement('span'); s.className = cls; s.textContent = txt; return s; };
            hint.replaceChildren(mk('ih-icon', icon), mk('ih-text', text), mk('ih-key', 'F'), mk('ih-or', 'o clic'));
        }
        hint.classList.add('visible');
        crosshairEl.classList.add('aiming');
    } else {
        hint.classList.remove('visible');
        crosshairEl.classList.remove('aiming');
    }
}

function openHotspotPanel(hotspot) {
    panelOpen = true;
    markHotspotSeen(hotspot);
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
    showResumeHintSoon();
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
    showToast('WASD: mover | Q/E: rotar | F o clic: interactuar | Shift: correr | Rueda: zoom cámara | N: día/noche | Z: reiniciar');
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

qualitySelect.addEventListener('change', (e) => {
    applyQuality(e.target.value);
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

document.getElementById('volume').addEventListener('input', () => {
    applyMusicVolume();
    if (narrClip) narrClip.volume = narrVolume();
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

function showResumeHintSoon() {
    // tras cerrar un panel: si el mouse no se recaptura, avisa con un texto pequeno (no tapa la pantalla)
    setTimeout(() => {
        if (!locked && introDone && !panelOpen && !historyOpen && !photoMode && mode === 'fly' && cameraMode === 'manual') {
            document.getElementById('resume-hint').classList.add('visible');
        }
    }, 450);
}
document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    const cm = document.getElementById('center-message');
    const rh = document.getElementById('resume-hint');
    const hud = document.getElementById('top-left');
    clearTimeout(hudDimTimer);
    if (mode === 'fly' && cameraMode === 'manual') {
        if (locked) {
            introDone = true;
            cm.classList.add('hidden');
            rh.classList.remove('visible');
            hudDimTimer = setTimeout(() => hud.classList.add('dim'), 12000); // la guia de teclas se atenua sola
        } else {
            hud.classList.remove('dim');
            if (!introDone) cm.classList.remove('hidden');   // solo la primera vez
            else if (!panelOpen && !historyOpen && !photoMode) rh.classList.add('visible'); // despues: texto simple
        }
    }
});

// ============================================
// HISTORIA NARRADA (cubo invisible "mostrar_historia")
// ============================================
// Al cruzar el portón el personaje queda quieto (movimiento bloqueado) y empieza
// la historia en una capa de cine: barras, tarjeta de capítulo y la fuente al pie.
// Cada capítulo tiene su plano: la cámara se coloca en el empty "hist_cam_N" y mira
// a "hist_look_N" haciendo un paneo lento de izquierda a derecha mientras avanza el
// capítulo. Entre capítulos hay una transición tipo "cambio de sintonía" (fundido a
// azul con un pequeño ruido de radio), no un vuelo de cámara.
// Cada historia (portón, etc.) guarda su propia zona, planos de cámara, tiempos y si ya se vio.
const HISTORY_STORIES = [CONFIG.history, CONFIG.historyTheater].map((cfg) => ({
    cfg,
    zone: null,      // THREE.Box3 del cubo (en coordenadas de mundo)
    shots: [],       // { pos, look } por capítulo
    dwell: [],       // segundos por capítulo (según la longitud del texto)
    inside: false,
    seen: false,
}));
let hxStory = HISTORY_STORIES[0];   // historia activa (la que se está mostrando)
let historyOpen = false;
let historyPaused = false;
let historyIndex = 0;
let historyElapsed = 0;
let historyTuning = 0;       // segundos restantes de la "sintonía" inicial
let historyTuningTotal = 1.8;
let historyRAF = 0;
let historyLast = 0;
let historyAudio = null;
let historyCountRAF = 0;
let historyHintEl = null;
let hxFading = false;        // true mientras dura una transición (el reloj del capítulo se detiene)
let hxTransTimer = 0;
let hxClock = 0;
let hxPanP = 0;              // progreso suavizado del paneo continuo (0 → 1)
let hxCurrentShot = null;
const hxCamPos = new THREE.Vector3();
const hxLook = new THREE.Vector3();
const _hxDir = new THREE.Vector3();
const _hxRight = new THREE.Vector3();
const _hxTarget = new THREE.Vector3();

// Tiempo de lectura de cada capítulo: ~2.6 palabras por segundo + margen
HISTORY_STORIES.forEach((story) => {
    story.dwell = story.cfg.chapters.map((c) => {
        const words = (c.text.join(' ') + ' ' + (c.fact || '')).replace(/<[^>]+>/g, '').split(/\s+/).length;
        return Math.max(13, words / 2.6 + 5);
    });
    // Tiempo acumulado antes de cada capítulo (para el paneo continuo de los planos únicos)
    story.dwellStart = [];
    story.dwellTotal = story.dwell.reduce((acc, d) => { story.dwellStart.push(acc); return acc + d; }, 0);
});

// Dibuja los capítulos y los puntos de la historia activa (se llama al abrirla).
function renderHistoryChapters(story) {
    const wrap = document.getElementById('hx-chapters');
    const dots = document.getElementById('hx-dots');
    wrap.innerHTML = '';
    dots.innerHTML = '';
    story.cfg.chapters.forEach((c, i) => {
        const sec = document.createElement('section');
        sec.className = 'hx-chapter';
        const stats = c.stats ? `<div class="hx-stats">${c.stats.map((st) =>
            `<div class="hx-stat"><b data-to="${st.n}" data-dec="${st.dec || 0}" data-pre="${st.prefix || ''}" data-suf="${st.suffix || ''}">0</b><span>${st.l}</span></div>`).join('')}</div>` : '';
        sec.innerHTML = `<div class="hx-year">${c.year}<small>${c.tag}</small></div>
            <span class="hx-kicker">${c.kicker}</span>
            <h2 class="hx-title">${c.title}</h2>
            <div class="hx-text">${c.text.map((t) => `<p>${t}</p>`).join('')}</div>
            ${stats}
            ${c.fact ? `<div class="hx-fact">${c.fact}</div>` : ''}`;
        wrap.appendChild(sec);
        const d = document.createElement('button');
        d.setAttribute('aria-label', `Capítulo ${i + 1}`);
        d.addEventListener('click', () => { if (historyTuning <= 0 && i !== historyIndex) goHistoryChapter(i); });
        dots.appendChild(d);
    });
}

function buildHistoryUI() {
    document.getElementById('hx-prev').addEventListener('click', () => stepHistory(-1));
    document.getElementById('hx-next').addEventListener('click', () => stepHistory(1));
    document.getElementById('hx-play').addEventListener('click', toggleHistoryPlay);
    document.getElementById('hx-close').addEventListener('click', () => closeHistory(false));
    document.getElementById('hx-voice').addEventListener('click', toggleNarration);

    historyHintEl = document.createElement('div');
    historyHintEl.id = 'history-hint';
    historyHintEl.innerHTML = 'Presiona <kbd>F</kbd> o <kbd>H</kbd> para revivir la historia de la radio';
    document.body.appendChild(historyHintEl);
}

function markHistoryDots(n) {
    document.querySelectorAll('#hx-dots button').forEach((d, i) => d.classList.toggle('on', i === n));
    document.getElementById('hx-prev').disabled = n === 0;
}

// Coloca el plano de un capítulo: la cámara salta al empty de cámara (corte limpio,
// tapado por el fundido) y el paneo arranca desde la izquierda.
function applyHistoryShot(n) {
    const shot = hxStory.shots[n] || hxCurrentShot; // si falta el empty, se queda en el plano anterior
    const g = characterGroup.position;
    if (shot) {
        hxCamPos.copy(shot.pos);
        if (shot.look) hxLook.copy(shot.look); else hxLook.set(g.x, g.y + 1.3, g.z);
        hxCurrentShot = shot;
    } else { // no hay ningún empty en el modelo: la cámara se queda y mira al personaje
        hxCamPos.copy(camera.position);
        hxLook.set(g.x, g.y + 1.3, g.z);
        hxCurrentShot = { pos: hxCamPos.clone(), look: hxLook.clone() };
    }
}

// Muestra el capítulo N (texto + plano de cámara) de inmediato.
function showHistoryChapter(n) {
    const secs = document.querySelectorAll('.hx-chapter');
    n = Math.max(0, Math.min(secs.length - 1, n));
    historyIndex = n;
    historyElapsed = 0;
    secs.forEach((s, i) => s.classList.toggle('active', i === n));
    markHistoryDots(n);
    document.getElementById('hx-chapters').scrollTop = 0;
    const cite = hxStory.cfg.chapters[n].cite || '';
    document.getElementById('hx-source').textContent = cite.replace(/^Fuentes?:\s*/i, '');
    applyHistoryShot(n);
    if (historyTuning <= 0) startNarration(n); // en la primera, la voz entra cuando termina la sintonía
    cancelAnimationFrame(historyCountRAF);
    const nums = secs[n].querySelectorAll('.hx-stat b');
    if (nums.length) {
        const t0 = performance.now();
        const step = (now) => {
            const k = Math.min((now - t0 - 500) / 1200, 1);
            const e = k <= 0 ? 0 : 1 - Math.pow(1 - k, 3);
            nums.forEach((el) => {
                const to = parseFloat(el.dataset.to), dec = +el.dataset.dec;
                const v = to * e;
                el.textContent = el.dataset.pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('es-BO')) + el.dataset.suf;
            });
            if (k < 1) historyCountRAF = requestAnimationFrame(step);
        };
        historyCountRAF = requestAnimationFrame(step);
    }
}

// Transición entre capítulos: fundido a azul (con un destello de "cambio de sintonía"),
// corte de cámara en el punto más oscuro y fundido de vuelta.
function goHistoryChapter(n, first) {
    const total = hxStory.dwell.length;
    n = Math.max(0, Math.min(total - 1, n));
    const fade = document.getElementById('hx-fade');
    clearTimeout(hxTransTimer);
    // Plano único: entre capítulos NO hay corte, fundido ni chasquido; sólo cambia el texto
    // y la cámara sigue su paneo. (El fundido de apertura y cierre sí se conserva: tapa el
    // salto de la cámara del personaje al plano y de vuelta.)
    if (hxStory.cfg.fixedShot && !first) {
        showHistoryChapter(n);
        return;
    }
    hxFading = true;
    historyIndex = n;
    stopNarration();
    markHistoryDots(n);
    fade.classList.add('on');
    if (!first) historyPlayBlip();
    hxTransTimer = setTimeout(() => {
        if (!historyOpen) return;
        showHistoryChapter(n);   // texto + corte de cámara, ya tapados por el fundido
        fade.classList.remove('on');
        hxFading = false;
    }, first ? 650 : 480);
}

function historyPlayTuning(dur) {
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        historyAudio = historyAudio || new AC();
        const ac = historyAudio;
        if (ac.state === 'suspended') ac.resume();
        const vol = parseFloat(document.getElementById('volume').value) || 0.5;
        const t = ac.currentTime;
        const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = buf;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5;
        bp.frequency.setValueAtTime(350, t);
        bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.8);
        bp.frequency.exponentialRampToValueAtTime(900, t + dur);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.14 * vol, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(bp); bp.connect(g); g.connect(ac.destination);
        src.start(t);
        [880, 1318.5].forEach((f, i) => { // "ding" al encontrar la señal
            const o = ac.createOscillator(), og = ac.createGain(), t2 = t + dur + i * 0.09;
            o.type = 'sine'; o.frequency.value = f;
            og.gain.setValueAtTime(0.0001, t2);
            og.gain.exponentialRampToValueAtTime(0.16 * vol, t2 + 0.02);
            og.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.9);
            o.connect(og); og.connect(ac.destination); o.start(t2); o.stop(t2 + 1);
        });
    } catch (err) { /* el sonido es opcional */ }
}

// Pequeño chasquido de radio al cambiar de capítulo
function historyPlayBlip() {
    try {
        const ac = historyAudio; if (!ac) return;
        const vol = parseFloat(document.getElementById('volume').value) || 0.5;
        const dur = 0.5, t = ac.currentTime;
        const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ac.createBufferSource(); src.buffer = buf;
        const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
        bp.frequency.setValueAtTime(1800, t);
        bp.frequency.exponentialRampToValueAtTime(700, t + dur);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.09 * vol, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(bp); bp.connect(g); g.connect(ac.destination);
        src.start(t);
    } catch (err) { /* opcional */ }
}

function historyTick(now) {
    if (!historyOpen) return;
    const dt = Math.min((now - historyLast) / 1000, 0.1);
    historyLast = now;
    const root = document.getElementById('history-story');
    const total = hxStory.dwell.length;

    if (historyTuning > 0) {
        // Fase 1: el dial sintoniza de 88.0 a 94.5 FM
        historyTuning -= dt;
        const k = Math.max(0, Math.min(1, 1 - historyTuning / historyTuningTotal));
        const e = 1 - Math.pow(1 - k, 3);
        document.getElementById('hx-freq-num').textContent =
            Math.max(88, 88 + 6.5 * e + (1 - k) * Math.sin(k * 26) * 0.9).toFixed(1);
        if (historyTuning <= 0) {
            document.getElementById('hx-freq-num').textContent = '94.5';
            root.classList.remove('tuning');
            startNarration(historyIndex);
        }
    } else if (!historyPaused && !hxFading && !document.hidden) {
        // Fase 2: la historia avanza sola
        const dwell = hxStory.dwell[historyIndex];
        // Con narración, el capítulo dura lo que dure la voz: si aún habla, el reloj se frena al final
        // del tiempo estimado; si termina antes, se pasa al siguiente tras una breve pausa.
        if (narrActive && historyElapsed >= dwell * 0.985) {
            historyElapsed = dwell * 0.985;
            narrHold += dt;
            if (narrHold > 25) narrFinished(); // la voz no responde: seguimos por tiempo
        } else historyElapsed += dt;
        const p = (historyIndex + Math.min(historyElapsed / dwell, 1)) / total;
        document.getElementById('hx-progress-bar').style.width = `${p * 100}%`;
        const narrReady = narrOn && !narrActive && narrDone && narrDoneAt > 0;
        const timeUp = narrOn ? (narrReady && historyElapsed >= narrDoneAt + CONFIG.narration.gapAfter)
                              : historyElapsed >= dwell;
        // si la narración no pudo arrancar (sin voz y sin audio), se usa el tiempo estimado de siempre
        const fallbackUp = narrOn && narrDone && narrDoneAt === 0 && historyElapsed >= dwell;
        if (timeUp || fallbackUp) {
            if (historyIndex >= total - 1) { closeHistory(true); return; }
            goHistoryChapter(historyIndex + 1);
        }
    }
    historyRAF = requestAnimationFrame(historyTick);
}

function openHistory(story) {
    if (historyOpen || panelOpen) return;
    if (photoMode) exitPhotoMode();
    hxStory = story || HISTORY_STORIES.find((st) => st.inside) || HISTORY_STORIES[0];
    renderHistoryChapters(hxStory);
    historyOpen = true;
    panelOpen = true;                 // bloquea caminar, girar, zoom y apuntar
    historyPaused = false;
    hxFading = true;
    document.getElementById('hx-play').textContent = '⏸';
    for (const k in keys) keys[k] = false;
    player.velocity.set(0, 0, 0);
    document.getElementById('interact-hint').classList.remove('visible');
    document.getElementById('crosshair').style.visibility = 'hidden';
    if (historyHintEl) historyHintEl.classList.remove('visible');
    if (document.pointerLockElement === canvas) document.exitPointerLock(); // libera el mouse para los botones

    hxClock = 0;
    hxPanP = 0;
    hxCurrentShot = null;
    hxCamPos.copy(camera.position);
    camera.getWorldDirection(_hxDir);
    hxLook.copy(camera.position).addScaledVector(_hxDir, 6);

    const root = document.getElementById('history-story');
    root.classList.add('visible', 'tuning');
    root.setAttribute('aria-hidden', 'false');
    document.getElementById('hx-progress-bar').style.width = '0%';
    historyTuningTotal = hxStory.seen ? 1.0 : 1.8;
    historyTuning = historyTuningTotal;
    historyPlayTuning(historyTuningTotal);
    hxStory.seen = true;
    markStorySeen(hxStory);
    updateDiscoveryHud(true);
    setMusicDuck('story', CONFIG.narration.musicDuck); // la música baja sola mientras se cuenta la historia
    discoverHud.classList.add('suspended');
    storyMarkerGroup.visible = false;
    updateNarrBtn();
    goHistoryChapter(0, true);        // fundido -> corte al plano 1 -> fundido de vuelta
    historyLast = performance.now();
    cancelAnimationFrame(historyRAF);
    historyRAF = requestAnimationFrame(historyTick);
}

function closeHistory(auto) {
    if (!historyOpen) return;
    historyOpen = false;               // la historia deja de avanzar al instante
    stopNarration();
    setMusicDuck('story', 1);          // la música vuelve a subir suave
    discoverHud.classList.remove('suspended');
    storyMarkerGroup.visible = true;
    cancelAnimationFrame(historyRAF); cancelAnimationFrame(historyCountRAF);
    clearTimeout(hxTransTimer);
    const root = document.getElementById('history-story');
    const fade = document.getElementById('hx-fade');
    fade.classList.add('on');          // fundido a azul: tapa el regreso de la cámara al personaje
    hxTransTimer = setTimeout(() => {
        panelOpen = false;             // la cámara normal retoma el control (corte oculto bajo el fundido)
        root.classList.remove('visible', 'tuning');
        root.setAttribute('aria-hidden', 'true');
        document.getElementById('crosshair').style.visibility = '';
        player.velocity.set(0, 0, 0);
        clock.getDelta();              // descarta el tiempo transcurrido
        for (const k in keys) keys[k] = false;
        hxFading = false;
        if (mode === 'fly' && cameraMode === 'manual') canvas.requestPointerLock();
        setTimeout(() => fade.classList.remove('on'), 700);
    }, 450);
    showToast(auto ? 'Fin de la historia · haz clic para seguir explorando · H para repetirla' : 'Cada punto dorado guarda otra historia ✨');
}

function stepHistory(dir) {
    if (!historyOpen || historyTuning > 0) return;
    const next = historyIndex + dir;
    if (next >= hxStory.dwell.length) { closeHistory(true); return; }
    if (next < 0) return;
    goHistoryChapter(next);
}

function toggleHistoryPlay() {
    if (!historyOpen) return;
    historyPaused = !historyPaused;
    document.getElementById('hx-play').textContent = historyPaused ? '▶' : '⏸';
    if (historyPaused) pauseNarration(); else resumeNarration();
    updateNarrBtn();
}

function handleHistoryKey(e) {
    if (e.repeat) return;
    switch (e.code) {
        case 'Escape': case 'KeyF': case 'KeyH': closeHistory(false); break;
        case 'ArrowRight': case 'KeyD': case 'Enter': stepHistory(1); break;
        case 'ArrowLeft': case 'KeyA': stepHistory(-1); break;
        case 'Space': e.preventDefault(); toggleHistoryPlay(); break;
        case 'KeyV': toggleNarration(); break;
    }
}

// Cámara de cine: se queda en el punto del capítulo y PANEA despacio de izquierda a
// derecha alrededor del punto de mirada, siguiendo el avance del capítulo. Va DESPUÉS
// de updatePlayer (que no toca la cámara mientras la historia está abierta).
function updateHistoryCamera(delta) {
    if (!historyOpen) return;
    // El personaje se queda quieto, en reposo (sin patinar con la animación de caminar)
    if (characterMixer) setCharacterAction('idle', delta);
    updateProceduralWalkFallback(delta, false, false);
    hxClock += delta;

    // Progreso del capítulo (0 → 1): de él depende cuánto ha girado la cámara
    let p;
    if (hxStory.cfg.fixedShot) {
        // Paneo continuo sobre TODA la historia: izquierda → derecha, sin reiniciarse por capítulo.
        // Se suaviza para que un salto de capítulo (flechas) no dé un tirón de cámara.
        const target = historyTuning > 0 ? 0
            : Math.min((hxStory.dwellStart[historyIndex] + Math.min(historyElapsed, hxStory.dwell[historyIndex])) / hxStory.dwellTotal, 1);
        hxPanP += (target - hxPanP) * Math.min(1, delta * 4);
        p = hxPanP;
    } else {
        p = historyTuning > 0 ? 0 : Math.min(historyElapsed / hxStory.dwell[historyIndex], 1);
    }
    const half = (hxStory.cfg.panDegrees * Math.PI / 180) / 2;
    const ang = half - 2 * half * p;   // empieza mirando a la izquierda del objetivo y termina a la derecha

    _hxDir.subVectors(hxLook, hxCamPos);
    const dist = Math.max(_hxDir.length(), 0.01);
    _hxDir.divideScalar(dist);
    // "derecha" de la cámara (en horizontal); si mira casi vertical, usa el eje X como respaldo
    _hxRight.set(-_hxDir.z, 0, _hxDir.x);
    if (_hxRight.lengthSq() < 0.02) _hxRight.set(1, 0, 0); else _hxRight.normalize();
    // desplazar el punto de mirada hacia los lados = girar la cámara sobre su propio eje
    _hxTarget.copy(hxLook).addScaledVector(_hxRight, -Math.tan(ang) * dist);

    camera.position.copy(hxCamPos);
    camera.position.y += Math.sin(hxClock * 0.6) * 0.02; // respiración casi imperceptible
    camera.lookAt(_hxTarget);
}

// Se llama cada frame en modo manual: abre la historia al entrar a la zona del cubo.
function updateHistoryZone() {
    const p = characterGroup.position;
    let anyInside = false, anySeenInside = false;
    for (const story of HISTORY_STORIES) {
        const z = story.zone;
        if (!z) continue;
        const m = story.cfg.margin;
        const inside =
            p.x >= z.min.x - m && p.x <= z.max.x + m &&
            p.z >= z.min.z - m && p.z <= z.max.z + m &&
            p.y >= z.min.y - 1.5 && p.y <= z.max.y + 2.0;
        if (inside && !story.inside) {
            story.inside = true;
            if (!story.seen && !panelOpen && !historyOpen) openHistory(story); // primera vez: se abre sola
        } else if (!inside && story.inside) {
            story.inside = false;
        }
        if (inside) { anyInside = true; if (story.seen) anySeenInside = true; }
    }
    if (historyHintEl) {
        historyHintEl.classList.toggle('visible', anyInside && anySeenInside && !historyOpen && !panelOpen && !aimedInteractable);
    }
}

// ============================================
// NARRACIÓN CON VOZ DE LOCUTOR (historias)
// ============================================
// Cada capítulo se lee en voz alta. Primero se intenta una grabación real
// (CONFIG.narration.audioFolder); si no existe, se usa la voz en español del navegador.
// La historia avanza al terminar la lectura (ver historyTick), así texto, cámara y voz van juntos.
let narrOn = CONFIG.narration.enabled;
let narrToken = 0;          // invalida lecturas anteriores (cambio de capítulo, cierre, pausa)
let narrActive = false;     // true mientras el capítulo actual se está narrando
let narrDone = true;        // true cuando la narración del capítulo actual terminó (o no hay)
let narrDoneAt = 0;         // historyElapsed en el que terminó
let narrSentences = [];
let narrSentIdx = 0;
let narrHold = 0;          // segundos que el reloj lleva esperando a la voz (seguro anti-cuelgue)
let narrClip = null;        // <audio> si hay grabación real
let narrVoice = null;
const speech = ('speechSynthesis' in window) ? window.speechSynthesis : null;

function pickNarratorVoice() {
    if (!speech) return null;
    const voices = speech.getVoices().filter((v) => /^es([-_]|$)/i.test(v.lang));
    if (!voices.length) return null;
    const langRank = (v) => {
        const l = v.lang.replace('_', '-').toLowerCase();
        if (l === 'es-bo') return 0;
        if (l === 'es-us' || l === 'es-419') return 1;
        if (l === 'es-mx') return 2;
        return 3;
    };
    const male = /pablo|jorge|diego|raul|raúl|carlos|juan|enrique|miguel|alvaro|álvaro|andres|andrés|male|hombre/i;
    return voices.slice().sort((a, b) =>
        (male.test(b.name) - male.test(a.name)) || (langRank(a) - langRank(b)) ||
        (a.localService === b.localService ? 0 : a.localService ? -1 : 1))[0];
}
if (speech) {
    narrVoice = pickNarratorVoice();
    speech.addEventListener('voiceschanged', () => { narrVoice = pickNarratorVoice(); });
}

function narrVolume() {
    const v = getUserVolume();
    return v <= 0 ? 0 : Math.min(1, 0.5 + v);
}

// Texto que se lee: título + párrafos + dato curioso (sin etiquetas HTML)
function narrationTextFor(ch) {
    const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const parts = [strip(ch.title), ...ch.text.map(strip)];
    if (ch.fact) parts.push('¿Sabías que? ' + strip(ch.fact));
    return parts.join(' ');
}
function splitSentences(text) {
    // frases cortas = la voz no se corta a mitad de párrafo y se puede pausar/reanudar sin perder el hilo
    return (text.match(/[^.!?…]+[.!?…]+["”»)]*|[^.!?…]+$/g) || [text]).map((x) => x.trim()).filter(Boolean);
}

function stopNarration() {
    narrToken++;
    narrActive = false;
    if (speech) speech.cancel();
    if (narrClip) { narrClip.onended = narrClip.onerror = null; narrClip.pause(); narrClip = null; }
    updateNarrBtn();
}

function narrFinished() {
    narrActive = false;
    narrDone = true;
    narrDoneAt = historyElapsed;
    updateNarrBtn();
}

function speakNextSentence(token) {
    if (token !== narrToken) return;
    if (narrSentIdx >= narrSentences.length) { narrFinished(); return; }
    const u = new SpeechSynthesisUtterance(narrSentences[narrSentIdx]);
    u.lang = narrVoice ? narrVoice.lang : 'es-ES';
    if (narrVoice) u.voice = narrVoice;
    u.rate = CONFIG.narration.rate;
    u.pitch = CONFIG.narration.pitch;
    u.volume = narrVolume();
    u.onend = () => { if (token !== narrToken) return; narrSentIdx++; speakNextSentence(token); };
    u.onerror = (ev) => {
        if (token !== narrToken) return;
        if (ev.error === 'canceled' || ev.error === 'interrupted') return;
        narrFinished(); // si la voz falla, la historia sigue por tiempo como antes
    };
    speech.speak(u);
}

// Empieza a narrar el capítulo n de la historia activa
function startNarration(n) {
    stopNarration();
    narrDone = true; narrDoneAt = 0; narrHold = 0;
    if (!narrOn) return;
    const ch = hxStory.cfg.chapters[n];
    if (!ch) return;
    const token = narrToken;
    narrActive = true; narrDone = false;
    updateNarrBtn();

    const fallbackToVoice = () => {
        if (token !== narrToken) return;
        narrClip = null;
        if (!speech) { narrFinished(); return; }
        narrSentences = splitSentences(narrationTextFor(ch));
        narrSentIdx = 0;
        if (!narrVoice) narrVoice = pickNarratorVoice();
        if (!historyPaused) speakNextSentence(token);
    };

    // 1) grabación real (opcional)
    const id = CONFIG.narration.storyIds[HISTORY_STORIES.indexOf(hxStory)] || 'historia';
    const clip = new Audio(`${CONFIG.narration.audioFolder}${id}_${n + 1}.mp3`);
    clip.volume = narrVolume();
    narrClip = clip;
    clip.onended = () => { if (token === narrToken) { narrClip = null; narrFinished(); } };
    clip.onerror = fallbackToVoice;               // no hay archivo → voz del navegador
    if (historyPaused) return;
    clip.play().catch((err) => { if (err && err.name === 'NotAllowedError') fallbackToVoice(); });
}

function pauseNarration() {
    if (!narrActive) return;
    if (narrClip) narrClip.pause();
    else if (speech) { narrToken++; speech.cancel(); } // se retoma desde la frase en curso
}
function resumeNarration() {
    if (!narrActive) return;
    if (narrClip) { narrClip.play().catch(() => {}); return; }
    if (speech) { const token = narrToken; speakNextSentence(token); }
}

function toggleNarration() {
    narrOn = !narrOn;
    if (!narrOn) { stopNarration(); narrDone = true; narrDoneAt = historyElapsed; }
    else if (historyOpen && historyTuning <= 0) startNarration(historyIndex);
    updateNarrBtn();
    showToast(narrOn ? 'Narración activada 🎙' : 'Narración desactivada');
}

function updateNarrBtn() {
    const b = document.getElementById('hx-voice');
    if (!b) return;
    b.classList.toggle('on', narrOn);
    b.classList.toggle('speaking', narrOn && narrActive && !historyPaused);
    b.title = narrOn ? 'Silenciar narración (V)' : 'Activar narración (V)';
}

// ============================================
// GUÍA Y PROGRESO: contador de descubrimientos + minimapa/brújula
// ============================================
const discoverHud = document.getElementById('discovery-hud');
const dcPointsEl = document.getElementById('dc-points');
const dcStoriesEl = document.getElementById('dc-stories');
const dcBarEl = document.getElementById('dc-bar');
const mmCanvas = document.getElementById('minimap');
const mmCtx = mmCanvas.getContext('2d');
const MM_SIZE = CONFIG.guide.minimapSize;
const MM_DPR = Math.min(window.devicePixelRatio || 1, 2);
mmCanvas.width = MM_SIZE * MM_DPR; mmCanvas.height = MM_SIZE * MM_DPR;
mmCanvas.style.width = MM_SIZE + 'px'; mmCanvas.style.height = MM_SIZE + 'px';

const GLOW_SEEN = 'rgba(110,215,150,0.85)';
let allDoneCelebrated = false;
const storyMarkerGroup = new THREE.Group(); // anillos en el piso donde está cada cubo de historia
storyMarkerGroup.visible = false;
scene.add(storyMarkerGroup);

function buildStoryMarkers() {
    HISTORY_STORIES.forEach((story) => {
        if (!story.zone || story.marker) return;
        const c = story.zone.getCenter(new THREE.Vector3());
        const size = story.zone.getSize(new THREE.Vector3());
        const r = Math.max(0.35, Math.min(size.x, size.z) * 0.5 + 0.1);
        const g = new THREE.Group();
        g.position.set(c.x, story.zone.min.y + 0.05, c.z);
        const mat = (op) => new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.82, r, 48), mat(0.85));
        ring.rotation.x = -Math.PI / 2;
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 2.4, 32, 1, true), mat(0.12));
        beam.position.y = 1.2;
        g.add(ring, beam);
        storyMarkerGroup.add(g);
        story.marker = { group: g, ring, beam };
        if (story.seen) markStorySeen(story);
    });
}

function markStorySeen(story) {
    if (!story || !story.marker) return;
    story.marker.ring.material.color.set(0x6ed796);
    story.marker.beam.material.color.set(0x6ed796);
    story.marker.beam.material.opacity = 0.06;
}

function markHotspotSeen(h) {
    if (h.seen) return;
    h.seen = true;
    h.marker.material.map = getMarkerTexture('green'); // ya lo viste: anillo verde con check
    h.marker.material.needsUpdate = true;
    updateDiscoveryHud(true);
}

function updateDiscoveryHud(celebrate) {
    const total = hotspots.length;
    const seen = hotspots.filter((h) => h.seen).length;
    const stories = HISTORY_STORIES.filter((st) => st.zone);
    const storiesSeen = stories.filter((st) => st.seen).length;
    dcPointsEl.textContent = `${seen} de ${total}`;
    dcStoriesEl.textContent = `${storiesSeen} de ${stories.length}`;
    dcBarEl.style.width = total ? `${(seen / total) * 100}%` : '0%';
    const complete = total > 0 && seen === total && storiesSeen === stories.length;
    discoverHud.classList.toggle('complete', complete);
    if (celebrate && complete && !allDoneCelebrated) {
        allDoneCelebrated = true;
        setTimeout(() => showToast('¡Lo descubriste todo! Gracias por recorrer Radio Nacional Huanuni ✨'), 600);
    }
}

// --- Minimapa: el edificio se dibuja una sola vez (huella de pisos y muros) en un canvas aparte ---
let mmFootprint = null; // { canvas, minX, minZ, scale }
function buildMinimapFootprint() {
    if (!buildingBox || (floorMeshes.length + wallMeshes.length) === 0) return;
    const pad = 2;
    const minX = buildingBox.min.x - pad, minZ = buildingBox.min.z - pad;
    const w = buildingBox.max.x - buildingBox.min.x + pad * 2;
    const h = buildingBox.max.z - buildingBox.min.z + pad * 2;
    const scale = 720 / Math.max(w, h);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * scale); cv.height = Math.ceil(h * scale);
    const cx = cv.getContext('2d');
    const box = new THREE.Box3();
    cx.fillStyle = 'rgba(255,255,255,0.10)';
    floorMeshes.forEach((m) => {
        box.setFromObject(m);
        cx.fillRect((box.min.x - minX) * scale, (box.min.z - minZ) * scale, (box.max.x - box.min.x) * scale, (box.max.z - box.min.z) * scale);
    });
    cx.fillStyle = 'rgba(255,255,255,0.55)';
    wallMeshes.forEach((m) => {
        box.setFromObject(m);
        const dx = box.max.x - box.min.x, dz = box.max.z - box.min.z;
        if (Math.min(dx, dz) > 1.0) return; // sólo muros finos; un bloque grande ensuciaría el mapa
        cx.fillRect((box.min.x - minX) * scale, (box.min.z - minZ) * scale, Math.max(dx * scale, 1.5), Math.max(dz * scale, 1.5));
    });
    mmFootprint = { canvas: cv, minX, minZ, scale };
}

const MM_GOLD = '#e0c878', MM_GREEN = '#6ed796';
function drawMinimap(time) {
    if (!mmFootprint) buildMinimapFootprint();
    const S = MM_SIZE * MM_DPR, R = S / 2;
    const px = characterGroup.position.x, pz = characterGroup.position.z, py = characterGroup.position.y;
    const ppm = (R - 14 * MM_DPR) / CONFIG.guide.minimapRange; // píxeles por metro
    const yaw = player.yaw;
    const ctx = mmCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(R, R, R - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(8,10,18,0.78)'; ctx.fillRect(0, 0, S, S);

    // Mundo -> minimapa: el "frente" del jugador queda siempre ARRIBA
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const toMap = (x, z) => {
        const dx = x - px, dz = z - pz;
        return [R + (dx * cos - dz * sin) * ppm, R + (dx * sin + dz * cos) * ppm];
    };

    // Edificio
    if (mmFootprint) {
        ctx.save();
        ctx.translate(R, R);
        ctx.rotate(yaw);
        ctx.translate(-(px - mmFootprint.minX) * ppm, -(pz - mmFootprint.minZ) * ppm);
        ctx.scale(ppm / mmFootprint.scale, ppm / mmFootprint.scale);
        ctx.drawImage(mmFootprint.canvas, 0, 0);
        ctx.restore();
    }

    // Puntos: dorados = pendientes, verdes = vistos. Si están lejos, se pegan al borde como flechas.
    const edge = R - 12 * MM_DPR;
    const dot = (x, z, y, color, shape, pulse) => {
        let [mx, my] = toMap(x, z);
        let dx = mx - R, dy = my - R;
        const d = Math.hypot(dx, dy);
        const far = d > edge;
        if (far) { dx *= edge / d; dy *= edge / d; mx = R + dx; my = R + dy; }
        const r = (shape === 'sq' ? 4.2 : 3.4) * MM_DPR * (far ? 0.8 : 1);
        ctx.globalAlpha = far ? 0.7 : 1;
        if (pulse && !far) {
            ctx.strokeStyle = color; ctx.lineWidth = 1.5 * MM_DPR;
            ctx.beginPath(); ctx.arc(mx, my, r + (2 + ((time * 2) % 1) * 6) * MM_DPR, 0, Math.PI * 2);
            ctx.globalAlpha = 1 - ((time * 2) % 1); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        if (shape === 'sq') ctx.rect(mx - r, my - r, r * 2, r * 2); else ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        const dyW = y - py;
        if (Math.abs(dyW) > 2.2) { // otro piso: ▲ arriba / ▼ abajo
            ctx.fillStyle = '#fff'; ctx.font = `${7 * MM_DPR}px sans-serif`; ctx.textAlign = 'center';
            ctx.fillText(dyW > 0 ? '▲' : '▼', mx, my - r - 2 * MM_DPR);
        }
        ctx.globalAlpha = 1;
    };

    // el pendiente más cercano late para guiar
    let nearest = null, nd = Infinity;
    hotspots.forEach((h) => { if (!h.seen) { const d = Math.hypot(h.position.x - px, h.position.z - pz); if (d < nd) { nd = d; nearest = h; } } });
    hotspots.forEach((h) => dot(h.position.x, h.position.z, h.position.y, h.seen ? MM_GREEN : MM_GOLD, 'c', h === nearest));
    HISTORY_STORIES.forEach((st) => {
        if (!st.zone) return;
        const c = st.zone.getCenter(new THREE.Vector3());
        dot(c.x, c.z, st.zone.min.y, st.seen ? MM_GREEN : MM_GOLD, 'sq', false);
    });
    ctx.restore();

    // Aro + brújula (la N gira con la cámara)
    ctx.strokeStyle = 'rgba(201,168,76,0.55)'; ctx.lineWidth = 1.5 * MM_DPR;
    ctx.beginPath(); ctx.arc(R, R, R - 1, 0, Math.PI * 2); ctx.stroke();
    // N en el mundo = -Z
    const nxp = R + (0 * cos - (-1) * sin) * (R - 9 * MM_DPR);
    const nyp = R + (0 * sin + (-1) * cos) * (R - 9 * MM_DPR);
    ctx.fillStyle = '#d60000';
    ctx.beginPath(); ctx.arc(nxp, nyp, 7 * MM_DPR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${9 * MM_DPR}px Montserrat, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('N', nxp, nyp + 0.5 * MM_DPR);

    // Jugador (siempre en el centro, apuntando arriba)
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#050508'; ctx.lineWidth = 1.5 * MM_DPR;
    ctx.beginPath();
    ctx.moveTo(R, R - 7 * MM_DPR); ctx.lineTo(R + 5 * MM_DPR, R + 5 * MM_DPR); ctx.lineTo(R, R + 2 * MM_DPR); ctx.lineTo(R - 5 * MM_DPR, R + 5 * MM_DPR);
    ctx.closePath(); ctx.fill(); ctx.stroke();
}

let _mmLast = 0;
function updateGuide(time) {
    if (!discoverHud.classList.contains('visible') || photoMode) return;
    if (time - _mmLast < 0.033) return; // ~30 fps es suficiente para el minimapa
    _mmLast = time;
    drawMinimap(time);
}


buildHistoryUI();

// ============================================
// MODO FOTO: captura limpia (sin HUD) con el logo, lista para compartir
// ============================================
// P (o el botón 📷) entra al modo foto: se ocultan menús, mira, contador y marcadores; sigues
// moviéndote con WASD y puedes cambiar día/noche con N. Enter (o 📸) captura. La imagen sale con una
// franja de marca (logo + nombre + FM + sitio) y se puede descargar o compartir (WhatsApp, etc.).
let photoMode = false;
let photoModalOpen = false;
let photoBlob = null;
let photoUrl = '';
const photoModalEl = document.getElementById('photo-modal');
const photoImgEl = document.getElementById('photo-img');
const photoNoteEl = document.getElementById('photo-note');
const photoShareBtn = document.getElementById('photo-share');

function enterPhotoMode() {
    if (photoMode || mode !== 'fly' || cameraMode !== 'manual' || panelOpen || historyOpen) return;
    photoMode = true;
    document.body.classList.add('photo-mode');
    hotspotGroup.visible = false;          // sin puntos dorados ni anillos en la foto
    storyMarkerGroup.visible = false;
    document.getElementById('interact-hint').classList.remove('visible');
}
function exitPhotoMode() {
    if (!photoMode) return;
    photoMode = false;
    document.body.classList.remove('photo-mode');
    hotspotGroup.visible = true;
    storyMarkerGroup.visible = !historyOpen;
}
function togglePhotoMode() { photoMode ? exitPhotoMode() : enterPhotoMode(); }

// El logo.glb se renderiza una vez, con fondo transparente, en el visor de exhibición (otro canvas WebGL)
function renderLogoSticker(px) {
    if (!logoModelTemplate) return null;
    try {
        setExhibitObject(logoModelTemplate);
        if (!exhibitObject) return null;
        exhibitPivot.rotation.y = 0;
        exhibitRenderer.setSize(px, px, false);
        exhibitCamera.aspect = 1;
        exhibitCamera.updateProjectionMatrix();
        exhibitRenderer.setClearColor(0x000000, 0);
        exhibitRenderer.render(exhibitScene, exhibitCamera);
        const c = document.createElement('canvas');
        c.width = c.height = px;
        c.getContext('2d').drawImage(exhibitCanvasEl, 0, 0, px, px);
        clearExhibitStage();
        return c;
    } catch (err) { clearExhibitStage(); return null; }
}

function drawPhotoBrand(ctx, W, H, logo) {
    const barH = Math.max(86, Math.round(Math.min(W, H) * 0.15));
    const g = ctx.createLinearGradient(0, H - barH * 1.5, 0, H);
    g.addColorStop(0, 'rgba(5,5,8,0)'); g.addColorStop(1, 'rgba(5,5,8,0.88)');
    ctx.fillStyle = g; ctx.fillRect(0, H - barH * 1.5, W, barH * 1.5);
    const lg = ctx.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, '#d60000'); lg.addColorStop(1, '#c9a84c');
    ctx.fillStyle = lg; ctx.fillRect(0, H - 5, W, 5);

    const pad = barH * 0.3;
    const cy = H - barH * 0.5 - 4;
    let x = pad;
    if (logo) {
        const ls = barH * 0.86;
        ctx.drawImage(logo, x, cy - ls / 2, ls, ls);
        x += ls + pad * 0.6;
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    const f1 = Math.round(barH * 0.27);
    ctx.font = `800 ${f1}px Montserrat, Poppins, sans-serif`;
    const parts = [['Radio ', '#ff3b3b'], ['Nacional ', '#c9a84c'], ['Huanuni', '#ffffff']];
    let tx = x;
    parts.forEach(([t, c]) => { ctx.fillStyle = c; ctx.fillText(t, tx, cy - 2); tx += ctx.measureText(t).width; });
    ctx.font = `500 ${Math.round(barH * 0.16)}px Poppins, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.fillText('Museo Virtual 3D · FM 94.5 · Oruro, Bolivia', x, cy + barH * 0.22);
    ctx.textAlign = 'right';
    ctx.font = `600 ${Math.round(barH * 0.17)}px Poppins, sans-serif`;
    ctx.fillStyle = '#e0c878';
    ctx.fillText(CONFIG.photo.siteLabel, W - pad, cy + barH * 0.2);
}

function capturePhoto() {
    if (!photoMode || photoModalOpen) return;
    // La lectura del canvas WebGL debe ocurrir en el mismo ciclo del render, o sale en blanco
    renderFrame();
    const sw = canvas.width, sh = canvas.height;
    const k = Math.min(1, CONFIG.photo.maxSide / Math.max(sw, sh));
    const out = document.createElement('canvas');
    out.width = Math.round(sw * k); out.height = Math.round(sh * k);
    const ctx = out.getContext('2d');
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    const logo = renderLogoSticker(512);
    drawPhotoBrand(ctx, out.width, out.height, logo);

    const flash = document.getElementById('photo-flash');
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');

    out.toBlob((blob) => {
        if (!blob) { showToast('No se pudo crear la foto'); return; }
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        photoBlob = blob;
        photoUrl = URL.createObjectURL(blob);
        photoImgEl.src = photoUrl;
        photoNoteEl.textContent = '';
        photoShareBtn.style.display = canSharePhoto() ? '' : 'none';
        photoModalOpen = true;
        panelOpen = true;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        photoModalEl.classList.add('visible');
    }, 'image/jpeg', 0.92);
}

function photoFileName() {
    const d = new Date(), z = (n) => String(n).padStart(2, '0');
    return `radio-nacional-huanuni-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.jpg`;
}
function canSharePhoto() {
    try {
        return !!(navigator.canShare && photoBlob && navigator.canShare({ files: [new File([photoBlob], 'foto.jpg', { type: 'image/jpeg' })] }));
    } catch (e) { return false; }
}
function closePhotoModal() {
    if (!photoModalOpen) return;
    photoModalOpen = false;
    panelOpen = false;
    photoModalEl.classList.remove('visible');
    player.velocity.set(0, 0, 0);
    clock.getDelta();
}

document.getElementById('btn-photo').addEventListener('click', enterPhotoMode);
document.getElementById('photo-shoot').addEventListener('click', capturePhoto);
document.getElementById('photo-exit').addEventListener('click', exitPhotoMode);
document.getElementById('photo-close').addEventListener('click', closePhotoModal);
document.getElementById('photo-download').addEventListener('click', () => {
    if (!photoUrl) return;
    const a = document.createElement('a');
    a.href = photoUrl; a.download = photoFileName();
    document.body.appendChild(a); a.click(); a.remove();
    photoNoteEl.textContent = 'Foto guardada en tus descargas ✔';
});
photoShareBtn.addEventListener('click', async () => {
    if (!photoBlob) return;
    try {
        const file = new File([photoBlob], photoFileName(), { type: 'image/jpeg' });
        await navigator.share({
            files: [file],
            title: 'Radio Nacional Huanuni · Museo Virtual 3D',
            text: `${CONFIG.photo.shareText} ${location.origin}${location.pathname}`,
        });
    } catch (err) {
        if (err && err.name !== 'AbortError') photoNoteEl.textContent = 'No se pudo abrir el menú de compartir. Descarga la foto y envíala.';
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
            updateHistoryZone();
            updateHistoryCamera(delta);
        }
        updateFPS();
    }

    // Animación de apertura/cierre de puertas y portones (siempre activa)
    updateDoors(delta);

    // Animación (idle/caminar) del personaje jugable
    if (characterMixer) characterMixer.update(delta);

    // Guía: minimapa + marcadores de los cubos de historia
    if (mode === 'fly' && cameraMode === 'manual') {
        updateGuide(time);
        HISTORY_STORIES.forEach((st) => {
            if (!st.marker) return;
            const k = 1 + Math.sin(time * 2.2 + 1) * 0.04;
            st.marker.ring.scale.set(k, k, k);
            if (!st.seen) st.marker.beam.material.opacity = 0.1 + Math.sin(time * 2.2) * 0.04;
        });
    }

    if (radioPanelOpen) updateRadioVisuals(time);

    // Marcadores y etiquetas (distancia, oclusion, pulso)
    updateWorldTags(time, delta);
     updateOutline();

    particles.rotation.y += delta * 0.03;
    particles.rotation.x += delta * 0.01;

    renderFrame();

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
// ============================================
// RESIZE
// ============================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    if (panelOpen) resizeExhibitCanvas();
});

console.log('🖥️ Experiencia 3D unificada (con recorrido guiado, exhibición 3D real, colisión de muros y COL_* invisibles, detección robusta de animaciones y puertas corregidas, computadora con radio en vivo) cargada correctamente.');