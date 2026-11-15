# Chow Chow

Un corredor sin fin, como Chispas, con los doce animales del zodiaco chino: Rata, Buey, Tigre,
Conejo, Dragón, Serpiente, Caballo, Cabra, Mono, Gallo, Perro y Cerdo. Cada quien juega con el
animal de su fecha de nacimiento: corre, salta, lanza bolas de fuego del color de su animal y, con
la estrella, vuela. Recorre los mundos de los doce animales y el último es el suyo. Las bolas de
fuego se recargan con cócteles de la barra, mitad China y mitad México, y la comida china (la caja
para llevar, el tazón de arroz) da corazones.

Es un juego web hecho solo con HTML, CSS y JavaScript (módulos ES), sin dependencias ni paso de
compilación. Nació como fork de la base de *Chispas*.

> **Estado:** base del juego. La física, la lógica, los menús y HI RECORDS están completos y
> probados. El dragón, los obstáculos, los escenarios, los botones táctiles y los colores son
> **provisionales** (figuras simples en `js/graphics/Scene.js`, colores en `js/world/levels.js` y
> estilos simples en `css/styles.css`), y todavía no hay sonido. Todo está
> listo para recibirlos: ver [Arte](#arte) y [Sonido](#sonido).

## Jugar en local

Los módulos ES no cargan desde `file://`, así que hace falta un servidor local. Desde esta carpeta,
cualquiera de estos:

```bash
python -m http.server 8000
npx serve .
```

y abre `http://localhost:8000/`.

## Controles

| Acción | Teclado | Táctil / ratón | Control |
|---|---|---|---|
| Saltar (mantener: más alto) | Espacio, ↑, W | Mitad derecha del juego, botón «Saltar», clic | A, ↑ |
| Aletear (en el aire: volar) | Espacio, ↑, W | Igual que saltar | A, ↑ |
| Agacharse / en el aire, caer más rápido | ↓, S (mantener) | Mitad izquierda del juego, botón «Agacharse» | B, ↓ |
| Bola de fuego | X, J, F | Botón «Fuego» | X, Y |
| Pausa | Esc, P | Botón ⏸ | Start |
| Silenciar | M | — | — |

Funciona con controles de Xbox, PlayStation, genéricos, el joystick del arcade (que viene girado
90° y se endereza solo) y el control remoto de las teles. Start mantenido 3 segundos en la pantalla
de inicio abre el ajuste de la palanca.

## Cómo funciona

- **Tu animal** (`js/world/birth.js`, `js/ui/BirthPicker.js`, `js/ui/ZodiacWheel.js`): después del
  idioma se elige la fecha de nacimiento: día, mes y año (el año chino empieza con el Año Nuevo
  lunar, entre el 21 de enero y el 20 de febrero; las fechas de 1924 a 2043 están en `birth.js`). La rueda del zodiaco gira y se detiene en el animal que le
  toca. Junto a la rueda sale su tarjeta: el animal, su símbolo (el carácter tradicional, como
  龍), su nombre en chino simplificado con su pinyin (龙 · lóng), su nombre en el idioma del juego y
  sus cuatro virtudes (`virtues.<animal>` en `js/i18n/`). Los caracteres chinos usan una fuente china
  del sistema (la fuente pixel no los tiene). Con ese animal se juega. La fecha no se guarda: en una
  máquina de bar juega gente distinta.
- **El orden de los mundos** (`worldOrder` en `js/world/levels.js`): empieza en el animal que sigue
  al tuyo y el nivel 12 es tu mundo. Los mundos sin suelo nunca caen en los primeros tres niveles.
  Lo que se aprieta (velocidad, obstáculos nuevos) depende del número de nivel, no del animal.
- **Correr y saltar** (`js/entities/Player.js`), como Chispas: el salto es variable (mantener el
  botón salta más alto; soltarlo antes lo corta), abajo agacha en el suelo y en el aire hace caer
  más rápido. **Los 12 animales se mueven igual y tienen la misma caja de choque** (la cabeza), para
  que HI RECORDS sea justo; solo cambia el dibujo. El Dragón y la Serpiente dibujan un cuerpo largo
  que sigue el camino exacto de la cabeza (solo dibujo). Al perder, el mundo frena poco a poco y el
  animal cae.
- **Volar con la estrella**: la estrella sale una vez en cada nivel con suelo, al principio y a ras
  del suelo (se toma corriendo), y no sale si ya se tiene el poder. Al tomarla, el animal despega
  en ese momento (la nubecita o las alas se ven de inmediato). Con el poder, en el aire cada
  salto es un aleteo suave, con menos gravedad y caída máxima (`CONFIG.player.flight`). El Dragón y
  el Gallo vuelan con sus alas; los demás, en una nubecita. El poder pasa de un nivel al siguiente
  y **un golpe lo quita**: el animal cae al suelo. Se puede volar hasta 5 alturas de salto
  (`CONFIG.skyJumps`, ~510): el mundo es más alto que la pantalla y la cámara sube con el animal
  (`js/graphics/Camera.js`); un salto normal no la mueve. Sin la estrella, todos los niveles se
  pueden ganar corriendo y saltando (lo comprueban las pruebas).
- **Sin suelo** (los mundos del Dragón y el Gallo, `noGround` en `js/world/levels.js`): puro cielo,
  con nubes abajo. Ahí todos vuelan siempre, tengan o no la estrella, y un golpe no quita el poder. Si se sale de
  uno de ellos a un mundo con suelo, se sigue volando (como si tuviera la estrella), y otra estrella
  no cambia nada a quien ya vuela.
  Tocar las nubes quita un corazón y el animal rebota. Al llegar corriendo, el animal sale lanzado
  a volar.
- **Obstáculos** (`js/world/obstacles.js`, `js/world/Spawner.js`), en dos filas con su propio ritmo:
  - **Suelo:** postes, cajas, grupos y muros, barriles que ruedan más rápido, bichos que brincan en
    su lugar (arriba dejan pasar por debajo) y criaturas a tres alturas: las bajas se saltan, las
    de en medio se esquivan agachándose y las altas golpean si saltas. Desde el primer nivel hay
    algo que se mueve.
  - **Cielo:** oleadas de criaturas, linternas y nubes de tormenta, cada una en una franja de altura
    distinta y siempre con una libre. Más arriba, más riesgo: las franjas altas reciben más y van
    más rápido. Algunas se mueven: criaturas que suben y bajan o se lanzan en picada, linternas que
    suben despacio y nubes de tormenta que sueltan rayos cortos en zigzag. Los rayos caen muy
    seguido y siempre al mismo ritmo (varias veces mientras la nube cruza la pantalla), y antes de
    cada uno la nube parpadea y se ve tenue el zigzag donde va a caer: esquivarlos es cuestión de
    leer el ritmo, no de suerte. A veces, en vez
    de una oleada, sale una formación: escalera, pared con un hueco, zigzag o tormenta. En los
    niveles con suelo, nada del cielo (ni los rayos ni las picadas) baja a donde llega un salto
    normal: solo estorba a quien vuela. Sin suelo, ocupan todo el cielo.

  Cada animal agrega algo nuevo. Cada nivel tiene tramos (`PACING` en `js/world/obstacles.js`):
  calma, suelo, cielo, mezcla y un último tramo más intenso. La separación se
  piensa en segundos de reacción, como en Chispas, sin bajar nunca de lo que hace falta para
  reaccionar.
- **Lo que se recoge**, como los huesitos de Chispas: los cócteles y la comida salen en momentos y alturas al azar, del suelo al techo (más seguido arriba: para tomarlos
  hay que volar), y se mecen un poco. Nunca salen dos juntos (al menos 3.5 s entre uno y otro) y
  nunca obligan a chocar: solo aparecen si no acaba de salir un obstáculo cerca de su altura, y
  después espera un poco solo la fila de obstáculos de su altura; la otra sigue igual
  (`CONFIG.pickups`). Así siempre hay muchos más obstáculos que cosas para recoger. La cuenta de cócteles y
  comida sigue de un nivel al otro. Parpadean y destellan, para verse como coleccionables, y los
  que van muy alto se anuncian con una flechita arriba.
  - **Cóctel:** +3 bolas de fuego y 100 puntos.
  - **Comida china:** un corazón (hasta 3) y 200 puntos.

  Al elegir la dificultad sale una **leyenda sin texto**, como en las máquinas de arcade
  (`js/ui/Legend.js`): la estrella ▸ nubecita, los cócteles ▸ ◆×3 y sus puntos, la comida ▸ ♥×1 y sus puntos (con el
  multiplicador de la dificultad), y abajo el aviso para empezar. Se quita con el primer salto.
- **Bolas de fuego**, del color de cada animal: queman todo menos los muros y las nubes de tormenta
  (`burnable` en `js/world/obstacles.js`). Se empieza con 3. Casi todos los cócteles salen arriba
  (solo el 15% a la altura de un salto): para recargar hay que volar, así no basta con quemar todo
  desde el suelo. Nunca hacen falta: los 12 niveles se pueden pasar
  sin disparar (lo comprueban las pruebas).
- **12 niveles** (`js/world/levels.js`): cada uno más rápido; dentro de cada nivel la velocidad
  sube un poco. Van seguidos; al terminar uno se cobran los corazones. Después de tu mundo (el 12)
  viene el nivel 13.
- **Nivel 13: tu rival** (`bossLevel` en `js/world/levels.js`, `js/entities/Boss.js`), en las dos
  dificultades: el animal de enfrente en la rueda (`rivalOf`: Rata–Caballo, Buey–Cabra,
  Tigre–Mono, Conejo–Gallo, Dragón–Perro, Serpiente–Cerdo), en su mundo. Todos vuelan, tengan o no
  la estrella, y ahí un golpe no quita el vuelo. No hay obstáculos: solo el jefe, que se le gana con
  bolas de fuego (10 en fácil, 16 en difícil).
  - **Fácil:** el fuego es infinito (∞ en el HUD) y solo sale comida, muy de vez en cuando.
  - **Difícil:** salen cócteles seguido, y con 3 o más bolas de fuego, **mantener FUEGO carga un
    disparo especial** (`js/core/charge.js`): se suelta cargado y sale una bola grande que gasta
    solo una, le quita 3 de vida al jefe y atraviesa sus disparos. Un toque sigue siendo un disparo
    normal. Mientras se carga, el animal brilla del color de su fuego y el rombo del HUD crece.

  Los 12 jefes tienen los mismos ataques, siempre avisados antes (se ve tenue dónde van a pegar):
  - **Ráfaga:** tres disparos a tres alturas, con huecos para pasar.
  - **Puntería:** disparos a tu altura (uno en fácil, tres seguidos en difícil).
  - **Embestida:** marca una franja a su altura y la cruza a toda velocidad.

  Con la mitad de la vida descansa menos y dispara más rápido. Vencerlo da 5000 puntos (× la
  dificultad) y termina el viaje. Para probar: `?nivel=13`.
- **Golpes:** chocar con un obstáculo (o, sin suelo, con las nubes) quita un corazón (y la estrella);
  el animal da un saltito y parpadea invulnerable.
- **Puntos:** distancia recorrida, cada obstáculo quemado, la comida con los corazones llenos, los corazones al
  terminar cada nivel y puntos sin aviso por saltar algo muy de cerca, pasar agachado debajo o
  pasar volando rozándolo (`js/core/closeCalls.js`).
- **Racha** (`js/core/combo.js`): cada 8 obstáculos esquivados de cerca (o quemados) seguidos, los
  puntos se multiplican ×0.5 más, hasta ×3. Un golpe la reinicia. Se ve en el HUD.
- **Dificultades** (`DIFFICULTIES` en `js/world/levels.js`):
  - **Fácil:** 3 corazones, se reintenta el nivel. Cócteles cada 6–10 s, comida cada 12–18 s, hasta
    9 bolas de fuego.
  - **Difícil:** 2 corazones (la comida da más, hasta 3, y se conservan de un nivel al otro); al perder se vuelve al
    primer mundo. El cielo más lleno (oleadas más grandes, más seguido y más formaciones), más cosas
    que no se queman, la velocidad sube más dentro de cada nivel, cócteles cada 7–11 s, comida cada
    15–24 s y hasta 6 bolas de fuego. Los puntos valen ×1.5.
- **HI RECORDS:** quien vence a su rival (nivel 13) y entra al top 5 de su dificultad escribe un nombre
  de hasta 6 caracteres. Las tablas se alternan con el menú de inicio.
- **Bucle de juego** (`js/core/Loop.js`): paso fijo de 1/60 s con interpolación, igual en
  cualquier pantalla.

Todo lo que se ajusta (física, vuelo, velocidades, obstáculos, fuego, cócteles, puntos) está en
`js/config.js`. Para probar un nivel: `?nivel=5` empieza en el 5 (el Dragón, sin suelo).

- **Avisos** (`js/core/events.js`): Game cuenta lo que pasa (`jump`, `flap`, `land`, `fire`,
  `burn`, `cocktail`, `food`, `hit`, `levelStart`, `gameOver`...; la lista completa está en ese archivo) y quien
  quiera escucha. Así el sonido y los efectos se conectan en `js/main.js` sin tocar la lógica.

## Arte

`js/graphics/Scene.js` solo dibuja; no tiene lógica. Para poner el arte, coloca las imágenes en
`assets/images/` y escribe sus rutas en `js/graphics/assets.js`:

- **El dragón:** una imagen para la cabeza y una para cada una de las 5 partes. Cada parte se dibuja
  centrada en su lugar y girada según `angle`, que apunta hacia la parte de adelante. Para
  animarlo: `dragon.pose` (`run`, `duck`, `jump`, `fall`, `fly`, `hurt`, `dead`, `idle`),
  `dragon.runTime` (las patas) y `dragon.flapTime` (las alas).
- **Cada animal:** el cielo (pegado a la pantalla, se repite a lo ancho, con parallax), el suelo o
  las nubes de abajo (se repite) y un dibujo por tipo de obstáculo (poste, caja, grupo, muro,
  criatura, linterna, nube de tormenta), del tamaño de su caja de choque. Las nubes reciben
  `warning` (viene un rayo) y `bolt` (el largo del rayo, si está cayendo).
- **La bola de fuego, cada cóctel y cada comida** (sus nombres están en
  `js/entities/Pickup.js`). Los cócteles y la comida (la caja blanca para llevar con su pagoda roja
  y el tazón de arroz) ya están hechos: los dibuja `tools/sprites/pickups.mjs` como cuadrículas de texto en pixel
  art; para cambiarlos se edita su cuadrícula y se corre `node tools/sprites/pickups.mjs`. Lo que
  tiene imagen se dibuja a su tamaño de pixel (un pixel de la imagen = un pixel del canvas).

Lo que no tenga imagen, o no cargue, se dibuja con las figuras provisionales, así que se puede
agregar el arte de a poco. `draw()` también recibe `progress` (cuánto del nivel va, de 0 a 1), para
un fundido al siguiente animal, `state` (el estado del juego) y `cameraY` (qué tan alto está la
cámara). Para el HTML, `#stage` tiene `data-state` (el estado), `data-ground` (si el nivel tiene
suelo) y `data-high` (si se vuela alto), y los colores de `css/styles.css` son variables en
`:root`.

## Sonido

`js/audio/Audio.js` (Web Audio) ya está conectado a los avisos del juego. Para agregar sonido,
coloca los archivos en `assets/audio/` y escribe sus rutas en `js/audio/sounds.js`:

- **Música:** una pista para el inicio, una por animal y una para el final. Cambian con un fundido,
  y si un nivel no tiene pista, sigue la que sonaba.
- **Efectos:** uno por aviso (salto, aleteo, fuego, quemar, cóctel, comida, racha, trueno,
  golpe...). El aviso `section` dice en qué tramo va el nivel, por si la música quiere cambiar en
  el último tramo (`rush`).

Lo que no tenga archivo, o no cargue, no suena y el juego sigue igual. Los navegadores no dejan
sonar nada hasta el primer toque, clic o tecla: el audio se activa solo en ese momento. En pausa la
música baja a cero, y con la pestaña oculta no suena nada. M silencia, y se recuerda en
`chowchow.sonido`. Qué suena con cada aviso se cambia en `connectAudio`, al final de `Audio.js`.

## Pruebas

```bash
npm test
```

Prueban, sin navegador, la física y la lógica:

- el salto variable, agacharse, el vuelo (hasta el techo) y los niveles sin suelo;
- que el cuerpo siga el camino de la cabeza sin separarse, y la caída al perder;
- que la cámara siempre deje ver al dragón y no se mueva con un salto normal;
- las reglas de los obstáculos de los 24 niveles, en el suelo y en el cielo: nada del cielo baja a
  donde llega un salto, ni moviéndose ni con rayos; en difícil el cielo está mucho más lleno; los
  tramos de cada nivel; las nubes avisan antes del rayo;
- que los cócteles y la comida salgan al azar pero nunca pegados a un obstáculo;
- la racha y los puntos por rozar volando;
- que un bot que juega como una persona, sin bolas de fuego, pase los 12 niveles en fácil y en
  difícil sin un golpe (es decir, que todo se puede esquivar con esta física) y que tome casi todo
  lo que sale sin chocar nunca. Tarda unos 40 s.

## Guardado

Se guarda en `localStorage` con claves `chowchow.*` (récord, HI RECORDS, idioma, dificultad,
silencio y ajuste de la palanca), distintas de las de Chispas: así los dos juegos pueden vivir en el mismo
dominio sin pisarse. La caché del modo sin internet también usa su propio prefijo (`chowchow-`).

## Publicar

```bash
node tools/publicar.mjs                 # crea dist/chow-chow-game/
node tools/publicar.mjs otra/carpeta    # o donde le digas
```

Solo copia lo necesario para jugar (también `assets/images/` y `assets/audio/` si existen) y prepara el service worker para jugar sin internet. Si cambia
cualquier archivo, los navegadores bajan la versión nueva y la usan al cerrar y volver a abrir el
juego.
