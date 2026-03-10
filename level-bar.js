/* ========================================
   RECYNET 2.0 - LEVEL BAR COMPONENT
   Componente de barra de nível (destaque e discreta)
   ======================================== */

const LevelBar = {

  _calcularProgresso(totalKg) {
    if (typeof RecyNetDB !== 'undefined' && RecyNetDB && typeof RecyNetDB.calcularProgressoNivel === 'function') {
      return RecyNetDB.calcularProgressoNivel(totalKg);
    }

    const nivel = this.calcularNivel(totalKg);
    let kgAcumulado = 0;
    for (let i = 1; i < nivel; i++) {
      kgAcumulado += this.calcularKgNecessario(i);
    }

    const kgNecessario = this.calcularKgNecessario(nivel);
    const kgNoNivelAtual = totalKg - kgAcumulado;
    const porcentagem = (kgNoNivelAtual / kgNecessario) * 100;

    return {
      nivel,
      kgAtual: kgNoNivelAtual,
      kgNecessario,
      kgFaltando: kgNecessario - kgNoNivelAtual,
      porcentagem: Math.min(porcentagem, 100),
      proximoNivel: nivel + 1,
      titulo: this.getTitulo(nivel)
    };
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
            <span class="level-progress-current">${porcentagem.toFixed(1)}% para o próximo nível</span>
            <span class="level-progress-next">Faltam ${kgRestante.toFixed(2)} kg</span>
          </div>
        </div>
        <div class="level-progress-bar">
          <div class="level-progress-fill" style="width: ${porcentagem}%">
            <span class="level-progress-percentage">${porcentagem.toFixed(0)}%</span>
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
          <div class="level-bar-compact-text">${porcentagem.toFixed(0)}% do próximo nível</div>
        </div>
      </div>
    `;
  },

  // Obter título baseado no nível
  getTitulo(nivel) {
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
    return 3 + (nivel * 1.5);
  },

  // Calcular nível baseado em KG total
  calcularNivel(totalKg) {
    let nivel = 1;
    let kgAcumulado = 0;

    while (kgAcumulado <= totalKg) {
      const kgParaProximo = this.calcularKgNecessario(nivel);
      if (kgAcumulado + kgParaProximo > totalKg) {
        break;
      }
      kgAcumulado += kgParaProximo;
      nivel++;
    }

    return nivel;
  }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.LevelBar = LevelBar;
}
