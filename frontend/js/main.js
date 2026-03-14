// 1. CONFIGURAÇÃO INICIAL
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxqDhLWYyszMT7zFZTYhrv9Rp-QPT0tzE0_1vL8ey_cTV2B_NDCIOAytuCsL4QU_Sm9/exec";

// 2. SELEÇÃO DE ELEMENTOS
const botoesAgendar = document.querySelectorAll('.btn-agendar');
const selectServico = document.getElementById('servico');
const secaoForm = document.getElementById('agendamento');
const formulario = document.getElementById('form-agendamento');

// --- LÓGICA DE SELEÇÃO AUTOMÁTICA DE SERVIÇO ---
if (botoesAgendar.length > 0) {
    botoesAgendar.forEach(botao => {
        botao.addEventListener('click', () => {
            const servicoClicado = botao.getAttribute('data-servico');
            
            if (selectServico) {
                selectServico.value = servicoClicado;
            }

            if (secaoForm) {
                secaoForm.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// --- LÓGICA DE SALVAR AGENDAMENTO (LOCAL E NUVEM) ---
if (formulario) {
    formulario.addEventListener('submit', (e) => {
        e.preventDefault(); // Impede o recarregamento da página
        
        console.log("1. Iniciando envio do formulário...");

        // Capturando os valores dos campos
        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;
        const servico = document.getElementById('servico').value;
        const data = document.getElementById('data').value;

        console.log("2. Dados capturados:", { nome, telefone, servico, data });

        // Criando o objeto de agendamento
        const novoAgendamento = {
            nome: nome,
            telefone: telefone,
            servico: servico,
            data: data,
            id: Date.now()
        };

        // A. SALVAR NO LOCALSTORAGE (Backup local no navegador)
        const agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentos')) || [];
        agendamentosSalvos.push(novoAgendamento);
        localStorage.setItem('agendamentos', JSON.stringify(agendamentosSalvos));

        // B. ENVIAR PARA O GOOGLE SHEETS (Nuvem)
        console.log("3. Enviando para a planilha...");

        fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoAgendamento)
        })
        .then(() => {
            alert('Agendamento realizado com sucesso, ' + nome + '!');
            formulario.reset(); // Limpa os campos
        })
        .catch(erro => {
            console.error('Erro ao enviar para planilha:', erro);
            alert('Erro ao salvar na nuvem, mas os dados estão salvos no seu navegador.');
        });
    });
}