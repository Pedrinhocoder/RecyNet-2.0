# Revisão técnica de UX e CSS — 23/10/2026

Foram confirmados **20 achados: 2 de prioridade alta, 15 média e 3 baixa**. A etapa original foi uma revisão sem alterações de produção; as correções autorizadas posteriormente estão registradas abaixo.

A prioridade considera o impacto na utilização do protótipo: alta para comprometimento significativo do cadastro ou acesso à navegação; média para informação incorreta, dificuldade de interação ou perda de legibilidade; baixa para melhorias de orientação e consistência sem bloquear a tarefa.

## Atualização após as correções autorizadas

Os achados **UX-01 e UX-02 foram corrigidos**. O cadastro organiza cartão e termos verticalmente, preservando a largura dos campos. As 12 páginas com navbar usam um painel compartilhado que rola links e ações dentro da altura disponível, mantendo o botão de fechar acessível.

Foram acrescentados dois cenários de regressão: cadastro/login em 320, 390, 768 e 1280 px, incluindo cadastro pela interface e acesso aos termos; menus das 12 páginas em 390 × 500, com variantes em 667 × 320, rolagem, toque, ordem de Tab, foco visível, Escape, mudança para desktop e logout.

Validação concluída: 36 cenários no Chromium, 37 testes do modelo e 3 verificações estruturais aprovados. A auditoria automática das 21 páginas passou em 1280 e 390 px; após o ajuste final de altura, as cinco variantes de autenticação/navegação foram revalidadas nas duas larguras (10 verificações).

Os **15 achados médios (UX-03 a UX-17) também foram corrigidos**. Os 3 de baixa prioridade também foram corrigidos na etapa final abaixo. As descrições dos achados preservam a situação encontrada na revisão original.

- UX-03/04/05: grid do relatório usa classe responsiva; breakpoint das utilidades tem precedência; nomes do ranking/pódio quebram linha e o selo do usuário cabe em 320 px.
- UX-06/07: badges usam cores sólidas com contraste mínimo de 4,5:1; campos de registro administrativo usam os componentes compartilhados, com fonte de 16 px e altura mínima de 44 px.
- UX-08: âncoras medem o cabeçalho após fechar o menu, preservam margem e recebem foco no conteúdo.
- UX-09/17: mudanças de peso ou material invalidam a estimativa e seu aviso; a ação de registrar usa o botão primário e explica o mínimo de 100 g.
- UX-10/11: avisos ficam empilhados abaixo do cabeçalho, são ocultados durante o menu móvel aberto, têm fechamento manual e mantêm erros/alertas persistentes. Erros de cadastro ficam associados ao campo, com foco e ajuda de senha preservada; falhas gerais permanecem no formulário.
- UX-12/13/14: a exclusão anuncia todas as contas e sua quantidade, orienta exportar backup e permite cancelar sem alterar dados. O retorno usa a sessão atual; após excluir, há links administrativos explícitos, sem redirecionamento ou diálogo extra.
- UX-15/16: dica de sequência descreve a estatística sem prometer bônus; CSS, rolagem e gráfico temporal respeitam movimento reduzido. O gráfico de materiais já desativava animação.

Foram acrescentados oito cenários no Chromium cobrindo os 15 achados médios. A suíte agora contém 44 cenários, além de 37 testes do modelo e 3 verificações estruturais.

Validação final das médias: **44 cenários no Chromium, 37 testes do modelo e 3 verificações estruturais aprovados**. Também passaram 52 verificações automáticas de acessibilidade/layout: 42 nas páginas em desktop/celular, 6 adicionais em 320 px e 4 nos estados de erro/avisos/conclusão. Os testes de avisos incluem persistência, fechamento, pausa de leitura, menu aberto e nova tentativa de logout sem bloqueio da navegação.

## Conclusão das três pendências restantes

Os achados **UX-18, UX-19 e UX-20 foram corrigidos**. Todos os 20 achados desta revisão estão tratados.

