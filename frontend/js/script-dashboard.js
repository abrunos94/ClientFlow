/**
 * ClientFlow - Dashboard Administrativo
 * Arquitetura SaaS - Versão Monolítica Final
 */

/* ==========================================================================
   1. SEGURANÇA, CONEXÃO E CACHE DO DOM
   ========================================================================== */
// REMOVA o "/rest/v1/" do final da URL
const SUPABASE_URL = "https://qposfoxkszlxdmcrabbx.supabase.co"; 

// A KEY permanece a mesma
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3Nmb3hrc3pseGRtY3JhYmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTU0OTYsImV4cCI6MjA5NDE5MTQ5Nn0.OfGnMWsiiQDQ95XCOEcwPKPgF-YOLIai1ICZuWu2YqY";

// O cliente agora montará a URL corretamente
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Cache de Elementos Principais
const secoes = {
    home: document.getElementById("conteudo-dashboard"),
    agenda: document.getElementById("secao-agenda-completa"),
    clientes: document.getElementById("secao-clientes"),
    configs: document.getElementById("configuracoes-section"),
    relatorios: document.getElementById("secao-relatorios"),
};
const headerPrincipal = document.getElementById("header-principal");
const painelConquista = document.getElementById("painel-conquista");
const listaAgendamentos = document.getElementById("lista-agendamentos");

// Estado Global
let chartFaturamento = null;
let dataCalendario = new Date();

// Autenticação Real e Segura
async function validarSessaoSegura() {
    const { data: { user }, error } = await _supabase.auth.getUser();
    if (error || !user) {
        console.warn("Acesso Negado: Redirecionando para login.");
        localStorage.removeItem("logado");
        window.location.href = "login.html";
    }
}
validarSessaoSegura();

/* ==========================================================================
   2. NAVEGAÇÃO E INTERFACE (ROUTER)
   ========================================================================== */
function esconderTodasSessoes() {
    Object.values(secoes).forEach(s => { if (s) s.style.display = "none"; });
    document.querySelectorAll(".menu a").forEach(a => a.classList.remove("active"));
    document.querySelectorAll('.config-sub-section, .relatorio-sub-section').forEach(s => s.style.display = 'none');
}

// Inicializador de Dropdowns (DRY)
function configurarDropdown(btnId, gavetaId) {
    const btn = document.getElementById(btnId);
    const gaveta = document.getElementById(gavetaId);
    if (btn && gaveta) {
        btn.onclick = (e) => { e.preventDefault(); gaveta.classList.toggle("active"); btn.classList.toggle("open"); };
    }
}
configurarDropdown("btn-config-master", "submenu-links");
configurarDropdown("btn-relatorio-master", "submenu-relatorios");
configurarDropdown("btn-config-geral-master", "submenu-config-geral");

// Controle do Menu Mobile
const btnAbrirMenu = document.getElementById("abrir-menu");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

if (btnAbrirMenu && sidebar && overlay) {
    btnAbrirMenu.onclick = () => { sidebar.classList.add("active"); overlay.classList.add("active"); };
    overlay.onclick = () => { sidebar.classList.remove("active"); overlay.classList.remove("active"); };
    document.querySelectorAll(".menu a, .submenu a").forEach(link => {
        link.addEventListener("click", () => {
            if (!link.id.includes("-master") && window.innerWidth <= 1024) {
                sidebar.classList.remove("active"); overlay.classList.remove("active");
            }
        });
    });
}

// Router Principal de Abas
document.querySelectorAll(".menu > a").forEach((link) => {
    link.addEventListener("click", (e) => {
        if (link.id.includes("-master") || link.id === "btn-logout") return;
        e.preventDefault();
        esconderTodasSessoes();
        link.classList.add("active");

        const texto = link.innerText.trim();
        const mostrarTopo = texto.includes("Dashboard") || texto.includes("Agenda");
        if (headerPrincipal) headerPrincipal.style.display = mostrarTopo ? "flex" : "none";
        if (painelConquista) painelConquista.style.display = mostrarTopo ? "block" : "none";

        if (texto.includes("Dashboard")) {
            secoes.home.style.display = "block";
            carregarAgendamentosDoDia();
        } else if (texto.includes("Agenda")) {
            secoes.agenda.style.display = "block";
            inicializarAgenda();
        } else if (texto.includes("Clientes")) {
            secoes.clientes.style.display = "block";
            renderizarListaClientes();
        }
    });
});

// Logout Seguro
const btnSair = document.getElementById("btn-logout");
if (btnSair) {
    btnSair.onclick = async () => {
        if (confirm("Deseja realmente sair?")) {
            await _supabase.auth.signOut();
            localStorage.removeItem("logado");
            window.location.href = "login.html";
        }
    };
}

/* ==========================================================================
   3. CORE - DASHBOARD E AGENDAMENTOS
   ========================================================================== */
window.carregarAgendamentosDoDia = async function () {
    if (!listaAgendamentos) return;
    const hoje = new Date().toLocaleDateString("en-CA");
    const { data: agendamentos, error } = await _supabase.from("agendamentos").select("*").eq("data", hoje).neq("status", "cancelado").order("horario", { ascending: true });

    listaAgendamentos.innerHTML = "";
    if (error || !agendamentos || agendamentos.length === 0) {
        listaAgendamentos.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum agendamento para hoje.</td></tr>';
        atualizarCardsEstatisticas([]);
    } else {
        agendamentos.forEach(ag => {
            listaAgendamentos.innerHTML += `
                <tr>
                    <td>${String(ag.horario).substring(0, 5)}h</td>
                    <td><strong>${ag.cliente_nome}</strong></td>
                    <td class="hide-mobile">${ag.servico}</td>
                    <td>
                        <div class="acoes-buttons">
                            <button class="btn-whatsapp" onclick="enviarLembrete('${ag.telefone}', '${ag.cliente_nome}', '${ag.data}', '${ag.horario}')"><i class="fab fa-whatsapp"></i></button>
                            <button class="btn-concluir" onclick="mudarStatusAgendamento('${ag.id}', 'concluido')"><i class="fas fa-check"></i></button>
                            <button class="btn-cancelar" onclick="mudarStatusAgendamento('${ag.id}', 'cancelado')"><i class="fas fa-times"></i></button>
                        </div>
                    </td>
                </tr>`;
        });
        atualizarCardsEstatisticas(agendamentos);
    }
    const cont = document.getElementById("total-hoje");
    if (cont) cont.innerText = agendamentos ? agendamentos.length : 0;
};

