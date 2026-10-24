const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

// Executar os scripts reais com armazenamento isolado por teste.
const filasPorStorage = new WeakMap();
function app(storage = new Map()) {
  if (!filasPorStorage.has(storage)) filasPorStorage.set(storage, new Map());
  const filas = filasPorStorage.get(storage);
  const context = vm.createContext({
    crypto: webcrypto, TextEncoder, console,
    navigator: { locks: { request(nome, options, callback) {
      const proxima = (filas.get(nome) || Promise.resolve()).then(() => callback({ name: nome }));
      filas.set(nome, proxima.catch(() => {}));
      return proxima;
    } } },
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
  for (const file of ['assets/js/database.js', 'assets/js/auth.js', 'assets/js/utils.js', 'assets/js/demo-setup.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  context.RecyNetDB.persistencia = {
    async ler() { return { existe: true, dados: storage.get('recynet_usuarios') ?? null }; },
    async gravar() {}
  };
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

function fixturePeso(a,u) {
  u.materiais.papel=u.totalKg;u.nivel=a.db.calcularNivel(u.totalKg);
  u.historico=u.totalKg ? [{id:'fixture-peso',tipo:'ajuste_kg',material:'papel',valor:u.totalKg,motivo:'Peso da fixture',data:u.dataCriacao}] : [];
  return u;
}
function fixtureHistorico(a,u) {
  u.historico=u.historico.map((h,i)=>({...h,id:`fixture-${i}`,material:'papel',gramas:Math.round(h.kg*1000)}));
  u.totalKg=a.db.arredondar(u.historico.reduce((n,h)=>n+h.kg,0));
  u.totalPontosGanhos=a.db.arredondar(u.historico.reduce((n,h)=>n+h.pontosGanhos,0));
  u.pontosDisponiveis=u.totalPontosGanhos;u.pontosGastos=0;u.materiais.papel=u.totalKg;u.nivel=a.db.calcularNivel(u.totalKg);
  return u;
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

test('conta legada reservada é preservada e não autoriza uma sessão forjada', async () => {
  const a=app(), user=a.db.criarUsuario('Conta Legada','admin@fortes.com.br','a'.repeat(64));
  const raw=JSON.stringify([user]);a.storage.set('recynet_usuarios',raw);
  a.db.setUsuarioLogado({...user,tipo:'admin'});
  assert.equal(a.auth.verificarSessao().logado,false);
  assert.equal(a.db.isAdmin(),false);
  assert.equal((await a.db.limparUsuarios()).sucesso,false);
  assert.equal(a.storage.get('recynet_usuarios'),raw);
});

test('sessão de conta excluída não autoriza operações administrativas', async () => {
  const a = app();
  const user = await cadastrar(a);
  a.storage.set('recynet_usuarios', '[]');
  assert.equal(a.auth.verificarSessao().logado, false);
  assert.equal((await a.db.ajustarPontosUsuario(user.id, 100)).sucesso, false);
  assert.equal((await a.db.limparUsuarios()).sucesso, false);
});

test('usuário comum e visitante não podem alterar outras contas nem executar ações de admin', async () => {
  const a = app();
  const outro = await cadastrar(a, 'outro@example.test');
  await cadastrar(a);
  const antes = dados(a);
  a.storage.set('outra-aplicacao', 'preservar');
  const actions = [
    async () => (await a.db.registrarColeta(outro.id, 'plastico', 1000)),
    async () => (await a.db.resgatarRecompensa(outro.id, 'Recompensa', 1)),
    async () => (await a.db.registrarColetaParaUsuario(outro.id, 'plastico', 1)),
    async () => (await a.db.ajustarPontosUsuario(outro.id, 100)),
    async () => (await a.db.ajustarKgUsuario(outro.id, 2)),
    async () => (await a.db.deletarUsuario(outro.id)),
    async () => (await a.db.limparUsuarios())
  ];
  for (const action of actions) {
    assert.equal((await action()).sucesso, false);
    assert.deepEqual(dados(a), antes);
  }
  assert.equal(a.db.getEstatisticasGerais(), null);
  a.db.logout();
  for (const action of actions) assert.equal((await action()).sucesso, false);
  assert.deepEqual(dados(a), antes);
  assert.equal(a.storage.get('outra-aplicacao'), 'preservar');
});

test('admin registra duas coletas e resgate para beneficiário sem trocar a própria sessão', async () => {
  const a = app();
  const user = await cadastrar(a);
  await admin(a);
  assert.equal((await a.db.registrarColeta(user.id, 'plastico', 2500)).sucesso, true);
  assert.equal((await a.db.registrarColetaParaUsuario(user.id, 'papel', 1)).sucesso, true);
  assert.equal((await a.db.registrarColeta(user.id, 'papel', 10000)).sucesso,true);
  assert.equal((await a.db.resgatarRecompensa(user.id, 1)).sucesso, true);
  assert.equal(a.db.getUsuarioLogado().id, a.db.ADMIN_ESTATICO.id);
  assert.equal(a.auth.protegerAdmin().tipo, 'admin');
  const atualizado = a.db.getUsuarioPorId(user.id);
  assert.equal(atualizado.totalKg, 13.5);
  assert.equal(atualizado.pontosDisponiveis, 25);
  assert.equal(atualizado.historico.length, 4);
});

test('coleta e resgate próprios continuam sincronizando a sessão sem guardar hash da senha', async () => {
  const a = app();
  const user = await cadastrar(a);
  assert.equal((await a.db.registrarColeta(user.id, 'plastico', 2500)).sucesso, true);
  assert.equal(a.db.getUsuarioLogado().totalKg, 2.5);
  assert.equal((await a.db.registrarColeta(user.id, 'papel', 10000)).sucesso,true);
  assert.equal((await a.db.resgatarRecompensa(user.id, 1)).sucesso, true);
  assert.equal(a.db.getUsuarioLogado().pontosDisponiveis, 20);
  assert.equal(Object.hasOwn(a.db.getUsuarioLogado(), 'senha'), false);
});

test('admin pode ajustar e excluir usuários; limpeza preserva administradores e outras chaves', async () => {
  const a = app();
  const user = await cadastrar(a);
  await admin(a);
  a.storage.set('outra-aplicacao', 'preservar');
  assert.equal((await a.db.ajustarPontosUsuario(user.id, 10)).sucesso, true);
  assert.equal((await a.db.ajustarKgUsuario(user.id, 1, 'papel')).sucesso, true);
  assert.equal(a.db.getEstatisticasGerais().totalUsuarios, 1);
  assert.equal((await a.db.deletarUsuario(a.db.ADMIN_ESTATICO.id)).sucesso, false);
  assert.equal((await a.db.deletarUsuario(user.id)).sucesso, true);
  assert.equal((await a.db.deletarUsuario(user.id)).sucesso, false);
  const outro = a.db.criarUsuario('Outra Pessoa', 'outro@example.test', 'a'.repeat(64));
  (await a.db.salvarUsuario(outro));
  assert.equal((await a.db.limparUsuarios()).sucesso, true);
  assert.equal(a.db.getUsuarios().length, 1);
  assert.equal(a.db.getUsuarioLogado().id, a.db.ADMIN_ESTATICO.id);
  assert.equal(a.storage.get('outra-aplicacao'), 'preservar');
});

test('demonstração preserva contas, históricos e outras chaves, usa senha válida e pode ser repetida', async () => {
  const a = app();
  const existente = await cadastrar(a, 'teste@recynet.com');
  (await a.db.registrarColeta(existente.id, 'metal', 1500));
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
  (await a.db.registrarColeta(user.id, 'metal', 1000));
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


test('entradas numéricas inválidas não alteram saldos, histórico nem sessão', async () => {
  const a = app();
  const user = await cadastrar(a);
  (await a.db.registrarColeta(user.id, 'metal', 1000));
  const antes = [...a.storage];
  for (const valor of [NaN, Infinity, -Infinity, undefined, null, '1000', {}, -1, 0]) {
    assert.equal((await a.db.registrarColeta(user.id, 'papel', valor)).sucesso, false);
    assert.equal((await a.db.resgatarRecompensa(user.id, 'Teste', valor)).sucesso, false);
    assert.deepEqual([...a.storage], antes);
  }
  for (const material of [null, undefined, {}, 'toString', '__proto__']) {
    assert.equal((await a.db.registrarColeta(user.id, material, 1000)).sucesso, false);
    assert.deepEqual([...a.storage], antes);
  }
  await admin(a);
  const antesAdmin = [...a.storage];
  for (const valor of [NaN, Infinity, -Infinity, undefined, null, '10', {}]) {
    assert.equal((await a.db.ajustarPontosUsuario(user.id, valor)).sucesso, false);
    assert.equal((await a.db.ajustarKgUsuario(user.id, valor)).sucesso, false);
    assert.deepEqual([...a.storage], antesAdmin);
  }
});

test('data administrativa válida é preservada e histórico continua em ordem decrescente', async () => {
  const a = app();
  const user = await cadastrar(a);
  assert.equal((await a.db.registrarColeta(user.id, 'papel', 1000)).sucesso, true);
  await admin(a);
  for (const data of ['2020-03-01', '2020-02-29', '2020-03-02']) {
    const result = (await a.db.registrarColetaParaUsuario(user.id, 'papel', 1, data));
    assert.equal(result.sucesso, true, result.erro);
    assert.equal(a.db.getUsuarioLogado().id, 'admin_123');
  }
  const atualizado = a.db.getUsuarioPorId(user.id);
  assert.equal(atualizado.totalKg, 4);
  assert.deepEqual(Array.from(atualizado.historico.slice(1), h => a.db.formatarDataLocal(new Date(h.data))),
    ['2020-03-02', '2020-03-01', '2020-02-29']);
});

test('datas futuras, inexistentes ou malformadas não alteram os dados', async () => {
  const a = app();
  const user = await cadastrar(a);
  const antesUsuario = [...a.storage];
  assert.equal((await a.db.registrarColeta(user.id, 'papel', 1000, '2020-01-01')).sucesso, false);
  assert.deepEqual([...a.storage], antesUsuario);
  await admin(a);
  const antes = [...a.storage];
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  for (const data of [a.db.formatarDataLocal(amanha), '2021-02-29', '2020-04-31', '', null, 123, '01/01/2020', '2020-01-01T00:00:00Z']) {
    assert.equal((await a.db.registrarColetaParaUsuario(user.id, 'papel', 1, data)).sucesso, false);
    assert.deepEqual([...a.storage], antes);
  }
  assert.equal((await a.db.registrarColetaParaUsuario(user.id, 'papel', 1, a.db.formatarDataLocal())).sucesso, true);
});

test('ranking e posição têm a mesma regra para contas zeradas, empates e mais de mil usuários', () => {
  const a = app();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/ranking_system.js'), 'utf8'), a.context);
  const usuarios = Array.from({ length: 1002 }, (_, i) => ({
    ...a.db.criarUsuario(`Pessoa ${i}`, `p${i}@example.test`, 'a'.repeat(64)),
    id: `p${i}`, totalKg: i === 1001 ? 0 : 1001 - i
  }));
  usuarios[1].totalKg = usuarios[0].totalKg; // Empate conserva ordem em todos os consumidores.
  usuarios.forEach(u=>fixturePeso(a,u));
  a.storage.set('recynet_usuarios', JSON.stringify(usuarios));
  const ranking = a.db.getRanking(Infinity);
  assert.deepEqual(a.context.RankingSystem.carregarRanking(), ranking);
  assert.equal(ranking.length, 1001);
  assert.equal(ranking[0].id, 'p0');
  assert.equal(ranking[1].id, 'p1');
  assert.equal(a.db.getRanking(10).length, 10);
  for (const [id, esperado] of [['p1001', null], ['p1000', 1001], ['p0', 1]]) {
    assert.equal(a.db.getPosicaoUsuario(id), esperado);
    assert.equal(a.context.RankingSystem.obterPosicaoUsuario(id), esperado);
  }
});

test('aberto agora usa o fuso do Espírito Santo, inclusive dia da semana e fechamento', () => {
  const a = app();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/locais.js'), 'utf8'), a.context);
  const locais = vm.runInContext('LocaisManager', a.context);
  const horarios = { dias: [1, 2, 3, 4, 5], abertura: '08:00', fechamento: '17:00' };
  for (const [instante, esperado] of [
    ['2026-10-21T10:59:00Z', false], ['2026-10-21T11:00:00Z', true],
    ['2026-10-21T19:59:00Z', true], ['2026-10-21T20:00:00Z', false],
    ['2026-10-24T12:00:00Z', false]
  ]) assert.equal(locais.isAbertoAgora(horarios, new Date(instante)), esperado, instante);
  assert.equal(locais.isAbertoAgora({ dias: [5], abertura: '20:00', fechamento: '23:00' }, new Date('2026-10-24T01:00:00Z')), true);
});

test('armazenamento inválido não derruba leituras nem permite sobrescrever as contas', async () => {
  const a = app();
  const user = await cadastrar(a);
  const valido = a.storage.get('recynet_usuarios');
  const casos = ['{', '', 'null', '{}', '[null]', JSON.stringify([user, null]),
    JSON.stringify([{ ...user, totalKg: '10' }]), JSON.stringify([{ ...user, materiais: null }]),
    JSON.stringify([{ ...user, historico: [null] }])];
  a.storage.set('outra-aplicacao', 'preservar');
  for (const raw of casos) {
    a.storage.set('recynet_usuarios', raw);
    const antes = [...a.storage];
    assert(a.db.lerUsuarios().erro);
    assert.equal(a.db.getUsuarios().length, 0);
    assert.equal(a.db.getRanking().length, 0);
    assert.equal(a.db.getEstatisticasGerais(), null);
    assert.equal((await a.db.registrarColeta(user.id, 'papel', 1000)).sucesso, false);
    assert.equal((await a.db.resgatarRecompensa(user.id, 'Teste', 1)).sucesso, false);
    assert.equal((await a.db.limparUsuarios()).sucesso, false);
    assert.equal((await a.db.deletarUsuario(user.id)).sucesso, false);
    await assert.rejects(async () => (await a.db.salvarUsuario(user)), /dados foram preservados/i);
    assert.equal((await a.auth.login('admin@fortes.com.br', '123456')).sucesso, false);
    assert.equal((await a.auth.cadastrar('Outra Pessoa', 'outra@example.test', senha, senha)).sucesso, false);
    assert.equal((await a.demo.configurar()).sucesso, false);
    assert.deepEqual([...a.storage], antes);
  }
  a.storage.set('recynet_usuarios', valido);
  assert.equal((await a.auth.login(user.email, senha)).sucesso, true);
  assert.equal(a.db.getUsuarioPorId(user.id).nome, user.nome);
});

test('sessão de conta excluída é removida ao verificar acesso sem alterar as outras contas', async () => {
  const a = app();
  await cadastrar(a);
  a.storage.set('recynet_usuarios', '[]');
  assert.equal(a.auth.verificarSessao().logado, false);
  assert.equal(a.storage.has('recynet_sessao'), false);
  assert.equal(a.storage.get('recynet_usuarios'), '[]');
});

test('top percentual melhora com a posição e nunca anuncia top 0%', () => {
  const a = app();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/ranking_system.js'), 'utf8'), a.context);
  const ranking = a.context.RankingSystem;
  const users = Array.from({ length: 1001 }, (_, i) => ({
    ...a.db.criarUsuario(`Pessoa ${i}`, `p${i}@example.test`, 'a'.repeat(64)), id: `p${i}`, totalKg: 1001 - i
  }));
  users.forEach(u=>fixturePeso(a,u));
  a.storage.set('recynet_usuarios', JSON.stringify(users));
  assert.equal(ranking.calcularPercentil('p0'), 1);
  assert.equal(ranking.calcularPercentil('p499'), 50);
  assert.equal(ranking.calcularPercentil('p1000'), 100);
  assert.equal(ranking.calcularPercentil('ausente'), 0);
  a.storage.set('recynet_usuarios', JSON.stringify([users[0]]));
  assert.equal(ranking.calcularPercentil('p0'), 100);
});

test('estatísticas mensais usam início do mês e excluem registros futuros, inclusive na virada do ano', async () => {
  const a = app();
  const user = await cadastrar(a);
  for (const agora of [new Date(2026, 0, 1, 12), new Date(2024, 2, 1, 12), new Date(2026, 9, 21, 12)]) {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const datas = [new Date(inicio.getTime() - 1), inicio, agora, new Date(agora.getTime() + 1)];
    const atualizado = a.db.getUsuarioPorId(user.id);
    atualizado.historico = datas.map((data, i) => ({ tipo: 'coleta', data: data.toISOString(), kg: i + 1, pontosGanhos: (i + 1) * 5 }));
    fixtureHistorico(a,atualizado);
    (await a.db.salvarUsuario(atualizado));
    const stats = a.db.getEstatisticasUsuario(user.id, agora);
    assert.equal(stats.kgEsteMes, 5);
    assert.equal(stats.pontosEsteMes, 25);
  }
});

test('desfazer demonstração não sobrescreve dados que se tornaram ilegíveis durante a execução', async () => {
  const a = app();
  await cadastrar(a);
  const raw = '{dados interrompidos';
  const result = await a.demo.configurar((etapa, estado) => {
    if (etapa === 3 && estado === 'running') a.storage.set('recynet_usuarios', raw);
  });
  assert.equal(result.sucesso, false);
  assert.equal(a.storage.get('recynet_usuarios'), raw);
  assert.equal(a.auth.verificarSessao().logado, false);
});

test('coletas pequenas mantêm gramas, pontos fracionários e nível sem erro de acumulação', async () => {
  const a = app(); const user = await cadastrar(a);
  for (let i=0; i<20; i++) assert.equal((await a.db.registrarColeta(user.id,'plastico',100)).sucesso,true);
  let u=a.db.getUsuarioPorId(user.id);
  assert.equal(u.totalKg,2); assert.equal(u.nivel,2); assert.equal(u.pontosDisponiveis,16);
  assert.equal((await a.db.registrarColeta(user.id,'papel',101)).sucesso,true);
  u=a.db.getUsuarioPorId(user.id); assert.equal(u.totalKg,2.101); assert.equal(u.pontosDisponiveis,16.505);
  assert.equal((await a.db.resgatarRecompensa(user.id,'Teste',0.505)).sucesso,false);
  assert.equal(a.db.getUsuarioPorId(user.id).pontosDisponiveis,16.505);
  assert.equal(a.db.formatarPontos(0.505),'0,505');
});

test('ajustes rejeitam saldos negativos e material inválido sem registrar deltas falsos', async () => {
  const a=app(); const user=await cadastrar(a); (await a.db.registrarColeta(user.id,'papel',2000)); await admin(a);
  const antes=dados(a);
  for(const fn of [async ()=>(await a.db.ajustarKgUsuario(user.id,-3,'papel')),async ()=>(await a.db.ajustarKgUsuario(user.id,1,'')),async ()=>(await a.db.ajustarKgUsuario(user.id,-1,'vidro')),async ()=>(await a.db.ajustarPontosUsuario(user.id,-11))]) {
    assert.equal((await fn()).sucesso,false);assert.deepEqual(dados(a),antes);
  }
  assert.equal((await a.db.ajustarPontosUsuario(user.id,-0.5)).sucesso,true);
  assert.equal((await a.db.ajustarKgUsuario(user.id,-0.101,'papel')).sucesso,true);
  const u=a.db.getUsuarioPorId(user.id);assert.equal(u.totalKg,1.899);assert.equal(u.materiais.papel,1.899);assert.equal(u.pontosDisponiveis,9.5);
});

test('falhas de gravação não confirmam coleta, resgate ou limpeza nem modificam os dados', async () => {
  const a=app();const user=await cadastrar(a);(await a.db.registrarColeta(user.id,'papel',2000));
  const antes=[...a.storage];const set=a.context.localStorage.setItem;
  a.context.localStorage.setItem=(key,value)=>{if(key==='recynet_usuarios') throw new Error('QuotaExceededError');return set(key,value);};
  assert.equal((await a.db.registrarColeta(user.id,'papel',1000)).sucesso,false);
  assert.equal((await a.db.resgatarRecompensa(user.id,'Teste',1)).sucesso,false);assert.deepEqual([...a.storage],antes);
  await admin(a); const antesAdmin=[...a.storage];
  assert.equal((await a.db.limparUsuarios()).sucesso,false);assert.equal((await a.db.deletarUsuario(user.id)).sucesso,false);
  assert.deepEqual([...a.storage],antesAdmin);
});

test('falha ao salvar sessão não informa sucesso no login ou deixa conta parcial no cadastro', async () => {
  const a=app();const set=a.context.localStorage.setItem;
  a.context.localStorage.setItem=(key,value)=>{if(key==='recynet_sessao') throw new Error('Storage denied');return set(key,value);};
  assert.equal((await a.auth.cadastrar('Pessoa Teste','pessoa@example.test',senha,senha)).sucesso,false);
  assert.equal(a.db.getUsuarios().filter(u=>u.tipo==='user').length,0);
  assert.equal((await a.auth.login('admin@fortes.com.br','123456')).sucesso,false);
  assert.equal(a.db.getUsuarioLogado(),null);
});

test('perfil valida email e senha, preserva histórico e permite login com a nova credencial', async () => {
  const a=app();const user=await cadastrar(a);(await a.db.registrarColeta(user.id,'papel',1000));
  const antes=dados(a);
  assert.equal((await a.auth.atualizarPerfil('Pessoa',' ADMIN@FORTES.COM.BR ')).sucesso,false);assert.deepEqual(dados(a),antes);
  assert.equal((await a.auth.atualizarPerfil('Pessoa Editada',' NOVO@EXAMPLE.TEST ')).sucesso,true);
  assert.equal(a.db.getUsuarioLogado().email,'novo@example.test');
  assert.equal((await a.auth.alterarSenha('incorreta','NovaSenha@123','NovaSenha@123')).sucesso,false);
  assert.equal((await a.auth.alterarSenha(senha,'NovaSenha@123','NovaSenha@123')).sucesso,true);
  assert.equal(a.db.getUsuarioPorId(user.id).historico.length,1);
  assert.equal(Object.hasOwn(a.db.getUsuarioLogado(),'senha'),false);
  a.db.logout();assert.equal((await a.auth.login('novo@example.test',senha)).sucesso,false);
  assert.equal((await a.auth.login('novo@example.test','NovaSenha@123')).sucesso,true);
});

test('restauração exige permissão, valida antes de gravar e preserva o conteúdo anterior', async () => {
  const a=app();const user=await cadastrar(a);const backup=JSON.stringify(a.db.getUsuarios());
  assert.equal((await a.db.restaurarBackup(backup)).sucesso,false);
  await admin(a);const antes=[...a.storage];
  for(const raw of ['{','null','[]x',JSON.stringify([{...user,email:'admin@fortes.com.br'}]),JSON.stringify([user,user])]) {
    assert.equal((await a.db.restaurarBackup(raw)).sucesso,false);assert.deepEqual([...a.storage],antes);
  }
  a.storage.set('recynet_usuarios','{corrompido');a.storage.set('outra-aplicacao','preservar');
  assert.equal((await a.db.restaurarBackup(backup)).sucesso,true);
  assert.equal(a.storage.get('recynet_backup_anterior'),'{corrompido');
  assert.equal(a.storage.get('outra-aplicacao'),'preservar');assert.equal(a.db.getUsuarioLogado(),null);
  assert.equal((await a.auth.login(user.email,senha)).sucesso,true);
});

test('restauração com armazenamento cheio preserva a base atual', async () => {
  const a=app();await cadastrar(a);const backup=JSON.stringify(a.db.getUsuarios());await admin(a);
  const dadosAntes=a.storage.get('recynet_usuarios'); const set=a.context.localStorage.setItem;
  a.context.localStorage.setItem=(key,value)=>{if(key==='recynet_usuarios')throw new Error('Quota');return set(key,value);};
  assert.equal((await a.db.restaurarBackup(backup)).sucesso,false);assert.equal(a.storage.get('recynet_usuarios'),dadosAntes);
});

test('componente de nível usa a mesma progressão e mantém títulos entre marcos',()=>{
 const a=app();vm.runInContext(fs.readFileSync(path.join(__dirname, '..','assets/js/level-bar.js'),'utf8'),a.context);
 for(const kg of [0,1.999,2,3.999,10,18,200]) {
   assert.equal(a.context.LevelBar.calcularNivel(kg),a.db.calcularNivel(kg));
   assert.equal(a.context.LevelBar.getTitulo(a.db.calcularNivel(kg)),a.db.getTituloNivel(a.db.calcularNivel(kg)));
 }
 assert.equal(a.db.getTituloNivel(6),'Coletor Urbano');
 assert.equal(a.db.calcularProgressoNivel(5.5).titulo,'Coletor Urbano');
});

test('backups incompletos ou com tipos inválidos são rejeitados sem alterar contas, sessão ou cópia anterior', async () => {
  const a = app();
  const user = await cadastrar(a);
  (await a.db.registrarColeta(user.id, 'papel', 1001));
  (await a.db.registrarColeta(user.id, 'papel', 20000));
  assert.equal((await a.db.resgatarRecompensa(user.id, 1)).sucesso,true);
  await admin(a);
  (await a.db.ajustarPontosUsuario(user.id, 0.5, 'Correção'));
  (await a.db.ajustarKgUsuario(user.id, 0.1, 'papel', 'Correção'));
  const valido = JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id)));
  a.storage.set('recynet_backup_anterior', 'cópia anterior preservada');
  const antes = [...a.storage];
  const mudarRegistro = (u, tipo, fn) => fn(u.historico.find(h => h.tipo === tipo));
  const casos = [
    ['gastos ausentes', u => delete u.pontosGastos],
    ['gastos textuais', u => { u.pontosGastos = 'inválido'; }],
    ['gastos negativos', u => { u.pontosGastos = -1; }],
    ['nível fracionário', u => { u.nivel = 1.5; }],
    ['nível zero', u => { u.nivel = 0; }],
    ['materiais textuais', u => { u.materiais.papel = '1'; }],
    ['saldo acima do limite', u => { u.pontosDisponiveis = a.db.MAX_VALOR + 1; }],
    ['data de criação ausente', u => delete u.dataCriacao],
    ['último acesso inválido', u => { u.ultimoAcesso = 'data inválida'; }],
    ['conquistas inválidas', u => { u.conquistas = {}; }],
    ['coleta sem peso', u => mudarRegistro(u, 'coleta', h => delete h.kg)],
    ['coleta sem pontos', u => mudarRegistro(u, 'coleta', h => delete h.pontosGanhos)],
    ['coleta sem gramas', u => mudarRegistro(u, 'coleta', h => delete h.gramas)],
    ['coleta com peso negativo', u => mudarRegistro(u, 'coleta', h => { h.kg = -1; })],
    ['coleta com material inválido', u => mudarRegistro(u, 'coleta', h => { h.material = 'inexistente'; })],
    ['coleta sem identificador', u => mudarRegistro(u, 'coleta', h => delete h.id)],
    ['resgate sem custo', u => mudarRegistro(u, 'resgate', h => delete h.custo)],
    ['resgate sem recompensa', u => mudarRegistro(u, 'resgate', h => delete h.recompensa)],
    ['resgate com custo negativo', u => mudarRegistro(u, 'resgate', h => { h.custo = -1; })],
    ['ajuste sem valor', u => mudarRegistro(u, 'ajuste_pontos', h => delete h.valor)],
    ['ajuste com motivo inválido', u => mudarRegistro(u, 'ajuste_kg', h => { h.motivo = {}; })],
    ['registro sem data', u => delete u.historico[0].data],
    ['tipo de atividade desconhecido', u => { u.historico[0].tipo = 'desconhecido'; }]
  ];
  for (const [nome, alterar] of casos) {
    const usuario = JSON.parse(JSON.stringify(valido));
    alterar(usuario);
    const texto = JSON.stringify([usuario]);
    assert.equal(a.db.validarBackup(texto).sucesso, false, nome);
    assert.equal((await a.db.restaurarBackup(texto)).sucesso, false, nome);
    assert.deepEqual([...a.storage], antes, nome);
  }
});

test('backup exportado completo restaura coletas, resgates e ajustes sem perder precisão ou criar NaN', async () => {
  const a = app(); const user = await cadastrar(a);
  (await a.db.registrarColeta(user.id, 'papel', 1001));
  (await a.db.registrarColeta(user.id, 'papel', 20000));
  assert.equal((await a.db.resgatarRecompensa(user.id, 1)).sucesso,true);
  await admin(a);
  (await a.db.ajustarPontosUsuario(user.id, 0.5, 'Correção'));
  (await a.db.ajustarKgUsuario(user.id, 0.1, 'papel', 'Correção'));
  const usuarioAntes = JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id)));
  const texto = JSON.stringify(a.db.getUsuarios());
  assert.equal(a.db.validarBackup(texto).sucesso, true);
  assert.equal((await a.db.restaurarBackup(texto)).sucesso, true);
  assert.deepEqual(JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id))), usuarioAntes);
  assert.equal((await a.auth.login(user.email, senha)).sucesso, true);
  assert.equal((await a.db.resgatarRecompensa(user.id, 1)).sucesso, true);
  const atual = a.db.getUsuarioPorId(user.id);
  assert.equal(atual.pontosGastos, 100);
  assert.equal(atual.pontosDisponiveis, 5.505);
  assert(Number.isFinite(a.db.getEstatisticasUsuario(user.id).kgEsteMes));
});

