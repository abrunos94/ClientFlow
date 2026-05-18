const CACHE_NAME = 'clientflow-v1.02';

// Mapeamento cirúrgico baseado no comando TREE do projeto
const ASSETS = [
  'dashboard.html',
  'index.html',
  'login.html',
  'manifest.json',
  'css/dashboard.css',
  'css/home.css',
  'css/login.css',
  'css/variables.css',
  'js/auth.js',
  'js/main.js',
  'js/script-dashboard.js',
  'assets/images/favicon.png'
];

// Instalação do Service Worker e Cache individual inteligente
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`⚠️ Aviso de Cache: O arquivo "${asset}" não foi localizado na pasta frontend!`, err);
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

// Estratégia de Cache: Network First (Garante dados novos do Supabase, usa cache se cair)
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
    icon: 'assets/images/favicon.png',
    badge: 'assets/images/favicon.png',
    vibrate: [200, 100, 200],
    data: { url: 'dashboard.html' }
  };

  e.waitUntil(
    self.registration.showNotification(data.titulo, options)
  );
});