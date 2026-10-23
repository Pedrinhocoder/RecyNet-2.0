/* ========================================
   RECYNET 2.0 - COOPERADO PAGE
   Dashboard do usuário cooperado
   ======================================== */

// Inicialização da página
document.addEventListener('DOMContentLoaded', function() {
  // Proteger página e obter usuário logado
  const usuarioLogado = RecyNetAuth.protegerCooperado();

  if (!usuarioLogado) return;

  // Carregar dados atualizados do banco
  const usuarioAtualizado = RecyNetDB.getUsuarioPorId(usuarioLogado.id);
  if (!usuarioAtualizado) {
    window.location.href = 'recynet.html';
    return;
  }

  // Atualizar sessão
  RecyNetAuth.setUsuarioLogado(usuarioAtualizado);

  // Renderizar componentes
  renderizarBemVindo(usuarioAtualizado);
  renderizarEstatisticas(usuarioAtualizado);
  renderizarBarraNivel(usuarioAtualizado);
  renderizarAtividadesRecentes(usuarioAtualizado);
  renderizarKgSemanal(usuarioAtualizado);
});

// Renderizar mensagem de boas-vindas
function renderizarBemVindo(usuario) {
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    userNameEl.textContent = usuario.nome;
  }
}

// Renderizar estatísticas do usuário
function renderizarEstatisticas(usuario) {
  // Nível
  const levelEl = document.getElementById('userLevel');
  if (levelEl) {
    levelEl.textContent = usuario.nivel || 1;
  }

  // Pontos
  const pointsEl = document.getElementById('userPoints');
  if (pointsEl) {
    pointsEl.textContent = RecyNetDB.formatarPontos(usuario.pontosDisponiveis || 0);
  }

  // Total KG
  const kgEl = document.getElementById('userKg');
  if (kgEl) {
    kgEl.textContent = RecyNetDB.formatarKg(usuario.totalKg || 0);
  }

  // Ranking
  const rankEl = document.getElementById('userRank');
  if (rankEl && typeof RankingSystem !== 'undefined') {
    const posicao = RankingSystem.obterPosicaoUsuario(usuario.id);
    rankEl.textContent = posicao ? `#${posicao}` : 'N/A';
  }
}

// Renderizar barra de nível (DESTAQUE)
function renderizarBarraNivel(usuario) {
  const container = document.getElementById('level-bar-container');
  if (!container) {
    console.error('Container level-bar-container não encontrado');
    return;
  }

  if (typeof LevelBar === 'undefined') {
    console.error('LevelBar não carregado');
    return;
  }

  // DESTAQUE para cooperado
  container.innerHTML = LevelBar.renderHighlight(usuario);
}

// Renderizar atividades recentes
function renderizarAtividadesRecentes(usuario) {
  const container = document.getElementById('recent-activities');
  if (!container) return;

  const historico = usuario.historico || [];

  if (historico.length === 0) {
    container.innerHTML = `
      <div class="activities-empty">
        <p>📋 Nenhuma atividade registrada ainda.</p>
        <p>Comece a reciclar para ver seu histórico!</p>
      </div>
    `;
    return;
  }

  // Pegar últimas 5 atividades
  const ultimas = historico.slice(0, 5);

  let html = '<div class="activities-list">';

  ultimas.forEach(atividade => {
    const data = new Date(atividade.data);
    const dataFormatada = data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    let icone = '⭐';
    let texto = 'Atividade';

    if (atividade.tipo === 'coleta') {
      icone = '♻️';
      const kg = atividade.kg || 0;
      const pontos = RecyNetDB.formatarPontos(atividade.pontosGanhos || 0);
      texto = `Reciclou ${RecyNetDB.formatarKg(kg)} de ${atividade.material} (+${pontos} pts)`;
    } else if (atividade.tipo === 'resgate') {
      icone = '🎁';
      const custo = RecyNetDB.formatarPontos(atividade.custo || 0);
      texto = `Resgatou ${atividade.recompensa} (-${custo} pts)`;
    } else if (atividade.tipo === 'nivel') {
      icone = '🏆';
      texto = `Subiu para o nível ${atividade.novoNivel}!`;
    }

    const ajuste = RecyNetUtils.formatarAjusteHistorico(atividade);
    if (ajuste) ({ icone, texto } = ajuste);

    html += `
      <div class="activity-item">
        <span class="activity-icon">${icone}</span>
        <span class="activity-text">${RecyNetUtils.escapeHTML(texto)}</span>
        <span class="activity-date">${dataFormatada}</span>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// Renderizar KG semanal
function renderizarKgSemanal(usuario, agora = new Date()) {
  const weeklyKgEl = document.getElementById('weeklyKg');
  if (!weeklyKgEl) return;

  // Semana do calendário local: segunda-feira à meia-noite até agora.
  const historico = usuario.historico || [];
  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - (inicio.getDay() + 6) % 7);

  const kgSemanal = historico
    .filter(h => h.tipo === 'coleta' && new Date(h.data) >= inicio && new Date(h.data) <= agora)
    .reduce((sum, h) => sum + (h.kg || 0), 0);

  weeklyKgEl.textContent = `${RecyNetDB.formatarKg(kgSemanal)}`;
}

document.addEventListener('DOMContentLoaded', () => RecyNetUtils.aoAtualizarDados(u => { renderizarBemVindo(u); renderizarEstatisticas(u); renderizarBarraNivel(u); renderizarAtividadesRecentes(u); renderizarKgSemanal(u); }));
