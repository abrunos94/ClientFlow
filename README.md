# 🚀 ClientFlow 

> Plataforma inteligente para pequenos negócios captarem, gerenciarem e atenderem clientes em tempo real.

O **ClientFlow** é um ecossistema SaaS desenvolvido para resolver um problema crítico de microempreendedores individuais (MEI): a perda de clientes devido à demora no atendimento e à falta de automação na gestão de agendamentos. 

Atualmente validado e operando de forma prática na **Palassi Barbearia**, o projeto evoluiu de um MVP de estudos para um ecossistema multiplataforma robusto.

💻 **Link da Aplicação:**[https://client-flow-liard.vercel.app/login.html](https://client-flow-liard.vercel.app/login.html)    
✉️ **Email:** teste@gmail.com          
🔑 **Senha:** 12345@
⚙️ **Ambiente de Hospedagem:** Vercel  
🗄️ **Banco de Dados Realtime:** Supabase (PostgreSQL)  

---

## 💡 A Solução Multiplataforma

Para garantir a melhor experiência de mercado, o sistema foi arquitetado de forma cindida:
1. **A Ponta do Cliente (Web Rápido):** Uma Landing Page otimizada e ultra-leve onde o cliente escolhe os serviços e realiza agendamentos tradicionais ou por **Ordem de Chegada**.
2. **A Ponta do Administrador (PWA):** Um painel administrativo (Dashboard) que se transforma em aplicativo de celular (Progressive Web App), oferecendo persistência de cache offline e suporte a notificações em segundo plano para o barbeiro.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3 (Variáveis nativas e design responsivo), JavaScript Assíncrono (ES6+)
- **Backend as a Service (BaaS):** Supabase (Autenticação, PostgreSQL Relacional e Realtime Listeners)
- **Engine Mobile:** Progressive Web App (PWA) via `manifest.json` e `sw.js` (Service Worker inteligente)
- **Automação de Processos:** n8n integrado com Meta API (WhatsApp) para notificações e marketing automático

---

## 📂 Estrutura do Repositório

```text
ClientFlow/
├── .vscode/
│   └── settings.json
├── backend/
│   ├── keySupabase.js          # Configurações de chaves criptográficas
│   └── server.js               # Integrações e rotas de serviços
├── Bkpbanco/                   # Backups e logs de migração de dados (.csv)
│   ├── agendamentos_rows.csv
│   ├── configuracoes1_rows.csv
│   └── servicos_rows.csv
└── frontend/                   # Core da Aplicação Web/PWA
    ├── dashboard.html          # Painel administrativo do barbeiro
    ├── index.html              # Landing Page de agendamento do cliente
    ├── login.html              # Tela de autenticação segura
    ├── manifest.json           # Manifesto de identidade do PWA
    ├── sw.js                   # Service Worker (Cache inteligente e Push)
    ├── assets/
    │   ├── Docs/               # Manuais e documentações de engenharia
    │   │   ├── Documentacao_Tecnica_HomeV1.pdf
    │   │   ├── Documentacao_Tecnica_Login_ClientFlow.pdf
    │   │   └── Manual_Tecnico_ClientFlowDashboard.pdf
    │   ├── fonts/
    │   └── images/             # Assets visuais otimizados (.webp / .png)
    │       └── favicon.png     # Ícone mestre de ancoragem do app
    ├── css/                    # Estilização modularizada
    │   ├── dashboard.css
    │   ├── home.css
    │   ├── login.css
    │   └── variables.css       # Design System (Cores e tipografia)
    └── js/                     # Lógica aplicada e consumo de APIs
        ├── auth.js             # Controle de sessão e segurança
        ├── main.js             # Controle de regras da Home e Ordem de Chegada
        └── script-dashboard.js # Regras de negócios, faturamento e Realtime


🗄️ Modelagem do Banco de Dados (Supabase / PostgreSQL)
O banco de dados foi estruturado de forma relacional para suportar faturamento dinâmico, logs de atendimento, gestão de mídia externa e templates parametrizáveis para envio via WhatsApp.

       +-----------------------+             +-----------------------+
       |     agendamentos      |             |       servicos        |
       +-----------------------+             +-----------------------+
       | id (UUID - PK)        |             | id (UUID - PK)        |
       | created_at (Timestamp)|             | created_at (Timestamp)|
       | cliente_nome (Text)   |             | nome (Text)           |
       | servico (Text)        |             | preco (Numeric)       |
       | telefone (Text)       |             | ordem (Integer)       |
       | data (Text)           |             +-----------------------+
       | horario (Text)        |
       | status (Text)         |             +-----------------------+
       | valor (Numeric)       |             |  templates_marketing  |
       +-----------------------+             +-----------------------+
                                             | id (Identity - PK)    |
       +-----------------------+             | criado_em (Timestamp) |
       |     configuracoes     |             | gatilho (Text)        |
       +-----------------------+             | texto_base (Text)     |
       | id (Integer - PK)     |             +-----------------------+
       | intervalo (Integer)   |
       | dias_trabalhados(JSONB|             +-----------------------+
       | meta_diaria (Numeric) |             |    vitrine_midias     |
       | horarios_semana(JSONB)|             +-----------------------+
       | duracao_atendimento(I)|             | id (BigInt - PK)      |
       +-----------------------+             | url_hero (Text)       |
                                             | url_sobre (Text)      |
       +-----------------------+             | tipo_exibicao (Text)  |
       |    configuracoes1     |             | dados_galeria (JSONB) |
       +-----------------------+             | dados_produtos(JSONB) |
       | id (BigInt - PK)      |             | ultima_atualizacao(TS)|
       | hero_titulo (Text)    |             +-----------------------+
       | sobre_texto (Text)    |
       | endereco (Vários Text)|             +-----------------------+
       | mapa_iframe (Text)    |             |    dados_barbearia    |
       +-----------------------+             +-----------------------+
                                             | id (BigInt - PK)      |
                                             | proprietario / empresa|
                                             | whatsapp / instagram  |
                                             | url_logo / chave_pix  |
                                             +-----------------------+

📈 Histórico de Evolução (Changelog)
[V1.01] - Fundação e Integração
[x] Criação da interface responsiva e regras de agendamento na Home.

[x] Integração total com Supabase para persistência e login administrativo.

[x] Acoplamento de gatilhos Webhook via n8n para disparo de notificações.

[V1.02] - Refinamento Técnico e Regras de Negócio
[x] Ajuste de Calendário: Correção do bug de renderização de data no Menu Clientes.

[x] Local Storage: Isolamento completo de tokens e dados focados unicamente na Dashboard.

[x] Segurança Avançada: Realocação e encriptação de chaves lógicas do banco de dados.

[x] Customização Estética: Adaptação completa da identidade visual para a Barbearia Palassi.

[x] Módulo Híbrido: Implementação da função de agendamento em Tempo Real por Ordem de Chegada.

[V1.03] - Mutação PWA (Versão Atual) 🚀
[x] Engine PWA: Criação do arquivo manifest.json para instalação do app em tela cheia (standalone).

[x] Cache Blindado: Service Worker (sw.js) configurado com loop de cache individual por arquivo, evitando quebras (404) e garantindo carregamento instantâneo.

[x] Suporte a Notificações: Adaptação do escopo do Worker para escutar rotas de Push em segundo plano.

👨‍💻 Autor
Desenvolvido com foco em excelência e arquitetura de software por Alex Bruno da Silva Mariano.