test('restauração malsucedida preserva dados, cópia anterior e sessão em cada etapa', async () => {
  for (const copia of [null, 'cópia anterior original']) {
    for (const etapa of ['copia', 'sessao', 'dados']) {
      const a = app(); await cadastrar(a); await admin(a);
      if (copia !== null) a.storage.set('recynet_backup_anterior', copia);
      const antes = [...a.storage].sort();
      const texto = JSON.stringify(a.db.getUsuarios());
      const set = a.context.localStorage.setItem, remove = a.context.localStorage.removeItem;
      a.context.localStorage.setItem = (key, value) => {
        if ((etapa === 'copia' && key === 'recynet_backup_anterior') || (etapa === 'dados' && key === 'recynet_usuarios')) throw new Error('QuotaExceededError');
        return set(key, value);
      };
      a.context.localStorage.removeItem = key => {
        if (etapa === 'sessao' && key === 'recynet_sessao') throw new Error('SecurityError');
        return remove(key);
      };
      assert.equal((await a.db.restaurarBackup(texto)).sucesso, false, etapa);
      assert.deepEqual([...a.storage].sort(), antes, etapa);
    }
  }
});

test('logout bloqueado retorna erro sem redirecionar ou anunciar sucesso', async () => {
  const a = app(); await cadastrar(a);
  const sessao = a.storage.get('recynet_sessao');
  let aviso;
  a.context.RecyNetUtils.showToast = (msg, tipo) => { aviso = { msg, tipo }; };
  a.context.localStorage.removeItem = () => { throw new Error('SecurityError'); };
  assert.equal(a.db.logout().sucesso, false);
  assert.equal(a.auth.logout().sucesso, false);
  assert.equal(a.storage.get('recynet_sessao'), sessao);
  assert.equal(a.context.location.href, '');
  assert.equal(aviso.tipo, 'error');
  assert.match(aviso.msg, /Não foi possível encerrar/);
  a.storage.delete('recynet_sessao');
  assert.equal(a.auth.verificarSessao().logado, false);
});