- UX-18: filtros Semana/Mês/Ano expõem `aria-pressed`, sincronizado com a seleção visual e o gráfico. A navegação informa uma única página atual com `aria-current="page"`, incluindo perfil, início e acesso pela raiz do site.
- UX-19: as 12 páginas com navbar têm “Pular para o conteúdo” como primeiro link de teclado. O atalho aparece ao receber foco, leva o foco ao conteúdo abaixo do cabeçalho e também funciona em 320 px. As três páginas administrativas usam um elemento `main` como destino.
- UX-20: os utilitários usam a variável de transição sem repetir o easing, produzindo animações válidas de 300 ms. A preferência por movimento reduzido continua desativando-as.

Foram acrescentados quatro cenários no Chromium. A suíte agora tem 48 cenários de integração, além dos 37 testes do modelo e das 3 verificações estruturais. As descrições originais abaixo servem como histórico da revisão.

Validação final: **48 cenários no Chromium, 37 testes do modelo, 3 verificações estruturais e 42 verificações de acessibilidade/layout aprovados**, sem falhas.

## Escopo e evidências

- Leitura das 21 páginas HTML, das folhas de estilo compartilhadas e específicas e dos scripts relacionados à interface.
- Chromium com conta de cooperado e sessão administrativa isoladas. Varredura de 105 combinações: 21 páginas em 320, 390, 768, 1024 e 1280 pixels de largura.
- Auditoria axe-core WCAG 2 A/AA e 2.1 AA em 1280 e 390 pixels: 42 verificações sem violações automáticas reportadas e sem overflow global nessas duas larguras.
- Inspeção complementar de menu aberto, tela baixa de 390 × 500, âncoras, diálogo de edição, validação de cadastro, estimativa da calculadora, toasts e preferência por movimento reduzido.
- Contraste sobre gradientes revisado separadamente: o axe marcou esses casos como inconclusivos, algo que o resumo da suíte atual não apresenta. Portanto, os 42 resultados automáticos não significam conformidade integral de acessibilidade.
- Mapas e imagens externos foram isolados nos testes; disponibilidade e qualidade do conteúdo remoto não foram avaliadas. A revisão original não reexecutou toda a suíte funcional; as etapas de correção registram as regressões posteriores. Safari/iOS, Firefox e leitores de tela reais não foram validados. As conclusões de geometria e interação referem-se ao Chromium; fontes de 14 px no celular também devem ser verificadas em iOS.

Evidências locais reproduzíveis: `work/ux-review.cjs`, `work/ux-review.json`, `work/ux-states.cjs`, `work/ux-states.json`, `work/ux-extra.cjs`, `work/ux-extra.json`, `work/ux-feedback.cjs` e `work/ux-feedback.json`. Capturas em `work/ux-*.png`. Os arquivos de trabalho são temporários e ignorados pelo Git.

## Alta

### UX-01 — Cadastro comprimido pelos termos na lateral

**Fonte:** `cadastro.css:7`, `cadastro.html:59`.

O `body` da autenticação é um flex container sem direção em coluna. A seção de termos, irmã de `.auth-container`, passa a ocupar outra coluna. Em 390 px, o cartão tem aproximadamente **167 px** e os campos **111 px**; textos, placeholders e informações digitadas ficam em uma área muito estreita. O formulário ultrapassa mil pixels de altura mesmo com conteúdo curto.

**Reprodução:** abrir `cadastro.html` em 390 × 844. A captura `work/ux-cadastro-390.png` mostra os termos à direita e campos comprimidos.

**Correção recomendada:** organizar cartão e termos verticalmente em um wrapper com largura máxima; limitar o layout flex ao componente de autenticação. Validar também 320 px e o clique em “Termos de Uso”. Não esconder o problema com `overflow-x: hidden`.

### UX-02 — Menu aberto impede alcançar ações em telas baixas

**Fonte:** `components.css:495`, `components.css:512`, `components.css:551`.

Em 390 × 500, o menu de cooperado aberto mede **642 px**. O cabeçalho continua sticky e não existe uma região de rolagem limitada à altura da viewport. “Sair” fica entre **y=582 e y=614**, fora da tela. Após rolar a página 700 px, o topo da navbar continua em zero e a ação permanece fora da área visível.

