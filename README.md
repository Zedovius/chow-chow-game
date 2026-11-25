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
> estilos simples en `css/styles.css`). Todo está
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
| Saltar (mantener: más alto) | Espacio, ↑, W | Mitad derecha del juego, ▲ de la cruceta, clic | A, ↑ |
| Aletear (en el aire: volar) | Espacio, ↑, W | Igual que saltar | A, ↑ |
| Agacharse / en el aire, caer más rápido | ↓, S (mantener) | Mitad izquierda del juego, ▼ de la cruceta | B, ↓ |
| Bola de fuego | X, J, F | Botón FIRE | X, Y |
| Pausa | Esc, P | Botón ⏸ | Start |
| Silenciar | M | — | — |

Con pantalla táctil salen una cruceta y un botón redondo FIRE (`js/ui/TouchPad.js`), que llegan al
juego como un control más (`GamepadInput.virtual`): en los menús, la fecha, la rueda, la pausa y el
nombre del récord la cruceta se mueve (mantener ▲ ▼ recorre las letras) y FIRE elige (ahí dice ▶);
dentro del juego ya no sale ▶. La cruceta manda una sola dirección a la vez, nada en el centro, y no
cambia de eje si el pulgar solo se desvía un poco. En el celular en vertical van abajo; en
horizontal, a los lados del juego. Con un menú abierto se pasan adentro del `<dialog>` (que deja
inerte lo de afuera). En un celular en vertical la
vista es más alta, como en Chispas (`tallView` en `js/config.js`, `js/core/view.js`): hasta 840
unidades de alto, con cielo extra arriba; se ve todo el cielo y la cámara ya no se mueve. Nada de la
página se puede seleccionar como texto (en iPhone, el toque largo ya no abre la lupa ni el menú de
copiar).

Funciona con controles de Xbox, PlayStation, genéricos, el joystick del arcade (que viene girado
90° y se endereza solo) y el control remoto de las teles. Start mantenido 3 segundos en la pantalla
de inicio abre el ajuste de la palanca.

Si nadie toca nada en 3 minutos (`idleSeconds` en `js/config.js`) en la pausa, en Game Over, en el
final o con el nivel esperando el primer salto, el juego regresa solo al menú principal, para que
quien llegue después empiece desde el inicio (`js/core/activity.js`: teclas, toques y botones del
control cuentan como actividad).

## Cómo funciona

- **Tu animal** (`js/world/birth.js`, `js/ui/BirthPicker.js`, `js/ui/ZodiacWheel.js`): después del
  idioma se elige la fecha de nacimiento: día, mes y año (el año chino empieza con el Año Nuevo
  lunar, entre el 21 de enero y el 20 de febrero; las fechas de 1924 a 2043 están en `birth.js`,
  comprobadas con el cálculo astronómico de cada luna nueva en hora de China). La rueda del zodiaco
  gira y se detiene en el animal que le toca (▶ o FIRE mientras gira la detienen de una vez);
  «< Volver» regresa a la fecha, que conserva lo elegido, por si se equivocó. Junto a la rueda sale su tarjeta: el animal, su símbolo (el carácter tradicional, como
  龍), su nombre en chino simplificado con su pinyin (龙 · lóng), su nombre en el idioma del juego y
  sus cuatro virtudes (`virtues.<animal>` en `js/i18n/`), sus tres defectos (`flaws.<animal>`), su trago de la carta con sus cualidades
  (`js/world/cocktails.js`), y su rival (el de enfrente en la rueda, 六沖, contra quien pelea en el nivel 12, el
  último) con el porqué del choque (`rivalry.<animal>`). Con ese animal se juega. La fecha no se guarda: en una
  máquina de bar juega gente distinta.
- **El orden de los mundos** (`worldOrder` en `js/world/levels.js`): son 11, los de todos los animales
  menos tu rival (su mundo se guarda para el final). Empieza en el animal que sigue al tuyo y el
  nivel 11 es tu mundo; el 12 es la pelea contra tu rival. Los mundos sin suelo nunca caen en los
  primeros tres niveles.
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
  (`js/ui/Legend.js`): la estrella ▸ nubecita, los cócteles ▸ ◆×3 y sus puntos, la comida ▸ ♥×1 y sus puntos, el
  trío ▸ ◆ MAX ♥×1 y sus puntos (con el multiplicador de la dificultad), y abajo el aviso para empezar.
  Se quita con el primer salto.
