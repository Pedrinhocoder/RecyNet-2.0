const resultadosDiagnostico = [];
const LIMITE_DIAGNOSTICO_MS = 30000;
let cancelarDiagnostico;
async function runAllTests() {
  if (cancelarDiagnostico) return;
  const botao = document.getElementById('runTests');
  const resumo = document.getElementById('testSummary');
  const lista = document.getElementById('testResults');
  botao.disabled = true; lista.textContent = ''; resultadosDiagnostico.length = 0;
  resumo.textContent = 'Executando diagnóstico…';
  const controle = new AbortController();
  let worker, url, temporizador;
  const cancelar = document.createElement('button'); cancelar.type = 'button'; cancelar.className = 'btn btn-outline'; cancelar.textContent = 'Cancelar diagnóstico'; cancelar.id = 'cancelTests';
  botao.after(cancelar);
  let interromper;
  const interrupcao = new Promise((_,reject) => { interromper = mensagem => { controle.abort(); reject(new Error(mensagem)); }; });
  cancelarDiagnostico = () => interromper('Diagnóstico cancelado. Você pode tentar novamente.');
  cancelar.addEventListener('click', cancelarDiagnostico);
  temporizador = setTimeout(() => interromper('O diagnóstico excedeu 30 segundos. Verifique o carregamento dos arquivos e tente novamente.'), LIMITE_DIAGNOSTICO_MS);
  try {
    const executar = async () => {
      const arquivos = ['assets/js/database.js','assets/js/auth.js','assets/js/utils.js','assets/js/ranking_system.js','assets/js/level-bar.js','assets/js/demo-setup.js','tests/isolated-checks.js'];
      const textos = await Promise.all(arquivos.map(async arquivo => {
        const response = await fetch(arquivo, {signal:controle.signal});
        if (!response.ok) throw new Error(`Não foi possível carregar ${arquivo}`);
        return response.text();
      }));
      if (controle.signal.aborted) return;
      const inicio = `self.window=self;self.document={addEventListener(){}};const memoria=new Map();self.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,String(v)),removeItem:k=>memoria.delete(k)};`;
      textos.splice(-1, 0, `RecyNetUtils.showToast=()=>{};RecyNetDB.persistencia={async ler(){return {existe:true,dados:localStorage.getItem('recynet_usuarios')};},async gravar(){}};`);
      url = URL.createObjectURL(new Blob([inicio, '\n', textos.join('\n;\n')], {type:'text/javascript'}));
      worker = new Worker(url);
      await new Promise((resolve,reject) => {
        worker.onmessage = event => {
          const msg = event.data;
          if (!msg || typeof msg !== 'object' || Array.isArray(msg)) return reject(new Error('O diagnóstico recebeu uma mensagem inválida.'));
          if (msg.fim === true && Object.keys(msg).length === 1) return resolve();
          if (typeof msg.nome !== 'string' || !msg.nome.trim() || msg.nome.length > 200 || typeof msg.sucesso !== 'boolean' ||
              (msg.erro !== undefined && (typeof msg.erro !== 'string' || msg.erro.length > 2000)) || resultadosDiagnostico.length >= 100) return reject(new Error('O diagnóstico recebeu uma mensagem inválida.'));
          resultadosDiagnostico.push({nome:msg.nome,sucesso:msg.sucesso,...(msg.erro === undefined ? {} : {erro:msg.erro})});
          const item = document.createElement('li'); item.textContent = `${msg.sucesso ? 'Aprovado' : 'Falhou'}: ${msg.nome}${msg.erro ? ' — '+msg.erro : ''}`; lista.appendChild(item);
        };
        worker.onerror = event => { event.preventDefault(); reject(new Error(event.message || 'Falha no Worker de diagnóstico.')); };
        worker.onmessageerror = () => reject(new Error('Não foi possível ler a resposta do diagnóstico.'));
      });
      const falhas = resultadosDiagnostico.filter(r => !r.sucesso).length;
      resumo.textContent = `${resultadosDiagnostico.length - falhas} aprovações; ${falhas} falhas.`;
    };
    await Promise.race([executar(), interrupcao]);
  } catch (erro) { resumo.textContent = erro.message; }
  finally {
    clearTimeout(temporizador); controle.abort(); worker?.terminate();
    if (url) URL.revokeObjectURL(url);
    cancelar.remove(); cancelarDiagnostico = null; botao.disabled = false;
  }
}
function exportResults() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(resultadosDiagnostico,null,2)], {type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download='recynet-diagnostico.json'; a.click(); URL.revokeObjectURL(url);
}
document.getElementById('runTests').addEventListener('click',runAllTests);
document.getElementById('exportResults').addEventListener('click',exportResults);
