/* ==========================================================================
   1. SEGURANÇA E ACESSO
   ========================================================================== */
if (localStorage.getItem("logado") !== "true") {
    window.location.href = "login.html";
}

/* ==========================================================================
   2. CONFIGURAÇÕES E ELEMENTOS GLOBAIS
   ========================================================================== */
const URL_PLANILHA = "https://script.google.com/macros/s/AKfycbxqDhLWYyszMT7zFZTYhrv9Rp-QPT0tzE0_1vL8ey_cTV2B_NDCIOAytuCsL4QU_Sm9/exec";

const listaAgendamentos = document.getElementById("lista-agendamentos");
const sidebar = document.getElementById("sidebar");
const btnAbrir = document.getElementById("abrir-menu");
const overlay = document.getElementById("overlay");
const btnLogout = document.getElementById("btn-logout");

const linkDashboard = document.querySelector(".menu a:nth-child(1)");
const linkAgenda = document.querySelector(".menu a:nth-child(2)");
const linkClientes = document.querySelector(".menu a:nth-child(3)");
const linkRelatorios = document.getElementById("link-relatorios");
const btnConfigMaster = document.getElementById("btn-config-master");

const secaoHomeTotal = document.getElementById("conteudo-dashboard");
const secaoAgendaCompleta = document.getElementById("secao-agenda-completa");
const secaoConfigs = document.getElementById("configuracoes-section");
const secaoClientes = document.getElementById("secao-clientes");
const secaoRelatorios = document.getElementById("secao-relatorios");

const SERVICOS_PADRAO = [
    { nome: "Corte Masculino", preco: 40 },
    { nome: "Barba", preco: 30 },
    { nome: "Corte + Barba", preco: 60 },
    { nome: "Pezinho", preco: 15 }
];

/* ==========================================================================
   3. LÓGICA DE RESET DIÁRIO E HISTÓRICO
   ========================================================================== */
function verificarResetDiario() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const ultimaDataFaturamento = localStorage.getItem("dataUltimoFaturamento");

    if (ultimaDataFaturamento !== hoje) {
        localStorage.setItem("faturamentoHoje", "0");
        localStorage.setItem("dataUltimoFaturamento", hoje);
    }
}

function salvarFaturamentoNoHistorico(data, valor) {
    let historico = JSON.parse(localStorage.getItem("historicoFinanceiro")) || {};
    historico[data] = (historico[data] || 0) + valor;
    localStorage.setItem("historicoFinanceiro", JSON.stringify(historico));
}

/* ==========================================================================
   4. NAVEGAÇÃO E INTERFACE
   ========================================================================== */
function esconderTodasSessoes() {
    const secoes = [secaoHomeTotal, secaoAgendaCompleta, secaoConfigs, secaoClientes, secaoRelatorios];
    secoes.forEach((s) => { if (s) s.style.display = "none"; });
    document.querySelectorAll(".menu a").forEach((a) => a.classList.remove("active"));
}

if (linkDashboard) {
    linkDashboard.addEventListener("click", (e) => {
        e.preventDefault();
        esconderTodasSessoes();
        if (secaoHomeTotal) secaoHomeTotal.style.display = "block";
        linkDashboard.classList.add("active");
        carregarAgendamentos();
    });
}

if (linkAgenda) {
    linkAgenda.addEventListener("click", (e) => {
        e.preventDefault();
        esconderTodasSessoes();
        if (secaoAgendaCompleta) secaoAgendaCompleta.style.display = "block";
        linkAgenda.classList.add("active");
        renderizarCalendario();
    });
}

if (linkClientes) {
    linkClientes.addEventListener("click", (e) => {
        e.preventDefault();
        esconderTodasSessoes();
        if (secaoClientes) secaoClientes.style.display = "block";
        linkClientes.classList.add("active");
        renderizarListaClientes();
    });
}

if (linkRelatorios) {
    linkRelatorios.addEventListener("click", (e) => {
        e.preventDefault();
        esconderTodasSessoes();
        if (secaoRelatorios) secaoRelatorios.style.display = "block";
        linkRelatorios.classList.add("active");
        renderizarRelatorios();
    });
}

const fecharMenu = () => {
    if (sidebar) sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
};

if (btnAbrir && sidebar && overlay) {
    btnAbrir.addEventListener("click", () => {
        sidebar.classList.add("active");
        overlay.classList.add("active");
    });
    overlay.addEventListener("click", fecharMenu);
}

if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("logado");
        window.location.href = "index.html";
    });
}

/* ==========================================================================
   5. GERENCIAMENTO DE SERVIÇOS E META
   ========================================================================== */
