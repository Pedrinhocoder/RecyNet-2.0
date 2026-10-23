/* Executado somente no Worker de diagnóstico, com armazenamento em memória. */
(async () => {
  const verificar = (condicao, mensagem) => { if (!condicao) throw new Error(mensagem); };
  const senha = 'Teste@RecyNet123';
  let usuario;
  const casos = [
    ['Validação e hash de senha', async () => {
      verificar(!RecyNetAuth.validarSenha('123456').valido, 'Senha fraca aceita');
      verificar(RecyNetAuth.validarSenha(senha).valido, 'Senha válida recusada');
      verificar((await RecyNetAuth.hashSenha(senha)).length === 64, 'Hash inválido');
    }],
    ['Cadastro, login e duplicatas', async () => {
      const r = await RecyNetAuth.cadastrar('Pessoa Diagnóstico', 'teste@example.test', senha, senha);
      verificar(r.sucesso, r.erro); usuario = r.usuario;
      verificar(!(await RecyNetAuth.cadastrar('Outra Pessoa', ' TESTE@EXAMPLE.TEST ', senha, senha)).sucesso, 'Duplicata aceita');
      RecyNetDB.logout();
      verificar((await RecyNetAuth.login(usuario.email, senha)).sucesso, 'Login falhou');
    }],
    ['Coletas, precisão e níveis', async () => {
      for (let i = 0; i < 20; i++) verificar((await RecyNetDB.registrarColeta(usuario.id, 'papel', 100)).sucesso, 'Coleta falhou');
      const u = RecyNetDB.getUsuarioPorId(usuario.id);
      verificar(u.totalKg === 2 && u.nivel === 2 && u.pontosDisponiveis === 10, 'Acúmulo incorreto');
      verificar(LevelBar.calcularNivel(2) === 2, 'Barra diverge do nível');
    }],
    ['Permissões administrativas', async () => {
      verificar(!(await RecyNetDB.limparUsuarios()).sucesso, 'Usuário comum autorizado');
      verificar((await RecyNetAuth.login('admin@fortes.com.br', '123456')).sucesso, 'Login administrativo falhou');
      verificar((await RecyNetDB.registrarColetaParaUsuario(usuario.id, 'vidro', 1)).sucesso, 'Coleta administrativa falhou');
      verificar(RecyNetDB.getUsuarioLogado().id === 'admin_123', 'Sessão foi trocada');
    }],
    ['Ranking e progressão', async () => {
      verificar(RankingSystem.carregarRanking()[0].id === usuario.id, 'Ranking incorreto');
      verificar(LevelBar.getTitulo(6) === RecyNetDB.getTituloNivel(6), 'Título divergente');
    }],
    ['Demonstração preserva dados', async () => {
      const antes = JSON.stringify(RecyNetDB.getUsuarioPorId(usuario.id));
      verificar((await RecyNetDemo.configurar()).sucesso, 'Demonstração falhou');
      verificar(JSON.stringify(RecyNetDB.getUsuarioPorId(usuario.id)) === antes, 'Dados existentes alterados');
    }]
  ];
  for (const [nome, testar] of casos) {
    try { await testar(); postMessage({nome, sucesso:true}); }
    catch (erro) { postMessage({nome, sucesso:false, erro:erro.message}); }
  }
  postMessage({fim:true});
})();
