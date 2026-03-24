// 1. SEGURANÇA
if (localStorage.getItem("logado") !== "true") {
    window.location.href = "login.html";
}

// 2. CONFIGURAÇÕES E ELEMENTOS
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxqDhLWYyszMT7zFZTYhrv9Rp-QPT0tzE0_1vL8ey_cTV2B_NDCIOAytuCsL4QU_Sm9/exec";
const listaAgendamentos = document.getElementById("lista-agendamentos");

// 3. MENU MOBILE E LOGOUT (Mantidos)
const sidebar = document.getElementById("sidebar");
const btnAbrir = document.getElementById("abrir-menu");
const btnFechar = document.getElementById("fechar-menu");
const overlay = document.getElementById("overlay");
const btnLogout = document.getElementById("btn-logout");

if (btnAbrir && sidebar && overlay) {
    const fecharMenu = () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    };
    btnAbrir.addEventListener("click", () => {
        sidebar.classList.add("active");
        overlay.classList.add("active");
    });
    if (btnFechar) btnFechar.addEventListener("click", fecharMenu);
    overlay.addEventListener("click", fecharMenu);
}

if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("logado");
        window.location.href = "index.html";
    });
}

// 4. LÓGICA DE DATA (O Coração do Problema)
function obterAgendamentosDeHoje() {
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    
    // Pega a data local de Vila Velha sem usar ISOString (que causa o erro de fuso)
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const hojeLocal = `${ano}-${mes}-${dia}`;

    console.log("Data do Sistema para filtro:", hojeLocal);

    return agendamentos.filter(agendamento => {
        // Verifica se a data salva no agendamento começa com o dia de hoje
        return agendamento.data && agendamento.data.split('T')[0] === hojeLocal;
    });
}

// 5. RENDERIZAÇÃO E ESTATÍSTICAS
function atualizarEstatisticas() {
    const agendamentosDeHoje = obterAgendamentosDeHoje();
    const elementoTotal = document.getElementById('total-hoje');
    if (elementoTotal) {
        elementoTotal.innerText = agendamentosDeHoje.length;
    }
}

function carregarAgendamentos() {
    const agendamentosDeHoje = obterAgendamentosDeHoje();

    if (listaAgendamentos) {
        listaAgendamentos.innerHTML = ""; 

        if (agendamentosDeHoje.length === 0) {
            listaAgendamentos.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum agendamento para hoje.</td></tr>';
        } else {
            agendamentosDeHoje.sort((a, b) => a.data.localeCompare(b.data));

            agendamentosDeHoje.forEach((agendamento) => {
                const linha = document.createElement("tr");
                linha.innerHTML = `
                    <td>${formatarHora(agendamento.data)}</td>
                    <td>
                        <div class="cliente-info">
                            <span>${agendamento.nome}</span>
                        </div>
                    </td>
                    <td class="hide-mobile">${agendamento.servico}</td>
                    <td>
                        <div class="acoes-buttons">
                            <button class="btn-whatsapp" onclick="enviarLembrete('${agendamento.telefone}', '${agendamento.nome}')">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                            <button class="btn-concluir" onclick="removerAgendamento('${agendamento.id}', 'concluído')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-cancelar" onclick="removerAgendamento('${agendamento.id}, 'cancelado')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </td>
                `;
                listaAgendamentos.appendChild(linha);
            });
        }
    }
    atualizarEstatisticas();
}

// 6. FUNÇÕES GLOBAIS (Unificadas)
window.formatarHora = function (dataString) {
    if (!dataString) return "--:--";
    return dataString.split("T")[1] || "--:--";
};

window.removerAgendamento = function (id, acao) {
    if (confirm(`Deseja marcar como ${acao}?`)) {
        // 1. Avisa a Planilha
        fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ id: id, status: acao })
        }).catch(err => console.error("Erro planilha:", err));

        // 2. Remove do LocalStorage
        let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
        // Garantindo que a comparação do ID seja precisa
        agendamentos = agendamentos.filter((a) => String(a.id) !== String(id));
        localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
        
        // 3. Atualiza a tela imediatamente
        carregarAgendamentos(); 
    }
};

window.enviarLembrete = function (telefone, nome) {
    const telefoneLimpo = telefone.replace(/\D/g, "");
    const mensagem = encodeURIComponent(`Olá ${nome}, confirmamos seu horário hoje!`);
    window.open(`https://wa.me/55${telefoneLimpo}?text=${mensagem}`, "_blank");
};

// 7. START
window.addEventListener("load", carregarAgendamentos);

// Selecionando elementos do modal
const modal = document.getElementById("modal-agendamento");
const btnNovoAgendamento = document.querySelector(".btn-principal"); // Seu botão da imagem
const btnFecharModal = document.getElementById("fechar-modal");

// Abrir modal ao clicar no botão
if (btnNovoAgendamento) {
    btnNovoAgendamento.addEventListener("click", () => {
        modal.style.display = "block";
    });
}

