# Revisão completa do RecyNet — 23/10/2026

A pendência **JS-11 foi corrigida** e os 11 achados da revisão anterior de JavaScript estão concluídos. A revisão de UX/CSS também mantém seus 20 achados corrigidos. A nova revisão geral encontrou três pontos adicionais, RV-01 a RV-03; **os três também foram corrigidos na rodada posterior**, descrita abaixo. Não se trata de uma declaração de ausência de defeitos ou de segurança para produção.

Nesta entrega também foi atualizada a dependência de desenvolvimento `js-yaml`, de **4.1.1 para 4.3.2**, com o lockfile correspondente. O `npm audit` apontava uma dependência vulnerável, com quatro avisos de consumo excessivo de CPU/DoS no parser YAML; após a atualização, retornou **zero vulnerabilidades conhecidas**. O parser é usado nas ferramentas locais da OpenAPI, não no processamento de requisições de um backend. A especificação permaneceu válida e sincronizada.

## Correção final aplicada

Em `utilidades-admin.html`, `exportarDados` agora:

1. Cria e anexa um link temporário para solicitar o download.
2. Remove o link no `finally`, tanto em sucesso quanto em falha.
3. Agenda `URL.revokeObjectURL` após 1 segundo, permitindo que o navegador consuma o Blob antes da liberação.
4. Apresenta erro visível quando não consegue preparar ou iniciar o download.
5. Informa que o download foi solicitado, sem afirmar que o arquivo foi efetivamente salvo pelo usuário.

Uma regressão permanente realiza dois downloads reais, valida os arquivos e verifica a revogação das duas URLs. Depois simula falha no clique de download e verifica a remoção do terceiro link e a liberação da terceira URL.

## Estrutura examinada

O inventário da raiz encontrou **21 páginas HTML, 16 folhas CSS e 10 arquivos JavaScript próprios**, além dos dois scripts Node em `scripts/`, testes, especificações, documentação e recursos em `assets/`. A varredura estática e os testes percorreram todas as páginas. A leitura técnica concentrou-se nas regras, fronteiras de entrada, persistência, autorização, renderização, controladores, execução e dependências; não foi uma prova formal de cada linha do projeto.

| Parte | Responsabilidade e resultado da revisão |
| --- | --- |
| `index.html`, `cadastro.html`, `recynet.html` | Entrada, cadastro, login, validação e navegação. Cadastro preserva ajuda, associa erros aos campos e impede reenvio enquanto aguarda. |
| `cooperado.html` / `cooperado.js` | Resumo, nível, ranking e atividades; atualização entre abas sem reconstruir a página. |
| `perfil.html` | Dados, conquistas, histórico, edição e senha; conflito de edição tratado por campo dentro da transação. |
| `pontuacao.html` | Calculadora e registro com precisão de gramas; estimativa invalidada quando entradas mudam. Envios repetidos bloqueados durante a gravação, conforme a correção RV-01. |
| `ranking.html` / `ranking_system.js` | Classificação e pódio compartilham a mesma regra, preservam nomes como texto e identificam o usuário atual. |
| `relatorio.html` | Resumos, distribuição por material, períodos e gráficos. Chart.js local, resumo textual e tratamento da falha da biblioteca. |
| `recompensas.html` | Resgate pelo ID; custo e nome resolvidos pelo catálogo e debitados pelo domínio. |
| `locais.html` / `locais.js` | Busca normalizada, filtros, horário de São Paulo, rotas e compartilhamento; estabelecimentos continuam ilustrativos. |
| `noticias.html` | Links demonstrativos e placeholder local para imagens que falham, sem repetição de requisições. |
| `admin.html`, `perfil-admin.html`, `utilidades-admin.html`, `limpar-dados.html` | Guardas administrativas, coleta sem troca de identidade, ajustes, exclusão, escopo da limpeza e exportação. |
| `recuperar-dados.html` | Seleção com proteção contra leituras fora de ordem, prévia, confirmação, validação, cópia anterior e tratamento de falhas. |
| `setup-automatico.html` / `demo-setup.js` | Demonstração que conserva os dados existentes e desfaz somente sua conta se falhar. |
| `diagnostico-completo.html`, `teste-debug-completo.html`, `teste-sistemas.html` | Diagnóstico administrativo de leitura e acesso aos testes em Worker isolado, com cancelamento e prazo. |
| `database.js` | Modelo, esquema, invariantes, regras e coordenação de Web Locks/IndexedDB com espelho em localStorage. Concentra 1.275 linhas e merece separação futura. |
| `auth.js`, `utils.js`, `level-bar.js` | Identidade, perfil, senha, sincronização, navegação, mensagens, formatação e progressão. |
| CSS e assets | Tokens, componentes e páginas; referências locais válidas, sem IDs duplicados ou labels apontando para IDs ausentes no HTML estático. |
| `api-docs.html`, `api-docs.js`, `api-spec.yaml` / `.json` | API planejada, busca acessível e especificações equivalentes; nenhum backend foi implementado. |
| `scripts/serve.cjs`, `scripts/build-api.cjs`, inicializadores Windows | Servidor Node de desenvolvimento e geração da especificação. Inicializadores Windows unificados no mesmo servidor Node, conforme RV-02. |
| `tests/`, `README.md`, `docs/` | Testes reais do modelo, navegador e acessibilidade; registros históricos preservados e estado atual atualizado. |