test('proteção de cooperado aceita usuário e redireciona visitante e administrador', async () => {
  const a = app();
  assert.equal(a.auth.protegerCooperado(), null);
  assert.equal(a.context.location.href, 'recynet.html');
  const user = await cadastrar(a);
  assert.equal(a.auth.protegerCooperado().id, user.id);
  await admin(a);
  assert.equal(a.auth.protegerCooperado(), null);
  assert.equal(a.context.location.href, 'admin.html');
});

test('resumo semanal conta segunda a domingo no calendário local e exclui o futuro', () => {
  const a = app(); const campo = {};
  a.context.document.getElementById = () => campo;
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets/js/cooperado.js'), 'utf8'), a.context);
  const verificar = (agora, datas, esperado) => {
    a.context.__agora = agora; a.context.__datas = datas;
    vm.runInContext(`renderizarKgSemanal({historico: __datas.map(data => ({tipo:'coleta', data, kg:1.001}))}, new Date(__agora))`, a.context);
    assert.equal(campo.textContent, esperado);
  };
  verificar('2026-10-26T12:00:00', ['2026-10-25T23:59:59', '2026-10-26T00:00:00', '2026-10-26T12:00:01'], '1,001 kg');
  verificar('2026-11-01T23:59:59', ['2026-10-26T00:00:00', '2026-11-01T23:59:59', '2026-11-02T00:00:00'], '2,002 kg');
  verificar('2027-01-01T12:00:00', ['2026-12-27T23:59:59', '2026-12-28T00:00:00', '2027-01-01T12:00:00'], '2,002 kg');
});

