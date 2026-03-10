# 🚀 ClientFlow

> Plataforma simples para pequenos negócios captarem e atenderem clientes online.

ClientFlow é um projeto de estudo e desenvolvimento focado em resolver um problema comum entre pequenos negócios: **perda de clientes por falta de presença digital e atendimento rápido**.

Este projeto está sendo desenvolvido como:

- 📚 Projeto de aprendizado
- 💼 Projeto de portfólio
- 💡 Base para um possível Micro SaaS

---

# 📌 Problema

Pequenos negócios (MEI) normalmente dependem apenas de:

- Instagram
- WhatsApp
- Agenda manual
- Atendimento totalmente manual

Isso gera vários problemas:

❌ Demora para responder clientes  
❌ Falta de organização  
❌ Perda de agendamentos  
❌ Baixa presença digital  

Muitos clientes acabam desistindo ou indo para concorrentes.

---

# 💡 Solução

O **ClientFlow** propõe uma solução simples:

Uma plataforma que oferece:

- 🌐 Página profissional para o negócio
- 📅 Sistema de agendamento online
- 🤖 Automação de atendimento
- 📊 Painel simples de gestão

Tudo pensado para **pequenos negócios que não possuem conhecimento técnico**.

---

# 🎯 Público-alvo

O projeto inicialmente foca em pequenos negócios baseados em serviços.

Exemplos:

- 💈 Barbearias
- 💅 Manicures
- 💇 Salões de beleza
- 🦷 Clínicas pequenas
- 🔧 Oficinas

Esses negócios normalmente dependem de **agendamentos constantes**.

---

# 🧠 Visão do Projeto

ClientFlow busca ser:

> "Uma página profissional com agendamento e atendimento automático para pequenos negócios."

No futuro, o projeto pode evoluir para um **Micro SaaS voltado para MEIs**.

---

# ⚙️ Arquitetura do Sistema

Arquitetura planejada:
Cliente
↓
Frontend (site da empresa)
↓
Backend API
↓
Banco de dados
↓
Automação (n8n)


---

## 🖥️ Frontend

Responsável por:

- exibir página da empresa
- mostrar serviços
- permitir agendamento

Tecnologias:

- HTML
- CSS
- JavaScript

---

## 🔧 Backend

Responsável por:

- receber agendamentos
- salvar dados
- enviar dados para automações

Tecnologias:

- Node.js
- Express

---

## 🗄️ Banco de Dados

Responsável por armazenar:

- empresas
- serviços
- clientes
- agendamentos

Tecnologia planejada:

- Supabase (PostgreSQL)

---

## 🔁 Automação

Automação de notificações usando:

- n8n

Fluxo exemplo:
Novo agendamento
↓
Webhook n8n
↓
Notificação enviada
↓
Confirmação para cliente


---

# 📂 Estrutura do Projeto
clientflow/

frontend/
├── index.html
├── styles.css
└── script.js

backend/
├── server.js
└── routes.js

database/
└── schema.sql

docs/
└── architecture.md


---

# 🛠️ Funcionalidades do MVP

Primeira versão do sistema incluirá:

- [x] Página da empresa
- [x] Lista de serviços
- [x] Formulário de agendamento
- [ ] API para receber agendamentos
- [ ] Armazenamento de dados
- [ ] Automação com n8n
- [ ] Painel simples de agendamentos

---

# 🗺️ Roadmap do Projeto

## Fase 1 — MVP

- Criar landing page
- Criar lista de serviços
- Criar formulário de agendamento
- Criar API básica

---

## Fase 2 — Automação

- Integração com n8n
- Confirmação automática
- Notificação para empresa

---

## Fase 3 — Painel administrativo

- Lista de agendamentos
- Gestão de serviços
- Painel da empresa

---

## Fase 4 — Melhorias

- Agenda visual
- Dashboard
- Automação avançada
- Multiempresa

---

# 📚 Aprendizados do Projeto

Este projeto explora conceitos como:

- desenvolvimento web
- arquitetura de sistemas
- automação de processos
- construção de produto digital

---

# 🧪 Status do Projeto

🚧 Em desenvolvimento

Este projeto está sendo desenvolvido como **experimento e aprendizado contínuo**.

---

# 🔗 Documentação

Planejamento e documentação do projeto estão organizados no Notion.

📄 Notion Workspace:
---

# 🤝 Contribuições

Este é um projeto pessoal de aprendizado, mas sugestões são sempre bem-vindas.

---

# 👨‍💻 Autor

Desenvolvido por **Alex Bruno**

Estudante de Análise e Desenvolvimento de Sistemas em transição para a área de tecnologia.

---

# ⭐ Objetivo

Construir um sistema real enquanto desenvolvo minhas habilidades como programador e criador de produtos digitais.

