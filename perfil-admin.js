// perfil-admin.js - Lógica do Perfil do Administrador

document.addEventListener('DOMContentLoaded', function() {
    carregarPerfilAdmin();
    carregarEstatisticas();
    carregarAtividadesRecentes();
});

function carregarPerfilAdmin() {
    const usuarioLogado = RecyNetAuth.getUsuarioLogado();
    
    if (!usuarioLogado) {
        window.location.href = 'recynet.html';
        return;
    }

    // Carregar dados do admin
    document.getElementById('admin-nome').textContent = usuarioLogado.nome || 'Administrador';
    document.getElementById('admin-email').textContent = usuarioLogado.email || 'admin@fortes.com.br';
    
    // Último acesso
    if (usuarioLogado.ultimoAcesso) {
        const dataAcesso = new Date(usuarioLogado.ultimoAcesso);
        document.getElementById('admin-data-acesso').textContent = dataAcesso.toLocaleString('pt-BR');
    } else {
        document.getElementById('admin-data-acesso').textContent = new Date().toLocaleString('pt-BR');
    }
}

function carregarEstatisticas() {
    const usuarios = RecyNetDB.getAllUsuarios().filter(u => u.tipo !== 'admin');
    const coletas = RecyNetDB.getAllColetas();
    const resgates = RecyNetDB.getAllResgates();
    
    // Total de usuários (excluindo admins)
    document.getElementById('stat-usuarios').textContent = usuarios.length;
    
    // Total de coletas
    document.getElementById('stat-coletas').textContent = coletas.length;
    
    // Total de kg reciclados
    const totalKg = coletas.reduce((sum, coleta) => sum + (parseFloat(coleta.peso) || 0), 0);
    document.getElementById('stat-kg').textContent = totalKg.toFixed(2) + ' kg';
    
    // Total de resgates
    document.getElementById('stat-resgates').textContent = resgates.length;
}

function carregarAtividadesRecentes() {
    const coletas = RecyNetDB.getAllColetas();
    const resgates = RecyNetDB.getAllResgates();
    const usuarios = RecyNetDB.getAllUsuarios();
    
    // Criar lista de atividades
    const atividades = [];
    
    // Adicionar coletas recentes
    coletas.forEach(coleta => {
        const usuario = usuarios.find(u => u.id === coleta.usuarioId);
        atividades.push({
            tipo: 'coleta',
            data: new Date(coleta.data),
            descricao: `Coleta registrada: ${coleta.peso}kg de ${coleta.material} - ${usuario ? usuario.nome : 'Usuário desconhecido'}`,
            icon: '♻️'
        });
    });
    
    // Adicionar resgates recentes
    resgates.forEach(resgate => {
        const usuario = usuarios.find(u => u.id === resgate.usuarioId);
        atividades.push({
            tipo: 'resgate',
            data: new Date(resgate.data),
            descricao: `Resgate processado: ${resgate.pontos} pontos - ${usuario ? usuario.nome : 'Usuário desconhecido'}`,
            icon: '🎁'
        });
    });
    
    // Ordenar por data (mais recentes primeiro)
    atividades.sort((a, b) => b.data - a.data);
    
    // Pegar apenas as 10 mais recentes
    const atividadesRecentes = atividades.slice(0, 10);
    
    // Renderizar atividades
    const activitiesList = document.getElementById('activities-list');
    
    if (atividadesRecentes.length === 0) {
        activitiesList.innerHTML = '<p class="no-activities">Nenhuma atividade recente encontrada</p>';
        return;
    }
    
    activitiesList.innerHTML = atividadesRecentes.map(atividade => `
        <div class="activity-item">
            <div class="activity-icon">${atividade.icon}</div>
            <div class="activity-content">
                <p class="activity-description">${atividade.descricao}</p>
                <p class="activity-date">${atividade.data.toLocaleString('pt-BR')}</p>
            </div>
        </div>
    `).join('');
}