test('pesos administrativos com três casas geram gramas inteiros e backup restaurável', async () => {
  const a=app(),user=await cadastrar(a);await admin(a);
  for(const kg of [0.101,0.123,1.001,1.003,2.007,9.999]) {
    const r=await a.db.registrarColetaParaUsuario(user.id,'papel',kg);
    assert.equal(r.sucesso,true,r.erro);
    assert(Number.isSafeInteger(r.usuario.historico[0].gramas));
    assert.equal(r.usuario.historico[0].gramas,Math.round(kg*1000));
  }
  const antes=JSON.stringify(a.db.getUsuarioPorId(user.id));
  const texto=JSON.stringify(a.db.getUsuarios());
  assert.equal(a.db.validarBackup(texto).sucesso,true);
  assert.equal(a.db.validarBackup(texto).gramasNormalizados,0);
  assert.equal((await a.db.restaurarBackup(texto)).sucesso,true);
  assert.equal(JSON.stringify(a.db.getUsuarioPorId(user.id)),antes);
});

test('backup legado normaliza somente ruído numérico explícito sem modificar o original', async () => {
  const a=app(),user=await cadastrar(a);await admin(a);
  await a.db.registrarColetaParaUsuario(user.id,'papel',1.001);
  const dados=a.db.getUsuarios().filter(u=>u.tipo==='user');
  dados[0].historico[0].gramas=1.001*1000;
  const texto=JSON.stringify(dados),antes=[...a.storage];
  const valido=a.db.validarBackup(texto);
  assert.equal(valido.sucesso,true);assert.equal(valido.gramasNormalizados,1);
  assert.equal(valido.usuarios[0].historico[0].gramas,1001);
  assert.deepEqual([...a.storage],antes);
  assert.equal(JSON.stringify(dados),texto);
  for(const [gramas,kg] of [[1000.5,1.001],[1000.9999999999999,2]]) {
    const alterado=JSON.parse(texto);Object.assign(alterado[0].historico[0],{gramas,kg});
    assert.equal(a.db.validarBackup(JSON.stringify(alterado)).sucesso,false);
  }
  assert.equal((await a.db.restaurarBackup(texto)).gramasNormalizados,1);
  assert.equal(a.db.getUsuarioPorId(user.id).historico[0].gramas,1001);
});

