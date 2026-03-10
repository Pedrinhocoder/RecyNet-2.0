# 🔧 CORREÇÕES PRIORITÁRIAS - RECYNET

**Data:** 03/03/2026  
**Tempo Estimado Total:** ~8 horas  
**Prioridade:** 🔴 URGENTE

---

## 🔴 CORREÇÃO 1: DELETAR `cadastro.js` (CRÍTICO)

### **Problema:**
O arquivo `cadastro.js` armazena senhas **SEM HASH** (texto puro) no LocalStorage, violando princípios básicos de segurança e LGPD.

### **Código Problemático:**
```javascript
// cadastro.js (linha 24-28)
usuarios.push({
  nome,
  email,
  senha,  // ⚠️ SENHA EM TEXTO PURO!
  nivel: 1,
  pontos: 0,
  tipo: "user"
});
```

### **Solução:**

#### **Passo 1: Deletar o arquivo**
```powershell
Remove-Item "C:\Users\Zodken\Desktop\Projeto RecyNet\Projeto RecyNet\cadastro.js"
```

#### **Passo 2: Atualizar `cadastro.html`**

**ANTES:**
```html
<script src="cadastro.js"></script>
```

**DEPOIS:**
```html
<script src="auth.js"></script>
<script>
  document.getElementById('formCadastro')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    
    // Validações
    if (!nome || !email || !senha) {
      Utils.showToast('Preencha todos os campos!', 'error');
      return;
    }
    
    if (senha.length < 6) {
      Utils.showToast('Senha deve ter no mínimo 6 caracteres!', 'error');
      return;
    }
    
    // Usar função segura de auth.js
    const sucesso = await RecyNetAuth.cadastrar(nome, email, senha);
    
    if (sucesso) {
      Utils.showToast('Cadastro realizado com sucesso!', 'success');
      setTimeout(() => window.location.href = 'cooperado.html', 1500);
    } else {
      Utils.showToast('Email já cadastrado!', 'error');
    }
  });
</script>
```

### **Tempo:** 1-2 horas

---

## 🔴 CORREÇÃO 2: TROCAR SENHA ADMIN (ALTO)

### **Problema:**
Senha "123456" é extremamente fraca e facilmente quebrável.

### **Código Problemático:**
```javascript
// database.js (linha 14)
senha: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // Hash de "123456"
```

### **Solução:**

#### **Passo 1: Gerar senha forte**
Use um gerador de senhas ou crie uma senha como: `Admin@RecyNet2026!`

#### **Passo 2: Gerar hash SHA-256**

**Opção A: No navegador (console)**
```javascript
async function gerarHashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  console.log('Hash:', hashHex);
  return hashHex;
}

// Gerar hash
gerarHashSenha('Admin@RecyNet2026!');
```

**Opção B: Online**
Use: https://emn178.github.io/online-tools/sha256.html

#### **Passo 3: Substituir no `database.js`**
```javascript
// database.js (linha 10-22)
ADMIN_ESTATICO: {
  id: 'admin_123',
  nome: 'Administrador',
  email: 'admin@recynet.com',
  senha: '[COLE_O_HASH_AQUI]', // Hash de "Admin@RecyNet2026!"
  nivel: 99,
  pontos: 0,
  tipo: 'admin'
},
```

### **Tempo:** 30 minutos

---

## ⚠️ CORREÇÃO 3: REMOVER CONSOLE.LOGS (MÉDIO)

### **Problema:**
13 ocorrências de `console.log()` e `console.error()` em produção.

### **Solução:**

#### **Criar sistema de logging condicional**

**Adicionar no início de `utils.js`:**
```javascript
// utils.js (adicionar no topo)
const DEBUG_MODE = false; // Mudar para false em produção

window.Logger = {
  log: (...args) => {
    if (DEBUG_MODE) console.log(...args);
  },
  error: (...args) => {
    if (DEBUG_MODE) console.error(...args);
  },
  warn: (...args) => {
    if (DEBUG_MODE) console.warn(...args);
  }
};
```

#### **Substituir em todos os arquivos:**

**ANTES:**
```javascript
console.log("Cadastro.js carregado");
console.error('Erro no cadastro:', error);
```

**DEPOIS:**
```javascript
Logger.log("Cadastro.js carregado");
Logger.error('Erro no cadastro:', error);
```

#### **Arquivos para atualizar:**
1. `auth.js` (linhas 102, 160)
2. `database.js` (linhas 435, 489, 831, 841)
3. `utils.js` (linhas 133, 143)
4. `ranking_system.js` (linhas 70, 173, 224)
5. `cooperado.js` (linhas 74, 79)

### **Tempo:** 2 horas

---

## ⚠️ CORREÇÃO 4: CONSOLIDAR FUNÇÕES DUPLICADAS (MÉDIO)

### **Problema:**
Funções `getLocalStorage`, `setLocalStorage` e `formatarNumero` estão duplicadas.

### **Solução:**

#### **Passo 1: Manter apenas em `utils.js`**

```javascript
// utils.js (adicionar)
window.Utils = {
  // ... funções existentes ...
  
  getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      Logger.error('Erro ao ler localStorage:', error);
      return defaultValue;
    }
  },
  
  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      Logger.error('Erro ao salvar localStorage:', error);
      return false;
    }
  },
  
  formatarNumero(numero) {
    return new Intl.NumberFormat('pt-BR').format(numero);
  }
};
```

#### **Passo 2: Remover de `database.js`**

