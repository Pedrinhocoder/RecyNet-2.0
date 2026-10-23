> **Documento histórico:** descreve uma etapa anterior do projeto. Para funcionalidades, correções e validação atuais, consulte [ESTADO-ATUAL.md](ESTADO-ATUAL.md).

# Mais cinco correções médias — 21/10/2026

Esta rodada acrescenta cinco correções às rodadas anteriores.

| Problema | Correção | Validação |
| --- | --- | --- |
| Dados locais ilegíveis derrubavam páginas | Leitura protegida de JSON e validação da estrutura de usuários/históricos. As operações são bloqueadas com aviso, preservando o conteúdo original. O desfazimento da demonstração também não sobrescreve uma base que se tornou ilegível. | JSON truncado/vazio, raiz inválida, registros inválidos, tentativas de cadastro/login/operações e falha durante demonstração. |
| Percentual de posição invertido | O texto “top X%” representa a parcela do ranking até a posição do usuário, arredondada para cima. O líder de 100 pessoas aparece no top 1%, e a última posição no top 100%. | Posições inicial/intermediária/final, mais de mil usuários, usuário ausente, participante único e perfil no navegador. |
| Estatísticas mensais incluíam o mês anterior | Os totais usam o primeiro dia do mês local até o instante atual. A página de pontuação compartilha esse cálculo. | Limites do mês, virada do ano, fevereiro bissexto e exclusão de registros futuros. |
| Tela desatualizada após mudanças em outra aba | Troca de identidade/perfil redireciona para o painel correspondente; alteração de dados recarrega a tela; logout, limpeza e exclusão da conta invalidam a sessão. | Duas abas reais no Chromium, troca entre duas contas e administrador, coleta, logout e exclusão. |
| Ajustes administrativos ausentes/incorretos nos históricos | Dashboard do cooperado, perfil, relatório e painel administrativo mostram tipo, valor registrado, sinal, material e motivo do ajuste. Motivos continuam renderizados como texto. | Ajustes positivos/negativos de pontos e peso nas quatro telas, incluindo motivo com HTML. |

## Resultado

- 23 testes do modelo aprovados (`node tests/core.test.cjs`).
- 20 cenários no Chromium aprovados (`CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`).
- 10 regressões novas nesta rodada: cinco do modelo e cinco do navegador.
- Os 28 blocos JavaScript passaram na verificação de sintaxe; diff verificado com suporte aos finais de linha existentes.

## Limites

A leitura protegida não inventa dados nem converte silenciosamente formatos antigos. Conteúdo já corrompido permanece no armazenamento original e requer restauração de uma cópia válida. Não foi adicionada uma interface de importação/recuperação nem um backend. A sincronização cobre abas da mesma origem, conforme o funcionamento de localStorage.
