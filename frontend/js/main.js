/**
 * ClientFlow - Script Principal (Landing Page)
 * Focado em UX, Conexão com Supabase e Sincronização Real-time
 */

// 1. CONFIGURAÇÃO SUPABASE E ELEMENTOS GLOBAIS
const SUPABASE_URL = "https://cvvixgkiqljpamvnjzzj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dml4Z2tpcWxqcGFtdm5qenpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzkwOTEsImV4cCI6MjA5MDAxNTA5MX0.TfvzM_f-RxbOPIui2EHLYi2i3_dvFjWuE6XzoqQr2WM";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
   2. RENDERIZAÇÃO DINÂMICA
   ========================================================================== */

// Agora busca os serviços direto do Supabase para garantir sincronia total
async function buscarServicosDoBanco() {
    const { data, error } = await _supabase.from('servicos').select('*').order('nome');
    if (error || !data || data.length === 0) return SERVICOS_PADRAO;
    return data;
}

async function renderizarServicosNaHome() {
    const container = document.getElementById("container-servicos-cliente");
    if (!container) return;

    const servicos = await buscarServicosDoBanco();
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
        selectServico.innerHTML = '<option value="">Selecione um serviço</option>' +
            servicos.map(s => `<option value="${s.nome}">${s.nome}</option>`).join("");
    }
}

window.selecionarServicoEIrParaForm = function (nomeServico) {
    if (selectServico) {
        selectServico.value = nomeServico;
        if (secaoForm) secaoForm.scrollIntoView({ behavior: 'smooth' });
    }
};

/* ==========================================================================
   3. MÁSCARAS E VALIDAÇÕES
   ========================================================================== */

if (campoData) {
    // Define o mínimo como hoje no formato YYYY-MM-DD local
    campoData.min = new Date().toLocaleDateString('en-CA');
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

async function gerarSlots(dataEscolhida) {
    gridHorarios.innerHTML = "<p style='color: var(--cor-subtexto);'>Buscando horários...</p>";
    containerHorarios.style.display = "block";

    // BUSCANDO AS CONFIGURAÇÕES REAIS DO ALEX NO BANCO
    const { data: configBanco, error: errConfig } = await _supabase
        .from('configuracoes')
        .select('*')
        .eq('id', 1)
        .single();

    // Se o banco falhar, usa um padrão de segurança
    const configs = configBanco || {
        hora_inicio: "09:00", hora_fim: "18:00",
        almoco_inicio: "12:00", almoco_fim: "13:00",
        intervalo: 30, dias_trabalhados: [1, 2, 3, 4, 5, 6]
    };

    const diaSemana = new Date(dataEscolhida + "T00:00:00").getDay();
    if (!configs.dias_trabalhados.includes(diaSemana)) {
        gridHorarios.innerHTML = "<p style='grid-column: 1/-1; color: var(--cor-primaria);'>Não funcionamos neste dia.</p>";
        return;
    }

    // Busca agendamentos para bloquear os slots ocupados
    const { data: agendamentosMarcados } = await _supabase
        .from('agendamentos')
        .select('horario')
        .eq('data', dataEscolhida)
        .neq('status', 'cancelado');

    gridHorarios.innerHTML = "";
    const agora = new Date();
    const hojeDataLocal = agora.toLocaleDateString('en-CA');
    const hojeHoraLocal = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');

    let horaLoop = configs.hora_inicio;
    let slotsGerados = 0;

    while (horaLoop < configs.hora_fim) {
        const noAlmoco = (horaLoop >= configs.almoco_inicio && horaLoop < configs.almoco_fim);

        if (!noAlmoco) {
            const isOcupado = agendamentosMarcados?.some(a => a.horario.substring(0, 5) === horaLoop);
            const isPassado = (dataEscolhida === hojeDataLocal) && (horaLoop <= hojeHoraLocal);

            if (!isOcupado && !isPassado) {
                const slot = document.createElement("div");
                slot.className = "slot";
                slot.innerText = horaLoop;
                slot.onclick = function () {
                    document.querySelectorAll(".slot").forEach(s => s.classList.remove("selecionado"));
                    this.classList.add("selecionado");
                    inputHorarioFinal.value = `${dataEscolhida}|${this.innerText.trim()}`;
                };
                gridHorarios.appendChild(slot);
                slotsGerados++;
            }
        }
        horaLoop = somarMinutos(horaLoop, configs.intervalo);
    }

    if (slotsGerados === 0) gridHorarios.innerHTML = "<p style='grid-column: 1/-1;'>Sem horários disponíveis para hoje.</p>";
}

function somarMinutos(hora, minutos) {
    let [h, m] = hora.split(":").map(Number);
    m += parseInt(minutos);
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ==========================================================================
   5. ENVIO PARA O SUPABASE
   ========================================================================== */

if (formulario) {
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!inputHorarioFinal.value) {
            alert("Por favor, selecione um horário!");
            return;
        }

        const botaoSubmit = formulario.querySelector('button[type="submit"]');
        const textoOriginal = botaoSubmit.innerText;
        botaoSubmit.disabled = true;
        botaoSubmit.innerText = "Agendando...";

        const [dataS, horaS] = inputHorarioFinal.value.split("|");

        // Busca o preço real do serviço
        const servicos = await buscarServicosDoBanco();
        const servicoSelecionado = servicos.find(s => s.nome === selectServico.value);
        const precoReal = servicoSelecionado ? servicoSelecionado.preco : 0;

        const novoAgendamento = {
            cliente_nome: document.getElementById("nome").value,
            telefone: campoTelefone.value,
            servico: selectServico.value,
            data: dataS,    // String "YYYY-MM-DD"
            horario: horaS, // String "HH:mm"
            status: "Pendente",
            valor: precoReal
        };

        try {
            const { error } = await _supabase.from('agendamentos').insert([novoAgendamento]);
            if (error) throw error;

            botaoSubmit.innerHTML = '<i class="fas fa-check"></i> Concluído!';
            botaoSubmit.classList.add("sucesso");

            setTimeout(() => {
                formulario.reset();
                containerHorarios.style.display = "none";
                botaoSubmit.classList.remove("sucesso");
                botaoSubmit.innerText = textoOriginal;
                botaoSubmit.disabled = false;
                inputHorarioFinal.value = "";
                // Recarrega os serviços para garantir preços novos se houver
                renderizarServicosNaHome();
            }, 3000);

        } catch (erro) {
            alert("Erro: " + erro.message);
            botaoSubmit.disabled = false;
            botaoSubmit.innerText = textoOriginal;
        }
    });
}

