# ♻️ RecyNet — Versão 2.0

**RecyNet** é um protótipo de plataforma web que utiliza **gamificação para incentivar a reciclagem**.
O sistema permite que usuários registrem materiais reciclados, acumulem pontos, subam de nível e participem de rankings, criando um ambiente interativo que estimula práticas sustentáveis.

A **versão 2.0** representa uma evolução significativa do projeto, trazendo melhorias estruturais, organização de código, expansão de funcionalidades e preparação da arquitetura para futuras integrações com backend e banco de dados.

O projeto atualmente funciona como um **MVP (Minimum Viable Product)** voltado para **testes de usabilidade, engajamento e validação da ideia**.

Link do protótipo: https://pedrinhocoder.github.io/RecyNet-2.0/

---

# 🌍 Objetivo do Projeto

O objetivo do RecyNet é **incentivar a reciclagem através de mecânicas de gamificação**, criando um sistema onde o usuário pode:

* Registrar materiais reciclados
* Acumular pontos
* Evoluir de nível
* Participar de rankings
* Visualizar seu impacto ambiental

A proposta é transformar a reciclagem em **uma experiência mais motivadora, competitiva e mensurável**.

---

# 🧠 Conceito do Sistema

O RecyNet utiliza um ciclo de engajamento inspirado em mecânicas de jogos:

Usuário cria conta
↓
Registra reciclagem
↓
Recebe pontos
↓
Sobe de nível
↓
Aparece no ranking
↓
Continua reciclando para evoluir

Esse sistema cria **motivação contínua para participação**.

---

# 🚀 Funcionalidades do Protótipo

## 👤 Sistema de Usuários

* Cadastro de usuário
* Sistema de login
* Perfis individuais
* Diferenciação de tipos de usuário (ex: administrador / usuário)

Cada usuário possui:

* Pontuação acumulada
* Nível atual
* Total de material reciclado (kg)

---

## ♻️ Registro de Reciclagem

O usuário pode registrar materiais reciclados dentro do sistema.

Esse registro gera:

* Pontos
* Atualização de estatísticas
* Progressão no sistema

---

## 📈 Sistema de Níveis

O RecyNet possui um **sistema de progressão baseado em pontos**.

Quanto mais pontos o usuário acumula:

* maior seu nível
* maior sua posição no ranking

A progressão é **gradual**, incentivando participação contínua.

---

## 🏆 Ranking

O sistema possui um **ranking de usuários baseado em pontuação**.

Isso cria um elemento de **competição saudável**, incentivando maior participação e engajamento.

---

## 📍 Mapa de Pontos de Coleta

O sistema apresenta **locais reais de coleta de recicláveis**.

O usuário pode:

* visualizar pontos de coleta
* filtrar locais disponíveis
* identificar onde descartar materiais recicláveis

---

## 🎁 Sistema de Recompensas

O protótipo inclui um sistema de recompensas baseado em pontuação, permitindo que usuários troquem pontos por benefícios dentro do sistema.

---

## 📊 Estatísticas de Impacto

O sistema registra dados importantes como:

* quantidade de material reciclado
* pontuação total
* progresso do usuário

Essas informações ajudam o usuário a visualizar **seu impacto ambiental individual**.

---

# 🧱 Tecnologias Utilizadas

O projeto foi desenvolvido utilizando tecnologias web fundamentais:

* **HTML**
* **CSS**
* **JavaScript**

O sistema atualmente funciona **100% no front-end**, utilizando armazenamento local para simular persistência de dados.

---

# ⚙️ Armazenamento de Dados

Na versão atual, os dados são armazenados utilizando:

**localStorage**

Isso permite que o sistema funcione como **protótipo funcional**, simulando comportamento de um sistema completo.

Versões futuras podem integrar:

* Backend real
* Banco de dados
* API funcional

---

# 🔌 Estrutura de API (Planejada)

A versão 2.0 já inclui **estrutura de API planejada**, preparando o projeto para futuras integrações.

Exemplos de endpoints definidos:

```
POST /auth/login
POST /auth/register

GET /users/me

POST /collections
GET /collections

GET /ranking

GET /rewards
POST /rewards/redeem
```

Essa estrutura facilita a futura implementação de um backend completo.

---

# 📦 Estrutura do Projeto

Estrutura simplificada:

```
RecyNet/
│
├── index.html
├── cadastro.html
├── perfil.html
├── ranking.html
├── locais.html
│
├── css/
├── js/
│
├── docs/
└── reports/
```

---

# 🔄 Evolução do Projeto

## 🧩 Versão 1.0

A versão inicial do RecyNet apresentou:

* Estrutura básica do sistema
* Primeiras páginas HTML
* Sistema inicial de usuários
* Sistema básico de pontuação
* Estrutura inicial de ranking
* Interface inicial do projeto

Essa versão teve como objetivo **provar a ideia central do sistema**.

---

## 🚀 Versão 2.0 — Melhorias e Expansões

A versão 2.0 trouxe uma evolução significativa em diversas áreas.

### 🏗️ Melhorias de Estrutura

* Melhor organização do código
* Separação mais clara entre arquivos JS
* Modularização da lógica do sistema
* Melhor estrutura de arquivos CSS
* Organização do projeto para facilitar manutenção

---

### ⚙️ Melhorias de Sistema

* Aprimoramento do sistema de login
* Melhor gerenciamento de usuários
* Melhor estrutura do sistema de pontuação
* Aprimoramento do cálculo de níveis
* Melhor funcionamento do ranking

---

### 🌍 Novas Funcionalidades

Adições importantes da versão 2.0:

* Filtros de locais de reciclagem
* Estatísticas de impacto ambiental
* Melhorias no sistema de relatórios
* Melhor estrutura de perfil do usuário

---

### 📊 Melhorias de Interface

* Correções de responsividade
* Melhor organização visual
* Ajustes de layout
* Melhor experiência de navegação
* Adição de CSS global
* Simulação de banco de dados em JavaScript

---

### 🔧 Melhorias Técnicas

* Correção de bugs
* melhorias na lógica JavaScript
* melhorias na organização do código
* melhorias na estrutura do projeto

---

### 📚 Documentação

A versão 2.0 também introduziu **documentação técnica completa**, incluindo:

* relatórios de debug
* relatórios de análise do sistema
* guias de teste
* resumos executivos do projeto

---

# 🧪 Objetivo da Versão 2.0

A versão 2.0 foi desenvolvida para:

* melhorar a estrutura do projeto
* corrigir problemas encontrados
* expandir funcionalidades
* preparar o sistema para testes reais

Essa versão permite **avaliar o engajamento dos usuários com o sistema de gamificação aplicado à reciclagem**.

---

# 🔮 Possíveis Evoluções Futuras

Versões futuras do RecyNet podem incluir:

* Backend completo
* Banco de dados real
* Sistema antifraude
* Integração com cooperativas
* Parcerias com empresas
* Sistema de recompensas reais
* Aplicativo mobile
* Expansão para uso em cidades

---

# 👨‍💻 Autor

Pedro Cauã

Projeto desenvolvido como protótipo e estudo de aplicação de **gamificação em sistemas de incentivo à reciclagem**.

---

# 🌱 Visão do Projeto

O RecyNet busca explorar como **tecnologia, gamificação e sustentabilidade** podem trabalhar juntas para incentivar comportamentos ambientalmente responsáveis.

Pequenas ações individuais podem gerar **grandes impactos coletivos**.