- **El trío** (`CONFIG.trio`, `js/world/trio.js`, `INGREDIENTS` en `js/entities/Pickup.js`), como los
  tragos del bar: un hongo blanco (el ingrediente chino), un agave (el fermento, el pulque) y un chile
  (el mexicano) se juntan **a lo largo de todo el viaje**. Al empezar la partida se eligen al azar
  tres mundos distintos y en cada uno sale uno de los tres: nunca dos en el mismo nivel, y contra el
  rival no sale ninguno. En fácil (`trioRetry`), si uno se escapa vuelve a salir en un nivel posterior,
  después del siguiente que toque (`reschedule` en `js/world/trio.js`); en difícil se pierde. Son coleccionables: los rodean dos aros dorados que se encogen una y otra vez
  (`Scene.drawHalo`). Con suelo salen a la altura de un salto: no hace falta la estrella. Cada uno da
  150 puntos y se enciende en el marcador; con los tres se prepara **el cóctel de tu signo**:
  «¡Cóctel preparado!», fuego lleno, un corazón (si cabe) y 500 puntos. Si uno se escapa,
  en esa partida ya no se completa; al reintentar un nivel, el trío vuelve a como estaba al empezarlo.
  Con el trío completo, desde ese momento y en cualquier nivel, el **fuego es verde jade** (`CONFIG.trio.jade`,
  `Scene.drawJadeFireball`): los disparos normales se ven más grandes y con estela pero hacen el mismo
  daño (y su caja de choque es la misma); el especial es distinto (cruz de luz y aro) y quita 4 en vez
  de 3.
- **Tu trago, al final** (`js/ui/drinkScreen.js`): al vencer al rival, antes del nombre para HI RECORDS, el trago de la
  carta que le toca a su signo, solo, sobre negro: su vaso dando vueltas, su nombre, qué lleva y sus tres cualidades
  (`js/ui/taste.js`). Sigue con el botón o sola, al minuto; el primer segundo no hace caso, para que no se la salte
  quien viene disparando (`CONFIG.drinkScreen`). Los datos están en `js/world/cocktails.js` (y sus textos, `drinks.*` y
  `taste.*`, en `js/i18n/`). Los 12 vasos son capas apiladas (sprite stacking), horneadas con `npm run tragos`
  (`tools/sprites/tragos.mjs`, con la forma y el color de las fotos). Luego, junto al nombre, sale en chico
  (`js/ui/drink.js`). Para verla: `?trago=dragon`, o desde `jefes.html`.
- **Bolas de fuego**, del color de cada animal: queman todo menos los muros y las nubes de tormenta
  (`burnable` en `js/world/obstacles.js`). Se empieza con 3. Casi todos los cócteles salen arriba
  (solo el 15% a la altura de un salto): para recargar hay que volar, así no basta con quemar todo
  desde el suelo. Nunca hacen falta: los 11 mundos se pueden pasar
  sin disparar (lo comprueban las pruebas).
- **12 niveles** (`js/world/levels.js`): 11 mundos. La velocidad sube pareja del primero al último, dentro de cada uno y
  de uno a otro (`speed`), y nunca baja. Más rápido, los obstáculos salen más seguido (`CONFIG.obstacles.crowd`) para
  que la pantalla no se vea vacía. Van seguidos; al terminar uno (`levelDone`) se cobran los corazones. El paso de uno al otro es
  suave (`CONFIG.transition`, 1.6 s): el cielo y el suelo del anterior se desvanecen sobre los del
  nuevo (el suelo se vuelve nubes, o al revés, poco a poco) y la velocidad pasa sin frenones de la
  que se llevaba a la del nuevo nivel (también al llegar al jefe, que va más despacio). El animal sigue donde iba y
  haciendo lo que hacía, con su disparo cargado si lo tenía (`Player.setGround`): solo si corría y ya no hay suelo salta
  solo. Si ya iba en el aire no le pasa nada y, mientras el suelo se vuelve nubes, tocarlas no quita corazón: ahí salta
  solo. El sol o la luna están en el mismo lugar y miden lo mismo en todos los mundos (`ASTRO`). Después de tu mundo (el 11) viene el
  nivel 12.
