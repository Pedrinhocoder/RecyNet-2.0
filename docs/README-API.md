# 🌿 RecyNet API - Documentação Técnica

![Version](https://img.shields.io/badge/version-1.0.0-green)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-green)
![Status](https://img.shields.io/badge/status-design%20phase-yellow)

---

## 📋 Sumário

1. [Visão Geral](#-visão-geral)
2. [Como Usar Esta Documentação](#-como-usar-esta-documentação)
3. [Autenticação](#-autenticação)
4. [Endpoints Principais](#-endpoints-principais)
5. [Modelos de Dados](#-modelos-de-dados)
6. [Códigos de Erro](#-códigos-de-erro)
7. [Exemplos de Requisições](#-exemplos-de-requisições)
8. [Ambiente de Desenvolvimento](#-ambiente-de-desenvolvimento)
9. [Roadmap de Implementação](#-roadmap-de-implementação)

---

## 🎯 Visão Geral

A **RecyNet API** é uma API REST completa para gerenciamento de reciclagem com gamificação. Ela foi projetada para suportar:

- ✅ Cadastro e autenticação de usuários
- ✅ Registro de coletas de materiais recicláveis
- ✅ Sistema de pontos e níveis (gamificação)
- ✅ Ranking global de usuários
- ✅ Catálogo de recompensas
- ✅ Painel administrativo completo

### Características Técnicas

| Característica | Detalhes |
|----------------|----------|
| **Protocolo** | REST (HTTP/HTTPS) |
| **Formato** | JSON |
| **Autenticação** | JWT (JSON Web Token) |
| **Especificação** | OpenAPI 3.0.3 |
| **Versionamento** | URL Path (`/v1/...`) |

---

## 🚀 Como Usar Esta Documentação

### Opção 1: Visualização Interativa (Recomendado)

Abra o arquivo `api-docs.html` no navegador para acessar a interface **Swagger UI** completa:

```bash
# Abrir no navegador padrão (Windows)
start api-docs.html

# Ou com servidor local (melhor compatibilidade)
npx http-server -p 8080
# Acesse: http://localhost:8080/api-docs.html
```

**Funcionalidades da Interface:**
- 📖 Visualização completa de todos os endpoints
- 🧪 **Try it out** - Testar requisições diretamente
- 🔐 Botão "Authorize" para adicionar seu token JWT
- 📥 Download da especificação YAML
- 🔍 Busca por endpoint, tag ou palavra-chave

### Opção 2: Importar em Ferramentas

#### Postman
1. Abra o Postman
2. File → Import → Selecione `api-spec.yaml`
3. A coleção será criada automaticamente

#### Insomnia
1. Abra o Insomnia
2. Application → Import/Export → Import Data
3. Selecione `api-spec.yaml`

#### VSCode (extensão OpenAPI)
1. Instale a extensão "OpenAPI (Swagger) Editor"
2. Abra `api-spec.yaml`
3. Visualize a documentação inline

---

## 🔐 Autenticação

### Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as RecyNet API
    participant DB as Banco de Dados

    C->>API: POST /auth/register (dados cadastrais)
    API->>DB: Salvar usuário (senha hasheada)
    DB-->>API: Usuário criado
    API-->>C: 201 + Token JWT

    C->>API: POST /auth/login (email + senha)
    API->>DB: Verificar credenciais
    DB-->>API: Usuário autenticado
    API-->>C: 200 + Token JWT

    C->>API: GET /users/me (Authorization: Bearer token)
    API->>API: Validar token
    API->>DB: Buscar dados do usuário
    DB-->>API: Dados do usuário
    API-->>C: 200 + Perfil
```

### Como Usar o Token JWT

**1. Obter o Token:**
```bash
curl -X POST https://api.recynet.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@email.com",
    "senha": "Senha@123"
  }'
```

**Resposta:**
```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { ... }
}
```

**2. Usar em Requisições Autenticadas:**
```bash
curl -X GET https://api.recynet.com/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Renovação de Token

Tokens expiram em **1 hora** (recomendado). Use o endpoint `/auth/refresh` para renovar:

```bash
curl -X POST https://api.recynet.com/v1/auth/refresh \
  -H "Authorization: Bearer {token_atual}"
```

---

## 📡 Endpoints Principais

### 1️⃣ Autenticação (`/auth`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/auth/register` | Cadastrar novo usuário | ❌ |
| POST | `/auth/login` | Fazer login | ❌ |
| POST | `/auth/logout` | Fazer logout | ✅ |
| POST | `/auth/refresh` | Renovar token | ✅ |

### 2️⃣ Usuários (`/users`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/users/me` | Obter meu perfil | ✅ |
| PUT | `/users/me` | Atualizar perfil | ✅ |
| PUT | `/users/me/password` | Alterar senha | ✅ |
| GET | `/users/me/stats` | Minhas estatísticas | ✅ |

### 3️⃣ Coletas (`/collections`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/collections` | Listar minhas coletas | ✅ |
| POST | `/collections` | Registrar nova coleta | ✅ |
| GET | `/collections/{id}` | Detalhes de uma coleta | ✅ |
| DELETE | `/collections/{id}` | Deletar coleta | ✅ |

### 4️⃣ Ranking (`/ranking`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/ranking` | Ranking global | ✅ |
| GET | `/ranking/me` | Minha posição | ✅ |

### 5️⃣ Recompensas (`/rewards`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/rewards` | Catálogo de recompensas | ✅ |
| POST | `/rewards/{id}/redeem` | Resgatar recompensa | ✅ |
| GET | `/rewards/my-redeems` | Minhas recompensas | ✅ |

### 6️⃣ Admin (`/admin`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/admin/users` | Listar todos usuários | ✅ Admin |
| GET | `/admin/users/{id}` | Detalhes de usuário | ✅ Admin |
| DELETE | `/admin/users/{id}` | Deletar usuário | ✅ Admin |
| PUT | `/admin/users/{id}/points` | Ajustar pontos | ✅ Admin |
| GET | `/admin/collections` | Listar todas coletas | ✅ Admin |
| POST | `/admin/collections/{id}/approve` | Aprovar coleta | ✅ Admin |
| POST | `/admin/collections/{id}/reject` | Rejeitar coleta | ✅ Admin |
| GET | `/admin/stats` | Estatísticas gerais | ✅ Admin |

---

## 📦 Modelos de Dados

### User (Usuário)

```json
{
  "id": "usr_123abc",
  "nome": "João Silva",
  "email": "joao.silva@email.com",
  "cpf": "12345678900",
  "telefone": "11987654321",
  "endereco": "Rua das Flores, 123, São Paulo - SP",
  "tipoUsuario": "cooperado",
  "nivel": 5,
  "nomeNivel": "Prata II",
  "pontos": 1505,
  "totalKg": 150.5,
  "totalColetas": 25,
  "dataCadastro": "2026-01-15T10:30:00Z",
  "ultimaColeta": "2026-03-01T14:20:00Z"
}
```

### Collection (Coleta)

```json
{
  "id": "col_456def",
  "usuarioId": "usr_123abc",
  "material": "Plástico",
  "peso": 5.5,
  "pontosGanhos": 55,
  "observacao": "Garrafas PET limpas",
  "dataRegistro": "2026-03-01T14:20:00Z",
  "status": "aprovada",
  "dataAprovacao": "2026-03-01T15:00:00Z"
}
```

### Reward (Recompensa)

```json
{
  "id": "rew_789ghi",
  "titulo": "Desconto 10% em produtos sustentáveis",
  "descricao": "Cupom de desconto válido em todas as lojas parceiras",
  "categoria": "Desconto",
  "custoEmPontos": 500,
  "disponivel": true,
  "estoque": 100,
  "imagemUrl": "https://cdn.recynet.com/rewards/desconto-10.jpg",
  "validadeEmDias": 30
}
```

### RankingEntry (Posição no Ranking)

```json
{
  "posicao": 1,
  "usuario": {
    "id": "usr_123abc",
    "nome": "João Silva",
    "nivel": 5,
    "nomeNivel": "Prata II"
  },
  "totalKg": 523.8,
  "totalColetas": 156,
  "badge": "🥇 Top 1"
}
```

---

## ⚠️ Códigos de Erro

### HTTP Status Codes

| Código | Nome | Descrição |
|--------|------|-----------|
| `200` | OK | Requisição bem-sucedida |
| `201` | Created | Recurso criado com sucesso |
| `400` | Bad Request | Dados inválidos na requisição |
| `401` | Unauthorized | Token ausente ou inválido |
| `403` | Forbidden | Sem permissão para acessar o recurso |
| `404` | Not Found | Recurso não encontrado |
| `409` | Conflict | Conflito (ex: email já cadastrado) |
| `500` | Internal Server Error | Erro interno no servidor |

### Estrutura de Erro

```json
{
  "sucesso": false,
  "erro": "Email já cadastrado no sistema",
  "codigo": "EMAIL_JA_CADASTRADO"
}
```

### Códigos Customizados

| Código | Descrição |
|--------|-----------|
| `VALIDATION_ERROR` | Dados inválidos (campo obrigatório faltando, formato incorreto) |
| `EMAIL_JA_CADASTRADO` | Email já está em uso |
| `CPF_JA_CADASTRADO` | CPF já está cadastrado |
| `SENHA_FRACA` | Senha não atende aos requisitos de segurança |
| `CREDENCIAIS_INVALIDAS` | Email ou senha incorretos |
| `TOKEN_INVALIDO` | Token JWT inválido ou expirado |
| `SALDO_INSUFICIENTE` | Pontos insuficientes para resgate |
| `RECOMPENSA_INDISPONIVEL` | Recompensa fora de estoque ou inativa |
| `COLETA_NAO_PODE_SER_DELETADA` | Não é possível deletar coleta aprovada |

---

## 💡 Exemplos de Requisições

### 1. Cadastrar Novo Usuário

**Requisição:**
```bash
curl -X POST https://api.recynet.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "email": "maria.santos@email.com",
    "senha": "Senha@Forte123",
    "cpf": "98765432100",
    "telefone": "11912345678",
    "endereco": "Av. Paulista, 1000, São Paulo - SP"
  }'
```

**Resposta (201 Created):**
```json
{
  "sucesso": true,
  "mensagem": "Cadastro realizado com sucesso!",
  "usuario": {
    "id": "usr_abc123",
    "nome": "Maria Santos",
    "email": "maria.santos@email.com",
    "nivel": 1,
    "nomeNivel": "Bronze I",
    "pontos": 0,
    "totalKg": 0,
    "totalColetas": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Registrar Nova Coleta

**Requisição:**
```bash
curl -X POST https://api.recynet.com/v1/collections \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "material": "Papel",
    "peso": 12.5,
    "observacao": "Caixas de papelão desmontadas"
  }'
```

**Resposta (201 Created):**
```json
{
  "sucesso": true,
  "mensagem": "Coleta registrada com sucesso!",
  "coleta": {
    "id": "col_xyz789",
    "material": "Papel",
    "peso": 12.5,
    "pontosGanhos": 125,
    "dataRegistro": "2026-03-06T15:30:00Z",
    "status": "pendente"
  },
  "recompensas": {
    "pontosGanhos": 125,
    "nivelAnterior": 1,
    "nivelAtual": 2,
    "subiumNivel": true
  }
}
```

---

### 3. Obter Ranking

**Requisição:**
```bash
curl -X GET "https://api.recynet.com/v1/ranking?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta (200 OK):**
```json
{
  "ranking": [
    {
      "posicao": 1,
      "usuario": {
        "id": "usr_top1",
        "nome": "Carlos Oliveira",
        "nivel": 10,
        "nomeNivel": "Diamante"
      },
      "totalKg": 850.3,
      "totalColetas": 320,
      "badge": "🥇 Top 1"
    },
    {
      "posicao": 2,
      "usuario": {
        "id": "usr_top2",
        "nome": "Ana Paula",
        "nivel": 9,
        "nomeNivel": "Platina II"
      },
      "totalKg": 720.5,
      "totalColetas": 280,
      "badge": "🥈 Top 2"
    }
  ],
  "minhaPosicao": {
    "posicao": 15,
    "percentil": 5.2
  },
  "paginacao": {
    "paginaAtual": 1,
    "totalPaginas": 63,
    "totalItens": 1250,
    "itensPorPagina": 20
  }
}
```

---

### 4. Resgatar Recompensa

**Requisição:**
```bash
curl -X POST https://api.recynet.com/v1/rewards/rew_desc10/redeem \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Resposta (200 OK):**
```json
{
  "sucesso": true,
  "mensagem": "Recompensa resgatada com sucesso!",
  "resgate": {
    "id": "res_abc123",
    "recompensa": {
      "id": "rew_desc10",
      "titulo": "Desconto 10% em produtos sustentáveis",
      "custoEmPontos": 500
    },
    "codigoResgate": "RCN-A5B8-92F3",
    "dataResgate": "2026-03-06T16:00:00Z",
    "dataExpiracao": "2026-04-05T23:59:59Z"
  },
  "saldoRestante": 1000
}
```

---

## 🛠️ Ambiente de Desenvolvimento

### Pré-requisitos

- **Node.js** 18+ (para servidor backend)
- **PostgreSQL** 14+ ou **MongoDB** 6+ (banco de dados)
- **Redis** 7+ (opcional, para cache de sessões)
- **Docker** (opcional, para containerização)

### Stack Recomendada

| Camada | Tecnologia Recomendada |
|--------|------------------------|
| **Backend** | Node.js + Express.js |
| **Banco de Dados** | PostgreSQL (relacional) |
| **ORM** | Prisma ou TypeORM |
| **Autenticação** | jsonwebtoken + bcrypt |
| **Validação** | Zod ou Joi |
| **Documentação** | Swagger UI (já pronto) |
| **Testes** | Jest + Supertest |
| **Deploy** | Vercel, Railway, ou Render |

### Estrutura de Projeto Sugerida

```
recynet-api/
├── src/
│   ├── controllers/       # Lógica de controle
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── collectionController.js
│   │   ├── rankingController.js
│   │   ├── rewardController.js
│   │   └── adminController.js
│   ├── models/            # Modelos de dados (ORM)
│   │   ├── User.js
│   │   ├── Collection.js
│   │   └── Reward.js
│   ├── routes/            # Definição de rotas
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── collection.routes.js
│   │   ├── ranking.routes.js
│   │   ├── reward.routes.js
│   │   └── admin.routes.js
│   ├── middlewares/       # Middlewares
│   │   ├── auth.middleware.js
│   │   ├── validate.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── services/          # Lógica de negócio
│   │   ├── gamificationService.js
│   │   ├── rankingService.js
│   │   └── rewardService.js
│   ├── utils/             # Utilitários
│   │   ├── jwt.util.js
│   │   ├── hash.util.js
│   │   └── validators.util.js
│   ├── config/            # Configurações
│   │   ├── database.js
│   │   └── env.js
│   └── app.js             # Inicialização do Express
├── tests/                 # Testes
│   ├── unit/
│   └── integration/
├── prisma/                # Schema do banco (Prisma)
│   └── schema.prisma
├── docs/                  # Documentação
│   ├── api-spec.yaml      # Especificação OpenAPI
│   └── api-docs.html      # Interface Swagger
├── .env.example
├── package.json
└── README.md
```

### Variáveis de Ambiente

Crie um arquivo `.env`:

```bash
# Servidor
PORT=3000
NODE_ENV=development

# Banco de Dados
DATABASE_URL=postgresql://user:password@localhost:5432/recynet

# JWT
JWT_SECRET=sua_chave_secreta_super_segura_aqui
JWT_EXPIRES_IN=1h

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:5500

# API Keys (futuro)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=seu-email@gmail.com
# SMTP_PASS=sua-senha
```

---

## 🗺️ Roadmap de Implementação

### Fase 1: Setup Inicial (Semana 1)
- [x] Criar especificação OpenAPI 3.0
- [ ] Configurar projeto Node.js + Express
- [ ] Configurar banco de dados (PostgreSQL)
- [ ] Implementar sistema de logging (Winston)
- [ ] Configurar variáveis de ambiente

### Fase 2: Autenticação (Semana 2)
- [ ] Implementar registro de usuário
- [ ] Implementar login com JWT
- [ ] Implementar middleware de autenticação
- [ ] Implementar renovação de token
- [ ] Hash de senhas com bcrypt
- [ ] Validação de senha robusta

### Fase 3: CRUD Básico (Semana 3)
- [ ] CRUD de usuários
- [ ] CRUD de coletas
- [ ] Sistema de níveis e XP
- [ ] Cálculo de pontos por material

### Fase 4: Gamificação (Semana 4)
- [ ] Sistema de ranking global
- [ ] Badges e conquistas
- [ ] Cálculo de percentil
- [ ] Estatísticas detalhadas

### Fase 5: Recompensas (Semana 5)
- [ ] Catálogo de recompensas
- [ ] Sistema de resgate
- [ ] Códigos de resgate únicos
- [ ] Controle de estoque

### Fase 6: Admin (Semana 6)
- [ ] Painel administrativo
- [ ] Aprovação de coletas
- [ ] Ajuste manual de pontos/kg
- [ ] Estatísticas gerais do sistema
- [ ] Gerenciamento de usuários

### Fase 7: Testes e Deploy (Semana 7-8)
- [ ] Testes unitários (Jest)
- [ ] Testes de integração (Supertest)
- [ ] Testes de carga (Artillery)
- [ ] Deploy em produção
- [ ] Monitoramento e logs

---

## 📚 Recursos Adicionais

### Ferramentas Úteis

- **Postman**: [Download](https://www.postman.com/downloads/)
- **Insomnia**: [Download](https://insomnia.rest/download)
- **Swagger Editor**: [Online](https://editor.swagger.io/)
- **JWT.io**: [Decodificar JWT](https://jwt.io/)

### Tutoriais Recomendados

- [OpenAPI 3.0 Tutorial](https://swagger.io/docs/specification/about/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [JWT Authentication Guide](https://jwt.io/introduction)
- [Prisma Quickstart](https://www.prisma.io/docs/getting-started/quickstart)

### Bibliotecas Recomendadas

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "zod": "^3.22.4",
    "prisma": "^5.8.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "nodemon": "^3.0.2"
  }
}
```

---

### Contato

- **Email**: recynet2025@gmail.com
- **Instagram**: @recy_net
- **GitHub**: [RecyNet Repository]
- **Documentação**: Abra `api-docs.html` no navegador

---

## 📄 Licença

Este projeto está sob a licença **MIT**.

---
