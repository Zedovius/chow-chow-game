// Service worker: guarda el juego en el navegador para que se pueda jugar sin internet.
//
// Publicado (tools/publicar.mjs pone aquí VERSION, una huella del contenido, y FILES, la lista
// de todos los archivos del juego): al instalarse descarga y guarda todo, también la música y las
// imágenes, y desde entonces el juego sale de lo guardado, con o sin internet.
//
// Al publicar otra versión cambia VERSION: el navegador baja la nueva en segundo plano, pero el
// juego abierto sigue con la que tenía hasta que se cierra (todas sus ventanas); al volver a
// abrirlo ya es la nueva y la anterior se borra. Así nunca se mezclan archivos de dos versiones,
// aunque el juego esté abierto horas (en un arcade) mientras se publica otra.
//
// Sin publicar (VERSION 'dev', mientras se desarrolla): siempre pide a la red lo más nuevo y
// guarda una copia de lo que va usando, por si luego falta internet.

const VERSION = 'dev';
const FILES = [];
const CACHE = `chowchow-${VERSION}`;
const DEV = VERSION === 'dev';

self.addEventListener('install', (event) => {
  event.waitUntil(saveAll());
});

/**
 * Guarda todos los archivos de FILES en dos tandas: primero lo que el juego necesita para arrancar
 * y después la música (casi todo el peso), para no quitarle velocidad al juego que se está abriendo
 * (con internet lento, el arranque tardaba tanto que salía el aviso de error). cache: 'reload' para
 * no guardar copias viejas que tuviera el navegador. Si algo no se puede bajar, falla la
 * instalación entera (nunca se usa una versión a medias) y se intenta otra vez la próxima vez que
 * se abra el juego.
 *
 * La página se guarda solo como './' (la carpeta): siempre se busca así (ver lookup), y Cloudflare
 * Pages redirige index.html a la carpeta; una respuesta redirigida no serviría para abrirla.
 */
async function saveAll() {
  const cache = await caches.open(CACHE);
  const files = FILES.filter((file) => file !== 'index.html');
  const isAudio = (file) => file.startsWith('assets/audio/');
  const request = (file) => new Request(file, { cache: 'reload' });
  await cache.addAll(files.filter((file) => !isAudio(file)).map(request));
  await cache.addAll(files.filter(isAudio).map(request));
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('chowchow-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // La página de pruebas no es el juego: va directo a la red (si no, en su lugar saldría el juego)
  if (request.mode === 'navigate' && /\/jefes(\.html)?$/.test(url.pathname)) return;
  event.respondWith(DEV ? fromNetwork(request) : fromCache(request));
});

/**
 * Lo guardado de esta versión (no de otra que esté esperando: no se mezclan). La página (con o sin
 * ?lang=…, con o sin index.html) es siempre la misma; lo demás, el archivo tal cual.
 */
async function lookup(request) {
  const cache = await caches.open(CACHE);
  if (request.mode !== 'navigate') return cache.match(request);
  return (await cache.match('./')) ?? cache.match(request, { ignoreSearch: true });
}

/** Publicado: de lo guardado; si algo no estaba en la lista, de la red (y se guarda). */
async function fromCache(request) {
  const hit = await lookup(request);
  return hit ?? fromNetwork(request);
}

/** De la red, guardando una copia; sin red, lo guardado. */
async function fromNetwork(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
    }
    return response;
  } catch (error) {
    const hit = await lookup(request);
    if (hit) return hit;
    throw error;
  }
}