test('duas instâncias compartilham a trava e preservam todas as coletas e ajustes concorrentes', async () => {
  const a=app(),user=await cadastrar(a);const b=app(a.storage);
  const ops=[];
  for(let i=0;i<20;i++) {
    ops.push(a.db.registrarColeta(user.id,'papel',1001),b.db.registrarColeta(user.id,'papel',2000));
  }
  const respostas=await Promise.all(ops);assert(respostas.every(r=>r.sucesso));
  const atual=a.db.getUsuarioPorId(user.id);
  assert.equal(atual.totalKg,60.02);assert.equal(atual.historico.length,40);
  assert.equal(atual.pontosDisponiveis,300.1);
  await admin(a);
  assert((await Promise.all([a.db.ajustarPontosUsuario(user.id,1,'A'),b.db.ajustarPontosUsuario(user.id,2,'B')])).every(r=>r.sucesso));
  assert.equal(a.db.getUsuarioPorId(user.id).pontosDisponiveis,303.1);
  assert.equal(a.db.validarBackup(JSON.stringify(a.db.getUsuarios())).sucesso,true);
});

test('salvar snapshots antigos de conta ou base é recusado sem apagar dados novos', async () => {
  const a=app(),user=await cadastrar(a),b=app(a.storage);
  const snapshot=a.db.getUsuarioPorId(user.id),base=a.db.getUsuarios();
  snapshot.nome='Nome antigo';
  assert.equal((await b.db.registrarColeta(user.id,'papel',1000)).sucesso,true);
  const antes=[...a.storage];
  await assert.rejects(a.db.salvarUsuario(snapshot),/mudaram/);
  await assert.rejects(a.db.gravarUsuarios(base),/base mudou/i);
  assert.deepEqual([...a.storage],antes);
  const resultado=await a.auth.atualizarPerfil('Nome Atual','atual@example.test');
  assert.equal(resultado.sucesso,true,resultado.erro);
  assert.equal(a.db.getUsuarioPorId(user.id).totalKg,1);
});

