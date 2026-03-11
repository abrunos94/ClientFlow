// 1. Selecionamos todos os botões e o campo de seleção do formulário
const botoes = document.querySelectorAll('.btn-agendar');
const selectServico = document.getElementById('servico'); // O id do seu <select>

botoes.forEach(botao => {
  botao.addEventListener('click', () => {
    // 2. Pegamos o valor da "etiqueta" data-servico
    const servicoClicado = botao.getAttribute('data-servico');
    
    // 3. Atribuímos esse valor ao select do formulário
    if (selectServico) {
      selectServico.value = servicoClicado;
    }

    // 4. Levamos o usuário até o formulário de forma suave
    const secaoForm = document.getElementById('agendamento'); // O id da section do formulário
    secaoForm.scrollIntoView({ behavior: 'smooth' });
  });
});