## Melhorias já aplicadas ao projeto

Estas melhorias foram acumuladas nas rodadas anteriores e conferidas nesta revisão; não foram todas implementadas novamente nesta entrega.

| Área | Melhoria e efeito |
| --- | --- |
| Renderização segura | Nomes, recompensas históricas e motivos não são interpretados como HTML. Cobertura de XSS e nomes com apóstrofos. |
| Acesso administrativo | Telas e ações revalidam o perfil; identidade é resolvida pelo registro, em vez de confiar no perfil copiado na sessão. |
| Cadastro | Emails normalizados, duplicatas e variações do email reservado bloqueadas, com revalidação após esperas assíncronas. |
| Sessões | Coleta administrativa preserva o administrador; logout, exclusão e troca de identidade atualizam o acesso nas outras abas. |
| Concorrência | Web Locks serializa alterações e IndexedDB fornece o último estado confirmado. Snapshots antigos são recusados; falhas de confirmação recompõem o espelho e a sessão. |
| Consistência dos dados | Leitura, escrita e importação compartilham esquema e invariantes de histórico, peso, pontos, materiais e nível. Contas possuem versão de dados; legados íntegros são versionados sem inventar saldos. |
| Precisão e datas | Gramas inteiros, milésimos de ponto, datas administrativas válidas, ordenação de histórico, estatísticas mensais e sequência por dias. |
| Recompensas e ajustes | Preço pelo catálogo; ajustes com saldo/material válidos e motivo textual de até 500 caracteres. |
| Backup e recuperação | Importação validada, prévia do arquivo, proteção contra seleção fora de ordem, cópia anterior, rollback e recuperação explícita de ruído numérico legado. Exportação agora libera seus recursos temporários. |
| Perfil e rascunhos | Edição e senha funcionam; sincronização conserva formulários, diálogo, foco e filtros. Somente campos editados são reaplicados após obter a trava. |
| UX e CSS | Cadastro utilizável no celular, menu rolável em telas baixas, contraste, campos administrativos, nomes longos, layout de 320 px, âncoras abaixo do cabeçalho e movimento reduzido. |
| Acessibilidade | Labels, erros associados, foco visível, seleção com ARIA, filtros por teclado e atalho para o conteúdo principal. |
| Resiliência | Diagnóstico isolado com timeout/cancelamento, arquivos carregados com aborto, protocolo validado, erros de download visíveis e imagens com fallback textual local. |
| Execução e documentação | Comando `npm start`, OpenAPI sincronizada, Chart.js local e relatórios históricos identificados. Nesta entrega, parser YAML atualizado e revisão consolidada. |