function atualizarCardsEstatisticas(agendamentos) {
    const elProximo = document.getElementById("proximo-horario-valor");
    const elServicoVendido = document.getElementById("servico-mais-vendido");

    if (!agendamentos || agendamentos.length === 0) {
        if (elProximo) elProximo.innerText = "--:--";
        return;
    }

    const agora = new Date();
    const horaStr = agora.getHours().toString().padStart(2, "0") + ":" + agora.getMinutes().toString().padStart(2, "0");
    const proximos = agendamentos.filter(ag => ag.horario.substring(0, 5) >= horaStr && ag.status.toLowerCase() === "pendente");

    if (elProximo) elProximo.innerText = proximos.length > 0 ? proximos.sort((a, b) => a.horario.localeCompare(b.horario))[0].horario.substring(0, 5) + "h" : "Encerrado";

    const contagem = {};
    agendamentos.forEach(ag => { if (ag.servico) contagem[ag.servico] = (contagem[ag.servico] || 0) + 1; });
    const chaves = Object.keys(contagem);
    if (chaves.length > 0 && elServicoVendido) elServicoVendido.innerText = chaves.reduce((a, b) => contagem[a] > contagem[b] ? a : b);
}

window.mudarStatusAgendamento = async function (id, novoStatus) {
    if (!confirm(`Deseja marcar como ${novoStatus}?`)) return;
    await _supabase.from("agendamentos").update({ status: novoStatus }).eq("id", id);
    await recalcularFaturamentoDoDia();
    carregarAgendamentosDoDia();
};

/* ==========================================================================
   4. ATENDIMENTO RÁPIDO E METAS
   ========================================================================== */
window.agendarAgora = async function () {
    const nome = document.getElementById("rapido-nome").value;
    const servico = document.getElementById("rapido-servico").value;
    const telefone = document.getElementById("rapido-telefone").value;

    if (!nome || !servico) return alert("Preencha o nome e o serviço.");
    const agora = new Date();
    const dataISO = agora.toLocaleDateString("en-CA");
    const horaAtual = agora.getHours().toString().padStart(2, "0") + ":" + agora.getMinutes().toString().padStart(2, "0");

    const { data: sInfo } = await _supabase.from('servicos').select('preco').eq('nome', servico).single();
    const { error } = await _supabase.from("agendamentos").insert([{ cliente_nome: nome, servico: servico, telefone: telefone, data: dataISO, horario: horaAtual, status: 'concluido', valor: (sInfo ? sInfo.preco : 0) }]);

    if (error) alert("Erro: " + error.message);
    else {
        document.getElementById("modal-agendamento").style.display = "none";
        document.getElementById("rapido-nome").value = ""; document.getElementById("rapido-telefone").value = "";
        await carregarAgendamentosDoDia(); await recalcularFaturamentoDoDia();
        alert("Atendimento rápido registrado! ✅");
    }
};

window.recalcularFaturamentoDoDia = async function () {
    const hoje = new Date().toLocaleDateString("en-CA");
    const { data } = await _supabase.from("agendamentos").select("valor").eq("data", hoje).eq("status", "concluido");
    const total = (data || []).reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);
    localStorage.setItem("faturamentoHoje", total.toString());
    atualizarProgressoMeta();
};

function atualizarProgressoMeta() {
    const meta = parseFloat(localStorage.getItem("metaDiaria")) || 400;
    const faturado = parseFloat(localStorage.getItem("faturamentoHoje")) || 0;
    const porc = (faturado / meta) * 100;

    const elFrase = document.getElementById("frase-progresso");
    const elMeta = document.getElementById("meta-valor-display");
    const elReal = document.getElementById("faturamento-real");
    const elFill = document.getElementById("barra-progresso-fill");

    if (elMeta) elMeta.innerText = `R$ ${meta.toFixed(2).replace(".", ",")}`;
    if (elReal) elReal.innerText = `R$ ${faturado.toFixed(2).replace(".", ",")}`;
    if (elFill) elFill.style.width = `${Math.min(porc, 100)}%`;

    if (porc >= 100) {
        if (elFrase) elFrase.innerText = "Meta batida! Você é fera! 🏆";
        if (elFill) elFill.style.background = "linear-gradient(90deg, #FFD700, #FFA500)";
        if (typeof confetti === "function" && sessionStorage.getItem("confeteDisparado") !== "true") {
            dispararConfete(); sessionStorage.setItem("confeteDisparado", "true");
        }
    } else {
        if (elFrase) elFrase.innerText = "Sua jornada de hoje começou! 🚀";
        if (elFill) elFill.style.background = "var(--cor-primaria)";
        sessionStorage.removeItem("confeteDisparado");
    }
}

