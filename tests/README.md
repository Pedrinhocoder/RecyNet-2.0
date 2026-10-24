# Testes do RecyNet

Requer Node.js 20 ou superior. Instale as dependências com `npm ci`.

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run test:accessibility
```

Também é possível usar `CHROMIUM_PATH=/caminho/do/chromium` para um Chromium já instalado. Os testes de navegador abrem um servidor temporário em loopback e um contexto de armazenamento isolado. Navegador e servidor são fechados ao terminar.

## Cobertura atual

- `core.test.cjs`: 56 testes com os scripts reais em uma VM e armazenamento isolado, cobrindo cadastro, sessão, autorização, demonstração, coletas, resgates, ajustes, precisão, datas, ranking, funcionamento dos locais, armazenamento inválido, falhas de escrita, perfil/senha e backups.
- `structure.test.cjs`: 3 verificações de referências locais, sintaxe e sincronização YAML/JSON da OpenAPI, incluindo referências internas.
- `server.test.cjs`: inicia o servidor real a partir de outra pasta, com porta configurada; verifica documentação, loopback informado, cabeçalho e bloqueio de arquivos ocultos. Esse teste usa rede local e processo filho.
- `browser.cjs`: 66 cenários no Chromium com interface, XSS, permissões, sessões em duas abas, históricos, datas, menu móvel com rolagem, toque e teclado em telas baixas, layout em 320 px, contraste, âncoras, cadastro com erros associados, avisos empilhados, limpeza explícita e movimento reduzido, página atual acessível, filtros por teclado, atalho para conteúdo e animações válidas, perfil, senha, recuperação, clipboard, precisão, diagnóstico isolado e gráficos.
- `accessibility.cjs`: axe com tags WCAG 2 A/AA e 2.1 AA nas 21 páginas, em 1280 e 390 pixels, mais verificação de excesso de largura. O conteúdo de mapas externos é substituído no teste. O relatório temporário é salvo em `work/accessibility.json`.
- `isolated-checks.js`: seis verificações executadas pelo Worker da página de diagnóstico, com dados somente em memória.

Para conferir cálculos fora do fuso do executor, use `TZ=Asia/Tokyo node tests/core.test.cjs`. Para auditar uma página específica, use `AUDIT_PAGES=relatorio.html npm run test:accessibility`.

Chart.js é servido de `assets/vendor/`; os testes verificam tanto o carregamento local quanto sua falha simulada. A auditoria automática não garante acessibilidade completa em todos os leitores de tela ou navegadores.

Os testes de backup cobrem 23 variações de campos ausentes ou inválidos sem mutação do armazenamento, além da restauração de um backup exportado completo com coletas, resgates e ajustes. No navegador, uma leitura controlada fora de ordem verifica que o arquivo B prevalece sobre A, que limpar ou invalidar a seleção mantém a restauração bloqueada e que uma falha antiga não sobrescreve a prévia atual.

As regressões JS-01/JS-02 incluem pesos fracionados, exportação/restauração real, normalização explícita de backups legados, duas abas reais com coletas/ajustes/cadastros concorrentes, snapshots antigos, sessão alterada durante a espera, indisponibilidade de Web Locks/IndexedDB e rollback após falha de confirmação. A VM usa armazenamento e fila em memória isolados; os testes no Chromium exercitam a implementação real de Web Locks e IndexedDB. As verificações da interface aguardam a conclusão das gravações assíncronas.

As regressões JS-03 a JS-10 verificam preço/nome pelo ID do catálogo, invariantes e histórico completo na leitura/gravação/importação, versionamento de legados íntegros, motivo textual limitado, rascunhos e foco preservados em duas abas, conflito e exclusão durante edição, timeout/cancelamento/aborto e protocolo do Worker, download sem permissão e placeholder de imagem sem novas requisições. As fixtures antigas foram completadas para obedecer ao esquema; as regressões de XSS usam registros históricos não confiáveis, sem reintroduzir resgate público com nome/preço arbitrários.

A regressão JS-11 realiza dois downloads de backup e valida a revogação posterior das URLs. Também simula falha no início do terceiro download, verificando remoção do link e liberação do Blob. A revisão geral e as sondagens adicionais, separadas das regressões, estão em `docs/REVISAO-COMPLETA-2026-10-23.md`.

As regressões RV-01 a RV-03 mantêm uma trava de escrita ocupada para testar cliques e submits repetidos nas coletas, ajustes e resgates. Verificam uma única operação pendente, liberação dos controles após falha e nova tentativa. O perfil é validado após Cancelar e Escape, incluindo nova atualização recebida com o diálogo fechado e reabertura sem aviso antigo. Os inicializadores Windows foram revisados estaticamente; o servidor compartilhado foi executado de outra pasta. Não houve execução nativa de CMD/PowerShell neste ambiente.

Após a organização do repositório, os testes carregam a aplicação da raiz com recursos em `assets/`. A varredura estrutural percorre os estilos e scripts em `assets/`. O teste de servidor também confere que dependências, configuração e testes internos não são publicados; somente `tests/isolated-checks.js` é servido para o Worker.

A progressão cobre marcos exatos e 1 g abaixo, níveis acima de 100, avanços múltiplos, peso máximo, contas e backups da curva antiga, gravação transacional e persistência após recarregar.

A navegação é exercitada nas 12 páginas com menu, com e sem `.html`, na raiz e em subpasta, com query/fragmento, em desktop e celular. A regressão confere um único `aria-current="page"`, fundo verde escuro, texto branco e navegação real entre relatório, ranking, perfil e Home.
