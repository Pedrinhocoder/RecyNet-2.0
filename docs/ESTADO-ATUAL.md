# Estado atual do protótipo — 24/10/2026

A entrega final concluiu JS-11: exportação administrativa agora remove links e libera URLs temporárias em sucesso ou falha. Os 11 achados da revisão anterior de JavaScript e os 20 achados de UX/CSS estão concluídos. Também foi atualizado `js-yaml` para 4.3.2, eliminando os alertas conhecidos da dependência na auditoria desta data.

Validação atual: **56 testes do modelo, 3 estruturais, 1 de execução do servidor, 66 cenários no Chromium e 42 auditorias de acessibilidade/layout aprovados; zero vulnerabilidades conhecidas no `npm audit`.** A OpenAPI 3.0.3 passou também em validação completa de esquema com Swagger Parser.

Os três pontos adicionais RV-01 a RV-03 também estão corrigidos: envios repetidos são bloqueados durante gravações; os atalhos Windows usam o servidor Node da pasta do projeto; cancelar/fechar a edição limpa o rascunho e o aviso antigo. Não há pendências abertas entre os achados registrados dessas revisões; as recomendações de evolução estrutural permanecem separadas. Ver inventário, evidências, melhorias e recomendações em [REVISAO-COMPLETA-2026-10-23.md](REVISAO-COMPLETA-2026-10-23.md).

O escopo permanece o protótipo local, sem migração para backend. As seções seguintes preservam o histórico das rodadas; suas contagens correspondem a cada etapa.

## Problemas tratados

| Área | Resultado |
| --- | --- |
| Renderização | Nomes, recompensas, motivos e históricos são apresentados como texto. Eventos com nomes contendo apóstrofos funcionam. |
| Permissões | Páginas e ações administrativas revalidam o perfil; coletas e resgates validam o usuário atendido. |
| Identidade | Emails são normalizados, duplicatas e email reservado são bloqueados, e o perfil vem do registro pelo ID. |
| Sessão | Coletas administrativas preservam a identidade; contas excluídas perdem a sessão; dados e trocas de conta são sincronizados entre abas. |
| Armazenamento | JSON inválido é preservado, com aviso e bloqueio de operações. Falhas de gravação retornam erro em vez de confirmar sucesso. A restauração valida backups e guarda a base anterior. |
| Perfil | Os botões de editar perfil e trocar senha funcionam; a troca de senha verifica a credencial atual. |
| Coletas e pontos | Mínimo de 100 g, precisão de gramas e milésimos de ponto, cálculos e mensagens consistentes. A repetição de coletas pequenas não perde o nível por erro de ponto flutuante. |
| Ajustes | Material obrigatório para ajustar peso; remoções que excedam o saldo são rejeitadas. Histórico exibe valor, sinal e motivo. |
| Progressão | Níveis ilimitados: cada avanço exige `1 + 0.25 × (nível atual − 1)` kg adicionais. Banco e indicadores usam a mesma fórmula. Contas anteriores válidas têm somente o nível recalculado. Consulte PROGRESSAO-NIVEIS.md. |
| Ranking | Classificação única, contas sem coleta fora do ranking, posições acima de mil usuários e percentual “top” corrigido. |
| Datas | Data administrativa é preservada e validada; histórico fica em ordem decrescente; sequência conta dias distintos; totais mensais usam o mês do calendário. |
| Relatórios | Gráfico anual funciona no dia 31; filtros têm períodos identificados e excluem dados futuros; existe resumo textual dos valores. Gráficos usam uma versão local do Chart.js e a página funciona mesmo se ela falhar. |
| Responsividade | Corrigida a largura do relatório após mudança de desktop para celular. |
| Locais | Horário do Espírito Santo, atualização do estado de funcionamento, busca com acentos, rota com cidade/estado e compartilhamento/clipboard com retorno verdadeiro. Dados identificados como ilustrativos. |
| Interface | Menu informa estado e funciona por teclado; formulários têm rótulos; mapas têm título; contraste e foco foram ajustados. Controles sem função foram implementados ou substituídos por conteúdo fiel ao protótipo. |
| Diagnóstico | Testes antigos que modificavam contas foram substituídos por um Worker isolado com seis verificações. O diagnóstico administrativo é de leitura. |
| Documentação e execução | `npm start` serve a aplicação; API planejada tem busca acessível e arquivos sincronizados; scripts antigos sem uso foram removidos; relatórios históricos foram identificados. |

## Evidência de validação

