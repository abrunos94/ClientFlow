// 1. Seleção de Elementos
const sidebar = document.getElementById('sidebar');
const btnAbrir = document.getElementById('abrir-menu');
const btnFechar = document.getElementById('fechar-menu');
const overlay = document.getElementById('overlay');

// 2. Lógica do Menu Mobile
if (btnAbrir && sidebar && overlay) {
    btnAbrir.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });

    const fecharMenu = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    if (btnFechar) btnFechar.addEventListener('click', fecharMenu);
    overlay.addEventListener('click', fecharMenu);
}

// 3. Segurança: Proteção da Página (ADS Mindset)
// Se não houver a marca de 'logado' no navegador, expulsa para o login
if (localStorage.getItem('logado') !== 'true') {
    window.location.href = 'login.html';
}

// 4. Lógica de Logout
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('logado'); // Limpa a sessão
        window.location.href = 'index.html'; // Volta para a Home
    });
}