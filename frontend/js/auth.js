/**
 * CLIENTFLOW - MÓDULO DE AUTENTICAÇÃO
 * Finalidade: Gerenciar login, recuperação de senha e sessões via Supabase Auth.
 * Estudante: Alex - Systems Analysis and Development
 */

// 1. CONFIGURAÇÕES INICIAIS E CONEXÃO
const SUPABASE_URL = "https://cvvixgkiqljpamvnjzzj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dml4Z2tpcWxqcGFtdm5qenpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzkwOTEsImV4cCI6MjA5MDAxNTA5MX0.TfvzM_f-RxbOPIui2EHLYi2i3_dvFjWuE6XzoqQr2WM";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. SELEÇÃO DE ELEMENTOS (Organizar tudo no topo facilita a manutenção)
const formLogin = document.getElementById('form-login');
const btnRecuperar = document.getElementById('btn-recuperar-senha');
const msgErro = document.getElementById('mensagem-erro');
const inputSenha = document.getElementById('senha');
const btnOlho = document.getElementById('toggle-password');

/* ==========================================================================
   3. LÓGICA DE LOGIN (ENTRADA NO SISTEMA)
   ========================================================================== */

   // Olho
btnOlho.addEventListener('click', () => {
    // Se o tipo for password, muda para text. Se for text, volta para password.
    const tipo = inputSenha.getAttribute('type') === 'password' ? 'text' : 'password';
    inputSenha.setAttribute('type', tipo);
    
    // Troca o ícone (olho aberto / olho fechado)
    btnOlho.classList.toggle('fa-eye');
    btnOlho.classList.toggle('fa-eye-slash');
});


formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('usuario').value;
    const senha = inputSenha.value;
    const btn = event.target.querySelector('button');
    const textoOriginalBtn = btn.innerHTML;

    // Feedback visual de carregamento
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando...';
    btn.disabled = true;

    try {
        const { data, error } = await _supabase.auth.signInWithPassword({ email, password: senha });

        if (error) throw error; // Joga o erro para o bloco catch

        // SUCESSO
        msgErro.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-check"></i> Autorizado!';
        btn.style.background = '#2ecc71';

        // Mantemos por compatibilidade com seu Dashboard atual
        localStorage.setItem('logado', 'true');

        setTimeout(() => window.location.href = 'dashboard.html', 1000);

    } catch (error) {
        // TRATAMENTO DE ERRO
        msgErro.textContent = "E-mail ou senha incorretos.";
        msgErro.style.display = 'block';
        inputSenha.style.borderColor = '#ff4d4d';
        inputSenha.value = "";
        btn.innerHTML = textoOriginalBtn;
        btn.disabled = false;

        setTimeout(() => inputSenha.style.borderColor = 'var(--cor-borda)', 2000);
    }
});



/* ==========================================================================
   4. SOLICITAÇÃO DE RECUPERAÇÃO (ESQUECEU A SENHA)
   ========================================================================== */
btnRecuperar.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = prompt("Digite seu e-mail para receber o link de recuperação:");
    if (!email) return;

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href, // Retorna para esta mesma página de login
    });

    if (error) {
        alert("Erro: " + error.message);
    } else {
        alert("E-mail enviado! Verifique sua caixa de entrada (e o spam).");
    }
});

/* ==========================================================================
   5. ESCUTADOR DE ESTADO (TROCA EFETIVA DA SENHA)
   ========================================================================== */
// Este evento "escuta" se o usuário clicou no link do e-mail
_supabase.auth.onAuthStateChange(async (event) => {
    if (event === "PASSWORD_RECOVERY") {
        const novaSenha = prompt("CRIE UMA NOVA SENHA:");
        
        if (novaSenha) {
            const { error } = await _supabase.auth.updateUser({ password: novaSenha });

            if (error) {
                alert("Erro ao atualizar: " + error.message);
            } else {
                alert("Senha alterada com sucesso! Você já pode logar.");
                window.location.reload(); // Recarrega para limpar tokens da URL
            }
        }
    }
});