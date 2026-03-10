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
    navbarToggle.addEventListener('click', () => {
      navbarMenu.classList.toggle('active');
      if (navbarActions) {
        navbarActions.classList.toggle('active');
      }
    });
  }
  
  // Marcar link ativo
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
}

// === SMOOTH SCROLL ===
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
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
  const toast = document.createElement('div');
  toast.className = `alert alert-${type}`;
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '9999';
  toast.style.minWidth = '300px';
  toast.style.animation = 'slideInRight 0.3s ease-out';
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
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

// === SANITIZAÇÃO DE INPUTS ===
function sanitizeInput(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// === SINCRONIZAÇÃO DE SESSÃO ===
function initSessionSync() {
  window.addEventListener('storage', (event) => {
    if (event.key === 'recynet_sessao' && !event.newValue) {
      // Se a sessão foi removida em outra aba, deslogar aqui também
      window.location.href = 'recynet.html';
    }
  });
}

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSmoothScroll();
  initScrollAnimations();
  initSessionSync();
});

// === EXPORTS ===
window.RecyNetUtils = {
  showToast,
  validateForm,
  formatNumber,
  formatCurrency,
  getLocalStorage,
  setLocalStorage,
  sanitizeInput
};

// Criar alias global Utils para compatibilidade
window.Utils = window.RecyNetUtils;
