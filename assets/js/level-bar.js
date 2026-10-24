/* ========================================
   RECYNET 2.0 - LEVEL BAR COMPONENT
   Componente de barra de nível (destaque e discreta)
   ======================================== */

const LevelBar = {

  _calcularProgresso(totalKg) {
    return RecyNetDB.calcularProgressoNivel(totalKg);
  },

  // Renderizar barra de nível em DESTAQUE (40px, grande, para dashboards)
  renderHighlight(usuario) {
    if (!usuario) return '';
    const totalKg = usuario.totalKg || 0;
    const progresso = this._calcularProgresso(totalKg);
    const nivelAtual = progresso.nivel;
    const porcentagem = progresso.porcentagem;
    const kgRestante = Math.max(0, progresso.kgFaltando);
    const titulo = progresso.titulo;

    return `
      <div class="level-bar-highlight">
        <div class="level-bar-header">
          <div class="level-badge-large">
            <span class="level-badge-number">${nivelAtual}</span>
            <span class="level-badge-title">${titulo}</span>
          </div>
          <div class="level-progress-info">
            <span class="level-progress-current">${(Math.floor(porcentagem * 10) / 10).toFixed(1)}% para o próximo nível</span>
            <span class="level-progress-next">Faltam ${RecyNetDB.formatarKg(kgRestante)} · Meta: ${RecyNetDB.formatarKg(progresso.kgProximoNivel)} acumulados</span>
          </div>
        </div>
        <div class="level-progress-bar">
          <div class="level-progress-fill" style="width: ${porcentagem}%">
            <span class="level-progress-percentage">${Math.floor(porcentagem)}%</span>
          </div>
        </div>
      </div>
    `;
  },

  // Renderizar barra de nível DISCRETA (8px, compacta, para páginas secundárias)
  renderCompact(usuario) {
    if (!usuario) return '';
    const totalKg = usuario.totalKg || 0;
    const progresso = this._calcularProgresso(totalKg);
    const nivelAtual = progresso.nivel;
    const porcentagem = progresso.porcentagem;
    const titulo = progresso.titulo;

    return `
      <div class="level-bar-compact">
        <div class="level-bar-compact-badge">${nivelAtual}</div>
        <div class="level-bar-compact-info">
          <div class="level-bar-compact-title">${titulo}</div>
          <div class="level-bar-compact-progress">
            <div class="level-bar-compact-fill" style="width: ${porcentagem}%"></div>
          </div>
          <div class="level-bar-compact-text">${Math.floor(porcentagem)}% do próximo nível · Faltam ${RecyNetDB.formatarKg(progresso.kgFaltando)}</div>
        </div>
      </div>
    `;
  },

  // Obter título baseado no nível
  getTitulo(nivel) {
    if (typeof RecyNetDB !== 'undefined') return RecyNetDB.getTituloNivel(nivel);
    const titulos = {
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
    };

    // Encontrar o título do marco mais próximo (igual ou abaixo)
    const marcos = Object.keys(titulos).map(Number).sort((a, b) => a - b);
    let tituloAtual = titulos[1]; // Padrão

    for (const marco of marcos) {
      if (nivel >= marco) {
        tituloAtual = titulos[marco];
      } else {
        break;
      }
    }

    return tituloAtual;
  },

  // Calcular KG necessário para um nível
  calcularKgNecessario(nivel) {
    return RecyNetDB.calcularKgNecessario(nivel);
  },

  // Calcular nível baseado em KG total
  calcularNivel(totalKg) {
    return RecyNetDB.calcularNivel(totalKg);
  }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.LevelBar = LevelBar;
}
