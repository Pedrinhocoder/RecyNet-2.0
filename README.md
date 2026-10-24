# RecyNet 2.0

Protótipo local de incentivo à reciclagem, com cadastro, coletas, pontos, níveis, ranking e recompensas simuladas. O repositório [Pedrinhocoder/RecyNet-2.0](https://github.com/Pedrinhocoder/RecyNet-2.0) reúne a versão revisada do projeto, seus recursos, testes e documentação, organizados em pastas próprias.

## Testar no navegador

### [▶ Abrir o protótipo RecyNet 2.0](https://pedrinhocoder.github.io/RecyNet-2.0/)

Também está disponível no [Cloudflare Pages](https://recynet.pages.dev/), atualizado por upload manual dos arquivos.

O protótipo está publicado no GitHub Pages. Basta abrir o link acima no computador ou celular; não é necessário instalar nada.

Para testar, [crie uma conta](https://pedrinhocoder.github.io/RecyNet-2.0/cadastro.html) ou entre na [tela inicial](https://pedrinhocoder.github.io/RecyNet-2.0/). Para a demonstração administrativa, use **admin@fortes.com.br** e a senha **123456**.

Use dados fictícios. As contas e alterações ficam somente no navegador e dispositivo utilizados; não são compartilhadas entre visitantes. Pontos, coletas e recompensas são simulados.

## Executar localmente

Requer Node.js 20 ou superior; Node.js 22 é usado na automação de testes.

```sh
npm ci
npm start
```

Abra **http://127.0.0.1:8080**. A documentação da API planejada fica em **http://127.0.0.1:8080/api-docs.html**. A variável `PORT` permite mudar a porta. Os atalhos `iniciar-api-docs.bat` e `iniciar-api-docs.ps1` usam o mesmo servidor Node a partir da pasta do projeto.

Crie uma conta em `cadastro.html`. A senha exige oito caracteres ou mais, maiúscula, minúscula, número e símbolo. Para demonstrar a área administrativa, use `admin@fortes.com.br` e `123456`, credencial pública da demonstração.

## Organização

```text
*.html                      21 páginas; URLs preservadas no GitHub Pages
api-spec.yaml               fonte da API planejada
api-spec.json               versão gerada para a documentação
assets/
  css/                      estilos compartilhados e de página
  js/                       regras, armazenamento e controladores
  images/                   imagens originais do projeto
  logos/                    logos e orientação de uso
  vendor/                   Chart.js e licença
scripts/                    servidor local e geração da OpenAPI
tests/                      lógica, estrutura, servidor, navegador e acessibilidade
docs/                       estado atual, revisões e relatórios históricos
.github/                    automação de testes e modelo de pull request
```

O servidor Node local expõe somente as páginas HTML, recursos em `assets/`, especificação da API, documentos em `/docs/` e o script isolado necessário ao Worker de diagnóstico. `node_modules/`, configuração do projeto e os demais testes não são arquivos públicos. A estrutura detalhada e o mapa de migração estão em [docs/ORGANIZACAO.md](docs/ORGANIZACAO.md).

O GitHub Pages existente continua usando as páginas da raiz, com os mesmos endereços. A pasta `assets/` concentra os recursos, e `.nojekyll` conserva a publicação estática.

## Funcionalidades

- Cadastro, login, perfil e troca de senha; emails normalizados e permissões administrativas verificadas nas telas e ações.
- Coletas a partir de 100 g com precisão de gramas; pontos com até três casas decimais; níveis ilimitados com requisito adicional de `1 + 0.25 × (nível atual − 1)` kg por avanço.
- Registro administrativo com data atual ou retroativa, preservando a sessão do administrador.
- Ajustes por material e pontos, com motivo textual de até 500 caracteres; resgates pelo ID e preço do catálogo.
- Histórico, ranking e relatórios, com Chart.js distribuído localmente e resumo textual.
- Gravações coordenadas entre abas; envios repetidos bloqueados durante a operação; rascunhos de perfil preservados e conflitos tratados por campo.
- Exportação e restauração de backup, validação de dados, cópia anterior e tratamento de falhas de gravação/download.
- Demonstração que preserva contas existentes; diagnóstico em Worker isolado, com cancelamento e limite de 30 segundos.
- Navegação por teclado, responsividade, mensagens acessíveis, contraste e respeito a movimento reduzido.

Os locais, horários, mapas, notícias e recompensas são demonstrativos. Pontos e resgates não geram benefícios reais. Não existe módulo de IA nem backend implementado.

## Dados locais e recuperação

As contas são confirmadas em IndexedDB; `localStorage` mantém um espelho para as telas e a sessão. As alterações usam Web Locks e só retornam sucesso após confirmação. Use navegador atualizado, em `localhost` ou HTTPS, com IndexedDB e Web Locks disponíveis.

A primeira gravação incorpora dados locais existentes. Depois disso, editar ou apagar somente o espelho não substitui o estado confirmado: use as ações de limpeza e restauração do sistema. Uma mudança de origem ou porta cria outro armazenamento do navegador; faça um backup antes de mover o uso para outro endereço. Para remover tudo, limpe os dados completos do site no navegador.

Exporte o JSON em **Utilidades administrativas**. A página `recuperar-dados.html` valida o arquivo, apresenta uma prévia e solicita confirmação. A restauração exige sessão administrativa ou base local ilegível; preserva a base anterior em `recynet_backup_anterior` e encerra a sessão.

O esquema valida tipos, versão, peso, pontos, materiais, nível e somas do histórico. Dados inválidos são preservados e bloqueiam novas alterações. Legados íntegros sem versão recebem `versaoDados: 1` ao gravar. Resíduos numéricos antigos de kg/gramas podem ser normalizados na importação dentro da tolerância prevista e com aviso. Saldos e históricos não são inventados nem reparados por suposição.

A progressão linear usa `versaoProgressao: 3`. Contas e backups antigos íntegros são validados pela regra de origem e têm somente o nível recalculado, preservando pesos, pontos e históricos. A leitura não grava dados; a próxima transação confirma a nova versão.

A autenticação é uma simulação controlada pelo próprio navegador. A senha administrativa pública, hashes SHA-256 sem salt e backups legíveis não representam segurança de um serviço real. Use dados fictícios.

## Testes

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run test:accessibility
```

A suíte reúne **56 testes do modelo, 3 estruturais, 1 teste real do servidor, 66 cenários no Chromium e 42 auditorias de acessibilidade/layout**. Para Chromium já instalado, defina `CHROMIUM_PATH`. Os testes usam dados fictícios e contextos isolados; evidências temporárias ficam em `work/`, fora do versionamento.

O workflow [Validar projeto](.github/workflows/ci.yml) executa os testes em pushes e pull requests. A definição do workflow está incluída; sua execução remota depende da publicação e da configuração de Actions no GitHub.

Consulte [tests/README.md](tests/README.md) e [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentação e API

- [Índice da documentação](docs/README.md)
- [Estado atual e correções](docs/ESTADO-ATUAL.md)
- [Progressão linear de níveis e migração](docs/PROGRESSAO-NIVEIS.md)
- [Revisão técnica completa](docs/REVISAO-COMPLETA-2026-10-23.md)
- [Organização e migração dos arquivos](docs/ORGANIZACAO.md)
- [Guia da API planejada](docs/README-API.md)

A fonte da OpenAPI está em `api-spec.yaml`. Após alterá-la, execute `npm run build:api` para atualizar `api-spec.json`. Os testes verificam equivalência e referências. A documentação não envia alterações a um servidor de contas.

Os relatórios históricos e o README anterior foram preservados em `docs/`; podem mencionar os caminhos e contagens das etapas anteriores. As licenças dos componentes distribuídos permanecem junto aos arquivos de terceiros em `assets/vendor/`.

Autor do projeto: Pedro Cauã.
