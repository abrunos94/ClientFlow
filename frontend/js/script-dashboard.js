/**
 * ClientFlow - Dashboard Administrativo
 * Integrado com Supabase - Versão Final e Estável
 */

/* ==========================================================================
   1. SEGURANÇA E CONEXÃO (Executa Imediatamente)
   ========================================================================== */
if (localStorage.getItem("logado") !== "true") {
    window.location.href = "login.html";
}

const SUPABASE_URL = "https://cvvixgkiqljpamvnjzzj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dml4Z2tpcWxqcGFtdm5qenpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzkwOTEsImV4cCI6MjA5MDAxNTA5MX0.TfvzM_f-RxbOPIui2EHLYi2i3_dvFjWuE6XzoqQr2WM";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const listaAgendamentos = document.getElementById("lista-agendamentos");
const secoes = {
    home: document.getElementById("conteudo-dashboard"),
    agenda: document.getElementById("secao-agenda-completa"),
    configs: document.getElementById("configuracoes-section"),
    clientes: document.getElementById("secao-clientes"),
    relatorios: document.getElementById("secao-relatorios"),
};
let chartFaturamento = null; // Variável para controlar a instância do gráfico

/* ==========================================================================
    2. NAVEGAÇÃO E UI 
   ========================================================================== */

// 1. Função para esconder todas as telas principais
function esconderTodasSessoes() {
    Object.values(secoes).forEach((s) => {
        if (s) s.style.display = "none";
    });
    // Remove o 'active' dos links principais da sidebar
    document.querySelectorAll(".menu a").forEach((a) => a.classList.remove("active"));
}

// 2. ESCUTA INDEPENDENTE PARA O BOTÃO DE SAIR (ID: btn-logout)
// Como ele é um <button> e não um <a>, tratamos ele aqui:
const btnSair = document.getElementById("btn-logout");
if (btnSair) {
    btnSair.onclick = function () {
        if (confirm("Deseja realmente sair do ClientFlow?")) {
            localStorage.removeItem("logado");
            window.location.href = "index.html";
        }
    };
}

// 3. Lógica para ABRIR/FECHAR o Submenu (Configurações)
const btnConfig = document.getElementById("btn-config-master");
const gaveta = document.getElementById("submenu-links");

if (btnConfig && gaveta) {
    btnConfig.onclick = function (e) {
        e.preventDefault();
        gaveta.classList.toggle("active");
        btnConfig.classList.toggle("open"); // Gira a setinha
    };
}
// 1. Lógica para abrir/fechar o Dropdown de Relatórios [cite: 2026-04-03]
const btnRelatorioMaster = document.getElementById("btn-relatorio-master");
const gavetaRelatorios = document.getElementById("submenu-relatorios");

if (btnRelatorioMaster && gavetaRelatorios) {
    btnRelatorioMaster.onclick = function (e) {
        e.preventDefault();
        gavetaRelatorios.classList.toggle("active");
        btnRelatorioMaster.classList.toggle("open");
    };
}

// Lógica para o novo Dropdown de Configurações Gerais [cite: 2026-04-26]
const btnConfigGeralMaster = document.getElementById("btn-config-geral-master");
const gavetaConfigGeral = document.getElementById("submenu-config-geral");

if (btnConfigGeralMaster && gavetaConfigGeral) {
    btnConfigGeralMaster.onclick = function (e) {
        e.preventDefault();
        gavetaConfigGeral.classList.toggle("active");
        btnConfigGeralMaster.classList.toggle("open");
    };
}


// 2. Função para alternar entre Resultados e Desempenho [cite: 2026-04-03]
// 2. Função para alternar entre Resultados e Desempenho com FOCUS MODE [cite: 2026-04-03]
window.abrirSubRelatorio = function (tipo) {
    // 1. Limpa as outras telas (Agenda, Clientes, etc)
    esconderTodasSessoes();

    // 2. Garante que a seção principal de relatórios esteja visível
    secoes.relatorios.style.display = "block";

    // --- LOGICA FOCUS MODE (Reaproveitando sua ideia original) ---
    const headerPrincipal = document.getElementById("header-principal");
    const painelConquista = document.getElementById("painel-conquista");

    // Escondemos o topo para ganhar tela para os dados [cite: 2026-04-03]
    if (headerPrincipal) headerPrincipal.style.display = "none";
    if (painelConquista) painelConquista.style.display = "none";

    // 3. Esconde as sub-áreas internas dos relatórios antes de mostrar a correta
    document.querySelectorAll('.relatorio-sub-section').forEach(area => area.style.display = 'none');

    const titulo = document.getElementById("titulo-sub-relatorio");

    if (tipo === 'resultados') {
        document.getElementById("area-resultados").style.display = "block";
        // Removido "Relatório: "
        if (titulo) titulo.innerText = "Resultados";
    } else if (tipo === 'desempenho') {
        document.getElementById("area-desempenho").style.display = "block";
        // Removido "Relatório: "
        if (titulo) titulo.innerText = "Desempenho";
    }

    // 4. Dispara a atualização dos dados (importante para carregar o gráfico ou os cards)
    const filtroAtivo = document.getElementById("filtro-periodo-relatorio");
    const dias = filtroAtivo ? parseInt(filtroAtivo.value) : 30;

    if (typeof inicializarRelatorios === "function") {
        inicializarRelatorios(dias);
    }
};
/* ==========================================================================
    2.1 LÓGICA DO MENU MOBILE (ABRIR / FECHAR)
   ========================================================================== */

const btnAbrirMenu = document.getElementById("abrir-menu");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

if (btnAbrirMenu && sidebar && overlay) {
    // 1. ABRE o menu lateral
    btnAbrirMenu.onclick = () => {
        sidebar.classList.add("active");
        overlay.classList.add("active");
    };

    // 2. FECHA ao clicar no fundo escuro (overlay)
    overlay.onclick = () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    };

    // 3. LÓGICA INTELIGENTE DE FECHAMENTO AUTOMÁTICO
    document.querySelectorAll(".menu a, .submenu a").forEach(link => {
        link.addEventListener("click", () => {
            // AJUSTE: Não fecha o menu se o usuário clicar em um botão de abrir submenu [cite: 2026-04-03]
            const ehBotaoMestre = link.id === "btn-config-master" || link.id === "btn-relatorio-master";
            if (ehBotaoMestre) return;

            // Se for um link comum (Dashboard, Agenda, Resultados, etc), fecha no mobile
            if (window.innerWidth <= 768) {
                sidebar.classList.remove("active");
                overlay.classList.remove("active");
            }
        });
    });
}

/* ==========================================================================
    2.2 NAVEGAÇÃO ENTRE ABAS PRINCIPAIS (DASHBOARD, AGENDA, CLIENTES)
   ========================================================================== */

