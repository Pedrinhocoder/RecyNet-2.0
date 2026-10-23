# Contribuir com o RecyNet

Use Node.js 20 ou superior e execute `npm ci` na raiz. Inicie com `npm start`; evite servidores que exponham a pasta inteira do repositório.

## Onde alterar

- Interface e conteúdo das telas: `*.html`.
- Estilos: `assets/css/`.
- Regras, persistência e controladores: `assets/js/`.
- Imagens, logos e bibliotecas distribuídas: subpastas de `assets/`.
- Ferramentas locais: `scripts/`; testes: `tests/`; documentação: `docs/`.

As URLs das telas continuam na raiz do site. Os caminhos dos recursos são relativos à página; ao mover arquivos, confira HTML, código de carregamento do Worker, testes e documentação.

## Verificar a alteração

Execute `npm test`. Para mudanças de comportamento ou interface, execute também `npm run test:browser` e `npm run test:accessibility`, com Chromium instalado. Preserve a precisão de gramas/pontos, as permissões, a recuperação de falhas, a concorrência e a navegação por teclado.

Se editar a OpenAPI, atualize o JSON com `npm run build:api` e confira o resultado. Não edite somente a cópia JSON gerada.

## Persistência e conteúdo dinâmico

Aguarde as APIs públicas de mutação com `await`. Em uma operação composta, use `RecyNetDB.transacao(db => { ... })` com os métodos síncronos do argumento `db`; aguardar outra mutação pública dentro do callback aguardaria a própria trava.

Resgates recebem IDs do catálogo. Campos fornecidos por usuários devem continuar sendo renderizados como texto. Não substitua uma base inválida por dados vazios nem normalize saldos silenciosamente.

Não versione `node_modules/`, `work/`, arquivos `.env`, dados reais de contas ou backups pessoais. A cópia inicial inclui somente código, recursos e documentação do projeto.

## Pull requests

Descreva o problema, o comportamento resultante e a validação executada. Os históricos das revisões foram preservados para rastreabilidade; registre o estado novo em `docs/ESTADO-ATUAL.md`.