// Fechar modal ao clicar no X
if (btnFecharModal) {
    btnFecharModal.addEventListener("click", () => {
        modal.style.display = "none";
    });
}

// Fechar modal se clicar fora da caixa branca
window.addEventListener("click", (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});
window.agendarAgora = function() {
    // 1. Captura os elementos do Modal
    const nomeInput = document.getElementById('rapido-nome');
    const servicoInput = document.getElementById('rapido-servico');
    const telefoneInput = document.getElementById('rapido-telefone');
    const modal = document.getElementById("modal-agendamento");

    // 2. Validação simples
    if (!nomeInput.value || !servicoInput.value) {
        alert("Por favor, preencha o nome e o serviço!");
        return;
    }

    // 3. GERA DATA E HORA LOCAL (Formato compatível com o sistema: YYYY-MM-DDTHH:mm)
    // Isso garante que o agendamento entre no minuto exato que o cliente chegou
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');
    const hora = String(agora.getHours()).padStart(2, '0');
    const minuto = String(agora.getMinutes()).padStart(2, '0');
    
    const dataHoraAtual = `${ano}-${mes}-${dia}T${hora}:${minuto}`;

    // 4. Cria o objeto do agendamento
    const novoAtendimento = {
        id: Date.now(), // ID único baseado em milissegundos
        nome: nomeInput.value,
        servico: servicoInput.value,
        telefone: telefoneInput.value || "Sem Telefone",
        data: dataHoraAtual,
        status: "concluído" // Como é "na hora", já entra como concluído/em atendimento
    };

    console.log("Registrando atendimento agora:", novoAtendimento);

    // 5. SALVA NO LOCAL STORAGE
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    agendamentos.push(novoAtendimento);
    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

    // 6. ENVIA PARA O GOOGLE SHEETS (Sincronização em Nuvem)
    fetch(URL_PLANILHA, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoAtendimento)
    })
    .then(() => {
        console.log("Sincronizado com Google Sheets!");
    })
    .catch(err => console.error("Erro ao enviar para nuvem:", err));

    // 7. FINALIZAÇÃO (UX)
    alert(`Atendimento de ${novoAtendimento.nome} registrado com sucesso!`);
    
    // Limpa os campos para o próximo
    nomeInput.value = "";
    telefoneInput.value = "";
    
    // Fecha o modal
    if (modal) modal.style.display = "none";

    // Atualiza a tabela e os cards de hoje imediatamente
    carregarAgendamentos();
};

// --- LÓGICA DE NAVEGAÇÃO ENTRE ABAS ---
const linkDashboard = document.querySelector('.menu a:nth-child(1)');
const linkConfigs = document.querySelector('.menu a:nth-child(4)'); // Ícone de Cog
const secaoDashboard = document.querySelector('.stats-grid').parentElement; // Pega o main content principal
const secaoAgenda = document.querySelector('.agenda-section');
const secaoConfigs = document.getElementById('configuracoes-section');

if (linkConfigs) {
    linkConfigs.addEventListener('click', (e) => {
        e.preventDefault();
        secaoAgenda.style.display = 'none';
        document.querySelector('.stats-grid').style.display = 'none';
        secaoConfigs.style.display = 'block';
        
        // Troca classe active
        linkDashboard.classList.remove('active');
        linkConfigs.classList.add('active');
    });
}

if (linkDashboard) {
    linkDashboard.addEventListener('click', (e) => {
        e.preventDefault();
        secaoAgenda.style.display = 'block';
        document.querySelector('.stats-grid').style.display = 'grid';
        secaoConfigs.style.display = 'none';
        
        linkConfigs.classList.remove('active');
        linkDashboard.classList.add('active');
    });
}

// --- SALVAR E CARREGAR CONFIGURAÇÕES ---
window.salvarConfiguracoes = function() {
    const configs = {
        inicio: document.getElementById('cfg-hora-inicio').value,
        fim: document.getElementById('cfg-hora-fim').value,
        intervalo: document.getElementById('cfg-intervalo').value,
        dias: Array.from(document.querySelectorAll('.cfg-dia:checked')).map(el => parseInt(el.value))
    };

    localStorage.setItem('configAgenda', JSON.stringify(configs));
    alert("Configurações salvas! Agora o site do cliente respeitará estes horários.");
};

function carregarConfigs() {
    const salvas = JSON.parse(localStorage.getItem('configAgenda'));
    if (salvas) {
        document.getElementById('cfg-hora-inicio').value = salvas.inicio;
        document.getElementById('cfg-hora-fim').value = salvas.fim;
        document.getElementById('cfg-intervalo').value = salvas.intervalo;
        
        document.querySelectorAll('.cfg-dia').forEach(el => {
            el.checked = salvas.dias.includes(parseInt(el.value));
        });
    }
}

// Chame no final do arquivo ou no window.load
carregarConfigs();