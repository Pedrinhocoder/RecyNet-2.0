# Revisão de JavaScript, integridade e segurança — 23/10/2026

Foram identificados **11 defeitos: 2 de prioridade alta, 8 média e 1 baixa**, além de limitações arquiteturais e melhorias recomendadas. Na revisão original, as reproduções utilizaram dados e contextos isolados, sem alterar código de produção. Os dois achados altos e os oito médios foram corrigidos nas rodadas posteriores descritas abaixo. O achado baixo JS-11 também foi concluído na revisão final.

O usuário confirmou que não existe IA no projeto. Não foram encontrados modelo, chatbot, inferência ou integração com LLM. Pontos, níveis, ranking e recompensas são regras determinísticas. A API OpenAPI é uma proposta futura; a aplicação atual é um protótipo local.

## Correções posteriores — prioridades altas

**JS-01 e JS-02 corrigidos.** Naquela rodada, restavam os oito achados médios e o achado baixo; a rodada seguinte concluiu os médios. As descrições e referências de linha abaixo registram o estado encontrado na revisão original.

- **JS-01:** o registrador central normaliza gramas após validar a tolerância. A restauração aceita e informa resíduos numéricos legados apenas dentro dessa tolerância e com kg correspondente, preservando o arquivo original. Frações reais de grama e pesos incompatíveis continuam recusados.
- **JS-02:** as mutações compartilham uma trava Web Locks e usam o último estado confirmado em IndexedDB. O espelho `localStorage` é atualizado dentro do mesmo protocolo; a operação só confirma sucesso após o commit. Foi necessário usar IndexedDB porque uma trava isolada não garantia a atualização imediata do cache de `localStorage` entre processos no Chromium. Falhas recompõem os dados locais e liberam a trava; versões antigas de contas/bases são recusadas. As permissões e a identidade da sessão são revalidadas após a espera. As chamadas de produção e diagnóstico foram adaptadas para aguardar as mutações.

Validação posterior: 45 testes do modelo, 3 verificações estruturais, 53 cenários no Chromium e 42 auditorias automáticas de acessibilidade/layout. Inclui concorrência em duas abas reais, recuperação de backups afetados, falhas de confirmação e recursos indisponíveis. Os testes continuam usando contextos isolados. O protótipo permanece local e requer Web Locks e IndexedDB para gravar.

## Correções posteriores — prioridades médias

**JS-03 a JS-10 corrigidos. Naquela rodada restava JS-11; a revisão final também o concluiu.**

| Achado | Correção aplicada |
| --- | --- |
| JS-03 | `resgatarRecompensa` recebe o ID e resolve nome/custo no catálogo. Preço fornecido como argumento não altera o débito; a interface usa o mesmo ID. Registros históricos consistentes continuam aceitos. |
| JS-04 | Validação de kg/gramas, pontos da coleta, nível, soma dos materiais, ganhos/gastos/saldo, somas do histórico, IDs únicos e limites. Contas têm `versaoDados: 1`; legados íntegros sem versão são aceitos e versionados na gravação, sem alterar saldos. Versões desconhecidas são recusadas. |
| JS-05 | Leitura, gravação e importação compartilham o esquema e as invariantes. Dados incompletos ou incompatíveis bloqueiam operações, com indicação da conta e do histórico quando identificável. Os bytes existentes são preservados. |
| JS-06 | Motivo precisa ser texto não vazio, com até 500 caracteres; validação anterior à alteração e limite também nos campos administrativos. |
| JS-07 | Componentes atualizam por evento, preservando formulários, diálogo, foco, seleção e filtros. Rascunhos recebem aviso com opção de continuar/reaplicar ao salvar ou recarregar após confirmar o descarte. No perfil, somente campos efetivamente editados são reaplicados dentro da transação; os demais preservam alterações concorrentes. Logout, troca de identidade e exclusão continuam encerrando o acesso. |
| JS-08 | Prazo total de 30 segundos, `AbortController` para carregamentos, cancelamento, mensagem de execução e validação das mensagens. Erros/timeout encerram o Worker, liberam o Blob e reabilitam a execução. |
| JS-09 | Download trata leitura bloqueada, ausência de dados e falha na preparação/início; apresenta mensagem e libera a URL em sucesso ou erro. |
| JS-10 | Erro da imagem remove o próprio tratador e mostra texto local. Não há requisição de fallback externa. |