document.querySelectorAll(".menu > a, .menu .btn-dropdown").forEach((link) => {
    link.addEventListener("click", (e) => {
        // Ignora botões que são apenas para abrir submenus ou sair
        const ehApenasGaveta = link.id === "btn-logout" ||
            link.id === "btn-config-master" ||
            link.id === "btn-relatorio-master";

        if (ehApenasGaveta) return;

        e.preventDefault(); // Impede o pulo da página
        esconderTodasSessoes();
        link.classList.add("active");

        const texto = link.innerText.trim();
        const headerPrincipal = document.getElementById("header-principal");
        const painelConquista = document.getElementById("painel-conquista");

        // --- LÓGICA DE EXIBIÇÃO POR TELA ---
        if (texto.includes("Dashboard")) {
            // MODO COMPLETO: Mostra cabeçalho e progresso da meta
            if (headerPrincipal) headerPrincipal.style.display = "flex";
            if (painelConquista) painelConquista.style.display = "block";
            secoes.home.style.display = "block";
            carregarAgendamentosDoDia();
        }
        else if (link.id === "link-relatorios" || link.closest('#submenu-relatorios')) {
            // FOCUS MODE: Esconde o topo para focar nos gráficos e relatórios [cite: 2026-04-03]
            if (headerPrincipal) headerPrincipal.style.display = "none";
            if (painelConquista) painelConquista.style.display = "none";
            secoes.relatorios.style.display = "block";

            if (typeof inicializarRelatorios === "function") inicializarRelatorios();
        }
        else {
            // TELAS SECUNDÁRIAS: Mostra apenas o header
            if (headerPrincipal) headerPrincipal.style.display = "flex";
            if (painelConquista) painelConquista.style.display = "none";

            if (texto.includes("Agenda")) {
                secoes.agenda.style.display = "block";
                inicializarAgenda();
            } else if (texto.includes("Clientes")) {
                secoes.clientes.style.display = "block";
                renderizarListaClientes();
            }
        }
    });
});

/* ==========================================================================
    2.3 GESTÃO DO MODAL DE AGENDAMENTO
   ========================================================================== */

const modalAgendamento = document.getElementById("modal-agendamento");
const btnAbrirModal = document.getElementById("btn-novo-agendamento");
const btnFecharModal = document.getElementById("fechar-modal");

if (btnAbrirModal) {
    btnAbrirModal.onclick = () => modalAgendamento.style.display = "block";
}

if (btnFecharModal) {
    btnFecharModal.onclick = () => modalAgendamento.style.display = "none";
}

// Fecha o modal ao clicar fora dele
window.addEventListener("click", (event) => {
    if (event.target == modalAgendamento) {
        modalAgendamento.style.display = "none";
    }
});


/* ==========================================================================
   3. GESTÃO DE AGENDAMENTOS (HOME)
   ========================================================================== */
async function carregarAgendamentosDoDia() {
    if (!listaAgendamentos) return;
    const hoje = new Date().toLocaleDateString("en-CA");

    const { data: agendamentos, error } = await _supabase
        .from("agendamentos")
        .select("*")
        .eq("data", hoje)
        .neq("status", "cancelado")
        .order("horario", { ascending: true });

    if (error) return console.error("Erro Supabase:", error.message);

    listaAgendamentos.innerHTML = "";

    if (!agendamentos || agendamentos.length === 0) {
        listaAgendamentos.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum agendamento para hoje.</td></tr>';
        atualizarCardsEstatisticas([]);
    } else {
        agendamentos.forEach((ag) => {
            const horaFormatada = String(ag.horario).substring(0, 5);
            const linha = document.createElement("tr");
            linha.innerHTML = `
                <td>${horaFormatada}h</td>
                <td><strong>${ag.cliente_nome}</strong></td>
                <td class="hide-mobile">${ag.servico}</td>
                <td>
                    <div class="acoes-buttons">
                        <button class="btn-whatsapp" onclick="enviarLembrete('${ag.telefone}', '${ag.cliente_nome}', '${ag.data}', '${ag.horario}')"title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn-concluir" onclick="mudarStatusAgendamento('${ag.id}', 'concluido', ${ag.valor || 0})" title="Concluir"><i class="fas fa-check"></i></button>
                        <button class="btn-cancelar" onclick="mudarStatusAgendamento('${ag.id}', 'cancelado')" title="Cancelar"><i class="fas fa-times"></i></button>
                    </div>
                </td>`;
            listaAgendamentos.appendChild(linha);
        });
        atualizarCardsEstatisticas(agendamentos);
    }
    const cont = document.getElementById("total-hoje");
    if (cont) cont.innerText = agendamentos ? agendamentos.length : 0;
}

function atualizarCardsEstatisticas(agendamentos) {
    const elProximo = document.getElementById("proximo-horario-valor");
    const elServicoVendido = document.getElementById("servico-mais-vendido");

    if (!agendamentos || agendamentos.length === 0) {
        if (elProximo) elProximo.innerText = "--:--";
        return;
    }

    const agora = new Date();
    const horaAtualStr = agora.getHours().toString().padStart(2, "0") + ":" + agora.getMinutes().toString().padStart(2, "0");

    const proximos = agendamentos.filter((ag) => {
        const horaBanco = String(ag.horario || "").substring(0, 5);
        return horaBanco >= horaAtualStr && String(ag.status).toLowerCase() === "pendente";
    });

    if (elProximo) {
        if (proximos.length > 0) {
            proximos.sort((a, b) => a.horario.localeCompare(b.horario));
            elProximo.innerText = proximos[0].horario.substring(0, 5) + "h";
        } else {
            elProximo.innerText = "Encerrado";
        }
    }

    const contagem = {};
    agendamentos.forEach((ag) => { if (ag.servico) contagem[ag.servico] = (contagem[ag.servico] || 0) + 1; });
    const chaves = Object.keys(contagem);
    if (chaves.length > 0 && elServicoVendido) {
        elServicoVendido.innerText = chaves.reduce((a, b) => contagem[a] > contagem[b] ? a : b);
    }
}

window.mudarStatusAgendamento = async function (id, novoStatus) {
    if (!confirm(`Deseja marcar como ${novoStatus}?`)) return;

    // 1. Apenas atualiza o status no Supabase
    const { error } = await _supabase
        .from("agendamentos")
        .update({ status: novoStatus })
        .eq("id", id);

    if (error) return alert("Erro: " + error.message);

    // 2. Em vez de fazer conta aqui, chamamos o "Cérebro" para atualizar o total
    await recalcularFaturamentoDoDia();

    // 3. Atualiza a lista na tela
    carregarAgendamentosDoDia();
};

/* ==========================================================================
   4. GESTÃO DE SERVIÇOS
   ========================================================================== */
async function renderizarConfigServicos() {
    const container = document.getElementById("lista-servicos-config");
    if (!container) return;
    const { data: servicos, error } = await _supabase.from("servicos").select("*").order("nome");
    if (error) return;

    container.innerHTML = "<h4 style='color:#fff; margin-bottom:10px;'>Serviços Ativos:</h4>";
    if (servicos && servicos.length > 0) {
        servicos.forEach((s) => {
            container.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:8px;">
                    <span>${s.nome} - <strong>R$ ${s.preco}</strong></span>
                    <button onclick="excluirServico('${s.id}')" style="background:none; border:none; color:#ff4d4d; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>`;
        });
    } else {
        container.innerHTML += "<p style='color:var(--cor-subtexto);'>Nenhum serviço cadastrado.</p>";
    }
}

