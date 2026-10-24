/* ========================================
   RECYNET 2.0 - UTILITÁRIOS JAVASCRIPT
   Funções comuns para todas as páginas
   ======================================== */

// === SISTEMA DE LOGGING CONDICIONAL ===
const DEBUG_MODE = false; // Mudar para true em desenvolvimento

window.Logger = {
  log: (...args) => {
    if (DEBUG_MODE) console.log('[LOG]', ...args);
  },
  error: (...args) => {
    if (DEBUG_MODE) console.error('[ERROR]', ...args);
  },
  warn: (...args) => {
    if (DEBUG_MODE) console.warn('[WARN]', ...args);
  },
  info: (...args) => {
    if (DEBUG_MODE) console.info('[INFO]', ...args);
  }
};

// === NAVBAR MOBILE ===
function initNavbar() {
  const navbarToggle = document.getElementById('navbarToggle');
  const navbarMenu = document.getElementById('navbarMenu');
  const navbarActions = document.getElementById('navbarActions');

  if (navbarToggle && navbarMenu) {
    const mobile = window.matchMedia('(max-width: 768px)');
    const painel = navbarMenu.closest('.navbar-panel');
    const container = navbarToggle.closest('.navbar-container');
    navbarToggle.type = 'button';
    navbarToggle.setAttribute('aria-controls', [navbarMenu.id, navbarActions?.id].filter(Boolean).join(' '));
    function definirMenu(aberto) {
      painel?.classList.toggle('active', aberto);
      container?.classList.toggle('menu-open', aberto && mobile.matches);
      if (painel && !aberto) painel.scrollTop = 0;
      const avisos = document.getElementById('recynet-toasts');
      if (avisos) avisos.hidden = mobile.matches && aberto;
      navbarMenu.classList.toggle('active', aberto);
      if (navbarActions) navbarActions.classList.toggle('active', aberto);
      navbarToggle.setAttribute('aria-expanded', String(!mobile.matches || aberto));
      navbarToggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    }
    definirMenu(false);
    navbarToggle.addEventListener('click', () => definirMenu(!navbarMenu.classList.contains('active')));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && mobile.matches && navbarMenu.classList.contains('active')) {
        definirMenu(false);
        navbarToggle.focus();
      }
    });
    [navbarMenu, navbarActions].filter(Boolean).forEach(container => {
      container.addEventListener('click', event => {
        if (event.target.closest('a')) definirMenu(false);
      });
    });
    mobile.addEventListener('change', () => definirMenu(false));
  }

  // Cloudflare usa /relatorio; o servidor local e o GitHub também usam
  // /relatorio.html. Comparar caminhos normalizados mantém o mesmo item ativo.
  const normalizarCaminho = caminho => caminho.replace(/\/+$/, '')
    .replace(/\/index(?:\.html)?$/, '').replace(/\.html$/, '') || '/';
  const caminhoAtual = normalizarCaminho(window.location.pathname);
  const correspondePagina = link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return false;
    try {
      const alvo = new URL(href, window.location.href);
      return alvo.origin === window.location.origin && !alvo.hash &&
        normalizarCaminho(alvo.pathname) === caminhoAtual;
    } catch { return false; }
  };
  const links = [...document.querySelectorAll('.navbar-menu a, .navbar-actions a')];
  let encontrouAtual = false;
  links.forEach(link => {
    const atual = !encontrouAtual && correspondePagina(link);
    link.classList.toggle('active', atual);
    link.removeAttribute('aria-current');
    if (atual) {
      link.setAttribute('aria-current', 'page');
      encontrouAtual = true;
    }
  });
  const marca = document.querySelector('.navbar-logo');
  if (marca) {
    const atual = !encontrouAtual && correspondePagina(marca);
    marca.classList.toggle('active', atual);
    marca.removeAttribute('aria-current');
    if (atual) marca.setAttribute('aria-current', 'page');
  }
}

// === SMOOTH SCROLL ===
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const fragment = this.getAttribute('href').slice(1);
      if (!fragment) return;
      let id;
      try { id = decodeURIComponent(fragment); } catch { return; }
      const target = document.getElementById(id);
      if (target) {
        // O menu móvel precisa fechar antes de medir o cabeçalho.
        const toggle = document.getElementById('navbarToggle');
        if (window.matchMedia('(max-width: 768px)').matches && toggle?.getAttribute('aria-expanded') === 'true') toggle.click();
        requestAnimationFrame(() => {
          const altura = document.querySelector('.navbar')?.getBoundingClientRect().height || 0;
          target.style.scrollMarginTop = `${altura + 16}px`;
          if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
          target.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
          });
        });
      }
    });
  });
}

// === ANIMAÇÕES AO SCROLL ===
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-up');
      }
    });
  }, {
    threshold: 0.1
  });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}