document.addEventListener("DOMContentLoaded", renderizarServicosNaHome);

/* ==========================================================================
   6. CARREGAMENTO DE CONTEÚDO PERSONALIZADO [cite: 2026-04-26]
   ========================================================================== */
async function carregarConteudoPersonalizado() {
    // Trocamos .single() por .maybeSingle() para evitar o erro 406 [cite: 2026-04-26]
    const { data: config, error } = await _supabase
        .from('configuracoes1')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

    if (error) {
        console.warn("Aviso: Falha ao buscar configurações personalizadas.");
        return;
    }

    // Se não houver dados (config é null), o site mantém o que já está no HTML [cite: 2026-04-26]
    if (config) {
        if (config.hero_titulo) {
            const h1 = document.querySelector(".hero-content h1");
            if (h1) h1.innerText = config.hero_titulo;
        }

        if (config.sobre_texto) {
            const pSobre = document.querySelector(".texto-sobre p");
            if (pSobre) pSobre.innerText = config.sobre_texto;
        }

        const footerInfo = document.querySelector(".info-contato");
        if (footerInfo && config.end_rua) {
            const ps = footerInfo.querySelectorAll("p");
            if (ps.length >= 3) {
                ps[0].innerText = `${config.end_rua}, ${config.end_numero} - ${config.end_cidade}, ${config.end_estado}`;
                ps[1].innerText = `CEP: ${config.end_cep}`;
                ps[2].innerText = `Telefone: ${config.end_tel}`;
            }
        }

        if (config.mapa_iframe) {
            const mapaContainer = document.querySelector(".mapa-container");
            if (mapaContainer) mapaContainer.innerHTML = config.mapa_iframe;
        }
    }
}

// Garante que o conteúdo carregue assim que o site abrir [cite: 2026-04-26]
document.addEventListener("DOMContentLoaded", carregarConteudoPersonalizado);