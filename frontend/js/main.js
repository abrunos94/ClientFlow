/**
 * ClientFlow - Script Principal (Landing Page)
 * Focado em Performance, UX e Integração com Supabase
 */

/* ==========================================================================
   1. CONFIGURAÇÕES E VARIÁVEIS GLOBAIS
   ========================================================================== */

// REMOVA o "/rest/v1/" do final da URL
const SUPABASE_URL = "https://qposfoxkszlxdmcrabbx.supabase.co";

// A KEY permanece a mesma
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb3Nmb3hrc3pseGRtY3JhYmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTU0OTYsImV4cCI6MjA5NDE5MTQ5Nn0.OfGnMWsiiQDQ95XCOEcwPKPgF-YOLIai1ICZuWu2YqY";

// O cliente agora montará a URL corretamente
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Elementos do DOM
const formulario = document.getElementById("form-agendamento");
const campoData = document.getElementById("data");
const campoTelefone = document.getElementById("telefone");
const selectServico = document.getElementById("servico");
const secaoForm = document.getElementById("agendamento");
const gridHorarios = document.getElementById("grid-horarios");
const containerHorarios = document.getElementById("container-horarios");
const inputHorarioFinal = document.getElementById("horario-final");

// Variáveis de Estado (Cache para Performance)
let servicosCache = [];

/* ==========================================================================
   2. RENDERIZAÇÃO E CACHE DE SERVIÇOS
   ========================================================================== */
async function buscarServicosDoBanco() {
    const { data, error } = await _supabase.from('servicos').select('*').order('nome');
    if (error || !data || data.length === 0) {
        return [
            { nome: "Corte Masculino", preco: 40 },
            { nome: "Barba", preco: 30 },
            { nome: "Corte + Barba", preco: 60 }
        ];
    }
    return data;
}

