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
    if (typeof senha !== 'string' || senha.length < 8) {
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
    if (typeof nome !== 'string' || nome.trim().length < 3) {
      return { valido: false, erro: 'O nome deve ter no mínimo 3 caracteres' };
    }
    return { valido: true };
  },

  // === CADASTRO ===
  async cadastrar(nome, email, senha, confirmarSenha) {
    try {
      const erroArmazenamento = RecyNetDB.lerUsuarios().erro;
      if (erroArmazenamento) return { sucesso: false, erro: erroArmazenamento };
      email = RecyNetDB.normalizarEmail(email);

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

      return await RecyNetDB.transacao(db => {
        // Criar usuário
        // Revalidar após o hash assíncrono para evitar cadastros simultâneos duplicados.
        if (db.getUsuarioPorEmail(email)) {
          return { sucesso: false, erro: 'Este email já está cadastrado' };
        }
        const usuario = db.criarUsuario(nome.trim(), email, senhaHash);

        // Salvar
        db.salvarUsuario(usuario);

        // Fazer login automático
        if (!db.setUsuarioLogado(usuario)) {
          db.gravarUsuarios(db.getUsuarios().filter(u => u.id !== usuario.id));
          return { sucesso: false, erro: 'Não foi possível iniciar a sessão. Verifique o armazenamento e tente novamente.' };
        }

        return {
          sucesso: true,
          usuario,
          mensagem: 'Conta criada com sucesso!'
        };

      });

    } catch (error) {
      if (typeof Logger !== 'undefined') {
        Logger.error('Erro no cadastro:', error);
      }
      return {
        sucesso: false,
        erro: error.code === 'SEM_TRAVA' ? error.message : 'Erro ao criar conta. Tente novamente.'
      };
    }
  },

  // === LOGIN (Aprimorado com Toast) ===
  async login(email, senha) {
    try {
      const erroArmazenamento = RecyNetDB.lerUsuarios().erro;
      if (erroArmazenamento) return { sucesso: false, erro: erroArmazenamento };
      if (!email || !senha) {
        return { sucesso: false, erro: 'Preencha todos os campos' };
      }

      const emailTrim = RecyNetDB.normalizarEmail(email);
      let usuario = null;

      // Prioridade absoluta para o Admin Estático (Hardcoded)
      if (typeof RecyNetDB !== 'undefined' && RecyNetDB.ADMIN_ESTATICO && emailTrim === RecyNetDB.ADMIN_ESTATICO.email) {
        usuario = RecyNetDB.ADMIN_ESTATICO;
      } else {
        usuario = RecyNetDB.getUsuarioPorEmail(emailTrim);
      }

      if (!usuario) {
        return { sucesso: false, erro: 'Email ou senha incorretos' };
      }

      // Verificar senha (seja do admin estático ou do banco)
      const senhaValida = await this.verificarSenha(senha, usuario.senha);

      if (!senhaValida) {
        return { sucesso: false, erro: 'Email ou senha incorretos' };
      }

      return await RecyNetDB.transacao(db => {
        // Revalidar o registro após o hash assíncrono.
        const atual = db.getUsuarioPorId(usuario.id);
        if (!atual || atual.senha !== usuario.senha) return { sucesso: false, erro: 'A conta foi alterada. Tente entrar novamente.' };
        usuario = atual;
        if (usuario.id !== db.ADMIN_ESTATICO.id) {
          usuario.ultimoAcesso = new Date().toISOString();
          db.salvarUsuario(usuario);
        }
        if (!db.setUsuarioLogado(usuario)) {
          return { sucesso: false, erro: 'Não foi possível iniciar a sessão. Verifique o armazenamento do navegador.' };
        }

        if (usuario.id === db.ADMIN_ESTATICO.id) {
          const acesso = new Date().toISOString();
          if (db.setLocalStorage('recynet_admin_acesso', acesso)) {
            usuario.ultimoAcesso = acesso;
            db.setUsuarioLogado(usuario);
          }
        }
        return { sucesso: true, usuario };
      });

    } catch (error) {
      if (typeof Logger !== 'undefined') {
        Logger.error('Erro no login:', error);
      }
      return { sucesso: false, erro: error.code === 'SEM_TRAVA' ? error.message : 'Erro ao fazer login' };
    }
  },

  async atualizarPerfil(nome, email, opcoes = {}) {
    try {
      const identidade = RecyNetDB.getUsuarioAutenticado();
      if (!identidade || identidade.tipo !== 'user') return { sucesso: false, erro: 'Entre com uma conta de cooperado' };
      return await RecyNetDB.transacao(db => {
        const usuario = db.getUsuarioAutenticado();
        if (!usuario || usuario.tipo !== 'user' || usuario.id !== identidade.id) return { sucesso: false, erro: 'A sessão mudou. Tente novamente.' };
        if (opcoes?.alterarNome === false) nome = usuario.nome;
        if (opcoes?.alterarEmail === false) email = usuario.email;
        const validacao = this.validarNome(nome);
        if (!validacao.valido) return { sucesso: false, erro: validacao.erro };
        email = db.normalizarEmail(email);
        if (!this.validarEmail(email)) return { sucesso: false, erro: 'Email inválido' };
        const existente = db.getUsuarioPorEmail(email);
        if (existente && existente.id !== usuario.id) return { sucesso: false, erro: 'Este email já está cadastrado' };
        usuario.nome = nome.trim();
        usuario.email = email;
        db.salvarUsuario(usuario);
        return { sucesso: true, usuario };
      });
    } catch (error) { return { sucesso: false, erro: error.message }; }
  },

  async alterarSenha(senhaAtual, novaSenha, confirmarSenha) {
    try {
      const usuario = RecyNetDB.getUsuarioAutenticado();
      if (!usuario || usuario.tipo !== 'user') return { sucesso: false, erro: 'Entre com uma conta de cooperado' };
      const validacao = this.validarSenha(novaSenha);
      if (!validacao.valido) return { sucesso: false, erro: validacao.erro };
      if (novaSenha !== confirmarSenha) return { sucesso: false, erro: 'As senhas não coincidem' };
      if (!(await this.verificarSenha(senhaAtual, usuario.senha))) return { sucesso: false, erro: 'Senha atual incorreta' };
      const hash = await this.hashSenha(novaSenha);
      return await RecyNetDB.transacao(db => {
        const atual = db.getUsuarioAutenticado();
        if (!atual || atual.id !== usuario.id || atual.senha !== usuario.senha) return { sucesso: false, erro: 'A sessão ou a conta mudou. Tente novamente.' };
        atual.senha = hash;
        db.salvarUsuario(atual);
        return { sucesso: true };
      });
    } catch (error) { return { sucesso: false, erro: error.message }; }
  },

  // === LOGOUT ===
  logout() {
    const resultado = RecyNetDB.logout();
    if (!resultado.sucesso) {
      if (typeof RecyNetUtils !== 'undefined') RecyNetUtils.showToast(resultado.erro, 'error');
      else alert(resultado.erro);
      return resultado;
    }
    window.location.href = 'recynet.html';
    return resultado;
  },

  // === VERIFICAR SE ESTÁ LOGADO ===
  verificarSessao() {
    const usuario = RecyNetDB.getUsuarioAutenticado();

    if (!usuario) {
      RecyNetDB.logout();
      return { logado: false, usuario: null };
    }

    // Identidade e perfil vêm do registro pelo ID, nunca do email da sessão.
    RecyNetDB.setUsuarioLogado(usuario);
    return { logado: true, usuario };
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

  protegerCooperado() {
    const usuario = this.protegerPagina();
    if (!usuario) return null;
    if (usuario.tipo !== 'user') {
      window.location.href = 'admin.html';
      return null;
    }
    return usuario;
  },

  protegerAdmin() {
    const usuario = this.protegerPagina();
    if (!usuario) return null;
    if (usuario.tipo !== 'admin') {
      window.location.href = 'cooperado.html';
      return null;
    }
    return usuario;
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