async function adicionarNovoServico(e) {
    if (e) e.preventDefault(); // Evita recarregar a página

    const inputNome = document.getElementById("cfg-servico-nome");
    const inputPreco = document.getElementById("cfg-servico-preco");

    const nome = inputNome.value;
    const preco = inputPreco.value;

    if (!nome || !preco) return alert("Preencha o nome e o preço do serviço!");

    console.log("Saving service:", { nome, preco });

    // 1. ENVIANDO PARA O SUPABASE
    const { error } = await _supabase
        .from("servicos")
        .insert([{ nome: nome, preco: parseFloat(preco) }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        // 2. LIMPEZA MANUAL (Resolve o erro do 'reset')
        inputNome.value = "";
        inputPreco.value = "";

        // 3. ATUALIZAÇÃO DA LISTA (Faz aparecer na hora sem F5)
        await renderizarConfigServicos();

        alert("Serviço adicionado com sucesso!");
    }
}
window.excluirServico = async function (id) {
    if (!confirm("Excluir serviço?")) return;
    await _supabase.from("servicos").delete().eq("id", id);
    renderizarConfigServicos();
};

/* ==========================================================================
   5. CALENDÁRIO INTERATIVO
   ========================================================================== */

let dataCalendario = new Date();

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

    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    mesDisplay.innerText = `${meses[dataCalendario.getMonth()]} ${dataCalendario.getFullYear()}`;
    grade.innerHTML = "";

    const ano = dataCalendario.getFullYear();
    const mes = dataCalendario.getMonth();
    const primeiroDiaMes = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();

    const { data: agendamentosMes } = await _supabase.from('agendamentos').select('data')
        .gte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-01`)
        .lte('data', `${ano}-${String(mes + 1).padStart(2, '0')}-${diasNoMes}`);

    const diasComAgenda = new Set(agendamentosMes?.map(a => a.data));

    for (let i = 0; i < primeiroDiaMes; i++) grade.innerHTML += `<div></div>`;

    for (let dia = 1; dia <= diasNoMes; dia++) {
        const dataFormatada = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const diaElemento = document.createElement("div");
        diaElemento.className = `dia-item ${diasComAgenda.has(dataFormatada) ? 'tem-marcacao' : ''}`;
        diaElemento.innerText = dia;
        diaElemento.onclick = () => selecionarDiaAgenda(dataFormatada, diaElemento);
        grade.appendChild(diaElemento);
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

    const { data: agendamentos } = await _supabase.from('agendamentos').select('*').eq('data', dataISO).neq('status', 'cancelado').order('horario');

    if (!agendamentos || agendamentos.length === 0) {
        lista.innerHTML = "<p style='text-align:center; margin-top:20px; color:var(--cor-subtexto);'>Nenhum agendamento.</p>";
        return;
    }

    lista.innerHTML = "";
    agendamentos.forEach(ag => {
        const item = document.createElement("div");
        item.className = "item-agenda-lista";
        item.innerHTML = `
            <div class="hora-tag">${String(ag.horario).substring(0, 5)}h</div>
            <div class="info-tag"><strong>${ag.cliente_nome}</strong><span>${ag.servico}</span></div>
            <div class="status-tag ${ag.status.toLowerCase()}">${ag.status}</div>`;
        lista.appendChild(item);
    });
}

/* ==========================================================================
   6. GESTÃO DE CLIENTES (VIEW SUPABASE/SQL)
   ========================================================================== */
async function renderizarListaClientes() {
    const corpoTabela = document.getElementById("corpo-tabela-clientes");
    if (!corpoTabela) return;
    corpoTabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Carregando...</td></tr>';

    const { data: clientes, error } = await _supabase.from('lista_clientes_resumo').select('*').order('cliente_nome');
    if (error) return corpoTabela.innerHTML = '<tr><td colspan="4">Erro ao carregar dados.</td></tr>';

    corpoTabela.innerHTML = "";
    if (!clientes || clientes.length === 0) {
        corpoTabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum cliente.</td></tr>';
        return;
    }

    clientes.forEach(c => {
        const dataVisita = c.data_ultima_visita ? new Date(c.data_ultima_visita).toLocaleDateString('pt-BR') : "---";
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td><strong>${c.cliente_nome}</strong></td>
            <td>${c.ultimo_servico || '---'} <br><small style="color:var(--cor-subtexto)">Último em: ${dataVisita}</small></td>
            <td>${c.telefone || '---'}</td>
            <td>
                <div class="acoes-buttons">
                    <button class="btn-whatsapp" onclick="enviarLembrete('${c.telefone}', '${c.cliente_nome}')"><i class="fab fa-whatsapp"></i></button>
                   <button class="btn-concluir" style="background:#3498db" onclick="abrirDetalhesCliente('${c.telefone}', '${c.cliente_nome}')">
                   <i class="fas fa-eye"></i>
                   </button>
                </div>
            </td>`;
        corpoTabela.appendChild(linha);
    });
}

window.filtrarClientes = function () {
    const termo = document.getElementById("busca-cliente").value.toLowerCase();
    document.querySelectorAll("#corpo-tabela-clientes tr").forEach(linha => {
        linha.style.display = linha.innerText.toLowerCase().includes(termo) ? "" : "none";
    });
};

/* ==========================================================================
   7. FINANCEIRO E UTILITÁRIOS
   ========================================================================== */
function atualizarProgressoMeta() {
    // 1. Pegar valores e garantir que são números (evita o erro do NaN)
    const meta = parseFloat(localStorage.getItem("metaDiaria")) || 400;
    const faturado = parseFloat(localStorage.getItem("faturamentoHoje")) || 0;

    // 2. Calcular porcentagem
    const porc = (faturado / meta) * 100;

    console.log(`📊 Progresso: R$${faturado} de R$${meta} (${porc.toFixed(2)}%)`);

    // 3. Mapear elementos pelos IDs exatos do seu HTML
    const elFrase = document.getElementById("frase-progresso");
    const elMetaDisplay = document.getElementById("meta-valor-display");
    const elFaturadoReal = document.getElementById("faturamento-real");
    const elBarraFill = document.getElementById("barra-progresso-fill");

    // 4. Atualizar a tela
    if (elMetaDisplay) elMetaDisplay.innerText = `R$ ${meta.toFixed(2).replace(".", ",")}`;
    if (elFaturadoReal) elFaturadoReal.innerText = `R$ ${faturado.toFixed(2).replace(".", ",")}`;

    if (elBarraFill) {
        // Limita a barra em 100% visualmente
        elBarraFill.style.width = `${Math.min(porc, 100)}%`;
    }

    // 5. CHECAGEM DA META (GAMIFICAÇÃO)
    if (porc >= 100) {
        console.log("🏆 META BATIDA!");
        if (elFrase) elFrase.innerText = "Meta batida! Você é fera! 🏆";
        if (elBarraFill) elBarraFill.style.background = "linear-gradient(90deg, #FFD700, #FFA500)";

        // Disparar confete apenas se a biblioteca existir e se ainda não disparou hoje
        if (typeof confetti === "function" && sessionStorage.getItem("confeteDisparado") !== "true") {
            dispararConfete();
            sessionStorage.setItem("confeteDisparado", "true");
        }
    } else {
        if (elFrase) elFrase.innerText = "Sua jornada de hoje começou! 🚀";
        if (elBarraFill) elBarraFill.style.background = "var(--cor-primaria)";
        // Reseta o disparador se o valor cair abaixo da meta (opcional)
        sessionStorage.removeItem("confeteDisparado");
    }
}

