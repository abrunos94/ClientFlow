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

/* ==========================================================================
    2. NAVEGAÇÃO E UI (VERSÃO ESPECIALISTA - REVISADA)
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
            window.location.href = "index.html"; // Ajuste se seu arquivo for login.html
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

/* ==========================================================================
    2.1 LÓGICA DO MENU MOBILE (Hambúrguer)
   ========================================================================== */

const btnAbrirMenu = document.getElementById("abrir-menu");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");

if (btnAbrirMenu && sidebar && overlay) {
    // ABRE o menu
    btnAbrirMenu.onclick = () => {
        sidebar.classList.add("active");
        overlay.classList.add("active");
    };

    // FECHA ao clicar no fundo escuro
    overlay.onclick = () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    };

    // LÓGICA INTELIGENTE: Fecha ao clicar nos links, mas ignora as Configurações
    document.querySelectorAll(".menu a").forEach(link => {
        link.addEventListener("click", () => {
            // Agora a trava é APENAS para o botão que abre a gaveta
            const ehBotaoMestreConfig = link.id === "btn-config-master";

            // Se for o botão mestre, "return" (não fecha o menu lateral)
            if (ehBotaoMestreConfig) return;

            // Se for QUALQUER outro (Dashboard, Agenda, Clientes, Expediente, Meta ou Serviços)
            if (window.innerWidth <= 768) {
                sidebar.classList.remove("active");
                overlay.classList.remove("active");
            }
        });
    });
}


// 3. Lógica de Navegação das Abas Principais (Dashboard, Agenda, Clientes)
document.querySelectorAll(".menu > a").forEach((link) => {
    link.addEventListener("click", (e) => {
        // Ignora botões que não são de troca de tela
        if (link.id === "btn-logout" || link.id === "btn-config-master") return;

        e.preventDefault();
        esconderTodasSessoes();
        link.classList.add("active");

        // Identifica qual tela abrir pelo texto do link
        const texto = link.innerText.trim();

        if (texto.includes("Dashboard")) {
            secoes.home.style.display = "block";
            carregarAgendamentosDoDia();
        } else if (texto.includes("Agenda")) {
            secoes.agenda.style.display = "block";
            inicializarAgenda();
        } else if (texto.includes("Clientes")) {
            secoes.clientes.style.display = "block";
            renderizarListaClientes();
        } else if (link.id === "link-relatorios") {
            secoes.relatorios.style.display = "block";
        }
    });
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
   6. GESTÃO DE CLIENTES (VIEW SQL)
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
                    <button class="btn-concluir" style="background:#3498db"><i class="fas fa-eye"></i></button>
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
    7.1-  Mesagem e link do Botão whatsApp
   ========================================================================== */

window.enviarLembrete = (tel, nome, dataISO, hora) => {
    if (!tel) return alert("Sem telefone cadastrado!");

    // 1. Limpeza do número
    const numLimpo = tel.replace(/\D/g, "");
    const ddi = numLimpo.startsWith("55") ? "" : "55";

    // 2. Formatação da data
    const [ano, mes, dia] = dataISO.split("-");
    const dataBR = `${dia}/${mes}`;

    // 3. Texto direto e profissional (Sem emojis)
    const texto =
        `Ola, ${nome}!\n\n` +
        `Seu agendamento foi confirmado com sucesso no ClientFlow.\n` +
        `Data: ${dataBR}\n` +
        `Horario: ${hora.substring(0, 5)}\n\n` +
        `Atencao: Pedimos que chegue com 5 minutos de antecedencia.\n` +
        `Qualquer duvida ou alteracao, estamos a disposicao.\n` +
        `Obrigado pela preferencia!`;

    const mensagemUrl = encodeURIComponent(texto);
    window.open(`https://wa.me/${ddi}${numLimpo}?text=${mensagemUrl}`, "_blank");
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

    // 3. BUSCA CONFIGURAÇÕES REAIS DO SUPABASE (O Pulo do Gato)
    const { data: config, error } = await _supabase
        .from('configuracoes')
        .select('*')
        .eq('id', 1)
        .single();

    if (config) {
        console.log("📂 Dados carregados do banco:", config);

        // Preenche os campos com os nomes das colunas do seu banco
        if (document.getElementById("cfg-hora-inicio")) document.getElementById("cfg-hora-inicio").value = config.hora_inicio;
        if (document.getElementById("cfg-hora-fim")) document.getElementById("cfg-hora-fim").value = config.hora_fim;
        if (document.getElementById("cfg-intervalo")) document.getElementById("cfg-intervalo").value = config.intervalo;
        if (document.getElementById("cfg-almoco-inicio")) document.getElementById("cfg-almoco-inicio").value = config.almoco_inicio;
        if (document.getElementById("cfg-almoco-fim")) document.getElementById("cfg-almoco-fim").value = config.almoco_fim;
        if (document.getElementById("cfg-meta-valor")) {
            document.getElementById("cfg-meta-valor").value = config.meta_diaria;
            localStorage.setItem("metaDiaria", config.meta_diaria); // <--- ADICIONE ESTA LINHA AQUI
        }

        // Marca os checkboxes dos dias trabalhados
        if (config.dias_trabalhados) {
            document.querySelectorAll(".cfg-dia").forEach(cb => {
                cb.checked = config.dias_trabalhados.includes(parseInt(cb.value));
            });
        }
    } else {
        console.warn("Nenhuma configuração encontrada no banco, usando campos padrão.");
    }

    // 4. Chamadas Iniciais de Interface
    carregarAgendamentosDoDia();
    renderizarConfigServicos();
    atualizarProgressoMeta();
    await recalcularFaturamentoDoDia();
});