## Validação executada nesta revisão

| Verificação | Resultado e alcance |
| --- | --- |
| Modelo | **50 testes aprovados**; repetidos também com `TZ=America/Sao_Paulo`. |
| Estrutura | **3 verificações aprovadas**: referências locais, sintaxe dos scripts e igualdade/referências da OpenAPI. Scripts Node também passaram em `node --check`. |
| Execução | **1 teste aprovado**: servidor real iniciado de outra pasta, com porta configurada; documentação e restrições conferidas. Não equivale a execução nativa dos atalhos Windows. |
| Navegador | **65 cenários aprovados no Chromium**, incluindo downloads reais, concorrência em abas, XSS, formulários, falhas de armazenamento, perfil, diagnóstico e gráficos. |
| Acessibilidade e largura | **42 auditorias aprovadas**, nas 21 páginas em 1280 e 390 px, com os critérios axe WCAG 2 A/AA e 2.1 AA selecionados. Casos de 320 px, teclado e telas baixas fazem parte dos testes de navegador. |
| HTML estático | Nenhum ID duplicado nem `label[for]` sem alvo encontrado no inventário das 21 páginas. |
| CSS | **3.003 declarações extraídas** examinadas com `CSS.supports`; três recusas foram compatibilidade esperada: suavização específica do Firefox e dois `line-clamp` com alternativa `-webkit-line-clamp`. Nenhuma variável CSS usada nas folhas da raiz estava sem declaração global no inventário. Essa varredura não substitui um parser/validador CSS completo. |
| OpenAPI | **OpenAPI 3.0.3 validada com Swagger Parser**, com 21 caminhos; JSON e YAML equivalentes após atualizar o parser. Validação estrutural não significa que os endpoints existam. |
| Dependências | `npm audit` online: **zero vulnerabilidades conhecidas** após atualizar `js-yaml`. |
| Biblioteca distribuída | O código do Chart.js local corresponde ao pacote 4.5.1 instalado quando desconsiderada a referência a sourcemap e espaços finais. |
| Servidor local | Página, JSON e JavaScript com MIME e `nosniff`; tentativa de traversal e acesso a `.git/config` recusados com 403; POST recusado. |
| Higiene do patch | `git diff --check` aprovado, considerando os finais CRLF existentes. |

As sondagens originais abaixo eram separadas dos 62 cenários daquela revisão. As reproduções de RV-01 e RV-03 foram promovidas a três novos cenários de regressão, totalizando 65. Foram usadas contas fictícias e contextos isolados. Os relatórios temporários estão em `work/`, ignorado pelo Git: `final-inventory.json`, `final-review-probes.cjs` / `.json`, `final-npm-audit.json`, `final-npm-audit-after.json`, `final-browser.log`, `final-accessibility.log` e `final-core-sao-paulo.log`.

## Pontos encontrados — correções concluídas

**Status atual: RV-01, RV-02 e RV-03 corrigidos.** As descrições, fontes e reproduções abaixo preservam o que foi encontrado na revisão original. Cada item registra também a solução posterior. Recomendações estruturais da seção seguinte permanecem como melhorias futuras, não como esses três defeitos abertos.

### RV-01 — Média — corrigido: envio repetido durante a gravação

**Fonte:** `pontuacao.html:305`, `pontuacao.html:317`; revisar também os formulários assíncronos de coleta administrativa e ajustes.

O botão de registro não é desabilitado e não existe uma indicação interna de operação pendente. As duas chamadas leem o mesmo valor antes de o primeiro registro terminar e limpar o campo. A trava conserva ambas as operações, mas não identifica que os cliques repetidos pertencem ao mesmo envio.

**Reprodução no Chromium:** manter a trava de escrita ocupada; preencher 1 kg; clicar duas vezes em registrar; liberar a trava. Resultado: **2 kg e duas atividades**. Não houve perda de dados; houve duplicação de uma entrada que o usuário pode ter reenviado por falta de resposta.