function dispararConfete() {
    var end = Date.now() + 2000; var colors = ['#ce9e62', '#ffffff', '#D4AF37'];
    (function frame() {
        confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
        confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

/* ==========================================================================
   5. AGENDA COMPLETA (CALENDÁRIO)
   ========================================================================== */
async function inicializarAgenda() { renderizarEstruturaCalendario(); }
window.mudarMes = (direcao) => { dataCalendario.setMonth(dataCalendario.getMonth() + direcao); renderizarEstruturaCalendario(); };

async function renderizarEstruturaCalendario() {
    const grade = document.getElementById("calendario-grade");
    const mesDisplay = document.getElementById("mes-atual");
    if (!grade || !mesDisplay) return;

    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const ano = dataCalendario.getFullYear(); const mes = dataCalendario.getMonth();
    mesDisplay.innerText = `${meses[mes]} ${ano}`; grade.innerHTML = "";

    const priDia = new Date(ano, mes, 1).getDay(); const diasMes = new Date(ano, mes + 1, 0).getDate();
    const { data: ags } = await _supabase.from('agendamentos').select('data').gte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-01`).lte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-${diasMes}`);
    const diasComAgenda = new Set(ags?.map(a => a.data));

    for (let i = 0; i < priDia; i++) grade.innerHTML += `<div></div>`;
    for (let dia = 1; dia <= diasMes; dia++) {
        const dIso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const el = document.createElement("div");
        el.className = `dia-item ${diasComAgenda.has(dIso) ? 'tem-marcacao' : ''}`;
        el.innerText = dia;
        el.onclick = () => selecionarDiaAgenda(dIso, el);
        grade.appendChild(el);
    }
}

async function selecionarDiaAgenda(dataISO, elemento) {
    document.querySelectorAll(".dia-item").forEach(d => d.classList.remove("selecionado"));
    if (elemento) elemento.classList.add("selecionado");

    const lista = document.getElementById("lista-agenda-clicada");
    const titulo = document.getElementById("titulo-agenda-selecionada");
    const [ano, mes, dia] = dataISO.split("-");

    if (titulo) titulo.innerText = `Agenda: ${dia}/${mes}/${ano}`;
    if (lista) lista.innerHTML = "<p style='text-align:center;'>Buscando...</p>";

    const { data: ags } = await _supabase.from('agendamentos').select('*').eq('data', dataISO).neq('status', 'cancelado').order('horario');
    if (!ags || ags.length === 0) { lista.innerHTML = "<p style='text-align:center; color:var(--cor-subtexto);'>Nenhum agendamento.</p>"; return; }

    lista.innerHTML = ags.map(ag => `
        <div class="item-agenda-lista">
            <div class="hora-tag">${String(ag.horario).substring(0, 5)}h</div>
            <div class="info-tag"><strong>${ag.cliente_nome}</strong><span>${ag.servico}</span></div>
            <div class="status-tag ${ag.status.toLowerCase()}">${ag.status}</div>
        </div>`).join("");
}

/* ==========================================================================
   6. CLIENTES E FIDELIDADE
   ========================================================================== */
window.renderizarListaClientes = async function () {
    const corpo = document.getElementById("corpo-tabela-clientes");
    if (!corpo) return; corpo.innerHTML = '<tr><td colspan=\"4\" style=\"text-align:center;\">Carregando...</td></tr>';

    const { data: clis } = await _supabase.from('lista_clientes_resumo').select('*').order('cliente_nome');
    if (!clis || clis.length === 0) return corpo.innerHTML = '<tr><td colspan=\"4\" style=\"text-align:center;\">Nenhum cliente.</td></tr>';

    corpo.innerHTML = clis.map(c => {
        const dVisita = c.data_ultima_visita ? new Date(c.data_ultima_visita).toLocaleDateString('pt-BR') : "---";
        return `<tr>
            <td><strong>${c.cliente_nome}</strong></td>
            <td>${c.ultimo_servico || '---'} <br><small style="color:var(--cor-subtexto)">Último: ${dVisita}</small></td>
            <td>${c.telefone || '---'}</td>
            <td><div class="acoes-buttons">
                <button class="btn-whatsapp" onclick="enviarLembrete('${c.telefone}', '${c.cliente_nome}')"><i class="fab fa-whatsapp"></i></button>
                <button class="btn-concluir" style="background:#3498db" onclick="abrirDetalhesCliente('${c.telefone}', '${c.cliente_nome}')"><i class="fas fa-eye"></i></button>
            </div></td></tr>`;
    }).join('');
};

window.filtrarClientes = function () {
    const termo = document.getElementById("busca-cliente").value.toLowerCase();
    document.querySelectorAll("#corpo-tabela-clientes tr").forEach(linha => {
        linha.style.display = linha.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
};

window.abrirDetalhesCliente = async function (tel, nome) {
    const modal = document.getElementById("modal-detalhes-cliente");
    if (!modal) return; modal.style.display = "block";
    document.getElementById("detalhe-nome-cliente").innerText = nome;
    document.getElementById("estrelas-fidelidade").innerHTML = "<p class='loading-text'>Buscando...</p>";

    const { data: hist } = await _supabase.from('agendamentos').select('data, servico').eq('telefone', tel).eq('status', 'concluido').order('data', { ascending: false });
    if (!hist || hist.length === 0) {
        document.getElementById("estrelas-fidelidade").innerHTML = "<p style='font-size:0.8rem; color:#666;'>Sem histórico.</p>";
        document.getElementById("detalhe-data-corte").innerText = "---"; document.getElementById("detalhe-servico").innerText = "---";
        document.getElementById("total-servicos-texto").innerText = "0 serviços concluídos"; return;
    }
    document.getElementById("detalhe-data-corte").innerText = hist[0].data.split("-").reverse().join("/");
    document.getElementById("detalhe-servico").innerText = hist[0].servico;
    document.getElementById("estrelas-fidelidade").innerHTML = hist.map(() => '<i class="fas fa-star" style="margin-right:5px;"></i>').join('');
    document.getElementById("total-servicos-texto").innerText = `${hist.length} serviço(s) concluído(s)`;
};
window.fecharModalDetalhes = () => document.getElementById("modal-detalhes-cliente").style.display = "none";

/* ==========================================================================
   7. RELATÓRIOS E INTELIGÊNCIA (COM GRÁFICO E CÁLCULO "VS")
   ========================================================================== */

window.abrirSubRelatorio = function (tipo) {
    esconderTodasSessoes();
    if (headerPrincipal) headerPrincipal.style.display = "none";
    if (painelConquista) painelConquista.style.display = "none";
    secoes.relatorios.style.display = "block";

    document.querySelectorAll('.relatorio-sub-section').forEach(area => area.style.display = 'none');
    const titulo = document.getElementById("titulo-sub-relatorio");

    if (tipo === 'resultados') {
        document.getElementById("area-resultados").style.display = "block";
        if (titulo) titulo.innerText = "Resultados";
    }
    else if (tipo === 'desempenho') {
        document.getElementById("area-desempenho").style.display = "block";
        if (titulo) titulo.innerText = "Desempenho";
    }

    const filtro = document.getElementById("filtro-periodo-relatorio");
    inicializarRelatorios(filtro ? parseInt(filtro.value) : 30);
};

window.mudarPeriodoRelatorio = function (dias) {
    const labels = { "7": "Últimos 7 dias", "30": "Mês atual", "90": "Últimos 3 meses", "365": "Este Ano" };
    const elTexto = document.getElementById("data-range");
    if (elTexto) elTexto.innerText = labels[dias] || "Período personalizado";
    inicializarRelatorios(parseInt(dias));
};

async function inicializarRelatorios(dias = 30) {
    const dataHoje = new Date();
    const dataFimAtual = dataHoje.toLocaleDateString("en-CA");
    let dataInicioAtual, dataInicioAnterior, dataFimAnterior;

    // 1. Definição dos períodos
    if (dias === 30) {
        dataInicioAtual = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 1);
        dataFimAnterior = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 0).toLocaleDateString("en-CA");
        dataInicioAnterior = new Date(dataHoje.getFullYear(), dataHoje.getMonth() - 1, 1);
    } else {
        dataInicioAtual = new Date(); dataInicioAtual.setDate(dataHoje.getDate() - dias);
        dataFimAnterior = dataInicioAtual.toLocaleDateString("en-CA");
        dataInicioAnterior = new Date(); dataInicioAnterior.setDate(dataInicioAtual.getDate() - dias);
    }

    const isoIniAtual = dataInicioAtual.toLocaleDateString("en-CA");
    const isoIniAnt = dataInicioAnterior instanceof Date ? dataInicioAnterior.toLocaleDateString("en-CA") : dataInicioAnterior;

    // 2. Busca no Supabase
    const { data: agAtual } = await _supabase.from("agendamentos").select("*").in("status", ["concluido", "cancelado"]).gte("data", isoIniAtual).lte("data", dataFimAtual);
    const { data: agAntigo } = await _supabase.from("agendamentos").select("*").in("status", ["concluido", "cancelado"]).gte("data", isoIniAnt).lte("data", dataFimAnterior);

    const concAtual = agAtual?.filter(a => a.status === "concluido") || [];
    const concAntigo = agAntigo?.filter(a => a.status === "concluido") || [];

    // 3. Cálculos Atuais
    const fatAtual = concAtual.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0);
    const atendAtual = concAtual.length;
    const ticketAtual = atendAtual > 0 ? fatAtual / atendAtual : 0;
    const taxaCompAtual = agAtual?.length > 0 ? (atendAtual / agAtual.length) * 100 : 0;

    // 4. Cálculos Anteriores
    const fatAntigo = concAntigo.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0);
    const atendAntigo = concAntigo.length;
    const ticketAntigo = atendAntigo > 0 ? fatAntigo / atendAntigo : 0;
    const taxaCompAntigo = agAntigo?.length > 0 ? (atendAntigo / agAntigo.length) * 100 : 0;

    // 5. Atualização da UI
    document.getElementById("rel-faturamento").innerText = `R$ ${fatAtual.toFixed(2).replace(".", ",")}`;
    atualizarTrendUI("trend-faturamento", fatAtual, fatAntigo);

    document.getElementById("rel-atendimentos").innerText = atendAtual;
    atualizarTrendUI("trend-atendimentos", atendAtual, atendAntigo);

    document.getElementById("rel-ticket").innerText = `R$ ${ticketAtual.toFixed(2).replace(".", ",")}`;
    atualizarTrendUI("trend-ticket", ticketAtual, ticketAntigo);

    document.getElementById("rel-comparecimento").innerText = `${taxaCompAtual.toFixed(0)}%`;
    document.getElementById("fill-comparecimento").style.width = `${taxaCompAtual}%`;
    atualizarTrendUI("trend-comparecimento", taxaCompAtual, taxaCompAntigo);

    // 6. Chamada das funções visuais (Gráfico e Insights)
    renderizarGraficoEvolucao(concAtual);
    processarInsightsHorarios(concAtual);
    processarInsightsClientes(concAtual);
}