- 37 testes do modelo aprovados.
- 3 verificações aprovadas de referências locais, sintaxe de scripts e OpenAPI sincronizada com referências internas válidas.
- 34 cenários no Chromium aprovados, incluindo perfil/senha, restauração, clipboard, diagnóstico isolado e gráficos locais.
- 21 páginas em duas larguras: 42 verificações sem violações detectadas pelo axe nos critérios WCAG 2 A/AA e 2.1 AA selecionados e sem excesso de largura da página.
- A auditoria automática não substitui uma avaliação manual completa com tecnologias assistivas. Conteúdo de mapas externos foi substituído no teste; os iframes do protótipo foram verificados.

## Escopo da entrega

As alterações estão no projeto local. Não houve publicação ou migração de dados para outro serviço. Contas e recompensas continuam sendo uma simulação no navegador. A recuperação depende de um backup válido; o programa não inventa registros perdidos. A credencial administrativa continua sendo a credencial pública da demonstração.

## Correções de alta prioridade da revisão posterior

- A validação anterior à restauração exige campos completos e tipos válidos nas contas e em cada tipo de atividade. Pesos, pontos, gastos, materiais, datas e níveis são verificados antes de qualquer gravação. Um arquivo recusado preserva contas, sessão e cópia anterior. Backups exportados completos continuam restaurando os dados sem conversão silenciosa.
- A seleção de backup identifica cada leitura e ignora resultados ou erros de arquivos que já foram substituídos ou desmarcados. A prévia e a confirmação indicam o nome do arquivo validado, e a identidade da seleção é conferida antes da restauração.
- Validação desta rodada: 37 testes do modelo, 3 de estrutura e 34 cenários no Chromium aprovados. A página de restauração também passou na auditoria de acessibilidade e largura em 1280 e 390 pixels.

## Seis correções médias

- Restauração: erros ao guardar a cópia, encerrar a sessão ou gravar a base preservam os dados atuais, a cópia anterior e a sessão; falhas adicionais ao recompor o estado são informadas.
- Permissões: as oito páginas de cooperado usam uma proteção compartilhada, redirecionam administradores ao painel e interrompem a inicialização sem erros.
- Pesos: totais, históricos, ranking, barras de nível e dicas dos gráficos usam o formatador comum, com precisão de gramas.
- Semana: o painel conta coletas desde segunda-feira à meia-noite no calendário local até agora, excluindo datas futuras.
- Celular: nomes e emails longos quebram linha no painel e no perfil sem ampliar a página; validação também em 320 pixels após redimensionar.
- Logout: bloqueio do armazenamento retorna erro visível e mantém a página e a sessão; uma nova tentativa pode encerrar a conta normalmente.

Validação: 37 testes do modelo, 3 verificações de estrutura e 34 cenários de navegador. Os testes semanais também passam com `TZ=America/Sao_Paulo`.

A pendência baixa também foi corrigida: o link “Entrar” da página inicial agora abre `recynet.html`, a página de login. O destino e as referências locais foram verificados.

## Revisão de UX e CSS — prioridades altas

Uma revisão específica de UX/CSS encontrou 20 achados, detalhados em `REVISAO-UX-CSS-2026-10-23.md`. Os dois de alta prioridade foram corrigidos nesta etapa:

- Cadastro: cartão e termos ficam em coluna, com campos de aproximadamente 292 px em uma tela de 390 px. Login e cadastro também foram verificados em 320, 768 e 1280 px.
- Menu: links e ações compartilham uma área rolável limitada à viewport dinâmica. O botão de fechar permanece acessível. As 12 páginas com navbar têm testes de toque e teclado em telas baixas, incluindo paisagem nos três modelos de navegação.

Na etapa das prioridades altas, a suíte passou a ter 36 cenários e ainda restavam os 15 achados médios e os 3 baixos dessa revisão de UX/CSS.

Validação das duas correções altas de UX: 36 cenários no Chromium, 37 testes do modelo e 3 verificações estruturais aprovados. As cinco variantes de autenticação/navegação também passaram em 10 verificações automáticas de acessibilidade após o ajuste final.

## Revisão de UX e CSS — prioridades médias

As 15 prioridades médias (UX-03 a UX-17) foram corrigidas: layout e ranking em 320 px, contraste dos pontos, campos administrativos, âncoras, estimativa da calculadora, avisos, validação do cadastro, navegação e informação da exclusão de contas, dica de sequência, movimento reduzido e aparência da ação de registrar coleta.

O relatório `REVISAO-UX-CSS-2026-10-23.md` registra o comportamento corrigido e as evidências. Na etapa das médias, foram acrescentados oito cenários de regressão, totalizando 44 no Chromium, e restavam os três achados de baixa prioridade da revisão de UX/CSS.

Validação das médias de UX: 44 cenários no Chromium, 37 testes do modelo, 3 verificações estruturais e 52 verificações de acessibilidade/layout aprovados, incluindo 320 px e estados de erro e conclusão.

## Revisão de UX e CSS — conclusão