// === TOAST NOTIFICATIONS ===
function showToast(message, type = 'info') {
  let container = document.getElementById('recynet-toasts');
  if (!container) {
    container = document.createElement('div');
    container.id = 'recynet-toasts';
    container.className = 'recynet-toasts';
    document.body.appendChild(container);
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      const posicionar = () => {
        const topo = Math.max(20, navbar.getBoundingClientRect().bottom + 12);
        container.style.top = `${topo}px`;
        container.style.maxHeight = `max(0px, calc(100dvh - ${topo + 20}px))`;
        container.hidden = window.matchMedia('(max-width: 768px)').matches && Boolean(navbar.querySelector('.menu-open'));
      };
      new ResizeObserver(posicionar).observe(navbar);
      posicionar();
    }
  }
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} recynet-toast`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const texto = document.createElement('span');
  texto.textContent = message;
  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'recynet-toast-close';
  fechar.setAttribute('aria-label', 'Fechar notificação');
  fechar.textContent = '×';
  fechar.addEventListener('click', () => toast.remove());
  toast.append(texto, fechar);
  container.appendChild(toast);
  // Erros e avisos exigem leitura/ação e não expiram automaticamente.
  if (!['error', 'warning'].includes(type)) {
    let timer;
    const pausar = () => clearTimeout(timer);
    const iniciar = () => { pausar(); timer = setTimeout(() => toast.remove(), 6000); };
    toast.addEventListener('mouseenter', pausar);
    toast.addEventListener('mouseleave', iniciar);
    toast.addEventListener('focusin', pausar);
    toast.addEventListener('focusout', event => { if (!toast.contains(event.relatedTarget)) iniciar(); });
    iniciar();
  }
  return toast;
}

// === VALIDAÇÃO DE FORMULÁRIOS ===
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return false;

  let isValid = true;
  const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('error');
      isValid = false;

      let errorMsg = input.nextElementSibling;
      if (!errorMsg || !errorMsg.classList.contains('form-error')) {
        errorMsg = document.createElement('span');
        errorMsg.className = 'form-error';
        errorMsg.textContent = 'Este campo é obrigatório';
        input.parentNode.insertBefore(errorMsg, input.nextSibling);
      }
    } else {
      input.classList.remove('error');
      const errorMsg = input.nextElementSibling;
      if (errorMsg && errorMsg.classList.contains('form-error')) {
        errorMsg.remove();
      }
    }
  });

  return isValid;
}

// === FORMATAÇÃO DE NÚMEROS ===
function formatNumber(num) {
  return new Intl.NumberFormat('pt-BR').format(num);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// === LOCAL STORAGE HELPERS ===
function getLocalStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    Logger.error('Erro ao ler localStorage:', error);
    return defaultValue;
  }
}

function setLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    Logger.error('Erro ao salvar no localStorage:', error);
    return false;
  }
}

// Escapar dados apenas ao renderizar HTML; não usar em código JavaScript inline.
function escapeHTML(text) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text ?? '').replace(/[&<>"']/g, char => entities[char]);
}

const sanitizeInput = escapeHTML;

// Compartilhar a descrição dos ajustes sem misturar texto com HTML.
function formatarAjusteHistorico(atividade) {
  const peso = atividade.tipo === 'ajuste_kg';
  if (!peso && !['ajuste_pontos', 'ajuste'].includes(atividade.tipo)) return null;
  const valor = atividade.valor ?? (peso ? atividade.kg : atividade.pontos) ?? 0;
  const numero = Number.isFinite(valor) ? valor : 0;
  const quantidade = `${numero >= 0 ? '+' : ''}${formatNumber(numero)}`;
  const material = peso && atividade.material ? ` (${atividade.material})` : '';
  const motivo = atividade.motivo ? ` — ${atividade.motivo}` : '';
  return {
    icone: peso ? '⚖️' : '⚙️',
    texto: `Ajuste de ${peso ? 'peso' : 'pontos'}: ${quantidade} ${peso ? 'kg' : 'pontos'}${material}${motivo}`
  };
}

function mostrarErroArmazenamento() {
  if (typeof RecyNetDB === 'undefined') return;
  const erro = RecyNetDB.lerUsuarios().erro;
  if (!erro || document.getElementById('recynet-storage-error')) return;
  const aviso = document.createElement('p');
  aviso.id = 'recynet-storage-error';
  aviso.className = 'alert alert-error';
  aviso.setAttribute('role', 'alert');
  aviso.textContent = erro;
  const link = document.createElement('a');
  link.href = 'recuperar-dados.html';
  link.textContent = ' Restaurar backup';
  aviso.appendChild(link);
  (document.querySelector('main') || document.body).prepend(aviso);
}

// === SINCRONIZAÇÃO DE SESSÃO ===
function initSessionSync() {
  if (typeof RecyNetDB === 'undefined') return;
  const inicial = RecyNetDB.getUsuarioAutenticado();
  if (!inicial) return;
  let dadosIniciais = JSON.stringify(inicial);
  let navegando = false;
  const editados = new Set();
  document.addEventListener('input', e => { if (e.target.matches('input, textarea, select')) editados.add(e.target); });
  document.addEventListener('change', e => { if (e.target.matches('input, textarea, select')) editados.add(e.target); });
  document.addEventListener('reset', e => {
    for (const el of editados) if (el.form === e.target) editados.delete(el);
    const aviso = document.getElementById('syncDraftNotice');
    if (aviso && (e.target.closest('dialog')?.contains(aviso) ||
        ![...editados].some(el => el.isConnected && el.value !== ''))) aviso.remove();
  });
  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage || navegando ||
        ![null, 'recynet_sessao', 'recynet_usuarios'].includes(event.key)) return;
    const erro = RecyNetDB.lerUsuarios().erro;
    if (erro) mostrarErroArmazenamento();
    const atual = RecyNetDB.getUsuarioAutenticado();
    if (!atual) {
      navegando = true;
      RecyNetDB.logout();
      window.location.replace('recynet.html');
    } else if (atual.id !== inicial.id || atual.tipo !== inicial.tipo) {
      navegando = true;
      window.location.replace(atual.tipo === 'admin' ? 'admin.html' : 'cooperado.html');
    } else if (event.key === 'recynet_usuarios' || JSON.stringify(atual) !== dadosIniciais) {
      dadosIniciais = JSON.stringify(atual);
      window.dispatchEvent(new CustomEvent('recynet:dados-atualizados', { detail: atual }));
      if ([...editados].some(el => el.isConnected && el.value !== '')) {
        let aviso = document.getElementById('syncDraftNotice');
        if (!aviso) {
          aviso = document.createElement('div'); aviso.id = 'syncDraftNotice';
          aviso.className = 'alert alert-warning'; aviso.setAttribute('role','status');
          const texto = document.createElement('p');
          texto.textContent = 'Os dados mudaram em outra aba. Seu rascunho foi preservado. Ao salvar, os campos editados serão reaplicados aos dados atuais.';
          const recarregar = document.createElement('button'); recarregar.type = 'button'; recarregar.className = 'btn btn-outline'; recarregar.textContent = 'Recarregar e descartar rascunho';
          recarregar.addEventListener('click', () => { if (confirm('Descartar o rascunho e recarregar os dados atuais?')) location.reload(); });
          const continuar = document.createElement('button'); continuar.type = 'button'; continuar.className = 'btn btn-primary'; continuar.textContent = 'Continuar com meu rascunho';
          continuar.addEventListener('click', () => aviso.remove());
          aviso.append(texto, recarregar, continuar);
          // O aviso também precisa estar acessível quando um diálogo modal está aberto.
          (document.querySelector('dialog[open]') || document.querySelector('main') || document.body).prepend(aviso);
        }
      }
    }
  });
}

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSmoothScroll();
  initScrollAnimations();
  initSessionSync();
  mostrarErroArmazenamento();
});

// Uma ação por formulário/botão até a gravação terminar, inclusive em chamadas programáticas.
const enviosEmAndamento = new WeakSet();

// === EXPORTS ===
window.RecyNetUtils = {
  showToast,
  async executarEnvioUnico(alvo, executar) {
    if (!alvo || enviosEmAndamento.has(alvo)) return;
    enviosEmAndamento.add(alvo);
    const controles = alvo.matches('button,input,select,textarea') ? [alvo] : [...alvo.querySelectorAll('button,input,select,textarea')];
    const anteriores = controles.map(el => ({ el, disabled: el.disabled,
      texto: el.tagName === 'BUTTON' && (el === alvo || el.type === 'submit') ? el.textContent : null }));
    const ocupado = alvo.getAttribute('aria-busy');
    try {
      alvo.setAttribute('aria-busy', 'true');
      for (const {el,texto} of anteriores) {
        el.disabled = true;
        if (texto !== null) el.textContent = 'Gravando…';
      }
      return await executar();
    } finally {
      for (const {el,disabled,texto} of anteriores) {
        el.disabled = disabled;
        if (texto !== null) el.textContent = texto;
      }
      if (ocupado === null) alvo.removeAttribute('aria-busy');
      else alvo.setAttribute('aria-busy', ocupado);
      enviosEmAndamento.delete(alvo);
    }
  },
  aoAtualizarDados(renderizar) {
    window.addEventListener('recynet:dados-atualizados', event => {
      const campos = [...document.querySelectorAll('input,textarea,select')].map(el => ({ el, id: el.id, value: el.value, checked: el.checked }));
      const foco = document.activeElement;
      const selecao = foco && ['text','email','password','search'].includes(foco.type) ? [foco.selectionStart, foco.selectionEnd] : null;
      renderizar(event.detail);
      for (const campo of campos) {
        const el = campo.el.isConnected ? campo.el : document.getElementById(campo.id);
        if (!el || el.type === 'file') continue;
        if (el.tagName !== 'SELECT' || [...el.options].some(o => o.value === campo.value)) el.value = campo.value;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = campo.checked;
      }
      if (foco?.isConnected) { foco.focus({preventScroll:true}); if (selecao && selecao[0] !== null) foco.setSelectionRange(...selecao); }
    });
  },
  validateForm,
  formatNumber,
  formatCurrency,
  getLocalStorage,
  setLocalStorage,
  escapeHTML,
  formatarAjusteHistorico,
  sanitizeInput
};

// Criar alias global Utils para compatibilidade
window.Utils = window.RecyNetUtils;
