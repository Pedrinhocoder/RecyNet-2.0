/* ========================================
   RECYNET 2.0 - DATABASE MANAGER
   Sistema centralizado de gerenciamento de dados
   ======================================== */

const versoesUsuarios = new WeakMap();
const versoesBases = new WeakMap();

const RecyNetDB = {

  // === USUÁRIO ADMINISTRADOR ESTÁTICO (HARDCODED) ===
  // Este usuário sempre existirá, mesmo que o localStorage seja limpo.
  ADMIN_ESTATICO: {
    id: 'admin_123',
    nome: 'Administrador',
    email: 'admin@fortes.com.br',
    senha: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // Hash de "123456"
    tipo: 'admin',
    totalKg: 0,
    totalPontosGanhos: 0,
    pontosDisponiveis: 0,
    nivel: 100,
    historico: [],
    dataCriacao: '2026-03-01T00:00:00.000Z'
  },

  // Três casas decimais: precisão de gramas e de milésimos de ponto.
  MAX_VALOR: 1e9,
  PROGRESSAO_NIVEL: Object.freeze({ versao: 3, baseKg: 1, incrementoKg: 0.25 }),
  arredondar(valor) { return Math.round(valor * 1000) / 1000; },
  valorValido(valor) { return Number.isFinite(valor) && Math.abs(valor) <= this.MAX_VALOR; },
  getTituloNivel(nivel) {
    const marcos = Object.keys(this.TITULOS_NIVEL).map(Number).filter(n => n <= nivel);
    return this.TITULOS_NIVEL[Math.max(1, ...marcos)];
  },

  gravarUsuarios(usuarios) {
    const erro = this.validarBaseUsuarios(usuarios);
    if (erro) throw new Error(erro);
    const dados = usuarios.map(u => u.id === this.ADMIN_ESTATICO.id ? u : { ...this.atualizarProgressaoUsuario(u), versaoDados: 1 });
    try { localStorage.setItem('recynet_usuarios', JSON.stringify(dados)); }
    catch { throw new Error('Não foi possível salvar. Verifique o espaço e a permissão de armazenamento do navegador.'); }
  },

  // === CONSTANTES ===
  PONTOS_POR_KG: {
    papel: 5,
    vidro: 6,
    plastico: 8,
    metal: 12,
    eletronico: 20
  },

  TITULOS_NIVEL: {
    1: "Iniciante Verde",
    5: "Coletor Urbano",
    10: "Guardião Verde",
    15: "Eco-Guerreiro",
    20: "Mestre da Reciclagem",
    30: "Protetor Ambiental",
    40: "Herói Sustentável",
    50: "Lenda Ambiental",
    75: "Titã Ecológico",
    100: "Deus da Natureza"
  },

  // O arquivo importado precisa conter todos os campos usados pelas telas e operações.
  validarDadosUsuarioBackup(usuario) {
    const objeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    const texto = v => typeof v === 'string' && v.trim().length > 0;
    const data = v => typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
    const numero = v => this.valorValido(v) && v >= 0;
    const material = v => typeof v === 'string' && Object.hasOwn(this.PONTOS_POR_KG, v);
    const ajuste = h => this.valorValido(h.valor) && h.valor !== 0 && this.motivoValido(h.motivo);
    const registro = h => {
      if (!objeto(h) || !texto(h.id) || !data(h.data)) return false;
      if (h.admin !== undefined && typeof h.admin !== 'boolean') return false;
      switch (h.tipo) {
        case 'coleta':
          return material(h.material) && Number.isSafeInteger(h.gramas) && h.gramas >= 100 && this.valorValido(h.gramas) &&
            numero(h.kg) && h.kg >= 0.1 && numero(h.pontosGanhos);
        case 'resgate':
          return texto(h.recompensa) && numero(h.custo) && h.custo > 0;
        case 'ajuste_pontos':
          return ajuste(h);
        case 'ajuste_kg':
          // Registros antigos podem ter sido gravados como ajuste geral.
          return ajuste(h) && (material(h.material) || h.material === 'Geral');
        case 'ajuste':
          return this.valorValido(h.pontos) && h.pontos !== 0 && this.motivoValido(h.motivo);
        case 'nivel':
          return Number.isSafeInteger(h.novoNivel) && h.novoNivel >= 1 && h.novoNivel <= this.MAX_VALOR;
        default:
          return false;
      }
    };
    return objeto(usuario) && (usuario.versaoDados === undefined || usuario.versaoDados === 1) &&
      (usuario.versaoProgressao === undefined || [1, 2, 3].includes(usuario.versaoProgressao)) && texto(usuario.id) && texto(usuario.nome) &&
      ['totalKg', 'totalPontosGanhos', 'pontosDisponiveis', 'pontosGastos'].every(campo => numero(usuario[campo])) &&
      Number.isSafeInteger(usuario.nivel) && usuario.nivel >= 1 && usuario.nivel <= this.MAX_VALOR &&
      objeto(usuario.materiais) && Object.keys(this.PONTOS_POR_KG).every(m => numero(usuario.materiais[m])) &&
      data(usuario.dataCriacao) && data(usuario.ultimoAcesso) && Array.isArray(usuario.conquistas) &&
      Array.isArray(usuario.historico) && usuario.historico.every(registro) && this.invariantesUsuario(usuario);
  },

  motivoValido(motivo) {
    return typeof motivo === 'string' && motivo.trim().length > 0 && motivo.length <= 500;
  },

  // Valores são comparados em milésimos, sem tolerar diferenças de saldo.
  invariantesUsuario(u) {
    const mil = v => Math.round(v * 1000);
    const preciso = v => Number.isFinite(v) && Math.abs(v * 1000 - mil(v)) < 0.000001;
    const materiais = Object.keys(this.PONTOS_POR_KG);
    if (![u.totalKg, u.totalPontosGanhos, u.pontosDisponiveis, u.pontosGastos, ...Object.values(u.materiais)].every(preciso)) return false;
    const nivelEsperado = u.versaoProgressao === this.PROGRESSAO_NIVEL.versao
      ? this.calcularNivel(u.totalKg) : this.calcularNivelLegado(u.totalKg, u.versaoProgressao);
    if (u.nivel !== nivelEsperado ||
        mil(u.totalPontosGanhos) - mil(u.pontosGastos) !== mil(u.pontosDisponiveis) ||
        materiais.reduce((n,m) => n + mil(u.materiais[m]), 0) !== mil(u.totalKg)) return false;
    let peso = 0, ganhos = 0, gastos = 0, geral = false;
    const pesos = Object.fromEntries(materiais.map(m => [m, 0]));
    const ids = new Set();
    for (const h of u.historico) {
      if (ids.has(h.id)) return false;
      ids.add(h.id);
      if (h.tipo === 'coleta') {
        if (mil(h.kg) !== h.gramas || !preciso(h.kg) ||
            mil(h.pontosGanhos) !== mil(this.arredondar(h.kg * this.PONTOS_POR_KG[h.material]))) return false;
        peso += mil(h.kg); pesos[h.material] += mil(h.kg); ganhos += mil(h.pontosGanhos);
      } else if (h.tipo === 'resgate') {
        if (!preciso(h.custo)) return false;
        gastos += mil(h.custo);
      } else if (h.tipo === 'ajuste_kg') {
        if (!preciso(h.valor)) return false;
        peso += mil(h.valor);
        if (h.material === 'Geral') geral = true;
        else pesos[h.material] += mil(h.valor);
      } else if (h.tipo === 'ajuste_pontos' || h.tipo === 'ajuste') {
        const valor = h.tipo === 'ajuste' ? h.pontos : h.valor;
        if (!preciso(valor)) return false;
        ganhos += mil(valor);
      }
      if (![peso, ganhos, gastos, ...Object.values(pesos)].every(Number.isSafeInteger)) return false;
    }
    return peso === mil(u.totalKg) && ganhos === mil(u.totalPontosGanhos) && gastos === mil(u.pontosGastos) &&
      (geral || materiais.every(m => pesos[m] === mil(u.materiais[m])));
  },

  validarBaseUsuarios(usuarios) {
    if (!Array.isArray(usuarios)) return 'A base precisa ser uma lista de contas.';
    const ids = new Set(), emails = new Set();
    for (const [i,u] of usuarios.entries()) {
      if (!u || typeof u !== 'object' || typeof u.id !== 'string' || ids.has(u.id)) return `Conta ${i + 1}: identificação inválida ou duplicada.`;
      ids.add(u.id);
      if (u.id === this.ADMIN_ESTATICO.id) { if (u.tipo !== 'admin' || !['nome','email','senha'].every(c => typeof u[c] === 'string')) return `Conta ${i + 1}: perfil administrativo inválido.`; continue; }
      const email = this.normalizarEmail(u.email);
      if (u.tipo !== 'user' || typeof u.senha !== 'string' || typeof u.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          email === this.ADMIN_ESTATICO.email || emails.has(email) || !/^[a-f0-9]{64}$/i.test(u.senha)) return `Conta ${i + 1}: perfil, email ou credencial inválidos.`;
      emails.add(email);
      if (!this.validarDadosUsuarioBackup(u)) {
        const atividade = Array.isArray(u.historico) ? u.historico.findIndex(h => !h || !h.id || !h.tipo || !h.data ||
          (h.tipo === 'coleta' && !['kg','gramas','pontosGanhos'].every(c => Number.isFinite(h[c])))) : -1;
        return `Conta ${i + 1}${atividade >= 0 ? `, histórico ${atividade + 1}` : ''}: dados incompletos, versão desconhecida ou totais incompatíveis com o histórico.`;
      }
    }
    return null;
  },

  validarBackup(conteudo) {
    if (typeof conteudo !== 'string' || !conteudo.trim()) return { sucesso: false, erro: 'Selecione um backup JSON válido' };
    const estado = this.lerUsuarios(conteudo, { estruturaSomente: true });
    if (estado.erro) return { sucesso: false, erro: 'O arquivo não contém um backup de contas válido' };
    let gramasNormalizados = 0;
    const usuarios = estado.usuarios.filter(u => u.id !== this.ADMIN_ESTATICO.id).map(usuario => ({
      ...usuario,
      historico: Array.isArray(usuario.historico) ? usuario.historico.map(h => {
        if (h.tipo === 'coleta' && Number.isFinite(h.gramas) && !Number.isInteger(h.gramas) &&
            Math.abs(h.gramas - Math.round(h.gramas)) <= 0.000001 &&
            h.kg === this.arredondar(Math.round(h.gramas) / 1000)) {
          gramasNormalizados++;
          return { ...h, gramas: Math.round(h.gramas) };
        }
        return h;
      }) : usuario.historico
    }));
    const erro = this.validarBaseUsuarios(usuarios);
    if (erro) return { sucesso: false, erro: 'O backup contém dados inválidos. ' + erro };
    const emails = usuarios.map(u => this.normalizarEmail(u.email));
    if (new Set(emails).size !== emails.length || usuarios.some(u =>
        u.tipo !== 'user' || !/^[a-f0-9]{64}$/i.test(u.senha) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email) ||
        this.normalizarEmail(u.email) === this.ADMIN_ESTATICO.email)) {
      return { sucesso: false, erro: 'O backup contém emails duplicados, contas reservadas ou credenciais inválidas' };
    }
    const niveisRecalculados = usuarios.filter(u => u.versaoProgressao !== this.PROGRESSAO_NIVEL.versao && u.nivel !== this.calcularNivel(u.totalKg)).length;
    return { sucesso: true, usuarios: usuarios.map(u => ({ ...this.atualizarProgressaoUsuario(u), email: this.normalizarEmail(u.email) })), total: usuarios.length, gramasNormalizados, niveisRecalculados };
  },

  restaurarBackup(conteudo) {
    if (!this.isAdmin() && !this.lerUsuarios().erro) return { sucesso: false, erro: 'Entre como administrador para restaurar dados' };
    const backup = this.validarBackup(conteudo);
    if (!backup.sucesso) return backup;
    const chaves = ['recynet_backup_anterior', 'recynet_sessao'];
    const anteriores = new Map();
    const alteradas = [];
    try {
      const anterior = localStorage.getItem('recynet_usuarios');
      for (const chave of chaves) anteriores.set(chave, localStorage.getItem(chave));
      localStorage.setItem('recynet_backup_anterior', anterior === null ? '[]' : anterior);
      alteradas.push('recynet_backup_anterior');
      const saida = this.logout();
      if (!saida.sucesso) throw new Error(saida.erro);
      alteradas.push('recynet_sessao');
      // A gravação principal é a última operação: setItem é atômico em caso de falha.
      this.gravarUsuarios(backup.usuarios);
      return { sucesso: true, total: backup.total, gramasNormalizados: backup.gramasNormalizados };
    } catch (error) {
      let recuperacaoFalhou = false;
      for (const chave of alteradas.reverse()) {
        try {
          const valor = anteriores.get(chave);
          if (valor === null) localStorage.removeItem(chave);
          else localStorage.setItem(chave, valor);
        } catch (_) { recuperacaoFalhou = true; }
      }
      return { sucesso: false, erro: error.message + (recuperacaoFalhou ? ' Não foi possível recompor a cópia anterior ou a sessão. Verifique as permissões de armazenamento.' : '') };
    }
  },

  // === ESTRUTURA DE USUÁRIO ===
  criarUsuario(nome, email, senhaHash, tipo = 'user') {
    return {
      id: this.gerarId(),
      versaoDados: 1,
      versaoProgressao: this.PROGRESSAO_NIVEL.versao,
      nome,
      email: this.normalizarEmail(email),
      senha: senhaHash,
      tipo,
      totalKg: 0,
      totalPontosGanhos: 0,
      pontosDisponiveis: 0,
      pontosGastos: 0,
      nivel: 1,
      materiais: {
        papel: 0,
        plastico: 0,
        metal: 0,
        vidro: 0,
        eletronico: 0
      },
      historico: [],
      conquistas: [],
      dataCriacao: new Date().toISOString(),
      ultimoAcesso: new Date().toISOString()
    };
  },

  // === GERAÇÃO DE IDs ===
  gerarId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  // Salvar usuário
  salvarUsuario(usuario) {
    const estado = this.lerUsuarios();
    if (estado.erro) throw new Error(estado.erro);
    const usuarios = this.getUsuarios();
    const index = usuarios.findIndex(u => u.id === usuario.id);

    if (index !== -1) {
      if (usuario.id !== this.ADMIN_ESTATICO.id && versoesUsuarios.get(usuario) !== JSON.stringify(usuarios[index])) {
        throw new Error('Os dados desta conta mudaram. Recarregue antes de salvar para preservar as alterações.');
      }
      usuarios[index] = usuario;
    } else {
      usuarios.push(usuario);
    }

    if (usuario.id !== this.ADMIN_ESTATICO.id) usuario.versaoDados = 1;
    this.gravarUsuarios(usuarios);
    versoesUsuarios.set(usuario, JSON.stringify(usuario));

    // Se for o usuário logado, atualizar a sessão
    const logado = this.getUsuarioLogado();
    if (logado && logado.id === usuario.id) {
      this.setUsuarioLogado(usuario);
    }
    return true;
  },

  // Leitura sem reparos automáticos: nunca substituir dados ilegíveis por uma lista vazia.
  lerUsuarios(conteudo, { estruturaSomente = false } = {}) {
    try {
      const data = conteudo === undefined ? localStorage.getItem('recynet_usuarios') : conteudo;
      let usuarios = data === null ? [] : JSON.parse(data);
      const objeto = valor => valor && typeof valor === 'object' && !Array.isArray(valor);
      const valido = u => {
        if (!objeto(u) || !['id', 'nome', 'email', 'senha', 'tipo'].every(campo => typeof u[campo] === 'string')) return false;
        if (!u.id || !['user', 'admin'].includes(u.tipo)) return false;
        if (u.id === this.ADMIN_ESTATICO.id) return true;
        if (!['totalKg', 'totalPontosGanhos', 'pontosDisponiveis', 'nivel'].every(campo => Number.isFinite(u[campo]) && u[campo] >= 0)) return false;
        if (!objeto(u.materiais) || !Object.keys(this.PONTOS_POR_KG).every(material => Number.isFinite(u.materiais[material]) && u.materiais[material] >= 0)) return false;
        return Array.isArray(u.historico) && u.historico.every(h =>
          objeto(h) && typeof h.tipo === 'string' && Number.isFinite(Date.parse(h.data)) &&
          ['kg', 'gramas', 'pontosGanhos', 'custo', 'valor', 'pontos'].every(campo => h[campo] === undefined || Number.isFinite(h[campo])));
      };
      if (!Array.isArray(usuarios) || !usuarios.every(valido) || new Set(usuarios.map(u => u.id)).size !== usuarios.length) throw new Error('Formato inválido');
      const erro = estruturaSomente ? null : this.validarBaseUsuarios(usuarios);
      if (erro) return { usuarios: [], erro: 'Não foi possível ler as contas salvas. Os dados foram preservados. ' + erro + ' Restaure um backup válido para continuar.' };
      // Só adaptar contas previamente validadas. A leitura não grava nem altera
      // saldos/históricos; a próxima transação confirma a versão nova no disco.
      if (!estruturaSomente) usuarios = usuarios.map(u => this.atualizarProgressaoUsuario(u));
      usuarios.forEach(usuario => versoesUsuarios.set(usuario, JSON.stringify(usuario)));
      versoesBases.set(usuarios, data);
      return { usuarios, erro: null };
    } catch {
      return { usuarios: [], erro: 'Não foi possível ler as contas salvas. Os dados foram preservados. Restaure um backup válido para continuar.' };
    }
  },

  getUsuarios() {
    const { usuarios, erro } = this.lerUsuarios();
    if (erro) return [];

    // Garantir que o admin estático seja sempre incluído na lista para autenticação
    const adminIndex = usuarios.findIndex(u => u.id === this.ADMIN_ESTATICO.id);
    if (adminIndex === -1) {
      // Se não estiver no localStorage, adicionamos o estático para a busca
      usuarios.push(this.ADMIN_ESTATICO);
    } else {
      // Se estiver no localStorage, garantimos que os dados críticos (id, email, tipo)
      // sejam os do estático para evitar inconsistências
      usuarios[adminIndex].id = this.ADMIN_ESTATICO.id;
      usuarios[adminIndex].tipo = this.ADMIN_ESTATICO.tipo;
      usuarios[adminIndex].email = this.ADMIN_ESTATICO.email;
    }

    return usuarios;
  },

  normalizarEmail(email) {
    return String(email || '').trim().toLowerCase();
  },

  getUsuarioPorEmail(email) {
    email = this.normalizarEmail(email);
    // Busca direta pelo admin estático para rapidez e garantia
    if (email === this.ADMIN_ESTATICO.email) {
      return this.ADMIN_ESTATICO;
    }
    const usuarios = this.getUsuarios();
    return usuarios.find(u => this.normalizarEmail(u.email) === email);
  },

  getUsuarioPorId(id) {
    // Busca direta pelo admin estático
    if (id === this.ADMIN_ESTATICO.id) {
      return { ...this.ADMIN_ESTATICO, ultimoAcesso: this.getLocalStorage('recynet_admin_acesso') };
    }
    const usuarios = this.getUsuarios();
    return usuarios.find(u => u.id === id);
  },

  // === SESSÃO ===
  setUsuarioLogado(usuario) {
    // Remove senha antes de salvar na sessão
    const usuarioSemSenha = { ...usuario };
    delete usuarioSemSenha.senha;

    return this.setLocalStorage('recynet_sessao', usuarioSemSenha);
  },

  getUsuarioLogado() {
    const sessao = this.getLocalStorage('recynet_sessao');
    if (!sessao || typeof sessao.id !== 'string') return null;
    const atual = this.getUsuarioPorId(sessao.id);
    if (!atual) return null;
    const { senha, ...publico } = atual;
    return publico;
  },

  getUsuarioAutenticado() {
    if (this.lerUsuarios().erro) return null;
    const sessao = this.getUsuarioLogado();
    return sessao ? this.getUsuarioPorId(sessao.id) || null : null;
  },

  isAdmin() {
    const usuario = this.getUsuarioAutenticado();
    return Boolean(usuario && usuario.tipo === 'admin');
  },

  podeAlterarUsuario(usuarioId) {
    const usuario = this.getUsuarioAutenticado();
    return Boolean(usuario && (usuario.id === usuarioId || usuario.tipo === 'admin'));
  },

  logout() {
    try {
      localStorage.removeItem('recynet_sessao');
      return { sucesso: true };
    } catch (_) {
      return { sucesso: false, erro: 'Não foi possível encerrar a sessão. O navegador bloqueou o armazenamento; permita o acesso e tente sair novamente.' };
    }
  },

  // Datas de formulário representam o calendário local, sem conversão para UTC.
  formatarDataLocal(data = new Date()) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  },

  // === REGISTRO DE COLETA ===
  registrarColeta(usuarioId, material, gramas, dataColeta) {
    if (!this.podeAlterarUsuario(usuarioId)) {
      return { sucesso: false, erro: 'Acesso não autorizado' };
    }
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };
    if (usuario.tipo !== 'user') return { sucesso: false, erro: 'Esta operação é exclusiva de cooperados' };

    // Validações
    if (!this.valorValido(gramas) || gramas < 100 || Math.abs(gramas - Math.round(gramas)) > 0.000001) {
      return { sucesso: false, erro: 'Informe ao menos 100g, com precisão de gramas e dentro do limite permitido' };
    }

    gramas = Math.round(gramas);

    const materialLower = typeof material === 'string' ? material.toLowerCase() : '';
    if (!Object.hasOwn(this.PONTOS_POR_KG, materialLower)) {
      return { sucesso: false, erro: 'Material inválido' };
    }

    const agora = new Date();
    let dataRegistro = agora;
    if (dataColeta !== undefined) {
      if (!this.isAdmin()) return { sucesso: false, erro: 'Somente o administrador pode informar a data da coleta' };
      if (typeof dataColeta !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataColeta)) {
        return { sucesso: false, erro: 'Data de coleta inválida' };
      }
      // Meio-dia evita mudanças de dia por horário de verão na data escolhida.
      const escolhida = new Date(`${dataColeta}T12:00:00`);
      const hoje = this.formatarDataLocal(agora);
      if (!Number.isFinite(escolhida.getTime()) || this.formatarDataLocal(escolhida) !== dataColeta || dataColeta > hoje) {
        return { sucesso: false, erro: 'Informe uma data válida até hoje' };
      }
      if (dataColeta !== hoje) dataRegistro = escolhida;
    }

    // Cálculos (não arredondar internamente)
    const kg = this.arredondar(gramas / 1000);
    const pontosGanhos = this.arredondar(kg * this.PONTOS_POR_KG[materialLower]);
    if (![usuario.totalKg + kg, usuario.totalPontosGanhos + pontosGanhos, usuario.pontosDisponiveis + pontosGanhos].every(v => this.valorValido(v))) {
      return { sucesso: false, erro: 'O registro ultrapassa o limite de saldo permitido' };
    }

    // Atualizar dados do usuário
    usuario.totalKg = this.arredondar(usuario.totalKg + kg);
    usuario.materiais[materialLower] = this.arredondar(usuario.materiais[materialLower] + kg);
    usuario.totalPontosGanhos = this.arredondar(usuario.totalPontosGanhos + pontosGanhos);
    usuario.pontosDisponiveis = this.arredondar(usuario.pontosDisponiveis + pontosGanhos);

    // Calcular novo nível
    const nivelAntes = usuario.nivel;
    const novoNivel = this.calcularNivel(usuario.totalKg);
    usuario.nivel = novoNivel;

    // Criar registro no histórico
    const registro = {
      id: this.gerarId(),
      tipo: 'coleta',
      material: materialLower,
      gramas,
      kg,
      pontosGanhos,
      data: dataRegistro.toISOString()
    };
    usuario.historico.unshift(registro);
    usuario.historico.sort((a, b) => new Date(b.data) - new Date(a.data));

    // Verificar se subiu de nível
    const subiuNivel = novoNivel > nivelAntes;
    const titulo = this.TITULOS_NIVEL[novoNivel] || null;

    // Salvar usuário
    try { this.salvarUsuario(usuario); }
    catch (error) { return { sucesso: false, erro: error.message }; }

    return {
      sucesso: true,
      pontosGanhos,
      novoNivel,
      subiuNivel,
      titulo,
      usuario
    };
  },

  // Retornar todas as coletas de um usuário em formato normalizado
  getColetasUsuario(usuarioId) {
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario || !usuario.historico) return [];

    return usuario.historico
      .filter(h => h.tipo === 'coleta')
      .map(h => ({
        data: h.data,
        material: h.material,
        kg: h.kg,
        pontos: h.pontosGanhos
      }));
  },

  // === RESGATE DE RECOMPENSA ===
  resgatarRecompensa(usuarioId, recompensaId) {
    if (!this.podeAlterarUsuario(usuarioId)) {
      return { sucesso: false, erro: 'Acesso não autorizado' };
    }
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };
    if (usuario.tipo !== 'user') return { sucesso: false, erro: 'Esta operação é exclusiva de cooperados' };

    const recompensa = this.getCatalogoRecompensas().find(r => r.id === recompensaId);
    if (!recompensa) return { sucesso: false, erro: 'Recompensa inválida. Selecione um item do catálogo.' };
    const { nome: nomeRecompensa, custo } = recompensa;
    if (!this.valorValido(usuario.pontosGastos + custo)) return { sucesso: false, erro: 'O resgate ultrapassa o limite permitido' };

    if (usuario.pontosDisponiveis < custo) {
      return { sucesso: false, erro: 'Pontos insuficientes' };
    }

    // Descontar pontos
    usuario.pontosDisponiveis = this.arredondar(usuario.pontosDisponiveis - custo);
    usuario.pontosGastos = this.arredondar((usuario.pontosGastos || 0) + custo);

    // Criar registro no histórico
    const registro = {
      id: this.gerarId(),
      tipo: 'resgate',
      recompensa: nomeRecompensa,
      custo,
      data: new Date().toISOString()
    };
    usuario.historico.unshift(registro);

    // Salvar
    try { this.salvarUsuario(usuario); }
    catch (error) { return { sucesso: false, erro: error.message }; }

    return {
      sucesso: true,
      pontosRestantes: usuario.pontosDisponiveis,
      usuario
    };
  },

  // === NÍVEIS: +250 G NO REQUISITO DE CADA AVANÇO, SEM TETO DE NÍVEL ===
  atualizarProgressaoUsuario(usuario) {
    if (usuario.id === this.ADMIN_ESTATICO.id || usuario.versaoProgressao === this.PROGRESSAO_NIVEL.versao) return usuario;
    return { ...usuario, nivel: this.calcularNivel(usuario.totalKg), versaoProgressao: this.PROGRESSAO_NIVEL.versao };
  },

  // Usado exclusivamente para validar dados anteriores antes da migração.
  calcularNivelLegado(totalKg, versao) {
    let gramas = Math.round(totalKg * 1000);
    if (versao !== 2) return 1 + Math.floor(gramas / 2000);
    for (let nivel = 1; nivel < 14; nivel++) {
      const custo = Math.round(2000 * 1.2 ** (nivel - 1));
      if (gramas < custo) return nivel;
      gramas -= custo;
    }
    return 14 + Math.floor(gramas / 20000);
  },

  // Quantidade ADICIONAL para ir do nível atual ao próximo.
  calcularKgNecessario(nivel) {
    if (!Number.isSafeInteger(nivel) || nivel < 1) throw new RangeError('Nível inválido');
    const p = this.PROGRESSAO_NIVEL;
    return p.baseKg + p.incrementoKg * (nivel - 1);
  },

  calcularKgMinimoNivel(nivel) {
    if (!Number.isSafeInteger(nivel) || nivel < 1) throw new RangeError('Nível inválido');
    if (nivel === 1) return 0;
    // Soma da progressão aritmética, em gramas inteiros, sem percorrer níveis.
    const etapas = nivel - 1;
    const primeiro = Math.round(this.calcularKgNecessario(1) * 1000);
    const ultimo = Math.round(this.calcularKgNecessario(nivel - 1) * 1000);
    const gramas = etapas * (primeiro + ultimo) / 2;
    if (!Number.isSafeInteger(gramas)) throw new RangeError('Peso fora da precisão suportada');
    return gramas / 1000;
  },

  calcularNivel(totalKg) {
    if (!this.valorValido(totalKg) || totalKg < 0) throw new RangeError('Peso total inválido');
    const gramas = Math.round(totalKg * 1000);
    const primeiro = Math.round(this.calcularKgNecessario(1) * 1000);
    const incremento = Math.round((this.calcularKgNecessario(2) - this.calcularKgNecessario(1)) * 1000);
    // Inversa da soma da PA: a*k² + b*k = gramas, com k = nível - 1.
    const a = incremento / 2, b = primeiro - a;
    let nivel = 1 + Math.floor((Math.sqrt(b * b + 4 * a * gramas) - b) / (2 * a));
    // A raiz é uma estimativa: comparar os limiares inteiros evita erros na borda.
    while (Math.round(this.calcularKgMinimoNivel(nivel + 1) * 1000) <= gramas) nivel++;
    while (Math.round(this.calcularKgMinimoNivel(nivel) * 1000) > gramas) nivel--;
    return nivel;
  },

  calcularProgressoNivel(totalKg) {
    const nivel = this.calcularNivel(totalKg);

    const kgNecessario = this.calcularKgNecessario(nivel);
    const kgInicioNivel = this.calcularKgMinimoNivel(nivel);
    const kgProximoNivel = this.calcularKgMinimoNivel(nivel + 1);
    const kgNoNivelAtual = (Math.round(totalKg * 1000) - Math.round(kgInicioNivel * 1000)) / 1000;

    // Porcentagem do progresso para o próximo nível
    const porcentagem = (kgNoNivelAtual / kgNecessario) * 100;

    // Kg que faltam para o próximo nível
    const kgFaltando = this.arredondar(kgNecessario - kgNoNivelAtual);

    return {
      nivel,
      kgAtual: kgNoNivelAtual,
      kgNecessario,
      kgInicioNivel,
      kgProximoNivel,
      kgFaltando,
      porcentagem: Math.min(porcentagem, 100),
      proximoNivel: nivel + 1,
      titulo: this.getTituloNivel(nivel)
    };
  },

  // === RANKING ===
  getRanking(limite = 100) {
    const usuarios = this.getUsuarios()
      .filter(u => u.tipo === 'user' && u.totalKg > 0)
      .sort((a, b) => b.totalKg - a.totalKg)
      .slice(0, limite);

    return usuarios.map((u, index) => ({
      posicao: index + 1,
      id: u.id,
      nome: u.nome,
      totalKg: u.totalKg,
      nivel: u.nivel,
      totalPontosGanhos: u.totalPontosGanhos,
      titulo: this.getTituloNivel(u.nivel)
    }));
  },

  getPosicaoUsuario(usuarioId) {
    const ranking = this.getRanking(Infinity);
    const posicao = ranking.findIndex(r => r.id === usuarioId);
    return posicao >= 0 ? posicao + 1 : null;
  },

  // === ESTATÍSTICAS ===
  getEstatisticasUsuario(usuarioId, agora = new Date()) {
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return null;

    const progresso = this.calcularProgressoNivel(usuario.totalKg);
    const posicao = this.getPosicaoUsuario(usuarioId);

    // Material mais reciclado
    const materialMaisReciclado = Object.entries(usuario.materiais)
      .sort(([,a], [,b]) => b - a)[0];

    // Mês do calendário local até o instante atual, sem incluir registros futuros.
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const coletasRecentes = usuario.historico.filter(h => {
      const data = new Date(h.data);
      return h.tipo === 'coleta' && data >= inicioMes && data <= agora;
    });

    const kgMes = coletasRecentes.reduce((sum, h) => sum + h.kg, 0);
    const pontosMes = coletasRecentes.reduce((sum, h) => sum + h.pontosGanhos, 0);

    return {
      ...progresso,
      posicao,
      totalKg: usuario.totalKg,
      pontosDisponiveis: usuario.pontosDisponiveis,
      totalPontosGanhos: usuario.totalPontosGanhos,
      pontosGastos: usuario.pontosGastos,
      materialMaisReciclado: materialMaisReciclado ? {
        nome: materialMaisReciclado[0],
        kg: materialMaisReciclado[1]
      } : null,
      kgEsteMes: kgMes,
      pontosEsteMes: pontosMes,
      totalColetas: usuario.historico.filter(h => h.tipo === 'coleta').length,
      totalResgates: usuario.historico.filter(h => h.tipo === 'resgate').length
    };
  },

  // === FORMATAÇÃO ===
  formatarNumero(num) {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num));
  },

  formatarKg(kg) {
    if (kg < 1) {
      return Math.round(kg * 1000) + 'g';
    }
    return new Intl.NumberFormat('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:3}).format(kg) + ' kg';
  },

  formatarPontos(pontos) {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(this.arredondar(pontos));
  },

  // === FUNÇÕES ADMINISTRATIVAS ===

  // Registrar coleta para um usuário (admin)
  registrarColetaParaUsuario(usuarioId, material, kg, dataColeta) {
    if (!this.isAdmin()) return { sucesso: false, erro: 'Acesso restrito ao administrador' };
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };
    if (usuario.tipo !== 'user') return { sucesso: false, erro: 'Esta operação é exclusiva de cooperados' };

    // Função recebe kg, mas o registrador principal trabalha em gramas
    const gramas = kg * 1000;
    return this.registrarColeta(usuarioId, material, gramas, dataColeta);
  },

  // === GERENCIAMENTO DE USUÁRIOS (ADMIN) ===


  // Ajustar pontos de um usuário (admin)
  ajustarPontosUsuario(usuarioId, pontos, motivo = 'Ajuste administrativo') {
    if (!this.isAdmin()) return { sucesso: false, erro: 'Acesso restrito ao administrador' };
    if (!this.valorValido(pontos) || pontos === 0 || pontos !== this.arredondar(pontos)) {
      return { sucesso: false, erro: 'Valor inválido' };
    }
    if (!this.motivoValido(motivo)) return { sucesso: false, erro: 'Informe um motivo textual de 1 a 500 caracteres.' };
    motivo = motivo.trim();
    try {
      const usuarios = this.getUsuarios();
      const index = usuarios.findIndex(u => u.id === usuarioId);

      if (index === -1) return { sucesso: false, erro: 'Usuário não encontrado' };

      const usuario = usuarios[index];

      // Garantir que os campos existam
      if (usuario.pontosDisponiveis === undefined) usuario.pontosDisponiveis = 0;
      if (usuario.totalPontosGanhos === undefined) usuario.totalPontosGanhos = 0;
      if (!usuario.historico) usuario.historico = [];

      if (usuario.tipo !== 'user') return { sucesso: false, erro: 'Selecione um cooperado' };
      const saldo = this.arredondar(usuario.pontosDisponiveis + pontos);
      const total = this.arredondar(usuario.totalPontosGanhos + pontos);
      if (saldo < 0 || total < 0 || !this.valorValido(saldo) || !this.valorValido(total)) {
        return { sucesso: false, erro: 'O ajuste ultrapassa o saldo ou o limite permitido' };
      }
      usuario.pontosDisponiveis = saldo;
      usuario.totalPontosGanhos = total;

      usuario.historico.unshift({
        id: this.gerarId(),
        tipo: 'ajuste_pontos',
        valor: pontos,
        motivo: motivo,
        data: new Date().toISOString(),
        admin: true
      });

      // Salvar a lista inteira de volta no localStorage
      usuarios[index] = usuario;
      this.gravarUsuarios(usuarios);

      // Atualizar sessão se for o próprio admin
      const logado = this.getUsuarioLogado();
      if (logado && logado.id === usuario.id) {
        this.setUsuarioLogado(usuario);
      }

      return { sucesso: true, usuario };
    } catch (e) {
      console.error('Erro ao ajustar pontos:', e);
      return { sucesso: false, erro: e.message };
    }
  },

  // Ajustar KG de um usuário (admin)
  ajustarKgUsuario(usuarioId, kg, material = '', motivo = 'Ajuste administrativo') {
    if (!this.isAdmin()) return { sucesso: false, erro: 'Acesso restrito ao administrador' };
    if (!this.valorValido(kg) || kg === 0 || kg !== this.arredondar(kg)) {
      return { sucesso: false, erro: 'Valor inválido' };
    }
    if (!this.motivoValido(motivo)) return { sucesso: false, erro: 'Informe um motivo textual de 1 a 500 caracteres.' };
    motivo = motivo.trim();
    try {
      const usuarios = this.getUsuarios();
      const index = usuarios.findIndex(u => u.id === usuarioId);

      if (index === -1) return { sucesso: false, erro: 'Usuário não encontrado' };

      const usuario = usuarios[index];

      if (usuario.totalKg === undefined) usuario.totalKg = 0;
      if (!usuario.historico) usuario.historico = [];
      if (!usuario.materiais) usuario.materiais = { papel: 0, plastico: 0, vidro: 0, metal: 0, eletronico: 0 };

      const nivelAnterior = this.calcularNivel(usuario.totalKg);

      if (usuario.tipo !== 'user' || !Object.hasOwn(this.PONTOS_POR_KG, material)) {
        return { sucesso: false, erro: 'Selecione um cooperado e um material válido' };
      }
      const total = this.arredondar(usuario.totalKg + kg);
      const totalMaterial = this.arredondar(usuario.materiais[material] + kg);
      if (total < 0 || totalMaterial < 0 || !this.valorValido(total) || !this.valorValido(totalMaterial)) {
        return { sucesso: false, erro: 'O ajuste ultrapassa o peso registrado ou o limite permitido' };
      }
      usuario.totalKg = total;
      usuario.materiais[material] = totalMaterial;

      const nivelAtual = this.calcularNivel(usuario.totalKg);
      usuario.nivel = nivelAtual;

      usuario.historico.unshift({
        id: this.gerarId(),
        tipo: 'ajuste_kg',
        valor: kg,
        material: material || 'Geral',
        motivo: motivo,
        data: new Date().toISOString(),
        admin: true
      });

      // Salvar a lista inteira de volta no localStorage
      usuarios[index] = usuario;
      this.gravarUsuarios(usuarios);

      // Atualizar sessão se for o próprio admin
      const logado = this.getUsuarioLogado();
      if (logado && logado.id === usuario.id) {
        this.setUsuarioLogado(usuario);
      }

      return { sucesso: true, usuario, subiuNivel: nivelAtual > nivelAnterior };
    } catch (e) {
      console.error('Erro ao ajustar KG:', e);
      return { sucesso: false, erro: e.message };
    }
  },

  // Deletar usuário (admin)
  deletarUsuario(usuarioId) {
    if (!this.isAdmin()) return { sucesso: false, erro: 'Acesso restrito ao administrador' };
    let usuarios = this.getUsuarios();
    const usuario = usuarios.find(u => u.id === usuarioId);

    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };
    if (usuario.tipo !== 'user') return { sucesso: false, erro: 'Esta operação é exclusiva de cooperados' };
    if (usuario.tipo === 'admin') return { sucesso: false, erro: 'Não é possível deletar administrador' };

    usuarios = usuarios.filter(u => u.id !== usuarioId);
    try { this.gravarUsuarios(usuarios); }
    catch (error) { return { sucesso: false, erro: error.message }; }
    return { sucesso: true };
  },

  limparUsuarios() {
    if (!this.isAdmin()) return { sucesso: false, erro: 'Acesso restrito ao administrador' };
    const admins = this.getUsuarios().filter(u => u.tipo === 'admin');
    try { this.gravarUsuarios(admins); }
    catch (error) { return { sucesso: false, erro: error.message }; }
    return { sucesso: true };
  },

  // Estatísticas gerais (admin)
  getEstatisticasGerais() {
    if (!this.isAdmin()) return null;
    const usuarios = this.getUsuarios().filter(u => u.tipo === 'user');

    const totalUsuarios = usuarios.length;
    const totalKg = usuarios.reduce((sum, u) => sum + (u.totalKg || 0), 0);
    const totalPontos = usuarios.reduce((sum, u) => sum + (u.pontosDisponiveis || 0), 0);
    const totalColetas = usuarios.reduce((sum, u) => {
      return sum + u.historico.filter(h => h.tipo === 'coleta').length;
    }, 0);
    const totalResgates = usuarios.reduce((sum, u) => {
      return sum + u.historico.filter(h => h.tipo === 'resgate').length;
    }, 0);

    // KG por material
    const materiaisTotais = {
      papel: 0,
      plastico: 0,
      metal: 0,
      vidro: 0,
      eletronico: 0
    };

    usuarios.forEach(u => {
      Object.keys(u.materiais).forEach(mat => {
        if (materiaisTotais[mat] !== undefined) {
          materiaisTotais[mat] += u.materiais[mat];
        }
      });
    });

    // Coletas recentes (últimas 20)
    const todasColetas = [];
    usuarios.forEach(u => {
      u.historico
        .filter(h => h.tipo === 'coleta')
        .forEach(coleta => {
          todasColetas.push({
            usuarioId: u.id,
            usuarioNome: u.nome,
            material: coleta.material,
            kg: coleta.kg,
            pontosGanhos: coleta.pontosGanhos,
            data: coleta.data
          });
        });
    });

    todasColetas.sort((a, b) => new Date(b.data) - new Date(a.data));

    return {
      totalUsuarios,
      totalKg,
      totalPontos,
      totalColetas,
      totalResgates,
      materiaisTotais,
      coletasRecentes: todasColetas.slice(0, 20)
    };
  },

  // === CATÁLOGO DE RECOMPENSAS ===
  getCatalogoRecompensas() {
    return [
      {
        id: 1,
        nome: 'Garrafa Reutilizável',
        descricao: 'Garrafa térmica 500ml sustentável para reduzir o uso de copos descartáveis.',
        custo: 50,
        imagem: 'https://images.unsplash.com/photo-1602143393494-721d003de816?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 2,
        nome: 'Ecobag RecyNet',
        descricao: 'Sacola de pano 100% algodão para suas compras sem plástico.',
        custo: 100,
        imagem: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 3,
        nome: 'Kit de Canudos',
        descricao: 'Kit com 4 canudos de aço inox reutilizáveis + escova de limpeza.',
        custo: 150,
        imagem: 'https://images.unsplash.com/photo-1621245086851-93f875456b82?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 4,
        nome: 'Copo Térmico',
        descricao: 'Copo térmico 350ml para café ou bebidas geladas em qualquer lugar.',
        custo: 200,
        imagem: 'https://images.unsplash.com/photo-1517256011271-101ad9d4bbdf?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 5,
        nome: 'Kit Talheres',
        descricao: 'Conjunto de talheres de bambu sustentáveis com estojo para viagem.',
        custo: 120,
        imagem: 'https://images.unsplash.com/photo-1584346133934-a3afd2a33c4c?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 6,
        nome: 'Mochila Sustentável',
        descricao: 'Mochila resistente fabricada com tecido de garrafas PET recicladas.',
        custo: 300,
        imagem: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 7,
        nome: 'Muda de Árvore',
        descricao: 'Uma muda de árvore nativa para plantar e ajudar o reflorestamento.',
        custo: 80,
        imagem: 'https://images.unsplash.com/photo-1530836361280-1fa133a28257?q=80&w=800&auto=format&fit=crop'
      },
      {
        id: 8,
        nome: 'Vale Compras R$ 10',
        descricao: 'Vale compras de R$ 10 em supermercados e parceiros sustentáveis.',
        custo: 100,
        imagem: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop'
      }
    ];
  },

  // === LOCAIS DE COLETA ===
  getLocaisColeta() {
    return [
      {
        id: 1,
        nome: 'L&M ES Aparas de Papel',
        bairro: 'Vila Independência',
        cidade: 'Cariacica',
        estado: 'ES',
        endereco: 'Rua das Aparas, 123',
        telefone: '(27) 3343-3105',
        materiais: ['papel', 'metal'],
        horarioTexto: 'Segunda a sexta: 07:30 às 17:30h',
        // Horários estruturados para verificação real
        horarios: {
          dias: [1, 2, 3, 4, 5], // Seg a Sex
          abertura: '07:30',
          fechamento: '17:30'
        },
        mapaUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3760.832747670231!2d-40.295327585095305!3d-20.223562786418334!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb9c6b123!2sL%26M%20ES%20Aparas!5e0!3m2!1spt-BR!2sbr!4v1718123910704'
      },
      {
        id: 2,
        nome: 'Aparas Vitória',
        bairro: 'Coqueiral',
        cidade: 'Vila Velha',
        estado: 'ES',
        endereco: 'Av. Quinta, 55',
        telefone: '(27) 98134-5794',
        materiais: ['plastico'],
        horarioTexto: 'Segunda a sexta: 08:00 às 17:00h',
        horarios: {
          dias: [1, 2, 3, 4, 5],
          abertura: '08:00',
          fechamento: '17:00'
        },
        mapaUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3760.9!2d-40.280000!3d-20.225000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb9c6c999!2sAparas%20Vit%C3%B3ria!5e0!3m2!1spt-BR!2sbr!4v1718123999999'
      },
      {
        id: 3,
        nome: 'Recicla Grande Vitória - Unidade Serra',
        bairro: 'Laranjeiras',
        cidade: 'Serra',
        estado: 'ES',
        endereco: 'Av. Central, 1200',
        telefone: '(27) 3328-4000',
        materiais: ['papel', 'plastico', 'metal', 'vidro'],
        horarioTexto: 'Segunda a sábado: 08:00 às 18:00h',
        horarios: {
          dias: [1, 2, 3, 4, 5, 6], // Seg a Sáb
          abertura: '08:00',
          fechamento: '18:00'
        },
        mapaUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.5!2d-40.250000!3d-20.150000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb9c6b001!2sRecicla%20Serra!5e0!3m2!1spt-BR!2sbr!4v1718124000001'
      },
      {
        id: 4,
        nome: 'EcoPonto Jardim Camburi',
        bairro: 'Jardim Camburi',
        cidade: 'Vitória',
        estado: 'ES',
        endereco: 'Rua Italina Pereira Mota, s/n',
        telefone: '(27) 3327-1234',
        materiais: ['vidro', 'plastico', 'eletronico'],
        horarioTexto: 'Todos os dias: 07:00 às 20:00h',
        horarios: {
          dias: [0, 1, 2, 3, 4, 5, 6], // Todos os dias
          abertura: '07:00',
          fechamento: '20:00'
        },
        mapaUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3761.5!2d-40.270000!3d-20.250000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb9c6b002!2sEcoPonto%20JC!5e0!3m2!1spt-BR!2sbr!4v1718124000002'
      },
      {
        id: 5,
        nome: 'Associação de Catadores de Vila Velha (ASCAVV)',
        bairro: 'Glória',
        cidade: 'Vila Velha',
        estado: 'ES',
        endereco: 'Rua Aurora, 45',
        telefone: '(27) 3229-8877',
        materiais: ['papel', 'plastico', 'metal'],
        horarioTexto: 'Segunda a sexta: 08:00 às 16:30h',
        horarios: {
          dias: [1, 2, 3, 4, 5],
          abertura: '08:00',
          fechamento: '16:30'
        },
        mapaUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3760.5!2d-40.290000!3d-20.330000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb9c6b003!2sASCAVV!5e0!3m2!1spt-BR!2sbr!4v1718124000003'
      },
      {
        id: 6,
        nome: 'Papa-Móveis e Eletrônicos Vitória',
        bairro: 'Bento Ferreira',
        cidade: 'Vitória',
        estado: 'ES',
        endereco: 'Av. Carlos Moreira Lima, 500',
        telefone: '(27) 156',
        materiais: ['eletronico', 'metal'],
        horarioTexto: 'Segunda a sexta: 09:00 às 17:00h',
        horarios: {
          dias: [1, 2, 3, 4, 5],
          abertura: '09:00',
          fechamento: '17:00'
        },
        mapaUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3761.0!2d-40.310000!3d-20.310000!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xb9c6b004!2sPapaMoveis!5e0!3m2!1spt-BR!2sbr!4v1718124000004'
      }
    ];
  },

  // === NOTÍCIAS ===
  getNoticias() {
    return [
      {
        id: 1,
        titulo: 'Brasil amplia rede de reciclagem',
        resumo: 'País expande infraestrutura para reciclagem de eletrônicos e alerta sobre descarte irregular.',
        data: '15 de fevereiro, 2025',
        categoria: 'Nacional',
        badgeClasse: 'badge-primary',
        imagem: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=800',
        url: 'https://www.techshake.com/brasil-amplia-rede-de-reciclagem-de-eletronicos-e-alerta-para-descarte-irregular/'
      },
      {
        id: 2,
        titulo: 'Novo ponto de reciclagem em Cariacica',
        resumo: 'Iniciativa facilita o descarte consciente no Mercado Municipal de Cariacica e recebe apoio dos comerciantes.',
        data: '12 de fevereiro, 2025',
        categoria: 'Local',
        badgeClasse: 'badge-success',
        imagem: 'https://images.unsplash.com/photo-1605600611284-19561ad7ddf1?auto=format&fit=crop&q=80&w=800',
        url: 'https://www.cariacica.es.gov.br/noticias/75802/novo-ponto-de-reciclagem-e-instalado-no-mercado-municipal-e-comerciantes-aprovam-iniciativa'
      },
      {
        id: 3,
        titulo: 'O desafio da reciclagem de vidro',
        resumo: 'Especialistas explicam os desafios logísticos e econômicos da reciclagem de vidro no Brasil.',
        data: '30 de junho, 2024',
        categoria: 'Análise',
        badgeClasse: 'badge-warning',
        imagem: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=800',
        url: 'https://www.nexojornal.com.br/externo/2024/06/30/por-que-o-vidro-e-o-material-menos-reciclado-no-brasil'
      },
      {
        id: 4,
        titulo: 'Tecnologia na reciclagem de eletrônicos',
        resumo: 'Nova tecnologia transforma lixo eletrônico em recursos valiosos usando micro-ondas industriais.',
        data: '8 de janeiro, 2025',
        categoria: 'Tecnologia',
        badgeClasse: 'badge-info',
        imagem: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800',
        url: 'https://clickpetroleoegas.com.br/transformando-lixo-em-tesouro-como-os-micro-ondas-estao-revolucionando-a-reciclagem-de-lixo-eletronico-flpc96/'
      },
      {
        id: 5,
        titulo: 'Economia Circular: O futuro da indústria',
        resumo: 'Como empresas estão adotando modelos de negócio que eliminam o desperdício desde o design.',
        data: '20 de fevereiro, 2025',
        categoria: 'Economia',
        badgeClasse: 'badge-primary',
        imagem: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800',
        url: 'https://exame.com/esg/o-que-e-economia-circular/'
      },
      {
        id: 6,
        titulo: 'Cidades Lixo Zero: Exemplos que inspiram',
        resumo: 'Conheça as cidades que conseguiram reduzir drasticamente o envio de resíduos para aterros sanitários.',
        data: '10 de fevereiro, 2025',
        categoria: 'Urbanismo',
        badgeClasse: 'badge-success',
        imagem: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800',
        url: 'https://www.ecycle.com.br/lixo-zero/'
      },
      {
        id: 7,
        titulo: 'Como reciclar corretamente em casa',
        resumo: 'Um guia prático para separar seus resíduos e evitar a contaminação de materiais recicláveis.',
        data: '05 de fevereiro, 2025',
        categoria: 'Dicas',
        badgeClasse: 'badge-info',
        imagem: 'https://images.unsplash.com/photo-1528190336454-13cd56b45b5a?auto=format&fit=crop&q=80&w=800',
        url: 'https://www.wwf.org.br/natureza_brasileira/especiais/biodiversidade/reciclagem/'
      },
      {
        id: 8,
        titulo: 'O impacto do plástico nos oceanos',
        resumo: 'Dados alarmantes mostram a urgência de reduzir o consumo de plásticos de uso único.',
        data: '25 de janeiro, 2025',
        categoria: 'Meio Ambiente',
        badgeClasse: 'badge-danger',
        imagem: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&q=80&w=800',
        url: 'https://news.un.org/pt/story/2021/10/1767672'
      }
    ];
  },

  getLocalStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Erro ao ler localStorage:', error);
      return defaultValue;
    }
  },

  setLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      if (typeof Logger !== 'undefined') Logger.error('Erro ao salvar no localStorage:', error);
      return false;
    }
  },

  // === DADOS DE DEMONSTRAÇÃO ===
  // Não inicializar dados demo - começar limpo
};