Validação: **50 testes do modelo, 3 estruturais, 61 cenários no Chromium e 42 auditorias de acessibilidade/layout aprovados.** Oito cenários de navegador e cinco testes do modelo foram acrescentados. Casos antigos de resgate foram adaptados ao catálogo e fixtures incompletas foram substituídas por históricos consistentes; as verificações de rejeição permanecem explícitas.

Dados legados contraditórios não são reparados por suposição: é necessário recuperar uma cópia íntegra. Ajustes legados com material `Geral` validam o peso total e a soma dos materiais, mas a distribuição histórica por material é indeterminada; por isso somente essa conferência por material é dispensada nesses legados. Nenhum novo ajuste geral é criado. Esta rodada não altera as limitações de autenticação local nem migra para backend.

## Escopo e validação

Foram examinados autenticação, persistência, sessões, coleta, resgates, ajustes, backup/restauração, demonstração, diagnóstico em Worker, relatórios, notícias, locais, renderização HTML e servidor de desenvolvimento.

- **37 testes do modelo e 3 verificações estruturais passaram.** As verificações incluem sintaxe, referências locais e sincronização da OpenAPI.
- **48 cenários existentes no Chromium passaram.** Isso inclui regressões de XSS em nomes/históricos, permissões da interface, backup, troca de senha, sincronização entre abas e diagnóstico isolado.
- Foram executadas **9 sondagens adicionais do modelo, 6 cenários de navegador e 1 medição de armazenamento**. Elas revelaram casos ainda ausentes da suíte existente; não constituem uma suíte de correções aprovadas.
- Mapas/imagens externos foram interceptados nos testes; falhas de imagem foram deliberadamente simuladas. Não foram usados dados do navegador pessoal nem enviados dados a serviços externos.
- Não houve auditoria online de vulnerabilidades das dependências, teste de infraestrutura de produção, validação de outros motores de navegador ou análise de um backend inexistente.

Evidências temporárias, ignoradas pelo Git: `work/js-security-probes.cjs` e `.json`, `work/js-security-browser.cjs` e `.json`, `work/js-export-probe.cjs` e `.json`, `work/js-session-size.cjs` e `.json`.

## Defeitos de prioridade alta

### JS-01 — Coleta administrativa normal produz backup que o sistema não restaura

**Fonte:** `admin.html:287`, `database.js:317`, `database.js:575`, `database.js:61`.

O formulário multiplica kg por 1000. Para **1,001 kg**, o JavaScript produz `1000.9999999999999` gramas. O registrador tolera a diferença em relação ao inteiro, mas grava o valor original. A validação de backup exige `Number.isSafeInteger(gramas)` e rejeita a própria exportação.

**Reprodução confirmada:** cadastrar uma conta; entrar como administrador; registrar papel, peso `1.001`, pelo formulário; selecionar o JSON exportado na recuperação. A prévia informa dados inválidos e o botão de restaurar permanece desabilitado. Não houve erro de sintaxe nem entrada malformada do usuário.

**Impacto:** um uso permitido pode tornar o backup inteiro irrestaurável, mesmo que as telas continuem funcionando.

**Correção:** normalizar gramas para um inteiro no ponto central de registro, após validar a tolerância numérica. Usar o valor normalizado em cálculos e persistência. Acrescentar round-trip de backup para pesos como 1,001 kg e outras conversões sujeitas a ponto flutuante. Preservar os arquivos antigos e prever migração explícita dos registros afetados.

### JS-02 — Gravações concorrentes podem perder coletas e outros dados

**Fonte:** `database.js:180`, `database.js:34`, métodos de coleta e ajustes.

