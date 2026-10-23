const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const publicRoot = root;
const docsRoot = path.join(root, 'docs');
const workerChecks = path.join(root, 'tests/isolated-checks.js');
const mime = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.yaml':'text/yaml; charset=utf-8', '.md':'text/plain; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml'
};
function createServer() {
  return http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    if (!['GET','HEAD'].includes(req.method) || pathname.includes('\0') || pathname.split('/').some(p => p.startsWith('.'))) {
      res.writeHead(403).end(); return;
    }
    const publico = pathname === '/' || /^\/[^/]+\.html$/.test(pathname) ||
      pathname.startsWith('/assets/') || pathname.startsWith('/docs/') ||
      ['/api-spec.yaml','/api-spec.json','/tests/isolated-checks.js'].includes(pathname);
    if (!publico) { res.writeHead(404).end(); return; }
    let base = publicRoot;
    let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    let file;
    if (pathname === '/tests/isolated-checks.js') {
      // Único script de testes publicado: executado em memória pelo Worker.
      file = workerChecks;
    } else {
      if (pathname.startsWith('/docs/')) { base = docsRoot; relative = pathname.slice('/docs/'.length); }
      file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    }
    const type = mime[path.extname(file)];
    if (!type) { res.writeHead(404).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type',type);
      res.setHeader('X-Content-Type-Options','nosniff');
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}
module.exports = {createServer};
if (require.main === module) {
  const porta = Number(process.env.PORT || 8080);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('PORT deve ser uma porta entre 1 e 65535');
  createServer().listen(porta,'127.0.0.1',() => {
    console.log(`RecyNet: http://127.0.0.1:${porta}`);
    console.log(`API planejada: http://127.0.0.1:${porta}/api-docs.html`);
  });
}
