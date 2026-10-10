/* Demonstração sem apagar contas, histórico ou outros dados do navegador. */
const RecyNetDemo = {
  async configurar(onStep = () => {}) {
    const nome = 'Usuário Teste';
    const email = `demo.${crypto.randomUUID()}@recynet.test`;
    const senha = 'Teste@RecyNet123';
    const sessaoAnterior = RecyNetDB.getUsuarioLogado();
    let usuarioCriado = null;

    try {
      onStep(1, 'running');
      const nomeValido = RecyNetAuth.validarNome(nome);
      const senhaValida = RecyNetAuth.validarSenha(senha);
      if (!nomeValido.valido || !RecyNetAuth.validarEmail(email) || !senhaValida.valido) {
        throw new Error(nomeValido.erro || senhaValida.erro || 'Email inválido');
      }
      onStep(1, 'done');

      onStep(2, 'running');
      const cadastro = await RecyNetAuth.cadastrar(nome, email, senha, senha);
      if (!cadastro.sucesso) throw new Error(cadastro.erro);
      usuarioCriado = cadastro.usuario;
      onStep(2, 'done');

      onStep(3, 'running');
      const coleta = RecyNetDB.registrarColeta(usuarioCriado.id, 'plastico', 1000);
      if (!coleta.sucesso) throw new Error(coleta.erro);
      onStep(3, 'done');

      onStep(4, 'running');
      const sessao = RecyNetAuth.verificarSessao();
      if (!sessao.logado || sessao.usuario.id !== usuarioCriado.id) {
        throw new Error('Não foi possível iniciar a sessão de demonstração');
      }
      onStep(4, 'done');
      return { sucesso: true, usuario: sessao.usuario, email, senha };
    } catch (error) {
      // Desfazer somente a conta criada nesta execução, preservando outras contas.
      if (usuarioCriado) {
        const usuarios = RecyNetDB.getUsuarios().filter(u => u.id !== usuarioCriado.id);
        localStorage.setItem('recynet_usuarios', JSON.stringify(usuarios));
        const sessaoAtual = RecyNetDB.getUsuarioLogado();
        if (sessaoAtual && sessaoAtual.id === usuarioCriado.id) {
          if (sessaoAnterior) RecyNetDB.setUsuarioLogado(sessaoAnterior);
          else RecyNetDB.logout();
        }
      }
      return { sucesso: false, erro: error.message };
    }
  }
};

window.RecyNetDemo = RecyNetDemo;