function obterServicos() {
    const salvos = localStorage.getItem("meusServicos");
    return salvos ? JSON.parse(salvos) : SERVICOS_PADRAO;
}

function atualizarSelectsServicos() {
    const select = document.getElementById("rapido-servico");
    if (!select) return;
    const servicos = obterServicos();
    select.innerHTML = servicos.map(s => `<option value="${s.nome}">${s.nome}</option>`).join("");
}

function renderizarConfigServicos() {
    const container = document.getElementById("lista-servicos-config");
    if (!container) return;
    const servicos = obterServicos();
    container.innerHTML = "<h4 style='margin-bottom: 10px; color: #fff;'>Serviços Ativos:</h4>";
    servicos.forEach((servico, index) => {
        container.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--cor-borda);">
                <div><span style="color: #fff; font-weight: bold;">${servico.nome}</span><span style="color: #2ecc71; margin-left: 10px;">R$ ${servico.preco}</span></div>
                <button onclick="excluirServico(${index})" style="background: transparent; border: none; color: #ff4d4d; cursor: pointer;"><i class="fas fa-trash"></i></button>
            </div>`;
    });
}

window.adicionarNovoServico = function () {
    const nomeI = document.getElementById("novo-servico-nome");
    const precoI = document.getElementById("novo-servico-preco");
    if (!nomeI.value || !precoI.value) return alert("Preencha todos os campos!");
    const lista = obterServicos();
    lista.push({ nome: nomeI.value, preco: parseFloat(precoI.value) });
    localStorage.setItem("meusServicos", JSON.stringify(lista));
    nomeI.value = ""; precoI.value = "";
    renderizarConfigServicos();
    atualizarSelectsServicos();
};

window.excluirServico = function (index) {
    if (confirm("Excluir este serviço?")) {
        const lista = obterServicos();
        lista.splice(index, 1);
        localStorage.setItem("meusServicos", JSON.stringify(lista));
        renderizarConfigServicos();
        atualizarSelectsServicos();
    }
};

if (btnConfigMaster) {
    btnConfigMaster.addEventListener("click", (e) => {
        e.preventDefault();
        const submenu = document.getElementById("submenu-links");
        const seta = btnConfigMaster.querySelector(".seta-menu");
        submenu.style.display = (submenu.style.display === "flex") ? "none" : "flex";
        if (seta) seta.classList.toggle("rotate");
    });
}

window.abrirSubConfig = function (tipo) {
    esconderTodasSessoes();
    if (secaoConfigs) secaoConfigs.style.display = "block";
    btnConfigMaster.classList.add("active");
    document.querySelectorAll(".config-sub-section").forEach(div => div.style.display = "none");
    if (tipo === 'expediente') document.getElementById("area-expediente").style.display = "block";
    if (tipo === 'meta') document.getElementById("area-meta").style.display = "block";
    if (tipo === 'servicos') {
        document.getElementById("area-servicos").style.display = "block";
        renderizarConfigServicos();
    }
};

window.salvarMetaDiaria = function () {
    const valorMeta = document.getElementById("cfg-meta-valor").value;
    if (valorMeta) {
        localStorage.setItem("metaDiaria", valorMeta);
        alert("Meta atualizada!");
        atualizarProgressoMeta();
    }
};

function atualizarProgressoMeta() {
    const meta = parseFloat(localStorage.getItem("metaDiaria")) || 400;
    const faturamento = parseFloat(localStorage.getItem("faturamentoHoje")) || 0;
    const elMeta = document.getElementById("meta-valor-display");
    const elFaturado = document.getElementById("faturamento-real");
    const elBarra = document.getElementById("barra-progresso-fill");
    const elFrase = document.getElementById("frase-progresso");

    if (elMeta) elMeta.innerText = `R$ ${meta},00`;
    if (elFaturado) elFaturado.innerText = `R$ ${faturamento.toFixed(2).replace('.', ',')}`;

    let porc = (faturamento / meta) * 100;
    if (elBarra) elBarra.style.width = `${Math.min(porc, 100)}%`;

    if (elFrase) {
        if (porc >= 100) {
            elFrase.innerText = "Meta Batida! 🏆";
            document.getElementById("painel-conquista")?.classList.add("meta-batida");
            if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
            elFrase.innerText = "Sua jornada de hoje começou! 🚀";
        }
    }
}

/* ==========================================================================
   6. LÓGICA DE CLIENTES E RELATÓRIOS
   ========================================================================== */
function renderizarListaClientes() {
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    const corpoTabela = document.getElementById("corpo-tabela-clientes");
    if (!corpoTabela) return;
    corpoTabela.innerHTML = "";
    const clientesUnicos = {};
    agendamentos.forEach((ag) => {
        if (!clientesUnicos[ag.nome] || new Date(ag.data) > new Date(clientesUnicos[ag.nome].data)) {
            clientesUnicos[ag.nome] = { nome: ag.nome, telefone: ag.telefone || "Não informado", ultimoServico: ag.servico, data: ag.data };
        }
    });
    const listaFinal = Object.values(clientesUnicos);
    if (listaFinal.length === 0) {
        corpoTabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum cliente cadastrado.</td></tr>';
        return;
    }
    listaFinal.sort((a, b) => a.nome.localeCompare(b.nome)).forEach((c) => {
        const linha = document.createElement("tr");
        linha.innerHTML = `<td><strong>${c.nome}</strong></td><td>${c.ultimoServico}</td><td>${c.telefone}</td>
            <td><button class="btn-whatsapp" onclick="enviarLembrete('${c.telefone}', '${c.nome}')"><i class="fab fa-whatsapp"></i></button></td>`;
        corpoTabela.appendChild(linha);
    });
}

function renderizarRelatorios() {
    const container = document.getElementById("lista-historico-financeiro");
    if (!container) return;
    const historico = JSON.parse(localStorage.getItem("historicoFinanceiro")) || {};
    const datas = Object.keys(historico).sort((a, b) => {
        return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
    });
    if (datas.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px; color:gray;">Sem dados para exibir.</p>';
        return;
    }
    container.innerHTML = datas.map(data => `
        <div style="display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); margin-bottom: 5px; border-radius: 8px;">
            <div style="display: flex; flex-direction: column;">
                <span style="color: #888; font-size: 0.8rem;">Data</span>
                <span style="color: #fff; font-weight: 500;">${data}</span>
            </div>
            <div style="display: flex; flex-direction: column; text-align: right;">
                <span style="color: #888; font-size: 0.8rem;">Faturamento</span>
                <span style="color: #2ecc71; font-weight: bold;">R$ ${historico[data].toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
    `).join("");
}

/* ==========================================================================
   7. LÓGICA DE DASHBOARD E CALENDÁRIO
   ========================================================================== */
function carregarAgendamentos() {
    if (!listaAgendamentos) return;
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    const hojeLocal = new Date().toLocaleDateString('en-CA');
    const hoje = agendamentos.filter(ag => ag.data && ag.data.startsWith(hojeLocal));
    listaAgendamentos.innerHTML = "";
    if (hoje.length === 0) {
        listaAgendamentos.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum agendamento para hoje.</td></tr>';
    } else {
        hoje.sort((a, b) => a.data.localeCompare(b.data)).forEach((ag) => {
            const hora = ag.data.split("T")[1].slice(0, 5);
            const linha = document.createElement("tr");
            linha.innerHTML = `
                <td>${hora}</td>
                <td><div class="cliente-info"><span>${ag.nome}</span></div></td>
                <td class="hide-mobile">${ag.servico}</td>
                <td>
                    <div class="acoes-buttons">
                        <button class="btn-whatsapp" onclick="enviarLembrete('${ag.telefone}', '${ag.nome}')"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn-concluir" onclick="removerAgendamento('${ag.id}', 'concluído')"><i class="fas fa-check"></i></button>
                        <button class="btn-cancelar" onclick="removerAgendamento('${ag.id}', 'cancelado')"><i class="fas fa-times"></i></button>
                    </div>
                </td>`;
            listaAgendamentos.appendChild(linha);
        });
    }
    atualizarEstatisticas(hoje.length);
    atualizarProximoHorario();
    atualizarServicoMaisVendido();
}

function atualizarEstatisticas(total) {
    const el = document.getElementById("total-hoje");
    if (el) el.innerText = total;
}

function atualizarProximoHorario() {
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    const agora = new Date();
    const hoje = agora.toISOString().split("T")[0];
    const horaAtual = agora.toTimeString().slice(0, 5);
    const futuros = agendamentos.filter(ag => ag.data.startsWith(hoje) && ag.data.split("T")[1].slice(0, 5) >= horaAtual);
    futuros.sort((a, b) => a.data.localeCompare(b.data));
    const el = document.getElementById("proximo-horario");
    if (el) el.innerText = futuros.length > 0 ? futuros[0].data.split("T")[1].slice(0, 5) : "--:--";
}

function atualizarServicoMaisVendido() {
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    if (agendamentos.length === 0) return;
    const contagem = {};
    agendamentos.forEach((ag) => { if (ag.servico) contagem[ag.servico] = (contagem[ag.servico] || 0) + 1; });
    let maisVendido = "", max = 0;
    for (const s in contagem) { if (contagem[s] > max) { max = contagem[s]; maisVendido = s; } }
    const el = document.getElementById("servico-mais-vendido");
    if (el) el.innerText = maisVendido || "---";
}

let dataAtualCalendario = new Date();
function renderizarCalendario() {
    const grade = document.getElementById("calendario-grade");
    const labelMes = document.getElementById("mes-atual");
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    if (!grade) return;
    grade.innerHTML = "";
    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    diasSemana.forEach(dia => {
        const divSemana = document.createElement("div");
        divSemana.className = "dia-semana";
        divSemana.innerText = dia;
        grade.appendChild(divSemana);
    });
    const ano = dataAtualCalendario.getFullYear();
    const mes = dataAtualCalendario.getMonth();
    const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(dataAtualCalendario);
    labelMes.innerText = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
    for (let i = 0; i < primeiroDiaSemana; i++) grade.appendChild(document.createElement("div"));
    for (let dia = 1; dia <= ultimoDiaMes; dia++) {
        const dataIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const temAgenda = agendamentos.some((ag) => ag.data.startsWith(dataIso));
        const divDia = document.createElement("div");
        divDia.className = `dia-item ${temAgenda ? "dia-marcado" : ""}`;
        divDia.innerText = dia;
        divDia.onclick = () => verDetalhesDia(dataIso, divDia);
        grade.appendChild(divDia);
    }
}

window.mudarMes = function (direcao) {
    dataAtualCalendario.setMonth(dataAtualCalendario.getMonth() + direcao);
    renderizarCalendario();
};

function verDetalhesDia(dataFiltro, elemento) {
    document.querySelectorAll(".dia-item").forEach((d) => d.classList.remove("ativo"));
    elemento.classList.add("ativo");
    const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
    const lista = document.getElementById("lista-agenda-clicada");
    const titulo = document.getElementById("titulo-agenda-selecionada");
    const filtrados = agendamentos.filter((ag) => ag.data.startsWith(dataFiltro));
    titulo.innerText = `Agenda de ${dataFiltro.split("-").reverse().join("/")}`;
    lista.innerHTML = "";
    if (filtrados.length === 0) {
        lista.innerHTML = `<p style="text-align:center; color:gray; margin-top:20px;">Nenhum cliente.</p>`;
        return;
    }
    filtrados.sort((a, b) => a.data.localeCompare(b.data)).forEach((ag) => {
        const hora = ag.data.split("T")[1].slice(0, 5);
        lista.innerHTML += `
            <div class="card-horario-detalhe">
                <div class="horario-badge">${hora}</div>
                <div class="info-cliente"><h4>${ag.nome}</h4><span><i class="fas fa-cut"></i> ${ag.servico}</span></div>
                <button class="btn-whatsapp" onclick="enviarLembrete('${ag.telefone}', '${ag.nome}')"><i class="fab fa-whatsapp"></i></button>
            </div>`;
    });
}

/* ==========================================================================
   8. FINALIZAÇÃO E REMOÇÃO
   ========================================================================== */
window.enviarLembrete = (tel, nome) => {
    const t = (tel && tel !== "Não informado") ? tel.replace(/\D/g, "") : "";
    if (!t) return alert("Sem telefone!");
    window.open(`https://wa.me/55${t}?text=Olá ${nome}, confirmamos seu horário!`, "_blank");
};

window.removerAgendamento = function (id, acao) {
    if (confirm(`Marcar como ${acao}?`)) {
        let ags = JSON.parse(localStorage.getItem("agendamentos")) || [];
        const agendamento = ags.find(a => String(a.id) === String(id));

        if (acao === 'concluído' && agendamento) {
            const servicosCadastrados = obterServicos();
            const serv = servicosCadastrados.find(s => s.nome === agendamento.servico);
            const valor = serv ? serv.preco : 0;
            let fatAtual = parseFloat(localStorage.getItem("faturamentoHoje")) || 0;
            const dataHoje = new Date().toLocaleDateString('pt-BR');

            localStorage.setItem("faturamentoHoje", fatAtual + valor);
            localStorage.setItem("dataUltimoFaturamento", dataHoje);
            salvarFaturamentoNoHistorico(dataHoje, valor);
        }

        ags = ags.filter((a) => String(a.id) !== String(id));
        localStorage.setItem("agendamentos", JSON.stringify(ags));
        carregarAgendamentos();
        atualizarProgressoMeta();
    }
};

window.addEventListener("load", () => {
    verificarResetDiario();
    atualizarSelectsServicos();
    carregarAgendamentos();
    atualizarProgressoMeta();

    const inputMeta = document.getElementById("cfg-meta-valor");
    if (inputMeta) inputMeta.value = localStorage.getItem("metaDiaria") || "400";
});