- **Nivel 12: tu rival** (`bossLevel` en `js/world/levels.js`, `js/entities/Boss.js`), en las dos
  dificultades: el animal de enfrente en la rueda (`rivalOf`: Rata–Caballo, Buey–Cabra,
  Tigre–Mono, Conejo–Gallo, Dragón–Perro, Serpiente–Cerdo), en su mundo. Todos vuelan, tengan o no
  la estrella, y ahí un golpe no quita el vuelo. Si el rival es el Dragón o el Gallo, la pelea es
  en su cielo, sin suelo (tocar las nubes cuesta un corazón). No hay obstáculos: solo el jefe, que
  se le gana con bolas de fuego (12 de vida en fácil, 25 en difícil); se le puede pegar desde que se ve.
  - **Ahí también se mueve adelante y atrás** (◀ ▶, A / D, la palanca o la cruceta; `CONFIG.boss.move`),
    dentro de un rango que no llega al jefe ni sale de la pantalla. Lo indican, sin
    texto, unas puntas tenues que salen de los lados del animal hasta que se mueve (y, con pantalla táctil,
    los brazos ◀ ▶ de la cruceta que laten). En los mundos no: ahí el ritmo
    de los obstáculos está calculado con el animal siempre en el mismo lugar.
  - **Mantener FUEGO carga un disparo especial** (`js/core/charge.js`, `CONFIG.charge`), **en todos
    los niveles y en las dos dificultades**: se suelta cargado y sale una bola grande que le quita 3
    de vida al jefe (4 con el fuego jade), atraviesa sus disparos y, en los mundos, quema todo lo que
    se quema a su paso (los muros y las nubes de tormenta lo detienen). El disparo normal sale al
    presionar, como siempre. Se carga con 3 o más bolas de fuego y gasta solo una. Mientras se carga,
    el animal brilla del color de su fuego y el rombo del HUD crece. El primer nivel lo avisa.
  - **Fácil, contra el rival:** el fuego es infinito (∞ en el HUD), y el especial también. Solo sale
    comida, muy de vez en cuando.
  - **Difícil, contra el rival:** salen cócteles seguido.

  Los 12 jefes tienen los mismos ataques, siempre avisados antes (se ve tenue dónde van a pegar):
  - **Ráfaga:** tres disparos a tres alturas, con huecos para pasar.
  - **Puntería:** disparos a tu altura (uno en fácil, tres seguidos en difícil).
  - **Embestida:** marca una franja a su altura y la cruza a toda velocidad.
  - **Lluvia de fuego** (`CONFIG.boss.rain`): 3 bolas que caen en diagonal desde lo alto, apuntadas:
    una cruza justo a tu altura y las otras más arriba o más abajo, cada una en otro momento. El aviso
    dibuja en puntos el camino de cada una. Se esquiva subiendo, bajando o moviéndose de lado.
  - **Muro de fuego** (`CONFIG.boss.wall`): 4 disparos en una línea vertical, repartidos de arriba abajo
    y muy separados (a alturas que cambian cada vez); el aviso marca dónde saldrá cada uno.

  Con la mitad de la vida descansa menos y dispara más rápido. Vencerlo da 5000 puntos (× la
  dificultad) y termina el viaje. Para probar: `?nivel=12`.
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
    que no se queman, más rápido (de 357 a 552 px/s; en fácil, de 252 a 400), cócteles cada 7–11 s, comida cada 15–24 s y hasta 6 bolas de fuego. Los puntos valen ×1.5.
- **HI RECORDS:** quien vence a su rival (nivel 12) y entra al top 5 de su dificultad escribe un nombre
  de hasta 6 caracteres. Las tablas se alternan con el menú de inicio.
- **Bucle de juego** (`js/core/Loop.js`): paso fijo de 1/60 s con interpolación, igual en
  cualquier pantalla.

