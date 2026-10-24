# Progressão linear de níveis

A estrutura de níveis, títulos, pontos, ranking e recompensas foi preservada. O nível continua dependendo exclusivamente do peso acumulado, somando todos os materiais.

## Regra única

A função compartilhada `RecyNetDB.calcularKgNecessario(nivelAtual)` retorna o requisito ADICIONAL para o próximo nível:

```text
kgNecessarios = 1 + 0.25 * (nivelAtual - 1)
```

| Avanço | Peso adicional |
| --- | --- |
| 1 → 2 | 1 kg |
| 2 → 3 | 1,25 kg |
| 5 → 6 | 2 kg |
| 10 → 11 | 3,25 kg |
| 25 → 26 | 7 kg |
| 50 → 51 | 13,25 kg |
| 100 → 101 | 25,75 kg |
| 101 → 102 | 26 kg |

O esforço adicional aumenta sempre 250 g, sem crescimento exponencial, teto de esforço ou nível máximo. O limite de peso já existente no protótipo permanece; não foi introduzido um limite de níveis.

## Peso acumulado e indicadores

`calcularKgMinimoNivel(nivel)` soma os requisitos anteriores usando a soma de uma progressão aritmética, sem iterar por todos os níveis. Para a regra atual, o peso mínimo acumulado é `(nivel - 1) * (nivel + 6) / 8` kg.

| Nível | Peso total mínimo |
| --- | --- |
| 1 | 0 kg |
| 2 | 1 kg |
| 3 | 2,25 kg |
| 5 | 5,5 kg |
| 10 | 18 kg |
| 25 | 93 kg |
| 50 | 343 kg |
| 100 | 1.311,75 kg |
| 101 | 1.337,5 kg |

`calcularNivel(totalKg)` usa a inversa dessa soma e confirma os limiares em gramas inteiros para evitar erros da raiz quadrada. Uma coleta pode avançar vários níveis. Os registros continuam exigindo pelo menos 100 g e aceitam precisão de gramas.

`calcularProgressoNivel(totalKg)` compartilha essa lógica com as barras e o perfil, retornando nível, peso dentro da etapa, requisito adicional, peso total mínimo do próximo nível, percentual e peso restante. Exemplo: com 2 kg, a pessoa está no nível 2, tem 1 kg dos 1,25 kg exigidos nessa etapa, está em 80% e precisa de outros 250 g. Em 2,25 kg, entra no nível 3 e inicia uma etapa de 1,5 kg. O percentual textual não arredonda para 100% antes de completar a etapa.

## Pontos, ranking e recompensas

As taxas de pontos por material, o saldo, o preço dos resgates e a classificação por peso continuam usando suas regras atuais. Resgatar recompensas não reduz o nível. Ajustes administrativos no peso continuam recalculando o nível a partir do total corrigido.

## Compatibilidade

`versaoDados` permanece em 1. O marcador `versaoProgressao: 3` identifica a regra linear. Contas sem marcador ou na versão 1 são validadas primeiro pela regra original de 2 kg por nível. A versão 2, distribuída na prévia em ZIP com crescimento de 20% e teto de esforço, também é reconhecida exclusivamente para validação e migração.

Somente dados integralmente válidos são adaptados. Pesos, pontos, credenciais, materiais, IDs, conquistas armazenadas e históricos não são alterados. Apenas o nível é recalculado, podendo aumentar ou diminuir. A leitura não grava dados; a próxima transação protegida por Web Locks e confirmada no IndexedDB grava o marcador novo. Versões desconhecidas e inconsistências continuam bloqueadas.

Backups antigos válidos continuam importáveis. A prévia informa quantos números de nível serão recalculados, não modifica o arquivo original e a restauração preserva a cópia anterior. Registros históricos de níveis conquistados sob regras anteriores permanecem históricos.

## Publicação no Cloudflare

Exporte um backup e feche outras abas antes de atualizar. Envie os arquivos atualizados em um novo deployment de produção no projeto existente `recynet`, mantendo `index.html` na raiz. Abra novamente `https://recynet.pages.dev/` e recarregue. Manter a origem conserva o armazenamento; não apague contas nem limpe os dados do site. Publicar no GitHub não atualiza automaticamente um projeto do Cloudflare criado por upload direto.

## Verificação

Os testes exercitam todos os requisitos solicitados, 1 g antes/depois dos marcos dos primeiros 1.000 níveis, percentuais e reinício da barra, registros de 100 g, rejeição de 99 g, salto até o nível 101 em uma coleta, peso máximo, resgate sem alteração de nível/ranking, migração das regras anteriores e persistência no IndexedDB após recarregar. A suíte completa inclui 56 testes do modelo, 3 estruturais, 1 do servidor, 66 cenários no Chromium e 42 verificações de acessibilidade/layout.
