# 🧪 Guia de Testes - Projeto RecyNet

Este guia contém o roteiro completo para validar o protótipo do **RecyNet**. Siga os passos abaixo para garantir que todas as funcionalidades estejam operando conforme o esperado.

## 🚀 Passo 1: Início e Cadastro
1. Abra o arquivo `index.html` (Landing Page).
2. Clique no botão de **Cadastro**.
3. Crie uma nova conta de usuário (ex: `teste@usuario.com`).
4. **O que observar**: O sistema deve exibir um *toast* de sucesso e redirecionar você para a página `cooperado.html`.

## ♻️ Passo 2: Simulação de Coleta (Admin)
1. Para ver dados reais, você precisa de uma conta Admin. O sistema já vem com uma conta padrão:
   - **Email**: `admin@recynet.com`
   - **Senha**: `admin123`
2. Faça logout da sua conta de teste e entre como Admin.
3. Vá em **Dashboard** e depois em **Utilidades**.
4. No campo de **Ajustar KG**, selecione o usuário que você criou no Passo 1.
5. Adicione **2.5 kg** de material (ex: Plástico).
6. **O que observar**: O usuário deve subir para o **Nível 2** automaticamente (já que o limite é 2kg/nível).

## 📊 Passo 3: Relatório e Evolução
1. Faça logout do Admin e entre novamente com sua conta de teste.
2. Acesse a página **Relatório**.
3. Alterne os filtros do gráfico de evolução (**Semana, Mês, Ano**).
4. Verifique se o pódio e o ranking refletem o peso que você adicionou via Admin.
5. **O que observar**: O gráfico deve se ajustar dinamicamente e sua posição no ranking deve estar destacada.

## 🏆 Passo 4: Ranking Global
1. Clique no link **Ranking** na barra de navegação ou no botão **Ver Ranking Completo** no relatório.
2. Verifique se o pódio 3D exibe os nomes corretamente.
3. **O que observar**: O layout deve estar limpo, sem sobreposição de textos nos círculos de posição.

## 🎁 Passo 5: Recompensas e Pontuação
1. Vá até a página **Recompensas**.
2. Tente resgatar um item que custe mais pontos do que você tem. (Deve dar erro via *toast*).
3. Verifique o histórico de resgates (deve estar vazio inicialmente, com uma mensagem amigável).

## 🔐 Passo 6: Segurança e Sincronização
1. Tente acessar a página `perfil.html` digitando a URL diretamente sem estar logado. (O sistema deve te mandar para o login).
2. Abra o sistema em **duas abas** diferentes. Faça logout em uma delas.
3. **O que observar**: A segunda aba deve redirecionar para o login automaticamente (Sincronização de Sessão).

---
**RecyNet** - Transformando resíduos em impacto positivo. 🌿