Deletar as funções duplicadas (linhas 826-844) e usar:
```javascript
// Ao invés de getLocalStorage(key)
Utils.getLocalStorage(key);

// Ao invés de setLocalStorage(key, value)
Utils.setLocalStorage(key, value);
```

#### **Passo 3: Remover de `admin.js`**

Deletar a função `formatarNumero()` e usar:
```javascript
// Ao invés de formatarNumero(numero)
Utils.formatarNumero(numero);
```

### **Tempo:** 1-2 horas

---

## ⚠️ CORREÇÃO 5: USAR DADOS REAIS EM `admin.js` (MÉDIO)

### **Problema:**
Dashboard mostra dados estáticos (hardcoded).

### **Solução:**

#### **ANTES:**
```javascript
// admin.js (linhas 1-13)
const dados = {
  cooperativas: 36,
  locaisColeta: 64,
  totalColetas: 180,
  totalResiduos: 4500
};
```

#### **DEPOIS:**
```javascript
// admin.js (usar dados reais do banco)
const dados = RecyNetDB.getEstatisticasGerais();

// Se a função não existir, adicionar em database.js:
getEstatisticasGerais() {
  const usuarios = this.getUsuarios();
  const coletas = this.getColetas();
  
  return {
    totalUsuarios: usuarios.length,
    totalColetas: coletas.length,
    totalResiduos: coletas.reduce((sum, c) => sum + c.peso, 0),
    locaisColeta: 12, // Exemplo fixo por enquanto
    cooperativas: 3   // Exemplo fixo por enquanto
  };
}
```

### **Tempo:** 1 hora

---

## ⚠️ CORREÇÃO 6: VALIDAÇÃO ROBUSTA DE SENHAS (MÉDIO)

### **Problema:**
Senhas muito fracas são aceitas (mínimo 6 caracteres).

### **Solução:**

#### **Adicionar em `auth.js`:**
```javascript
// auth.js (adicionar função)
validarSenhaForte(senha) {
  // Mínimo 8 caracteres
  if (senha.length < 8) {
    return { valida: false, mensagem: 'Senha deve ter no mínimo 8 caracteres' };
  }
  
  // Pelo menos uma letra maiúscula
  if (!/[A-Z]/.test(senha)) {
    return { valida: false, mensagem: 'Senha deve conter pelo menos uma letra maiúscula' };
  }
  
  // Pelo menos uma letra minúscula
  if (!/[a-z]/.test(senha)) {
    return { valida: false, mensagem: 'Senha deve conter pelo menos uma letra minúscula' };
  }
  
  // Pelo menos um número
  if (!/[0-9]/.test(senha)) {
    return { valida: false, mensagem: 'Senha deve conter pelo menos um número' };
  }
  
  // Pelo menos um caractere especial
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) {
    return { valida: false, mensagem: 'Senha deve conter pelo menos um caractere especial (!@#$%...)' };
  }
  
  return { valida: true, mensagem: 'Senha forte!' };
},
```

#### **Usar na função de cadastro:**
```javascript
// auth.js (atualizar função cadastrar)
async cadastrar(nome, email, senha) {
  // Validar força da senha
  const validacao = this.validarSenhaForte(senha);
  if (!validacao.valida) {
    Utils.showToast(validacao.mensagem, 'error');
    return false;
  }
  
  // ... resto do código ...
}
```

### **Tempo:** 1 hora

---

## 📋 RESUMO DAS CORREÇÕES

| # | Correção | Prioridade | Tempo | Status |
|---|----------|------------|-------|--------|
| 1 | Deletar `cadastro.js` | 🔴 CRÍTICO | 2h | ⏳ Pendente |
| 2 | Trocar senha admin | 🔴 ALTO | 30min | ⏳ Pendente |
| 3 | Remover console.logs | ⚠️ MÉDIO | 2h | ⏳ Pendente |
| 4 | Consolidar funções | ⚠️ MÉDIO | 2h | ⏳ Pendente |
| 5 | Dados reais em admin | ⚠️ MÉDIO | 1h | ⏳ Pendente |
| 6 | Validação de senhas | ⚠️ MÉDIO | 1h | ⏳ Pendente |
| **TOTAL** | - | - | **~8h** | - |

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Após aplicar todas as correções, verificar:

- [ ] `cadastro.js` foi deletado
- [ ] `cadastro.html` usa `RecyNetAuth.cadastrar()`
- [ ] Senha do admin foi trocada
- [ ] Console.logs foram substituídos por `Logger.*`
- [ ] Funções duplicadas foram consolidadas
- [ ] `admin.js` usa dados reais
- [ ] Validação de senha forte foi implementada
- [ ] Todos os links e botões funcionam
- [ ] Responsividade continua funcionando
- [ ] Testes manuais passaram

---

## 🧪 ROTEIRO DE TESTES

Após as correções, executar:

1. **Teste de Cadastro:**
   - Tentar cadastrar com senha fraca → Deve rejeitar
   - Cadastrar com senha forte → Deve funcionar
   - Verificar que senha está hasheada no LocalStorage

2. **Teste de Login Admin:**
   - Tentar login com senha antiga (123456) → Deve falhar
   - Login com nova senha → Deve funcionar

3. **Teste de Dashboard:**
   - Verificar que estatísticas são dinâmicas
   - Registrar coleta e ver atualização

4. **Teste de Console:**
   - Abrir DevTools → Console deve estar limpo (sem logs)
   - Mudar `DEBUG_MODE = true` → Logs devem aparecer

5. **Teste de Responsividade:**
   - Testar em mobile (< 768px)
   - Testar em tablet (768px - 1200px)
   - Testar em desktop (> 1200px)

---