**Reprodução:** abrir `cooperado.html`, reduzir para 390 × 500, abrir o menu e rolar com mouse/toque. Evidência em `work/ux-menu-390x500.png`.

**Correção recomendada:** limitar a navegação aberta com altura baseada em `100dvh`, permitir rolagem interna e manter o botão de fechar acessível. Verificar paisagem, teclado e foco em todos os links.

## Média

### UX-03 — Relatório ultrapassa a tela em 320 px

**Fonte:** `relatorio.html:138`, `relatorio.css:550`.

O grid inline do ranking mantém `minmax(300px, 1fr)` dentro de um cartão com padding. Em uma viewport de 320 px, a largura do documento chega a **346 px**. As correções de `.ranking-grid` não alcançam esse grid, que não possui a classe.

**Correção recomendada:** remover a definição inline, aplicar uma classe e usar uma coluna que possa encolher (`minmax(0, 1fr)`) no celular. Evidência: `work/ux-relatorio-320.png`.

### UX-04 — Utilidades administrativas ultrapassam a tela em 320 px

**Fonte:** `utilidades-admin.html:42`, `utilidades-admin.html:51`, `utilidades-admin.html:70`.

A largura do documento chega a **364 px**. A regra mobile de `.utils-grid` aparece antes da regra geral de mesma especificidade; a definição posterior com mínimo de 350 px prevalece. Controles e opções também podem impor largura mínima ao cartão.

**Correção recomendada:** colocar o breakpoint depois da regra base, permitir encolhimento dos itens e limitar campos e selects à coluna. Evidência: `work/ux-utils-320.png`.

### UX-05 — Ranking corta nome comum e identificação do próprio usuário

**Fonte:** `components.css:816`, `relatorio.css:197`, `relatorio.css:258`, `relatorio.css:264`.

Em 320 px, até “Pessoa Auditoria” sofre corte no pódio e o selo “Você” da classificação ultrapassa a viewport. A combinação de colunas fixas, padding e `white-space: nowrap` deixa pouco espaço para o nome. O corpo com overflow horizontal oculto mascara parte do conteúdo.

**Correção recomendada:** permitir quebra de nomes, separar o selo da linha sujeita a truncamento e reorganizar colunas no menor breakpoint. Não tratar somente o caso de nomes excepcionalmente longos.

### UX-06 — Badges da tabela de pontos têm contraste insuficiente

**Fonte:** `pontuacao.css:63`.

O texto branco dos badges usa gradientes claros. Para branco contra os extremos do gradiente dourado, as razões são aproximadamente **1,40:1 e 1,97:1**; no verde, **2,01:1 e 1,64:1**. Esses valores ficam abaixo de **4,5:1**, necessário para o texto de 16 px apresentado. O azul também tem um extremo claro com **2,21:1** e precisa de avaliação ao longo da área do texto.

**Correção recomendada:** usar texto escuro ou fundos suficientemente escuros em toda a região dos caracteres. O axe deixou os gradientes como análise manual; não os aprovou.

### UX-07 — Campos do registro administrativo são pequenos e inconsistentes

**Fonte:** `admin.html:79`, `components.css:291`.

Os inputs e selects desse formulário não recebem as classes compartilhadas de campo. Os selects e o peso medem **19 px de altura**, a data aproximadamente **21 px**, e a fonte permanece em cerca de 13,3 px. São controles difíceis de tocar e visualmente diferentes do restante do sistema.

**Correção recomendada:** aplicar os componentes de formulário, usar largura consistente e área de interação confortável, preferencialmente próxima de 44 px. A comparação com 24 px é uma evidência de tamanho; exceções e espaçamento precisam ser considerados antes de classificar formalmente WCAG 2.2.

### UX-08 — Âncoras escondem os títulos sob a navbar

**Fonte:** `utils.js:67`, `index.css:167`.

