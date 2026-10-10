# Regressões das cinco prioridades altas

`npm test` executa os testes do modelo com Node.js 20 ou superior, sem dependências externas. Cada caso usa armazenamento isolado e os scripts reais de cadastro, sessão, autorização e demonstração.

Para testar as páginas em Chromium:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

O teste abre um servidor temporário em loopback, cria um contexto de navegador novo por caso e fecha ambos ao terminar. Para usar um Chromium já instalado, defina `CHROMIUM_PATH=/caminho/do/chromium`. O relatório utiliza o CDN de Chart.js e precisa de acesso à internet.

Os casos cobrem nomes e históricos contendo HTML, exclusão de nomes com apóstrofo, navegação sem permissão, revalidação dos botões após mudança de sessão, cadastro com email reservado, duas coletas consecutivas como administrador e demonstração com sucesso, repetição e falha simulada.

A autorização é aplicada aos fluxos deste protótipo local. Uma versão com contas compartilhadas e dados reais ainda precisa autenticar e autorizar as operações no servidor; o armazenamento do navegador é controlado pelo próprio usuário.
