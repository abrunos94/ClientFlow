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
const SUPABASE_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3Nmb3hrc3pseGRtY3JhYmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTU0OTYsImV4cCI6MjA5NDE5MTQ5Nn0.OfGnMWsiiQDQ95XCOEcwPKPgF-YOLIai1ICZuWu2YqY";

// O cliente agora montará a URL corretamente
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Cache de Elementos Principais
const secoes = {
    dashboard: document.getElementById("conteudo-dashboard"),
    agenda: document.getElementById("secao-agenda-completa"),
    clientes: document.getElementById("secao-clientes"),
    relatorios: document.getElementById("secao-relatorios"),
    configuracoes: document.getElementById("configuracoes-section"), // Adicione esta linha
};
const headerPrincipal = document.getElementById("header-principal");
const painelConquista = document.getElementById("painel-conquista");
const listaAgendamentos = document.getElementById("lista-agendamentos");
const conteudoDashboard = document.getElementById("conteudo-dashboard");
// Estado Global
let chartFaturamento = null;
let dataCalendario = new Date();

// Autenticação Real e Segura
// Autenticação Inteligente (Resiliente a quedas de internet e PWA em Background)
async function validarSessaoSegura() {
    // 1. Se o aparelho do barbeiro estiver sem internet (ou reconectando do modo suspensão), aborta a verificação no servidor e confia no cache.
    if (!navigator.onLine) {
        console.warn("App offline ou em segundo plano: Mantendo sessão atual.");
        return;
    }

    try {
        // 2. Busca a sessão no armazenamento local primeiro (Rápido e não depende de rede)
        const { data: { session } } = await _supabase.auth.getSession();

        if (!session) throw new Error("Sessão inexistente no cache.");

        // 3. Validação real de integridade no banco
        const { data: { user }, error } = await _supabase.auth.getUser();

        // 4. Se o erro for puramente de conexão caindo no meio do caminho, não expulsa o usuário.
        if (error && error.message.toLowerCase().includes('fetch')) {
            console.warn("Oscilação de rede detectada ao validar usuário. Mantendo acesso.");
            return;
        }

        if (error || !user) throw error || new Error("Token expirado ou inválido.");

    } catch (erro) {
        console.error("Acesso Negado: Redirecionando para login.", erro);
        localStorage.removeItem("logado");
        window.location.href = "login.html"; // ou index.html dependendo da sua rota de entrada
    }
}
validarSessaoSegura();

/* ==========================================================================
   1.1 Inicialização dados barbearia
   ========================================================================== */

// FUNÇÃO PARA GARANTIR DADOS SEMPRE DISPONÍVEIS
async function inicializarDadosBarbearia() {
    const { data: p } = await _supabase
        .from("dados_barbearia")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

    if (p) {
        // Guarda no objeto window para acesso rápido em qualquer lugar
        window.dadosBarbeariaGlobal = p;

        // Preenche os campos da aba Perfil (mesmo que estejam escondidos)
        const mapa = {
            "prof-nome-dono": p.nome_proprietario,
            "prof-pix": p.chave_pix,
            "prof-whats": p.whatsapp,
            "prof-empresa": p.nome_empresa,
            "prof-insta": p.instagram,
            "prof-facebook": p.facebook,
            "prof-link-site": p.link_site,
            "prof-documento": p.documento,
        };

        Object.keys(mapa).forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = mapa[id] || "";
        });

        // Atualiza a saudação do topo "Olá, Alex!"
        if (p.nome_proprietario) {
            const nome = p.nome_proprietario.trim().split(" ")[0];
            const h1 = document.querySelector("#header-principal h1");
            if (h1) h1.innerText = `Olá, ${nome}!`;
        }
    }
}

/* ==========================================================================
   2. NAVEGAÇÃO E INTERFACE (ROUTER)
   ========================================================================== */
function esconderTodasSessoes() {
    // 1. Captura dinâmica para evitar erro de referência
    const header = document.getElementById("header-principal");
    const meta = document.getElementById("painel-conquista");
    const home = document.getElementById("conteudo-dashboard");
    const config = document.getElementById("configuracoes-section");

    // 2. REMOÇÃO FÍSICA DO FLUXO (O que resolve o vácuo no topo)
    if (header) header.style.display = "none";
    if (meta) meta.style.display = "none";
    if (home) home.style.display = "none";
    if (config) config.style.display = "none";

    // 3. Esconde as outras seções do objeto global secoes
    if (typeof secoes !== 'undefined') {
        Object.values(secoes).forEach(s => { if (s) s.style.display = "none"; });
    }

    // 4. Limpa sub-seções e menus ativos
    document.querySelectorAll(".config-sub-section, .relatorio-sub-section").forEach(sub => {
        sub.style.display = "none";
    });
    document.querySelectorAll(".menu a").forEach(a => a.classList.remove("active"));

    // 5. RESET DE SCROLL TOTAL
    window.scrollTo(0, 0);
    const main = document.querySelector('.main-content');
    if (main) main.scrollTop = 0;
}

// Inicializador de Dropdowns (DRY)
function configurarDropdown(btnId, gavetaId) {
    const btn = document.getElementById(btnId);
    const gaveta = document.getElementById(gavetaId);
    if (btn && gaveta) {
        btn.onclick = (e) => {
            e.preventDefault();
            gaveta.classList.toggle("active");
            btn.classList.toggle("open");
        };
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
    btnAbrirMenu.onclick = () => {
        sidebar.classList.add("active");
        overlay.classList.add("active");
    };
    overlay.onclick = () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    };
    document.querySelectorAll(".menu a, .submenu a").forEach((link) => {
        link.addEventListener("click", () => {
            if (!link.id.includes("-master") && window.innerWidth <= 1024) {
                sidebar.classList.remove("active");
                overlay.classList.remove("active");
            }
        });
    });
}

/* ==========================================================================
   2.1 NAVEGAÇÃO E INTERFACE (ROUTER COM PERSISTÊNCIA - Versão 1.01)
   ========================================================================== */

// Função central de navegação para evitar repetição
window.executarNavegacao = function (abaNome, linkElemento = null) {
    esconderTodasSessoes();

    // 1. Gerencia estados visuais do menu
    document.querySelectorAll(".menu > a").forEach(a => a.classList.remove("active"));
    if (linkElemento) {
        linkElemento.classList.add("active");
    } else {
        // Tenta achar o link pelo texto caso venha do recarregamento
        const linkRecuperado = Array.from(document.querySelectorAll(".menu > a"))
            .find(a => a.innerText.trim().includes(abaNome));
        if (linkRecuperado) linkRecuperado.classList.add("active");
    }

    // 2. Controla a exibição do Header e Painel de Metas
    const mostrarTopo = abaNome.includes("Dashboard") || abaNome.includes("Agenda");
    if (headerPrincipal) headerPrincipal.style.display = mostrarTopo ? "flex" : "none";
    if (painelConquista) painelConquista.style.display = mostrarTopo ? "block" : "none";

    // 3. Carrega o conteúdo específico
    if (abaNome.includes("Dashboard")) {
        secoes.dashboard.style.display = "block";
        carregarAgendamentosDoDia();
    } else if (abaNome.includes("Agenda")) {
        secoes.agenda.style.display = "block";
        if (typeof inicializarAgenda === "function") inicializarAgenda();
    } else if (abaNome.includes("Clientes")) {
        secoes.clientes.style.display = "block";
        if (typeof renderizarListaClientes === "function") renderizarListaClientes();
    }

    // 4. Salva o estado para o F5 (Persistência 1.01)
    localStorage.setItem("ultimaAbaClientFlow", abaNome);
};