// 7. FUNÇÃO DO GRÁFICO (RESTAURADA)
function renderizarGraficoEvolucao(dados) {
    const canvas = document.getElementById('graficoEvolucao');
    if (!canvas || !dados) return;
    const ctx = canvas.getContext('2d');
    if (chartFaturamento) chartFaturamento.destroy();

    const ord = [...dados].sort((a, b) => a.data.localeCompare(b.data));
    const labels = [...new Set(ord.map(d => d.data.substring(8, 10) + "/" + d.data.substring(5, 7)))];
    const fatDia = labels.map(l => ord.filter(d => d.data.includes(l.split("/").reverse().join("-"))).reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0));

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.4)'); gradient.addColorStop(1, 'rgba(46, 204, 113, 0)');

    chartFaturamento = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ data: fatDia, borderColor: '#2ecc71', backgroundColor: gradient, fill: true, tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}
/* ==========================================================================
   FUNÇÃO: ANÁLISE DE HORÁRIOS DE PICO (INTEGRADA AO EXPEDIENTE)
   ========================================================================== */
async function processarInsightsHorarios(agendamentos) {
    const listaEl = document.getElementById("lista-horarios-pico");
    const dicaEl = document.getElementById("insight-horario-texto");
    if (!listaEl || !dicaEl) return;

    // 1. BUSCA O EXPEDIENTE E PAUSA (Ex: 08h-12h e 13h-18h)
    const { data: config } = await _supabase.from('configuracoes').select('*').eq('id', 1).single();

    const hInicio = config ? config.hora_inicio : "08:00";
    const hAlmocoIni = config ? config.almoco_inicio : "12:00";
    const hAlmocoFim = config ? config.almoco_fim : "13:00";
    const hFim = config ? config.hora_fim : "18:00";

    // 2. ACUMULADORES POR TURNO
    let fatManha = 0;
    let fatTarde = 0;

    agendamentos.forEach(ag => {
        if (!ag.horario) return;
        const hora = ag.horario.substring(0, 5);
        const valor = parseFloat(ag.valor) || 0;

        // Lógica de ADS: Classifica o atendimento no turno correto [cite: 2026-04-24]
        if (hora >= hInicio && hora < hAlmocoIni) {
            fatManha += valor;
        } else if (hora >= hAlmocoFim && hora <= hFim) {
            fatTarde += valor;
        }
    });

    const totalTurnos = fatManha + fatTarde;
    const turnos = [
        { nome: `Manhã (${hInicio} - ${hAlmocoIni})`, valor: fatManha },
        { nome: `Tarde (${hAlmocoFim} - ${hFim})`, valor: fatTarde }
    ].sort((a, b) => b.valor - a.valor); // Ordena pelo maior faturamento

    if (totalTurnos === 0) {
        listaEl.innerHTML = "<p class='loading-text'>Sem faturamento registrado no período.</p>";
        dicaEl.innerText = "Dica: Conclua atendimentos para gerar a análise de turnos.";
        return;
    }

    // 3. RENDERIZAÇÃO (Padrão Black & Gold) [cite: 2026-04-24]
    listaEl.innerHTML = turnos.map((t, index) => {
        const porc = (t.valor / totalTurnos) * 100;
        const cor = index === 0 ? "var(--cor-primaria)" : "#aaa";
        return `
            <div class="insight-row">
                <div class="insight-info">
                    <span class="posicao" style="color: ${cor}; font-weight: bold;">${index + 1}º ${t.nome}</span>
                    <span class="porcentagem"><strong>${porc.toFixed(0)}%</strong></span>
                </div>
                <div class="barra-progresso-fina">
                    <div class="fill" style="width: ${porc}%; background: ${cor};"></div>
                </div>
            </div>`;
    }).join("");

    // 4. SISTEMA DE 20 DICAS (10 POR TURNO) [cite: 2026-04-24]
    const turnoVencedor = turnos[0].nome;
    const dManha = [
        "Manhãs fortes! Ofereça um café premium para fidelizar esses clientes matinais.",
        "Público matinal detectado. Que tal um cartão fidelidade para serviços antes das 12h?",
        "O início do dia é seu ponto forte. Use as redes sociais para mostrar os resultados desse turno.",
        "Clientes da manhã costumam ser pontuais. Valorize isso com um brinde ou mimo.",
        "Grande movimento matinal. Garanta que o estoque de finalizadores esteja em dia logo cedo.",
        "A luz da manhã é ótima para fotos. Registre seus trabalhos e poste nos Stories.",
        "Turno matinal batendo recordes! Mantenha a bancada organizada para o fluxo constante.",
        "Manhãs cheias! Considere reforçar a equipe ou abrir 15 min antes para absorver a demanda.",
        "Café e barba! Ofereça um expresso para quem começa o dia na sua cadeira.",
        "Ocupação alta antes do almoço. Tente antecipar o pedido de suprimentos para evitar faltas."
    ];

    const dTarde = [
        "Tardes lucrativas! Noites agitadas sugerem clientes que buscam relaxar após o trabalho.",
        "Pico de fim de dia detectado. Ofereça uma bebida gelada para tornar a espera agradável.",
        "O movimento intenso após as 16h é ótimo para vender produtos de manutenção capilar.",
        "Happy hour na barbearia! Uma playlist mais animada combina com esse pico vespertino.",
        "Clientes noturnos valorizam a experiência. Ambiente impecável até o último corte.",
        "Se o pico é à tarde/noite, certifique-se de que a iluminação da fachada está chamando atenção.",
        "Fim de expediente agitado! Reforce a organização entre os cortes para evitar atrasos.",
        "Aproveite a saída do trabalho para oferecer combos de 'Barba + Cabelo' no turno da noite.",
        "Tardes são ideais para serviços premium (como pigmentação) para subir o ticket médio.",
        "Foco no atendimento! Casa cheia no fim do dia exige agilidade sem perder a qualidade."
    ];

    const randomIdx = Math.floor(Math.random() * 10);
    dicaEl.innerText = turnoVencedor.includes("Manhã") ? dManha[randomIdx] : dTarde[randomIdx];
}

