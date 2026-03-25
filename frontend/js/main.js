/**
 * ClientFlow - Script Principal (Landing Page)
 * Focado em UX, Validação de Horários e Sincronização Dinâmica
 */

// 1. CONFIGURAÇÃO E ELEMENTOS GLOBAIS
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxqDhLWYyszMT7zFZTYhrv9Rp-QPT0tzE0_1vL8ey_cTV2B_NDCIOAytuCsL4QU_Sm9/exec";

const formulario = document.getElementById("form-agendamento");
const campoData = document.getElementById("data");
const campoTelefone = document.getElementById("telefone");
const selectServico = document.getElementById("servico");
const secaoForm = document.getElementById("agendamento");
const gridHorarios = document.getElementById("grid-horarios");
const containerHorarios = document.getElementById("container-horarios");
const inputHorarioFinal = document.getElementById("horario-final");

const SERVICOS_PADRAO = [
    { nome: "Corte Masculino", preco: 40 },
    { nome: "Barba", preco: 30 },
    { nome: "Corte + Barba", preco: 60 }
];

/* ==========================================================================
   2. RENDERIZAÇÃO DINÂMICA (HOME E FORMULÁRIO)
   ========================================================================== */

function renderizarServicosNaHome() {
    const container = document.getElementById("container-servicos-cliente");
    if (!container) return;

    const salvos = localStorage.getItem("meusServicos");
    const servicos = salvos ? JSON.parse(salvos) : SERVICOS_PADRAO;

    container.innerHTML = "";

    servicos.forEach(servico => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h3>${servico.nome}</h3>
            <p class="preco">R$ ${servico.preco}</p>
            <button class="btn-card btn-agendar" onclick="selecionarServicoEIrParaForm('${servico.nome}')">
                Agendar
            </button>
        `;
        container.appendChild(card);
    });

    atualizarSelectFormularioCliente(servicos);
}

function atualizarSelectFormularioCliente(servicos) {
    if (selectServico) {
        // Mantém a opção padrão e adiciona as dinâmicas
        selectServico.innerHTML = '<option value="">Selecione um serviço</option>' +
            servicos.map(s => `<option value="${s.nome}">${s.nome}</option>`).join("");
    }
}

// Função chamada pelo clique no card
window.selecionarServicoEIrParaForm = function (nomeServico) {
    if (selectServico) {
        selectServico.value = nomeServico;
        if (secaoForm) secaoForm.scrollIntoView({ behavior: 'smooth' });
    }
};

/* ==========================================================================
   3. MÁSCARAS E VALIDAÇÕES DE INTERFACE
   ========================================================================== */

if (campoData) {
    campoData.min = new Date().toISOString().split("T")[0];
}

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

/* ==========================================================================
   4. LÓGICA DE HORÁRIOS (SLOTS)
   ========================================================================== */

if (campoData) {
    campoData.addEventListener("change", function () {
        if (!this.value) return;
        gerarSlots(this.value);
    });
}

function gerarSlots(dataEscolhida) {
    gridHorarios.innerHTML = "";
    containerHorarios.style.display = "block";
    inputHorarioFinal.value = "";

    const configs = JSON.parse(localStorage.getItem("configAgenda")) || {
        inicio: "09:00",
        fim: "18:00",
        almocoInicio: "12:00",
        almocoFim: "13:00",
        intervalo: 30,
        dias: [1, 2, 3, 4, 5, 6]
    };

    const agora = new Date();
    const hojeDataLocal = agora.toLocaleString('sv-SE').split(' ')[0];
    const hojeHoraLocal = agora.getHours().toString().padStart(2, '0') + ":" +
        agora.getMinutes().toString().padStart(2, '0');

    const diaSemana = new Date(dataEscolhida + "T00:00:00").getDay();
    if (!configs.dias.includes(diaSemana)) {
        gridHorarios.innerHTML = "<p style='grid-column: 1/-1; color: var(--cor-primaria);'>Não funcionamos neste dia.</p>";
        return;
    }

    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    let horaLoop = configs.inicio;
    let slotsGerados = 0;

    while (horaLoop < configs.fim) {
        const noAlmoco = (configs.almocoInicio && configs.almocoFim) &&
            (horaLoop >= configs.almocoInicio && horaLoop < configs.almocoFim);

        if (noAlmoco) {
            horaLoop = somarMinutos(horaLoop, configs.intervalo);
            continue;
        }

        const dataHoraID = `${dataEscolhida}T${horaLoop}`;
        const isOcupado = agendamentos.some((a) => a.data === dataHoraID);
        const isPassado = (dataEscolhida === hojeDataLocal) && (horaLoop <= hojeHoraLocal);

        if (isOcupado || isPassado) {
            horaLoop = somarMinutos(horaLoop, configs.intervalo);
            continue;
        }

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

    if (slotsGerados === 0) {
        gridHorarios.innerHTML = "<p style='grid-column: 1/-1; color: var(--cor-subtexto);'>Nenhum horário disponível.</p>";
    }
}

function somarMinutos(hora, minutos) {
    let [h, m] = hora.split(":").map(Number);
    m += parseInt(minutos);
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ==========================================================================
   5. ENVIO DO FORMULÁRIO
   ========================================================================== */

if (formulario) {
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!inputHorarioFinal.value) {
            alert("Por favor, selecione um horário na grade!");
            return;
        }

        const botaoSubmit = formulario.querySelector('button[type="submit"]');
        const textoOriginal = botaoSubmit.innerText;

        // Estado de carregamento
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
            const agendamentosSalvos = JSON.parse(localStorage.getItem("agendamentos")) || [];
            agendamentosSalvos.push(novoAgendamento);
            localStorage.setItem("agendamentos", JSON.stringify(agendamentosSalvos));

            await fetch(URL_PLANILHA, {
                method: "POST",
                mode: "no-cors",
                cache: "no-cache",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(novoAgendamento),
            });

            // --- SUCESSO: ATIVA O CHECK VERDE ---
            botaoSubmit.innerHTML = '<i class="fas fa-check"></i> Agendado com Sucesso!';
            botaoSubmit.classList.add("sucesso", "animar-sucesso");

            // Aguarda 3 segundos para o cliente ver o sucesso e limpa tudo
            setTimeout(() => {
                formulario.reset();
                if (containerHorarios) containerHorarios.style.display = "none";

                // Volta o botão ao estado original
                botaoSubmit.classList.remove("sucesso", "animar-sucesso");
                botaoSubmit.innerText = textoOriginal;
                botaoSubmit.disabled = false;
            }, 3000);

        } catch (erro) {
            console.error("Erro no envio:", erro);
            alert("Erro ao sincronizar, mas salvamos o horário no seu navegador!");

            // Em caso de erro, volta o botão imediatamente para tentar de novo
            botaoSubmit.disabled = false;
            botaoSubmit.innerText = textoOriginal;
        }
    });
}

// INICIALIZAÇÃO
document.addEventListener("DOMContentLoaded", renderizarServicosNaHome);