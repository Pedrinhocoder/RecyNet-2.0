> **Documento histórico:** descreve uma etapa anterior do projeto. Para funcionalidades, correções e validação atuais, consulte [ESTADO-ATUAL.md](ESTADO-ATUAL.md).

# Cinco correções médias — 21/10/2026

Esta rodada corrige cinco problemas adicionais aos ajustes de segurança e às correções da revisão anterior. Os arquivos já modificados foram preservados.

| Problema | Comportamento corrigido | Arquivos principais |
| --- | --- | --- |
| Data administrativa ignorada | A coleta respeita a data do formulário. Datas retroativas são permitidas; datas futuras, inexistentes ou malformadas são rejeitadas sem alterar dados. O histórico mantém ordem decrescente. | `database.js`, `admin.html` |
| Nível visual desatualizado | A página de pontuação usa o usuário atualizado e renderiza pontos e nível imediatamente após cada coleta, sem precisar recarregar. | `pontuacao.html` |
| Rankings divergentes | Ranking completo, resumo e posição individual compartilham a regra por quilos. Contas sem coleta não entram; posições superiores a mil usuários continuam disponíveis. | `database.js`, `ranking_system.js` |
| Horários no fuso do visitante | O status de funcionamento considera o dia e a hora do Espírito Santo (`America/Sao_Paulo`), incluindo o instante de fechamento. | `locais.js` |
| Menu móvel sem estado acessível | O botão informa nome, estado expandido e elementos controlados. Escape fecha e devolve foco ao botão; Enter/Espaço abrem; links e mudança de largura sincronizam o estado. A página inicial usa o mesmo componente. | `utils.js`, `index.html` |

## Decisões de comportamento

- A data de coleta é interpretada no calendário local do administrador. Para datas anteriores, armazena-se meio-dia local; para hoje, mantém-se o instante do registro. A seleção de data é reservada ao fluxo administrativo. Chamadas existentes sem data continuam usando o instante atual.
- Empates no ranking conservam a ordem dos registros, com o mesmo resultado em todos os consumidores.
- O menu usa o breakpoint de 768 px já definido nos estilos; nenhuma mudança visual de layout foi necessária.

## Validação

- 18 testes do modelo aprovados, também executados com `TZ=Asia/Tokyo`.
- 15 cenários no Chromium aprovados, incluindo as regressões das cinco prioridades altas.
- Sete novos casos automatizados cobrem esta rodada: quatro no modelo e três no navegador.
- A data do formulário foi testada em São Paulo quando o dia em UTC já era o seguinte.
- A navegação por teclado e a troca entre telas móvel/desktop foram verificadas nas páginas inicial, de cooperado e administrativa.
- Sintaxe validada em 10 scripts externos e 18 scripts inline. Diff verificado com suporte aos finais de linha CRLF existentes.

Comandos: `node tests/core.test.cjs`, `TZ=Asia/Tokyo node tests/core.test.cjs` e `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`.

A validação de acessibilidade desta rodada se limita ao menu; não representa uma auditoria completa de contraste, formulários e leitores de tela. O tratamento de armazenamento inválido e a arquitetura de autenticação no servidor permanecem fora destas cinco correções.
