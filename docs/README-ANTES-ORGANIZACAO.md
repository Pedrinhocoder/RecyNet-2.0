# RecyNet 2.0

Protótipo de incentivo à reciclagem com contas locais, coletas, pontos, níveis, ranking e recompensas simuladas. As contas ficam no IndexedDB deste navegador, com um espelho em `localStorage` para as telas; a API é uma especificação planejada.

## Executar

Requer Node.js 20 ou superior.

```sh
npm ci
npm start
```

Abra `http://127.0.0.1:8080`. Use o servidor local para carregar a documentação da API, os gráficos e os testes isolados. A porta pode ser alterada pela variável `PORT`. No Windows, `iniciar-api-docs.bat` e `iniciar-api-docs.ps1` iniciam o mesmo servidor Node, a partir da pasta do projeto, sem instalar ferramentas globais. O servidor exibe o endereço da documentação em loopback.

Crie uma conta em `cadastro.html`. A senha precisa de pelo menos oito caracteres, maiúscula, minúscula, número e símbolo. Para demonstrar o painel administrativo, use `admin@fortes.com.br` e `123456` — credencial pública de demonstração.

## Funcionalidades

- Cadastro, login, logout e sincronização entre abas que preserva rascunhos e avisa sobre alterações concorrentes.
- Edição de nome/email e troca de senha com verificação da senha atual.
- Coletas com bloqueio de envio repetido enquanto a gravação aguarda, a partir de 100 g, com precisão de gramas; pontos com até três casas decimais.
- Um nível a cada 2 kg. Ranking por peso acumulado, incluindo apenas cooperados com coleta.
- Registro administrativo com data atual ou retroativa, sem trocar a sessão do administrador.
- Ajustes de peso por material e de pontos, com motivo textual de até 500 caracteres, sem saldos negativos ou alterações silenciosas do valor solicitado.
- Resgates simulados com preço resolvido pelo ID do catálogo, histórico, estatísticas mensais e gráficos com Chart.js distribuído localmente.
- Locais ilustrativos, busca sem distinção de acentos e horários no fuso `America/Sao_Paulo`.
- Demonstração automática que preserva as contas existentes e desfaz sua conta em caso de falha.
- Diagnóstico isolado em memória, com cancelamento e limite de 30 segundos, sem modificar a conta ou a sessão do navegador.

Os pontos e resgates não geram benefícios reais. Os locais, mapas e horários são demonstrativos; confirme os dados com o estabelecimento. A seleção de notícias contém links para fontes externas.

## Backup e recuperação

Em **Utilidades administrativas**, exporte o backup JSON. A página `recuperar-dados.html` valida o arquivo e apresenta a quantidade de contas antes de solicitar a confirmação da substituição.

A restauração exige uma sessão administrativa ou uma base local ilegível. Antes de substituir os dados, conserva o conteúdo anterior na chave `recynet_backup_anterior`, disponível para download na página de recuperação. A sessão é encerrada após a restauração. Outras chaves do navegador são preservadas.

Backups antigos com resíduos de precisão na conversão de kg para gramas são normalizados somente dentro da tolerância numérica prevista e quando kg/gramas correspondem. A prévia informa a quantidade de registros corrigidos; o arquivo original não é alterado. Novas coletas já salvam gramas inteiros.

Leitura, gravação e importação usam o mesmo esquema. São conferidos kg/gramas, pontos por material, nível, saldos e somas do histórico. As contas novas incluem `versaoDados: 1`. Legados íntegros sem esse campo são aceitos e recebem a versão na próxima gravação; versões desconhecidas ou dados incompletos/contraditórios são recusados e preservados para recuperação explícita. Não são inventados registros nem corrigidos saldos silenciosamente. Ajustes legados de peso `Geral` conservam a validação do peso total e da soma dos materiais, mas não permitem reconstruir sua distribuição histórica por material.

Conteúdo já perdido não pode ser reconstruído: mantenha uma cópia válida do backup. Hashes, contas e sessão são controlados pelo próprio navegador; este protótipo foi desenvolvido para demonstrações locais.

## Persistência entre abas