/* ==========================================================================
   FUNÇÃO: ANÁLISE DE FIDELIZAÇÃO (NOVOS VS RECORRENTES)
   ========================================================================== */
async function processarInsightsClientes(agendamentosAtuais) {
    if (!agendamentosAtuais || agendamentosAtuais.length === 0) return;

    const { data: historico } = await _supabase.from("agendamentos").select("telefone").eq("status", "concluido");
    const telefonesAtuais = new Set(agendamentosAtuais.map(a => a.telefone));

    let recorrentes = 0;
    let novos = 0;

    telefonesAtuais.forEach(tel => {
        if (!tel) return;
        const vezes = historico.filter(h => h.telefone === tel).length;
        vezes > 1 ? recorrentes++ : novos++;
    });

    const totalClientes = novos + recorrentes;
    const taxaRetencao = totalClientes > 0 ? (recorrentes / totalClientes) * 100 : 0;

    document.getElementById("rel-novos-clientes").innerText = novos;
    document.getElementById("rel-recorrentes").innerText = recorrentes;
    document.getElementById("rel-taxa-retencao").innerText = `${taxaRetencao.toFixed(0)}%`;

    const fillRetencao = document.getElementById("fill-retencao");
    if (fillRetencao) fillRetencao.style.width = `${taxaRetencao}%`;
}

function atualizarTrendUI(id, atual, antigo) {
    const el = document.getElementById(id);
    if (!el) return;
    let p = antigo > 0 ? ((atual - antigo) / antigo) * 100 : (atual > 0 ? 100 : 0);
    const up = p >= 0;
    el.style.color = up ? "#2ecc71" : "#ff4757";
    el.innerHTML = `<i class="fas fa-arrow-${up ? 'up' : 'down'}"></i> ${Math.abs(p).toFixed(0)}% <span>vs anterior</span>`;
}

/* ==========================================================================
   8. CONFIGURAÇÕES DO NEGÓCIO (EXPEDIENTE, META, SERVIÇOS)
   ========================================================================== */