O smooth scroll usa `block: 'start'`, sem compensar o cabeçalho sticky. Ao clicar em “Atuação” em desktop, a seção fica em **y=0**, o título em **y=32** e a navbar ocupa os primeiros **96 px**, cobrindo o título. O foco permanece no link original.

**Correção recomendada:** aplicar `scroll-margin-top` adequado e definir uma estratégia de foco para navegação por âncoras sem perder a posição do usuário.

### UX-09 — Estimativa da calculadora fica desatualizada

**Fonte:** `pontuacao.html:265`, `pontuacao.html:291`.

Calcular 1 kg de eletrônico mostra **20 pontos**. Alterar o peso para 2 kg mantém a estimativa de 20 na tela; “Registrar Esta Coleta” usa os valores atuais e concede **40 pontos**. A informação que antecede a confirmação deixa de representar a ação.

**Correção recomendada:** recalcular ou invalidar a estimativa a cada alteração de peso/material. O resultado exibido deve corresponder aos dados que serão registrados.

### UX-10 — Avisos se sobrepõem e desaparecem rapidamente

**Fonte:** `utils.js:103`.

Cada toast recebe a mesma posição fixa `top:20px; right:20px`. Duas mensagens sucessivas ocupam a mesma região, sem fila nem espaçamento. Não existe botão de fechar, e o aviso é removido após aproximadamente 3,3 segundos, inclusive quando descreve um erro que exige ação.

**Correção recomendada:** usar um contêiner de avisos com empilhamento, duração adequada e fechamento manual; manter erros de formulário próximos do campo. Preservar `role=alert/status`.

### UX-11 — Validação do cadastro não identifica o campo com erro

**Fonte:** `cadastro.html:85`, `cadastro.html:94`.

Ao enviar nome “Ab” com os demais campos válidos, o erro aparece somente em toast. O input não recebe `aria-invalid`, não tem descrição associada à falha e não recebe foco. Após o aviso desaparecer, a interface não conserva a orientação para a correção.

**Correção recomendada:** apresentar mensagem persistente junto ao campo, associá-la com `aria-describedby`, marcar o estado inválido e levar o foco à primeira falha. O toast pode complementar esse retorno.

### UX-12 — “Voltar” da limpeza leva ao login com administrador autenticado

**Fonte:** `limpar-dados.html:209`.

`voltarAdmin()` consulta a chave legada `usuarioLogado`, enquanto a sessão atual usa `recynet_sessao`. Com login administrativo válido, clicar em “← Voltar” leva a `recynet.html`, sem encerrar a sessão e sem voltar ao painel.

**Correção recomendada:** usar o estado de autenticação atual e voltar a `admin.html` quando houver administrador autenticado.

### UX-13 — Escolha após limpeza usa Cancelar como uma navegação

**Fonte:** `limpar-dados.html:195`.

Após limpar, um `confirm` pergunta se o usuário deseja dashboard ou relatório. O navegador apresenta “OK” e “Cancelar”, e **Cancelar navega para o relatório**. Além da semântica inadequada de cancelar, esse relatório é protegido para cooperados e redireciona o administrador ao painel, de modo que as opções anunciadas não correspondem a destinos diferentes úteis.

**Correção recomendada:** mostrar ações com nomes explícitos em um retorno persistente e oferecer somente destinos compatíveis com o perfil.

### UX-14 — Nome da ação de limpeza minimiza seu alcance

**Fonte:** `limpar-dados.html:100`, `limpar-dados.html:139`, `limpar-dados.html:173`, `database.js:721`.

A página e o botão anunciam limpeza de “usuários fantasmas”, citando nomes antigos. A operação elimina **todos os cooperados**, inclusive contas válidas. A confirmação menciona “qualquer outro usuário cadastrado”, portanto existe aviso; ainda assim, título, botão e mensagem de sucesso mantêm a classificação enganosa.

**Correção recomendada:** nomear a ação “Excluir todos os cooperados locais”, mostrar a quantidade afetada e esclarecer o alcance antes de abrir a confirmação. Tratar o backup como parte da orientação dessa ação.

### UX-15 — Dica promete bônus de sequência inexistente

