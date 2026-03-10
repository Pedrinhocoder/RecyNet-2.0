/* ========================================
   RECYNET 2.0 - RANKING SYSTEM
   Sistema de ranking baseado em totalKg
   ======================================== */

const RankingSystem = {
  
  // Carregar ranking de usuários
  carregarRanking() {
    const usuarios = RecyNetDB.getUsuarios();
    
    // Filtrar apenas usuários (não admin) com totalKg > 0
    return usuarios
      .filter(u => u.tipo === 'user' && u.totalKg > 0)
      .sort((a, b) => b.totalKg - a.totalKg)
      .map((usuario, index) => ({
        posicao: index + 1,
        id: usuario.id,
        nome: usuario.nome,
        totalKg: usuario.totalKg,
        totalPontosGanhos: usuario.totalPontosGanhos,
        nivel: usuario.nivel || 1
      }));
  },

  // Obter posição de um usuário específico
  obterPosicaoUsuario(usuarioId) {
    const ranking = this.carregarRanking();
    const posicao = ranking.findIndex(u => u.id === usuarioId);
    return posicao >= 0 ? posicao + 1 : null;
  },

  // Obter top N usuários
  obterTop(n = 10) {
    const ranking = this.carregarRanking();
    return ranking.slice(0, n);
  },

  // Obter pódio (top 3)
  obterPodio() {
    return this.obterTop(3);
  },

  // Calcular percentil do usuário
  calcularPercentil(usuarioId) {
    const ranking = this.carregarRanking();
    const posicao = ranking.findIndex(u => u.id === usuarioId);
    
    if (posicao < 0 || ranking.length === 0) return 0;
    
    const percentil = Math.round((1 - posicao / ranking.length) * 100);
    return percentil;
  },

  // Obter badge de ranking baseado na posição
  obterBadge(posicao) {
    if (posicao === 1) return { texto: '🥇 1º Lugar', classe: 'badge-gold' };
    if (posicao === 2) return { texto: '🥈 2º Lugar', classe: 'badge-silver' };
    if (posicao === 3) return { texto: '🥉 3º Lugar', classe: 'badge-bronze' };
    if (posicao <= 10) return { texto: `🏅 Top 10 - ${posicao}º`, classe: 'badge-top10' };
    return { texto: `#${posicao}`, classe: 'badge-default' };
  },

  // Renderizar ranking na página
  renderizarRanking(containerId, usuarioLogadoId = null) {
    const ranking = this.carregarRanking();
    const container = document.getElementById(containerId);
    
    if (!container) {
      if (typeof Logger !== 'undefined') {
        Logger.error(`Container #${containerId} não encontrado`);
      }
      return;
    }

    if (ranking.length === 0) {
      container.innerHTML = `
        <div class="ranking-empty">
          <p>📊 Nenhum usuário com kg registrado ainda.</p>
          <p>Seja o primeiro a reciclar e aparecer no ranking!</p>
        </div>
      `;
      return;
    }

    let html = '<div class="ranking-list">';
    
    ranking.forEach(usuario => {
      const badge = this.obterBadge(usuario.posicao);
      const isUsuarioLogado = usuario.id === usuarioLogadoId;
      const highlightClass = isUsuarioLogado ? 'ranking-item-highlight' : '';
      
      html += `
        <div class="ranking-item ${highlightClass}">
          <div class="ranking-posicao">
            <span class="rank-number">${usuario.posicao}º</span>
            <span class="rank-badge ${badge.classe}">${badge.texto.split(' ')[0]}</span>
          </div>
          <div class="ranking-avatar">
            <div class="avatar-circle">${usuario.nome.charAt(0)}</div>
          </div>
          <div class="ranking-usuario">
            <span class="ranking-nome">${usuario.nome}${isUsuarioLogado ? ' <span class="me-tag">Você</span>' : ''}</span>
            <span class="ranking-nivel">Nível ${usuario.nivel} • ${RecyNetDB.TITULOS_NIVEL[usuario.nivel] || 'Reciclador'}</span>
          </div>
          <div class="ranking-stats">
            <div class="stat-group">
              <span class="stat-icon">♻️</span>
              <span class="ranking-kg">${usuario.totalKg.toFixed(1)} kg</span>
            </div>
            <div class="stat-group">
              <span class="stat-icon">⭐</span>
              <span class="ranking-pontos">${Math.floor(usuario.totalPontosGanhos)} pts</span>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  },

  // Renderizar ranking resumido (Top 3)
  renderizarRankingResumo(containerId, usuarioLogadoId = null) {
    const ranking = this.obterTop(3);
    const container = document.getElementById(containerId);
    
    if (!container) return;

    if (ranking.length === 0) {
      container.innerHTML = '<p class="text-center text-gray p-md">Nenhum dado de ranking disponível.</p>';
      return;
    }

    let html = '<div class="ranking-list-summary">';
    
    ranking.forEach(usuario => {
      const isUsuarioLogado = usuario.id === usuarioLogadoId;
      const highlightClass = isUsuarioLogado ? 'ranking-item-highlight' : '';
      
      html += `
        <div class="ranking-item ${highlightClass}">
          <div class="ranking-posicao">
            <span class="rank-number">${usuario.posicao}º</span>
          </div>
          <div class="ranking-avatar">
            <div class="avatar-circle">${usuario.nome.charAt(0)}</div>
          </div>
          <div class="ranking-usuario">
            <span class="ranking-nome">${usuario.nome}${isUsuarioLogado ? ' <span class="me-tag">Você</span>' : ''}</span>
          </div>
          <div class="ranking-stats">
            <span class="ranking-kg">♻️ ${usuario.totalKg.toFixed(1)} kg</span>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    html += `
      <div style="text-align: center; margin-top: var(--spacing-lg);">
        <a href="ranking.html" class="btn btn-outline btn-sm">Ver Ranking Completo</a>
      </div>
    `;
    container.innerHTML = html;
  },

  // Renderizar pódio (top 3)
  renderizarPodio(containerId) {
    const podio = this.obterPodio();
    const container = document.getElementById(containerId);
    
    if (!container) {
      if (typeof Logger !== 'undefined') {
        Logger.error(`Container #${containerId} não encontrado`);
      }
      return;
    }

    if (podio.length === 0) {
      container.innerHTML = `
        <div class="podio-empty">
          <p>🏆 Ranking vazio. Seja o primeiro!</p>
        </div>
      `;
      return;
    }

    // Reordenar para exibição visual: 2º, 1º, 3º
    const ordem = [podio[1], podio[0], podio[2]].filter(u => u);
    
    let html = '<div class="podio-visual-container">';
    
    ordem.forEach((usuario) => {
      const posicao = usuario.posicao;
      const icone = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : '🥉';
      const classePosicao = posicao === 1 ? 'gold' : posicao === 2 ? 'silver' : 'bronze';
      
      html += `
        <div class="podio-item-modern podio-${classePosicao}">
          <div class="podio-user-info">
            <div class="podio-avatar-wrapper">
              <div class="podio-avatar-main">${usuario.nome.charAt(0)}</div>
              <span class="podio-medal-overlay">${icone}</span>
            </div>
            <span class="podio-name-modern">${usuario.nome}</span>
            <span class="podio-kg-modern">♻️ ${usuario.totalKg.toFixed(1)} kg</span>
          </div>
          <div class="podio-pedestal-modern">
            <span class="podio-number-modern">${posicao}º</span>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  },

  // Renderizar card de posição do usuário
  renderizarPosicaoUsuario(containerId, usuarioId) {
    const posicao = this.obterPosicaoUsuario(usuarioId);
    const percentil = this.calcularPercentil(usuarioId);
    const container = document.getElementById(containerId);
    
    if (!container) {
      if (typeof Logger !== 'undefined') {
        Logger.error(`Container #${containerId} não encontrado`);
      }
      return;
    }

    if (!posicao) {
      container.innerHTML = `
        <div class="user-position-empty">
          <p>📊 Você ainda não está no ranking.</p>
          <p>Registre suas primeiras coletas para aparecer!</p>
        </div>
      `;
      return;
    }

    const badge = this.obterBadge(posicao);
    const totalUsuarios = this.carregarRanking().length;
    
    const html = `
      <div class="user-position-card">
        <div class="position-badge ${badge.classe}">
          ${posicao}º
        </div>
        <div class="position-info">
          <p>Você está entre os <strong>top ${percentil}%</strong> recicladores!</p>
          <p class="position-total">${totalUsuarios} usuários no ranking</p>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  },

  // Obter estatísticas do ranking
  obterEstatisticas() {
    const ranking = this.carregarRanking();
    
    if (ranking.length === 0) {
      return {
        totalUsuarios: 0,
        totalKgSistema: 0,
        mediaKgPorUsuario: 0,
        lider: null
      };
    }

    const totalKgSistema = ranking.reduce((sum, u) => sum + u.totalKg, 0);
    const mediaKgPorUsuario = totalKgSistema / ranking.length;
    
    return {
      totalUsuarios: ranking.length,
      totalKgSistema: totalKgSistema,
      mediaKgPorUsuario: mediaKgPorUsuario,
      lider: ranking[0]
    };
  }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.RankingSystem = RankingSystem;
}
