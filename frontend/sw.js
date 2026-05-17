const CACHE_NAME = 'clientflow-v1.02';

// Lista de arquivos para tentar cachear na raiz
const ASSETS = [
  'dashboard.html',
  'script-dashboard.js',
  'index.html',
  'main.js',
  'manifest.json'
];

// Instalação do Service Worker e Cache arquivo por arquivo
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Em vez de addAll, fazemos um mapeamento individual para isolar o arquivo com erro
      return Promise.all(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.error(`⚠️ Erro de Cache: O arquivo "${asset}" não foi encontrado na raiz do projeto!`, err);
          });
        })
      );
    })
  );
});

// Ativação e Limpeza de Caches Antigos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Estratégia de Cache: Network First (Busca na rede primeiro, se cair usa o cache)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});

// Ouvinte para Notificações Push
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { titulo: 'ClientFlow', msg: 'Novo evento registrado!' };

  const options = {
    body: data.msg,
    icon: 'assets/icon-192.png',
    badge: 'assets/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: 'dashboard.html' }
  };

  e.waitUntil(
    self.registration.showNotification(data.titulo, options)
  );
});