const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const publicRoot = root;
function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).filter(entry=>!['.git','node_modules','work','tests','scripts','docs','.github'].includes(entry.name)).flatMap(entry => {
    const file=path.join(dir,entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function recursoLocal(file, ref) {
  const pathname = decodeURIComponent(new URL(ref, 'http://local/' + path.relative(publicRoot,file).split(path.sep).join('/')).pathname);
  if (pathname === '/tests/isolated-checks.js') return path.join(root,'tests/isolated-checks.js');
  if (pathname.startsWith('/docs/')) return path.join(root,'docs',pathname.slice(6));
  return path.join(publicRoot,pathname);
}
test('todas as referências locais de HTML e CSS apontam para arquivos existentes',()=>{
  for (const file of walk(publicRoot).filter(f=>/\.(html|css)$/.test(f))) {
    const texto=fs.readFileSync(file,'utf8');
    const refs=file.endsWith('.html') ? [...texto.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]) : [...texto.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m=>m[1]);
    for (const ref of refs) {
      if (/^(?:[a-z]+:|\/\/|#|\$\{)/i.test(ref)) continue;
      assert(fs.existsSync(recursoLocal(file,ref)),`${path.relative(root,file)}: ${ref}`);
    }
  }
});
test('scripts do protótipo e scripts inline têm sintaxe válida',()=>{
  for (const file of walk(publicRoot).filter(f=>!f.includes(`${path.sep}vendor${path.sep}`))) {
    const texto=fs.readFileSync(file,'utf8');
    if (file.endsWith('.js')) new vm.Script(texto,{filename:file});
    if (file.endsWith('.html')) for (const m of texto.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (!m[1].includes('src=')) new vm.Script(m[2],{filename:file});
    }
  }
});
test('OpenAPI YAML e JSON estão sincronizados e todas as referências internas existem',()=>{
  const spec=yaml.load(fs.readFileSync(path.join(publicRoot,'api-spec.yaml'),'utf8'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(publicRoot,'api-spec.json'),'utf8')),spec);
  assert.match(spec.openapi,/^3\./);assert(spec.info.title);assert(Object.keys(spec.paths).length);
  function validar(valor) {
    if (!valor || typeof valor !== 'object') return;
    if (valor.$ref) {
      assert(valor.$ref.startsWith('#/'),`Referência externa não verificada: ${valor.$ref}`);
      const encontrado=valor.$ref.slice(2).split('/').reduce((o,k)=>o?.[k.replace(/~1/g,'/').replace(/~0/g,'~')],spec);
      assert.notEqual(encontrado,undefined,valor.$ref);
    }
    Object.values(valor).forEach(validar);
  }
  validar(spec);
});