**Fonte:** `pontuacao.html:173`, `database.js:351`.

A interface promete “bônus de streak”. O cálculo persistido concede pontos pela tabela de material multiplicada pelo peso; a sequência de dias é apenas uma estatística, sem concessão de bônus.

**Correção recomendada:** ajustar a mensagem ao comportamento atual. Implementar uma nova regra de pontuação exigiria uma decisão funcional além desta revisão de UX.

### UX-16 — Preferência por movimento reduzido é ignorada

**Fonte:** `design-system.css:216`, `utils.js:67`, folhas específicas de página.

Não há tratamento de `prefers-reduced-motion`. Na varredura com preferência `reduce`, **14 páginas** ainda mantêm animações CSS declaradas; o scroll JavaScript também pede movimento suave incondicionalmente.

**Correção recomendada:** reduzir animações/transições dispensáveis e usar rolagem imediata quando a preferência estiver ativa. Este achado não implica, isoladamente, falha de WCAG AA.

### UX-17 — Ação principal de registrar coleta parece desabilitada

**Fonte:** `pontuacao.html:157`, `components.css:122`.

O botão usa `btn-success`, mas não existe regra correspondente nas folhas carregadas. No Chromium ele fica com fundo cinza nativo (`rgb(239,239,239)`), embora esteja habilitado e registre normalmente, diferindo do botão verde de calcular.

**Correção recomendada:** usar uma variante existente ou definir a variante de sucesso com hover, foco e estado desabilitado consistentes. Tornar claro o que falta para registrar quando o peso estiver vazio.

## Baixa

### UX-18 — Estado selecionado depende somente de CSS

**Fonte:** `relatorio.html:112`, `relatorio.html:579`, `utils.js:56`.

Os filtros Semana/Mês/Ano mudam apenas a classe `active`, sem informar `aria-pressed` ou semântica equivalente. A navegação também marca a página atual visualmente, sem `aria-current`.

**Correção recomendada:** expor o estado selecionado de forma programática e sincronizá-lo com a apresentação visual.

### UX-19 — Falta atalho para pular a navegação extensa

**Fonte:** cabeçalhos compartilhados das páginas internas, por exemplo `cooperado.html:15`.

Não há link “Pular para o conteúdo”. Quem usa Tab passa pela navegação repetida antes de alcançar as ações da página. No desktop, o conjunto de seis seções e quatro ações torna esse caminho frequente.

**Correção recomendada:** incluir um atalho visível ao receber foco, apontando para o conteúdo principal. Existem landmarks e títulos; a ausência desse link não foi tratada como prova isolada de descumprimento de WCAG 2.4.1.

### UX-20 — Utilitários de animação geram CSS inválido

**Fonte:** `design-system.css:89`, `design-system.css:262`.

`--transition-slow` já contém `300ms ease-in-out`. Ao ser usado em `animation: fadeInUp var(--transition-slow) ease-in-out`, produz duas funções de temporização: `fadeInUp 300ms ease-in-out ease-in-out`. O navegador rejeita o valor após substituir a variável. Um elemento com somente `.fade-in-up` retorna `animation: none`; `CSS.supports` para o valor expandido retorna falso. `.fade-in` e `.slide-in-right` repetem o padrão.

**Correção recomendada:** separar duração e easing em variáveis próprias ou remover a função duplicada. Coordenar a alteração com o tratamento de movimento reduzido.

## Ordem sugerida na revisão original

1. Corrigir cadastro e menu de telas baixas.
2. Corrigir overflow em 320 px, corte do ranking e contraste dos pontos.
3. Unificar campos administrativos, corrigir estimativa e retorno de erros.
4. Ajustar navegação, mensagens e alcance apresentado para a limpeza.
5. Completar estados acessíveis e consolidar animações.

Recomendação original: acrescentar 320 px, viewport baixa, estados abertos e alteração de campos após cálculo à suíte de UX. Esses cenários foram incluídos nas etapas de correção. Também deve registrar os resultados inconclusivos do axe, além das violações, para não apresentar gradientes não avaliados como se estivessem aprovados.