As operações leem o JSON completo, calculam o novo estado e substituem a chave inteira. A atomicidade de um `setItem` não torna atômica a sequência de leitura, cálculo e gravação entre contextos.

**Evidência:** em duas instâncias do código real compartilhando o mesmo armazenamento, foi intercalada uma coleta de 2 kg entre a preparação e a gravação de outra de 1 kg. Ambas as chamadas retornaram sucesso, mas restaram **1 kg e um registro**, em vez de 3 kg e dois registros.

A reprodução foi uma **intercalação determinística em VM**, representando a concorrência entre contextos; não foi um teste de estresse de duas abas reais. A ausência de transação/trava está confirmada no código e a perda foi demonstrada nesse agendamento controlado.

**Correção:** usar transações IndexedDB ou serializar todas as mutações com um mecanismo de trava entre abas compatível com os navegadores suportados. Somente adicionar um contador de versão, sem uma operação atômica ou trava, não resolve a corrida. Incluir coleta, ajuste, cadastro, exclusão e restauração no mesmo protocolo de escrita.

## Defeitos de prioridade média

### JS-03 — Resgate aceita nome e preço fornecidos pelo chamador

**Fonte:** `database.js:416`, `recompensas.html:185`.

`resgatarRecompensa` verifica se custo e nome são valores válidos, mas não os compara com o catálogo. Uma recompensa cujo preço é **50 pontos** foi resgatada por **0,001 ponto** chamando a função pública. Não foi necessário editar o saldo armazenado.

**Correção:** receber o ID da recompensa e resolver nome/custo no catálogo dentro da camada de regras. Tratar resgates administrativos especiais por operação explícita. O catálogo continua alterável pelo dono do navegador no protótipo; essa correção garante coerência da função, não cria segurança de servidor.

### JS-04 — Backup aceita contradições entre totais, histórico, gramas e nível

**Fonte:** `database.js:61`, `database.js:98`.

Os campos são verificados individualmente, sem validar suas relações. Foi aceito e restaurado um arquivo com **900 kg no total**, **800 kg em uma coleta**, **1000 gramas nessa mesma coleta** e **nível 999**. Saldos de pontos também podem contradizer gastos e ganhos.

Em outra sondagem com estado inconsistente, o resgate permitiu que `pontosGastos` ultrapassasse `MAX_VALOR`, e a exportação resultante deixou de passar na validação. Esse caso depende de estado previamente inconsistente; não foi reproduzido com um histórico íntegro gerado somente pelas operações normais.

**Correção:** definir invariantes e tolerâncias de precisão: kg/gramas, nível/peso, soma dos materiais/peso total e ganhos/gastos/disponível. Versionar o formato e prever migração dos dados legados; não corrigir saldos silenciosamente. Aplicar também os limites aos resultados de cada mutação.

### JS-05 — Leitura local aceita histórico incompleto e gera `NaN`

**Fonte:** `database.js:203`, `database.js:518`.

`lerUsuarios` aceita atividade de coleta sem `kg`, `gramas` ou `pontosGanhos`, pois somente verifica os tipos desses campos quando estão presentes. Um JSON assim foi considerado legível e gerou `NaN` em `kgEsteMes` e `pontosEsteMes`.

Não há caminho demonstrado para cadastrar esse registro pelo formulário atual: a condição se aplica a dados legados, corrompidos ou alterados no armazenamento. A importação já rejeita esse formato, mas a leitura cotidiana usa critérios diferentes.

**Correção:** compartilhar um esquema validado entre leitura, gravação e importação, com migração explícita de legados. Bloquear operações diante de dados inválidos, preservando os bytes originais e explicando o registro afetado, em vez de propagar `NaN` ou converter tudo em zero.

### JS-06 — Ajustes aceitam motivo de tipo inválido e invalidam a exportação

**Fonte:** `database.js:591`, `database.js:645`.

Ajustar pontos passando um objeto como motivo retornou sucesso e foi aceito pela leitura local. Entretanto, `validarBackup` rejeitou a exportação porque exige motivo textual.

