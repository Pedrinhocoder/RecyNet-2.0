(async () => {
  const status = document.getElementById('apiStatus');
  const container = document.getElementById('apiOperations');
  try {
    const response = await fetch('api-spec.json');
    if (!response.ok) throw new Error('Não foi possível carregar a especificação. Abra a página pelo servidor local (npm start).');
    const spec = await response.json();
    const operacoes = [];
    for (const [path, item] of Object.entries(spec.paths)) for (const [method, operation] of Object.entries(item)) {
      if (!['get','post','put','patch','delete','options','head'].includes(method)) continue;
      operacoes.push({path,method,operation});
    }
    function render() {
      const busca = document.getElementById('apiSearch').value.trim().toLowerCase();
      const filtradas = operacoes.filter(o=>`${o.method} ${o.path} ${o.operation.summary || ''} ${(o.operation.tags || []).join(' ')}`.toLowerCase().includes(busca));
      container.replaceChildren();
      for (const {path,method,operation} of filtradas) {
        const details = document.createElement('details');details.className='api-operation';
        const summary = document.createElement('summary');summary.textContent=`${method.toUpperCase()} ${path} — ${operation.summary || ''}`;details.appendChild(summary);
        const texto=document.createElement('p');texto.textContent=operation.description || 'Sem descrição adicional.';details.appendChild(texto);
        const pre=document.createElement('pre');pre.tabIndex=0;pre.setAttribute('aria-label',`Especificação de ${method.toUpperCase()} ${path}`);pre.textContent=JSON.stringify(operation,null,2);details.appendChild(pre);container.appendChild(details);
      }
      status.textContent=`${filtradas.length} de ${operacoes.length} endpoints.`;
    }
    document.getElementById('apiSearch').addEventListener('input',render);render();
  } catch(error) {status.textContent=error.message;}
})();