Todo lo que se ajusta (física, vuelo, velocidades, obstáculos, fuego, cócteles, puntos) está en
`js/config.js`. Para probar un nivel: `?nivel=5` empieza en el 5; la página `jefes.html` (por ejemplo http://localhost:8000/jefes.html) lista los 12 animales y los 12 jefes, con la dificultad, el trío, la estrella y no perder corazones; lleva a `?animal=goat&vuelo=1` o `?jefe=rat&dificultad=hard&trio=1&invencible=1`, donde no se guardan récords (también publicado, en firio.studio/chow-chow/jefes: Cloudflare Pages sirve `jefes.html` sin el `.html`). `?nivel` solo, en una partida de verdad, no hace nada publicado, para que nadie se salte niveles y entre a HI RECORDS.

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

### Los animales

`npm run animales` (`tools/sprites/animales.mjs`) hornea los 12 animales, la nube y sus retratos. Cada uno
es un modelo 3D chiquito (`modelo3d.mjs`) con patas articuladas (`rigs.mjs`) y su propia forma de andar
(`GAITS`): galope de caballo, galope de felino, buey pesado, salto de conejo, brincos de cabra, correteo
de rata... Se rebana en capas de profundidad (sprite stacking), que `js/graphics/animalPainter.js` apila
al jugar. La carrera avanza con lo recorrido: los pies no patinan. Cómo se ve cada animal está en
`especies.mjs` (los de cuatro patas) y `alados.mjs` (gallo, dragón y serpiente); sus poses, en
`poses.mjs`; la nube, en `nube.mjs`. El dragón y la serpiente se arman al jugar, con vértebras sobre el
camino de la cabeza. La caja de choque es la misma para los 12 (`Player.hitboxes`), y también la caja más grande con la que
recogen las cosas (`Player.reach`, `CONFIG.player.reach`); se ven con `&cajas=1` (en `jefes.html`). Cada hoja se baja solo
cuando hace falta (mientras gira la rueda).

### Los jefes

`npm run jefes` (`tools/sprites/jefes.mjs`) convierte cada ilustración de `tools/sprites/originales/`
(PNG con fondo transparente, el brazo aparte) en sus sprites: es el pixelador de Chispas para Node
(`tools/sprites/pixelar.mjs`), con gradientes de luz. Saca el cuerpo en 12 cuadros (la cola, que ondula entera,
`bend`; orejas, paño, farol...), el brazo en 21 ángulos y sus medidas (`js/graphics/bossArt.js`). `js/graphics/bossPainter.js`
los dibuja: el brazo cambia según el ataque y el ojo brilla del color de sus disparos y sigue a quien
juega. Todo va en capas de profundidad (sprite stacking de lado): al girar hacia quien juega, cada capa se
corre un poco más que la de atrás. El punto débil (la moneda; `CONFIG.boss.weak`, en el mismo lugar para
los 12) se enciende en rojo mientras avisa un ataque, y darle ahí quita el doble. Todos chocan con las mismas cajas (`CONFIG.boss.boxes`).

La Rata es la ilustración original. Los otros 11 siguen su diseño (encorvados, cara hostil, pañuelo rasgado, cuentas,
medallón, pulseras y algo en la mano de atrás) con los colores de su animal: son esculturas (`jefesModelos.mjs`; la cara de
cada uno, en `jefesCaras.mjs`; lo que comparten, en `jefesPiezas.mjs`) que `escultura.mjs` pinta con luz, pelo y oro, y pasan
por el mismo pixelado. Cada capa lleva solo lo que hay a su profundidad, también lo tapado (`slices`), y el contorno se pone
al dibujarlos, sobre las capas ya juntas (`BossPainter.stacked`): así no se embarran al girar. Cada uno mueve un brazo; la Serpiente y el Dragón (`jefesLargos.mjs`, `CONFIG.boss.armless`) no
tienen: abren la boca, de donde les sale todo, y una ola les recorre el cuerpo. `npm run jefes dragon` hornea solo uno.

### Los mundos

`npm run mundos` (`tools/sprites/mundos.mjs`; `npm run mundos rat` para uno solo) hornea los 12 mundos: una
hoja por mundo en `assets/images/mundos/` y sus medidas en `js/graphics/worldArt.js`. Cada mundo se
describe en `js/world/scenery.js`: su cielo, su piedra, su astro (con la silueta del animal, como papel
picado), su suelo, sus objetos, su gente y lo que flota en el aire.

- **Las montañas** (`montanas.mjs`) son de pintura china antigua (shan shui): pilares muy verticales de
  punta redonda, con pinos y cascadas, y bruma entre una fila y la otra.
- **Los objetos** (`piezas.mjs` y `piezas2.mjs`) son modelos 3D chiquitos (`modelo3d.mjs`) rebanados en
  capas (sprite stacking), que giran al cruzar la pantalla. **Los animales** (`fauna.mjs`) van vivos y en el
  suelo: nunca colgados ni tirados.
- **La gente** (`gente.mjs`), mexicana y china, va vestida según el mundo, y camina.
- **El Perro** es el barrio chino de una ciudad mexicana en los ochenta (`ciudad.mjs`): fachadas, puestos de
  tacos y tortas, autos de la época y edificios al fondo. En el lago de la **Serpiente** pasan las trajineras
  «Chow-Chow» (`trajinera` en `piezas.mjs`).
- **Las luces** (`Model.light`: ventanas, faroles, foquitos, neón, autos y botes) se hornean en la capa donde está cada
  una (`glows` en `pintura.mjs`): giran y se tapan con su objeto, y entre más lejos, más tenues y más del color del aire.
  En el agua y en la calle mojada, además, se reflejan (`WorldPainter.reflect`). No parpadean: eso es de lo que se recoge.
- **La profundidad:** cada cosa tiene su distancia `s` (0 en el horizonte, 1 en el camino; `DEPTHS`). Se
  mueve a `s` veces la velocidad del camino, y el suelo se dibuja renglón por renglón con la misma regla
  (`js/graphics/floors.js`): por eso nada patina y al volar el suelo se abre.
- **Sin congelones:** los 12 mundos se cargan en silencio desde el menú (`Scene.preload`), uno por uno y en lo que sobra
  de cada cuadro (`WorldPainter.work`); al salir el animal en la rueda, en el orden de su viaje. Si alguien se adelanta,
  lo que falte sigue mientras juega, nunca a medio cambio de nivel. Las imágenes se decodifican antes de usarse
  (`whenDecoded`).
- **Pantallas grandes:** el juego llena la pantalla. Donde cada pixel del juego mide 3 o más de los de verdad, el canvas
  lleva el doble y todo se mueve de medio en medio pixel (`js/graphics/grid.js`); el arte se ve igual.
- **El plano del juego:** el suelo se acaba en la orilla donde se corre (`EDGE`) y su cara se ve de lado
  (`makeFace`). Nada pasa delante: los animales, los obstáculos y lo que se recoge son lo más cercano, con la misma
  vista, el mismo acabado y la misma sombra (`Scene.drawShadows`).
- **Los mundos sin suelo** (Dragón y Gallo): bancos de nubes a cinco distancias (`nubes.mjs`, `BANKS`), más oscuros
  mientras más cerca, y adelante, en el plano del juego, la nube de tormenta que no se debe tocar (`makeStorm`):
  violeta, clara, con contorno y chispas, con sus crestas justo donde golpea.
- **Los valores** (`js/graphics/aerial.js`): el fondo va siempre más oscuro que lo que se juega. Al oscurecer, los
  colores viran hacia el tono de las sombras de su mundo (`dusk`) y se saturan, así no se ensucian.
- **La perspectiva aérea:** entre más lejos, menos contraste y más se parece todo al aire del horizonte, que tiene
  color. Cada cordillera lleva su gradiente, de la cima a la base (`gradient`), como en el paisaje azul y verde chino.

`js/graphics/worldPainter.js` los dibuja. Cada hoja se baja cuando hace falta (la del mundo y la del que
sigue); mientras llega se ve un cielo sencillo. El fondo no lleva contorno oscuro, para que nunca se
confunda con lo que golpea.

### Los obstáculos

`npm run obstaculos` (`tools/sprites/obstaculos.mjs`) hornea los obstáculos en capas (sprite stacking), a
`assets/images/obstaculos/`, con sus medidas en `js/graphics/obstacleArt.js`. Hay un juego común (lo del aire, y
lo que un mundo no tenga) y uno por mundo, hecho con sus propios objetos (`obstaculosMundos.mjs`, que los junta de
`obstaculosMundos1.mjs`, `obstaculosMundos2.mjs` y `obstaculosCaballo.mjs`; lo que comparten, en
`obstaculosPiezas.mjs`). Los del mismo tipo miden y se esquivan igual en todos los mundos.
`js/graphics/obstaclePainter.js` los dibuja igual que a los animales: misma vista, mismos tonos, valores claros y
contorno oscuro. Los bordes claros y los destellos son solo de lo que se recoge. Pueden sobresalir un poco de su
caja de choque, que es la de siempre (`js/world/obstacles.js`).

### Menús

Negro, gris oscuro, blanco (no del todo) y rojo: los colores `--m-*` de `css/styles.css`; el marcador del juego tiene
los suyos. Detrás del menú el mundo se ve sin color. El botón con el foco va en rojo entero. La rueda del zodiaco
es un disco rojo con los logos de los 12 animales, los del bar: `assets/images/logos/` (SVG de un color, calcados de
las fotos de `assets/images/info-logo-tragos/`, que no se publican); el color se lo da el CSS (clase `brush`).
Los caracteres chinos usan Yuji Boku (tradicionales) y Ma Shan Zheng (simplificados), recortadas a los que
se usan: para agregar otro carácter hay que volver a recortarlas. El gallo va como 鷄, la otra forma tradicional de 雞,
que es la que trae la fuente.

## Sonido

`js/audio/Audio.js` (Web Audio) está conectado a los avisos del juego, y `js/audio/sounds.js` dice qué
archivo suena con cada uno:

- **Música** (`assets/audio/music/`): dos bandas sonoras de cinco canciones, «Rojo» y «Jade», de menor a mayor
  intensidad: el menú; una para los mundos 1 a 4, otra para el 5 al 8 y otra para el 9 al 11 (los mundos que comparten
  canción la siguen oyendo, sin cortes); y la pelea contra el rival. Al ganar, con el trago, suena una variación de la
  del menú. «Jade» suena en una de cada tres partidas (se cuentan en `chowchow.partidas`; el menú ya suena con la de
  la partida que sigue). Todas van a 120 BPM y una canción nueva entra en el siguiente compás de la que suena. Solo
  se bajan y se guardan en memoria la que suena y la que sigue. El aviso `section` dice en qué tramo va el nivel, por
  si la música quiere cambiar en el último (`rush`). Ver [La música](#la-música).
- **Efectos:** con carácter de maquinita de 32 bits (capas, FM, ruido filtrado, estéreo y
  reverberación). Sol menor pentatónica (G B♭ C D F) es la guía para que no choquen con la música, pero
  no son melodías. Los de los menús no pasan de C5, para que no suenen agudos. Suenan saltar y
  aletear (tres voces, según el animal: `VOICES`), disparar, cargar y soltar el especial, (distintos con el fuego jade), destruir o golpear un obstáculo, morir, Game Over, los ataques del jefe y pegarle
  (normal y especial), la estrella, la comida, los cócteles, los ingredientes, el récord, la rueda del
  zodiaco, la pausa y los botones de los menús; lo demás (las tormentas, cambiar la fecha...) va en
  silencio a propósito. Los crea
  `tools/sonidos.mjs` con `npm run sonidos`, sin muestras de nadie, y también escribe
  `docs/sonidos.html`, para oírlos todos. Para usar otro archivo en un efecto, pon su ruta en
  `sounds.js`.

Lo que no tenga archivo, o no cargue, no suena y el juego sigue igual. Los navegadores no dejan
sonar nada hasta el primer toque, clic o tecla: el audio se activa solo en ese momento. En pausa la
música baja a cero, y con la pestaña oculta no suena nada. M silencia, y se recuerda en
`chowchow.sonido`. Qué suena con cada aviso se cambia en `connectAudio`, al final de `Audio.js`.

### La música

La crea `tools/musica.mjs` con `npm run musica` (tarda varios minutos; `npm run musica -- rojo-farol` hace solo
esa). También deja `docs/musica.html`, para oírla, y `docs/recorrido-rojo.m4a` y `docs/recorrido-jade.m4a`: cada banda
sonora como se oye al jugar.

- **Los samples** (`assets/audio/samples/`, que no se publican) son la base de «Rojo»: `chow-intro` en el menú y, sin
  golpes, en la pantalla del trago; `chow-medio-1` en los mundos 5 a 8; `chow-intro-hard` en la pelea. La mesa los
  coloca por compases (`sample` en `mezcla.mjs`; `SAMPLES` dice en qué segundo empieza el primero) y alrededor van
  los instrumentos. «Jade» no los usa, pero su pelea sigue el estilo de `chow-intro-hard`.
- **El estilo:** electrónica oscura de los ochenta con raíz china. Bajos de secuenciador secos y saturados, pocos
  elementos, golpes de metal, coros, y tambores que cuentan 3, 5 o 7 contra 4 (`poly` en `rojo.mjs`); el canto, de
  guzheng, erhu, pipa, dizi, suona y campanas. Cada canción son tres vueltas de 12 compases: casi sola, completa, y
  una parte que respira y vuelve a subir.
- `tools/musica/partitura.mjs`: la escala (sol menor pentatónica), el tema de los samples, cómo se escribe una melodía
  y el **contrapunto** (`canon`, `counter`, `mirror`, `stretch`...). Todo se mueve por lugares de la escala, así que
  ninguna nota sale de ella y cada canción puede estar afinada en otro de sus grados.
- `tools/musica/rojo.mjs` y `jade.mjs`: las canciones. `tradicionales.mjs`, `percusion.mjs` y `sintetizadores.mjs`:
  los instrumentos.
- `tools/musica/mezcla.mjs`: la mesa. El volumen de cada voz se mide y se lleva al que le toca, el bombo agacha a los
  demás, y el color final se acerca al de los samples. Cada canción es una vuelta sin corte: lo que sobra al final
  sigue al principio, y el archivo trae un cuarto de segundo de más a cada lado.
- `tools/musica/codificar.ps1` convierte a M4A con el codificador de Windows.

En una máquina de bar que solo usa el control, Chrome no cuenta sus botones como primer toque: ábrelo con
`--autoplay-policy=no-user-gesture-required` para que suene desde el principio.

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
- que un bot que juega como una persona, sin bolas de fuego, pase los 11 mundos en fácil y en
  difícil sin un golpe (es decir, que todo se puede esquivar con esta física), que tome casi todo
  lo que sale sin chocar nunca, y que cada ingrediente del trío salga en el mundo que le tocó, uno
  por nivel, y se pueda tomar; Tarda unos 40 s.

## Guardado

Se guarda en `localStorage` con claves `chowchow.*` (récord, HI RECORDS, idioma, dificultad,
silencio y ajuste de la palanca), distintas de las de Chispas: así los dos juegos pueden vivir en el mismo
dominio sin pisarse. La caché del modo sin internet también usa su propio prefijo (`chowchow-`).

## Publicar

```bash
node tools/publicar.mjs                 # crea dist/chow-chow-game/
node tools/publicar.mjs otra/carpeta    # o donde le digas
npm run parking                         # crea ../../parkingPage/chow-chow/ (junto a chispas/)
```

La presentación para el bar (`docs/presentación-chow-chow-game.md`, sin estilos para que se lea en
cualquier visualizador) se convierte en PDF con fondo negro, texto blanco y títulos en rojo con
`npm run presentacion` (`tools/presentacion.mjs`, usa Chrome o Edge): crea el `.html` y el `.pdf` junto
al `.md`.

`npm run parking` arma el juego dentro de la carpeta del sitio (`firio-studio-project/parkingPage/`),
igual que Chispas está en `parkingPage/chispas/`. Después se sube `parkingPage` completa a Cloudflare
Pages y el juego queda en `firio.studio/chow-chow/` (sin la diagonal final, `index.html` la agrega).
Volver a correrlo reemplaza la carpeta: solo borra una publicación anterior del juego (la que lleva
`.chowchow-publicado`), nunca otra cosa.

Solo copia lo necesario para jugar (también `assets/images/` y `assets/audio/` si existen) y prepara el service worker para jugar sin internet. Si cambia
cualquier archivo, los navegadores bajan la versión nueva y la usan al cerrar y volver a abrir el
juego.
