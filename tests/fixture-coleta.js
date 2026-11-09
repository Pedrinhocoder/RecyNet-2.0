/* Somente em testes: cria histórico confirmado para cenários que não exercitam a conferência. */
window.registrarColetaFixture = async (...args) => {
  const sessao = RecyNetDB.getUsuarioAutenticado();
  try {
    return await RecyNetDB.transacao(db => {
      const atual = db.getUsuarioAutenticado();
      if (sessao?.id !== atual?.id || sessao?.tipo !== atual?.tipo) {
        return { sucesso: false, erro: 'A sessão mudou enquanto a operação aguardava outra aba.' };
      }
      return db.registrarColeta(...args);
    });
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
};