// Função do efeito de explosão (Duração de 2 segundos)
function dispararConfete() {
    var end = Date.now() + (2 * 1000);
    var colors = ['#ce9e62', '#ffffff', '#D4AF37']; // Cores da sua marca

    (function frame() {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

/* ==========================================================================
    7.1 - GESTÃO DE WHATSAPP (CONFIRMAÇÃO VS CONTATO DIRETO) [cite: 2026-04-25]
   ========================================================================== */

window.enviarLembrete = (tel, nome, dataISO, hora) => {
    if (!tel) return alert("Sem telefone cadastrado!");

    // 1. Limpeza do número para o link do WhatsApp
    const numLimpo = tel.replace(/\D/g, "");
    const ddi = numLimpo.startsWith("55") ? "" : "55";

    // 2. LÓGICA DE DECISÃO [cite: 2026-04-25]
    if (dataISO && hora) {
        // --- CASO A: Dashboard (Confirmação de Agendamento) ---
        // Aqui usamos a data e hora que você passa na tabela da Home
        const [ano, mes, dia] = dataISO.split("-");
        const dataBR = `${dia}/${mes}`;

        const texto =
            `Ola, ${nome}!\n\n` +
            `Seu agendamento foi confirmado com sucesso no ClientFlow.\n` +
            `Data: ${dataBR}\n` +
            `Horario: ${hora.substring(0, 5)}h\n\n` +
            `Atencao: Pedimos que chegue com 5 minutos de antecedencia.\n` +
            `Obrigado pela preferencia!`;

        const mensagemUrl = encodeURIComponent(texto);
        window.open(`https://wa.me/${ddi}${numLimpo}?text=${mensagemUrl}`, "_blank");
    } else {
        // --- CASO B: Aba Clientes (Contato Direto sem Sugestão) ---
        // Abre apenas o chat direto com o número, sem parâmetro de texto [cite: 2026-04-25]
        window.open(`https://wa.me/${ddi}${numLimpo}`, "_blank");
    }
};

/* ==========================================================================
    7.2 - Calculo Faturamento
   ========================================================================== */

async function recalcularFaturamentoDoDia() {
    const hoje = new Date().toLocaleDateString("en-CA"); // Formato YYYY-MM-DD

    // 1. Busca todos os valores de serviços concluídos hoje
    const { data, error } = await _supabase
        .from("agendamentos")
        .select("valor")
        .eq("data", hoje)
        .eq("status", "concluido");

    if (error) {
        console.error("Erro ao recalcular faturamento:", error.message);
        return;
    }

    // 2. Soma os valores (ou define 0 se não houver nada)
    const totalReal = data.reduce((acc, item) => acc + (parseFloat(item.valor) || 0), 0);

    // 3. Atualiza o LocalStorage apenas para a barra de progresso ler na hora
    localStorage.setItem("faturamentoHoje", totalReal.toString());

    // 4. Avisa a barra de progresso para se atualizar
    atualizarProgressoMeta();
}
/* ==========================================================================
    8. FUNÇÕES DE CONFIGURAÇÃO (Globais)
   ========================================================================== */

// Função para alternar entre as sub-abas (Expediente, Meta, Serviços)
window.abrirSubConfig = function (tipo) {
    console.log("🔧 Ativando aba:", tipo);

    // 1. Esconde TUDO (Dashboard, Agenda, Clientes, etc)
    esconderTodasSessoes();

    // 2. Garante que a seção MÃE das configurações apareça
    const paiConfig = document.getElementById("configuracoes-section");
    if (paiConfig) {
        paiConfig.style.display = "block";
    }

    // 3. Esconde todas as sub-seções de configuração primeiro
    document.querySelectorAll('.config-sub-section').forEach(section => {
        section.style.display = 'none';
    });

    // 4. Mapeia os IDs e liga o escolhido
    const areas = {
        'expediente': 'area-expediente',
        'meta': 'area-meta',
        'servicos': 'area-servicos'
    };

    const elementoAlvo = document.getElementById(areas[tipo]);
    if (elementoAlvo) {
        elementoAlvo.style.display = "block"; // Força aparecer
        console.log("✅ Seção visível:", areas[tipo]);
    }
};

// Função para Salvar o Expediente no subapase
window.salvarConfiguracoes = async function () {
    // 1. Referência do botão para dar feedback visual
    const btn = document.querySelector("button[onclick='salvarConfiguracoes()']");
    const textoOriginal = btn.innerHTML;
    btn.innerText = "Salvando no Banco...";
    btn.disabled = true;

    // 2. Coleta os dados do formulário usando os nomes das colunas do Supabase
    const dadosParaSincronizar = {
        id: 1, // ID fixo para sua configuração
        hora_inicio: document.getElementById("cfg-hora-inicio").value,
        hora_fim: document.getElementById("cfg-hora-fim").value,
        intervalo: parseInt(document.getElementById("cfg-intervalo").value),
        almoco_inicio: document.getElementById("cfg-almoco-inicio").value,
        almoco_fim: document.getElementById("cfg-almoco-fim").value,
        dias_trabalhados: Array.from(document.querySelectorAll(".cfg-dia:checked")).map(cb => parseInt(cb.value)),
        meta_diaria: parseFloat(document.getElementById("cfg-meta-valor")?.value || 400)
    };

    console.log("📤 Enviando para o Supabase:", dadosParaSincronizar);

    // 3. Envia para o Supabase (UPSERT: Insere ou Atualiza se já existir)
    const { error } = await _supabase
        .from('configuracoes')
        .upsert(dadosParaSincronizar);

    if (error) {
        console.error("❌ Erro ao salvar:", error);
        alert("Erro ao sincronizar com o banco: " + error.message);
    } else {
        console.log("✅ Sincronizado com sucesso!");
        alert("Expediente atualizado com sucesso! Seus clientes já podem ver os novos horários.");
    }

    // 4. Restaura o botão
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
};

window.salvarMetaDiaria = async function () {
    const input = document.getElementById("cfg-meta-valor");
    const novoValor = parseFloat(input.value);

    if (isNaN(novoValor) || novoValor <= 0) return alert("Insira um valor válido!");

    const { error } = await _supabase
        .from('configuracoes')
        .upsert({ id: 1, meta_diaria: novoValor });

    if (error) {
        alert("Erro ao salvar meta: " + error.message);
    } else {
        localStorage.setItem("metaDiaria", novoValor); // Atualiza o "motor" da barra
        atualizarProgressoMeta(); // Atualiza a barra visualmente na hora
        alert("🎯 Meta diária atualizada!");
    }
};


/* ==========================================================================
9. INICIALIZAÇÃO ÚNICA (LOAD) - SINCRONIZADA COM SUPABASE
========================================================================== */
window.addEventListener("load", async () => {
    console.log("🚀 Painel ClientFlow Conectado.");

    // 1. Vincula botões de serviço (Previne erros de clique)
    const btnAddSrv = document.getElementById("btn-add-servico-banco");
    if (btnAddSrv) btnAddSrv.onclick = adicionarNovoServico;

    const formServico = document.getElementById("form-add-servico");
    if (formServico) formServico.onsubmit = adicionarNovoServico;

    // 2. Reset Diário de Faturamento (Mantido no LocalStorage por ser volátil)
    const hojeData = new Date().toLocaleDateString("pt-BR");
    if (localStorage.getItem("dataUltimoAcesso") !== hojeData) {
        localStorage.setItem("faturamentoHoje", "0");
        localStorage.setItem("dataUltimoAcesso", hojeData);
    }

    // 3. BUSCA CONFIGURAÇÕES REAIS DO SUPABASE
    const { data: config, error } = await _supabase
        .from('configuracoes')
        .select('*')
        .eq('id', 1)
        .single();

    if (config) {
        console.log("📂 Dados carregados do banco:", config);

        if (document.getElementById("cfg-hora-inicio")) document.getElementById("cfg-hora-inicio").value = config.hora_inicio;
        if (document.getElementById("cfg-hora-fim")) document.getElementById("cfg-hora-fim").value = config.hora_fim;
        if (document.getElementById("cfg-intervalo")) document.getElementById("cfg-intervalo").value = config.intervalo;
        if (document.getElementById("cfg-almoco-inicio")) document.getElementById("cfg-almoco-inicio").value = config.almoco_inicio;
        if (document.getElementById("cfg-almoco-fim")) document.getElementById("cfg-almoco-fim").value = config.almoco_fim;
        if (document.getElementById("cfg-meta-valor")) {
            document.getElementById("cfg-meta-valor").value = config.meta_diaria;
            localStorage.setItem("metaDiaria", config.meta_diaria);
        }

        if (config.dias_trabalhados) {
            document.querySelectorAll(".cfg-dia").forEach(cb => {
                cb.checked = config.dias_trabalhados.includes(parseInt(cb.value));
            });
        }
    }

    // Máscara para o telefone (27) 99999-9999
    const inputTel = document.getElementById('rapido-telefone');
    if (inputTel) {
        inputTel.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, "");
            if (v.length > 11) v = v.substring(0, 11);
            if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
            if (v.length > 9) v = `${v.substring(0, 10)}-${v.substring(10)}`;
            e.target.value = v;
        });
    }

    // Função para carregar os serviços no select do modal
    async function popularServicosNoModal() {
        const select = document.getElementById("rapido-servico");
        if (!select) return;

        const { data: servicos, error } = await _supabase
            .from("servicos")
            .select("nome, preco")
            .order("nome");

        if (error) return console.error("Erro ao buscar serviços:", error);

        select.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>';
        servicos.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.nome;
            opt.innerText = `${s.nome} - R$ ${s.preco}`;
            select.appendChild(opt);
        });
    }

    // 4. Chamadas Iniciais de Interface
    carregarAgendamentosDoDia();
    renderizarConfigServicos();
    atualizarProgressoMeta();
    await recalcularFaturamentoDoDia();

    // EXECUÇÃO: Busca os serviços para o modal assim que a página carrega
    await popularServicosNoModal();
});

