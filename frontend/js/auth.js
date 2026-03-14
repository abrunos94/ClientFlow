document.getElementById('form-login').addEventListener('submit', function(event) {
    event.preventDefault(); // Impede o formulário de recarregar a página

    // 1. Pegar os valores digitados
    const usuario = document.getElementById('usuario').value;
    const senha = document.getElementById('senha').value;
    const msgErro = document.getElementById('mensagem-erro');

    // 2. Definir um usuário "fake" para teste (Simulando um banco de dados)
    const usuarioCorreto = "admin";
    const senhaCorreta = "1234";

    // 3. Lógica de Validação
    if (usuario === usuarioCorreto && senha === senhaCorreta) {
        // Sucesso!
        msgErro.style.display = 'none';
        
        // Salva no navegador que o usuário está logado
        localStorage.setItem('logado', 'true');
        
        // Redireciona para o Painel (vamos criar essa página depois)
        alert('Login realizado com sucesso! Redirecionando...');
        window.location.href = 'dashboard.html'; 
    } else {
        // Erro
        msgErro.textContent = "Usuário ou senha incorretos.";
        msgErro.style.display = 'block';
        
        // Efeito visual de erro no input
        document.getElementById('senha').style.borderColor = '#ff4d4d';
    }
});