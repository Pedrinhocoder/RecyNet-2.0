# Organização do repositório

A cópia de trabalho foi preparada a partir dos arquivos atuais de `/workspace/RecyNet-2.0`, incluindo correções e arquivos que ainda não estavam enviados. O destino é o repositório existente **Pedrinhocoder/RecyNet-2.0**; não foi criado outro repositório remoto. A pasta original foi preservada, e a atualização mantém o histórico Git anterior como pai do novo commit.

## Mapa da transferência

| Antes | Agora |
| --- | --- |
| HTML na raiz | Mantido na raiz para conservar os endereços do GitHub Pages |
| CSS na raiz | `assets/css/*.css` |
| JavaScript na raiz | `assets/js/*.js` |
| Imagens PNG na raiz | `assets/images/*.png` |
| `assets/logos/` e `assets/vendor/` | Mantidos junto dos recursos |
| `api-spec.yaml` e `.json` | Mantidos na raiz para conservar a documentação publicada |
| `scripts/`, `tests/`, `docs/` | Pastas próprias, mantidas e adaptadas |
| README anterior | Preservado em `docs/README-ANTES-ORGANIZACAO.md`; README principal reorganizado |

Os 90 arquivos da cópia de origem estão relacionados em `TRANSFERENCIA-ARQUIVOS.json`. Arquivos adaptados possuem checksum novo, mas permanecem associados ao caminho original. Imagens e biblioteca distribuída foram preservadas integralmente. Referências HTML, carregamento do Worker, geração da API e testes foram ajustados para os novos caminhos.

## Site e execução local

O GitHub Pages já está ativo no repositório. As páginas continuam em `/index.html`, `/cooperado.html`, `/perfil.html` e nos demais caminhos originais. Os recursos passaram a usar `assets/css/` e `assets/js/`. `.nojekyll` mantém a publicação estática, sem necessidade de construir a aplicação.

O servidor Node local usa uma lista de rotas públicas: páginas HTML, `assets/`, especificação da API, `docs/` e exatamente `tests/isolated-checks.js`. Os demais testes, dependências e configuração não são publicados pelo servidor Node. Essa restrição do servidor local não é uma regra de acesso do GitHub Pages; o repositório e os arquivos da hospedagem estática são públicos.

Continue usando `npm start` ou os atalhos Windows. A organização não altera configurações de domínio, identidade ou credenciais do GitHub.

## Git e automação

- Branch do repositório: `main`; histórico existente preservado.
- Dependências reprodutíveis no `package-lock.json`; `node_modules/` fora do Git.
- `.gitignore` exclui temporários, relatórios de execução e variáveis privadas.
- `.gitattributes` define texto em LF e atalhos Windows em CRLF.
- `.editorconfig` fornece padrões de edição.
- `.github/workflows/ci.yml` define testes de modelo, estrutura, servidor, Chromium, acessibilidade e auditoria de dependências.
- O modelo de pull request pede comportamento resultante e validação.

A definição de um workflow não comprova sua execução no GitHub. As verificações locais são registradas separadamente das execuções remotas de Actions.

## Regras preservadas

A organização não migra contas para backend, não altera preços, níveis ou regras de coleta e não substitui o armazenamento do navegador. Mantendo a origem do site, os dados locais continuam pertencendo à mesma origem; ao trocar domínio ou porta, exporte antes um backup.

Descrições históricas como `database.js:317` referem-se à organização anterior. O arquivo correspondente agora está em `assets/js/database.js`; números de linha podem mudar com a evolução.