/* ==========================================================================
   10. ATENDIMENTO RÁPIDO (FORA DO LOAD PARA SER GLOBAL)
   ========================================================================== */
window.agendarAgora = async function () {
    console.log("✂️ Registrando atendimento agora...");

    const nome = document.getElementById("rapido-nome").value;
    const servico = document.getElementById("rapido-servico").value;
    const telefone = document.getElementById("rapido-telefone").value;

    if (!nome || !servico) {
        return alert("Por favor, preencha o nome e o serviço.");
    }

    const agora = new Date();
    const dataISO = agora.toLocaleDateString("en-CA");
    const horaAtual = agora.getHours().toString().padStart(2, "0") + ":" +
        agora.getMinutes().toString().padStart(2, "0");

    // Busca o preço real do serviço no banco para a meta
    const { data: servicoInfo } = await _supabase
        .from('servicos')
        .select('preco')
        .eq('nome', servico)
        .single();

    const valorServico = servicoInfo ? servicoInfo.preco : 0;

    const { error } = await _supabase.from("agendamentos").insert([{
        cliente_nome: nome,
        servico: servico,
        telefone: telefone,
        data: dataISO,
        horario: horaAtual,
        status: 'concluido',
        valor: valorServico
    }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        document.getElementById("modal-agendamento").style.display = "none";
        document.getElementById("rapido-nome").value = "";
        document.getElementById("rapido-telefone").value = "";

        await carregarAgendamentosDoDia();
        await recalcularFaturamentoDoDia();

        alert("Atendimento registrado com sucesso! ✅");
    }
};


/* ==========================================================================
   11. LÓGICA DE RELATÓRIOS (INTELIGÊNCIA COMPARATIVA MISTA)
   ========================================================================== */

/**
 * 1. FUNÇÃO PRINCIPAL: Faz a gestão de datas, busca no banco e atualiza os cards.
 * @param {number} dias - Define o período (7, 30, 90 ou 365 dias).
 */
async function inicializarRelatorios(dias = 30) {
    console.log(`📊 Gerando inteligência comparativa: últimos ${dias} dias...`);

    const dataHoje = new Date();
    const dataFimAtual = dataHoje.toLocaleDateString("en-CA");
    let dataInicioAtual, dataInicioAnterior, dataFimAnterior;

    // 1. DEFINIÇÃO DOS PERÍODOS
    if (dias === 30) {
        dataInicioAtual = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 1);
        dataFimAnterior = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 0).toLocaleDateString("en-CA");
        dataInicioAnterior = new Date(dataHoje.getFullYear(), dataHoje.getMonth() - 1, 1);
    } else if (dias === 365) {
        dataInicioAtual = new Date(dataHoje.getFullYear(), 0, 1);
        dataFimAnterior = new Date(dataHoje.getFullYear() - 1, 11, 31).toLocaleDateString("en-CA");
        dataInicioAnterior = new Date(dataHoje.getFullYear() - 1, 0, 1);
    } else {
        dataInicioAtual = new Date();
        dataInicioAtual.setDate(dataHoje.getDate() - dias);
        dataFimAnterior = dataInicioAtual.toLocaleDateString("en-CA");
        dataInicioAnterior = new Date();
        dataInicioAnterior.setDate(dataInicioAtual.getDate() - dias);
    }

    const dataInicioAtualISO = dataInicioAtual.toLocaleDateString("en-CA");
    const dataInicioAnteriorISO = dataInicioAnterior instanceof Date ? dataInicioAnterior.toLocaleDateString("en-CA") : dataInicioAnterior;

    // 2. BUSCA NO BANCO (Período Atual e Anterior)
    const { data: agendAtuais } = await _supabase.from("agendamentos").select("*")
        .in("status", ["concluido", "cancelado"]).gte("data", dataInicioAtualISO).lte("data", dataFimAtual);

    const { data: agendAntigos } = await _supabase.from("agendamentos").select("*")
        .in("status", ["concluido", "cancelado"]).gte("data", dataInicioAnteriorISO).lte("data", dataFimAnterior);

    // 3. PROCESSAMENTO DE DADOS ATUAIS
    const concluidosAtuais = agendAtuais?.filter(a => a.status === "concluido") || [];
    const canceladosAtuais = agendAtuais?.filter(a => a.status === "cancelado") || [];
    const fatAtual = concluidosAtuais.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0);
    const atendAtual = concluidosAtuais.length;
    const ticketAtual = atendAtual > 0 ? fatAtual / atendAtual : 0;
    const taxaCompAtual = (atendAtual + canceladosAtuais.length) > 0 ? (atendAtual / (atendAtual + canceladosAtuais.length)) * 100 : 0;

    // 4. PROCESSAMENTO DE DADOS ANTERIORES (Para Comparação)
    const concluidosAntigos = agendAntigos?.filter(a => a.status === "concluido") || [];
    const canceladosAntigos = agendAntigos?.filter(a => a.status === "cancelado") || [];
    const fatAntigo = concluidosAntigos.reduce((acc, i) => acc + (parseFloat(i.valor) || 0), 0);
    const atendAntigo = concluidosAntigos.length;
    const ticketAntigo = atendAntigo > 0 ? fatAntigo / atendAntigo : 0;
    const taxaCompAntigo = (atendAntigo + canceladosAntigos.length) > 0 ? (atendAntigo / (atendAntigo + canceladosAntigos.length)) * 100 : 0;

    // 5. ATUALIZAÇÃO DA INTERFACE (Valores Principais)
    document.getElementById("rel-faturamento").innerText = `R$ ${fatAtual.toFixed(2).replace(".", ",")}`;
    document.getElementById("rel-atendimentos").innerText = atendAtual;
    document.getElementById("rel-ticket").innerText = `R$ ${ticketAtual.toFixed(2).replace(".", ",")}`;
    document.getElementById("rel-comparecimento").innerText = `${taxaCompAtual.toFixed(0)}%`;
    document.getElementById("fill-comparecimento").style.width = `${taxaCompAtual}%`;

    // 6. CÁLCULO E ATUALIZAÇÃO DAS TENDÊNCIAS (TRENDS)
    atualizarTrendUI("trend-faturamento", fatAtual, fatAntigo);
    atualizarTrendUI("trend-atendimentos", atendAtual, atendAntigo);
    atualizarTrendUI("trend-ticket", ticketAtual, ticketAntigo);
    atualizarTrendUI("trend-comparecimento", taxaCompAtual, taxaCompAntigo);

    // 7. DISPARA INSIGHTS
    renderizarGraficoEvolucao(concluidosAtuais);
    processarInsightsHorarios(concluidosAtuais);
    processarInsightsClientes(concluidosAtuais);
}