O formulário atual fornece uma string; a falha está na fronteira pública das funções JavaScript e pode afetar integrações ou futuras chamadas internas.

**Correção:** validar tipo, conteúdo e tamanho do motivo antes de modificar o estado. Unificar o contrato de entrada com o esquema persistido e testar o round-trip após todos os tipos de ajuste.

### JS-07 — Sincronização entre abas descarta edição não salva

**Fonte:** `utils.js:298`.

Qualquer alteração em `recynet_usuarios` dispara `location.reload()`, inclusive quando há formulário ou diálogo em edição. No Chromium, uma coleta em outra aba fechou o diálogo de perfil e apagou o nome ainda não salvo, sem aviso.

**Correção:** atualizar os dados exibidos sem recarregar a página inteira, preservando rascunhos. Em caso de conflito com os campos editados, informar o usuário e oferecer recarregar ou reaplicar sua alteração. Manter o encerramento imediato de acesso quando a conta for excluída ou a sessão mudar.

### JS-08 — Diagnóstico pode ficar preso indefinidamente

**Fonte:** `diagnostico-isolado.js:11`, `diagnostico-isolado.js:19`.

O término depende de `postMessage({fim:true})`; não há timeout para downloads nem para o Worker. Substituindo o script de verificações por um Worker que inicia, mas não envia a mensagem final, o botão continuou desabilitado após **120 segundos no relógio simulado da página**. O resumo permaneceu “Pronto para iniciar”.

**Correção:** aplicar watchdog, cancelamento e `AbortController` nos carregamentos. No timeout, rejeitar a operação, terminar o Worker, liberar o Blob e reabilitar o botão. Informar execução em andamento e validar o formato das mensagens recebidas.

### JS-09 — Download da recuperação lança erro sem retorno visível

**Fonte:** `recuperar-dados.html:67`.

O manipulador de “Baixar dados anteriores” acessa `localStorage.getItem` sem tratamento de exceção. Com `SecurityError` simulado, houve erro JavaScript não tratado e `recoveryResult` permaneceu vazio.

**Correção:** capturar falhas de leitura/criação/download, apresentar retorno visível e liberar URLs temporárias em um fluxo protegido. Diferenciar falta de permissão, ausência de cópia e bloqueio do armazenamento.

### JS-10 — Fallback de imagem pode repetir requisições continuamente

**Fonte:** `noticias.html:105`.

O `onerror` define uma imagem externa de fallback sem remover o próprio tratador. Quando o fallback também falha, o mesmo código roda novamente. Foram observadas **41 tentativas em cerca de 700 ms**, com **34 repetições do mesmo URL**, antes de fechar o contexto de teste.

**Correção:** limitar o fallback a uma tentativa, remover o tratador antes de substituir `src` e preferir um recurso local ou placeholder textual/CSS que funcione sem rede.

## Defeito de prioridade baixa

### JS-11 — Exportação de backup não libera o Blob URL

**Fonte:** `utilidades-admin.html:345`.

Duas exportações criaram duas URLs temporárias e nenhuma chamada a `URL.revokeObjectURL`. Os Blobs permanecem retidos até descarregar a página; o impacto cresce com a quantidade e o tamanho dos backups.

**Correção:** liberar a URL em um momento seguro após iniciar o download, inclusive em falhas. Não revogar antes de o navegador conseguir consumir o arquivo.

## Limitações de segurança do protótipo

Estas condições já pertencem à arquitetura local documentada. Não foram contadas como novos defeitos corrigíveis apenas acrescentando verificações à interface.