test('sem Web Locks todas as mutações falham sem alterar armazenamento', async () => {
  const a=app(),user=await cadastrar(a);const antes=[...a.storage];
  delete a.context.navigator.locks;
  for(const chamada of [()=>a.db.registrarColeta(user.id,'papel',1000),()=>a.db.restaurarBackup('[]'),()=>a.db.limparUsuarios()]) {
    const r=await chamada();assert.equal(r.sucesso,false);assert.match(r.erro,/gravação segura entre abas/);
  }
  const cadastro=await a.auth.cadastrar('Outra Pessoa','outra@example.test',senha,senha);
  assert.equal(cadastro.sucesso,false);assert.match(cadastro.erro,/gravação segura entre abas/);
  assert.deepEqual([...a.storage],antes);
});

test('permissões são verificadas depois da espera e falhas liberam a trava', async () => {
  const a=app(),user=await cadastrar(a),b=app(a.storage);
  let liberar,iniciou;
  const pronto=new Promise(r=>iniciou=r),gate=new Promise(r=>liberar=r);
  const segurando=a.db.transacao(()=>{iniciou();return gate;});await pronto;
  const pendente=b.db.registrarColeta(user.id,'papel',1000);
  a.db.logout();liberar();await segurando;
  assert.equal((await pendente).sucesso,false);
  assert.equal(a.db.getUsuarioPorId(user.id).totalKg,0);
  await a.auth.login(user.email,senha);
  const set=a.context.localStorage.setItem;
  a.context.localStorage.setItem=(key,v)=>{if(key==='recynet_usuarios')throw new Error('Quota');return set(key,v);};
  assert.equal((await a.db.registrarColeta(user.id,'papel',1000)).sucesso,false);
  a.context.localStorage.setItem=set;
  assert.equal((await b.db.registrarColeta(user.id,'papel',2000)).sucesso,true);
  assert.equal(a.db.getUsuarioPorId(user.id).totalKg,2);
});

test('edição de perfil enfileirada não é aplicada à conta que entrou depois', async () => {
  const a=app(),primeiro=await cadastrar(a,'primeiro@example.test'),segundo=await cadastrar(a,'segundo@example.test');
  a.db.setUsuarioLogado(a.db.getUsuarioPorId(primeiro.id));
  let liberar,iniciou;const gate=new Promise(r=>liberar=r),pronto=new Promise(r=>iniciou=r);
  const segurando=a.db.transacao(()=>{iniciou();return gate;});await pronto;
  const editando=a.auth.atualizarPerfil('Nome da primeira conta','novo@example.test');
  a.db.setUsuarioLogado(a.db.getUsuarioPorId(segundo.id));liberar();await segurando;
  assert.equal((await editando).sucesso,false);
  assert.equal(a.db.getUsuarioPorId(primeiro.id).email,'primeiro@example.test');
  assert.equal(a.db.getUsuarioPorId(segundo.id).email,'segundo@example.test');
});


test('falha ao confirmar armazenamento desfaz contas, sessão e backup e permite nova tentativa', async () => {
  const a=app(),user=await cadastrar(a);await admin(a);
  const antes=[...a.storage],texto=JSON.stringify(a.db.getUsuarios());
  const persistencia=a.db.persistencia;
  a.db.persistencia={async ler(){return {existe:true,dados:a.storage.get('recynet_usuarios')??null};},async gravar(){throw new Error('Confirmação indisponível');}};
  for(const fn of [()=>a.db.registrarColetaParaUsuario(user.id,'papel',1.001),()=>a.db.restaurarBackup('[]')]) {
    const r=await fn();assert.equal(r.sucesso,false);assert.match(r.erro,/Confirmação indisponível/);
    assert.deepEqual([...a.storage].sort(),[...antes].sort());
  }
  a.db.persistencia=persistencia;
  assert.equal((await a.db.registrarColetaParaUsuario(user.id,'papel',1.001)).sucesso,true);
  assert.equal(a.db.getUsuarioPorId(user.id).totalKg,1.001);
  assert.equal(a.db.validarBackup(texto).sucesso,true);
});