window.abrirSubConfig = async function (tipo) {
    esconderTodasSessoes();
    if (headerPrincipal) headerPrincipal.style.display = "none"; if (painelConquista) painelConquista.style.display = "none";
    const pai = document.getElementById("configuracoes-section"); if (pai) pai.style.display = "block";
    const areas = { 'expediente': 'area-expediente', 'meta': 'area-meta', 'servicos': 'area-servicos' };
    const alvo = document.getElementById(areas[tipo]); if (alvo) alvo.style.display = "block";

    if (tipo === 'expediente') {
        const { data: cfg } = await _supabase.from('configuracoes').select('*').eq('id', 1).maybeSingle();
        if (cfg) {
            ["hora_inicio", "hora_fim", "intervalo", "almoco_inicio", "almoco_fim"].forEach(k => {
                const el = document.getElementById(`cfg-${k.replace('_', '-')}`); if (el) el.value = cfg[k] || "";
            });
            if (cfg.dias_trabalhados && Array.isArray(cfg.dias_trabalhados)) {
                const ds = cfg.dias_trabalhados.map(String);
                document.querySelectorAll(".cfg-dia").forEach(cb => cb.checked = ds.includes(String(cb.value)));
            }
        }
    }
    if (tipo === 'servicos') await window.renderizarConfigServicos();
};

window.salvarConfiguracoes = async function () {
    const btn = document.querySelector("button[onclick='salvarConfiguracoes()']");
    if (btn) { btn.innerText = "Salvando..."; btn.disabled = true; }
    const { error } = await _supabase.from('configuracoes').upsert({
        id: 1, hora_inicio: document.getElementById("cfg-hora-inicio").value, hora_fim: document.getElementById("cfg-hora-fim").value,
        intervalo: parseInt(document.getElementById("cfg-intervalo").value), almoco_inicio: document.getElementById("cfg-almoco-inicio").value,
        almoco_fim: document.getElementById("cfg-almoco-fim").value, dias_trabalhados: Array.from(document.querySelectorAll(".cfg-dia:checked")).map(cb => parseInt(cb.value)),
    });
    if (error) alert("Erro: " + error.message); else alert("Expediente atualizado!");
    if (btn) { btn.innerHTML = '<i class="fas fa-save"></i> Salvar Expediente'; btn.disabled = false; }
};

window.salvarMetaDiaria = async function () {
    const m = parseFloat(document.getElementById("cfg-meta-valor").value);
    if (isNaN(m) || m <= 0) return alert("Valor inválido!");
    await _supabase.from('configuracoes').upsert({ id: 1, meta_diaria: m });
    localStorage.setItem("metaDiaria", m); atualizarProgressoMeta(); alert("Meta atualizada!");
};

