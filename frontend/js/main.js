/**
 * ClientFlow - Script Principal (Landing Page)
 * Focado em UX, Validação de Horários e Sincronização
 */

// 1. CONFIGURAÇÃO INICIAL
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxqDhLWYyszMT7zFZTYhrv9Rp-QPT0tzE0_1vL8ey_cTV2B_NDCIOAytuCsL4QU_Sm9/exec";

// 2. SELEÇÃO DE ELEMENTOS
const formulario = document.getElementById("form-agendamento");
const campoData = document.getElementById("data");
const campoTelefone = document.getElementById("telefone");
const botoesAgendar = document.querySelectorAll(".btn-agendar");
const selectServico = document.getElementById("servico");
const secaoForm = document.getElementById("agendamento");
const gridHorarios = document.getElementById("grid-horarios");
const containerHorarios = document.getElementById("container-horarios");
const inputHorarioFinal = document.getElementById("horario-final");

// --- CONFIGURAÇÃO DE DATA MÍNIMA ---
// Impede que o calendário do navegador selecione dias passados no seletor
if (campoData) {
    campoData.min = new Date().toISOString().split("T")[0];
}

// --- MÁSCARA DE TELEFONE (27) 99999-9999 ---
if (campoTelefone) {
    campoTelefone.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 10) {
            value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        } else if (value.length > 6) {
            value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        } else if (value.length > 2) {
            value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        } else {
            value = value.replace(/^(\d*)/, "($1");
        }
        e.target.value = value;
    });
}

// --- LÓGICA DE SELEÇÃO AUTOMÁTICA DE SERVIÇO ---
botoesAgendar.forEach((botao) => {
    botao.addEventListener("click", () => {
        const servicoClicado = botao.getAttribute("data-servico");
        if (selectServico) selectServico.value = servicoClicado;
        if (secaoForm) secaoForm.scrollIntoView({ behavior: "smooth" });
    });
});

// --- GERAÇÃO DINÂMICA DE HORÁRIOS (SLOTS) ---
if (campoData) {
    campoData.addEventListener("change", function () {
        const dataSelecionada = this.value;
        if (!dataSelecionada) return;
        gerarSlots(dataSelecionada);
    });
}

function gerarSlots(dataEscolhida) {
    gridHorarios.innerHTML = "";
    containerHorarios.style.display = "block";
    inputHorarioFinal.value = ""; // Reseta seleção ao trocar de dia

    // 1. Pega as configurações do Dashboard (ou padrão)
    const configs = JSON.parse(localStorage.getItem("configAgenda")) || {
        inicio: "09:00", fim: "18:00", intervalo: 30, dias: [1, 2, 3, 4, 5, 6]
    };

    // 2. Captura hora atual para esconder horários passados
    const agora = new Date();
    const hojeDataLocal = agora.toLocaleString('sv-SE').split(' ')[0];
    const hojeHoraLocal = agora.getHours().toString().padStart(2, '0') + ":" + 
                          agora.getMinutes().toString().padStart(2, '0');

    // 3. Valida dia da semana (Se o barbeiro abre)
    const diaSemana = new Date(dataEscolhida + "T00:00:00").getDay();
    if (!configs.dias.includes(diaSemana)) {
        gridHorarios.innerHTML = "<p style='grid-column: 1/-1; color: var(--cor-primaria);'>Não funcionamos neste dia. Escolha outra data.</p>";
        return;
    }

    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

    // 4. Loop de criação dos horários com FILTRO DE EXCLUSÃO
    let horaLoop = configs.inicio;
    let slotsGerados = 0;

    while (horaLoop < configs.fim) {
        const dataHoraID = `${dataEscolhida}T${horaLoop}`;
        
        // REGRAS DE EXCLUSÃO:
        const isOcupado = agendamentos.some((a) => a.data === dataHoraID);
        const isPassado = (dataEscolhida === hojeDataLocal) && (horaLoop <= hojeHoraLocal);

        // Se estiver ocupado ou já passou da hora, pula para o próximo sem criar o botão
        if (isOcupado || isPassado) {
            horaLoop = somarMinutos(horaLoop, configs.intervalo);
            continue; 
        }

        // Criar o botão apenas para horários válidos e livres
        const slot = document.createElement("div");
        slot.className = "slot";
        slot.innerText = horaLoop;

        slot.addEventListener("click", function () {
            document.querySelectorAll(".slot").forEach((s) => s.classList.remove("selecionado"));
            slot.classList.add("selecionado");
            inputHorarioFinal.value = dataHoraID;
        });

        gridHorarios.appendChild(slot);
        slotsGerados++;
        horaLoop = somarMinutos(horaLoop, configs.intervalo);
    }

    // Se o loop terminou e não sobrou nenhum horário disponível para hoje
    if (slotsGerados === 0) {
        gridHorarios.innerHTML = "<p style='grid-column: 1/-1; color: var(--cor-subtexto);'>Nenhum horário disponível para hoje. Tente amanhã!</p>";
    }
}

// Auxiliar para somar minutos (ex: 09:00 + 30 = 09:30)
function somarMinutos(hora, minutos) {
    let [h, m] = hora.split(":").map(Number);
    m += parseInt(minutos);
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// --- ENVIO DO FORMULÁRIO ---
if (formulario) {
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!inputHorarioFinal.value) {
            alert("Por favor, selecione um horário na grade!");
            return;
        }

        const botaoSubmit = formulario.querySelector('button[type="submit"]');
        const textoOriginal = botaoSubmit.innerText;
        botaoSubmit.disabled = true;
        botaoSubmit.innerText = "Enviando...";

        const novoAgendamento = {
            nome: document.getElementById("nome").value,
            telefone: campoTelefone.value,
            servico: selectServico.value,
            data: inputHorarioFinal.value,
            id: Date.now(),
            status: "Pendente",
        };

        try {
            // Salva Local
            const agendamentosSalvos = JSON.parse(localStorage.getItem("agendamentos")) || [];
            agendamentosSalvos.push(novoAgendamento);
            localStorage.setItem("agendamentos", JSON.stringify(agendamentosSalvos));

            // Envia Nuvem
            await fetch(URL_PLANILHA, {
                method: "POST",
                mode: "no-cors",
                cache: "no-cache",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novoAgendamento),
            });

            alert(`Tudo certo, ${novoAgendamento.nome}! Horário reservado.`);
            formulario.reset();
            containerHorarios.style.display = "none"; 
        } catch (erro) {
            alert("Erro ao sincronizar, mas salvamos no seu navegador!");
        } finally {
            botaoSubmit.disabled = false;
            botaoSubmit.innerText = textoOriginal;
        }
    });
}