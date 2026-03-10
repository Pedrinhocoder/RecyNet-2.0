const dados = {
  cooperativas: 36,
  locaisColeta: 64,
  pontos: 1583200,
  usuarios: 978,
  materiais: {
    Papel: 2000,
    Plástico: 1600,
    Vidro: 800,
    Metal: 450,
    Eletrônicos: 1200,
  }
};

function formatarNumero(valor) {
  return valor.toLocaleString('pt-BR');
}

function atualizarDashboard() {
  const cards = document.querySelectorAll('.card');

  cards[0].querySelector("p").textContent = `${formatarNumero(dados.cooperativas)} cooperativas`;
  cards[1].querySelector("p").textContent = `${formatarNumero(dados.locaisColeta)} locais`;
  cards[2].querySelector("p").textContent = `${formatarNumero(dados.pontos)} pts acumulados`;
  cards[3].querySelector("p").textContent = `${formatarNumero(dados.usuarios)} usuários`;

  const barras = document.querySelectorAll('.bar');
  const valores = Object.values(dados.materiais);
  const max = Math.max(...valores);

  barras.forEach((bar, i) => {
    const altura = (valores[i] / max) * 100;
    bar.style.height = `${altura}%`;
    bar.setAttribute("title", `${valores[i]} kg`);
    bar.querySelector("span").textContent = `${Object.keys(dados.materiais)[i]}`;
  });
}

function exibirDataAtual() {
  const agora = new Date();
  const dataFormatada = agora.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
  const topo = document.querySelector(".header p");
  topo.innerHTML = `${dataFormatada}`;
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarDashboard();
  exibirDataAtual();

  const toggle = document.getElementById("menuToggle");
  const navLinks = document.getElementById("navLinks");

  toggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
  });
});