window.renderizarConfigServicos = async function () {
    const c = document.getElementById("lista-servicos-config"); if (!c) return;
    c.innerHTML = "<p style='color:var(--cor-subtexto);'>Buscando serviços...</p>";
    const { data: srvs, error } = await _supabase.from("servicos").select("*").order("nome");
    if (error) return c.innerHTML = "<p style='color:#ff4d4d;'>Erro.</p>";
    if (!srvs || srvs.length === 0) return c.innerHTML = "<p style='color:var(--cor-subtexto);'>Nenhum serviço.</p>";

    c.innerHTML = "<h4 style='color:#fff; margin-bottom:10px;'>Serviços Ativos:</h4>" + srvs.map(s => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:8px;">
            <span>${s.nome} - <strong>R$ ${parseFloat(s.preco).toFixed(2).replace('.', ',')}</strong></span>
            <button onclick="excluirServico('${s.id}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>`).join("");
};

window.adicionarNovoServico = async function () {
    const nome = document.getElementById("cfg-servico-nome").value, preco = document.getElementById("cfg-servico-preco").value;
    if (!nome || !preco) return alert("Preencha nome e preço!");
    const btn = document.getElementById("btn-add-servico-banco"); const txt = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...'; btn.disabled = true;

    const { error } = await _supabase.from("servicos").insert([{ nome: nome, preco: parseFloat(preco) }]);
    if (error) alert("Erro: " + error.message); else {
        document.getElementById("cfg-servico-nome").value = ""; document.getElementById("cfg-servico-preco").value = "";
        await window.renderizarConfigServicos(); alert("Serviço adicionado!");
    }
    btn.innerHTML = txt; btn.disabled = false;
};
window.excluirServico = async function (id) {
    if (!confirm("Excluir serviço?")) return;
    await _supabase.from("servicos").delete().eq("id", id); await window.renderizarConfigServicos();
};



/* ==========================================================================
   9. CMS E GESTÃO DO SITE (EDITAR HOME, MARKETING)
   ========================================================================== */
window.abrirSubConfigGeral = async function (tipo) {
    esconderTodasSessoes();
    const pai = document.getElementById("configuracoes-section"); if (pai) pai.style.display = "block";
    if (headerPrincipal) headerPrincipal.style.display = "none"; if (painelConquista) painelConquista.style.display = "none";

    const areas = { 'submenu1': 'area-config-home', 'submenu2': 'area-galeria-midia', 'marketing': 'area-marketing', 'perfil': 'area-perfil-barbeiro' };
    document.getElementById(areas[tipo]).style.display = "block";

    if (tipo === 'submenu1') {
        const { data: c } = await _supabase.from('configuracoes1').select('*').eq('id', 1).maybeSingle();
        if (c) ["hero_titulo", "sobre_texto", "end_rua", "end_numero", "end_cidade", "end_estado", "end_cep", "end_tel", "mapa_iframe"].forEach(k => {
            const el = document.getElementById(`cfg-${k.replace('_', '-')}`); if (el) el.value = c[k] || "";
        });
    } else if (tipo === 'submenu2') {
        const { data: m } = await _supabase.from('vitrine_midias').select('*').eq('id', 1).maybeSingle();
        window.alternarLayoutMidia(m?.tipo_exibicao || 'galeria', m);
    } else if (tipo === 'perfil') {
        const { data: p } = await _supabase.from('dados_barbearia').select('*').eq('id', 1).maybeSingle();
        if (p) {
            ["nome_proprietario", "nome_empresa", "documento", "whatsapp", "instagram", "facebook", "link_site"].forEach(k => {
                const el = document.getElementById(k === 'whatsapp' ? 'prof-whats' : "prof-" + k.replace('nome_proprietario', 'nome-dono').replace('_', '-'));
                if (el) el.value = p[k] || "";
            });
            const prev = document.getElementById("preview-logo");
            if (p.url_logo && prev) prev.innerHTML = `<img src="${p.url_logo}" style="height:50px; border-radius:4px;"/>`;
        }
    }
};

window.alternarLayoutMidia = function (tipo, dados = null) {
    const c = document.getElementById("container-inputs-dinamicos"); if (!c) return;
    let bG = document.getElementById("bloco-galeria"), bP = document.getElementById("bloco-produtos");

    if (!bG || !bP) {
        let html = `<div id="bloco-galeria" style="display:none;"><p style="font-size:0.85rem; color:var(--cor-subtexto); margin-bottom:10px;">Portfólio: Envie 4 fotos dos cortes.</p><div class="config-grid-form" style="margin-bottom:20px;">` + [1, 2, 3, 4].map(i => {
            const url = dados?.dados_galeria ? dados.dados_galeria[i - 1] : null; const nome = url ? url.split('/').pop() : 'Vazio';
            return `<div class="input-group-modal"><label>Foto ${i}</label><div style="display:flex; align-items:center; gap:10px;"><img src="${url || ''}" style="width:50px;height:50px;display:${url ? 'block' : 'none'}" id="preview-galeria-${i}"><div style="flex:1;overflow:hidden;"><input type="file" id="up-galeria-${i}" onchange="uploadMidia('galeria-${i}')" accept="image/*"><small style="color:var(--cor-primaria);" id="nome-galeria-${i}">${nome}</small></div></div></div>`;
        }).join('') + `</div></div>`;

        html += `<div id="bloco-produtos" style="display:none;"><p style="font-size:0.85rem; color:var(--cor-subtexto); margin-bottom:10px;">Catálogo: Adicione 4 produtos.</p><div class="config-grid-form" style="gap:15px;">` + [1, 2, 3, 4].map(i => {
            const p = dados?.dados_produtos ? dados.dados_produtos[i - 1] : null; const url = p?.url; const nome = url ? url.split('/').pop() : 'Vazio';
            return `<div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333;"><label style="color:var(--cor-primaria);">Produto ${i}</label><div style="display:flex; align-items:center; gap:10px; margin:10px 0;"><img src="${url || ''}" style="width:50px;height:50px;display:${url ? 'block' : 'none'}" id="preview-prod-${i}"><div style="flex:1;overflow:hidden;"><input type="file" id="up-prod-${i}" onchange="uploadMidia('prod-${i}')" accept="image/*"><small style="color:var(--cor-primaria);" id="nome-prod-${i}">${nome}</small></div></div><input type="text" id="p-nome-${i}" value="${p?.nome || ''}" placeholder="Nome" style="margin-bottom:8px; width:100%;"/><input type="number" id="p-preco-${i}" value="${p?.preco || ''}" placeholder="Preço R$" style="width:100%;"/></div>`;
        }).join('') + `</div></div>`;

        c.innerHTML = html; bG = document.getElementById("bloco-galeria"); bP = document.getElementById("bloco-produtos");
        const r = document.querySelector(`input[name="opt-exibicao"][value="${tipo}"]`); if (r) r.checked = true;
    }
    if (bG) bG.style.display = (tipo === 'galeria' || tipo === 'ambos') ? 'block' : 'none';
    if (bP) bP.style.display = (tipo === 'produtos' || tipo === 'ambos') ? 'block' : 'none';
};

window.salvarConteudoHome = async function () {
    const btn = document.querySelector("button[onclick='salvarConteudoHome()']");
    if (btn) { btn.innerText = "Publicando..."; btn.disabled = true; }
    const { error } = await _supabase.from('configuracoes1').upsert({
        id: 1, hero_titulo: document.getElementById("cfg-hero-titulo").value, sobre_texto: document.getElementById("cfg-sobre-texto").value,
        end_rua: document.getElementById("cfg-end-rua").value, end_numero: document.getElementById("cfg-end-numero").value, end_cidade: document.getElementById("cfg-end-cidade").value,
        end_estado: document.getElementById("cfg-end-estado").value, end_cep: document.getElementById("cfg-end-cep").value, end_tel: document.getElementById("cfg-end-tel").value, mapa_iframe: document.getElementById("cfg-mapa-iframe").value
    });
    if (error) alert("Erro: " + error.message); else alert("Site atualizado! 🚀");
    if (btn) { btn.innerHTML = '<i class="fas fa-save"></i> Atualizar Site'; btn.disabled = false; }
};

window.salvarVitrineMidias = async function () {
    const btn = document.querySelector("button[onclick='salvarVitrineMidias()']");
    if (btn) btn.innerText = "Sincronizando...";
    const { data: cfg } = await _supabase.from('vitrine_midias').select('*').eq('id', 1).maybeSingle();
    const t = document.querySelector('input[name="opt-exibicao"]:checked').value;
    const update = { id: 1, tipo_exibicao: t, ultima_atualizacao_midia: new Date().toISOString() };

    update.dados_galeria = (t === 'galeria' || t === 'ambos') ? [1, 2, 3, 4].map(i => window[`url_link_galeria-${i}`] || (cfg?.dados_galeria ? cfg.dados_galeria[i - 1] : null)).filter(x => x) : cfg?.dados_galeria || [];
    update.dados_produtos = (t === 'produtos' || t === 'ambos') ? [1, 2, 3, 4].map(i => {
        const nm = document.getElementById(`p-nome-${i}`);
        return (nm && (nm.value || window[`url_link_prod-${i}`])) ? { nome: nm.value, preco: document.getElementById(`p-preco-${i}`)?.value || 0, url: window[`url_link_prod-${i}`] || (cfg?.dados_produtos ? cfg.dados_produtos[i - 1]?.url : null) } : null;
    }).filter(x => x) : cfg?.dados_produtos || [];

    const { error } = await _supabase.from('vitrine_midias').upsert(update);
    if (error) alert("Erro: " + error.message); else alert("Vitrine salva! 📸");
    if (btn) btn.innerHTML = "Sincronizar Vitrine";
};

window.salvarPerfilBarbearia = async function () {
    const btn = document.querySelector("button[onclick='salvarPerfilBarbearia()']"); if (btn) btn.innerText = "Salvando...";
    const { data: p } = await _supabase.from('dados_barbearia').select('*').eq('id', 1).maybeSingle();
    const { error } = await _supabase.from('dados_barbearia').upsert({
        id: 1, nome_proprietario: document.getElementById("prof-nome-dono").value, nome_empresa: document.getElementById("prof-empresa").value,
        documento: document.getElementById("prof-documento").value, whatsapp: document.getElementById("prof-whats").value, instagram: document.getElementById("prof-insta").value,
        facebook: document.getElementById("prof-facebook").value, link_site: document.getElementById("prof-link-site").value, url_logo: window["url_link_logo-barbearia"] || p?.url_logo
    });
    if (error) alert("Erro: " + error.message); else alert("Perfil atualizado!");
    if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Salvar Dados do Perfil';
};

window.uploadMidia = async function (tipo) {
    const f = document.getElementById(`up-${tipo}`)?.files[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) return alert("Máx 2MB.");
    const nm = `${Date.now()}-${tipo}.webp`;
    const { error } = await _supabase.storage.from('midia-home').upload(nm, f);
    if (error) return alert("Erro no upload: " + error.message);
    const { data: pb } = _supabase.storage.from('midia-home').getPublicUrl(nm);
    window[`url_link_${tipo}`] = pb.publicUrl;
    const prv = document.getElementById(`preview-${tipo}`);
    if (prv) { prv.src = pb.publicUrl; prv.style.display = "block"; }
    alert("Upload OK!");
};

window.copiarVagasInteligente = async function (periodo) {
    const dAlvo = periodo === 'hoje' ? new Date().toLocaleDateString("en-CA") : new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
    const { data: oc } = await _supabase.from("agendamentos").select("horario").eq("data", dAlvo).neq("status", "cancelado");
    const { data: cfg } = await _supabase.from('configuracoes').select('*').eq('id', 1).single();
    let vagas = [], h = cfg.hora_inicio;
    while (h < cfg.hora_fim) {
        if (!(h >= cfg.almoco_inicio && h < cfg.almoco_fim) && !oc?.some(a => a.horario.substring(0, 5) === h)) vagas.push(`✅ ${h}`);
        h = somarMinutos(h, cfg.intervalo);
    }
    const { data: p } = await _supabase.from('dados_barbearia').select('link_site').eq('id', 1).maybeSingle();
    let txt = `✂️ *VAGAS DE ${periodo.toUpperCase()}*\n\n` + (vagas.length === 0 ? "🚫 Agenda lotada!" : vagas.slice(0, 4).join("\n") + (vagas.length > 4 ? "\n➕ E mais..." : "")) + `\n\n📍 Reserve:\n${p?.link_site || window.location.origin}`;
    navigator.clipboard.writeText(txt).then(() => alert(`Vagas copiadas!`));
};

window.gerarTextoMarketing = async function (gatilho) {
    const { data: p } = await _supabase.from('dados_barbearia').select('*').eq('id', 1).maybeSingle();
    const nm = p?.nome_proprietario ? p.nome_proprietario.split(' ')[0] : 'Barbeiro', lk = p?.link_site || window.location.origin;
    const { data: tp } = await _supabase.from('templates_marketing').select('texto_base').eq('gatilho', gatilho);
    let txt = (!tp || tp.length === 0) ? `🚨 O ${nm} tem as últimas vagas. Garanta: ${lk}` : tp[Math.floor(Math.random() * tp.length)].texto_base.replace(/\[NOME\]/g, nm).replace(/\[LINK\]/g, lk);
    navigator.clipboard.writeText(txt).then(() => alert(`Gatilho copiado! 🚀`));
};

/* ==========================================================================
   10. UTILITÁRIOS E ARRANQUE DO SISTEMA
   ========================================================================== */
function somarMinutos(hora, min) {
    let [h, m] = hora.split(":").map(Number); m += parseInt(min);
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

window.enviarLembrete = (tel, nome, dISO, hora) => {
    if (!tel) return alert("Sem telefone!");
    const num = tel.replace(/\D/g, ""); const ddi = num.startsWith("55") ? "" : "55";
    const txt = (dISO && hora) ? `Olá, ${nome}!\nAgendamento confirmado.\nData: ${dISO.split("-").reverse().join("/")}\nHorário: ${hora.substring(0, 5)}h\nObrigado!` : '';
    window.open(`https://wa.me/${ddi}${num}${txt ? '?text=' + encodeURIComponent(txt) : ''}`, "_blank");
};

// MOTOR DE ARRANQUE 
window.addEventListener("load", async () => {
    console.log("🚀 Sistema ClientFlow Inicializado.");

    // Modal de Atendimento Rápido (Setup)
    const m = document.getElementById("modal-agendamento");
    document.getElementById("btn-novo-agendamento").onclick = () => { m.style.display = "block"; };
    document.getElementById("fechar-modal").onclick = () => { m.style.display = "none"; };
    window.onclick = (e) => { if (e.target == m) m.style.display = "none"; };

    // Máscara Telefone Modal
    const tel = document.getElementById('rapido-telefone');
    if (tel) tel.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, ""); if (v.length > 11) v = v.substring(0, 11);
        if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`; if (v.length > 9) v = `${v.substring(0, 10)}-${v.substring(10)}`;
        e.target.value = v;
    });

    // Carrega Serviços no Modal
    const { data: srvs } = await _supabase.from("servicos").select("nome, preco").order("nome");
    const sel = document.getElementById("rapido-servico");
    if (sel && srvs) { sel.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>' + srvs.map(s => `<option value="${s.nome}">${s.nome} - R$ ${s.preco}</option>`).join(''); }

    // Carrega Meta Diária Inicial
    const { data: cfg } = await _supabase.from('configuracoes').select('meta_diaria').eq('id', 1).single();
    if (cfg && document.getElementById("cfg-meta-valor")) {
        document.getElementById("cfg-meta-valor").value = cfg.meta_diaria; localStorage.setItem("metaDiaria", cfg.meta_diaria);
    }

    // Inicia Painel
    await carregarAgendamentosDoDia();
    await recalcularFaturamentoDoDia();
});