As três pendências baixas foram corrigidas: filtros e navegação comunicam a seleção com ARIA, as 12 páginas com menu oferecem atalho de teclado para o conteúdo principal e os utilitários de animação têm CSS válido, preservando movimento reduzido.

Todos os 20 achados da revisão de UX/CSS estão corrigidos. Foram acrescentados quatro cenários de regressão, totalizando 48 no Chromium. Os achados originais e as correções estão registrados em `REVISAO-UX-CSS-2026-10-23.md`.

Validação final da conclusão: 48 cenários no Chromium, 37 testes do modelo, 3 verificações estruturais e 42 verificações automáticas de acessibilidade/layout aprovados.

## Nova revisão de JavaScript e segurança

A revisão `REVISAO-JAVASCRIPT-SEGURANCA-2026-10-23.md` identificou 11 defeitos adicionais: 2 altos, 8 médios e 1 baixo. Os 20 achados anteriores de UX/CSS continuam corrigidos; os novos achados de JavaScript permanecem abertos nesta etapa de análise, sem alteração de produção.

A suíte existente passou com 48 cenários no Chromium, 37 testes do modelo e 3 verificações estruturais. As sondagens adicionais revelaram casos ainda não cobertos. Não existe módulo de IA no projeto, conforme confirmado pelo usuário. Limitações da autenticação local foram registradas separadamente de bugs do protótipo.


## Correção das prioridades altas de JavaScript — 23/10/2026

Os achados JS-01 e JS-02 foram corrigidos. Coletas guardam gramas inteiros; backups antigos afetados somente por ruído de ponto flutuante podem ser recuperados, com indicação na prévia e sem alterar o arquivo original.

As alterações de contas agora compartilham Web Locks e usam IndexedDB como estado confirmado, mantendo `localStorage` como espelho das telas. Isso evita sobrescritas entre abas inclusive quando o cache de `localStorage` está atrasado. As APIs de mutação são assíncronas; cadastro, login, perfil, senha, coleta, resgate, ajustes, exclusão, demonstração e restauração foram integrados. Permissões são verificadas após obter a trava; snapshots antigos são recusados e falhas de confirmação recompõem o estado local. O diagnóstico continua isolado em memória.

Validação: 45 testes do modelo, 3 verificações estruturais, 53 cenários no Chromium e 42 verificações automáticas de acessibilidade/layout. Foram exercitadas duas abas reais, falhas de gravação e indisponibilidade de Web Locks/IndexedDB. Permanecem os oito achados médios e um baixo da revisão de JavaScript; esta rodada não migrou a autenticação para um backend.


## Correção das prioridades médias de JavaScript — 23/10/2026

Os oito achados JS-03 a JS-10 foram corrigidos. Resgates usam IDs e preços do catálogo. Leitura, escrita e backup compartilham validação de estrutura, versão e invariantes de peso/pontos/histórico; dados inválidos permanecem preservados e bloqueiam alterações. Motivos de ajuste são textuais, não vazios e limitados a 500 caracteres. Legados íntegros sem versão são versionados na gravação, sem inventar histórico ou saldos.

A sincronização entre abas atualiza componentes sem apagar rascunhos ou fechar diálogos e informa conflitos. Identidade alterada, logout e exclusão continuam redirecionando imediatamente. O diagnóstico agora tem prazo de 30 segundos, cancelamento, aborto dos carregamentos e validação do protocolo; recursos são liberados após falhas. O download da recuperação apresenta erros visíveis e libera recursos, e notícias mostram placeholder local sem repetir requisições.

Validação desta rodada: 50 testes do modelo, 3 verificações estruturais, 61 cenários no Chromium e 42 auditorias automáticas de acessibilidade/layout. Resta somente JS-11, de prioridade baixa, da revisão de JavaScript. O escopo continua sendo o protótipo local.


## Conclusão dos três achados da revisão geral

- RV-01: guarda compartilhada de envio pendente nas coletas, ajustes e resgates, controles bloqueados e estado visível, com liberação em `finally` após sucesso ou erro.
- RV-02: inicializadores BAT/PowerShell usam Node, a pasta do próprio projeto e o mesmo servidor de `npm start`. Não há ferramentas globais nem servidores alternativos. O teste de execução verifica o servidor iniciado de outra pasta; os atalhos Windows foram revisados estaticamente, sem execução nativa neste ambiente.
- RV-03: encerrar/cancelar o diálogo ou iniciar outra edição limpa o rascunho, erros e avisos associados, sem impedir a sincronização posterior.

Validação: 50 testes do modelo, 3 estruturais, 1 teste real de execução, 65 cenários no Chromium e 42 verificações de acessibilidade/layout aprovados. As descrições originais e as correções posteriores estão em `REVISAO-COMPLETA-2026-10-23.md`.
