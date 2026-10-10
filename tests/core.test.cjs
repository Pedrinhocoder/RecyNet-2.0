const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

// Executar os scripts reais com armazenamento isolado por teste.
function app() {
  const storage = new Map();
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, console,
    location: { href: '', pathname: '/' },
    alert() {}, addEventListener() {},
    document: { addEventListener() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key)
    }
  });
  context.window = context;
  for (const file of ['database.js', 'auth.js', 'utils.js', 'demo-setup.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  // As notificações visuais não fazem parte dos testes do modelo.
  context.RecyNetUtils.showToast = () => {};
  return { db: context.RecyNetDB, auth: context.RecyNetAuth, demo: context.RecyNetDemo, context, storage };
}

const senha = 'Teste@RecyNet123';
async function cadastrar(a, email = 'pessoa@example.test', nome = 'Pessoa Teste') {
  const result = await a.auth.cadastrar(nome, email, senha, senha);
  assert.equal(result.sucesso, true, result.erro);
  return result.usuario;
}
async function admin(a) {
  assert.equal((await a.auth.login('admin@fortes.com.br', '123456')).sucesso, true);
}
function dados(a) {
  return JSON.parse(JSON.stringify(a.db.getUsuarios()));
}

test('cadastro normaliza espaços e caixa antes de validar e rejeita duplicatas', async () => {
  const a = app();
  const user = await cadastrar(a, '  PESSOA@EXAMPLE.TEST  ');
  assert.equal(user.email, 'pessoa@example.test');
  const antes = dados(a);
  for (const email of ['pessoa@example.test', 'Pessoa@Example.Test', ' pessoa@example.test ']) {
    assert.equal((await a.auth.cadastrar('Outra Pessoa', email, senha, senha)).sucesso, false);
    assert.deepEqual(dados(a), antes);
  }
  a.db.logout();
  assert.equal((await a.auth.login(' PESSOA@EXAMPLE.TEST ', senha)).sucesso, true);
  assert.equal(a.db.getUsuarioLogado().id, user.id);
});

test('cadastros concorrentes do mesmo email criam somente uma conta', async () => {
  const a = app();
  const results = await Promise.all([
    a.auth.cadastrar('Pessoa Um', 'concorrente@example.test', senha, senha),
    a.auth.cadastrar('Pessoa Dois', ' CONCORRENTE@EXAMPLE.TEST ', senha, senha)
  ]);
  assert.equal(results.filter(r => r.sucesso).length, 1);
  assert.equal(a.db.getUsuarios().filter(u => u.email === 'concorrente@example.test').length, 1);
});

test('todas as variações do email administrativo são reservadas', async () => {
  const a = app();
  for (const email of ['admin@fortes.com.br', 'ADMIN@FORTES.COM.BR', ' Admin@Fortes.Com.Br ']) {
    assert.equal((await a.auth.cadastrar('Pessoa Teste', email, senha, senha)).sucesso, false);
  }
  assert.equal(a.db.getUsuarios().filter(u => u.tipo === 'user').length, 0);
  assert.equal(a.db.getUsuarioLogado(), null);
});

test('conta legada com email do admin e perfil forjado na sessão continua usuário comum', () => {
  const a = app();
  const user = a.db.criarUsuario('Conta Legada', 'admin@fortes.com.br', 'hash');
  a.db.salvarUsuario(user);
  a.db.setUsuarioLogado({ ...user, tipo: 'admin' });
  const sessao = a.auth.verificarSessao();
  assert.equal(sessao.usuario.id, user.id);
  assert.equal(sessao.usuario.tipo, 'user');
  assert.equal(a.db.isAdmin(), false);
  assert.equal(a.auth.protegerAdmin(), null);
  assert.equal(a.context.location.href, 'cooperado.html');
  assert.equal(a.db.limparUsuarios().sucesso, false);
});

test('sessão de conta excluída não autoriza operações administrativas', async () => {
  const a = app();
  const user = await cadastrar(a);
  a.storage.set('recynet_usuarios', '[]');
  assert.equal(a.auth.verificarSessao().logado, false);
  assert.equal(a.db.ajustarPontosUsuario(user.id, 100).sucesso, false);
  assert.equal(a.db.limparUsuarios().sucesso, false);
});

test('usuário comum e visitante não podem alterar outras contas nem executar ações de admin', async () => {
  const a = app();
  const outro = await cadastrar(a, 'outro@example.test');
  await cadastrar(a);
  const antes = dados(a);
  a.storage.set('outra-aplicacao', 'preservar');
  const actions = [
    () => a.db.registrarColeta(outro.id, 'plastico', 1000),
    () => a.db.resgatarRecompensa(outro.id, 'Recompensa', 1),
    () => a.db.registrarColetaParaUsuario(outro.id, 'plastico', 1),
    () => a.db.ajustarPontosUsuario(outro.id, 100),
    () => a.db.ajustarKgUsuario(outro.id, 2),
    () => a.db.deletarUsuario(outro.id),
    () => a.db.limparUsuarios()
  ];
  for (const action of actions) {
    assert.equal(action().sucesso, false);
    assert.deepEqual(dados(a), antes);
  }
  assert.equal(a.db.getEstatisticasGerais(), null);
  a.db.logout();
  for (const action of actions) assert.equal(action().sucesso, false);
  assert.deepEqual(dados(a), antes);
  assert.equal(a.storage.get('outra-aplicacao'), 'preservar');
});

test('admin registra duas coletas e resgate para beneficiário sem trocar a própria sessão', async () => {
  const a = app();
  const user = await cadastrar(a);
  await admin(a);
  assert.equal(a.db.registrarColeta(user.id, 'plastico', 2500).sucesso, true);
  assert.equal(a.db.registrarColetaParaUsuario(user.id, 'papel', 1).sucesso, true);
  assert.equal(a.db.resgatarRecompensa(user.id, 'Recompensa Teste', 5).sucesso, true);
  assert.equal(a.db.getUsuarioLogado().id, a.db.ADMIN_ESTATICO.id);
  assert.equal(a.auth.protegerAdmin().tipo, 'admin');
  const atualizado = a.db.getUsuarioPorId(user.id);
  assert.equal(atualizado.totalKg, 3.5);
  assert.equal(atualizado.pontosDisponiveis, 20);
  assert.equal(atualizado.historico.length, 3);
});

test('coleta e resgate próprios continuam sincronizando a sessão sem guardar hash da senha', async () => {
  const a = app();
  const user = await cadastrar(a);
  assert.equal(a.db.registrarColeta(user.id, 'plastico', 2500).sucesso, true);
  assert.equal(a.db.getUsuarioLogado().totalKg, 2.5);
  assert.equal(a.db.resgatarRecompensa(user.id, 'Recompensa Teste', 5).sucesso, true);
  assert.equal(a.db.getUsuarioLogado().pontosDisponiveis, 15);
  assert.equal(Object.hasOwn(a.db.getUsuarioLogado(), 'senha'), false);
});

test('admin pode ajustar e excluir usuários; limpeza preserva administradores e outras chaves', async () => {
  const a = app();
  const user = await cadastrar(a);
  await admin(a);
  a.storage.set('outra-aplicacao', 'preservar');
  assert.equal(a.db.ajustarPontosUsuario(user.id, 10).sucesso, true);
  assert.equal(a.db.ajustarKgUsuario(user.id, 1, 'papel').sucesso, true);
  assert.equal(a.db.getEstatisticasGerais().totalUsuarios, 1);
  assert.equal(a.db.deletarUsuario(a.db.ADMIN_ESTATICO.id).sucesso, false);
  assert.equal(a.db.deletarUsuario(user.id).sucesso, true);
  assert.equal(a.db.deletarUsuario(user.id).sucesso, false);
  const outro = a.db.criarUsuario('Outra Pessoa', 'outro@example.test', 'hash');
  a.db.salvarUsuario(outro);
  assert.equal(a.db.limparUsuarios().sucesso, true);
  assert.equal(a.db.getUsuarios().length, 1);
  assert.equal(a.db.getUsuarioLogado().id, a.db.ADMIN_ESTATICO.id);
  assert.equal(a.storage.get('outra-aplicacao'), 'preservar');
});

test('demonstração preserva contas, históricos e outras chaves, usa senha válida e pode ser repetida', async () => {
  const a = app();
  const existente = await cadastrar(a, 'teste@recynet.com');
  a.db.registrarColeta(existente.id, 'metal', 1500);
  const antes = JSON.parse(JSON.stringify(a.db.getUsuarioPorId(existente.id)));
  a.storage.set('outra-aplicacao', 'preservar');
  const result = await a.demo.configurar();
  assert.equal(result.sucesso, true, result.erro);
  assert.equal(a.auth.validarSenha(result.senha).valido, true);
  assert.equal(result.usuario.totalKg, 1);
  assert.equal(result.usuario.pontosDisponiveis, 8);
  assert.deepEqual(JSON.parse(JSON.stringify(a.db.getUsuarioPorId(existente.id))), antes);
  assert.equal(a.storage.get('outra-aplicacao'), 'preservar');
  const repetido = await a.demo.configurar();
  assert.equal(repetido.sucesso, true, repetido.erro);
  assert.notEqual(repetido.email, result.email);
  assert.equal(a.db.getUsuarioPorId(result.usuario.id).totalKg, 1);
  a.db.logout();
  assert.equal((await a.auth.login(result.email, result.senha)).sucesso, true);
});

test('demonstração valida configuração antes de escrever dados', async () => {
  const a = app();
  await cadastrar(a);
  const antes = [...a.storage];
  a.auth.validarSenha = () => ({ valido: false, erro: 'Senha inválida de teste' });
  assert.equal((await a.demo.configurar()).sucesso, false);
  assert.deepEqual([...a.storage], antes);
});

test('falha na coleta de demonstração remove só a conta nova e restaura sessão anterior', async () => {
  const a = app();
  const user = await cadastrar(a);
  a.db.registrarColeta(user.id, 'metal', 1000);
  await admin(a);
  a.storage.set('outra-aplicacao', 'preservar');
  const antes = dados(a);
  const sessaoAntes = a.storage.get('recynet_sessao');
  a.db.registrarColeta = () => ({ sucesso: false, erro: 'Falha simulada' });
  const result = await a.demo.configurar();
  assert.equal(result.sucesso, false);
  assert.deepEqual(dados(a), antes);
  assert.equal(a.storage.get('recynet_sessao'), sessaoAntes);
  assert.equal(a.storage.get('outra-aplicacao'), 'preservar');
});

test('falha da demonstração sem sessão anterior encerra a sessão criada', async () => {
  const a = app();
  a.db.registrarColeta = () => ({ sucesso: false, erro: 'Falha simulada' });
  assert.equal((await a.demo.configurar()).sucesso, false);
  assert.equal(a.db.getUsuarios().filter(u => u.tipo === 'user').length, 0);
  assert.equal(a.db.getUsuarioLogado(), null);
});