test('resgate resolve nome e custo pelo ID do catálogo e ignora preço fornecido pelo chamador', async () => {
  const a=app(),u=await cadastrar(a);await a.db.registrarColeta(u.id,'papel',20000);
  const antes=[...a.storage];
  for(const id of ['Garrafa Reutilizável','1',null,{},999]) {
    assert.equal((await a.db.resgatarRecompensa(u.id,id,0.001)).sucesso,false);
    assert.deepEqual([...a.storage],antes);
  }
  assert.equal((await a.db.resgatarRecompensa(u.id,1,0.001)).sucesso,true);
  const atual=a.db.getUsuarioPorId(u.id);
  assert.equal(atual.pontosDisponiveis,50);assert.equal(atual.pontosGastos,50);
  assert.equal(atual.historico[0].recompensa,'Garrafa Reutilizável');assert.equal(atual.historico[0].custo,50);
  assert.equal(a.db.validarBackup(JSON.stringify(a.db.getUsuarios())).sucesso,true);
});

test('leitura, gravação e backup recusam inconsistências sem corrigir saldos silenciosamente', async () => {
  const a=app(),user=await cadastrar(a);await a.db.registrarColeta(user.id,'papel',1001);
  const valido=JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id))),antes=[...a.storage];
  for(const alterar of [u=>u.totalKg=900,u=>u.nivel=999,u=>u.pontosDisponiveis=0,u=>u.pontosGastos=2,u=>u.materiais.papel=8,
    u=>u.historico[0].kg=800,u=>u.historico[0].gramas=1000,u=>u.historico[0].pontosGanhos=900,
    u=>u.historico=[],u=>delete u.historico[0].kg,u=>u.versaoDados=99]) {
    const u=structuredClone(valido);alterar(u);const raw=JSON.stringify([u]);
    assert.equal(a.db.validarBackup(raw).sucesso,false);
    await assert.rejects(a.db.transacao(db=>db.gravarUsuarios([u])));
    assert.deepEqual([...a.storage],antes);
    a.storage.set('recynet_usuarios',raw);
    assert(a.db.lerUsuarios().erro);assert.equal(a.db.getEstatisticasUsuario(user.id),null);
    assert.equal((await a.db.registrarColeta(user.id,'papel',1000)).sucesso,false);
    assert.equal(a.storage.get('recynet_usuarios'),raw);
    a.storage.set('recynet_usuarios',antes.find(([k])=>k==='recynet_usuarios')[1]);
  }
});

test('motivos inválidos são recusados e todos os ajustes válidos mantêm backup restaurável', async () => {
  const a=app(),user=await cadastrar(a);await admin(a);
  const antes=[...a.storage];
  for(const motivo of [null,{},[],123,'','   ','x'.repeat(501)]) {
    assert.equal((await a.db.ajustarPontosUsuario(user.id,1,motivo)).sucesso,false);
    assert.equal((await a.db.ajustarKgUsuario(user.id,1,'papel',motivo)).sucesso,false);
    assert.deepEqual([...a.storage],antes);
  }
  for(const [pontos,kg] of [[10,1],[-2,-0.1],[0.505,0.001]]) {
    assert.equal((await a.db.ajustarPontosUsuario(user.id,pontos,' Motivo válido ')).sucesso,true);
    assert.equal((await a.db.ajustarKgUsuario(user.id,kg,'papel','Motivo válido')).sucesso,true);
    const backup=JSON.stringify(a.db.getUsuarios());assert.equal(a.db.validarBackup(backup).sucesso,true);
    assert.equal((await a.db.restaurarBackup(backup)).sucesso,true);await admin(a);
  }
});

test('legados íntegros sem versão são aceitos e versionados na próxima gravação sem mudar valores', async () => {
  const a=app(),user=await cadastrar(a);await a.db.registrarColeta(user.id,'papel',1001);await admin(a);
  const legado=JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id)));delete legado.versaoDados;
  assert.equal(a.db.validarBackup(JSON.stringify([legado])).sucesso,true);
  assert.equal((await a.db.restaurarBackup(JSON.stringify([legado]))).sucesso,true);
  const atual=a.db.getUsuarioPorId(user.id);assert.equal(atual.versaoDados,1);
  delete atual.versaoDados;assert.deepEqual(JSON.parse(JSON.stringify(atual)),legado);
  const raw=JSON.stringify([legado]);a.storage.set('recynet_usuarios',raw);
  const carregado=a.db.getUsuarioPorId(user.id);carregado.nome='Nome migrado';
  assert.equal(await a.db.salvarUsuario(carregado),true);assert.equal(carregado.versaoDados,1);
  carregado.nome='Nome atualizado';assert.equal(await a.db.salvarUsuario(carregado),true);
  assert.equal(a.db.validarBackup(raw).sucesso,true);

});


test('perfil reaplica somente os campos editados após outras alterações na fila', async () => {
  const a=app(),user=await cadastrar(a),b=app(a.storage);
  let iniciou,liberar;const pronto=new Promise(r=>iniciou=r),gate=new Promise(r=>liberar=r);
  const segurando=a.db.transacao(()=>{iniciou();return gate;});await pronto;
  const outra=b.auth.atualizarPerfil('Nome externo','externo@example.test');
  const rascunho=a.auth.atualizarPerfil('Nome do rascunho',user.email,{alterarEmail:false});
  liberar();await segurando;
  assert.equal((await outra).sucesso,true);assert.equal((await rascunho).sucesso,true);
  const atual=a.db.getUsuarioPorId(user.id);assert.equal(atual.nome,'Nome do rascunho');assert.equal(atual.email,'externo@example.test');
});


test('requisito linear segue todos os exemplos e mantém níveis acima de 100 sem teto', () => {
  const {db}=app();
  for(const [nivel,kg] of [[1,1],[2,1.25],[5,2],[10,3.25],[25,7],[50,13.25],[100,25.75],[101,26],[1000,250.75]]) {
    assert.equal(db.calcularKgNecessario(nivel),kg);
  }
  const marcos=[0,1,2.25,3.75,5.5,7.5,9.75,12.25,15,18,21.25];
  marcos.forEach((kg,i)=>assert.equal(db.calcularKgMinimoNivel(i+1),kg));
  // Oráculo independente: acumular cada requisito, em vez de usar a inversa.
  let gramas=0;
  for(let n=1;n<=1000;n++) {
    assert.equal(db.calcularKgMinimoNivel(n),gramas/1000);
    assert.equal(db.calcularNivel(gramas/1000),n);
    if(n>1) assert.equal(db.calcularNivel((gramas-1)/1000),n-1);
    assert.equal(db.calcularNivel((gramas+1)/1000),n);
    gramas+=1000+250*(n-1);
  }
  assert.equal(db.calcularKgMinimoNivel(100),1311.75);
  assert.equal(db.calcularNivel(1337.5),101);
});

