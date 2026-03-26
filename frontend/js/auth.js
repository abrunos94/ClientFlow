/**
 * ClientFlow - Sistema de Autenticação
 * Responsável por validar o acesso ao Dashboard
 */
const SUPABASE_URL = "https://cvvixgkiqljpamvnjzzj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dml4Z2tpcWxqcGFtdm5qenpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzkwOTEsImV4cCI6MjA5MDAxNTA5MX0.TfvzM_f-RxbOPIui2EHLYi2i3_dvFjWuE6XzoqQr2WM";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

document.getElementById('form-login').addEventListener('submit', function (event) {
    event.preventDefault();

    // 1. Pegar os valores digitados
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    const msgErro = document.getElementById('mensagem-erro');
    const inputSenha = document.getElementById('senha');

    // 2. Credenciais de Acesso (Dica: No futuro, buscaremos isso no Supabase Auth)
    const USUARIO_MESTRE = "admin";
    const SENHA_MESTRE = "1234";

    // 3. Lógica de Validação
    if (usuario === USUARIO_MESTRE && senha === SENHA_MESTRE) {
        // Sucesso!
        msgErro.style.display = 'none';

        // Salva a sessão no navegador (Necessário para o Dashboard permitir a entrada)
        localStorage.setItem('logado', 'true');

        // Feedback visual de sucesso antes de redirecionar
        const btn = event.target.querySelector('button');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        btn.style.background = '#2ecc71';

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);

    } else {
        // Erro: Usuário ou senha incorretos
        msgErro.textContent = "Usuário ou senha incorretos.";
        msgErro.style.display = 'block';

        // Efeito visual de erro nos campos
        inputSenha.style.borderColor = '#ff4d4d';
        inputSenha.value = ""; // Limpa a senha para nova tentativa
        inputSenha.focus();

        // Remove o efeito de erro após 2 segundos
        setTimeout(() => {
            inputSenha.style.borderColor = 'var(--cor-borda)';
        }, 2000);
    }
});