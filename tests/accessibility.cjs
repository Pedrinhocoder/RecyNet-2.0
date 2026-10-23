const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const publicRoot = root;
const server = require('../scripts/serve.cjs').createServer();
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
    const base = `http://127.0.0.1:${server.address().port}`;
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on('dialog', d => d.accept());
    // Mapas externos não fazem parte do código do protótipo.
    await page.route('**/maps/embed**', route => route.fulfill({ body: '<html lang="pt-BR"><title>Mapa externo</title><body></body></html>', contentType:'text/html' }));
    await page.goto(`${base}/cadastro.html`);
    const usuario = await page.evaluate(async () => {
      const r = await RecyNetAuth.cadastrar('Pessoa Auditoria', 'auditoria@example.test', 'Teste@RecyNet123', 'Teste@RecyNet123');
      (await RecyNetDB.registrarColeta(r.usuario.id, 'papel', 2000));
      return RecyNetDB.getUsuarioPorId(r.usuario.id);
    });
    const admins = ['admin.html','perfil-admin.html','utilidades-admin.html','diagnostico-completo.html','limpar-dados.html'];
    for (const file of (process.env.AUDIT_PAGES ? process.env.AUDIT_PAGES.split(',') : fs.readdirSync(publicRoot).filter(f => f.endsWith('.html')))) {
      await page.evaluate(({ usuario, admin }) => RecyNetDB.setUsuarioLogado(admin ? RecyNetDB.ADMIN_ESTATICO : usuario), { usuario, admin: admins.includes(file) });
      await page.goto(`${base}/${file}`, {waitUntil:'load'});
      // Algumas páginas públicas não carregam o modelo.
      if (!(await page.evaluate(() => typeof RecyNetDB !== 'undefined'))) await page.addScriptTag({url:`${base}/assets/js/database.js`});
      await page.addStyleTag({content:'*,*::before,*::after { animation: none !important; transition: none !important; }'});
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const r = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
        const item = {file,width,overflow,violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary,html:n.html}))}))};
        results.push(item);
        console.log(`${file} ${width}: ${item.violations.map(v=>v.id).join(',') || 'OK'}${overflow ? ' OVERFLOW' : ''}`);
      }
    }
    if (results.some(r=>r.violations.length || r.overflow)) process.exitCode=1;
  } finally {
    fs.mkdirSync(path.join(root,'work'),{recursive:true});
    fs.writeFileSync(path.join(root,'work/accessibility.json'),JSON.stringify(results,null,2));
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