1. **Não existe autenticação autoritativa fora do navegador.** A sessão contém um ID e o perfil é resolvido a partir dele. Com acesso ao JavaScript/armazenamento da mesma origem, definir o ID administrativo foi suficiente para `isAdmin()` retornar verdadeiro. Isso não demonstra acesso remoto a contas de outros dispositivos; demonstra que o navegador não é uma fronteira confiável entre usuários locais.
2. **A credencial administrativa é pública e fixa.** É apropriada para demonstrar o protótipo, mas não deve proteger dados pessoais, benefícios reais ou funções de um serviço publicado. Trocar somente essa senha no frontend não resolveria a primeira limitação.
3. **SHA-256 sem salt e backups legíveis não protegem credenciais como um serviço real exige.** Duas contas com a mesma senha tiveram hashes iguais. Os backups incluem emails, históricos e hashes. Para produção, autenticação e autorização precisam de backend, armazenamento de senhas com algoritmo adaptativo e salt, sessões protegidas e política de proteção dos backups. No protótipo, manter dados fictícios continua sendo a orientação existente.

As correções anteriores de XSS e verificação de perfil na interface continuam úteis e passaram nas regressões. Elas reduzem execução acidental de conteúdo e operações por telas erradas, mas não transformam o armazenamento local em um sistema de autorização de produção.

## Melhorias recomendadas

- **Sessão mínima:** guardar identidade e metadados estritamente necessários, sem copiar o histórico. Com 1000 atividades, a sessão ocupou **125.267 bytes**, quase o mesmo tamanho da base de **125.630 bytes** do experimento. A senha já é removida da sessão; o problema aqui é duplicação e custo de armazenamento.
- **Persistência com esquema versionado:** separar migração, validação estrutural, invariantes e gravação transacional. Retornar códigos de erro estáveis e campos envolvidos, evitando que a interface precise deduzir o campo pelo texto da mensagem.
- **Desempenho:** reduzir leituras e desserializações repetidas do JSON completo; usar uma fotografia consistente por renderização e paginação no ranking/histórico. Medir cenários com muitos usuários e atividades antes de definir limites.
- **Limites de entrada:** definir tamanhos máximos para nome, email, motivo e histórico importado, além do limite atual de arquivo. Isso melhora previsibilidade e evita consumo excessivo de quota/renderização; não substitui validação de tipos e saldos.
- **Organização do JavaScript:** separar controladores de página, domínio e persistência; reduzir scripts e manipuladores inline; documentar contratos com tipos/JSDoc e análise estática. Preservar a renderização como texto para conteúdo dinâmico. Catálogos locais hoje interpolados como HTML precisarão de nova validação se passarem a vir de usuários ou de uma API.
- **Servidor e publicação:** o servidor atual é de desenvolvimento, vinculado a loopback. Para publicação, definir uma lista de arquivos públicos e política de segurança de conteúdo, enquadramento e referência. Uma CSP estrita exige primeiro adaptar os scripts/eventos inline e o Worker Blob; não basta acrescentar um cabeçalho que bloqueie a aplicação.
- **Testes:** promover as reproduções desta revisão a regressões permanentes, incluindo concorrência entre contextos, round-trip de todos os mutadores, perda de rede, quota/permissão, Worker sem término e preservação de rascunhos. Os testes existentes passaram porque ainda não exercitam esses casos específicos.

## Ordem sugerida

JS-01 a JS-11 estão concluídos. A revisão geral posterior e seus novos achados estão em `REVISAO-COMPLETA-2026-10-23.md`. A eventual migração para backend é uma decisão separada, fora das correções locais anteriormente autorizadas.


## Conclusão da pendência baixa

JS-11 foi corrigido: exportação remove o link temporário em `finally` e revoga a URL após dar tempo ao download, inclusive se o clique falhar. Uma regressão realiza dois downloads reais e uma falha simulada. A suíte passou a 62 cenários no Chromium, mantendo 50 testes do modelo, 3 estruturais e 42 auditorias de acessibilidade. Nesta entrega também foi atualizado `js-yaml` para 4.3.2; o `npm audit` retornou zero vulnerabilidades conhecidas.

Todos os 11 achados desta revisão estão concluídos. Isso não elimina os novos pontos encontrados na revisão geral posterior: consultar `REVISAO-COMPLETA-2026-10-23.md`.