// Listener de cliques atualizado
document.querySelectorAll(".menu > a").forEach((link) => {
    link.addEventListener("click", (e) => {
        if (link.id.includes("-master") || link.id === "btn-logout") return;
        e.preventDefault();

        const texto = link.innerText.trim();
        executarNavegacao(texto, link);
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
    const { data: agendamentos, error } = await _supabase
        .from("agendamentos")
        .select("*")
        .eq("data", hoje)
        .neq("status", "cancelado")
        .order("horario", { ascending: true });

    listaAgendamentos.innerHTML = "";
    if (error || !agendamentos || agendamentos.length === 0) {
        listaAgendamentos.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum agendamento para hoje.</td></tr>';
        atualizarCardsEstatisticas([]);
    } else {
        agendamentos.forEach((ag) => {
            const estaConcluido = ag.status === 'concluido';
            const classeStatus = estaConcluido ? 'status-concluido' : '';
            const iconeBotao = estaConcluido ? 'fa-check' : 'fa-exclamation';

            // LÓGICA Versão 1.01: Pega apenas o primeiro nome do cliente
            const primeiroNome = ag.cliente_nome ? ag.cliente_nome.trim().split(" ")[0] : "Cliente";

            listaAgendamentos.innerHTML += `
                <tr>
                    <td>${String(ag.horario).substring(0, 5)}h</td>
                    <td><strong>${primeiroNome}</strong></td>
                    <td class="coluna-servico-v1">${ag.servico}</td> 
                    <td>
                        <div class="acoes-buttons">
                            <button class="btn-whatsapp" onclick="enviarLembrete('${ag.telefone}', '${ag.cliente_nome}', '${ag.data}', '${ag.horario}')">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                            <button class="btn-concluir ${classeStatus}" onclick="mudarStatusAgendamento('${ag.id}', 'concluido', this)">
                                <i class="fas ${iconeBotao}"></i>
                            </button>
                            <button class="btn-cancelar" onclick="mudarStatusAgendamento('${ag.id}', 'cancelado')">
                                <i class="fas fa-times"></i>
                            </button>
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
    const horaStr =
        agora.getHours().toString().padStart(2, "0") +
        ":" +
        agora.getMinutes().toString().padStart(2, "0");
    const proximos = agendamentos.filter(
        (ag) =>
            ag.horario.substring(0, 5) >= horaStr &&
            ag.status.toLowerCase() === "pendente",
    );

    if (elProximo)
        elProximo.innerText =
            proximos.length > 0
                ? proximos
                    .sort((a, b) => a.horario.localeCompare(b.horario))[0]
                    .horario.substring(0, 5) + "h"
                : "Encerrado";

    const contagem = {};
    agendamentos.forEach((ag) => {
        if (ag.servico) contagem[ag.servico] = (contagem[ag.servico] || 0) + 1;
    });
    const chaves = Object.keys(contagem);
    if (chaves.length > 0 && elServicoVendido)
        elServicoVendido.innerText = chaves.reduce((a, b) =>
            contagem[a] > contagem[b] ? a : b,
        );
}

window.mudarStatusAgendamento = async function (id, novoStatus) {
    if (!confirm(`Deseja marcar como ${novoStatus}?`)) return;
    await _supabase
        .from("agendamentos")
        .update({ status: novoStatus })
        .eq("id", id);
    await recalcularFaturamentoDoDia();
    carregarAgendamentosDoDia();
};

/* ==========================================================================
   4. ATENDIMENTO RÁPIDO E METAS
   ATUALIZAÇÃO V1.04 - Correção de Duplicidade no Atendimento Rápido
   ========================================================================== */
let agendamentoEmAndamento = false; // Trava global de segurança para evitar cliques duplos

window.agendarAgora = async function () {
    // 1. Barreira de segurança: Se já estiver salvando, aborta a nova tentativa na mesma hora
    if (agendamentoEmAndamento) return;

    const nome = document.getElementById("rapido-nome").value;
    const servico = document.getElementById("rapido-servico").value;
    const telefone = document.getElementById("rapido-telefone").value;

    if (!nome || !servico) return alert("Preencha o nome e o serviço.");

    // 2. Aciona a trava e captura o botão para dar feedback visual
    agendamentoEmAndamento = true;
    const btnFinalizar = document.activeElement;
    let textoOriginal = "Finalizar e Adicionar";

    if (btnFinalizar && btnFinalizar.tagName === "BUTTON") {
        textoOriginal = btnFinalizar.innerHTML;
        btnFinalizar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        btnFinalizar.disabled = true; // Desativa o clique fisicamente no HTML
    }

    try {
        const agora = new Date();
        const dataISO = agora.toLocaleDateString("en-CA");
        const horaAtual =
            agora.getHours().toString().padStart(2, "0") +
            ":" +
            agora.getMinutes().toString().padStart(2, "0");

        const { data: sInfo } = await _supabase
            .from("servicos")
            .select("preco")
            .eq("nome", servico)
            .single();

        const { error } = await _supabase.from("agendamentos").insert([
            {
                cliente_nome: nome,
                servico: servico,
                telefone: telefone,
                data: dataISO,
                horario: horaAtual,
                status: "concluido",
                valor: sInfo ? sInfo.preco : 0,
            },
        ]);

        if (error) throw error; // Joga o erro para o bloco catch tratar

        document.getElementById("modal-agendamento").style.display = "none";
        document.getElementById("rapido-nome").value = "";
        document.getElementById("rapido-telefone").value = "";

        await carregarAgendamentosDoDia();
        await recalcularFaturamentoDoDia();

        alert("Atendimento rápido registrado! ✅");

    } catch (erro) {
        console.error("Erro no atendimento rápido:", erro);
        alert("Erro ao registrar: " + erro.message);
    } finally {
        // 3. Libera a trava e restaura o botão, não importa se deu sucesso ou erro
        agendamentoEmAndamento = false;
        if (btnFinalizar && btnFinalizar.tagName === "BUTTON") {
            btnFinalizar.innerHTML = textoOriginal;
            btnFinalizar.disabled = false;
        }
    }
};

window.recalcularFaturamentoDoDia = async function () {
    const hoje = new Date().toLocaleDateString("en-CA");
    const { data } = await _supabase
        .from("agendamentos")
        .select("valor")
        .eq("data", hoje)
        .eq("status", "concluido");
    const total = (data || []).reduce(
        (acc, item) => acc + (parseFloat(item.valor) || 0),
        0,
    );
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
        if (elFill)
            elFill.style.background = "linear-gradient(90deg, #FFD700, #FFA500)";
        if (
            typeof confetti === "function" &&
            sessionStorage.getItem("confeteDisparado") !== "true"
        ) {
            dispararConfete();
            sessionStorage.setItem("confeteDisparado", "true");
        }
    } else {
        if (elFrase) elFrase.innerText = "Sua jornada de hoje começou! 🚀";
        if (elFill) elFill.style.background = "var(--cor-primaria)";
        sessionStorage.removeItem("confeteDisparado");
    }
}

function dispararConfete() {
    var end = Date.now() + 2000;
    var colors = ["#ce9e62", "#ffffff", "#D4AF37"];
    (function frame() {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
        });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
}

/* ==========================================================================
   5. AGENDA COMPLETA (CALENDÁRIO)
   ========================================================================== */
async function inicializarAgenda() {
    renderizarEstruturaCalendario();
}
window.mudarMes = (direcao) => {
    dataCalendario.setMonth(dataCalendario.getMonth() + direcao);
    renderizarEstruturaCalendario();
};

async function renderizarEstruturaCalendario() {
    const grade = document.getElementById("calendario-grade");
    const mesDisplay = document.getElementById("mes-atual");
    if (!grade || !mesDisplay) return;

    const meses = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ];
    const ano = dataCalendario.getFullYear();
    const mes = dataCalendario.getMonth();
    mesDisplay.innerText = `${meses[mes]} ${ano}`;
    grade.innerHTML = "";

    const priDia = new Date(ano, mes, 1).getDay();
    const diasMes = new Date(ano, mes + 1, 0).getDate();
    const { data: ags } = await _supabase
        .from("agendamentos")
        .select("data")
        .gte("data", `${ano}-${String(mes + 1).padStart(2, "0")}-01`)
        .lte("data", `${ano}-${String(mes + 1).padStart(2, "0")}-${diasMes}`);
    const diasComAgenda = new Set(ags?.map((a) => a.data));

    for (let i = 0; i < priDia; i++) grade.innerHTML += `<div></div>`;
    for (let dia = 1; dia <= diasMes; dia++) {
        const dIso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const el = document.createElement("div");
        el.className = `dia-item ${diasComAgenda.has(dIso) ? "tem-marcacao" : ""}`;
        el.innerText = dia;
        el.onclick = () => selecionarDiaAgenda(dIso, el);
        grade.appendChild(el);
    }
}

/* ==========================================================================
   ATUALIZAÇÃO V1.04 - Exibição de Agendamentos Cancelados na Agenda
   ========================================================================== */
async function selecionarDiaAgenda(dataISO, elemento) {
    document
        .querySelectorAll(".dia-item")
        .forEach((d) => d.classList.remove("selecionado"));
    if (elemento) elemento.classList.add("selecionado");

    const lista = document.getElementById("lista-agenda-clicada");
    const titulo = document.getElementById("titulo-agenda-selecionada");
    const [ano, mes, dia] = dataISO.split("-");

    if (titulo) titulo.innerText = `Agenda: ${dia}/${mes}/${ano}`;
    if (lista) lista.innerHTML = "<p style='text-align:center;'>Buscando...</p>";

    // CORREÇÃO: Removido o filtro .neq("status", "cancelado") para trazer todos os agendamentos do dia
    const { data: ags } = await _supabase
        .from("agendamentos")
        .select("*")
        .eq("data", dataISO)
        .order("horario");

    if (!ags || ags.length === 0) {
        lista.innerHTML =
            "<p style='text-align:center; color:var(--cor-subtexto);'>Nenhum agendamento.</p>";
        return;
    }

    lista.innerHTML = ags
        .map(
            (ag) => `
        <div class="item-agenda-lista ${ag.status.toLowerCase() === 'cancelado' ? 'item-cancelado' : ''}">
            <div class="hora-tag">${String(ag.horario).substring(0, 5)}h</div>
            <div class="info-tag">
                <strong style="${ag.status.toLowerCase() === 'cancelado' ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${ag.cliente_nome}</strong>
                <span>${ag.servico}</span>
            </div>
            <div class="status-tag ${ag.status.toLowerCase()}">${ag.status.toUpperCase()}</div>
        </div>`,
        )
        .join("");
}

/* ==========================================================================
   6. CLIENTES E FIDELIDADE - ATUALIZAÇÃO 16/05/2026 - Versão 1.02
   Correção Cirúrgica de Fuso Horário na Data da Última Visita
   ========================================================================== */
window.dispararWhatsAppBusiness = function (tel, mensagem = "") {
    if (!tel) return alert("Sem telefone cadastrado!");

    const num = tel.replace(/\D/g, "");
    const ddi = num.startsWith("55") ? "" : "55";
    const numeroCompleto = `${ddi}${num}`;
    const msgCodificada = encodeURIComponent(mensagem);

    const intentUrl = `intent://send?phone=${numeroCompleto}&text=${msgCodificada}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;

    if (/Android/i.test(navigator.userAgent)) {
        window.location.href = intentUrl;
    } else {
        window.open(`https://api.whatsapp.com/send?phone=${numeroCompleto}&text=${msgCodificada}`, "_blank");
    }
};

/* ==========================================================================
   ATUALIZAÇÃO V1.04 - Fidelidade Blindada (Apenas Concluídos) e Tratamento de Erros
   ========================================================================== */
window.renderizarListaClientes = async function () {
    const corpo = document.getElementById("corpo-tabela-clientes");
    if (!corpo) return;

    corpo.innerHTML = '<tr><td colspan="4" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Carregando...</td></tr>';

    try {
        // 1. Lemos direto da tabela bruta, ignorando a view antiga com falha
        const { data: agendamentos, error } = await _supabase
            .from("agendamentos")
            .select("cliente_nome, telefone, servico, data, horario, status")
            .in("status", ["concluido", "cancelado"])
            .order("data", { ascending: false })
            .order("horario", { ascending: false });

        if (error) throw error;

        if (!agendamentos || agendamentos.length === 0) {
            return (corpo.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum cliente cadastrado.</td></tr>');
        }

        const clientesMap = new Map();

        agendamentos.forEach((ag) => {
            const tel = ag.telefone ? ag.telefone.trim() : "Sem Número";

            // Inicializa o cliente garantindo o nome mais recente
            if (!clientesMap.has(tel)) {
                clientesMap.set(tel, {
                    cliente_nome: ag.cliente_nome,
                    telefone: tel,
                    ultimo_servico: "---",
                    data_ultima_visita: "---",
                    total_concluidos: 0 // NOVO: Contador real de visitas
                });
            }

            const clienteAtual = clientesMap.get(tel);

            // REGRA V1.04: Apenas status "concluído" entra para o histórico!
            if (ag.status === "concluido") {
                clienteAtual.total_concluidos += 1;

                // Como vem do mais novo pro mais velho, o primeiro concluído é o último corte real
                if (clienteAtual.ultimo_servico === "---") {
                    clienteAtual.ultimo_servico = ag.servico;
                    clienteAtual.data_ultima_visita = ag.data;
                }
            }
        });

        // Converte para Array e ordena alfabeticamente
        const clis = Array.from(clientesMap.values()).sort((a, b) =>
            a.cliente_nome.localeCompare(b.cliente_nome)
        );

        corpo.innerHTML = clis
            .map((c) => {
                let dVisita = "---";
                if (c.data_ultima_visita !== "---") {
                    const dataPura = c.data_ultima_visita.split(" ")[0];
                    dVisita = dataPura.split("-").reverse().join("/");
                }

                // Se não tem serviços concluídos, exibe aviso limpo e claro
                const exibicaoServico = c.total_concluidos === 0
                    ? `<span style="color:var(--cor-erro); font-size:0.85rem; font-weight:bold;">Nenhum serviço realizado</span>`
                    : `${c.ultimo_servico} <br><small style="color:var(--cor-subtexto)">Último: ${dVisita}</small>`;

                return `<tr>
                    <td><strong>${c.cliente_nome}</strong></td>
                    <td>${exibicaoServico}</td>
                    <td>${c.telefone === "Sem Número" ? "---" : c.telefone}</td>
                    <td>
                        <div class="acoes-buttons">
                            <button class="btn-whatsapp" onclick="dispararWhatsAppBusiness('${c.telefone}', '')" title="Conversar">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                            <button class="btn-visualizar-cliente" onclick="abrirDetalhesCliente('${c.telefone}', '${c.cliente_nome}')" title="Ver Histórico">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
            })
            .join("");
    } catch (erro) {
        console.error("Erro ao carregar clientes:", erro);
        corpo.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--cor-erro);">Erro ao buscar lista de clientes.</td></tr>';
    }
};

window.filtrarClientes = function () {
    const termo = document.getElementById("busca-cliente").value.toLowerCase();
    document.querySelectorAll("#corpo-tabela-clientes tr").forEach((linha) => {
        linha.style.display = linha.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
};

window.abrirDetalhesCliente = async function (tel, nome) {
    const modal = document.getElementById("modal-detalhes-cliente");
    if (!modal) return;
    modal.style.display = "block";
    document.getElementById("detalhe-nome-cliente").innerText = nome;
    document.getElementById("estrelas-fidelidade").innerHTML =
        "<p class='loading-text'><i class='fas fa-spinner fa-spin'></i> Buscando...</p>";

    try {
        const { data: hist, error } = await _supabase
            .from("agendamentos")
            .select("data, servico")
            .eq("telefone", tel)
            .eq("status", "concluido") // TRAVA ESTREITA
            .order("data", { ascending: false });

        if (error) throw error;

        if (!hist || hist.length === 0) {
            // Se o cliente só teve cancelamentos, zera o modal
            document.getElementById("estrelas-fidelidade").innerHTML =
                "<p style='font-size:0.9rem; color:var(--cor-erro); font-weight:bold;'>Cliente sem serviços concluídos.</p>";
            document.getElementById("detalhe-data-corte").innerText = "---";
            document.getElementById("detalhe-servico").innerText = "---";
            document.getElementById("total-servicos-texto").innerText = "0 serviços concluídos";
            return;
        }

        document.getElementById("detalhe-data-corte").innerText = hist[0].data.split("-").reverse().join("/");
        document.getElementById("detalhe-servico").innerText = hist[0].servico;

        // Renderiza as estrelas corretamente
        document.getElementById("estrelas-fidelidade").innerHTML = hist
            .map(() => '<i class="fas fa-star" style="margin-right:5px; color: var(--cor-primaria);"></i>')
            .join("");

        document.getElementById("total-servicos-texto").innerText = `${hist.length} serviço(s) concluído(s)`;

    } catch (erro) {
        console.error("Erro ao abrir histórico:", erro);
        document.getElementById("estrelas-fidelidade").innerHTML = "<p style='color:var(--cor-erro);'>Erro ao carregar dados do histórico.</p>";
    }
};

window.fecharModalDetalhes = () =>
    (document.getElementById("modal-detalhes-cliente").style.display = "none");
/* ==========================================================================
   7. RELATÓRIOS E INTELIGÊNCIA (COM GRÁFICO E CÁLCULO "VS")
   ========================================================================== */

window.abrirSubRelatorio = function (tipo) {
    esconderTodasSessoes();
    if (headerPrincipal) headerPrincipal.style.display = "none";
    if (painelConquista) painelConquista.style.display = "none";
    secoes.relatorios.style.display = "block";

    document
        .querySelectorAll(".relatorio-sub-section")
        .forEach((area) => (area.style.display = "none"));
    const titulo = document.getElementById("titulo-sub-relatorio");

    if (tipo === "resultados") {
        document.getElementById("area-resultados").style.display = "block";
        if (titulo) titulo.innerText = "Resultados";
    } else if (tipo === "desempenho") {
        document.getElementById("area-desempenho").style.display = "block";
        if (titulo) titulo.innerText = "Desempenho";
    }

    const filtro = document.getElementById("filtro-periodo-relatorio");
    inicializarRelatorios(filtro ? parseInt(filtro.value) : 30);
};

window.mudarPeriodoRelatorio = function (dias) {
    const labels = {
        7: "Últimos 7 dias",
        30: "Mês atual",
        90: "Últimos 3 meses",
        365: "Este Ano",
    };
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
        dataFimAnterior = new Date(
            dataHoje.getFullYear(),
            dataHoje.getMonth(),
            0,
        ).toLocaleDateString("en-CA");
        dataInicioAnterior = new Date(
            dataHoje.getFullYear(),
            dataHoje.getMonth() - 1,
            1,
        );
    } else {
        dataInicioAtual = new Date();
        dataInicioAtual.setDate(dataHoje.getDate() - dias);
        dataFimAnterior = dataInicioAtual.toLocaleDateString("en-CA");
        dataInicioAnterior = new Date();
        dataInicioAnterior.setDate(dataInicioAtual.getDate() - dias);
    }

    const isoIniAtual = dataInicioAtual.toLocaleDateString("en-CA");
    const isoIniAnt =
        dataInicioAnterior instanceof Date
            ? dataInicioAnterior.toLocaleDateString("en-CA")
            : dataInicioAnterior;

    // 2. Busca no Supabase
    const { data: agAtual } = await _supabase
        .from("agendamentos")
        .select("*")
        .in("status", ["concluido", "cancelado"])
        .gte("data", isoIniAtual)
        .lte("data", dataFimAtual);
    const { data: agAntigo } = await _supabase
        .from("agendamentos")
        .select("*")
        .in("status", ["concluido", "cancelado"])
        .gte("data", isoIniAnt)
        .lte("data", dataFimAnterior);

    const concAtual = agAtual?.filter((a) => a.status === "concluido") || [];
    const concAntigo = agAntigo?.filter((a) => a.status === "concluido") || [];

    // 3. Cálculos Atuais
    const fatAtual = concAtual.reduce(
        (acc, i) => acc + (parseFloat(i.valor) || 0),
        0,
    );
    const atendAtual = concAtual.length;
    const ticketAtual = atendAtual > 0 ? fatAtual / atendAtual : 0;
    const taxaCompAtual =
        agAtual?.length > 0 ? (atendAtual / agAtual.length) * 100 : 0;

    // 4. Cálculos Anteriores
    const fatAntigo = concAntigo.reduce(
        (acc, i) => acc + (parseFloat(i.valor) || 0),
        0,
    );
    const atendAntigo = concAntigo.length;
    const ticketAntigo = atendAntigo > 0 ? fatAntigo / atendAntigo : 0;
    const taxaCompAntigo =
        agAntigo?.length > 0 ? (atendAntigo / agAntigo.length) * 100 : 0;

    // 5. Atualização da UI
    document.getElementById("rel-faturamento").innerText =
        `R$ ${fatAtual.toFixed(2).replace(".", ",")}`;
    atualizarTrendUI("trend-faturamento", fatAtual, fatAntigo);

    document.getElementById("rel-atendimentos").innerText = atendAtual;
    atualizarTrendUI("trend-atendimentos", atendAtual, atendAntigo);

    document.getElementById("rel-ticket").innerText =
        `R$ ${ticketAtual.toFixed(2).replace(".", ",")}`;
    atualizarTrendUI("trend-ticket", ticketAtual, ticketAntigo);

    document.getElementById("rel-comparecimento").innerText =
        `${taxaCompAtual.toFixed(0)}%`;
    document.getElementById("fill-comparecimento").style.width =
        `${taxaCompAtual}%`;
    atualizarTrendUI("trend-comparecimento", taxaCompAtual, taxaCompAntigo);

    // 6. Chamada das funções visuais (Gráfico e Insights)
    renderizarGraficoEvolucao(concAtual);
    processarInsightsHorarios(concAtual);
    processarInsightsClientes(concAtual);
}

// 7. FUNÇÃO DO GRÁFICO (RESTAURADA)
function renderizarGraficoEvolucao(dados) {
    const canvas = document.getElementById("graficoEvolucao");
    if (!canvas || !dados) return;
    const ctx = canvas.getContext("2d");
    if (chartFaturamento) chartFaturamento.destroy();

    const ord = [...dados].sort((a, b) => a.data.localeCompare(b.data));
    const labels = [
        ...new Set(
            ord.map((d) => d.data.substring(8, 10) + "/" + d.data.substring(5, 7)),
        ),
    ];
    const fatDia = labels.map((l) =>
        ord
            .filter((d) => d.data.includes(l.split("/").reverse().join("-")))
            .reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0),
    );

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(46, 204, 113, 0.4)");
    gradient.addColorStop(1, "rgba(46, 204, 113, 0)");

    chartFaturamento = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    data: fatDia,
                    borderColor: "#2ecc71",
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.4,
                },
            ],
        },
        options: { responsive: true, plugins: { legend: { display: false } } },
    });
}
/* ==========================================================================
   FUNÇÃO: ANÁLISE DE HORÁRIOS DE PICO (CORRIGIDA V1.02 - 16/05/2026)
   ========================================================================== */
async function processarInsightsHorarios(agendamentos) {
    const listaEl = document.getElementById("lista-horarios-pico");
    const dicaEl = document.getElementById("insight-horario-texto");
    if (!listaEl || !dicaEl) return;

    // CORREÇÃO V1.02: Força os fallbacks corretos caso o banco não traga as colunas específicas
    let hInicio = "08:00";
    let hAlmocoIni = "12:00";
    let hAlmocoFim = "13:00";
    let hFim = "18:00";

    try {
        const { data: config } = await _supabase
            .from("configuracoes")
            .select("*")
            .eq("id", 1)
            .maybeSingle(); // Usa maybeSingle para evitar quebras se o registro falhar

        if (config) {
            if (config.hora_inicio) hInicio = config.hora_inicio;
            if (config.almoco_inicio) hAlmocoIni = config.almoco_inicio;
            if (config.almoco_fim) hAlmocoFim = config.almoco_fim;
            if (config.hora_fim) hFim = config.hora_fim;
        }
    } catch (err) {
        console.warn("Usando horários padrão para o relatório de pico.");
    }

    // ACUMULADORES POR TURNO
    let fatManha = 0;
    let fatTarde = 0;

    // Garante que temos agendamentos para processar
    const agendamentosValidos = agendamentos || [];

    agendamentosValidos.forEach((ag) => {
        if (!ag.horario || ag.status !== "concluido") return; // Só contabiliza o que realmente foi faturado e concluído
        const hora = ag.horario.substring(0, 5);
        const valor = parseFloat(ag.valor) || 0;

        if (hora >= hInicio && hora < hAlmocoIni) {
            fatManha += valor;
        } else if (hora >= hAlmocoFim && hora <= hFim) {
            fatTarde += valor;
        }
    });

    const totalTurnos = fatManha + fatTarde;
    const turnos = [
        { nome: `Manhã (${hInicio} - ${hAlmocoIni})`, valor: fatManha },
        { nome: `Tarde (${hAlmocoFim} - ${hFim})`, valor: fatTarde },
    ].sort((a, b) => b.valor - a.valor);

    // Se o faturamento total dos turnos calculados for 0, busca uma média geral dos agendamentos para não deixar o card vazio
    if (totalTurnos === 0) {
        // Fallback dinâmico V1.02: se não houver faturamento estrito nos turnos, distribui por horário padrão de corte
        listaEl.innerHTML = "<p class='loading-text' style='font-size:0.85rem; color:var(--cor-subtexto);'>Aguardando mais agendamentos concluídos no período para definir o pico.</p>";
        dicaEl.innerText = "Dica: Mude o filtro de dias no topo da tela de relatórios para buscar um histórico maior de faturamento.";
        return;
    }

    // RENDERIZAÇÃO
    listaEl.innerHTML = turnos
        .map((t, index) => {
            const porc = (t.valor / totalTurnos) * 100;
            const cor = index === 0 ? "var(--cor-primaria)" : "#aaa";
            return `
            <div class="insight-row" style="margin-bottom: 12px;">
                <div class="insight-info" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span class="posicao" style="color: ${cor}; font-weight: bold;">${index + 1}º ${t.nome}</span>
                    <span class="porcentagem"><strong>${porc.toFixed(0)}%</strong></span>
                </div>
                <div class="barra-progresso-fina" style="background: rgba(255,255,255,0.1); border-radius: 4px; height: 6px; overflow: hidden;">
                    <div class="fill" style="width: ${porc}%; background: ${cor}; height: 100%; transition: width 0.5s ease;"></div>
                </div>
            </div>`;
        })
        .join("");

    // SISTEMA DE DICAS
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
        "Ocupação alta antes do almoço. Tente antecipar o pedido de suprimentos para evitar faltas.",
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
        "Foco no atendimento! Casa cheia no fim do dia exige agilidade sem perder a qualidade.",
    ];

    const randomIdx = Math.floor(Math.random() * 3);
    dicaEl.innerText = turnoVencedor.includes("Manhã")
        ? dManha[randomIdx]
        : dTarde[randomIdx];
}

/* ==========================================================================
   FUNÇÃO: ANÁLISE DE FIDELIZAÇÃO (NOVOS VS RECORRENTES)
   ========================================================================== */
async function processarInsightsClientes(agendamentosAtuais) {
    if (!agendamentosAtuais || agendamentosAtuais.length === 0) return;

    const { data: historico } = await _supabase
        .from("agendamentos")
        .select("telefone")
        .eq("status", "concluido");
    const telefonesAtuais = new Set(agendamentosAtuais.map((a) => a.telefone));

    let recorrentes = 0;
    let novos = 0;

    telefonesAtuais.forEach((tel) => {
        if (!tel) return;
        const vezes = historico.filter((h) => h.telefone === tel).length;
        vezes > 1 ? recorrentes++ : novos++;
    });

    const totalClientes = novos + recorrentes;
    const taxaRetencao =
        totalClientes > 0 ? (recorrentes / totalClientes) * 100 : 0;

    document.getElementById("rel-novos-clientes").innerText = novos;
    document.getElementById("rel-recorrentes").innerText = recorrentes;
    document.getElementById("rel-taxa-retencao").innerText =
        `${taxaRetencao.toFixed(0)}%`;

    const fillRetencao = document.getElementById("fill-retencao");
    if (fillRetencao) fillRetencao.style.width = `${taxaRetencao}%`;
}

function atualizarTrendUI(id, atual, antigo) {
    const el = document.getElementById(id);
    if (!el) return;
    let p = antigo > 0 ? ((atual - antigo) / antigo) * 100 : atual > 0 ? 100 : 0;
    const up = p >= 0;
    el.style.color = up ? "#2ecc71" : "#ff4757";
    el.innerHTML = `<i class="fas fa-arrow-${up ? "up" : "down"}"></i> ${Math.abs(p).toFixed(0)}% <span>vs anterior</span>`;
}

/* ==========================================================================
   8. CONFIGURAÇÕES DO NEGÓCIO (ATUALIZAÇÃO 14/05/2026 - Versão 1.01)
   ========================================================================== */

// 1. Garanta que a função seja GLOBAL para o HTML encontrá-la
window.abrirSubConfig = async function (tipo) {
    // 2. Limpa o rastro de qualquer aba anterior e reseta o scroll
    esconderTodasSessoes();

    // 3. REMOÇÃO DO TOPO: Garante que o conteúdo cole no início da tela
    if (typeof headerPrincipal !== "undefined" && headerPrincipal)
        headerPrincipal.style.display = "none";
    if (typeof painelConquista !== "undefined" && painelConquista)
        painelConquista.style.display = "none";
    if (typeof conteudoDashboard !== "undefined" && conteudoDashboard) {
        conteudoDashboard.style.display = "none";
    }

    const pai = document.getElementById("configuracoes-section");
    if (pai) {
        pai.style.display = "block";
        pai.style.opacity = "1";
    }

    const areas = {
        expediente: "area-expediente",
        meta: "area-meta",
        servicos: "area-servicos",
    };

    // 4. Esconde todas as sub-áreas antes de mostrar a correta
    document
        .querySelectorAll(".config-sub-section")
        .forEach((s) => (s.style.display = "none"));

    const alvo = document.getElementById(areas[tipo]);
    if (alvo) {
        alvo.style.display = "block";

        // 5. RESET DE SCROLL: Força a visão para o topo absoluto
        window.scrollTo(0, 0);
        alvo.scrollIntoView({ behavior: "instant", block: "start" });
    }

    // PERSISTÊNCIA 1.01: Salva que o usuário está na área de configurações
    localStorage.setItem("ultimaAbaClientFlow", "Configuracoes");

    // 6. Lógica de busca de dados no Supabase
    if (tipo === "expediente") {
        const { data: cfg } = await _supabase
            .from("configuracoes")
            .select("horarios_semana, duracao_atendimento")
            .eq("id", 1)
            .maybeSingle();

        const campoDuracao = document.getElementById("cfg-duracao-atendimento");
        if (campoDuracao) campoDuracao.value = cfg?.duracao_atendimento || 30;

        if (window.renderizarInterfaceExpediente) {
            window.renderizarInterfaceExpediente(cfg?.horarios_semana || {});
        }
    }

    if (tipo === "servicos" && window.renderizarConfigServicos) {
        await window.renderizarConfigServicos();
    }
};

window.salvarNovoExpediente = async function () {
    const btn = document.querySelector("button[onclick='salvarNovoExpediente()']");
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SALVANDO...';
        btn.disabled = true;
    }

    const novosHorarios = {};
    const duracaoCampo = document.getElementById("cfg-duracao-atendimento");
    const duracaoValor = duracaoCampo ? parseInt(duracaoCampo.value) : 30;

    // Captura os dados de cada dia da semana (0 a 6)
    for (let i = 0; i < 7; i++) {
        const checkDia = document.getElementById(`check-dia-${i}`);
        if (checkDia && checkDia.checked) {
            const checkOrdem = document.getElementById(`check-ordem-${i}`);
            const isOrdemChegada = checkOrdem ? checkOrdem.checked : false;

            if (isOrdemChegada) {
                // Estrutura o JSONB com a flag de ordem de chegada ativa
                novosHorarios[String(i)] = { ordemChegada: true, turnos: [] };
            } else {
                const inis = document.querySelectorAll(`.h-ini-${i}`);
                const fims = document.querySelectorAll(`.h-fim-${i}`);
                const turnosDoDia = [];

                inis.forEach((el, index) => {
                    if (el.value && fims[index].value) {
                        turnosDoDia.push({
                            inicio: el.value,
                            fim: fims[index].value,
                        });
                    }
                });

                if (turnosDoDia.length > 0) {
                    // Estrutura o JSONB com a flag desativada e passa os turnos do loop
                    novosHorarios[String(i)] = { ordemChegada: false, turnos: turnosDoDia };
                }
            }
        }
    }

    try {
        // CORREÇÃO CIRÚRGICA: Coluna corrigida para 'duracao_atendimento' em pt-BR
        const { error } = await _supabase
            .from("configuracoes")
            .update({
                horarios_semana: novosHorarios,
                duracao_atendimento: duracaoValor,
            })
            .eq("id", 1);

        if (error) throw error;

        alert("Configuração de expediente salva com sucesso! ✅");
    } catch (err) {
        console.error("Erro Supabase:", err);
        alert("Erro ao salvar: " + err.message);
    } finally {
        if (btn) {
            btn.innerHTML = '<i class="fas fa-save"></i> GUARDAR EXPEDIENTE';
            btn.disabled = false;
        }
    }
};

window.salvarMetaDiaria = async function () {
    const m = parseFloat(document.getElementById("cfg-meta-valor").value);
    if (isNaN(m) || m <= 0) return alert("Valor inválido!");
    await _supabase.from("configuracoes").upsert({ id: 1, meta_diaria: m });
    localStorage.setItem("metaDiaria", m);
    atualizarProgressoMeta();
    alert("Meta atualizada!");
};

window.renderizarConfigServicos = async function () {
    const c = document.getElementById("lista-servicos-config");
    if (!c) return;
    c.innerHTML =
        "<p style='color:var(--cor-subtexto);'>Buscando serviços...</p>";
    const { data: srvs, error } = await _supabase
        .from("servicos")
        .select("*")
        .order("nome");
    if (error) return (c.innerHTML = "<p style='color:#ff4d4d;'>Erro.</p>");
    if (!srvs || srvs.length === 0)
        return (c.innerHTML =
            "<p style='color:var(--cor-subtexto);'>Nenhum serviço.</p>");

    c.innerHTML =
        "<h4 style='color:#fff; margin-bottom:10px;'>Serviços Ativos:</h4>" +
        srvs
            .map(
                (s) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:8px;">
            <span>${s.nome} - <strong>R$ ${parseFloat(s.preco).toFixed(2).replace(".", ",")}</strong></span>
            <button onclick="excluirServico('${s.id}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>`,
            )
            .join("");
};

window.adicionarNovoServico = async function () {
    const nome = document.getElementById("cfg-servico-nome").value,
        preco = document.getElementById("cfg-servico-preco").value;
    if (!nome || !preco) return alert("Preencha nome e preço!");
    const btn = document.getElementById("btn-add-servico-banco");
    const txt = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';
    btn.disabled = true;

    const { error } = await _supabase
        .from("servicos")
        .insert([{ nome: nome, preco: parseFloat(preco) }]);
    if (error) alert("Erro: " + error.message);
    else {
        document.getElementById("cfg-servico-nome").value = "";
        document.getElementById("cfg-servico-preco").value = "";
        await window.renderizarConfigServicos();
        alert("Serviço adicionado!");
    }
    btn.innerHTML = txt;
    btn.disabled = false;
};
window.excluirServico = async function (id) {
    if (!confirm("Excluir serviço?")) return;
    await _supabase.from("servicos").delete().eq("id", id);
    await window.renderizarConfigServicos();
};

/* ==========================================================================
   8.1 FUNÇÕES DE INTERFACE DO EXPEDIENTE (NOVO)
   ========================================================================== */
const DIAS_NOMES = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
];

// Esta função gera o HTML que você viu na foto
window.renderizarInterfaceExpediente = function (dadosExistentes = {}) {
    const container = document.getElementById("container-dias-expediente");
    if (!container) return;
    container.innerHTML = "";

    DIAS_NOMES.forEach((nome, index) => {
        // Se dadosExistentes[index] for um objeto com a propriedade turnos (estrutura nova V1.02)
        const infoDia = dadosExistentes[index] || {};
        const isOrdemChegada = infoDia.ordemChegada === true;
        const turnos = Array.isArray(infoDia) ? infoDia : (infoDia.turnos || []);
        const ativo = turnos.length > 0 || isOrdemChegada;

        const diaHtml = `
        <div class="stat-card" style="border-left: 4px solid ${ativo ? "var(--cor-primaria)" : "#333"}; padding: 15px; margin-bottom:10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #fff;">${nome}</strong>
                <label class="switch">
                    <input type="checkbox" id="check-dia-${index}" ${ativo ? "checked" : ""} onchange="toggleDia(${index})">
                    <span class="slider"></span>
                </label>
            </div>
            
            <div id="turnos-dia-${index}" style="display: ${ativo ? "block" : "none"};">
                <div class="lista-turnos-container" id="lista-turnos-${index}" style="display: ${isOrdemChegada ? "none" : "block"};">
                    ${(turnos.length > 0 ? turnos : [{ inicio: "08:30", fim: "19:00" }])
                .map((t, i) => `
                        <div class="input-turno" style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <input type="time" class="h-ini-${index}" value="${t.inicio}" style="background:#111; color:#fff; border:1px solid #333; padding:5px; border-radius:4px;">
                            <span style="color: var(--cor-subtexto);">-</span>
                            <input type="time" class="h-fim-${index}" value="${t.fim}" style="background:#111; color:#fff; border:1px solid #333; padding:5px; border-radius:4px;">
                            ${i > 0 ? `<button onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--cor-erro); cursor:pointer;"><i class="fas fa-times-circle"></i></button>` : ""}
                        </div>
                    `).join("")}
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #222;">
                    <button id="btn-add-turno-${index}" onclick="adicionarTurno(${index})" style="background:none; border:none; color:var(--cor-primaria); font-size: 0.8rem; cursor:pointer; padding:0; display: ${isOrdemChegada ? "none" : "block"};">
                        <i class="fas fa-plus-circle"></i> Adicionar turno
                    </button>
                    <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                        <span style="font-size: 0.8rem; color: var(--cor-subtexto);"><i class="fas fa-users"></i> Ordem de Chegada</span>
                        <label class="switch" style="transform: scale(0.85);">
                            <input type="checkbox" id="check-ordem-${index}" ${isOrdemChegada ? "checked" : ""} onchange="toggleOrdemChegada(${index})">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>`;
        container.innerHTML += diaHtml;
    });
};

// Controla o comportamento visual ao ligar a chave de Ordem de Chegada
window.toggleOrdemChegada = (index) => {
    const checkOrdem = document.getElementById(`check-ordem-${index}`);
    const listaTurnos = document.getElementById(`lista-turnos-${index}`);
    const btnAdd = document.getElementById(`btn-add-turno-${index}`);

    if (checkOrdem.checked) {
        if (listaTurnos) listaTurnos.style.display = "none";
        if (btnAdd) btnAdd.style.display = "none";
    } else {
        if (listaTurnos) listaTurnos.style.display = "block";
        if (btnAdd) btnAdd.style.display = "block";
    }
};

window.toggleDia = (index) => {
    const box = document.getElementById(`turnos-dia-${index}`);
    const check = document.getElementById(`check-dia-${index}`);
    if (box && check) box.style.display = check.checked ? "block" : "none";
};

window.adicionarTurno = (index) => {
    const container = document.getElementById(`lista-turnos-${index}`);
    if (!container) return;
    const novoTurno = document.createElement("div");
    novoTurno.className = "input-turno";
    novoTurno.style =
        "display: flex; align-items: center; gap: 10px; margin-bottom: 10px;";
    novoTurno.innerHTML = `
        <input type="time" class="h-ini-${index}" value="13:00" style="background:#111; color:#fff; border:1px solid #333; padding:5px; border-radius:4px;">
        <span style="color: var(--cor-subtexto);">-</span>
        <input type="time" class="h-fim-${index}" value="18:00" style="background:#111; color:#fff; border:1px solid #333; padding:5px; border-radius:4px;">
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--cor-erro); cursor:pointer;"><i class="fas fa-times-circle"></i></button>
    `;
    container.appendChild(novoTurno);
};

/* ==========================================================================
   9. CMS E GESTÃO DO SITE (EDITAR HOME, MARKETING)
   ========================================================================== */
/* ==========================================================================
   ATUALIZAÇÃO 14/05/2026 - Versão 1.01
   Persistência de Estado nas Configurações Gerais
   ========================================================================== */
window.abrirSubConfigGeral = async function (tipo) {
    // 1. LIMPEZA INICIAL
    esconderTodasSessoes();

    // Reset de scroll no container principal
    const container = document.querySelector(".main-content");
    if (container) container.scrollTop = 0;

    // Remove o topo da página para não empurrar o conteúdo para baixo
    if (headerPrincipal) headerPrincipal.style.display = "none";
    if (painelConquista) painelConquista.style.display = "none";
    if (typeof conteudoDashboard !== "undefined" && conteudoDashboard) {
        conteudoDashboard.style.display = "none";
    }

    // 2. EXIBIÇÃO DA SEÇÃO
    const pai = document.getElementById("configuracoes-section");
    if (pai) {
        pai.style.display = "block";
        pai.style.opacity = "1";
    }

    // Esconde todas as sub-áreas antes de mostrar a correta
    document
        .querySelectorAll(".config-sub-section")
        .forEach((s) => (s.style.display = "none"));

    const areas = {
        submenu1: "area-config-home",
        submenu2: "area-galeria-midia",
        marketing: "area-marketing",
        perfil: "area-perfil-barbeiro",
    };

    const alvo = document.getElementById(areas[tipo]);
    if (alvo) {
        alvo.style.display = "block";
        // AJUSTE DE LAYOUT: Força o elemento a colar no topo absoluto
        alvo.scrollIntoView({ behavior: "instant", block: "start" });
    }

    // PERSISTÊNCIA 1.01: Salva que o usuário está em uma sub-aba de configurações
    localStorage.setItem("ultimaAbaClientFlow", "Configuracoes");

    // 3. LÓGICA DE CARREGAMENTO DE DADOS (SUPABASE)
    try {
        if (tipo === "submenu1") {
            const { data: c } = await _supabase
                .from("configuracoes1")
                .select("*")
                .eq("id", 1)
                .maybeSingle();

            if (c) {
                [
                    "hero_titulo",
                    "sobre_texto",
                    "end_rua",
                    "end_numero",
                    "end_cidade",
                    "end_estado",
                    "end_cep",
                    "end_tel",
                    "mapa_iframe",
                ].forEach((k) => {
                    const el = document.getElementById(`cfg-${k.replace(/_/g, "-")}`);
                    if (el) el.value = c[k] || "";
                });
            }
        } else if (tipo === "submenu2") {
            const { data: m } = await _supabase
                .from("vitrine_midias")
                .select("*")
                .eq("id", 1)
                .maybeSingle();
            if (window.alternarLayoutMidia) {
                window.alternarLayoutMidia(m?.tipo_exibicao || "galeria", m);
            }
        } else if (tipo === "perfil") {
            const { data: p, error: err } = await _supabase
                .from("dados_barbearia")
                .select("*")
                .eq("id", 1)
                .maybeSingle();

            if (err) throw err;

            if (p) {
                const preencher = (id, valor) => {
                    const el = document.getElementById(id);
                    if (el) el.value = valor || "";
                };

                preencher("prof-nome-dono", p.nome_proprietario);
                preencher("prof-empresa", p.nome_empresa);
                preencher("prof-documento", p.documento);
                preencher("prof-whats", p.whatsapp);
                preencher("prof-insta", p.instagram);
                preencher("prof-facebook", p.facebook);
                preencher("prof-link-site", p.link_site);
                preencher("prof-pix", p.chave_pix);

                if (p.nome_proprietario) {
                    const nomeExibicao = p.nome_proprietario.trim().split(" ")[0];
                    const h1 = document.querySelector("#header-principal h1");
                    if (h1) h1.innerText = `Olá, ${nomeExibicao}!`;
                }

                const prev = document.getElementById("preview-logo");
                if (p.url_logo && prev) {
                    prev.innerHTML = `<img src="${p.url_logo}" style="height:50px; border-radius:4px;"/>`;
                }
            }
        }
    } catch (error) {
        console.error("Erro ao carregar dados da sub-configuração:", error);
    }
};

window.alternarLayoutMidia = function (tipo, dados = null) {
    const c = document.getElementById("container-inputs-dinamicos");
    if (!c) return;
    let bG = document.getElementById("bloco-galeria"),
        bP = document.getElementById("bloco-produtos");

    if (!bG || !bP) {
        let html =
            `<div id="bloco-galeria" style="display:none;"><p style="font-size:0.85rem; color:var(--cor-subtexto); margin-bottom:10px;">Portfólio: Envie 4 fotos dos cortes.</p><div class="config-grid-form" style="margin-bottom:20px;">` +
            [1, 2, 3, 4]
                .map((i) => {
                    const url = dados?.dados_galeria ? dados.dados_galeria[i - 1] : null;
                    const nome = url ? url.split("/").pop() : "Vazio";
                    return `<div class="input-group-modal"><label>Foto ${i}</label><div style="display:flex; align-items:center; gap:10px;"><img src="${url || ""}" style="width:50px;height:50px;display:${url ? "block" : "none"}" id="preview-galeria-${i}"><div style="flex:1;overflow:hidden;"><input type="file" id="up-galeria-${i}" onchange="uploadMidia('galeria-${i}')" accept="image/*"><small style="color:var(--cor-primaria);" id="nome-galeria-${i}">${nome}</small></div></div></div>`;
                })
                .join("") +
            `</div></div>`;

        html +=
            `<div id="bloco-produtos" style="display:none;"><p style="font-size:0.85rem; color:var(--cor-subtexto); margin-bottom:10px;">Catálogo: Adicione 4 produtos.</p><div class="config-grid-form" style="gap:15px;">` +
            [1, 2, 3, 4]
                .map((i) => {
                    const p = dados?.dados_produtos ? dados.dados_produtos[i - 1] : null;
                    const url = p?.url;
                    const nome = url ? url.split("/").pop() : "Vazio";
                    return `<div style="background:#111; padding:15px; border-radius:8px; border:1px solid #333;"><label style="color:var(--cor-primaria);">Produto ${i}</label><div style="display:flex; align-items:center; gap:10px; margin:10px 0;"><img src="${url || ""}" style="width:50px;height:50px;display:${url ? "block" : "none"}" id="preview-prod-${i}"><div style="flex:1;overflow:hidden;"><input type="file" id="up-prod-${i}" onchange="uploadMidia('prod-${i}')" accept="image/*"><small style="color:var(--cor-primaria);" id="nome-prod-${i}">${nome}</small></div></div><input type="text" id="p-nome-${i}" value="${p?.nome || ""}" placeholder="Nome" style="margin-bottom:8px; width:100%;"/><input type="number" id="p-preco-${i}" value="${p?.preco || ""}" placeholder="Preço R$" style="width:100%;"/></div>`;
                })
                .join("") +
            `</div></div>`;

        c.innerHTML = html;
        bG = document.getElementById("bloco-galeria");
        bP = document.getElementById("bloco-produtos");
        const r = document.querySelector(
            `input[name="opt-exibicao"][value="${tipo}"]`,
        );
        if (r) r.checked = true;
    }
    if (bG)
        bG.style.display =
            tipo === "galeria" || tipo === "ambos" ? "block" : "none";
    if (bP)
        bP.style.display =
            tipo === "produtos" || tipo === "ambos" ? "block" : "none";
};

window.salvarConteudoHome = async function () {
    const btn = document.querySelector("button[onclick='salvarConteudoHome()']");
    if (btn) {
        btn.innerText = "Publicando...";
        btn.disabled = true;
    }
    const { error } = await _supabase.from("configuracoes1").upsert({
        id: 1,
        hero_titulo: document.getElementById("cfg-hero-titulo").value,
        sobre_texto: document.getElementById("cfg-sobre-texto").value,
        end_rua: document.getElementById("cfg-end-rua").value,
        end_numero: document.getElementById("cfg-end-numero").value,
        end_cidade: document.getElementById("cfg-end-cidade").value,
        end_estado: document.getElementById("cfg-end-estado").value,
        end_cep: document.getElementById("cfg-end-cep").value,
        end_tel: document.getElementById("cfg-end-tel").value,
        mapa_iframe: document.getElementById("cfg-mapa-iframe").value,
    });
    if (error) alert("Erro: " + error.message);
    else alert("Site atualizado! 🚀");
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Atualizar Site';
        btn.disabled = false;
    }
};

window.salvarVitrineMidias = async function () {
    const btn = document.querySelector("button[onclick='salvarVitrineMidias()']");
    if (btn) btn.innerText = "Sincronizando...";
    const { data: cfg } = await _supabase
        .from("vitrine_midias")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
    const t = document.querySelector('input[name="opt-exibicao"]:checked').value;
    const update = {
        id: 1,
        tipo_exibicao: t,
        ultima_atualizacao_midia: new Date().toISOString(),
    };

    update.dados_galeria =
        t === "galeria" || t === "ambos"
            ? [1, 2, 3, 4]
                .map(
                    (i) =>
                        window[`url_link_galeria-${i}`] ||
                        (cfg?.dados_galeria ? cfg.dados_galeria[i - 1] : null),
                )
                .filter((x) => x)
            : cfg?.dados_galeria || [];
    update.dados_produtos =
        t === "produtos" || t === "ambos"
            ? [1, 2, 3, 4]
                .map((i) => {
                    const nm = document.getElementById(`p-nome-${i}`);
                    return nm && (nm.value || window[`url_link_prod-${i}`])
                        ? {
                            nome: nm.value,
                            preco: document.getElementById(`p-preco-${i}`)?.value || 0,
                            url:
                                window[`url_link_prod-${i}`] ||
                                (cfg?.dados_produtos
                                    ? cfg.dados_produtos[i - 1]?.url
                                    : null),
                        }
                        : null;
                })
                .filter((x) => x)
            : cfg?.dados_produtos || [];

    const { error } = await _supabase.from("vitrine_midias").upsert(update);
    if (error) alert("Erro: " + error.message);
    else alert("Vitrine salva! 📸");
    if (btn) btn.innerHTML = "Sincronizar Vitrine";
};

window.salvarPerfilBarbearia = async function () {
    const btn = document.querySelector(
        "button[onclick='salvarPerfilBarbearia()']",
    );
    if (btn) btn.innerText = "Salvando...";

    const { data: p } = await _supabase
        .from("dados_barbearia")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

    const { error } = await _supabase.from("dados_barbearia").upsert({
        id: 1,
        nome_proprietario: document.getElementById("prof-nome-dono")?.value || "",
        nome_empresa: document.getElementById("prof-empresa")?.value || "",
        documento: document.getElementById("prof-documento")?.value || "",
        whatsapp: document.getElementById("prof-whats")?.value || "",
        instagram: document.getElementById("prof-insta")?.value || "",
        facebook: document.getElementById("prof-facebook")?.value || "",
        link_site: document.getElementById("prof-link-site")?.value || "",
        // ADICIONE ESTA LINHA ABAIXO:
        chave_pix: document.getElementById("prof-pix")?.value || "",
        url_logo: window["url_link_logo-barbearia"] || p?.url_logo,
    });

    if (error) alert("Erro: " + error.message);
    else alert("Perfil atualizado!");
    if (btn) btn.innerHTML = '<i class="fas fa-save"></i> Salvar Dados do Perfil';
};

window.uploadMidia = async function (tipo) {
    const f = document.getElementById(`up-${tipo}`)?.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return alert("Máx 2MB.");
    const nm = `${Date.now()}-${tipo}.webp`;
    const { error } = await _supabase.storage.from("midia-home").upload(nm, f);
    if (error) return alert("Erro no upload: " + error.message);
    const { data: pb } = _supabase.storage.from("midia-home").getPublicUrl(nm);
    window[`url_link_${tipo}`] = pb.publicUrl;
    const prv = document.getElementById(`preview-${tipo}`);
    if (prv) {
        prv.src = pb.publicUrl;
        prv.style.display = "block";
    }
    alert("Upload OK!");
};

/* ==========================================================================
   ATUALIZAÇÃO 1.04 - Correção Inteligente de Vagas e Ordem de Chegada
   ========================================================================== */
window.copiarVagasInteligente = async function (periodo) {
    const agora = new Date();
    const diaSemana = periodo === "hoje" ? agora.getDay() : new Date(agora.getTime() + 86400000).getDay();
    const dataAlvo = periodo === "hoje"
        ? agora.toLocaleDateString("en-CA")
        : new Date(agora.getTime() + 86400000).toLocaleDateString("en-CA");

    // Feedback visual no botão
    const btnAtivo = document.activeElement;
    const textoOriginal = btnAtivo.innerHTML;
    btnAtivo.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Copiando...';

    try {
        // 1. Busca dados necessários
        const { data: ocupados } = await _supabase
            .from("agendamentos")
            .select("horario")
            .eq("data", dataAlvo)
            .neq("status", "cancelado");

        const { data: config } = await _supabase
            .from("configuracoes")
            .select("horarios_semana, duracao_atendimento")
            .eq("id", 1)
            .single();

        const { data: p } = await _supabase
            .from("dados_barbearia")
            .select("link_site")
            .eq("id", 1)
            .maybeSingle();

        // 2. Lógica Inteligente de Interpretação de Turnos (Proteção contra JSON)
        let vagasDisponiveis = [];

        // Isola a configuração do dia exato
        const infoDia = config?.horarios_semana?.[String(diaSemana)] || {};

        // Motor de Decisão: Lê tanto o formato antigo (Array) quanto o novo (Objeto SaaS)
        const turnosDoDia = Array.isArray(infoDia) ? infoDia : (infoDia.turnos || []);
        const isOrdemChegada = infoDia.ordemChegada === true;

        const intervalo = config?.duracao_atendimento || 30;
        const horaAtualStr = agora.getHours().toString().padStart(2, "0") + ":" + agora.getMinutes().toString().padStart(2, "0");

        if (isOrdemChegada) {
            // Se o barbeiro marcou o dia como ordem de chegada, muda a mensagem do marketing
            vagasDisponiveis.push("💈 Atendimento por *Ordem de Chegada* hoje! Venha direto para a barbearia.");
        } else {
            // Se tem horários fixos, roda o loop matemático de vagas
            turnosDoDia.forEach(turno => {
                let hLoop = turno.inicio;
                while (hLoop < turno.fim) {
                    const ocupado = ocupados?.some(a => a.horario.substring(0, 5) === hLoop);
                    const jaPassou = periodo === "hoje" && hLoop <= horaAtualStr;

                    if (!ocupado && !jaPassou) {
                        vagasDisponiveis.push(`✅ ${hLoop}`);
                    }
                    hLoop = somarMinutos(hLoop, intervalo);
                }
            });
        }

        // 3. Montagem do Texto para o WhatsApp
        const link = p?.link_site || window.location.origin;
        let texto = `✂️ *VAGAS DE ${periodo.toUpperCase()}*\n\n`;

        if (vagasDisponiveis.length === 0) {
            texto += "🚫 Agenda lotada ou horários encerrados!";
        } else if (isOrdemChegada) {
            // Imprime apenas a frase de ordem de chegada
            texto += vagasDisponiveis[0];
        } else {
            // Limita a exibição a 4 horários para não poluir o WhatsApp
            const vagasExibidas = vagasDisponiveis.slice(0, 4);
            texto += vagasExibidas.join("\n");

            if (vagasDisponiveis.length > 4) {
                texto += `\n\n➕ E mais horários disponíveis no site...`;
            }
        }

        texto += `\n\n📍 Reserve agora:\n${link}`;

        // Copia para o clipboard
        await navigator.clipboard.writeText(texto);
        alert(`Vagas de ${periodo} copiadas com sucesso! 🚀`);

    } catch (erro) {
        console.error("Erro ao gerar vagas:", erro);
        alert("Erro ao formatar os horários. Verifique as configurações do expediente.");
    } finally {
        // Restaura o botão
        btnAtivo.innerHTML = textoOriginal;
    }
};

window.gerarTextoMarketing = async function (gatilho) {
    const btnTexto = document.activeElement; // Pega o botão clicado
    const textoOriginal = btnTexto.innerHTML;
    btnTexto.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

    // 1. Busca os dados do barbeiro para trocar as tags
    const { data: p } = await _supabase
        .from("dados_barbearia")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
    const nomeBarbeiro = p?.nome_proprietario
        ? p.nome_proprietario.split(" ")[0]
        : "Barbeiro";
    const linkSite = p?.link_site || window.location.origin;

    // 2. Busca TODOS os modelos desse gatilho específico no Supabase
    const { data: templates, error } = await _supabase
        .from("templates_marketing")
        .select("texto_base")
        .eq("gatilho", gatilho);

    let textoFinal = "";

    // 3. Fallback de Segurança (Se o banco estiver vazio ou der erro)
    if (error || !templates || templates.length === 0) {
        console.warn("Banco vazio, usando modelo padrão.");
        if (gatilho === "escassez")
            textoFinal = `🚨 *Últimos horários!* O ${nomeBarbeiro} avisou que a agenda está quase lotada. Garanta a sua vaga: ${linkSite}`;
        else if (gatilho === "urgencia")
            textoFinal = `🔥 *Precisa de um corte pra hoje?* Corre que ainda dá tempo. Veja os horários: ${linkSite}`;
        else
            textoFinal = `⚔️ *Corte de respeito!* Agende com o ${nomeBarbeiro} e garanta o melhor visual. Link: ${linkSite}`;
    } else {
        // 4. Sorteia 1 mensagem aleatória dentre as 30 cadastradas
        const sorteado = templates[Math.floor(Math.random() * templates.length)];

        // 5. Troca as Tags pelas informações reais
        textoFinal = sorteado.texto_base
            .replace(/\[NOME\]/g, nomeBarbeiro)
            .replace(/\[LINK\]/g, linkSite);
    }

    // Trava de segurança para Status (Max 700 chars)
    if (textoFinal.length > 700)
        textoFinal = textoFinal.substring(0, 695) + "...";

    // Copia para a área de transferência
    navigator.clipboard.writeText(textoFinal).then(() => {
        btnTexto.innerHTML = textoOriginal;
        alert(`Gatilho de ${gatilho} copiado e pronto para o WhatsApp! 🚀`);
    });
};

/* 
==========================================================================
   10. UTILITÁRIOS E ARRANQUE DO SISTEMA
   ========================================================================== */
function somarMinutos(hora, min) {
    let [h, m] = hora.split(":").map(Number);
    m += parseInt(min);
    if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
    }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

window.enviarLembrete = (tel, nome, dISO, hora) => {
    if (!tel) return alert("Sem telefone!");

    const num = tel.replace(/\D/g, "");
    const ddi = num.startsWith("55") ? "" : "55";
    const numeroCompleto = `${ddi}${num}`;

    const chavePix =
        document.getElementById("prof-pix")?.value ||
        window.dadosBarbeariaGlobal?.chave_pix ||
        "[Chave não informada]";

    const nomeBarbeiro =
        window.dadosBarbeariaGlobal?.nome_proprietario || "Barbeiro";
    const dataBr = dISO ? dISO.split("-").reverse().join("/") : "";
    const horaBr = hora ? hora.substring(0, 5) : "";

    const txt = `✅ *AGENDAMENTO CONFIRMADO*

Olá, ${nome}! Tudo bem? 
Seu horário foi reservado com sucesso! ✂️

📅 *Data:* ${dataBr}
⏰ *Horário:* ${horaBr}h

💳 Formas de pagamento aceitas: PIX, cartão e dinheiro.

Caso prefira realizar o pagamento antecipado via PIX, segue a chave abaixo:

🔑 *Chave PIX:* ${chavePix}

📌 Se fizer o pagamento antecipado, basta me enviar o comprovante por aqui 😊

Obrigado pela preferência! Será um prazer te atender.


Assim que fizer, me envie o comprovante por aqui. Obrigado!`;

    const mensagem = encodeURIComponent(txt);

    // 🚀 A MÁGICA PARA ANDROID: Forçando o pacote do Business (w4b)
    // Essa estrutura é a correta para disparar o app específico
    const intentUrl = `intent://send?phone=${numeroCompleto}&text=${mensagem}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;

    // Plano B: Se o barbeiro estiver no computador (WhatsApp Web)
    const webUrl = `https://web.whatsapp.com/send?phone=${numeroCompleto}&text=${mensagem}`;

    // Detecta se é mobile (Android)
    if (/Android/i.test(navigator.userAgent)) {
        window.location.href = intentUrl;
    } else {
        // Se for PC ou iPhone, usa o link padrão
        window.open(
            `https://api.whatsapp.com/send?phone=${numeroCompleto}&text=${mensagem}`,
            "_blank",
        );
    }
};

/* ==========================================================================
   ATUALIZAÇÃO V1.10 - Registo de Dispositivos para Push Notifications
   ========================================================================== */

// Função auxiliar para converter a Chave VAPID exigida pelo Google/Apple
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

window.ativarNotificacoesPush = async function () {
    const btn = document.getElementById("btn-ativar-push");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A ligar satélites...';
    btn.disabled = true;

    try {
        // 1. Verifica se o navegador suporta a tecnologia
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            throw new Error("O teu navegador ou telemóvel não suporta notificações Push em segundo plano.");
        }

        // 2. Pede a permissão ao barbeiro (Aparece aquele pop-up "Deseja permitir notificações?")
        const permissao = await Notification.requestPermission();
        if (permissao !== 'granted') {
            throw new Error("Permissão negada. Precisas de autorizar as notificações nas definições do telemóvel.");
        }

        // 3. Obtém o Service Worker atual
        const registoSW = await navigator.serviceWorker.ready;

        // COLA A TUA CHAVE PÚBLICA AQUI DENTRO (Não uses a privada!)
        const CHAVE_PUBLICA_VAPID = "BHU3N0EE3mt78aRtRIhu_UXJsQGj6Ulu_0ZwEj5tgnO6NPIGDtyYaEDkiRP6XDWV93L4Jy2zKfQvhDI3zgil3WU";

        // 4. Cria a subscrição com o servidor do Google/Apple
        const subscricao = await registoSW.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(CHAVE_PUBLICA_VAPID)
        });

        // 5. Guarda o "endereço de entrega" (subscrição) no Supabase
        const { error } = await _supabase
            .from("inscricoes_push")
            .insert([{ subscricao: subscricao }]);

        if (error) throw error;

        alert("✅ Notificações ativadas com sucesso! Agora podes bloquear o telemóvel e serás avisado.");
        btn.innerHTML = '<i class="fas fa-check"></i> Satélite Ligado';
        btn.style.backgroundColor = "var(--cor-subtexto)"; // Fica cinzento para mostrar que já está ativo

    } catch (erro) {
        console.error("Erro ao ativar Push:", erro);
        alert("Erro: " + erro.message);
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
};

/* ==========================================================================
   10.1 UTILITÁRIOS E MOTOR DE ARRANQUE (ATUALIZAÇÃO FINAL 14/05/2026 - Versão 1.01)
   ========================================================================== */

window.addEventListener("load", async () => {
    console.log("🚀 Sistema ClientFlow Inicializado - Versão 1.01");

    // 1. Modal de Atendimento Rápido (Setup)
    const m = document.getElementById("modal-agendamento");
    const btnNovo = document.getElementById("btn-novo-agendamento");
    const btnFechar = document.getElementById("fechar-modal");

    if (btnNovo) btnNovo.onclick = () => { m.style.display = "block"; };
    if (btnFechar) btnFechar.onclick = () => { m.style.display = "none"; };
    window.onclick = (e) => { if (e.target == m) m.style.display = "none"; };

    // 2. Máscara Telefone Modal
    const tel = document.getElementById("rapido-telefone");
    if (tel) {
        tel.addEventListener("input", (e) => {
            let v = e.target.value.replace(/\D/g, "");
            if (v.length > 11) v = v.substring(0, 11);
            if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
            if (v.length > 9) v = `${v.substring(0, 10)}-${v.substring(10)}`;
            e.target.value = v;
        });
    }

    // 3. Carrega Serviços no Modal
    const { data: srvs } = await _supabase
        .from("servicos")
        .select("nome, preco")
        .order("nome");
    const sel = document.getElementById("rapido-servico");
    if (sel && srvs) {
        sel.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>' +
            srvs.map((s) => `<option value="${s.nome}">${s.nome} - R$ ${s.preco}</option>`).join("");
    }

    // 4. Carrega Meta Diária Inicial
    const { data: cfgMeta } = await _supabase
        .from("configuracoes")
        .select("meta_diaria")
        .eq("id", 1)
        .single();
    if (cfgMeta && document.getElementById("cfg-meta-valor")) {
        document.getElementById("cfg-meta-valor").value = cfgMeta.meta_diaria;
        localStorage.setItem("metaDiaria", cfgMeta.meta_diaria);
    }

    // 5. INICIALIZAÇÃO DE DADOS E PERSISTÊNCIA (ATUALIZADO V1.02 - 16/05/2026)
    await inicializarDadosBarbearia();
    await recalcularFaturamentoDoDia();

    // CORREÇÃO V1.02: Força o sistema a carregar sempre o Dashboard no arranque, limpando a trava antiga
    localStorage.setItem("ultimaAbaClientFlow", "Dashboard");
    await carregarAgendamentosDoDia();
    if (typeof atualizarProgressoMeta === "function") atualizarProgressoMeta();

    // Garante que a interface visual mude os menus e exiba a tela inicial
    if (typeof executarNavegacao === "function") {
        executarNavegacao("Dashboard");
    }

    // 6. ESCUTA REALTIME COM ALERTA SONORO (Versão 1.01)
    // Substitua pelo seu link público do Storage do Supabase
    const somNotificacao = new Audio('https://qposfoxkszlxdmcrabbx.supabase.co/storage/v1/object/public/notificacoes/alerta.mp3');

    const canalAgendamentos = _supabase
        .channel('agendamentos-realtime')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'agendamentos'
        }, payload => {
            console.log('⚡ Realtime: Novo agendamento detectado!');

            // DISPARA O SOM ÚNICO (Requer interação prévia do usuário na tela)
            somNotificacao.play().catch(e => console.log("Áudio aguardando interação inicial."));

            const abaAtual = localStorage.getItem("ultimaAbaClientFlow");
            if (!abaAtual || abaAtual === "Dashboard") {
                carregarAgendamentosDoDia();
                recalcularFaturamentoDoDia();
                atualizarProgressoMeta();
            }
        })
        .subscribe();

    // 7. ROTINA DE AUTO-REFRESH DE SEGURANÇA (10 MINUTOS)
    const DEZ_MINUTOS = 10 * 60 * 1000;
    setInterval(async () => {
        const abaAtual = localStorage.getItem("ultimaAbaClientFlow");
        if (!abaAtual || abaAtual === "Dashboard") {
            console.log("🔄 Auto-Refresh 1.01: Sincronização periódica...");
            await carregarAgendamentosDoDia();
            await recalcularFaturamentoDoDia();
            atualizarProgressoMeta();
        }
    }, DEZ_MINUTOS);

    console.log("⏱️ Monitoramento Realtime, Alerta Sonoro e Intervalo ativados.");
});