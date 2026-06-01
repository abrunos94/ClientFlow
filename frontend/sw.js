/* ==========================================================================
   SERVICE WORKER CAMALEÃO - V1.10 (Otimizado para Background e Push)
   ========================================================================== */
const CACHE_NAME = 'clientflow-v1.10'; // Atualizado para forçar o celular a baixar a nova versão

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
  self.skipWaiting(); // Força o SW novo a assumir o controle imediatamente
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`⚠️ Aviso de Cache: O arquivo "${asset}" não foi localizado!`, err);
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
            console.log('🧹 Limpando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Assume o controle das abas abertas na hora
});

// Estratégia Inteligente: Ignora APIs (Supabase) e foca apenas nos arquivos visuais
self.addEventListener('fetch', (e) => {
  // BLINDAGEM: Se for requisição pro banco de dados, deixa a internet pura resolver. 
  // Isso impede que o PWA bugue quando o celular acordar do modo repouso sem rede.
  if (e.request.url.includes('supabase.co') || e.request.url.includes('rest/v1')) {
    return;
  }

  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request).then((response) => {
        return response || new Response('Conteúdo indisponível offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      });
    })
  );
});

/* ==========================================================================
   NOTIFICAÇÕES PUSH E INTERAÇÃO COM O USUÁRIO
   ========================================================================== */

// Ouvinte para Notificações Push (Quando a mensagem chega no celular)
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { titulo: 'ClientFlow', msg: 'Novo agendamento recebido!' };

  const options = {
    body: data.msg,
    icon: 'assets/images/favicon.png',
    badge: 'assets/images/favicon.png', // Ícone pequenininho na barra de status do Android
    vibrate: [200, 100, 200, 100, 200, 100, 400], // Vibração ritmada
    data: { url: 'dashboard.html' },
    requireInteraction: true // A notificação fica na tela até o barbeiro interagir
  };

  e.waitUntil(
    self.registration.showNotification(data.titulo, options)
  );
});

// NOVO: Ação ao clicar na notificação (Foca no app se estiver em segundo plano)
self.addEventListener('notificationclick', (e) => {
  e.notification.close(); // Fecha a notificação do Android/iOS

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Verifica se o barbeiro já tem a Dashboard aberta minimizada e apenas foca nela
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('dashboard.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Se o app estava 100% fechado, abre uma janela nova
      if (clients.openWindow) {
        return clients.openWindow('dashboard.html');
      }
    })
  );
});