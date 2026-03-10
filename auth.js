/* ========================================
   RECYNET 2.0 - AUTHENTICATION SYSTEM
   Sistema de autenticação com hash de senhas
   ======================================== */

const RecyNetAuth = {

  // === SESSÃO (WRAPPERS DO RecyNetDB) ===
  getUsuarioLogado() {
    return RecyNetDB.getUsuarioLogado();
  },

  setUsuarioLogado(usuario) {
    return RecyNetDB.setUsuarioLogado(usuario);
  },

  // === HASH DE SENHA (SHA-256) ===
  async hashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // === VALIDAÇÃO DE SENHA ===
  async verificarSenha(senhaDigitada, senhaHasheada) {
    const hashDigitado = await this.hashSenha(senhaDigitada);
    return hashDigitado === senhaHasheada;
  },

  // === VALIDAÇÕES ===
  validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  validarSenha(senha) {
    // Mínimo 8 caracteres
    if (senha.length < 8) {
      return { valido: false, erro: 'A senha deve ter no mínimo 8 caracteres' };
    }
    
    // Pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(senha)) {
      return { valido: false, erro: 'A senha deve conter pelo menos uma letra maiúscula' };
    }
    
    // Pelo menos uma letra minúscula
    if (!/[a-z]/.test(senha)) {
      return { valido: false, erro: 'A senha deve conter pelo menos uma letra minúscula' };
    }
    
    // Pelo menos um número
    if (!/[0-9]/.test(senha)) {
      return { valido: false, erro: 'A senha deve conter pelo menos um número' };
    }
    
    // Pelo menos um caractere especial
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) {
      return { valido: false, erro: 'A senha deve conter pelo menos um caractere especial (!@#$%...)' };
    }
    
    return { valido: true };
  },

  validarNome(nome) {
    if (nome.trim().length < 3) {
      return { valido: false, erro: 'O nome deve ter no mínimo 3 caracteres' };
    }
    return { valido: true };
  },

  // === CADASTRO ===
  async cadastrar(nome, email, senha, confirmarSenha) {
    try {
      // Validar nome
      const validNome = this.validarNome(nome);
      if (!validNome.valido) {
        return { sucesso: false, erro: validNome.erro };
      }

      // Validar email
      if (!this.validarEmail(email)) {
        return { sucesso: false, erro: 'Email inválido' };
      }

      // Verificar se email já existe
      const usuarioExistente = RecyNetDB.getUsuarioPorEmail(email);
      if (usuarioExistente) {
        return { sucesso: false, erro: 'Este email já está cadastrado' };
      }

      // Validar senha
      const validSenha = this.validarSenha(senha);
      if (!validSenha.valido) {
        return { sucesso: false, erro: validSenha.erro };
      }

      // Confirmar senha
      if (senha !== confirmarSenha) {
        return { sucesso: false, erro: 'As senhas não coincidem' };
      }

      // Criar hash da senha
      const senhaHash = await this.hashSenha(senha);

      // Criar usuário
      const usuario = RecyNetDB.criarUsuario(nome.trim(), email.trim().toLowerCase(), senhaHash);

      // Salvar
      RecyNetDB.salvarUsuario(usuario);

      // Fazer login automático
      RecyNetDB.setUsuarioLogado(usuario);

      return {
        sucesso: true,
        usuario,
        mensagem: 'Conta criada com sucesso!'
      };

    } catch (error) {
      if (typeof Logger !== 'undefined') {
        Logger.error('Erro no cadastro:', error);
      }
      return {
        sucesso: false,
        erro: 'Erro ao criar conta. Tente novamente.'
      };
    }
  },

  // === LOGIN (Aprimorado com Toast) ===
  async login(email, senha) {
    try {
      if (!email || !senha) {
        return { sucesso: false, erro: 'Preencha todos os campos' };
      }

      const emailTrim = email.trim().toLowerCase();
      let usuario = null;

      // Prioridade absoluta para o Admin Estático (Hardcoded)
      if (typeof RecyNetDB !== 'undefined' && RecyNetDB.ADMIN_ESTATICO && emailTrim === RecyNetDB.ADMIN_ESTATICO.email) {
        usuario = RecyNetDB.ADMIN_ESTATICO;
      } else {
        usuario = RecyNetDB.getUsuarioPorEmail(emailTrim);
      }
      
      if (!usuario) {
        if (typeof RecyNetUtils !== 'undefined') {
          RecyNetUtils.showToast('Email ou senha incorretos', 'error');
        }
        return { sucesso: false, erro: 'Email ou senha incorretos' };
      }

      // Verificar senha (seja do admin estático ou do banco)
      const senhaValida = await this.verificarSenha(senha, usuario.senha);
      
      if (!senhaValida) {
        if (typeof RecyNetUtils !== 'undefined') {
          RecyNetUtils.showToast('Email ou senha incorretos', 'error');
        }
        return { sucesso: false, erro: 'Email ou senha incorretos' };
      }

      // Se for o admin estático, não tentamos "salvar" no banco de usuários normal
      // apenas atualizamos a sessão
      if (usuario.id === (RecyNetDB.ADMIN_ESTATICO ? RecyNetDB.ADMIN_ESTATICO.id : 'admin_123')) {
        RecyNetDB.setUsuarioLogado(usuario);
      } else {
        usuario.ultimoAcesso = new Date().toISOString();
        RecyNetDB.salvarUsuario(usuario);
        RecyNetDB.setUsuarioLogado(usuario);
      }

      if (typeof RecyNetUtils !== 'undefined') {
        RecyNetUtils.showToast('Login realizado com sucesso!', 'success');
      }

      return { sucesso: true, usuario };
    } catch (error) {
      if (typeof Logger !== 'undefined') {
        Logger.error('Erro no login:', error);
      }
      return { sucesso: false, erro: 'Erro ao fazer login' };
    }
  },

  // === LOGOUT ===
  logout() {
    RecyNetDB.logout();
    window.location.href = 'recynet.html';
  },

  // === VERIFICAR SE ESTÁ LOGADO ===
  verificarSessao() {
    const usuario = RecyNetDB.getUsuarioLogado();
    
    if (!usuario) {
      return { logado: false, usuario: null };
    }

    // Se for o admin estático, validamos diretamente pelo ID fixo
    if (usuario.id === 'admin_123' || usuario.email === 'admin@fortes.com.br') {
      return {
        logado: true,
        usuario: RecyNetDB.ADMIN_ESTATICO
      };
    }

    // Sincronizar usuários normais com dados atualizados do banco
    const usuarioAtualizado = RecyNetDB.getUsuarioPorId(usuario.id);
    
    if (usuarioAtualizado) {
      RecyNetDB.setUsuarioLogado(usuarioAtualizado);
      return {
        logado: true,
        usuario: usuarioAtualizado
      };
    }

    return { logado: false, usuario: null };
  },

  // === PROTEÇÃO DE PÁGINA ===
  protegerPagina(paginaLogin = 'recynet.html') {
    const sessao = this.verificarSessao();
    
    if (!sessao.logado) {
      if (typeof RecyNetUtils !== 'undefined') {
        RecyNetUtils.showToast('Você precisa fazer login primeiro!', 'warning');
      } else {
        alert('Você precisa fazer login primeiro!');
      }
      window.location.href = paginaLogin;
      return null;
    }

    return sessao.usuario;
  },

  // === REDIRECIONAR BASEADO NO TIPO ===
  redirecionarPorTipo(usuario) {
    if (usuario.tipo === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'cooperado.html';
    }
  }
};

// Exportar globalmente
window.RecyNetAuth = RecyNetAuth;
