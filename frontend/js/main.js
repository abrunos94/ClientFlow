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



* ==========================================================================
    5. ENVIO PARA O SUPABASE E REDIRECIONAMENTO WHATSAPP
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

        const nomeCliente = document.getElementById("nome").value;

        const novoAgendamento = {
            cliente_nome: nomeCliente,
            telefone: campoTelefone.value,
            servico: selectServico.value,
            data: dataS,    // String "YYYY-MM-DD"
            horario: horaS, // String "HH:mm"
            status: "Pendente",
            valor: precoReal
        };

        try {
            // 1. Salva no banco de dados
            const { error } = await _supabase.from('agendamentos').insert([novoAgendamento]);
            if (error) throw error;

            botaoSubmit.innerHTML = '<i class="fas fa-check"></i> Concluído!';
            botaoSubmit.classList.add("sucesso");

            // 2. Busca o número do barbeiro no banco para saber para onde mandar a mensagem
            const { data: infoB } = await _supabase.from('dados_barbearia').select('whatsapp').eq('id', 1).maybeSingle();

            if (infoB && infoB.whatsapp) {
                let numeroBarbeiro = infoB.whatsapp.replace(/\D/g, ""); // Limpa formatação

                // Tratamento de segurança: Se o número no banco já tiver o 55, remove para não duplicar na URL
                if (numeroBarbeiro.startsWith("55") && numeroBarbeiro.length > 11) {
                    numeroBarbeiro = numeroBarbeiro.substring(2);
                }

                const dataFormatada = dataS.split('-').reverse().join('/'); // Transforma YYYY-MM-DD em DD/MM/YYYY

                // 3. Monta a mensagem pré-programada que o cliente vai enviar
                const textoWhatsApp = `Olá! Acabei de fazer um agendamento pelo site. ✂️\n\n👤 *Nome:* ${nomeCliente}\n💈 *Serviço:* ${novoAgendamento.servico}\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${horaS}h\n\nAguardo as instruções para confirmar meu horário!`;

                const linkWhatsApp = `https://wa.me/55${numeroBarbeiro}?text=${encodeURIComponent(textoWhatsApp)}`;

                // 4. Lógica Híbrida de Redirecionamento (Resolve o bloqueio em Celulares)
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

                if (isMobile) {
                    // No mobile: Redireciona na mesma aba imediatamente
                    window.location.href = linkWhatsApp;
                } else {
                    // No PC: Mantém o delay de 1.5s para UX e abre em nova aba
                    setTimeout(() => {
                        window.open(linkWhatsApp, '_blank');
                    }, 1500);
                }
            }

            // 5. Limpa o formulário e a tela
            setTimeout(() => {
                formulario.reset();
                containerHorarios.style.display = "none";
                botaoSubmit.classList.remove("sucesso");
                botaoSubmit.innerText = textoOriginal;
                botaoSubmit.disabled = false;
                inputHorarioFinal.value = "";
                renderizarServicosNaHome();
            }, 3000);

        } catch (erro) {
            alert("Erro: " + erro.message);
            botaoSubmit.disabled = false;
            botaoSubmit.innerText = textoOriginal;
        }
    });
}




/* ==========================================================================
   6. CARREGAMENTO PERSONALIZADO (TEXTOS + VITRINE DINÂMICA)
   ========================================================================== */