/**
 * Função Auxiliar Didática: Calcula a variação e aplica a cor/ícone correto
 */
function atualizarTrendUI(idElemento, atual, antigo) {
    const el = document.getElementById(idElemento);
    if (!el) return;

    // Fórmula de variação percentual: ((Atual - Antigo) / Antigo) * 100
    let porcentagem = 0;
    if (antigo > 0) {
        porcentagem = ((atual - antigo) / antigo) * 100;
    } else {
        porcentagem = atual > 0 ? 100 : 0; // Se era 0 e agora tem valor, subiu 100%
    }

    const ehPositivo = porcentagem >= 0;
    const icone = ehPositivo ? '<i class="fas fa-arrow-up"></i>' : '<i class="fas fa-arrow-down"></i>';
    const cor = ehPositivo ? "#2ecc71" : "#ff4757";

    el.style.color = cor;
    el.innerHTML = `${icone} ${Math.abs(porcentagem).toFixed(0)}% <span style="color:var(--cor-subtexto)">vs anterior</span>`;
}

/**
 * 2. FUNÇÃO DE GRÁFICO: Cria o Gráfico Misto (Barras = R$, Linha = Atendimentos).
 * Organiza as datas cronologicamente e aplica formatação de moeda [cite: 2026-04-03].
 */