**Recomendação:** impedir reenvio na interface enquanto aguarda, mostrar estado de gravação e reabilitar em `finally`. Se houver repetição automática de operações, acrescentar identificação/idempotência da solicitação no domínio. Validar coleta, ajuste e resgate com falha e nova tentativa.

**Correção aplicada:** `RecyNetUtils.executarEnvioUnico` marca cada formulário/conjunto de controles enquanto a ação aguarda, bloqueia envios reentrantes, apresenta “Gravando…” e `aria-busy`, e recompõe o estado original em `finally`. Integrado à coleta do cooperado, coleta administrativa, ajustes de peso/pontos e resgates. A guarda é da interface; chamadas independentes ao domínio continuam representando operações distintas. Não há repetição automática de gravações.

**Validação posterior:** trava real ocupada no Chromium; cliques, submissões e chamada repetida da ação produzem somente uma gravação. Falha simulada libera os controles e mantém os campos para uma tentativa posterior. Cobertura de coleta, ajustes e resgate.

### RV-02 — Média — corrigido: inicializadores Windows divergentes

**Fonte:** `iniciar-api-docs.bat:17`, `iniciar-api-docs.ps1:64` e respectivos fluxos `http-server`.

Os atalhos usam `python -m http.server` ou `http-server`, em vez do servidor de `npm start`. Não fixam explicitamente o endereço de loopback nem o diretório do próprio projeto; o fluxo Node pode instalar ferramenta global. Isso permite servir um diretório diferente dependendo de como o arquivo foi iniciado e pode tornar o servidor acessível na rede, conforme as interfaces e o firewall. As restrições de caminho e métodos verificadas em `scripts/serve.cjs` não são automaticamente herdadas.

**Evidência:** leitura dos dois scripts. Não houve execução em Windows nesta revisão nem teste de exposição a partir de outra máquina.

**Recomendação:** fazer ambos os atalhos mudar para o diretório do script e chamar o servidor Node já incluído, sem instalações globais. Preservar a opção de abrir `api-docs.html` no navegador.

**Correção aplicada:** os dois atalhos agora usam Node e `scripts/serve.cjs`. O `.bat` usa `pushd` com a pasta do próprio arquivo e restaura o diretório; o PowerShell usa `$PSScriptRoot` e `Push-Location`/`Pop-Location` em `finally`. Ambos preservam o código de saída, respeitam a configuração `PORT` pelo servidor e não instalam ferramentas. O servidor valida a porta, permanece em `127.0.0.1` e exibe o URL da documentação.

**Validação posterior:** novo teste inicia o mesmo servidor Node a partir da pasta temporária, acessa a documentação e confere as restrições. Os atalhos foram revisados estaticamente; CMD/PowerShell não estavam disponíveis para execução nativa neste ambiente.

### RV-03 — Baixa — corrigido: aviso antigo ao reabrir o perfil

**Fonte:** `utils.js:308`, `perfil.html:418`, `perfil.html:447`.

O aviso é removido quando o perfil é salvo ou quando o usuário escolhe continuar. O fechamento/cancelamento do diálogo não encerra esse aviso. Reabrir a edição repõe nome/email atuais, mas conserva a mensagem do rascunho anterior.

**Reprodução no Chromium:** editar um nome, receber atualização em outra aba, fechar com Escape e abrir novamente. O campo exibe o nome atual **“Mudança externa”**, mas o aviso anterior continua visível. Não foi observada perda de dados nesse caso.

**Recomendação:** limpar ou reavaliar o aviso e a marcação dos campos alterados nos eventos de cancelamento/fechamento e ao iniciar uma nova edição.

**Correção aplicada:** cancelar ou fechar os diálogos de perfil/senha limpa os campos, erros e marcação de edição. O evento `reset` remove o aviso pertencente ao diálogo ou aquele que ficou sem rascunhos ativos. Iniciar uma nova edição também reinicializa o formulário antes de carregar os dados atuais.