async function carregarConteudoPersonalizado() {
    // 1. Busca os textos e endereço na configuracoes1
    const { data: textos } = await _supabase.from('configuracoes1').select('*').eq('id', 1).maybeSingle();

    // 2. Busca as fotos e layout na vitrine_midias
    const { data: midias } = await _supabase.from('vitrine_midias').select('*').eq('id', 1).maybeSingle();

    // 3. Busca as redes sociais na dados_barbearia
    const { data: infoB } = await _supabase.from('dados_barbearia').select('*').eq('id', 1).maybeSingle();

    // --- PARTE A: TEXTOS E ENDEREÇO (configuracoes1) ---
    if (textos) {
        if (textos.hero_titulo) document.querySelector(".hero-content h1").innerText = textos.hero_titulo;
        if (textos.sobre_texto) document.querySelector(".texto-sobre p").innerText = textos.sobre_texto;

        const footerInfo = document.querySelector(".info-contato");
        if (footerInfo && textos.end_rua) {
            const ps = footerInfo.querySelectorAll("p");
            if (ps.length >= 3) {
                ps[0].innerText = `${textos.end_rua}, ${textos.end_numero} - ${textos.end_cidade}, ${textos.end_estado}`;
                ps[1].innerText = `CEP: ${textos.end_cep}`;
                ps[2].innerText = `Telefone: ${textos.end_tel}`;
            }
        }

        if (textos.mapa_iframe) {
            const containerMapa = document.querySelector(".mapa-container");
            if (containerMapa) containerMapa.innerHTML = textos.mapa_iframe;
        }
    }

    // --- PARTE B: IMAGENS E VITRINE (vitrine_midias) ---
    if (midias) {
        // Atualização da Imagem Hero (Banner)
        if (midias.url_hero) {
            const pictureHero = document.querySelector(".imagem-hero picture");
            if (pictureHero) {
                pictureHero.querySelectorAll("source").forEach(s => s.remove());
                const img = pictureHero.querySelector("img");
                if (img) img.src = midias.url_hero;
            }
        }

        // Atualização da Imagem Sobre
        if (midias.url_sobre) {
            const containerSobre = document.querySelector(".imagem-sobre");
            if (containerSobre) {
                const picture = containerSobre.querySelector("picture");
                if (picture) {
                    picture.querySelectorAll("source").forEach(s => s.remove());
                    const img = picture.querySelector("img");
                    if (img) img.src = midias.url_sobre;
                }
            }
        }

        // --- LÓGICA DINÂMICA: GALERIA, PRODUTOS OU AMBOS ---
        const contGaleria = document.getElementById("container-galeria-fotos");
        const contProdutos = document.getElementById("container-produtos");
        const tituloVitrine = document.getElementById("titulo-vitrine");

        if (midias.tipo_exibicao) {
            // Reset de visibilidade e espaçamentos
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
                // No modo "Ambos", Produtos aparece PRIMEIRO (acima)
                if (contProdutos) {
                    contProdutos.style.display = "grid";
                    contProdutos.style.marginBottom = "40px"; // Espaço entre as seções
                    renderizarProdutos(contProdutos, midias.dados_produtos);
                }
                if (contGaleria) {
                    contGaleria.style.display = "grid";
                    renderizarGaleria(contGaleria, midias.dados_galeria);
                }
            }
        }
    }

    // --- PARTE C: REDES SOCIAIS DINÂMICAS (dados_barbearia) ---
    if (infoB) {
        const redes = document.querySelector(".redes-sociais");
        if (redes) {
            const links = redes.querySelectorAll("a");
            if (links.length >= 3) {
                // Ordem no HTML: 0=Instagram, 1=Facebook, 2=WhatsApp
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

// Renderiza a Galeria Padrão (4 fotos)
function renderizarGaleria(container, fotos) {
    if (!fotos || fotos.length === 0) return;
    container.innerHTML = fotos.map(url =>
        `<img src="${url}" alt="Trabalho do Barbeiro" style="width:100%; height:200px; object-fit:cover; border-radius:4px;">`
    ).join("");
}

// Função para renderizar os 4 produtos no formato da galeria
function renderizarProdutos(container, produtos) {
    if (!produtos || produtos.length === 0) return;

    // O limite de 4 produtos garante que a grid não quebre no desktop
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

// Inicialização Geral
document.addEventListener("DOMContentLoaded", () => {
    renderizarServicosNaHome();
    carregarConteudoPersonalizado();
});