Cada alteração de contas obtém uma trava Web Locks, lê o último estado confirmado em IndexedDB, atualiza o espelho local e só retorna sucesso após confirmar a gravação. Cadastro, login que atualiza a conta, perfil, senha, coletas, resgates, ajustes, exclusão e restauração usam o mesmo protocolo. Falhas de confirmação recompõem o espelho, a sessão e a cópia anterior. Leituras antigas de conta ou da base completa são recusadas ao tentar sobrescrever dados mais recentes.

Os dados existentes em `localStorage` são incorporados na primeira alteração. Depois disso, IndexedDB é a referência das contas; editar ou apagar apenas o espelho não substitui os dados confirmados. Use as ações do sistema para limpar ou restaurar as contas. Para remover também todos os dados auxiliares, limpe os dados completos deste site no navegador. Uma base local ilegível permanece protegida para recuperação explícita.

As gravações requerem Web Locks e IndexedDB disponíveis, em `localhost` ou HTTPS. Se algum recurso estiver bloqueado ou indisponível, a ação retorna erro sem confirmar alterações. Não há backend nem envio das contas a um servidor.

As APIs públicas que alteram contas são assíncronas e devem ser aguardadas com `await`, inclusive `RecyNetDB.salvarUsuario`, `gravarUsuarios`, coleta, resgate, ajustes, limpeza/restauração e `RecyNetAuth.atualizarPerfil`. Para uma operação composta, use `await RecyNetDB.transacao(db => { ... })` com os métodos síncronos do argumento `db` dentro do callback; chamar outra mutação pública ali aguardaria a própria trava. Leituras e verificação de sessão continuam síncronas. O resgate público agora usa `await RecyNetDB.resgatarRecompensa(usuarioId, recompensaId)`: nome e custo vêm do catálogo, e os argumentos antigos de nome/preço não definem o débito. Resgates históricos continuam legíveis quando o backup é consistente.

Alterações recebidas de outra aba atualizam os componentes sem recarregar formulários ou fechar diálogos. Um aviso preserva o rascunho e permite continuar com ele ou confirmar seu descarte para recarregar; ao salvar o perfil, somente os campos editados são reaplicados ao estado atual, depois de obter a trava. Cancelar ou fechar a edição encerra o rascunho e remove o aviso antigo. `RecyNetAuth.atualizarPerfil` aceita opções `alterarNome`/`alterarEmail` para essa atualização parcial; sem opções, atualiza os dois campos. Exclusão da conta, logout e mudança de identidade continuam encerrando/redirecionando o acesso.

## Testes

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run test:accessibility
```

Para usar um Chromium instalado no sistema, defina `CHROMIUM_PATH=/caminho/do/chromium` nos comandos de navegador. Os testes não utilizam as contas do navegador pessoal.

- 50 testes do modelo, 3 verificações de estrutura, sintaxe e OpenAPI, e 1 teste de execução do servidor.
- 65 cenários de integração no Chromium.
- Auditoria automática WCAG A/AA e de largura nas 21 páginas em 1280 e 390 pixels.
- Seis verificações isoladas também disponíveis em `teste-debug-completo.html`.

Consulte `tests/README.md` para detalhes.

## API e organização

`api-docs.html` apresenta e filtra a API planejada. A fonte é `api-spec.yaml`; atualize a cópia JSON com:

```sh
npm run build:api
```

Os testes conferem a sincronização entre YAML/JSON e as referências internas da OpenAPI. A interface de documentação não executa operações remotas.

Os arquivos HTML, CSS e JavaScript da interface ficam na raiz. `assets/vendor/` contém Chart.js e sua licença; `scripts/` contém o servidor local e a geração da documentação; `tests/` reúne as verificações automatizadas. O diagnóstico usa um Worker com armazenamento em memória.

A revisão consolidada, melhorias e novos pontos de atenção estão em [docs/REVISAO-COMPLETA-2026-10-23.md](docs/REVISAO-COMPLETA-2026-10-23.md). O estado atual está em `docs/ESTADO-ATUAL.md`. Relatórios antigos foram preservados com indicação de que são históricos.

Autor do projeto: Pedro Cauã.