// O escopo interno mantém métodos síncronos: todas as leituras e escritas de uma
// mutação acontecem depois de obter a mesma trava entre abas e Workers.
const nomesMutacoes = ['gravarUsuarios', 'salvarUsuario', 'registrarColeta',
  'registrarColetaParaUsuario', 'resgatarRecompensa', 'ajustarPontosUsuario',
  'ajustarKgUsuario', 'deletarUsuario', 'limparUsuarios', 'restaurarBackup'];
const bancoAtomico = Object.create(RecyNetDB);
nomesMutacoes.forEach(nome => { bancoAtomico[nome] = RecyNetDB[nome]; });
// IndexedDB confirma o último estado entre processos; localStorage é o espelho
// compatível com as telas. Web Locks protege também a atualização desse espelho.
let conexaoConfirmada;
RecyNetDB.persistencia = {
  abrir() {
    if (!conexaoConfirmada) conexaoConfirmada = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) { reject(new Error('O navegador bloqueou o armazenamento transacional. Permita IndexedDB para salvar com segurança.')); return; }
      const req = indexedDB.open('recynet-confirmacao-v1', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('estado');
      req.onsuccess = () => {
        const banco = req.result;
        banco.onversionchange = () => { banco.close(); conexaoConfirmada = null; };
        resolve(banco);
      };
      req.onerror = () => reject(new Error('Não foi possível abrir o armazenamento transacional. Verifique as permissões do navegador.'));
      req.onblocked = () => reject(new Error('Outra aba bloqueou o armazenamento. Feche as abas antigas e tente novamente.'));
    }).catch(erro => { conexaoConfirmada = null; throw erro; });
    return conexaoConfirmada;
  },
  async ler() {
    const banco = await this.abrir();
    return new Promise((resolve, reject) => {
      const tx = banco.transaction('estado', 'readonly');
      const req = tx.objectStore('estado').get('contas');
      let valor;
      req.onsuccess = () => { valor = req.result; };
      tx.oncomplete = () => resolve(valor === undefined ? { existe: false } : { existe: true, dados: valor });
      tx.onerror = tx.onabort = () => reject(new Error('Não foi possível ler o último estado confirmado das contas.'));
    });
  },
  async gravar(dados) {
    const banco = await this.abrir();
    return new Promise((resolve, reject) => {
      const tx = banco.transaction('estado', 'readwrite');
      tx.objectStore('estado').put(dados, 'contas');
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error('Não foi possível confirmar a gravação. Verifique a quota e as permissões do navegador.'));
    });
  }
};
RecyNetDB.transacao = function(operacao, { recuperacao = false } = {}) {
  if (!globalThis.navigator?.locks?.request) {
    const erro = new Error('Este navegador não oferece gravação segura entre abas. Use um navegador atualizado pelo servidor local ou por HTTPS.');
    erro.code = 'SEM_TRAVA';
    return Promise.reject(erro);
  }
  return navigator.locks.request('recynet:contas:v1', { mode: 'exclusive' }, async () => {
    const leitura = bancoAtomico.lerUsuarios();
    if (leitura.erro && !recuperacao) throw new Error(leitura.erro);
    const confirmado = await RecyNetDB.persistencia.ler();
    const raw = localStorage.getItem('recynet_usuarios');
    // Preservar uma base ilegível para a restauração explícita, sem apagá-la.
    if (!leitura.erro && confirmado.existe && raw !== confirmado.dados) {
      if (confirmado.dados === null) localStorage.removeItem('recynet_usuarios');
      else bancoAtomico.gravarUsuarios(JSON.parse(confirmado.dados));
    }
    const chaves = ['recynet_usuarios', 'recynet_backup_anterior', 'recynet_sessao', 'recynet_admin_acesso'];
    const anteriores = new Map(chaves.map(chave => [chave, localStorage.getItem(chave)]));
    try {
      const resultado = await operacao(bancoAtomico);
      const depois = localStorage.getItem('recynet_usuarios');
      if (!confirmado.existe || depois !== confirmado.dados) await RecyNetDB.persistencia.gravar(depois);
      return resultado;
    } catch (erro) {
      let recuperacaoFalhou = false;
      for (const chave of chaves) {
        try {
          const anterior = anteriores.get(chave);
          if (localStorage.getItem(chave) === anterior) continue;
          if (anterior === null) localStorage.removeItem(chave);
          else localStorage.setItem(chave, anterior);
        } catch (_) { recuperacaoFalhou = true; }
      }
      throw new Error(erro.message + (recuperacaoFalhou ? ' Não foi possível recompor o espelho local. O estado confirmado permanece preservado.' : ''));
    }
  });
};
nomesMutacoes.forEach(nome => {
  RecyNetDB[nome] = async function(...args) {
    try {
      const helper = ['salvarUsuario', 'gravarUsuarios'].includes(nome);
      const solicitante = helper ? null : this.getUsuarioAutenticado();
      return await this.transacao(db => {
        const atual = helper ? null : db.getUsuarioAutenticado();
        if (!helper && (solicitante?.id !== atual?.id || solicitante?.tipo !== atual?.tipo)) {
          return { sucesso: false, erro: 'A sessão mudou enquanto a operação aguardava outra aba. Tente novamente.' };
        }
        if (nome === 'gravarUsuarios' && (!versoesBases.has(args[0]) ||
            versoesBases.get(args[0]) !== localStorage.getItem('recynet_usuarios'))) {
          throw new Error('A base mudou ou não é uma leitura atual. Use uma transação ou restaure um backup validado.');
        }
        return bancoAtomico[nome].apply(db, args);
      }, { recuperacao: nome === 'restaurarBackup' });
    } catch (erro) {
      if (['salvarUsuario', 'gravarUsuarios'].includes(nome)) throw erro;
      return { sucesso: false, erro: erro.message };
    }
  };
});

// Exportar globalmente
window.RecyNetDB = RecyNetDB;
