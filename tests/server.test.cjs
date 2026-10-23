const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

test('servidor compartilhado inicia fora da pasta do projeto e serve a documentação em loopback', {timeout:15000}, async () => {
  const reserva=net.createServer();reserva.listen(0,'127.0.0.1');await once(reserva,'listening');
  const porta=reserva.address().port;await new Promise(resolve=>reserva.close(resolve));
  const filho=spawn(process.execPath,[path.resolve(__dirname,'../scripts/serve.cjs')],{
    cwd:os.tmpdir(),env:{...process.env,PORT:String(porta)},stdio:['ignore','pipe','pipe']
  });
  const terminou=once(filho,'exit');let saida='',erro='';filho.stderr.on('data',b=>erro+=b);
  try {
    await new Promise((resolve,reject)=>{
      filho.once('error',reject);
      filho.once('exit',code=>reject(new Error(`Servidor encerrou com ${code}: ${erro}`)));
      filho.stdout.on('data',b=>{saida+=b;if(saida.includes(`http://127.0.0.1:${porta}`))resolve();});
    });
    const resposta=await fetch(`http://127.0.0.1:${porta}/api-docs.html`);
    assert.equal(resposta.status,200);assert.match(await resposta.text(),/API planejada do RecyNet/);
    assert.equal(resposta.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await fetch(`http://127.0.0.1:${porta}/.git/config`)).status,403);
    for (const route of ['/node_modules/js-yaml/package.json','/package.json','/tests/core.test.cjs']) {
      assert.equal((await fetch(`http://127.0.0.1:${porta}${route}`)).status,404);
    }
    assert.equal((await fetch(`http://127.0.0.1:${porta}/tests/isolated-checks.js`)).status,200);
  } finally { filho.kill();await terminou; }
});
