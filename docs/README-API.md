# API planejada do RecyNet

O protótipo atual funciona no navegador com IndexedDB para o estado confirmado das contas e um espelho em `localStorage`. A OpenAPI descreve uma futura integração com um servidor.

Execute `npm start` na raiz e abra `http://127.0.0.1:8080/api-docs.html`. A página lista os endpoints com busca por método, caminho, resumo ou tag, e oferece a especificação para download. Não realiza requisições de alteração a um backend.

A fonte é `api-spec.yaml`. Depois de editá-la, execute `npm run build:api` para atualizar `api-spec.json`. `npm test` valida a sincronização, a versão da especificação e as referências internas.

Para funcionalidades, limites e validação do protótipo, consulte `ESTADO-ATUAL.md` e o README da raiz.