**Validação posterior:** atualização em outra aba durante edição; fechamento por Cancelar e por Escape; nova atualização com o diálogo fechado; reabertura com valores atuais e sem aviso antigo. A preservação de rascunho enquanto a edição permanece aberta continua coberta pelas regressões anteriores.

## Melhorias estruturais recomendadas

1. **Separar domínio, persistência e catálogos.** `database.js` reúne regras, validação, coordenação de armazenamento e conteúdo ilustrativo. Dividir por responsabilidade e definir contratos com JSDoc/tipos facilitaria a análise de alterações.
2. **Extrair controladores e eventos inline.** Há 16 scripts inline, 24 atributos de evento e 26 atributos de estilo no inventário HTML. A redução gradual dessas dependências globais facilita testes e uma futura política CSP; não é necessário adotar um framework para isso.
3. **Organizar a cascata CSS.** Consolidar tokens, componentes e ajustes de página, reduzindo repetição em 5.869 linhas de CSS. Preservar os testes existentes de 320 px e movimento reduzido durante qualquer reorganização.
4. **Reduzir leituras e cópias da base inteira.** A validação e desserialização são repetidas em vários getters da mesma renderização. Medir volume de usuários/histórico e usar uma fotografia consistente por atualização, com paginação onde necessário. A sessão ainda duplica dados da conta além do ID; essa duplicação pode ser reduzida.
5. **Automatizar a execução em CI e ampliar compatibilidade.** Executar modelo, estrutura e Chromium em cada mudança; agendar acessibilidade e auditoria de dependências. Verificar Firefox/WebKit e tecnologias assistivas em uma etapa própria.
6. **Preparar uma pasta pública para eventual publicação.** O servidor local permite ler arquivos de extensões admitidas em `node_modules/`, confirmado por GET do `package.json` de uma dependência. Para hospedagem, usar uma lista/pasta de arquivos públicos e revisar cabeçalhos. O servidor atual continua sendo de desenvolvimento e vinculado a loopback pelo comando principal.
7. **Distinguir regras atuais das propostas da API.** A OpenAPI se apresenta como planejada, mas ainda descreve XP e dez níveis Bronze–Diamante, enquanto o protótipo usa um nível por 2 kg e outros títulos. Documentar essa diferença ou alinhar o contrato antes de implementar integração. Metadados como versão do pacote e do projeto também podem ser uniformizados.
8. **Definir limites de volume e privacidade.** Limitar nomes/emails e tamanho de históricos com critérios medidos, explicar exportações com hashes e manter dados fictícios. O atual limite de arquivo de importação não equivale a um limite de todas as entradas do sistema.

## Limites desta conclusão

O projeto permanece um **protótipo local sem IA e sem backend**. A credencial administrativa pública, a sessão controlada pelo navegador e SHA-256 sem salt continuam sendo limitações arquiteturais conhecidas, não resolvidas pela validação da interface ou pelo resultado do `npm audit`. Uma aplicação com contas e benefícios reais exigiria outro modelo de autenticação e autorização; essa migração não faz parte desta entrega.

Não foi executado teste de infraestrutura de produção, carga prolongada, Windows, outros motores de navegador ou avaliação completa com leitores de tela. Conteúdos de mapas e imagens externas foram substituídos ou tiveram falhas simuladas nos testes; disponibilidade e exatidão dessas fontes não foram certificadas. Os dados ilegíveis continuaram preservados e a exportação administrativa foi bloqueada nesses casos, conforme a sondagem adicional.


## Validação da conclusão de RV-01 a RV-03

50 testes do modelo, 3 verificações estruturais, 1 teste real do servidor, 65 cenários no Chromium e 42 auditorias de acessibilidade/layout aprovados. Logs desta rodada: `work/rv-model-structure-final.log`, `work/rv-browser.log`, `work/rv-accessibility.log` e `work/rv-targeted.log`. Os três achados adicionais estão concluídos, respeitando a limitação de execução nativa Windows indicada em RV-02.
