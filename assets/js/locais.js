// Gerenciador da Página de Locais de Coleta
const LocaisManager = {
  locais: [],
  filtrosAtivos: {
    texto: '',
    materiais: [],
    aberto: false
  },

  init() {
    this.locais = RecyNetDB.getLocaisColeta();
    this.setupListeners();
    this.renderizarLocais();
    setInterval(() => this.atualizarFuncionamento(), 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.atualizarFuncionamento(); });
  },

  isAbertoAgora(horarios, agora = new Date()) {
    if (!horarios) return false;

    // Os estabelecimentos cadastrados ficam no Espírito Santo.
    const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(agora).map(parte => [parte.type, parte.value]));
    const diaSemana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.weekday);
    if (!horarios.dias.includes(diaSemana)) return false;
    const tempoAtual = Number(partes.hour) * 60 + Number(partes.minute);

    const [hAbre, mAbre] = horarios.abertura.split(':').map(Number);
    const [hFecha, mFecha] = horarios.fechamento.split(':').map(Number);

    const tempoAbre = hAbre * 60 + mAbre;
    const tempoFecha = hFecha * 60 + mFecha;

    return tempoAtual >= tempoAbre && tempoAtual < tempoFecha;
  },

  normalizarBusca(texto) { return String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); },

  atualizarFuncionamento() {
    if (this.filtrosAtivos.aberto) { this.renderizarLocais(); return; }
    document.querySelectorAll('.location-card').forEach(card => {
      const local = this.locais.find(local => String(local.id) === card.dataset.localId);
      if (!local) return;
      const aberto = this.isAbertoAgora(local.horarios);
      const badge = card.querySelector('.badge');
      badge.className = `badge ${aberto ? 'badge-success' : 'badge-danger'}`;
      badge.textContent = aberto ? 'Aberto' : 'Fechado';
    });
  },

  setupListeners() {
    const searchInput = document.getElementById('searchInput');
    const checkboxes = document.querySelectorAll('.filter-checkbox input');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filtrosAtivos.texto = this.normalizarBusca(e.target.value);
        this.renderizarLocais();
      });
    }

    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.value === 'aberto') {
          this.filtrosAtivos.aberto = cb.checked;
        } else {
          if (cb.checked) {
            this.filtrosAtivos.materiais.push(cb.value);
          } else {
            this.filtrosAtivos.materiais = this.filtrosAtivos.materiais.filter(m => m !== cb.value);
          }
        }
        this.renderizarLocais();
      });
    });
  },

  renderizarLocais() {
    const container = document.querySelector('.locations-list');
    const emptyState = document.querySelector('.empty-state');

    // Filtragem
    const locaisFiltrados = this.locais.filter(local => {
      const matchTexto = !this.filtrosAtivos.texto ||
        this.normalizarBusca(local.nome).includes(this.filtrosAtivos.texto) ||
        this.normalizarBusca(local.bairro).includes(this.filtrosAtivos.texto) ||
        this.normalizarBusca(local.cidade).includes(this.filtrosAtivos.texto) ||
        local.materiais.some(m => this.normalizarBusca(m).includes(this.filtrosAtivos.texto));

      const matchMateriais = this.filtrosAtivos.materiais.length === 0 ||
        this.filtrosAtivos.materiais.every(m => local.materiais.includes(m));

      const matchAberto = !this.filtrosAtivos.aberto || this.isAbertoAgora(local.horarios);

      return matchTexto && matchMateriais && matchAberto;
    });

    // Limpar cards antigos (mantendo o empty-state)
    const cards = container.querySelectorAll('.location-card');
    cards.forEach(card => card.remove());

    if (locaisFiltrados.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      locaisFiltrados.forEach(local => {
        const card = this.criarCardLocal(local);
        container.insertBefore(card, emptyState);
      });
    }
  },

  criarCardLocal(local) {
    const div = document.createElement('div');
    div.className = 'location-card card fade-in-up';
    div.dataset.localId = String(local.id);

    const aberto = this.isAbertoAgora(local.horarios);
    const materiaisFormatados = local.materiais.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ');

    div.innerHTML = `
      <div class="location-header">
        <h2 class="location-name">${local.nome}</h2>
        <span class="badge ${aberto ? 'badge-success' : 'badge-danger'}">
          ${aberto ? 'Aberto' : 'Fechado'}
        </span>
      </div>

      <div class="location-body">
        <div class="location-info">
          <div class="info-item">
            <span class="info-icon">📍</span>
            <span>${local.endereco} - ${local.bairro}, ${local.cidade} - ${local.estado}</span>
          </div>

          <div class="info-item">
            <span class="info-icon">🕐</span>
            <span>${local.horarioTexto}</span>
          </div>

          <div class="info-item">
            <span class="info-icon">♻️</span>
            <span>Aceita: <strong>${materiaisFormatados}</strong></span>
          </div>

          <div class="info-item">
            <span class="info-icon">📞</span>
            <span>${local.telefone}</span>
          </div>
        </div>

        <div class="location-map">
          <iframe title="Mapa de ${local.nome}"
            src="${local.mapaUrl}"
            width="100%"
            height="250"
            style="border:0; border-radius: 12px;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
      </div>

      <div class="location-footer">
        <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(local.nome + ' ' + local.endereco + ' ' + local.cidade + ' ' + local.estado)}" target="_blank" class="btn btn-primary">
          🗺️ Traçar Rota
        </a>
        <button class="btn btn-outline" onclick="compartilhar('${local.nome}')">
          📤 Compartilhar
        </button>
      </div>
    `;
    return div;
  }
};

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  LocaisManager.init();
});