async function renderizarServicosNaHome() {
    const container = document.getElementById("container-servicos-cliente");
    if (!container) return;

    // Busca no banco e salva em Cache para não ter que buscar de novo no agendamento
    servicosCache = await buscarServicosDoBanco();
    container.innerHTML = "";

    servicosCache.forEach(servico => {
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

    atualizarSelectFormularioCliente(servicosCache);
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
   3. MÁSCARAS E VALIDAÇÕES (UI/UX)
   ========================================================================== */
if (campoData) {
    campoData.min = new Date().toLocaleDateString('en-CA'); // Define min como hoje
}

if (campoTelefone) {
    campoTelefone.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 11) value = value.slice(0, 11);

        if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
        else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
        else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
        else value = value.replace(/^(\d*)/, "($1");

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

function somarMinutos(hora, minutos) {
    let [h, m] = hora.split(":").map(Number);
    m += parseInt(minutos);
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function gerarSlots(dataEscolhida) {
    gridHorarios.innerHTML = "<p style='color: var(--cor-subtexto);'>Buscando horários...</p>";
    containerHorarios.style.display = "block";

    // 1. Busca as novas configurações dinâmicas
    const { data: config } = await _supabase
        .from('configuracoes')
        .select('horarios_semana, duracao_atendimento')
        .eq('id', 1)
        .single();

    // Fallback: se não houver dados, assume 30min e objeto vazio
    const horariosSemana = config?.horarios_semana || {};
    const duracaoAtendimento = parseInt(config?.duracao_atendimento) || 30;

    // Identifica o dia da semana (0 = Domingo, 1 = Segunda, etc.)
    const diaSemana = new Date(dataEscolhida + "T00:00:00").getDay();
    const turnosDoDia = horariosSemana[diaSemana];

    // Se o dia não tiver turnos ativos no objeto JSON, bloqueia o agendamento
    if (!turnosDoDia || turnosDoDia.length === 0) {
        gridHorarios.innerHTML = "<p style='grid-column: 1/-1; color: var(--cor-primaria);'>Não funcionamos neste dia.</p>";
        return;
    }

    // 2. Busca agendamentos ocupados para filtrar o grid
    const { data: agendamentosMarcados } = await _supabase
        .from('agendamentos')
        .select('horario')
        .eq('data', dataEscolhida)
        .neq('status', 'cancelado');

    gridHorarios.innerHTML = "";
    const agora = new Date();
    const hojeDataLocal = agora.toLocaleDateString('en-CA');
    const hojeHoraLocal = agora.getHours().toString().padStart(2, '0') + ":" + agora.getMinutes().toString().padStart(2, '0');

    let slotsGerados = 0;

    // 3. Lógica Multi-Turnos: Percorre cada intervalo definido no Dashboard
    turnosDoDia.forEach(turno => {
        let horaLoop = turno.inicio;

        while (horaLoop < turno.fim) {
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
            // Avança o loop com base na duração média (30, 45, 60min...)
            horaLoop = somarMinutos(horaLoop, duracaoAtendimento);
        }
    });

    if (slotsGerados === 0) {
        gridHorarios.innerHTML = "<p style='grid-column: 1/-1;'>Sem horários disponíveis para este dia.</p>";
    }
}

/* ==========================================================================
   5. ENVIO DE AGENDAMENTO E TRANSIÇÃO UX (WHATSAPP)
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
        botaoSubmit.innerText = "Salvando...";

        const [dataS, horaS] = inputHorarioFinal.value.split("|");
        const nomeCliente = document.getElementById("nome").value;

        // OTIMIZAÇÃO: Busca o preço diretamente do Cache (Sem nova requisição)
        const servicoSelecionado = servicosCache.find(s => s.nome === selectServico.value);
        const precoReal = servicoSelecionado ? servicoSelecionado.preco : 0;

        const novoAgendamento = {
            cliente_nome: nomeCliente,
            telefone: campoTelefone.value,
            servico: selectServico.value,
            data: dataS,
            horario: horaS,
            status: "Pendente",
            valor: precoReal
        };

        try {
            // 1. Salva no banco
            const { error } = await _supabase.from('agendamentos').insert([novoAgendamento]);
            if (error) throw error;

            // 2. Busca número do barbeiro
            const { data: infoB } = await _supabase.from('dados_barbearia').select('whatsapp').eq('id', 1).maybeSingle();

            if (infoB && infoB.whatsapp) {
                let numeroBarbeiro = infoB.whatsapp.replace(/\D/g, "");
                if (numeroBarbeiro.startsWith("55") && numeroBarbeiro.length > 11) {
                    numeroBarbeiro = numeroBarbeiro.substring(2);
                }

                const dataFormatada = dataS.split('-').reverse().join('/');
                const textoWhatsApp = `Olá! Acabei de fazer um agendamento pelo site. ✂️\n\n👤 *Nome:* ${nomeCliente}\n💈 *Serviço:* ${novoAgendamento.servico}\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${horaS}h\n\nAguardo as instruções para confirmar meu horário!`;
                const linkWhatsApp = `https://wa.me/55${numeroBarbeiro}?text=${encodeURIComponent(textoWhatsApp)}`;

                // 3. UX de Sucesso (Transição Suave)
                formulario.innerHTML = `
                    <div style="text-align: center; padding: 20px; animation: fadeIn 0.5s ease-in-out;">
                        <i class="fas fa-check-circle" style="font-size: 4rem; color: #25D366; margin-bottom: 15px;"></i>
                        <h3 style="color: var(--cor-texto); margin-bottom: 10px;">Quase lá, ${nomeCliente}!</h3>
                        <p style="color: var(--cor-subtexto); margin-bottom: 25px; font-size: 1.1rem;">
                            Seu horário já está reservado no sistema.<br>
                            Para concluir, clique no botão abaixo e envie sua mensagem para o barbeiro.
                        </p>
                        <a href="${linkWhatsApp}" target="_blank" style="background-color: #25D366; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 10px; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(37, 211, 102, 0.3);">
                            <i class="fab fa-whatsapp" style="font-size: 1.3rem;"></i> Finalizar no WhatsApp
                        </a>
                    </div>
                `;
                containerHorarios.style.display = "none";
            }

        } catch (erro) {
            alert("Erro ao salvar: " + erro.message);
            botaoSubmit.disabled = false;
            botaoSubmit.innerText = textoOriginal;
        }
    });
}

/* ==========================================================================
   6. CARREGAMENTO DINÂMICO DE CONTEÚDO (CMS)
   ========================================================================== */
async function carregarConteudoPersonalizado() {
    const { data: textos } = await _supabase.from('configuracoes1').select('*').eq('id', 1).maybeSingle();
    const { data: midias } = await _supabase.from('vitrine_midias').select('*').eq('id', 1).maybeSingle();
    const { data: infoB } = await _supabase.from('dados_barbearia').select('*').eq('id', 1).maybeSingle();

    // Textos e Endereço
    if (textos) {
        if (textos.hero_titulo) document.querySelector(".hero-content h1").innerText = textos.hero_titulo;
        if (textos.sobre_texto) document.querySelector(".texto-sobre p").innerText = textos.sobre_texto;

        const footerInfo = document.querySelector(".info-contato");
        if (footerInfo && textos.end_rua) {
            const ps = footerInfo.querySelectorAll("p");
            if (ps.length >= 3) {
                ps[0].innerText = `${textos.end_rua}, ${textos.end_numero} - ${textos.end_cidade}, ${textos.end_estado}`;
                ps[1].innerText = `CEP: ${textos.end_cep}`;

                let telefoneExibicao = textos.end_tel || "Não informado";
                if (infoB && infoB.whatsapp) {
                    let v = infoB.whatsapp.replace(/\D/g, "");
                    if (v.startsWith("55") && v.length > 11) v = v.substring(2);

                    if (v.length === 11) telefoneExibicao = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
                    else if (v.length === 10) telefoneExibicao = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
                    else telefoneExibicao = infoB.whatsapp;
                }
                ps[2].innerText = `Telefone: ${telefoneExibicao}`;
            }
        }

        if (textos.mapa_iframe) {
            const containerMapa = document.querySelector(".mapa-container");
            if (containerMapa) containerMapa.innerHTML = textos.mapa_iframe;
        }
    }

    // Imagens, Galeria e Produtos
    if (midias) {
        if (midias.url_hero) {
            const pictureHero = document.querySelector(".imagem-hero picture");
            if (pictureHero) {
                pictureHero.querySelectorAll("source").forEach(s => s.remove());
                const img = pictureHero.querySelector("img");
                if (img) img.src = midias.url_hero;
            }
        }

        if (midias.url_sobre) {
            const containerSobre = document.querySelector(".imagem-sobre picture");
            if (containerSobre) {
                containerSobre.querySelectorAll("source").forEach(s => s.remove());
                const img = containerSobre.querySelector("img");
                if (img) img.src = midias.url_sobre;
            }
        }

        const contGaleria = document.getElementById("container-galeria-fotos");
        const contProdutos = document.getElementById("container-produtos");
        const tituloVitrine = document.getElementById("titulo-vitrine");

        if (midias.tipo_exibicao) {
            if (contGaleria) contGaleria.style.display = "none";
            if (contProdutos) {
                contProdutos.style.display = "none";
                contProdutos.style.marginBottom = "0";
            }

            if (midias.tipo_exibicao === 'galeria') {
                if (tituloVitrine) tituloVitrine.innerText = "Galeria";
                if (contGaleria) {
                    contGaleria.style.display = "grid";
                    renderizarGaleria(contGaleria, midias.dados_galeria);
                }
            }
            else if (midias.tipo_exibicao === 'produtos') {
                if (tituloVitrine) tituloVitrine.innerText = "Nossos Produtos";
                if (contProdutos) {
                    contProdutos.style.display = "grid";
                    renderizarProdutos(contProdutos, midias.dados_produtos);
                }
            }
            else if (midias.tipo_exibicao === 'ambos') {
                if (tituloVitrine) tituloVitrine.innerText = "Vitrine e Produtos";
                if (contProdutos) {
                    contProdutos.style.display = "grid";
                    contProdutos.style.marginBottom = "40px";
                    renderizarProdutos(contProdutos, midias.dados_produtos);
                }
                if (contGaleria) {
                    contGaleria.style.display = "grid";
                    renderizarGaleria(contGaleria, midias.dados_galeria);
                }
            }
        }
    }

    // Logotipo e Redes Sociais
    if (infoB) {
        if (infoB.url_logo) {
            const imgLogo = document.getElementById('logo-barbearia-home');
            const containerLogo = document.getElementById('container-logo-home');
            if (imgLogo && containerLogo) {
                imgLogo.src = infoB.url_logo;
                containerLogo.style.display = 'block';
            }
        }

        const redes = document.querySelector(".redes-sociais");
        if (redes) {
            const links = redes.querySelectorAll("a");
            if (links.length >= 3) {
                if (infoB.instagram) links[0].href = infoB.instagram;
                if (infoB.facebook) links[1].href = infoB.facebook;
                if (infoB.whatsapp) {
                    const cleanNum = infoB.whatsapp.replace(/\D/g, "");
                    links[2].href = `https://wa.me/55${cleanNum}`;
                }
            }
        }
    }
}

function renderizarGaleria(container, fotos) {
    if (!fotos || fotos.length === 0) return;
    container.innerHTML = fotos.map(url =>
        `<img src="${url}" alt="Trabalho do Barbeiro" style="width:100%; height:200px; object-fit:cover; border-radius:4px;">`
    ).join("");
}

function renderizarProdutos(container, produtos) {
    if (!produtos || produtos.length === 0) return;
    const produtosExibicao = produtos.slice(0, 4);

    container.innerHTML = produtosExibicao.map(p => `
        <div class="card-produto-vitrine" style="position: relative; overflow: hidden; border-radius: 4px;">
            <img src="${p.url}" alt="${p.nome}" style="width:100%; height:200px; object-fit:cover; display: block; border-radius:4px; transition: transform 0.3s;">
            <div style="position: absolute; bottom: 0; left: 0; width: 100%; background: rgba(0,0,0,0.8); padding: 8px; text-align: center;">
                <h4 style="font-size: 0.8rem; color: #fff; margin-bottom: 2px;">${p.nome}</h4>
                <p style="color: var(--cor-primaria); font-weight: bold; font-size: 0.9rem;">R$ ${parseFloat(p.preco).toFixed(2).replace('.', ',')}</p>
            </div>
        </div>
    `).join("");
}

/* ==========================================================================
   7. INICIALIZAÇÃO GERAL
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    renderizarServicosNaHome();
    carregarConteudoPersonalizado();
});