function renderizarGraficoEvolucao(dados) {
    const elGrafico = document.getElementById('graficoEvolucao');
    if (!elGrafico || !dados) return;

    const ctx = elGrafico.getContext('2d');
    if (chartFaturamento) chartFaturamento.destroy();

    // Ordena os dados
    const dadosOrdenados = [...dados].sort((a, b) => a.data.localeCompare(b.data));

    const labels = [...new Set(
        dadosOrdenados.map(d => d.data.substring(8, 10) + "/" + d.data.substring(5, 7))
    )];

    const fatPorDia = labels.map(label => {
        const diaISO = label.split("/").reverse().join("-");
        return dadosOrdenados
            .filter(d => d.data.includes(diaISO))
            .reduce((acc, cur) => acc + (parseFloat(cur.valor) || 0), 0);
    });

    // 🔥 Gradiente (igual ao da imagem)
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(46, 204, 113, 0.4)');
    gradient.addColorStop(1, 'rgba(46, 204, 113, 0)');

    chartFaturamento = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                data: fatPorDia,
                borderColor: '#2ecc71',
                backgroundColor: gradient,
                fill: true,
                tension: 0.4, // 🔥 deixa a linha suave
                pointBackgroundColor: '#2ecc71',
                pointBorderWidth: 0,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let val = context.parsed.y || 0;
                            return `R$ ${val.toFixed(2).replace('.', ',')}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#aaa' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#aaa',
                        callback: (v) => 'R$ ' + v
                    }
                }
            }
        }
    });
}

/**
 * 3. EVENTO DO SELETOR: Atualiza o título e reinicia a análise.
 */
window.mudarPeriodoRelatorio = function (dias) {
    const labels = { "7": "Últimos 7 dias", "30": "Mês atual", "90": "Últimos 3 meses", "365": "Este Ano" };
    const elTexto = document.getElementById("data-range");
    if (elTexto) elTexto.innerText = labels[dias] || "Período personalizado";

    inicializarRelatorios(parseInt(dias));
};

/* ==========================================================================
   FUNÇÃO: ANÁLISE DE HORÁRIOS DE PICO (INTEGRADA AO EXPEDIENTE)
   ========================================================================== */
/* ==========================================================================
   FUNÇÃO: ANÁLISE POR TURNOS (MANHÃ VS TARDE) - ESTRATÉGICO
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

// Função para calcular novos vs recorrentes [cite: 2026-04-03]
//
/* ==========================================================================
   ANÁLISE DE FIDELIZAÇÃO (CÁLCULO DE NOVOS VS RECORRENTES) [cite: 2026-04-26]
   ========================================================================== */
async function processarInsightsClientes(agendamentosAtuais) {
    // 1. Busca histórica para comparação
    const { data: todosAnteriores } = await _supabase.from("agendamentos")
        .select("telefone, data")
        .eq("status", "concluido");

    if (!agendamentosAtuais || agendamentosAtuais.length === 0) return;

    // 2. Cria o conjunto de telefones únicos do período selecionado
    const telefonesAtuais = new Set(agendamentosAtuais.map(a => a.telefone));
    
    // --- FIX: DECLARAÇÃO DE VARIÁVEIS DE ESCOPO [cite: 2026-04-26] ---
    let recorrentes = 0;
    let novos = 0;

    telefonesAtuais.forEach(tel => {
        if (!tel) return; 
        const historico = todosAnteriores.filter(h => h.telefone === tel);
        // Se já tem mais de 1 atendimento na história, é recorrente [cite: 2026-04-26]
        historico.length > 1 ? recorrentes++ : novos++;
    });

    const taxa = (recorrentes / (novos + recorrentes)) * 100 || 0;

    // 3. ATUALIZAÇÃO DA INTERFACE (IDs do seu Dashboard) [cite: 2026-04-26]
    const elNovos = document.getElementById("rel-novos-clientes");
    const elRecorrentes = document.getElementById("rel-recorrentes");
    const elTaxa = document.getElementById("rel-taxa-retencao");
    const elFill = document.getElementById("fill-retencao");
    const elFeedback = document.getElementById("insight-horario-texto"); 

    if (elNovos) elNovos.innerText = novos;
    if (elRecorrentes) elRecorrentes.innerText = recorrentes;
    if (elTaxa) elTaxa.innerText = `${taxa.toFixed(0)}%`;
    if (elFill) elFill.style.width = `${taxa}%`;

    // 4. FEEDBACK ESTRATÉGICO PARA O BARBEIRO [cite: 2026-04-26]
    if (elFeedback) {
        elFeedback.innerText = taxa > 50
            ? "Boa fidelização! Seus clientes confiam no seu trabalho."
            : "Dica: Tente criar um cartão fidelidade para aumentar o retorno dos clientes.";
    }
}

/* ==========================================================================
   12. GESTÃO DE DETALHES E FIDELIDADE (VIA TELEFONE) [cite: 2026-04-25]
   ========================================================================== */

// 1. Função para abrir o modal com o histórico
window.abrirDetalhesCliente = async function (tel, nome) {
    const modal = document.getElementById("modal-detalhes-cliente");
    const containerEstrelas = document.getElementById("estrelas-fidelidade");
    const elNome = document.getElementById("detalhe-nome-cliente");

    if (!modal) return;

    // Abre o modal e limpa os campos antes da busca
    modal.style.display = "block";
    if (elNome) elNome.innerText = nome;
    if (containerEstrelas) containerEstrelas.innerHTML = "<p class='loading-text'>Buscando histórico...</p>";

    // Busca agendamentos concluídos pelo Telefone (Chave Única) [cite: 2026-04-25]
    const { data: historico, error } = await _supabase
        .from('agendamentos')
        .select('data, servico')
        .eq('telefone', tel)
        .eq('status', 'concluido')
        .order('data', { ascending: false });

    if (error || !historico || historico.length === 0) {
        if (containerEstrelas) containerEstrelas.innerHTML = "<p style='font-size:0.8rem; color:#666;'>Sem histórico de fidelidade.</p>";
        document.getElementById("detalhe-data-corte").innerText = "---";
        document.getElementById("detalhe-servico").innerText = "---";
        document.getElementById("total-servicos-texto").innerText = "0 serviços concluídos";
        return;
    }

    // Preenche os dados do último corte
    const ultimo = historico[0];
    document.getElementById("detalhe-data-corte").innerText = ultimo.data.split("-").reverse().join("/");
    document.getElementById("detalhe-servico").innerText = ultimo.servico;

    // Gera as estrelas de fidelidade [cite: 2026-04-25]
    containerEstrelas.innerHTML = "";
    historico.forEach(() => {
        containerEstrelas.innerHTML += '<i class="fas fa-star" style="margin-right:5px;"></i>';
    });

    document.getElementById("total-servicos-texto").innerText = `${historico.length} ${historico.length === 1 ? 'serviço concluído' : 'serviços concluídos'}`;
};

// 2. Função que resolve o erro "is not defined" [cite: 2026-04-25]
window.fecharModalDetalhes = function () {
    const modal = document.getElementById("modal-detalhes-cliente");
    if (modal) {
        modal.style.display = "none";
    }
};

// 3. Fecha o modal se o barbeiro clicar fora da caixa (Mobile First) [cite: 2026-04-25]
window.addEventListener("click", (event) => {
    const modal = document.getElementById("modal-detalhes-cliente");
    if (event.target == modal) {
        fecharModalDetalhes();
    }
});

/* ==========================================================================
   12. CONFIGURAÇÕES GERAIS - GESTÃO DE CONTEÚDO E MÍDIAS [cite: 2026-04-26]
   ========================================================================== */

// 1. Controle de Navegação e Carregamento de Dados
window.abrirSubConfigGeral = async function (tipo) {
    esconderTodasSessoes();
    const paiConfig = document.getElementById("configuracoes-section");
    if (paiConfig) paiConfig.style.display = "block";

    document.querySelectorAll('.config-sub-section').forEach(s => s.style.display = 'none');

    // Mapeamento das áreas [cite: 2026-04-26]
    if (tipo === 'submenu1') document.getElementById("area-config-home").style.display = "block";
    if (tipo === 'submenu2') document.getElementById("area-galeria-midia").style.display = "block";

    // Busca dados na tabela independente [cite: 2026-04-26]
    const { data: config } = await _supabase
        .from('configuracoes1')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

    if (config) {
        if (tipo === 'submenu1') {
            // Preenchimento de Textos (Submenu 1)
            document.getElementById("cfg-hero-titulo").value = config.hero_titulo || "";
            document.getElementById("cfg-sobre-texto").value = config.sobre_texto || "";
            document.getElementById("cfg-end-rua").value = config.end_rua || "";
            document.getElementById("cfg-end-numero").value = config.end_numero || "";
            document.getElementById("cfg-end-cidade").value = config.end_cidade || "";
            document.getElementById("cfg-end-estado").value = config.end_estado || "";
            document.getElementById("cfg-end-cep").value = config.end_cep || "";
            document.getElementById("cfg-end-tel").value = config.end_tel || "";
            document.getElementById("cfg-mapa-iframe").value = config.mapa_iframe || "";
        } 
        
        if (tipo === 'submenu2') {
            // Lógica de Mídias (Submenu 2) [cite: 2026-04-26]
            verificarLembreteAtualizacao(config.ultima_atualizacao_midia);
            
            // Define o rádio do layout (Galeria ou Produtos) [cite: 2026-04-26]
            const radioLayout = document.querySelector(`input[name="opt-exibicao"][value="${config.tipo_exibicao || 'galeria'}"]`);
            if (radioLayout) {
                radioLayout.checked = true;
                alternarLayoutMidia(config.tipo_exibicao || 'galeria', config);
            }
        }
    }
};

// 2. Lógica de Upload para o Supabase Storage [cite: 2026-04-26]
window.uploadMidia = async function(tipo) {
    const fileInput = document.getElementById(`up-${tipo}`);
    const file = fileInput.files[0];
    if (!file) return;

    // Respeitando o limite de espaço (Max 2MB por imagem) [cite: 2026-04-26]
    if (file.size > 2 * 1024 * 1024) {
        alert("Ops! Essa imagem é muito pesada. Escolha uma de até 2MB para manter o site rápido.");
        fileInput.value = "";
        return;
    }

    const fileName = `${Date.now()}-${tipo}.webp`;
    const { data, error } = await _supabase.storage
        .from('midia-home')
        .upload(fileName, file);

    if (error) return alert("Erro no upload: " + error.message);

    const { data: publicData } = _supabase.storage.from('midia-home').getPublicUrl(fileName);
    
    // Armazena a URL para o salvamento final [cite: 2026-04-26]
    window[`url_link_${tipo}`] = publicData.publicUrl;
    alert("Imagem processada! Não esqueça de clicar em 'Atualizar Vitrine' ao final.");
};

// 3. Alternância Dinâmica de Layout (Galeria vs Produtos) [cite: 2026-04-26]
window.alternarLayoutMidia = function(tipo, dadosExistentes = null) {
    const container = document.getElementById("container-inputs-dinamicos");
    if (!container) return;

    if (tipo === 'galeria') {
        container.innerHTML = `
            <p style="font-size:0.85rem; color:var(--cor-subtexto); margin-bottom:10px;">Portfólio: Envie 4 fotos dos seus melhores cortes.</p>
            <div class="config-grid-form">
                ${[1,2,3,4].map(i => `
                    <div class="input-group-modal">
                        <label>Foto ${i}</label>
                        <input type="file" id="up-galeria-${i}" onchange="uploadMidia('galeria-${i}')" accept="image/*" />
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        container.innerHTML = `
            <p style="font-size:0.85rem; color:var(--cor-subtexto); margin-bottom:10px;">Catálogo: Adicione um produto em destaque.</p>
            <div class="config-grid-form">
                <div class="input-group-modal"><label>Foto Produto</label><input type="file" id="up-prod-img" onchange="uploadMidia('prod-img')"/></div>
                <div class="input-group-modal"><label>Nome</label><input type="text" id="cfg-prod-nome" placeholder="Ex: Pomada Efeito Matte"/></div>
                <div class="input-group-modal"><label>Preço (R$)</label><input type="number" id="cfg-prod-preco" placeholder="0.00"/></div>
            </div>
        `;
    }
};

// 4. Lembrete de 30 Dias (Pop-up) [cite: 2026-04-26]
function verificarLembreteAtualizacao(ultimaData) {
    if (!ultimaData) return;
    
    const hoje = new Date();
    const ultima = new Date(ultimaData);
    const diferencaDias = Math.floor((hoje - ultima) / (1000 * 60 * 60 * 24));

    if (diferencaDias >= 30) {
        alert("⚡ Lembrete ClientFlow: Já faz mais de 30 dias que você não atualiza suas fotos ou produtos. Que tal renovar o visual do seu site hoje?");
    }
}

// 2. Função ÚNICA para salvar (Substitua as repetidas por esta)
window.salvarConteudoHome = async function () {
    const btn = document.querySelector("button[onclick='salvarConteudoHome()']");
    if (!btn) return;

    btn.innerText = "Publicando...";
    btn.disabled = true;

    const dadosHome = {
        id: 1,
        hero_titulo: document.getElementById("cfg-hero-titulo").value,
        sobre_texto: document.getElementById("cfg-sobre-texto").value,
        end_rua: document.getElementById("cfg-end-rua").value,
        end_numero: document.getElementById("cfg-end-numero").value,
        end_cidade: document.getElementById("cfg-end-cidade").value,
        end_estado: document.getElementById("cfg-end-estado").value,
        end_cep: document.getElementById("cfg-end-cep").value,
        end_tel: document.getElementById("cfg-end-tel").value,
        mapa_iframe: document.getElementById("cfg-mapa-iframe").value
    };

    const { error } = await _supabase.from('configuracoes1').upsert(dadosHome);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("Site atualizado com sucesso! 🚀");
    }

    btn.innerHTML = '<i class="fas fa-save"></i> Atualizar Site';
    btn.disabled = false;
};


/* ==========================================================================
   12. VITRINE E MÍDIAS - SALVAMENTO INTELIGENTE [cite: 2026-04-26]
   ========================================================================== */
window.salvarVitrineMídias = async function() {
    const btn = document.querySelector("button[onclick='salvarVitrineMídias()']");
    if (btn) btn.innerText = "Sincronizando Vitrine...";

    // 1. BUSCA DADOS ATUAIS: Fundamental para não sobrescrever com vazio [cite: 2026-04-26]
    const { data: configAtual } = await _supabase
        .from('vitrine_midias')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

    const tipoAtivo = document.querySelector('input[name="opt-exibicao"]:checked').value;

    // 2. PREPARA O OBJETO DE UPDATE [cite: 2026-04-26]
    const dadosUpdate = {
        id: 1,
        tipo_exibicao: tipoAtivo,
        ultima_atualizacao_midia: new Date().toISOString(),
        // Usa o novo upload da sessão OU mantém o que já estava no banco [cite: 2026-04-26]
        url_hero: window.url_link_hero || (configAtual ? configAtual.url_hero : null),
        url_sobre: window.url_link_sobre || (configAtual ? configAtual.url_sobre : null)
    };

    // 3. LÓGICA DE GALERIA (Array de 4 URLs) [cite: 2026-04-26]
    if (tipoAtivo === 'galeria') {
        const galeriaFinal = [];
        for (let i = 1; i <= 4; i++) {
            const linkNovo = window[`url_link_galeria-${i}`];
            const linkExistente = configAtual && configAtual.dados_galeria ? configAtual.dados_galeria[i - 1] : null;
            
            // Prioriza o novo upload; se não houver, mantém o antigo [cite: 2026-04-26]
            if (linkNovo || linkExistente) {
                galeriaFinal.push(linkNovo || linkExistente);
            }
        }
        dadosUpdate.dados_galeria = galeriaFinal;
        dadosUpdate.dados_produtos = configAtual ? configAtual.dados_produtos : []; // Mantém produtos em background
    } 
    
    // 4. LÓGICA DE PRODUTOS (Array de Objetos: Nome, Preço, Foto) [cite: 2026-04-26]
    else {
        const produtosFinal = [];
        for (let i = 1; i <= 2; i++) {
            const nomeInput = document.getElementById(`p-nome-${i}`).value;
            const precoInput = document.getElementById(`p-preco-${i}`).value;
            const linkNovo = window[`url_link_prod-${i}`];
            const linkExistente = configAtual && configAtual.dados_produtos && configAtual.dados_produtos[i - 1] 
                                  ? configAtual.dados_produtos[i - 1].url : null;

            if (nomeInput || linkNovo || linkExistente) {
                produtosFinal.push({
                    nome: nomeInput || (configAtual && configAtual.dados_produtos[i-1] ? configAtual.dados_produtos[i-1].nome : ""),
                    preco: precoInput || (configAtual && configAtual.dados_produtos[i-1] ? configAtual.dados_produtos[i-1].preco : 0),
                    url: linkNovo || linkExistente || ""
                });
            }
        }
        dadosUpdate.dados_produtos = produtosFinal;
        dadosUpdate.dados_galeria = configAtual ? configAtual.dados_galeria : []; // Mantém galeria em background
    }

    // 5. ENVIO FINAL PARA O SUPABASE [cite: 2026-04-26]
    const { error } = await _supabase.from('vitrine_midias').upsert(dadosUpdate);

    if (error) {
        alert("Erro ao salvar vitrine: " + error.message);
    } else {
        alert("Vitrine atualizada com sucesso! Verifique seu site. 📸");
        
        // LIMPEZA: Reseta as variáveis da sessão após o sucesso [cite: 2026-04-26]
        window.url_link_hero = null; window.url_link_sobre = null;
        for (let i = 1; i <= 4; i++) window[`url_link_galeria-${i}`] = null;
        for (let i = 1; i <= 2; i++) window[`url_link_prod-${i}`] = null;
    }
    
    if (btn) btn.innerHTML = '<i class="fas fa-sync"></i> Atualizar Vitrine do Site';
};