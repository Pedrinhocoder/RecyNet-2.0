const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const senha = 'Teste@RecyNet123';
const payload = `<img src="/regression-missing.png" onerror="window.__regressionXSS=true">D'Ávila`;
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

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
    async function check(name, fn) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const errors = [];
      const dialogs = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
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
      } finally { await context.close(); }
    }

    await check('nome persistido é texto no resumo, ranking, pódio e telas administrativas', async ({ page, go, cadastrar, admin }) => {
      const user = await cadastrar(payload);
      assert.equal(await page.evaluate(id => RecyNetDB.registrarColeta(id, 'plastico', 1000).sucesso, user.id), true);
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
      const result = await page.evaluate(({ id, payload }) => {
        RecyNetDB.registrarColeta(id, 'plastico', 2500);
        return RecyNetDB.resgatarRecompensa(id, payload, 1);
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
      await page.locator('#userListDelete button').click();
      assert.equal(dialogs.length, 1);
      assert(dialogs[0].includes("D'Ávila"));
      assert.equal(await page.evaluate(id => Boolean(RecyNetDB.getUsuarioPorId(id)), user.id), false);
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
        const result = await page.evaluate(({ user, action }) => {
          RecyNetDB.setUsuarioLogado(user);
          const antes = localStorage.getItem('recynet_usuarios');
          window[action](user.id, user.nome);
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
      const antes = await page.evaluate(id => {
        RecyNetDB.registrarColeta(id, 'metal', 1000);
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
    console.log(`\n${passed} aprovados; ${failed} falhas.`);
    if (failed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
