const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const senha = 'Teste@RecyNet123';
const payload = `<img src="/regression-missing.png" onerror="window.__regressionXSS=true">D'Ávila`;
const server = require('../scripts/serve.cjs').createServer();

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  let passed = 0, failed = 0;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      args: ['--no-sandbox']
    });
    async function check(name, fn, options = {}) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const errors = [];
      const dialogs = [];
      let encerrando = false;
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', async dialog => { dialogs.push(dialog.message()); try { await dialog.accept(); } catch (error) { if (!encerrando) errors.push(error.message); } });
      const go = file => page.goto(`${base}/${file}`, { waitUntil: 'load', timeout: 30000 });
      const cadastrar = async (nome = 'Pessoa Teste', email = 'pessoa@example.test') => {
        await go('cadastro.html');
        return page.evaluate(async ({ nome, email, senha }) => {
          const result = await RecyNetAuth.cadastrar(nome, email, senha, senha);
          if (!result.sucesso) throw new Error(result.erro);
          return result.usuario;
        }, { nome, email, senha });
      };
      const admin = async () => {
        assert.equal(await page.evaluate(async () => (await RecyNetAuth.login('admin@fortes.com.br', '123456')).sucesso), true);
      };
      try {
        await fn({ page, go, cadastrar, admin, dialogs, context });
        assert.deepEqual(errors, [], 'Nenhum erro JavaScript deve ocorrer');
        console.log(`PASS: ${name}`);
        passed++;
      } catch (error) {
        console.error(`FAIL: ${name}\n${error.stack}`);
        failed++;
      } finally { encerrando = true; await context.close(); }
    }

    await check('nome persistido é texto no resumo, ranking, pódio e telas administrativas', async ({ page, go, cadastrar, admin }) => {
      const user = await cadastrar(payload);
      assert.equal(await page.evaluate(async id => (await RecyNetDB.registrarColeta(id, 'plastico', 1000)).sucesso, user.id), true);
      for (const file of ['cooperado.html', 'ranking.html']) {
        await go(file);
        if (file === 'cooperado.html') {
          // Exercitar também o componente de resumo, disponível para dashboards.
          await page.evaluate(id => {
            const container = document.createElement('div');
            container.id = 'regression-ranking-resumo';
            document.body.appendChild(container);
            RankingSystem.renderizarRankingResumo(container.id, id);
          }, user.id);
        }
        assert.equal(await page.locator('.ranking-nome').first().textContent(), payload + ' Você');
        assert.equal(await page.locator('img[src="/regression-missing.png"]').count(), 0);
        assert.equal(await page.evaluate(() => Boolean(window.__regressionXSS)), false);
      }
      assert.equal(await page.locator('.podio-name-modern').first().textContent(), payload);
      await admin();
      for (const file of ['admin.html', 'perfil-admin.html', 'utilidades-admin.html', 'diagnostico-completo.html']) {
        await go(file);
        assert.equal(await page.locator('img[src="/regression-missing.png"]').count(), 0);
        assert.equal(await page.evaluate(() => Boolean(window.__regressionXSS)), false);
        assert((await page.locator('body').innerText()).includes('/regression-missing.png'), file);
      }
    });

    await check('campos persistidos no histórico são texto em todas as telas do usuário', async ({ page, go, cadastrar }) => {
      const user = await cadastrar();
      const result = await page.evaluate(async ({ id, payload }) => {
        (await RecyNetDB.registrarColeta(id, 'plastico', 2500));
        // Arquivo histórico legado: conteúdo não confiável continua sendo renderizado como texto.
        const u=RecyNetDB.getUsuarioPorId(id);u.pontosDisponiveis-=1;u.pontosGastos+=1;
        u.historico.unshift({id:'resgate-legado',tipo:'resgate',recompensa:payload,custo:1,data:new Date().toISOString()});
        await RecyNetDB.salvarUsuario(u);return {sucesso:true};
      }, { id: user.id, payload });
      assert.equal(result.sucesso, true);
      for (const file of ['cooperado.html', 'perfil.html', 'recompensas.html', 'relatorio.html']) {
        await go(file);
        assert.equal(await page.locator('img[src="/regression-missing.png"]').count(), 0);
        assert.equal(await page.evaluate(() => Boolean(window.__regressionXSS)), false);
        assert((await page.locator('body').innerText()).includes(payload), file);
      }
    });

    await check('exclusão pelo botão aceita nomes com apóstrofo', async ({ page, go, cadastrar, admin, dialogs }) => {
      const user = await cadastrar("D'Ávila");
      await admin();
      await go('utilidades-admin.html');
      // Reter a trava torna a gravação pendente de forma determinística,
      // inclusive em máquinas onde IndexedDB normalmente confirma muito rápido.
      await page.evaluate(() => {
        window.__deletionGate = new Promise(resolve => { window.__releaseDeletion = resolve; });
        window.__deletionLock = navigator.locks.request('recynet:contas:v1', () => {
          window.__deletionLockHeld = true;
          return window.__deletionGate;
        });
      });
      await page.waitForFunction(() => window.__deletionLockHeld);
      await page.locator('#userListDelete button').click();
      assert.equal(dialogs.length, 1);
      assert(dialogs[0].includes("D'Ávila"));
      await page.waitForFunction(async () =>
        (await navigator.locks.query()).pending.some(lock => lock.name === 'recynet:contas:v1'));
      assert.equal(await page.evaluate(id => Boolean(RecyNetDB.getUsuarioPorId(id)), user.id), true);
      await page.evaluate(() => window.__releaseDeletion());
      // O clique e a aceitação do diálogo não aguardam o handler assíncrono.
      await page.waitForFunction(id => !RecyNetDB.getUsuarioPorId(id), user.id);
      await page.waitForFunction(() => document.querySelectorAll('#userListDelete button').length === 0);
      await page.reload();
      assert.equal(await page.evaluate(id => Boolean(RecyNetDB.getUsuarioPorId(id)), user.id), false);
      assert.equal(await page.locator('#userListDelete button').count(), 0);
    });

    await check('usuário comum é redirecionado de todas as páginas administrativas', async ({ page, go, cadastrar }) => {
      await cadastrar('Pessoa Um', 'um@example.test');
      await cadastrar('Pessoa Dois', 'dois@example.test');
      const antes = await page.evaluate(() => localStorage.getItem('recynet_usuarios'));
      for (const file of ['utilidades-admin.html', 'perfil-admin.html', 'admin.html', 'limpar-dados.html', 'diagnostico-completo.html']) {
        await go(file);
        await page.waitForURL('**/cooperado.html');
        assert.equal(await page.evaluate(() => localStorage.getItem('recynet_usuarios')), antes);
      }
    });

    await check('visitante é redirecionado ao login das páginas administrativas', async ({ page, go }) => {
      for (const file of ['utilidades-admin.html', 'perfil-admin.html', 'admin.html', 'limpar-dados.html', 'diagnostico-completo.html']) {
        await go(file);
        await page.waitForURL('**/recynet.html');
        assert.equal(await page.evaluate(() => localStorage.getItem('recynet_usuarios')), null);
      }
    });

    await check('botões administrativos revalidam permissão depois de uma troca de sessão', async ({ page, go, cadastrar, admin, dialogs }) => {
      const user = await cadastrar();
      let downloads = 0;
      page.on('download', () => downloads++);
      for (const action of ['exportarDados', 'limparUsuarios', 'deletarUsuario']) {
        await admin();
        await go('utilidades-admin.html');
        const result = await page.evaluate(async ({ user, action }) => {
          RecyNetDB.setUsuarioLogado(user);
          const antes = localStorage.getItem('recynet_usuarios');
          await window[action](user.id, user.nome);
          return antes === localStorage.getItem('recynet_usuarios');
        }, { user, action });
        assert.equal(result, true);
        await page.waitForURL('**/cooperado.html', { waitUntil: 'domcontentloaded' });
      }
      assert.equal(dialogs.length, 0);
      assert.equal(downloads, 0);
    });

    await check('email reservado em maiúsculas não cria conta nem sessão administrativa', async ({ page, go }) => {
      await go('cadastro.html');
      await page.locator('#nome').fill('Pessoa Teste');
      await page.locator('#email').fill('ADMIN@FORTES.COM.BR');
      await page.locator('#senha').fill(senha);
      await page.locator('#confirmarSenha').fill(senha);
      await page.locator('#termos').check();
      await page.locator('button[type="submit"]').click();
      await page.waitForFunction(() => document.body.innerText.includes('Este email já está cadastrado'));
      assert.equal(await page.evaluate(() => RecyNetDB.getUsuarios().filter(u => u.tipo === 'user').length), 0);
      assert.equal(await page.evaluate(() => RecyNetDB.getUsuarioLogado()), null);
    });

    await check('duas coletas pelo formulário admin mantêm sessão, dados e acesso após reload', async ({ page, go, cadastrar, admin }) => {
      const user = await cadastrar();
      await admin();
      await go('admin.html');
      for (const [material, kg] of [['plastico', '2.5'], ['papel', '1']]) {
        await page.locator('#selectUsuario').selectOption(user.id);
        await page.locator('#selectMaterial').selectOption(material);
        await page.locator('#inputPeso').fill(kg);
        await page.locator('#formRegistrarColeta button[type="submit"]').click();
        await page.waitForFunction(()=>document.getElementById('inputPeso').value==='');
        assert.equal(await page.evaluate(() => RecyNetDB.getUsuarioLogado().id), 'admin_123');
      }
      await page.reload({ waitUntil: 'load' });
      assert(page.url().endsWith('/admin.html'));
      const atualizado = await page.evaluate(id => RecyNetDB.getUsuarioPorId(id), user.id);
      assert.equal(atualizado.totalKg, 3.5);
      assert.equal(atualizado.pontosDisponiveis, 25);
      assert.equal(atualizado.historico.length, 2);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#navbarToggle').click();
      assert.equal(await page.locator('#navbarMenu').evaluate(el => el.classList.contains('active')), true);
    });

    await check('demonstração pela interface preserva dados e funciona em duas execuções', async ({ page, go, cadastrar }) => {
      const user = await cadastrar('Pessoa Existente', 'teste@recynet.com');
      const antes = await page.evaluate(async id => {
        (await RecyNetDB.registrarColeta(id, 'metal', 1000));
        localStorage.setItem('outra-aplicacao', 'preservar');
        return RecyNetDB.getUsuarioPorId(id);
      }, user.id);
      const demos = [];
      for (let i = 0; i < 2; i++) {
        await go('setup-automatico.html');
        await page.locator('#btnStart').click();
        await page.waitForURL('**/relatorio.html', { waitUntil: 'load' });
        const atual = await page.evaluate(id => ({
          original: RecyNetDB.getUsuarioPorId(id),
          sessao: RecyNetDB.getUsuarioLogado(),
          outra: localStorage.getItem('outra-aplicacao')
        }), user.id);
        assert.deepEqual(atual.original, antes);
        assert.equal(atual.outra, 'preservar');
        assert.equal(atual.sessao.totalKg, 1);
        assert.equal(atual.sessao.pontosDisponiveis, 8);
        demos.push(atual.sessao.id);
      }
      assert.notEqual(demos[0], demos[1]);
      assert.equal(await page.evaluate(() => RecyNetDB.getUsuarios().filter(u => u.tipo === 'user').length), 3);
    });

    await check('falha na demonstração pela interface mantém dados e restaura sessão', async ({ page, go, cadastrar }) => {
      await cadastrar();
      const antes = await page.evaluate(() => ({ usuarios: localStorage.getItem('recynet_usuarios'), sessao: localStorage.getItem('recynet_sessao') }));
      await go('setup-automatico.html');
      await page.evaluate(() => { RecyNetDB.registrarColeta = () => ({ sucesso: false, erro: 'Falha simulada de coleta' }); });
      await page.locator('#btnStart').click();
      await page.waitForFunction(() => document.getElementById('btnStart').textContent === 'Tentar Novamente');
      assert.equal(await page.locator('#btnStart').isEnabled(), true);
      assert((await page.locator('#console').innerText()).includes('Falha simulada de coleta'));
      assert.deepEqual(await page.evaluate(() => ({ usuarios: localStorage.getItem('recynet_usuarios'), sessao: localStorage.getItem('recynet_sessao') })), antes);
    });

    await check('históricos mostram registros recentes e relatório funciona sem CDN', async ({ page, go, cadastrar }) => {
      const user = await cadastrar();
      await page.evaluate(async id => {
        (await RecyNetDB.registrarColeta(id, 'metal', 10000));
        const u=RecyNetDB.getUsuarioPorId(id);
        for (let i=1;i<=12;i++)u.historico.unshift({id:`resgate-${i}`,tipo:'resgate',recompensa:`Prêmio ${i}`,custo:1,data:new Date().toISOString()});
        u.pontosGastos=12;u.pontosDisponiveis-=12;await RecyNetDB.salvarUsuario(u);
      }, user.id);
      for (const [file, selector, count] of [
        ['cooperado.html', '.activity-text', 5],
        ['perfil.html', '#history-list .history-text', 10]
      ]) {
        await go(file);
        const textos = await page.locator(selector).allTextContents();
        assert.equal(textos.length, count);
        assert(textos[0].includes('Prêmio 12'));
      }
      await page.route('**/assets/vendor/chart.umd.js', route => route.abort());
      await go('relatorio.html');
      assert.equal(await page.locator('.chart-unavailable').count(), 2);
      assert((await page.locator('#activity-timeline').innerText()).includes('Prêmio 12'));
    });

    await check('sequência conta dias distintos consecutivos e para na primeira lacuna', async ({ page, go, cadastrar }) => {
      const user = await cadastrar();
      await go('pontuacao.html');
      for (const [dias, esperado] of [[[0, 0, 1, 2], 3], [[1, 1, 2], 2], [[0, 2], 1], [[2], 0]]) {
        const resultado = await page.evaluate(async ({ id, dias }) => {
          const usuario = RecyNetDB.getUsuarioPorId(id);
          usuario.historico = dias.map((offset,i) => {
            const data = new Date();
            data.setDate(data.getDate() - offset);
            return { id:`streak-${i}`,tipo:'coleta',material:'papel',gramas:1000,data:data.toISOString(),kg:1,pontosGanhos:5 };
          });
          usuario.totalKg=dias.length;usuario.materiais.papel=dias.length;usuario.nivel=RecyNetDB.calcularNivel(dias.length);usuario.totalPontosGanhos=dias.length*5;usuario.pontosDisponiveis=dias.length*5;
          (await RecyNetDB.salvarUsuario(usuario));
          return calcularStreak(id);
        }, { id: user.id, dias });
        assert.equal(resultado, esperado);
      }
    });

    await check('formulário admin preserva data retroativa e usa hoje no fuso local', async ({ page, go, cadastrar, admin }) => {
      const user = await cadastrar();
      await admin();
      await page.clock.setFixedTime(new Date('2026-10-22T01:30:00Z'));
      await go('admin.html');
      assert.equal(await page.locator('#inputData').inputValue(), '2026-10-21');
      assert.equal(await page.locator('#inputData').getAttribute('max'), '2026-10-21');
      await page.locator('#selectUsuario').selectOption(user.id);
      await page.locator('#selectMaterial').selectOption('papel');
      await page.locator('#inputPeso').fill('2');
      await page.locator('#inputData').fill('2026-09-15');
      await page.locator('#formRegistrarColeta button[type="submit"]').click();
      await page.waitForFunction(()=>document.getElementById('inputPeso').value==='');
      await page.reload();
      assert.deepEqual(await page.evaluate(id => {
        const user = RecyNetDB.getUsuarioPorId(id);
        return { data: RecyNetDB.formatarDataLocal(new Date(user.historico[0].data)), kg: user.totalKg,
          sessao: RecyNetDB.getUsuarioLogado().id };
      }, user.id), { data: '2026-09-15', kg: 2, sessao: 'admin_123' });
    }, { timezoneId: 'America/Sao_Paulo' });

    await check('coletas atualizam nível e pontos imediatamente, inclusive após recarregar', async ({ page, go, cadastrar }) => {
      await cadastrar();
      await go('pontuacao.html');
      assert.equal(await page.locator('.level-bar-compact-badge').innerText(), '1');
      for (const nivel of [2, 3]) {
        await page.locator('#materialSelect').selectOption('papel');
        await page.locator('#quantityInput').fill('2');
        await page.locator('#btnRegistrar').click();
        await page.waitForFunction(n=>document.querySelector('.level-bar-compact-badge').textContent.trim()===String(n),nivel);
        assert.equal(await page.locator('.level-bar-compact-badge').innerText(), String(nivel));
        assert.equal(await page.locator('#totalPoints').innerText(), String((nivel - 1) * 10));
      }
      await page.reload();
      assert.equal(await page.locator('.level-bar-compact-badge').innerText(), '3');
    });

    await check('menu móvel comunica estado, responde ao teclado e sincroniza ao redimensionar', async ({ page, go, cadastrar, admin }) => {
      await cadastrar();
      for (const file of ['index.html', 'cooperado.html', 'admin.html']) {
        if (file === 'admin.html') await admin();
        await page.setViewportSize({ width: 390, height: 844 });
        await go(file);
        const toggle = page.locator('#navbarToggle');
        const menu = page.locator('#navbarMenu');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await toggle.getAttribute('aria-label'), 'Abrir menu');
        assert((await toggle.getAttribute('aria-controls')).includes('navbarMenu'));
        assert.equal(await menu.isVisible(), false);
        await toggle.focus();
        await page.keyboard.press('Enter');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        assert.equal(await menu.isVisible(), true);
        await menu.locator('a').first().focus();
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        assert.equal(await toggle.evaluate(el => document.activeElement === el), true);
        await page.keyboard.press('Space');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.waitForFunction(() => !document.getElementById('navbarMenu').classList.contains('active'));
        assert.equal(await menu.isVisible(), true);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => document.getElementById('navbarToggle').getAttribute('aria-expanded') === 'false');
        assert.equal(await menu.isVisible(), false);
        if (file === 'index.html') {
          await toggle.click();
          await menu.locator('a[href="#sobre"]').click();
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        }
      }
    });

    await check('armazenamento corrompido mostra aviso e preserva dados ao tentar cadastrar ou entrar', async ({ page, go, cadastrar }) => {
      await cadastrar();
      for (const raw of ['{', 'null', '[null]']) {
        await page.evaluate(raw => localStorage.setItem('recynet_usuarios', raw), raw);
        await go('recynet.html');
        assert((await page.locator('#recynet-storage-error').innerText()).includes('dados foram preservados'));
        await page.locator('#email').fill('admin@fortes.com.br');
        await page.locator('#senha').fill('123456');
        await page.locator('#loginForm button[type="submit"]').click();
        assert.equal(await page.evaluate(() => localStorage.getItem('recynet_usuarios')), raw);
        await go('cadastro.html');
        assert.equal(await page.evaluate(async senha => (await RecyNetAuth.cadastrar('Outra Pessoa', 'outra@example.test', senha, senha)).sucesso, senha), false);
        await go('ranking.html');
        await page.waitForURL('**/recynet.html');
        assert.equal(await page.evaluate(() => localStorage.getItem('recynet_usuarios')), raw);
      }
    });

    await check('trocas de conta e de perfil em outra aba atualizam a página aberta', async ({ page, go, cadastrar, context }) => {
      const primeiro = await cadastrar('Pessoa Primeira', 'primeira@example.test');
      await cadastrar('Pessoa Segunda', 'segunda@example.test');
      await page.evaluate(async ({ email, senha }) => RecyNetAuth.login(email, senha), { email: primeiro.email, senha });
      await go('cooperado.html');
      const outra = await context.newPage();
      await outra.goto(`${base}/index.html`);
      await outra.addScriptTag({ url: `${base}/assets/js/database.js` });
      await outra.addScriptTag({ url: `${base}/assets/js/auth.js` });
      for (const [email, password, file, nome] of [
        ['segunda@example.test', senha, 'cooperado.html', 'Pessoa Segunda'],
        ['admin@fortes.com.br', '123456', 'admin.html', null],
        [primeiro.email, senha, 'cooperado.html', 'Pessoa Primeira']
      ]) {
        assert.equal(await outra.evaluate(async ({ email, password }) => (await RecyNetAuth.login(email, password)).sucesso, { email, password }), true);
        await page.waitForURL(`**/${file}`);
        if (nome) await page.waitForFunction(nome => document.getElementById('userName')?.textContent === nome, nome);
      }
      await outra.evaluate(() => RecyNetDB.logout());
      await page.waitForURL('**/recynet.html');
    });

    await check('coleta em outra aba atualiza o painel e exclusão invalida a sessão', async ({ page, go, cadastrar, context }) => {
      const user = await cadastrar();
      await go('cooperado.html');
      const outra = await context.newPage();
      await outra.goto(`${base}/index.html`);
      await outra.addScriptTag({ url: `${base}/assets/js/database.js` });
      assert.equal(await outra.evaluate(async id => (await RecyNetDB.registrarColeta(id, 'papel', 2000)).sucesso, user.id), true);
      await page.waitForFunction(() => document.getElementById('userLevel')?.textContent === '2');
      assert((await page.locator('#userKg').innerText()).includes('2,00'));
      // Simular uma exclusão recebida de outro consumidor do armazenamento.
      await outra.evaluate(id => localStorage.setItem('recynet_usuarios', JSON.stringify(RecyNetDB.getUsuarios().filter(u => u.id !== id))), user.id);
      await page.waitForURL('**/recynet.html');
      assert.equal(await page.evaluate(() => localStorage.getItem('recynet_sessao')), null);
    });

    await check('ajustes de pontos e peso exibem valor, sinal e motivo como texto nos históricos', async ({ page, go, cadastrar, admin }) => {
      const user = await cadastrar();
      await admin();
      await page.evaluate(async ({ id, motivo }) => {
        (await RecyNetDB.ajustarPontosUsuario(id, 10, motivo));
        (await RecyNetDB.ajustarPontosUsuario(id, -3, motivo));
        (await RecyNetDB.ajustarKgUsuario(id, 1.5, 'papel', motivo));
        (await RecyNetDB.ajustarKgUsuario(id, -0.5, 'papel', motivo));
      }, { id: user.id, motivo: payload });
      for (const [file, selector] of [['admin.html', '#adminRecentes'], ['cooperado.html', '#recent-activities'], ['perfil.html', '#history-list'], ['relatorio.html', '#activity-timeline']]) {
        if (file === 'cooperado.html') await page.evaluate(async ({ email, senha }) => RecyNetAuth.login(email, senha), { email: user.email, senha });
        await go(file);
        const texto = await page.locator(selector).innerText();
        for (const valor of ['+10 pontos', '-3 pontos', '+1,5 kg', '-0,5 kg', payload]) assert(texto.includes(valor), `${file}: ${valor}`);
        assert.equal(await page.locator('img[src="/regression-missing.png"]').count(), 0);
      }
    });

    await check('perfil mostra top 10% para líder e pontuação mensal exclui mês anterior e futuro', async ({ page, go, cadastrar }) => {
      const user = await cadastrar();
      await page.clock.setFixedTime(new Date('2026-03-01T12:00:00Z'));
      await page.evaluate(async id => {
        const usuario = RecyNetDB.getUsuarioPorId(id);
        usuario.totalKg = 10;
        usuario.historico = ['2026-03-01T02:59:59Z', '2026-03-01T03:00:00Z', '2026-03-02T03:00:00Z'].map((data,i) => ({id:`mes-${i}`,tipo:'coleta',data:new Date(data).toISOString(),material:'papel',gramas:i===2?8000:1000,kg:i===2?8:1,pontosGanhos:i===2?40:5}));
        usuario.materiais.papel=10;usuario.nivel=6;usuario.totalPontosGanhos=50;usuario.pontosDisponiveis=50;
        (await RecyNetDB.salvarUsuario(usuario));
        for(let i=1;i<10;i++) {
          const u=RecyNetDB.criarUsuario(`Pessoa ${i}`,`p${i}@example.test`,'a'.repeat(64));
          u.totalKg=i;u.materiais.papel=i;u.nivel=RecyNetDB.calcularNivel(i);
          u.historico=[{id:`peso-${i}`,tipo:'ajuste_kg',valor:i,material:'papel',motivo:'Peso de teste',data:new Date().toISOString()}];
          await RecyNetDB.salvarUsuario(u);
        }
      }, user.id);
      await go('perfil.html');
      assert((await page.locator('#ranking-position').innerText()).includes('top 10%'));
      await go('pontuacao.html');
      assert.equal(await page.locator('#monthPoints').innerText(), '5');
    }, { timezoneId: 'America/Sao_Paulo' });

    await check('edição de perfil e troca de senha funcionam pela interface', async ({page,go,cadastrar})=>{
      await cadastrar();await go('perfil.html');
      await page.getByRole('button',{name:'Editar Perfil'}).click();
      await page.locator('#editarNome').fill('Pessoa Editada');await page.locator('#editarEmail').fill('nova@example.test');
      await page.getByRole('button',{name:'Salvar perfil'}).click();
      await page.waitForFunction(()=>!document.getElementById('editarPerfilDialog').open);
      assert.equal(await page.locator('#userName').innerText(),'Pessoa Editada');
      await page.getByRole('button',{name:'Trocar Senha'}).click();
      await page.locator('#senhaAtual').fill('incorreta');await page.locator('#novaSenha').fill('NovaSenha@123');await page.locator('#confirmarNovaSenha').fill('NovaSenha@123');
      await page.getByRole('button',{name:'Salvar senha'}).click();
      await page.waitForFunction(()=>document.getElementById('trocarSenhaErro').textContent.includes('incorreta'));
      await page.locator('#senhaAtual').fill(senha);await page.getByRole('button',{name:'Salvar senha'}).click();
      await page.waitForFunction(()=>!document.getElementById('trocarSenhaDialog').open);
      await page.evaluate(()=>RecyNetDB.logout());await go('recynet.html');
      await page.locator('#email').fill('nova@example.test');await page.locator('#senha').fill('NovaSenha@123');await page.locator('#loginForm button[type="submit"]').click();
      await page.waitForURL('**/cooperado.html');assert.equal(await page.locator('#userName').innerText(),'Pessoa Editada');
    });

    await check('restauração pela interface valida arquivo e conserva a base anterior', async ({page,go,cadastrar})=>{
      const user=await cadastrar();const backup=await page.evaluate(()=>localStorage.getItem('recynet_usuarios'));
      await page.evaluate(()=>localStorage.setItem('recynet_usuarios','{arquivo interrompido'));
      await go('recuperar-dados.html');
      await page.locator('#backupFile').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('{')});
      await page.waitForFunction(()=>document.getElementById('backupPreview').textContent.includes('válido'));
      assert.equal(await page.locator('#restoreBackup').isDisabled(),true);
      await page.locator('#backupFile').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
      await page.waitForFunction(()=>!document.getElementById('restoreBackup').disabled);
      await page.locator('#restoreBackup').click();
      await page.waitForFunction(()=>document.getElementById('recoveryResult').textContent.includes('restaurada'));
      assert((await page.locator('#recoveryResult').innerText()).includes('restaurada'));
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_backup_anterior')),'{arquivo interrompido');
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).email,user.id),user.email);
      assert.equal(await page.evaluate(()=>RecyNetDB.getUsuarioLogado()),null);
    });

    await check('compartilhar realmente copia o link e informa falhas da área de transferência', async ({page,go,cadastrar})=>{
      await cadastrar();await page.route('**/maps/embed**',r=>r.abort());await go('locais.html');
      await page.evaluate(()=>{
        Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
        Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async texto=>{window.__copiado=texto;}}});
      });
      await page.locator('.location-card button').first().click();
      assert.equal(await page.evaluate(()=>window.__copiado),page.url());
      await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('Negado');};});
      await page.locator('.location-card button').first().click();
      assert((await page.getByRole('alert').last().innerText()).includes('Não foi possível copiar'));
    });

    await check('calculadora e saldo exibem pontos fracionários e recusa abaixo de 100g é específica', async ({page,go,cadastrar})=>{
      await cadastrar();await go('pontuacao.html');
      await page.locator('#materialSelect').selectOption('papel');await page.locator('#quantityInput').fill('0.101');
      await page.evaluate(()=>calcularPontos());assert.equal(await page.locator('#resultPoints').innerText(),'0,505');
      await page.locator('#btnRegistrar').click();await page.waitForFunction(()=>document.getElementById('totalPoints').textContent==='0,505');assert.equal(await page.locator('#totalPoints').innerText(),'0,505');
      await page.locator('#quantityInput').fill('0.05');await page.locator('#btnRegistrar').click();
      assert((await page.getByRole('status').last().innerText()).includes('0,1 kg'));
    });

    await check('diagnóstico executa seis testes em memória sem alterar contas nem sessão', async ({page,go,cadastrar})=>{
      await cadastrar();const antes=await page.evaluate(()=>JSON.stringify({...localStorage}));
      await go('teste-debug-completo.html');await page.locator('#runTests').click();
      await page.waitForFunction(()=>document.getElementById('testSummary').textContent.includes('falhas.'));
      assert.equal(await page.locator('#testSummary').innerText(),'6 aprovações; 0 falhas.');
      assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),antes);
    });

    await check('documentação da API filtra endpoints e gráficos carregam da cópia local', async ({page,go,cadastrar})=>{
      const user=await cadastrar();await page.evaluate(async id=>(await RecyNetDB.registrarColeta(id,'papel',2000)),user.id);
      await go('relatorio.html');assert.equal(await page.evaluate(()=>Boolean(Chart.getChart('materialsChart'))),true);
      await go('api-docs.html');await page.waitForFunction(()=>document.querySelectorAll('.api-operation').length>0);
      await page.locator('#apiSearch').fill('auth');
      const entradas=await page.locator('.api-operation summary').allTextContents();assert(entradas.length>0);assert(entradas.every(t=>t.toLowerCase().includes('auth')));
    });

    await check('busca de locais aceita acentos e o status muda no fechamento', async ({page,go,cadastrar})=>{
      await cadastrar();await page.route('**/maps/embed**',r=>r.abort());
      await page.clock.setFixedTime(new Date('2026-10-21T19:59:00Z'));await go('locais.html');
      await page.locator('#searchInput').fill('  PLÁSTICO  ');
      assert(await page.locator('.location-card').count()>0);
      const card=page.locator('.location-card').filter({has:page.locator('.location-name', {hasText:'Aparas Vitória'})});
      assert.equal((await card.locator('.badge').innerText()).trim(),'Aberto');
      await page.clock.setFixedTime(new Date('2026-10-21T20:00:00Z'));
      await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      assert.equal((await card.locator('.badge').innerText()).trim(),'Fechado');
    });

    await check('gráfico anual tem doze meses distintos no dia 31 e relatório cabe após redimensionar', async ({page,go,cadastrar})=>{
      const user=await cadastrar();
      await page.evaluate(async id=>(await RecyNetDB.registrarColeta(id,'papel',2000)),user.id);
      await page.clock.setFixedTime(new Date('2026-03-31T15:00:00Z'));await go('relatorio.html');
      await page.locator('[data-period="year"]').click();
      const labels=await page.evaluate(()=>Chart.getChart('temporalChart').data.labels);
      assert.equal(labels.length,12);assert.equal(new Set(labels).size,12);
      assert((await page.locator('#materialsSummary').innerText()).includes('papel:'));
      await page.setViewportSize({width:390,height:844});
      await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+2);
    });

    await check('backups com histórico incompleto ou gastos inválidos não habilitam restauração nem alteram dados', async ({page,go,cadastrar,admin})=>{
      const user=await cadastrar();await admin();await go('recuperar-dados.html');
      const antes=await page.evaluate(()=>JSON.stringify({...localStorage}));
      for(const usuario of [
        {...user,historico:[{id:'coleta-incompleta',tipo:'coleta',data:new Date().toISOString()}]},
        {...user,pontosGastos:'inválido'}
      ]) {
        await page.locator('#backupFile').setInputFiles({name:'incompleto.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([usuario]))});
        await page.waitForFunction(()=>document.getElementById('backupPreview').textContent.includes('inválidos'));
        assert.equal(await page.locator('#restoreBackup').isDisabled(),true);
        assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage})),antes);
      }
    });

    await check('troca, limpeza e erro de leitura de arquivo invalidam resultados anteriores de backup', async ({page,go,cadastrar,admin,dialogs})=>{
      const user=await cadastrar();
      const arquivoA={name:'A.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{...user,nome:'Cópia A'}]))};
      const arquivoB={name:'B.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{...user,nome:'Cópia B'}]))};
      for(const cenario of ['selecionar B','selecionar inválido','limpar seleção','falha de A']) {
        await go('cadastro.html');await admin();await go('recuperar-dados.html');
        const antes=await page.evaluate(()=>localStorage.getItem('recynet_usuarios'));
        await page.evaluate(()=>{
          const original=File.prototype.text;
          File.prototype.text=function(){
            if(this.name!=='A.json')return original.call(this);
            return original.call(this).then(texto=>new Promise((resolve,reject)=>{
              window.__concluirArquivoA=falhar=>falhar ? reject(new Error('Erro de leitura antigo')) : resolve(texto);
            }));
          };
        });
        await page.locator('#backupFile').setInputFiles(arquivoA);
        await page.waitForFunction(()=>typeof window.__concluirArquivoA==='function');
        assert.equal(await page.locator('#restoreBackup').isDisabled(),true);
        if(cenario==='limpar seleção') {
          await page.locator('#backupFile').setInputFiles([]);
        } else if(cenario==='selecionar inválido') {
          await page.locator('#backupFile').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from('{')});
          await page.waitForFunction(()=>document.getElementById('backupPreview').textContent.includes('válido'));
        } else {
          await page.locator('#backupFile').setInputFiles(arquivoB);
          await page.waitForFunction(()=>!document.getElementById('restoreBackup').disabled);
        }
        const previa=await page.locator('#backupPreview').innerText();
        await page.evaluate(async falhar=>{
          window.__concluirArquivoA(falhar);
          await new Promise(resolve=>requestAnimationFrame(resolve));
        },cenario==='falha de A');
        assert.equal(await page.locator('#backupPreview').innerText(),previa,cenario);
        assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_usuarios')),antes,cenario);
        if(cenario==='selecionar B' || cenario==='falha de A') {
          assert.equal(await page.locator('#backupFile').evaluate(el=>el.files[0].name),'B.json');
          assert(previa.includes('B.json'));
          await page.locator('#restoreBackup').click();
          await page.waitForFunction(()=>document.getElementById('recoveryResult').textContent.includes('restaurada'));
          assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).nome,user.id),'Cópia B');
          assert(dialogs.at(-1).includes('B.json'));
        } else {
          assert.equal(await page.locator('#restoreBackup').isDisabled(),true,cenario);
        }
      }
    });
    await check('administrador e visitante saem das páginas de cooperado sem erro de inicialização', async ({ page, go, admin }) => {
      const paginas = ['cooperado.html', 'perfil.html', 'pontuacao.html', 'ranking.html', 'relatorio.html', 'recompensas.html', 'noticias.html', 'locais.html'];
      for (const arquivo of paginas) {
        await go(arquivo);
        await page.waitForURL('**/recynet.html');
      }
      await admin();
      for (const arquivo of paginas) {
        await go(arquivo);
        await page.waitForURL('**/admin.html');
      }
    });

    await check('1001 gramas mantém precisão nos totais e históricos do usuário e administrador', async ({ page, go, cadastrar, admin }) => {
      const user = await cadastrar();
      assert.equal(await page.evaluate(async id => (await RecyNetDB.registrarColeta(id, 'papel', 1001)).sucesso, user.id), true);
      for (const arquivo of ['cooperado.html', 'perfil.html', 'relatorio.html']) {
        await go(arquivo);
        const texto = await page.locator('body').innerText();
        assert(texto.includes('1,001 kg'), arquivo);
        assert(texto.includes('Reciclou 1,001 kg'), arquivo);
      }
      await admin();
      for (const arquivo of ['admin.html', 'perfil-admin.html']) {
        await go(arquivo);
        assert((await page.locator('body').innerText()).includes('1,001 kg'), arquivo);
      }
    });

    await check('nomes e emails longos cabem nas páginas de cooperado e perfil após reduzir a tela', async ({ page, go, cadastrar }) => {
      const nome = 'Pessoa' + 'A'.repeat(100);
      const email = 'pessoa' + 'b'.repeat(100) + '@example.test';
      await cadastrar(nome, email);
      for (const arquivo of ['cooperado.html', 'perfil.html']) {
        await page.setViewportSize({width:1280,height:900});
        await go(arquivo);
        for (const width of [390, 320]) {
          await page.setViewportSize({width,height:844});
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.equal(await page.locator('#userName').textContent(), nome);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), arquivo + ': ' + width);
        }
      }
    });

    await check('falha ao remover sessão mantém a conta e exibe erro; nova tentativa permite sair', async ({ page, go, cadastrar }) => {
      const user = await cadastrar(); await go('cooperado.html');
      await page.evaluate(() => {
        window.__removeItemOriginal = Storage.prototype.removeItem;
        Storage.prototype.removeItem = function(key) {
          if(key === 'recynet_sessao') throw new DOMException('Bloqueado', 'SecurityError');
          return window.__removeItemOriginal.call(this,key);
        };
      });
      await page.getByText('Sair', {exact:true}).click();
      assert((await page.getByRole('alert').last().innerText()).includes('Não foi possível encerrar a sessão'));
      assert(page.url().endsWith('/cooperado.html'));
      await page.waitForFunction(() => document.getElementById('recynet-toasts').getBoundingClientRect().top >= document.querySelector('nav').getBoundingClientRect().bottom);
      assert.equal(await page.evaluate(() => RecyNetDB.getUsuarioLogado().id), user.id);
      await page.evaluate(() => Storage.prototype.removeItem = window.__removeItemOriginal);
      await page.getByText('Sair', {exact:true}).click();
      await page.waitForURL('**/recynet.html');
      assert.equal(await page.evaluate(() => RecyNetDB.getUsuarioLogado()), null);
    });

    await check('cadastro mantém campos largos e termos abaixo do cartão em celular e desktop', async ({ page, go }) => {
      for (const arquivo of ['cadastro.html', 'recynet.html']) {
        await go(arquivo);
        for (const width of [320, 390, 768, 1280]) {
          await page.setViewportSize({ width, height: 844 });
          await page.waitForTimeout(250);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const medidas = await page.evaluate(() => {
            const card = document.querySelector('.auth-card').getBoundingClientRect();
            const input = document.querySelector('.form-input').getBoundingClientRect();
            const termos = document.getElementById('termos-de-uso')?.getBoundingClientRect();
            return { campo: input.width, card: card.width, termosAbaixo: !termos || termos.top >= card.bottom,
              overflow: document.documentElement.scrollWidth > innerWidth + 1 };
          });
          assert(medidas.campo >= 200, `${arquivo} ${width}: campo ${medidas.campo}px`);
          assert(medidas.card <= 481, `${arquivo} ${width}: cartão limitado`);
          assert(medidas.termosAbaixo, `${arquivo} ${width}: termos abaixo`);
          assert.equal(medidas.overflow, false, `${arquivo} ${width}`);
        }
      }
      await page.setViewportSize({ width: 320, height: 640 });
      await go('cadastro.html');
      await page.locator('a[href="#termos-de-uso"]').click();
      await page.waitForTimeout(500);
      assert(await page.locator('#termos-de-uso').evaluate(el => {
        const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
      }));
      await page.locator('#nome').fill('Pessoa Cadastro Mobile');
      await page.locator('#email').fill('mobile@example.test');
      await page.locator('#senha').fill(senha);
      await page.locator('#confirmarSenha').fill(senha);
      await page.locator('#termos').check();
      await page.getByRole('button', { name: 'Criar Conta', exact: true }).click();
      await page.waitForURL('**/cooperado.html');
      assert.equal(await page.locator('#userName').textContent(), 'Pessoa Cadastro Mobile');
    });

    await check('menu permite toque e teclado em telas baixas sem esconder o botão de fechar', async ({ page, go, cadastrar, admin }) => {
      await page.route('https://**/*', route => route.abort());
      await cadastrar();
      const paginas = ['index.html', 'cooperado.html', 'perfil.html', 'pontuacao.html', 'ranking.html',
        'relatorio.html', 'recompensas.html', 'noticias.html', 'locais.html', 'admin.html', 'perfil-admin.html', 'utilidades-admin.html'];
      const centroVisivel = locator => locator.evaluate(el => {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const topo = document.elementFromPoint(x, y);
        return x >= 0 && x < innerWidth && y >= 0 && y < innerHeight && !!topo && el.contains(topo);
      });
      for (const arquivo of paginas) {
        if (arquivo === 'admin.html') await admin();
        await go(arquivo);
        const tamanhos = ['index.html', 'cooperado.html', 'admin.html'].includes(arquivo)
          ? [{width:390,height:500}, {width:667,height:320}] : [{width:390,height:500}];
        for (const tamanho of tamanhos) {
          await page.setViewportSize(tamanho);
          const toggle = page.locator('#navbarToggle');
          await toggle.tap();
          const painel = page.locator('.navbar-panel');
          assert(await page.locator('nav').evaluate(el => el.getBoundingClientRect().height <= innerHeight + 1), arquivo);
          assert(await centroVisivel(toggle), `${arquivo}: fechar visível`);
          await painel.hover();
          await page.mouse.wheel(0, 1500);
          await page.waitForTimeout(100);
          const ultimo = painel.locator('a').last();
          assert(await centroVisivel(ultimo), `${arquivo}: última ação alcançável por rolagem`);
          assert(await centroVisivel(toggle), `${arquivo}: fechar após rolagem`);
          await toggle.tap();
          assert.equal(await painel.isVisible(), false);
          await toggle.focus();
          await page.keyboard.press('Enter');
          const links = painel.locator('a');
          for (let i = 0; i < await links.count(); i++) {
            await page.keyboard.press('Tab');
            assert(await links.nth(i).evaluate(el => document.activeElement === el), `${arquivo}: ordem do teclado ${i}`);
            assert(await centroVisivel(links.nth(i)), `${arquivo}: foco visível ${i}`);
            assert(await centroVisivel(toggle), `${arquivo}: fechar disponível no teclado`);
          }
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
          assert(await toggle.evaluate(el => document.activeElement === el));
        }
      }
      await page.setViewportSize({width:1280,height:900});
      assert.equal(await page.locator('.navbar-panel').evaluate(el => getComputedStyle(el).display), 'contents');
      assert.equal(await page.locator('#navbarMenu').isVisible(), true);
      await page.setViewportSize({width:390,height:500});
      assert.equal(await page.locator('.navbar-panel').isVisible(), false);
      await page.locator('#navbarToggle').tap();
      await page.locator('.navbar-panel').hover();
      await page.mouse.wheel(0, 1500);
      await page.getByText('Sair', {exact:true}).tap();
      await page.waitForURL('**/recynet.html');
      assert.equal(await page.evaluate(() => RecyNetDB.getUsuarioLogado()), null);
    }, { hasTouch: true });

    await check('relatório, ranking e utilidades cabem em 320 px com nomes e identificação completos', async ({ page, go, cadastrar, admin }) => {
      await page.route('https://**/*', route => route.abort());
      const user = await cadastrar('Pessoa Auditoria');
      await page.evaluate(async id => (await RecyNetDB.registrarColeta(id, 'papel', 1001)), user.id);
      for (const arquivo of ['ranking.html', 'relatorio.html', 'utilidades-admin.html']) {
        if (arquivo === 'utilidades-admin.html') await admin();
        await go(arquivo);
        for (const width of [320, 390, 1280]) {
          await page.setViewportSize({width,height:900});
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${arquivo} ${width}`);
          if (arquivo !== 'utilidades-admin.html') {
            assert(await page.locator('.podio-name-modern').first().evaluate(el => el.scrollWidth <= el.clientWidth + 1));
            assert(await page.locator('.me-tag').first().evaluate(el => {
              const r=el.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth;
            }), `${arquivo} ${width}: selo Você`);
            assert(await page.locator('.ranking-nome').first().evaluate(el => getComputedStyle(el).whiteSpace !== 'nowrap'));
          } else {
            assert(await page.locator('.form-control').evaluateAll(es => es.every(el => el.getBoundingClientRect().right <= innerWidth)));
          }
        }
      }
    }, {reducedMotion:'reduce'});

    await check('badges de pontos têm contraste e campos administrativos têm área de toque adequada', async ({ page, go, cadastrar, admin }) => {
      await cadastrar(); await go('pontuacao.html');
      const cores = await page.locator('.points-badge').evaluateAll(es => es.map(el => {
        const s=getComputedStyle(el); return {color:s.color,bg:s.backgroundColor,image:s.backgroundImage};
      }));
      const luminancia = cor => cor.match(/[0-9.]+/g).slice(0,3).map(Number).map(v => v/255).map(v => v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
      for (const cor of cores) {
        assert.equal(cor.image,'none');
        const a=luminancia(cor.color),b=luminancia(cor.bg);
        assert((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5);
      }
      await admin(); await go('admin.html');
      for (const width of [320,390,1280]) {
        await page.setViewportSize({width,height:900}); await page.waitForTimeout(250);
        assert(await page.locator('#formRegistrarColeta input, #formRegistrarColeta select').evaluateAll(es => es.every(el => el.getBoundingClientRect().height >= 44 && parseFloat(getComputedStyle(el).fontSize)>=16)));
      }
    });

    await check('âncoras deixam o título abaixo do cabeçalho e levam o foco ao conteúdo', async ({ page, go }) => {
      for (const width of [1280,390]) {
        await page.setViewportSize({width,height:844}); await go('index.html');
        if(width===390) await page.locator('#navbarToggle').click();
        await page.locator('a[href="#projetos"]').click();
        await page.waitForFunction(() => document.activeElement.id === 'projetos');
        assert(await page.locator('#projetos h2').evaluate(el => el.getBoundingClientRect().top >= document.querySelector('nav').getBoundingClientRect().bottom));
        if(width===390) assert.equal(await page.locator('#navbarToggle').getAttribute('aria-expanded'),'false');
      }
    }, {reducedMotion:'reduce'});

    await check('estimativa é invalidada ao mudar peso ou material e registrar mantém aparência de ação', async ({ page, go, cadastrar }) => {
      const user=await cadastrar(); await go('pontuacao.html');
      assert(await page.locator('#btnRegistrar').evaluate(el => el.classList.contains('btn-primary') && getComputedStyle(el).backgroundColor !== 'rgb(239, 239, 239)'));
      assert((await page.locator('#registroAjuda').innerText()).includes('100 g'));
      await page.locator('#quantityInput').fill('1'); await page.getByRole('button',{name:'Calcular',exact:true}).click();
      assert.equal(await page.locator('#resultPoints').textContent(),'20');
      await page.locator('#quantityInput').fill('2');
      assert.equal(await page.locator('#calculatorResult').isVisible(),false);
      assert.equal(await page.getByText('Estimativa: 20 pontos.',{exact:true}).count(),0);
      await page.getByRole('button',{name:'Calcular',exact:true}).click();
      assert.equal(await page.locator('#resultPoints').textContent(),'40');
      await page.locator('#materialSelect').selectOption('papel');
      assert.equal(await page.locator('#calculatorResult').isVisible(),false);
      await page.getByRole('button',{name:'Calcular',exact:true}).click();
      assert.equal(await page.locator('#resultPoints').textContent(),'10');
      await page.locator('#btnRegistrar').click();
      await page.waitForFunction(()=>document.getElementById('quantityInput').value==='');
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).historico.find(h=>h.tipo==='coleta').pontosGanhos,user.id),10);
      assert(!(await page.locator('.tips-list').innerText()).includes('ganhar bônus'));
    });

    await check('avisos não se sobrepõem e erros persistem até fechamento manual', async ({ page, go, cadastrar }) => {
      await cadastrar(); await go('cooperado.html'); await page.clock.install();
      await page.evaluate(()=>{
        RecyNetUtils.showToast('Erro persistente um','error');
        RecyNetUtils.showToast('Erro persistente dois','error');
        RecyNetUtils.showToast('Aviso informativo','info');
      });
      assert(await page.locator('.recynet-toast').evaluateAll(es=>es.slice(1).every((el,i)=>el.getBoundingClientRect().top>=es[i].getBoundingClientRect().bottom)));
      await page.clock.runFor(7000);
      assert.equal(await page.locator('.recynet-toast[role="alert"]').count(),2);
      assert.equal(await page.getByText('Aviso informativo',{exact:true}).count(),0);
      await page.locator('.recynet-toast').first().getByRole('button',{name:'Fechar notificação'}).click();
      assert.equal(await page.locator('.recynet-toast').count(),1);
      await page.setViewportSize({width:390,height:500});
      await page.locator('#navbarToggle').click();
      assert.equal(await page.locator('#recynet-toasts').isVisible(),false);
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.getElementById('recynet-toasts').clientHeight>0);
      assert.equal(await page.locator('#recynet-toasts').isVisible(),true);
      await page.evaluate(()=>RecyNetUtils.showToast('Leitura pausada','info'));
      const ultimo=page.locator('.recynet-toast').last();
      await ultimo.getByRole('button').focus(); await page.clock.runFor(7000);
      assert.equal(await ultimo.getByText('Leitura pausada').count(),1);
    });

    await check('cadastro associa erro persistente ao campo, preserva ajuda e permite corrigir', async ({ page, go, cadastrar }) => {
      await cadastrar(); await go('cadastro.html');
      await page.locator('#nome').fill('Ab'); await page.locator('#email').fill('nova@example.test');
      await page.locator('#senha').fill(senha); await page.locator('#confirmarSenha').fill(senha); await page.locator('#termos').check();
      const enviar=()=>page.getByRole('button',{name:'Criar Conta',exact:true}).click();
      await enviar();
      assert.equal(await page.locator('#nome').getAttribute('aria-invalid'),'true');
      assert.equal(await page.locator('#nome').getAttribute('aria-describedby'),'nomeErro');
      assert(await page.locator('#nome').evaluate(el=>document.activeElement===el));
      assert((await page.locator('#nomeErro').textContent()).includes('3 caracteres'));
      await page.locator('#nome').fill('Pessoa Corrigida');
      assert.equal(await page.locator('#nomeErro').count(),0);
      await page.locator('#senha').fill('abcdefgh'); await enviar();
      assert((await page.locator('#senha').getAttribute('aria-describedby')).includes('senhaAjuda'));
      assert((await page.locator('#senha').getAttribute('aria-describedby')).includes('senhaErro'));
      await page.locator('#senha').fill(senha); await page.locator('#confirmarSenha').fill('OutraSenha@123'); await enviar();
      assert.equal(await page.locator('#confirmarSenha').getAttribute('aria-invalid'),'true');
      await page.locator('#confirmarSenha').fill(senha); await page.locator('#termos').uncheck(); await enviar();
      assert.equal(await page.locator('#termos').getAttribute('aria-invalid'),'true');
      await page.locator('#termos').check(); await page.locator('#email').fill('pessoa@example.test'); await enviar();
      assert.equal(await page.locator('#email').getAttribute('aria-invalid'),'true');
      assert((await page.locator('#emailErro').innerText()).includes('já está cadastrado'));
      await page.locator('#email').fill('corrigida@example.test'); await enviar();
      await page.waitForURL('**/cooperado.html');
      assert.equal(await page.locator('#userName').textContent(),'Pessoa Corrigida');
    });

    await check('limpeza informa todas as contas, permite cancelar e oferece destinos administrativos explícitos', async ({ page, go, cadastrar, admin, dialogs }) => {
      await cadastrar(); await admin(); await go('limpar-dados.html');
      await page.getByRole('button',{name:'← Voltar',exact:true}).click(); await page.waitForURL('**/admin.html');
      await go('limpar-dados.html'); await page.clock.install();
      const antes=await page.evaluate(()=>({dados:localStorage.getItem('recynet_usuarios'),sessao:localStorage.getItem('recynet_sessao')}));
      assert((await page.locator('#cleanupScope').textContent()).includes('1'));
      assert.equal(await page.getByText('exporte um backup nas utilidades administrativas').getAttribute('href'),'utilidades-admin.html');
      page.removeAllListeners('dialog');
      page.once('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});
      await page.getByRole('button',{name:'Excluir todos os cooperados locais',exact:true}).click();
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_usuarios')),antes.dados);
      assert.equal(await page.locator('#successBox').isVisible(),false);
      assert(dialogs.at(-1).includes('1 conta(s)'));
      page.once('dialog',async d=>{dialogs.push(d.message());await d.accept();});
      await page.getByRole('button',{name:'Excluir todos os cooperados locais',exact:true}).click();
      await page.waitForFunction(()=>document.getElementById('successBox').style.display==='block');
      await page.clock.runFor(2500);
      assert.equal(await page.locator('#successBox').isVisible(),true);
      assert(page.url().endsWith('/limpar-dados.html'));
      assert.equal(dialogs.length,2);
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_sessao')),antes.sessao);
      assert.equal(await page.evaluate(()=>RecyNetDB.getUsuarios().filter(u=>u.tipo==='user').length),0);
      assert.equal(await page.locator('#deleteAllUsers').isDisabled(),true);
      await page.getByRole('link',{name:'Voltar ao painel administrativo'}).click(); await page.waitForURL('**/admin.html');
    });

    await check('movimento reduzido desativa animações e transições inclusive nos gráficos e avisos', async ({ page, go, cadastrar, admin }) => {
      await page.route('https://**/*',route=>route.abort()); const user=await cadastrar();
      await page.evaluate(async id=>(await RecyNetDB.registrarColeta(id,'papel',1001)),user.id);
      for(const arquivo of ['index.html','cadastro.html','recynet.html','cooperado.html','perfil.html','pontuacao.html','ranking.html','relatorio.html','recompensas.html','noticias.html','locais.html','admin.html','perfil-admin.html','utilidades-admin.html']) {
        if(arquivo==='admin.html') await admin(); await go(arquivo);
        assert(await page.evaluate(()=>[...document.querySelectorAll('body *')].every(el=>{
          const s=getComputedStyle(el);return s.animationName==='none' && s.transitionDuration.split(',').every(t=>parseFloat(t)===0);
        })),arquivo);
        if(arquivo==='relatorio.html') assert.equal(await page.evaluate(()=>Chart.getChart(document.getElementById('temporalChart')).options.animation.duration),0);
      }
      await page.evaluate(()=>RecyNetUtils.showToast('Aviso sem movimento','error'));
      assert.equal(await page.locator('.recynet-toast').evaluate(el=>getComputedStyle(el).animationName),'none');
    }, {reducedMotion:'reduce'});

    await check('navegação identifica uma única página atual no desktop e no menu móvel', async ({ page, go, cadastrar, admin }) => {
      await page.route('https://**/*',route=>route.abort()); await cadastrar();
      for(const arquivo of ['index.html','cooperado.html','perfil.html','pontuacao.html','ranking.html','relatorio.html','recompensas.html','noticias.html','locais.html','admin.html','perfil-admin.html','utilidades-admin.html']) {
        if(arquivo==='admin.html') await admin();
        await page.setViewportSize({width:1280,height:900}); await go(arquivo);
        const atual=page.locator('.navbar a[aria-current="page"]');
        assert.equal(await atual.count(),1,arquivo);
        assert.equal(await atual.getAttribute('href'),arquivo);
        assert(await page.locator('.navbar-menu .nav-link').evaluateAll((es,arquivo)=>es.every(el=>el.classList.contains('active')===(el.getAttribute('href')===arquivo)),arquivo));
        await page.setViewportSize({width:390,height:844}); await page.locator('#navbarToggle').click();
        assert.equal(await page.locator('.navbar a[aria-current="page"]').count(),1,arquivo);
        await page.keyboard.press('Escape');
      }
      await go('index.html'); await page.goto(page.url().replace('/index.html','/'));
      assert.equal(await page.locator('.navbar a[aria-current="page"]').getAttribute('href'),'index.html');
    }, {reducedMotion:'reduce'});

    await check('filtros do relatório sincronizam seleção acessível, teclado e dados do gráfico', async ({ page, go, cadastrar }) => {
      const user=await cadastrar();
      await page.evaluate(async id=>(await RecyNetDB.registrarColeta(id,'papel',1001)),user.id);
      await go('relatorio.html');
      const filtros=page.getByRole('group',{name:'Período do gráfico'});
      assert.equal(await filtros.getByRole('button',{pressed:true}).innerText(),'Semana');
      for(const [nome,tecla,total] of [['Mês','Space',4],['Ano','Enter',12],['Semana','Space',7]]) {
        await filtros.getByRole('button',{name:nome,exact:true}).focus(); await page.keyboard.press(tecla);
        assert.equal(await filtros.getByRole('button',{pressed:true}).count(),1);
        assert.equal(await filtros.getByRole('button',{pressed:true}).innerText(),nome);
        assert.equal(await filtros.locator('.active').innerText(),nome);
        assert.equal(await filtros.getByRole('button',{pressed:false}).count(),2);
        assert.equal(await page.evaluate(()=>Chart.getChart(document.getElementById('temporalChart')).data.labels.length),total);
      }
    }, {reducedMotion:'reduce'});

    await check('primeiro Tab permite pular todos os menus e transfere o foco para o conteúdo', async ({ page, go, cadastrar, admin }) => {
      await page.route('https://**/*',route=>route.abort()); await cadastrar();
      for(const arquivo of ['index.html','cooperado.html','perfil.html','pontuacao.html','ranking.html','relatorio.html','recompensas.html','noticias.html','locais.html','admin.html','perfil-admin.html','utilidades-admin.html']) {
        if(arquivo==='admin.html') await admin();
        const larguras=['index.html','cooperado.html','admin.html'].includes(arquivo)?[1280,320]:[1280];
        for(const width of larguras) {
          await page.setViewportSize({width,height:844}); await go(arquivo);
          const atalho=page.getByRole('link',{name:'Pular para o conteúdo',exact:true});
          assert(await atalho.evaluate(el=>el.getBoundingClientRect().bottom<0));
          await page.keyboard.press('Tab');
          assert(await atalho.evaluate(el=>document.activeElement===el),`${arquivo} ${width}: primeiro Tab`);
          assert(await atalho.evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.right<=innerWidth&&el===document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);}));
          await page.keyboard.press('Enter');
          await page.waitForFunction(()=>document.activeElement.id==='conteudo-principal');
          assert.equal(await page.getByRole('main').count(),1,arquivo);
          assert.equal(await page.getByRole('main').getAttribute('id'),'conteudo-principal');
          assert(await page.getByRole('main').evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('nav').getBoundingClientRect().bottom),`${arquivo}: conteúdo abaixo do cabeçalho`);
        }
      }
    }, {reducedMotion:'reduce'});

    await check('utilitários de animação têm duração e easing válidos e respeitam movimento reduzido', async ({ page, go }) => {
      await go('index.html'); await page.emulateMedia({reducedMotion:'no-preference'});
      const animacoes=await page.evaluate(()=>['fade-in','fade-in-up','slide-in-right'].map(classe=>{
        const el=document.createElement('div');el.className=classe;el.textContent='Animação';document.body.appendChild(el);
        const s=getComputedStyle(el);return {classe,nome:s.animationName,duracao:s.animationDuration,easing:s.animationTimingFunction};
      }));
      for(const [i,nome] of ['fadeIn','fadeInUp','slideInRight'].entries()) {
        assert.equal(animacoes[i].nome,nome);
        assert.equal(animacoes[i].duracao,'0.3s');
        assert.equal(animacoes[i].easing,'ease-in-out');
      }
      await page.emulateMedia({reducedMotion:'reduce'});
      assert(await page.locator('body > .fade-in, body > .fade-in-up, body > .slide-in-right').evaluateAll(es=>es.length===3&&es.every(el=>getComputedStyle(el).animationName==='none')));
    });

    await check('coleta administrativa fracionada exporta e restaura; backup legado informa normalização', async ({ page, go, cadastrar, admin }) => {
      const user=await cadastrar();await admin();await go('admin.html');
      await page.locator('#selectUsuario').selectOption(user.id);await page.locator('#selectMaterial').selectOption('papel');
      await page.locator('#inputPeso').fill('1.001');await page.getByRole('button',{name:'Registrar Coleta',exact:true}).click();
      await page.waitForFunction(id=>RecyNetDB.getUsuarioPorId(id).totalKg===1.001,user.id);
      const texto=await page.evaluate(()=>JSON.stringify(RecyNetDB.getUsuarios()));
      assert.equal(JSON.parse(texto).find(u=>u.id===user.id).historico[0].gramas,1001);
      await go('utilidades-admin.html');
      const baixou=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar Backup',exact:false}).click();
      const download=await baixou;const stream=await download.createReadStream();const chunks=[];for await(const c of stream)chunks.push(c);
      const arquivo=Buffer.concat(chunks);
      assert.equal(JSON.parse(arquivo.toString()).find(u=>u.id===user.id).historico[0].gramas,1001);
      await go('recuperar-dados.html');await page.locator('#backupFile').setInputFiles({name:'exportado.json',mimeType:'application/json',buffer:arquivo});
      await page.waitForFunction(()=>!document.getElementById('restoreBackup').disabled);
      await page.locator('#restoreBackup').click();await page.waitForFunction(()=>document.getElementById('recoveryResult').textContent.includes('restaurada'));
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).historico[0].gramas,user.id),1001);
      assert.equal(await page.evaluate(()=>RecyNetDB.getUsuarioLogado()),null);
      await go('recynet.html');await admin();await go('recuperar-dados.html');
      const legado=JSON.parse(arquivo.toString());legado.find(u=>u.id===user.id).historico[0].gramas=1.001*1000;
      const antes=await page.evaluate(()=>localStorage.getItem('recynet_usuarios'));
      await page.locator('#backupFile').setInputFiles({name:'legado.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legado))});
      await page.waitForFunction(()=>!document.getElementById('restoreBackup').disabled);
      assert((await page.locator('#backupPreview').innerText()).includes('1 registro(s) terão os gramas normalizados'));
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_usuarios')),antes);
      await page.locator('#restoreBackup').click();await page.waitForFunction(()=>document.getElementById('recoveryResult').textContent.includes('restaurada'));
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).historico[0].gramas,user.id),1001);
    });

    await check('duas abas reais preservam coletas, ajustes e cadastros concorrentes', async ({ page, context, go }) => {
      // As páginas da documentação não recarregam ao receber storage: aqui testamos a camada de persistência.
      await go('api-docs.html');const base=page.url();
      await page.addScriptTag({url:new URL('assets/js/database.js',base).href});await page.addScriptTag({url:new URL('assets/js/auth.js',base).href});
      const outra=await context.newPage();await outra.goto(base);await outra.addScriptTag({url:new URL('assets/js/database.js',base).href});await outra.addScriptTag({url:new URL('assets/js/auth.js',base).href});
      const erros=[];outra.on('pageerror',e=>erros.push(e.message));
      const user=await page.evaluate(async senha=>(await RecyNetAuth.cadastrar('Pessoa Concorrente','concorrente@example.test',senha,senha)).usuario,senha);
      await page.evaluate(()=>{window.__gate=new Promise(r=>window.__release=r);window.__lock=navigator.locks.request('recynet:contas:v1',()=>{window.__held=true;return __gate;});});
      await page.waitForFunction(()=>window.__held);
      const primeira=page.evaluate(async id=>{const resultados=[];for(let i=0;i<10;i++)resultados.push(await RecyNetDB.registrarColeta(id,'papel',1001));return resultados.map(r=>r.sucesso);},user.id);
      const segunda=outra.evaluate(async id=>{const resultados=[];for(let i=0;i<10;i++)resultados.push(await RecyNetDB.registrarColeta(id,'papel',2000));return resultados.map(r=>r.sucesso);},user.id);
      await page.waitForFunction(async()=> (await navigator.locks.query()).pending.filter(l=>l.name==='recynet:contas:v1').length===2);
      await page.evaluate(()=>window.__release());
      assert((await primeira).every(Boolean));assert((await segunda).every(Boolean));
      const estado=await page.evaluate(id=>{const u=RecyNetDB.getUsuarioPorId(id);return {kg:u.totalKg,pontos:u.pontosDisponiveis,atividades:u.historico.length,backup:RecyNetDB.validarBackup(JSON.stringify(RecyNetDB.getUsuarios())).sucesso};},user.id);
      assert.deepEqual(estado,{kg:30.01,pontos:150.05,atividades:20,backup:true});
      await page.evaluate(()=>RecyNetAuth.login('admin@fortes.com.br','123456'));
      const r=await Promise.all([page.evaluate(id=>RecyNetDB.ajustarPontosUsuario(id,1,'A'),user.id),outra.evaluate(id=>RecyNetDB.ajustarPontosUsuario(id,2,'B'),user.id)]);
      assert(r.every(x=>x.sucesso));assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).pontosDisponiveis,user.id),153.05);
      const cadastrar=(tab,email)=>tab.evaluate(async({email,senha})=>RecyNetAuth.cadastrar('Outra Pessoa',email,senha,senha),{email,senha});
      const novos=await Promise.all([cadastrar(page,'um@example.test'),cadastrar(outra,'dois@example.test')]);assert(novos.every(r=>r.sucesso));
      const duplicados=await Promise.all([cadastrar(page,'dup@example.test'),cadastrar(outra,' DUP@EXAMPLE.TEST ')]);assert.equal(duplicados.filter(r=>r.sucesso).length,1);
      assert.equal(await page.evaluate(()=>RecyNetDB.getUsuarios().filter(u=>u.tipo==='user').length),4);
      assert.deepEqual(erros,[]);
    });

    await check('trava revalida sessão após espera, protege snapshots antigos e ordena restauração', async ({ page, context, go }) => {
      await go('api-docs.html');const base=page.url();
      for(const file of ['assets/js/database.js','assets/js/auth.js']) await page.addScriptTag({url:new URL(file,base).href});
      const outra=await context.newPage();await outra.goto(base);for(const file of ['assets/js/database.js','assets/js/auth.js']) await outra.addScriptTag({url:new URL(file,base).href});
      const user=await page.evaluate(async senha=>(await RecyNetAuth.cadastrar('Pessoa Teste','teste@example.test',senha,senha)).usuario,senha);
      await page.evaluate(id=>{window.__snapshot=RecyNetDB.getUsuarioPorId(id);window.__base=RecyNetDB.getUsuarios();},user.id);
      assert.equal((await outra.evaluate(id=>RecyNetDB.registrarColeta(id,'papel',1000),user.id)).sucesso,true);
      const rejeitados=await page.evaluate(async()=>{const erros=[];for(const fn of [()=>RecyNetDB.salvarUsuario(__snapshot),()=>RecyNetDB.gravarUsuarios(__base)]){try{await fn();erros.push(false);}catch{erros.push(true);}}return erros;});assert.deepEqual(rejeitados,[true,true]);
      await page.evaluate(()=>RecyNetAuth.login('admin@fortes.com.br','123456'));
      const texto=await page.evaluate(()=>JSON.stringify(RecyNetDB.getUsuarios()));
      await page.evaluate(()=>{window.__gate=new Promise(r=>window.__release=r);window.__lock=navigator.locks.request('recynet:contas:v1',()=>{window.__held=true;return __gate;});});await page.waitForFunction(()=>window.__held);
      const restaurando=page.evaluate(texto=>RecyNetDB.restaurarBackup(texto),texto);
      await page.waitForFunction(async()=> (await navigator.locks.query()).pending.length===1);
      const coleta=outra.evaluate(id=>RecyNetDB.registrarColeta(id,'papel',2000),user.id);
      await page.waitForFunction(async()=> (await navigator.locks.query()).pending.length===2);
      await page.evaluate(()=>window.__release());assert.equal((await restaurando).sucesso,true);assert.equal((await coleta).sucesso,false);
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).totalKg,user.id),1);
      assert.equal(await page.evaluate(()=>RecyNetDB.getUsuarioLogado()),null);
    });

    await check('navegador sem Web Locks recusa gravações e apresenta erro sem perda de dados', async ({ page, go, cadastrar }) => {
      const user=await cadastrar();const antes=await page.evaluate(()=>localStorage.getItem('recynet_usuarios'));
      await go('pontuacao.html');await page.evaluate(()=>Object.defineProperty(navigator,'locks',{configurable:true,value:undefined}));
      await page.locator('#quantityInput').fill('1');await page.locator('#btnRegistrar').click();
      await page.waitForFunction(()=>document.querySelector('.recynet-toast')?.textContent.includes('gravação segura entre abas'));
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_usuarios')),antes);
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).totalKg,user.id),0);
    });

    await check('falha de confirmação preserva dados e sessão; IndexedDB indisponível recusa gravação', async ({ page, go, cadastrar, admin }) => {
      const user=await cadastrar();await admin();
      const resultado=await page.evaluate(async id=>{
        const chaves=['recynet_usuarios','recynet_sessao','recynet_admin_acesso','recynet_backup_anterior'];
        const snapshot=()=>chaves.map(k=>localStorage.getItem(k));
        const antes=snapshot(),confirmado=await RecyNetDB.persistencia.ler();
        const gravar=RecyNetDB.persistencia.gravar;
        RecyNetDB.persistencia.gravar=async()=>{throw new Error('Falha de confirmação simulada');};
        const coleta=await RecyNetDB.registrarColetaParaUsuario(id,'papel',1.001);
        const coletaPreservada=JSON.stringify(snapshot())===JSON.stringify(antes);
        const restauracao=await RecyNetDB.restaurarBackup('[]');
        const restauracaoPreservada=JSON.stringify(snapshot())===JSON.stringify(antes);
        const confirmadoPreservado=JSON.stringify(await RecyNetDB.persistencia.ler())===JSON.stringify(confirmado);
        RecyNetDB.persistencia.gravar=gravar;
        const tentativa=await RecyNetDB.registrarColetaParaUsuario(id,'papel',1.001);
        return {coleta,restauracao,coletaPreservada,restauracaoPreservada,confirmadoPreservado,tentativa};
      },user.id);
      assert.equal(resultado.coleta.sucesso,false);assert.equal(resultado.restauracao.sucesso,false);
      assert(resultado.coletaPreservada&&resultado.restauracaoPreservada&&resultado.confirmadoPreservado);
      assert.equal(resultado.tentativa.sucesso,true);
      await page.evaluate(senha=>RecyNetAuth.login('pessoa@example.test',senha),senha);
      await go('pontuacao.html');
      const antes=await page.evaluate(()=>localStorage.getItem('recynet_usuarios'));
      await page.evaluate(()=>Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:undefined}));
      await page.locator('#quantityInput').fill('1');await page.locator('#btnRegistrar').click();
      await page.waitForFunction(()=>document.querySelector('.recynet-toast')?.textContent.includes('armazenamento transacional'));
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_usuarios')),antes);
    });

    await check('resgate pela interface usa ID e preço do catálogo mesmo com argumento adulterado', async ({ page, go, cadastrar }) => {
      const user=await cadastrar();await page.evaluate(id=>RecyNetDB.registrarColeta(id,'papel',20000),user.id);
      await go('recompensas.html');await page.locator('#rewardsGrid button').first().click();
      await page.waitForFunction(()=>document.getElementById('userBalance').textContent==='50 pontos');
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).historico[0].custo,user.id),50);
      const r=await page.evaluate(id=>RecyNetDB.resgatarRecompensa(id,1,0.001),user.id);assert.equal(r.sucesso,true);
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).pontosDisponiveis,user.id),0);
      assert.equal((await page.evaluate(id=>RecyNetDB.resgatarRecompensa(id,'Garrafa Reutilizável',0.001),user.id)).sucesso,false);
    });

    await check('coleta e conflito em outra aba preservam diálogo, foco e rascunho de perfil', async ({ page, context, go, cadastrar }) => {
      const user=await cadastrar();await go('perfil.html');
      await page.getByRole('button',{name:'Editar Perfil'}).click();
      await page.locator('#editarNome').fill('Nome no rascunho');await page.locator('#editarEmail').fill('rascunho@example.test');
      const outra=await context.newPage();await outra.goto(`${base}/api-docs.html`);
      for(const file of ['assets/js/database.js','assets/js/auth.js']) await outra.addScriptTag({url:`${base}/${file}`});
      await outra.evaluate(()=>RecyNetAuth.atualizarPerfil('Nome da outra aba','outra@example.test'));
      await outra.evaluate(id=>RecyNetDB.registrarColeta(id,'papel',1000),user.id);
      await page.waitForFunction(()=>document.getElementById('userName').textContent==='Nome da outra aba');
      assert.equal(await page.locator('#editarPerfilDialog').evaluate(el=>el.open),true);
      assert.equal(await page.locator('#editarNome').inputValue(),'Nome no rascunho');
      assert.equal(await page.locator('#editarEmail').inputValue(),'rascunho@example.test');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'editarEmail');
      assert(await page.locator('#syncDraftNotice').isVisible());
      await page.getByRole('button',{name:'Continuar com meu rascunho',exact:true}).click();
      await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();
      await page.waitForFunction(()=>!document.getElementById('editarPerfilDialog').open);
      const atual=await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id),user.id);
      assert.equal(atual.nome,'Nome no rascunho');assert.equal(atual.email,'rascunho@example.test');assert.equal(atual.totalKg,1);
      // Um campo que não foi editado não deve sobrescrever uma mudança da outra aba.
      await page.getByRole('button',{name:'Editar Perfil'}).click();await page.locator('#editarNome').fill('Somente o nome editado');
      await outra.evaluate(()=>RecyNetAuth.atualizarPerfil('Nome externo','preservado@example.test'));
      await page.waitForFunction(()=>document.getElementById('userEmail').textContent==='preservado@example.test');
      await page.getByRole('button',{name:'Continuar com meu rascunho',exact:true}).click();
      await page.getByRole('button',{name:'Salvar perfil',exact:true}).click();
      await page.waitForFunction(()=>!document.getElementById('editarPerfilDialog').open);
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).email,user.id),'preservado@example.test');
      // A exclusão da conta deve encerrar o acesso mesmo com outro rascunho aberto.
      await page.getByRole('button',{name:'Editar Perfil'}).click();await page.locator('#editarNome').fill('Segundo rascunho');
      await outra.evaluate(id=>localStorage.setItem('recynet_usuarios',JSON.stringify(RecyNetDB.getUsuarios().filter(u=>u.id!==id))),user.id);
      await page.waitForURL('**/recynet.html');
    });

    await check('sincronização administrativa atualiza dados preservando usuário, peso, data e motivo em edição', async ({ page, context, go, cadastrar, admin }) => {
      const user=await cadastrar();await admin();await go('admin.html');
      await page.locator('#selectUsuario').selectOption(user.id);await page.locator('#selectMaterial').selectOption('papel');await page.locator('#inputPeso').fill('1.001');
      const data=await page.locator('#inputData').inputValue();
      const outra=await context.newPage();await outra.goto(`${base}/api-docs.html`);await outra.addScriptTag({url:`${base}/assets/js/database.js`});
      assert.equal((await outra.evaluate(id=>RecyNetDB.registrarColetaParaUsuario(id,'papel',2),user.id)).sucesso,true);
      await page.waitForFunction(()=>document.getElementById('adminRecentes').textContent.includes('2,00'));
      assert.equal(await page.locator('#selectUsuario').inputValue(),user.id);assert.equal(await page.locator('#selectMaterial').inputValue(),'papel');assert.equal(await page.locator('#inputPeso').inputValue(),'1.001');assert.equal(await page.locator('#inputData').inputValue(),data);
      await go('utilidades-admin.html');await page.locator('#userSelectKg').selectOption(user.id);await page.locator('#materialSelectKg').selectOption('papel');await page.locator('#kgValue').fill('0.1');await page.locator('#kgReason').fill('Motivo ainda não enviado');
      await outra.evaluate(id=>RecyNetDB.ajustarPontosUsuario(id,1,'Outra aba'),user.id);
      await page.waitForFunction(()=>Boolean(document.getElementById('syncDraftNotice')));
      assert.equal(await page.locator('#userSelectKg').inputValue(),user.id);assert.equal(await page.locator('#kgReason').inputValue(),'Motivo ainda não enviado');assert.equal(await page.locator('#kgValue').inputValue(),'0.1');
    });

    await check('dados locais incompletos são preservados, explicados e impedem novas gravações sem NaN', async ({ page, go, cadastrar }) => {
      const user=await cadastrar();const raw=await page.evaluate(id=>{
        const u=RecyNetDB.getUsuarioPorId(id);u.historico=[{id:'incompleta',tipo:'coleta',data:new Date().toISOString()}];
        const raw=JSON.stringify([u]);localStorage.setItem('recynet_usuarios',raw);return raw;
      },user.id);
      await go('recuperar-dados.html');
      assert((await page.locator('#recynet-storage-error').innerText()).includes('histórico 1'));
      assert.equal(await page.evaluate(id=>RecyNetDB.getEstatisticasUsuario(id),user.id),null);
      assert.equal((await page.evaluate(id=>RecyNetDB.registrarColeta(id,'papel',1000),user.id)).sucesso,false);
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_usuarios')),raw);
      assert(!(await page.locator('body').innerText()).includes('NaN'));
    });

    await check('diagnóstico encerra Worker sem resposta no prazo, libera recursos e permite nova execução', async ({ page, go }) => {
      await go('teste-debug-completo.html');await page.clock.install();
      await page.route('**/tests/isolated-checks.js',route=>route.fulfill({contentType:'application/javascript',body:'setInterval(()=>{},1000);'}));
      await page.evaluate(()=>{
        window.__criados=0;window.__terminados=0;window.__revogados=0;
        const Original=Worker;window.Worker=class extends Original{constructor(...args){super(...args);__criados++;}terminate(){__terminados++;return super.terminate();}};
        const revogar=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{__revogados++;revogar(u);};
      });
      await page.locator('#runTests').click();await page.waitForFunction(()=>__criados===1);
      assert((await page.locator('#testSummary').innerText()).includes('Executando'));
      await page.clock.fastForward(31000);
      assert((await page.locator('#testSummary').innerText()).includes('excedeu 30 segundos'));
      assert.equal(await page.locator('#runTests').isDisabled(),false);
      assert.deepEqual(await page.evaluate(()=>[__terminados,__revogados]),[1,1]);
      await page.unroute('**/tests/isolated-checks.js');await page.locator('#runTests').click();
      await page.waitForFunction(()=>document.getElementById('testSummary').textContent==='6 aprovações; 0 falhas.');
    });

    await check('diagnóstico permite cancelar, aborta download travado e recusa mensagens inválidas', async ({ page, go }) => {
      await go('teste-debug-completo.html');await page.clock.install();
      await page.evaluate(()=>{
        const fetchOriginal=fetch;window.__fetchOriginal=fetchOriginal;
        window.fetch=(url,options)=>String(url).includes('isolated-checks') ? new Promise((resolve,reject)=>{
          window.__signal=options.signal;options.signal.addEventListener('abort',()=>reject(new DOMException('Abortado','AbortError')));
        }) : fetchOriginal(url,options);
      });
      await page.locator('#runTests').click();await page.waitForFunction(()=>Boolean(window.__signal));
      await page.clock.fastForward(31000);
      assert.equal(await page.evaluate(()=>__signal.aborted),true);assert.equal(await page.locator('#runTests').isDisabled(),false);
      await page.locator('#runTests').click();await page.locator('#cancelTests').click();
      assert((await page.locator('#testSummary').innerText()).includes('cancelado'));assert.equal(await page.locator('#runTests').isDisabled(),false);
      await page.evaluate(()=>window.fetch=__fetchOriginal);
      await page.route('**/tests/isolated-checks.js',route=>route.fulfill({contentType:'application/javascript',body:'postMessage({nome:42,sucesso:"sim"});'}));
      await page.locator('#runTests').click();await page.waitForFunction(()=>document.getElementById('testSummary').textContent.includes('mensagem inválida'));
      assert.equal(await page.locator('#runTests').isDisabled(),false);assert.equal(await page.locator('#testResults li').count(),0);
    });

    await check('download de recuperação informa falhas e ausência de dados e libera URL após erro', async ({ page, go, cadastrar, admin }) => {
      await cadastrar();await admin();await go('recuperar-dados.html');await page.clock.install();
      await page.evaluate(()=>{
        window.__getOriginal=Storage.prototype.getItem;
        Storage.prototype.getItem=function(k){if(k==='recynet_backup_anterior')throw new DOMException('Bloqueado','SecurityError');return __getOriginal.call(this,k);};
      });
      await page.locator('#downloadOriginal').click();assert((await page.locator('#recoveryResult').innerText()).includes('bloqueou'));
      await page.evaluate(()=>{
        Storage.prototype.getItem=__getOriginal;window.__clickOriginal=HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click=function(){throw new Error('Download bloqueado');};
        window.__revogados=0;const revogar=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=u=>{__revogados++;revogar(u);};
      });
      await page.locator('#downloadOriginal').click();assert((await page.locator('#recoveryResult').innerText()).includes('Não foi possível'));
      await page.clock.runFor(1100);assert.equal(await page.evaluate(()=>__revogados),1);
      await page.evaluate(()=>{HTMLAnchorElement.prototype.click=__clickOriginal;localStorage.removeItem('recynet_usuarios');localStorage.removeItem('recynet_backup_anterior');});
      await page.locator('#downloadOriginal').click();assert((await page.locator('#recoveryResult').innerText()).includes('Não há cópia'));
    });

    await check('falha de imagens das notícias usa placeholder local sem repetir requisições', async ({ page, go, cadastrar }) => {
      await cadastrar();const tentativas=[];
      await page.route('https://**/*',route=>{tentativas.push(route.request().url());return route.abort();});
      await go('noticias.html');
      const imagens=page.locator('.news-image img');const total=await imagens.count();assert(total>0);
      for(let i=0;i<total;i++)await page.locator('.news-card').nth(i).scrollIntoViewIfNeeded();
      await page.waitForFunction(()=>[...document.querySelectorAll('.news-image img')].every(el=>el.hidden));
      assert.equal(await page.locator('.image-unavailable:not([hidden])').count(),total);
      assert(tentativas.length<=total);assert.equal(new Set(tentativas).size,tentativas.length);
    });

    await check('exportação administrativa libera cada Blob URL após download ou erro e remove links temporários', async ({ page, go, cadastrar, admin }) => {
      await cadastrar();await admin();await go('utilidades-admin.html');await page.clock.install();
      await page.evaluate(()=>{
        window.__urlsCriadas=[];window.__urlsRevogadas=[];
        const criar=URL.createObjectURL.bind(URL),revogar=URL.revokeObjectURL.bind(URL);
        URL.createObjectURL=blob=>{const url=criar(blob);__urlsCriadas.push(url);return url;};
        URL.revokeObjectURL=url=>{__urlsRevogadas.push(url);revogar(url);};
      });
      for(let i=0;i<2;i++) {
        const baixou=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar Backup',exact:false}).click();
        const download=await baixou,stream=await download.createReadStream(),chunks=[];
        for await(const parte of stream)chunks.push(parte);
        const backup=Buffer.concat(chunks).toString();
        assert.equal(await page.evaluate(texto=>RecyNetDB.validarBackup(texto).sucesso,backup),true);
      }
      assert.equal(await page.locator('body > a[href^="blob:"]').count(),0);
      assert.equal(await page.evaluate(()=>__urlsRevogadas.length),0);
      await page.clock.runFor(1100);
      assert.deepEqual(await page.evaluate(()=>__urlsRevogadas),await page.evaluate(()=>__urlsCriadas));
      await page.evaluate(()=>HTMLAnchorElement.prototype.click=function(){throw new Error('Falha no download');});
      await page.getByRole('button',{name:'Exportar Backup',exact:false}).click();
      assert((await page.locator('.recynet-toast.alert-error').last().innerText()).includes('Não foi possível'));
      assert.equal(await page.locator('body > a[href^="blob:"]').count(),0);
      await page.clock.runFor(1100);
      assert.equal(await page.evaluate(()=>__urlsRevogadas.length),3);
      assert.deepEqual(await page.evaluate(()=>__urlsRevogadas),await page.evaluate(()=>__urlsCriadas));
    });

    await check('coleta bloqueia cliques repetidos enquanto aguarda e libera nova tentativa após erro', async ({ page, go, cadastrar }) => {
      const user=await cadastrar();await go('pontuacao.html');
      await page.evaluate(()=>{window.__gate=new Promise(r=>window.__release=r);window.__lock=navigator.locks.request('recynet:contas:v1',()=>{window.__held=true;return __gate;});});
      await page.waitForFunction(()=>window.__held);
      await page.locator('#materialSelect').selectOption('papel');await page.locator('#quantityInput').fill('1');
      await page.evaluate(()=>{document.getElementById('btnRegistrar').click();document.getElementById('btnRegistrar').click();window.__repetido=registrarColeta();});
      await page.waitForFunction(async()=>(await navigator.locks.query()).pending.length===1);
      assert.equal(await page.locator('#btnRegistrar').isDisabled(),true);assert.equal(await page.locator('#quantityInput').isDisabled(),true);
      assert((await page.locator('#btnRegistrar').textContent()).includes('Gravando'));
      await page.evaluate(()=>window.__release());
      await page.waitForFunction(id=>RecyNetDB.getUsuarioPorId(id).totalKg===1&&!document.getElementById('btnRegistrar').disabled,user.id);
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).historico.length,user.id),1);
      const antes=await page.evaluate(()=>localStorage.getItem('recynet_usuarios'));
      await page.evaluate(()=>{window.__registrarOriginal=RecyNetDB.registrarColeta;RecyNetDB.registrarColeta=async()=>{throw new Error('Falha simulada');};});
      await page.locator('#quantityInput').fill('0.5');await page.locator('#btnRegistrar').click();
      await page.waitForFunction(()=>!document.getElementById('btnRegistrar').disabled&&Boolean(document.querySelector('.recynet-toast.alert-error')));
      assert.equal(await page.locator('#quantityInput').inputValue(),'0.5');assert.equal(await page.locator('#quantityInput').isDisabled(),false);
      assert.equal(await page.evaluate(()=>localStorage.getItem('recynet_usuarios')),antes);
      await page.evaluate(()=>RecyNetDB.registrarColeta=__registrarOriginal);await page.locator('#btnRegistrar').click();
      await page.waitForFunction(id=>RecyNetDB.getUsuarioPorId(id).totalKg===1.5&&!document.getElementById('btnRegistrar').disabled,user.id);
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).historico.length,user.id),2);
    });

    await check('coleta administrativa, ajustes e resgate processam somente um envio pendente', async ({ page, go, cadastrar, admin }) => {
      const user=await cadastrar();await admin();
      const segurar=async()=>{
        await page.evaluate(()=>{window.__held=false;window.__gate=new Promise(r=>window.__release=r);window.__lock=navigator.locks.request('recynet:contas:v1',()=>{window.__held=true;return __gate;});});
        await page.waitForFunction(()=>window.__held);
      };
      const enviarDuasVezes=async id=>{
        await page.evaluate(id=>{const form=document.getElementById(id);form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));},id);
        await page.waitForFunction(async()=>(await navigator.locks.query()).pending.length===1);
        assert.equal(await page.locator(`#${id}`).getAttribute('aria-busy'),'true');
        await page.evaluate(()=>window.__release());await page.waitForFunction(id=>!document.getElementById(id).hasAttribute('aria-busy'),id);
      };
      await go('admin.html');await page.locator('#selectUsuario').selectOption(user.id);await page.locator('#selectMaterial').selectOption('papel');await page.locator('#inputPeso').fill('1.001');
      await segurar();await enviarDuasVezes('formRegistrarColeta');
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).historico.length,user.id),1);
      await go('utilidades-admin.html');await page.locator('#userSelectKg').selectOption(user.id);await page.locator('#materialSelectKg').selectOption('papel');await page.locator('#kgValue').fill('0.1');await page.locator('#kgReason').fill('Uma correção de peso');
      await segurar();await enviarDuasVezes('formAjustarKg');
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).totalKg,user.id),1.101);
      await page.locator('#userSelectPoints').selectOption(user.id);await page.locator('#pointsValue').fill('100');await page.locator('#pointsReason').fill('Uma correção de pontos');
      await segurar();await enviarDuasVezes('formAjustarPontos');
      assert.equal(await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id).pontosDisponiveis,user.id),105.005);
      await page.evaluate(({email,senha})=>RecyNetAuth.login(email,senha),{email:user.email,senha});await go('recompensas.html');
      await segurar();await page.evaluate(()=>{window.__primeiro=resgatar(1);window.__segundo=resgatar(1);});
      await page.waitForFunction(async()=>(await navigator.locks.query()).pending.length===1);
      assert(await page.locator('#rewardsGrid button').evaluateAll(es=>es.every(e=>e.disabled)));
      await page.evaluate(()=>window.__release());await page.waitForFunction(()=>!document.getElementById('rewardsGrid').hasAttribute('aria-busy'));
      const atual=await page.evaluate(id=>RecyNetDB.getUsuarioPorId(id),user.id);
      assert.equal(atual.pontosGastos,50);assert.equal(atual.pontosDisponiveis,55.005);assert.equal(atual.historico.filter(h=>h.tipo==='resgate').length,1);
    });

    await check('cancelar ou fechar o perfil elimina aviso antigo e marcação do rascunho', async ({ page, context, go, cadastrar }) => {
      await cadastrar();await go('perfil.html');
      const outra=await context.newPage();await outra.goto(`${base}/api-docs.html`);for(const f of ['assets/js/database.js','assets/js/auth.js'])await outra.addScriptTag({url:`${base}/${f}`});
      for(const [i,modo] of ['botão','Escape'].entries()) {
        await page.getByRole('button',{name:'Editar Perfil'}).click();await page.locator('#editarNome').fill('Rascunho descartado');
        await outra.evaluate(i=>RecyNetAuth.atualizarPerfil(`Nome externo ${i}`,`externo${i}@example.test`),i);
        await page.waitForFunction(()=>Boolean(document.getElementById('syncDraftNotice')));
        if(modo==='botão')await page.locator('#editarPerfilDialog').getByRole('button',{name:'Cancelar',exact:true}).click();else await page.keyboard.press('Escape');
        await page.waitForFunction(()=>!document.getElementById('editarPerfilDialog').open&&document.getElementById('editarNome').value==='');
        assert.equal(await page.locator('#syncDraftNotice').count(),0);
        await outra.evaluate(i=>RecyNetAuth.atualizarPerfil(`Nome atual ${i}`,`atual${i}@example.test`),i);
        await page.waitForFunction(i=>document.getElementById('userName').textContent===`Nome atual ${i}`,i);
        assert.equal(await page.locator('#syncDraftNotice').count(),0);
        await page.getByRole('button',{name:'Editar Perfil'}).click();
        assert.equal(await page.locator('#editarNome').inputValue(),`Nome atual ${i}`);assert.equal(await page.locator('#editarEmail').inputValue(),`atual${i}@example.test`);
        assert.equal(await page.locator('#syncDraftNotice').count(),0);await page.keyboard.press('Escape');
        await page.waitForFunction(()=>document.getElementById('editarNome').value==='');
      }
    });

    console.log(`\n${passed} aprovados; ${failed} falhas.`);
    if (failed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
