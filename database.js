/* ========================================
   RECYNET 2.0 - DATABASE MANAGER
   Sistema centralizado de gerenciamento de dados
   ======================================== */

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

  // === ESTRUTURA DE USUÁRIO ===
  criarUsuario(nome, email, senhaHash, tipo = 'user') {
    return {
      id: this.gerarId(),
      nome,
      email,
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
    const usuarios = this.getUsuarios();
    const index = usuarios.findIndex(u => u.id === usuario.id);
    
    if (index !== -1) {
      usuarios[index] = usuario;
    } else {
      usuarios.push(usuario);
    }
    
    localStorage.setItem('recynet_usuarios', JSON.stringify(usuarios));
    
    // Se for o usuário logado, atualizar a sessão
    const logado = this.getUsuarioLogado();
    if (logado && logado.id === usuario.id) {
      this.setUsuarioLogado(usuario);
    }
    return true;
  },

  getUsuarios() {
    const data = localStorage.getItem('recynet_usuarios');
    const usuarios = data ? JSON.parse(data) : [];
    
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

  getUsuarioPorEmail(email) {
    // Busca direta pelo admin estático para rapidez e garantia
    if (email === this.ADMIN_ESTATICO.email) {
      return this.ADMIN_ESTATICO;
    }
    const usuarios = this.getUsuarios();
    return usuarios.find(u => u.email === email);
  },

  getUsuarioPorId(id) {
    // Busca direta pelo admin estático
    if (id === this.ADMIN_ESTATICO.id) {
      return this.ADMIN_ESTATICO;
    }
    const usuarios = this.getUsuarios();
    return usuarios.find(u => u.id === id);
  },

  // === SESSÃO ===
  setUsuarioLogado(usuario) {
    // Remove senha antes de salvar na sessão
    const usuarioSemSenha = { ...usuario };
    delete usuarioSemSenha.senha;
    
    this.setLocalStorage('recynet_sessao', usuarioSemSenha);
  },

  getUsuarioLogado() {
    return this.getLocalStorage('recynet_sessao');
  },

  logout() {
    localStorage.removeItem('recynet_sessao');
  },

  // === REGISTRO DE COLETA ===
  registrarColeta(usuarioId, material, gramas) {
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };

    // Validações
    if (gramas < 100) {
      return { sucesso: false, erro: 'Mínimo de 100g por registro' };
    }

    const materialLower = material.toLowerCase();
    if (!this.PONTOS_POR_KG[materialLower]) {
      return { sucesso: false, erro: 'Material inválido' };
    }

    // Cálculos (não arredondar internamente)
    const kg = gramas / 1000;
    const pontosGanhos = kg * this.PONTOS_POR_KG[materialLower];

    // Atualizar dados do usuário
    usuario.totalKg += kg;
    usuario.materiais[materialLower] += kg;
    usuario.totalPontosGanhos += pontosGanhos;
    usuario.pontosDisponiveis += pontosGanhos;

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
      data: new Date().toISOString()
    };
    usuario.historico.unshift(registro); // Adiciona no início

    // Verificar se subiu de nível
    const subiuNivel = novoNivel > nivelAntes;
    const titulo = this.TITULOS_NIVEL[novoNivel] || null;

    // Salvar usuário
    this.salvarUsuario(usuario);
    this.setUsuarioLogado(usuario); // Atualiza sessão

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
  resgatarRecompensa(usuarioId, nomeRecompensa, custo) {
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };

    if (usuario.pontosDisponiveis < custo) {
      return { sucesso: false, erro: 'Pontos insuficientes' };
    }

    // Descontar pontos
    usuario.pontosDisponiveis -= custo;
    usuario.pontosGastos += custo;

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
    this.salvarUsuario(usuario);
    this.setUsuarioLogado(usuario);

    return {
      sucesso: true,
      pontosRestantes: usuario.pontosDisponiveis,
      usuario
    };
  },

  // === SISTEMA DE NÍVEIS (FIXO: 2KG POR NÍVEL) ===
  calcularNivel(totalKg) {
    // Nível 1: 0kg a 1.99kg
    // Nível 2: 2kg a 3.99kg
    // Nível 3: 4kg a 5.99kg
    // Fórmula: 1 + floor(totalKg / 2)
    return 1 + Math.floor(totalKg / 2);
  },

  calcularProgressoNivel(totalKg) {
    const nivel = this.calcularNivel(totalKg);
    
    // Kg necessário para o próximo nível (sempre 2kg por nível)
    const kgNecessario = 2;
    
    // Kg atual dentro do nível (resto da divisão por 2)
    const kgNoNivelAtual = totalKg % 2;
    
    // Porcentagem do progresso para o próximo nível
    const porcentagem = (kgNoNivelAtual / kgNecessario) * 100;
    
    // Kg que faltam para o próximo nível
    const kgFaltando = kgNecessario - kgNoNivelAtual;

    return {
      nivel,
      kgAtual: kgNoNivelAtual,
      kgNecessario,
      kgFaltando,
      porcentagem: Math.min(porcentagem, 100),
      proximoNivel: nivel + 1,
      titulo: this.TITULOS_NIVEL[nivel] || `Nível ${nivel}`
    };
  },

  // === RANKING ===
  getRanking(limite = 100) {
    const usuarios = this.getUsuarios()
      .filter(u => u.tipo === 'user')
      .sort((a, b) => b.totalKg - a.totalKg)
      .slice(0, limite);

    return usuarios.map((u, index) => ({
      posicao: index + 1,
      id: u.id,
      nome: u.nome,
      totalKg: u.totalKg,
      nivel: u.nivel,
      titulo: this.TITULOS_NIVEL[u.nivel] || `Nível ${u.nivel}`
    }));
  },

  getPosicaoUsuario(usuarioId) {
    const ranking = this.getRanking(1000);
    const posicao = ranking.findIndex(r => r.id === usuarioId);
    return posicao >= 0 ? posicao + 1 : null;
  },

  // === ESTATÍSTICAS ===
  getEstatisticasUsuario(usuarioId) {
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return null;

    const progresso = this.calcularProgressoNivel(usuario.totalKg);
    const posicao = this.getPosicaoUsuario(usuarioId);

    // Material mais reciclado
    const materialMaisReciclado = Object.entries(usuario.materiais)
      .sort(([,a], [,b]) => b - a)[0];

    // Histórico dos últimos 30 dias
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const coletasRecentes = usuario.historico
      .filter(h => h.tipo === 'coleta' && new Date(h.data) >= treintaDiasAtras);

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
    return kg.toFixed(2).replace('.', ',') + ' kg';
  },

  formatarPontos(pontos) {
    return this.formatarNumero(Math.round(pontos));
  },

  // === FUNÇÕES ADMINISTRATIVAS ===
  
  // Registrar coleta para um usuário (admin)
  registrarColetaParaUsuario(usuarioId, material, kg) {
    const usuario = this.getUsuarioPorId(usuarioId);
    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };

    // Função recebe kg, mas o registrador principal trabalha em gramas
    const gramas = kg * 1000;
    return this.registrarColeta(usuarioId, material, gramas);
  },

  // === GERENCIAMENTO DE USUÁRIOS (ADMIN) ===
  

  // Ajustar pontos de um usuário (admin)
  ajustarPontosUsuario(usuarioId, pontos, motivo = 'Ajuste administrativo') {
    try {
      const usuarios = this.getUsuarios();
      const index = usuarios.findIndex(u => u.id === usuarioId);
      
      if (index === -1) return { sucesso: false, erro: 'Usuário não encontrado' };
      
      const usuario = usuarios[index];

      // Garantir que os campos existam
      if (usuario.pontosDisponiveis === undefined) usuario.pontosDisponiveis = 0;
      if (usuario.totalPontosGanhos === undefined) usuario.totalPontosGanhos = 0;
      if (!usuario.historico) usuario.historico = [];

      usuario.pontosDisponiveis += pontos;
      if (usuario.pontosDisponiveis < 0) usuario.pontosDisponiveis = 0;

      // Ajustar o total histórico também para refletir resets
      usuario.totalPontosGanhos += pontos;
      if (usuario.totalPontosGanhos < 0) usuario.totalPontosGanhos = 0;

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
      localStorage.setItem('recynet_usuarios', JSON.stringify(usuarios));
      
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
    try {
      const usuarios = this.getUsuarios();
      const index = usuarios.findIndex(u => u.id === usuarioId);
      
      if (index === -1) return { sucesso: false, erro: 'Usuário não encontrado' };
      
      const usuario = usuarios[index];

      if (usuario.totalKg === undefined) usuario.totalKg = 0;
      if (!usuario.historico) usuario.historico = [];
      if (!usuario.materiais) usuario.materiais = { papel: 0, plastico: 0, vidro: 0, metal: 0, eletronico: 0 };

      const nivelAnterior = this.calcularNivel(usuario.totalKg);

      usuario.totalKg += kg;
      if (usuario.totalKg < 0) usuario.totalKg = 0;

      if (material && usuario.materiais.hasOwnProperty(material)) {
        usuario.materiais[material] += kg;
        if (usuario.materiais[material] < 0) usuario.materiais[material] = 0;
      }

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
      localStorage.setItem('recynet_usuarios', JSON.stringify(usuarios));
      
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
    let usuarios = this.getUsuarios();
    const usuario = usuarios.find(u => u.id === usuarioId);
    
    if (!usuario) return { sucesso: false, erro: 'Usuário não encontrado' };
    if (usuario.tipo === 'admin') return { sucesso: false, erro: 'Não é possível deletar administrador' };

    usuarios = usuarios.filter(u => u.id !== usuarioId);
    localStorage.setItem('recynet_usuarios', JSON.stringify(usuarios));
    
    return { sucesso: true };
  },

  // Estatísticas gerais (admin)
  getEstatisticasGerais() {
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
      console.error('Erro ao salvar no localStorage:', error);
      return false;
    }
  },

  // === DADOS DE DEMONSTRAÇÃO ===
  // Não inicializar dados demo - começar limpo
};

// Exportar globalmente
window.RecyNetDB = RecyNetDB;
