// Service worker mínimo: permite instalar o portal e abrir a casca do app sem rede.
// Nunca guarda dados do aluno: chamadas ao Supabase e à API passam direto.
const CACHE = 'hospicio-casca-v1'
const CASCA = ['/', '/index.html', '/icone-192.png', '/icone-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  // Páginas: rede primeiro; sem rede, a casca do app.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }
  // Arquivos com hash no nome (assets): cache primeiro, são imutáveis.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.match(req).then((achado) => achado || fetch(req).then((resp) => {
        const copia = resp.clone()
        caches.open(CACHE).then((c) => c.put(req, copia))
        return resp
      })),
    )
  }
})