test('progresso linear usa peso adicional, zera no marco e não mostra 100% antecipadamente', () => {
  const a=app(),{db}=a;
  const p=db.calcularProgressoNivel(2);
  assert.equal(p.nivel,2);assert.equal(p.kgAtual,1);assert.equal(p.kgNecessario,1.25);
  assert.equal(p.kgFaltando,0.25);assert.equal(p.kgInicioNivel,1);assert.equal(p.kgProximoNivel,2.25);
  assert.equal(p.porcentagem,80);
  const marco=db.calcularProgressoNivel(2.25);
  assert.equal(marco.nivel,3);assert.equal(marco.kgAtual,0);assert.equal(marco.porcentagem,0);assert.equal(marco.kgFaltando,1.5);
  const max=db.calcularProgressoNivel(db.MAX_VALOR);
  assert(Number.isSafeInteger(max.nivel));assert(max.nivel>100);
  assert(max.porcentagem>=0&&max.porcentagem<100);assert(max.kgFaltando>0&&max.kgFaltando<=max.kgNecessario);
  for(const valor of [-1,NaN,Infinity,'2',db.MAX_VALOR+1]) assert.throws(()=>db.calcularNivel(valor));
  for(const nivel of [0,-1,1.5,Infinity,'2']) assert.throws(()=>db.calcularKgNecessario(nivel));
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..','assets/js/level-bar.js'),'utf8'),a.context);
  for(const kg of [2.249,1337.499]) {
    assert.equal(db.calcularProgressoNivel(kg).kgFaltando,0.001);
    assert(!a.context.LevelBar.renderCompact({totalKg:kg}).includes('100%'));
    assert(!a.context.LevelBar.renderHighlight({totalKg:kg}).includes('100%'));
  }
});

test('contas antigas têm nível recalibrado sem escrita na leitura nem perda de dados', async () => {
  const a=app(),user=await cadastrar(a);await a.db.registrarColeta(user.id,'papel',10000);
  const antigo=JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id)));
  delete antigo.versaoProgressao;antigo.nivel=6;
  const raw=JSON.stringify([antigo]);a.storage.set('recynet_usuarios',raw);
  const atual=a.db.getUsuarioPorId(user.id);
  assert.equal(atual.nivel,7);assert.equal(atual.versaoProgressao,3);
  assert.equal(a.storage.get('recynet_usuarios'),raw);
  const comparavel=JSON.parse(JSON.stringify(atual));delete comparavel.versaoProgressao;comparavel.nivel=6;
  assert.deepEqual(comparavel,antigo);
  assert.equal((await a.db.registrarColeta(user.id,'papel',2250)).sucesso,true);
  const gravado=JSON.parse(a.storage.get('recynet_usuarios')).find(u=>u.id===user.id);
  assert.equal(gravado.nivel,8);assert.equal(gravado.versaoProgressao,3);
  assert.equal(gravado.totalKg,12.25);assert.equal(gravado.totalPontosGanhos,61.25);
});

test('backup antigo recalcula níveis só depois de validar e mantém o arquivo original', async () => {
  const a=app(),user=await cadastrar(a);await a.db.registrarColeta(user.id,'papel',10000);await admin(a);
  const antigo=JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id)));
  delete antigo.versaoProgressao;antigo.nivel=6;
  const raw=JSON.stringify([antigo]),antes=[...a.storage];
  const preview=a.db.validarBackup(raw);
  assert.equal(preview.sucesso,true);assert.equal(preview.niveisRecalculados,1);
  assert.equal(preview.usuarios[0].nivel,7);assert.equal(preview.usuarios[0].versaoProgressao,3);
  assert.deepEqual([...a.storage],antes);assert.equal(JSON.stringify([antigo]),raw);
  assert.equal((await a.db.restaurarBackup(raw)).sucesso,true);
  assert.equal(a.db.getUsuarioPorId(user.id).nivel,7);
  assert.equal(a.db.getUsuarioPorId(user.id).totalPontosGanhos,50);
  for(const alterar of [u=>u.nivel=999,u=>u.totalKg=11,u=>u.versaoProgressao=99,u=>u.versaoProgressao='3',u=>u.versaoProgressao=3]) {
    const invalido=JSON.parse(raw);alterar(invalido[0]);
    assert.equal(a.db.validarBackup(JSON.stringify(invalido)).sucesso,false);
    a.storage.set('recynet_usuarios',JSON.stringify(invalido));assert(a.db.lerUsuarios().erro);
  }
});

test('100 gramas, salto de múltiplos níveis e resgate preservam pontos e classificação por peso', async () => {
  const a=app(),user=await cadastrar(a);
  assert.equal((await a.db.registrarColeta(user.id,'papel',99)).sucesso,false);
  for(let i=0;i<10;i++) assert.equal((await a.db.registrarColeta(user.id,'papel',100)).sucesso,true);
  let u=a.db.getUsuarioPorId(user.id);
  assert.equal(u.nivel,2);assert.equal(u.totalKg,1);assert.equal(u.pontosDisponiveis,5);
  const r=await a.db.registrarColeta(user.id,'papel',1336500);
  assert.equal(r.sucesso,true);assert.equal(r.novoNivel,101);
  u=a.db.getUsuarioPorId(user.id);
  assert.equal(u.totalKg,1337.5);assert.equal(u.nivel,101);assert.equal(u.pontosDisponiveis,6687.5);
  const ranking=JSON.stringify(a.db.getRanking());
  assert.equal((await a.db.resgatarRecompensa(user.id,1)).sucesso,true);
  u=a.db.getUsuarioPorId(user.id);
  assert.equal(u.nivel,101);assert.equal(u.totalKg,1337.5);assert.equal(u.pontosDisponiveis,6637.5);
  assert.equal(JSON.stringify(a.db.getRanking()),ranking);
});

test('contas da prévia exponencial versão 2 migram somente após validação integral', async () => {
  const a=app(),user=await cadastrar(a);await a.db.registrarColeta(user.id,'papel',10000);
  const anterior=JSON.parse(JSON.stringify(a.db.getUsuarioPorId(user.id)));
  anterior.versaoProgressao=2;anterior.nivel=4;
  const raw=JSON.stringify([anterior]);
  assert.equal(a.db.validarBackup(raw).sucesso,true);
  a.storage.set('recynet_usuarios',raw);
  const atual=a.db.getUsuarioPorId(user.id);
  assert.equal(atual.nivel,7);assert.equal(atual.versaoProgressao,3);
  assert.equal(atual.totalPontosGanhos,50);assert.equal(a.storage.get('recynet_usuarios'),raw);
  anterior.nivel=8;assert.equal(a.db.validarBackup(JSON.stringify([anterior])).sucesso,false);
});
