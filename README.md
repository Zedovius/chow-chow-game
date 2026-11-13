# Chow Chow

Un corredor sin fin, como Chispas, pero con un pequeño dragón de cabeza y cinco partes de cuerpo
que corre, salta, vuela y lanza bolas de fuego. Recorre los doce animales del zodiaco chino: Rata, Buey, Tigre, Conejo, Dragón, Serpiente, Caballo, Cabra, Mono, Gallo, Perro y
Cerdo. Las bolas de fuego se recargan con cócteles de la barra, mitad China y mitad México.

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

- **Correr y saltar** (`js/entities/Dragon.js`), como Chispas: el salto es variable (mantener el
  botón salta más alto; soltarlo antes lo corta), abajo agacha en el suelo y en el aire hace caer
  más rápido. El cuerpo sigue el camino exacto de los pies de la cabeza, como una serpiente: cada
  parte va sobre ese camino a `spacing` de la anterior (medido sobre el camino), así que nunca se
  separan, y si la cabeza libró un obstáculo el cuerpo pasa por el mismo lugar. Todas las partes
  pueden chocar. Al perder, el mundo frena poco a poco y el cuerpo cae y se tiende detrás de la
  cabeza.
- **Volar** (en todos los niveles): en el aire, cada salto es un aleteo suave, con menos gravedad y
  caída máxima (`CONFIG.dragon.flight`). Sin aletear, el salto es el de siempre. Se puede volar
  hasta 5 alturas de salto (`CONFIG.skyJumps`, ~510): el mundo es más alto que la pantalla y la
  cámara sube con el dragón (`js/graphics/Camera.js`); un salto normal no la mueve.
- **Sin suelo** (el Dragón y el Gallo, `noGround` en `js/world/levels.js`): puro cielo, con nubes
  abajo. Tocar las nubes quita un corazón y el dragón rebota. Al llegar desde un nivel con suelo,
  el dragón sale lanzado a volar.
- **Obstáculos** (`js/world/obstacles.js`, `js/world/Spawner.js`), en dos filas con su propio ritmo:
  - **Suelo:** postes, cajas, grupos y muros, y criaturas a tres alturas: las bajas se saltan, las
    de en medio se esquivan agachándose y las altas golpean si saltas.
  - **Cielo:** oleadas de criaturas, linternas y nubes de tormenta, cada una en una franja de altura
    distinta y siempre con una libre. En los niveles con suelo van por encima de lo que alcanza un
    salto normal: solo estorban a quien vuela. Sin suelo, ocupan todo el cielo.

  Cada animal agrega algo nuevo. La separación se piensa en segundos de reacción, como en Chispas,
  y se aprieta a lo largo de cada nivel sin bajar nunca de lo que hace falta para reaccionar.
- **Lo que se recoge**, como los huesitos de Chispas: la perla (una por nivel) y los cócteles salen
  en momentos y alturas al azar, del suelo al techo, y se mecen un poco. Nunca obligan a chocar:
  solo aparecen si no acaba de salir un obstáculo, y después los obstáculos esperan un poco
  (`CONFIG.pickups`). Los que van muy alto se anuncian con una flechita arriba de la pantalla.
- **Bolas de fuego:** queman todo menos los muros y las nubes de tormenta (`burnable` en
  `js/world/obstacles.js`). Se empieza con 3 y se recargan con cócteles (+3, hasta 9). Nunca hacen
  falta: los 12 niveles se pueden pasar sin disparar (lo comprueban las pruebas).
- **12 niveles** (`js/world/levels.js`): cada uno más rápido; dentro de cada nivel la velocidad
  sube un poco. Van seguidos; al terminar uno se cobran los corazones. Al terminar el Cerdo se
  acaba el viaje.
- **Golpes:** chocar con un obstáculo (o, sin suelo, con las nubes) quita un corazón; el dragón da
  un saltito y parpadea invulnerable.
- **Puntos:** distancia recorrida, la perla de cada nivel, cada obstáculo quemado, los corazones al
  terminar cada nivel y puntos sin aviso por saltar algo muy de cerca o pasar agachado debajo
  (`js/core/closeCalls.js`).
- **Dificultades:** fácil (3 corazones, reintentar el nivel) y difícil (1 corazón, cada 2 perlas
  otro corazón, y al perder se vuelve a la Rata; los puntos valen ×1.5).
- **HI RECORDS:** quien termina los 12 niveles y entra al top 5 de su dificultad escribe un nombre
  de hasta 6 caracteres. Las tablas se alternan con el menú de inicio.
- **Bucle de juego** (`js/core/Loop.js`): paso fijo de 1/60 s con interpolación, igual en
  cualquier pantalla.

Todo lo que se ajusta (física, vuelo, velocidades, obstáculos, fuego, cócteles, puntos) está en
`js/config.js`. Para probar un nivel: `?nivel=5` empieza en el 5 (el Dragón, sin suelo).

- **Avisos** (`js/core/events.js`): Game cuenta lo que pasa (`jump`, `flap`, `land`, `fire`,
  `burn`, `cocktail`, `hit`, `pearl`, `levelStart`, `gameOver`...; la lista completa está en ese archivo) y quien
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
  criatura, linterna, nube de tormenta), del tamaño de su caja de choque.
- **La perla, la bola de fuego y cada cóctel** (sus nombres están en `js/entities/Pickup.js`).

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
- **Efectos:** uno por aviso (salto, aleteo, fuego, quemar, cóctel, golpe, perla...).

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
- las reglas de los obstáculos de los 24 niveles, en el suelo y en el cielo;
- que la perla y los cócteles salgan al azar pero nunca pegados a un obstáculo;
- que un bot que juega como una persona, sin bolas de fuego, pase los 12 niveles en fácil y en
  difícil sin un golpe (es decir, que todo se puede esquivar con esta física) y que tome casi todo
  lo que sale sin chocar nunca. Tarda unos 30 s.

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
