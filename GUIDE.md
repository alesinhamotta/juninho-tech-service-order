# 🔧 Guia de Uso e Deploy — Juninho Tech OS System v2

Este guia contém as instruções completas para operar, atualizar o banco de dados e realizar o deploy do **Sistema de Ordens de Serviço v2 da Juninho Tech**. 

O sistema foi completamente reformulado com a **identidade visual oficial** (Rosa `#e91e8c` e Azul `#00b4ff`), regras de negócios robustas e geração de PDF com o **Termo de Garantia completo dentro da lei**.

---

## 🚀 Como sincronizar com seu VS Code local

Como você prefere gerenciar seu repositório localmente no VS Code para maior segurança e sincronização automática:

1. **Abra o VS Code** em seu computador.
2. Abra o terminal integrado e navegue até a pasta onde clonou o projeto.
3. Execute o comando para baixar todas as atualizações que fiz:
   ```bash
   git pull origin main
   ```
4. Pronto! Todos os novos arquivos (incluindo o gerador de PDF, novas telas, rotas do backend e scripts de migração) estarão disponíveis no seu ambiente local.

---

## 💾 1. Atualização do Banco de Dados (Neon Postgres)

Como adicionamos novos campos para suportar a nova estrutura de dados (endereço detalhado, novos status de OS, campos separados para marca/modelo do aparelho, etc.), você precisa aplicar a migração no seu banco de dados.

### Passo a Passo:
1. Acesse o console do seu banco de dados em [Neon Postgres](https://console.neon.tech).
2. Selecione o seu projeto/banco de dados.
3. No menu lateral esquerdo, clique em **SQL Editor**.
4. Abra o arquivo `/database/migration_v2.sql` no seu VS Code, copie todo o conteúdo dele.
5. Cole o código no **SQL Editor** do Neon e clique em **Run**.
6. O Neon retornará a mensagem: `"Migração v2 concluída com sucesso!"`.

---

## 🌐 2. Deploy do Backend (Render.com)

O backend já está configurado no arquivo `render.yaml` na raiz do projeto. Como o código foi atualizado no GitHub, o deploy na Render iniciará automaticamente se você tiver o deploy automático ativo. Caso contrário, siga estes passos:

1. Acesse o painel do [Render](https://dashboard.render.com).
2. Selecione o seu serviço web do backend (`juninho-tech-api`).
3. Clique em **Manual Deploy** > **Deploy latest commit** (ou espere o build automático terminar).
4. **Verifique as Variáveis de Ambiente** no painel da Render em **Settings** > **Environment Variables**:
   * `DATABASE_URL`: Deve conter a string de conexão do Neon Postgres.
   * `JWT_SECRET`: Uma chave segura para criptografia dos tokens de login.
   * `CORS_ORIGIN`: A URL final do seu frontend na Vercel (ex: `https://juninho-tech.vercel.app`). Se ainda não tiver a URL do frontend, você pode atualizar este campo logo após o deploy do frontend.

---

## 💻 3. Deploy do Frontend (Vercel)

O frontend foi otimizado para deploy na Vercel e já inclui o arquivo `vercel.json` para garantir que as rotas do React funcionem perfeitamente sem erros de "404 Not Found" ao recarregar a página.

### Passo a Passo:
1. Acesse o painel da [Vercel](https://vercel.com).
2. Clique em **Add New...** > **Project**.
3. Importe o repositório `juninho-tech-service-order`.
4. Na tela de configuração:
   * **Framework Preset**: Selecione `Vite`.
   * **Root Directory**: Selecione a pasta `client`.
5. Expanda a seção **Environment Variables** e adicione a seguinte variável:
   * **Key**: `VITE_API_URL`
   * **Value**: A URL do seu backend na Render seguido de `/api` (ex: `https://juninho-tech-api.onrender.com/api`).
6. Clique em **Deploy**.
7. Após o término do deploy, copie a URL gerada pela Vercel e insira-a na variável `CORS_ORIGIN` no painel da Render para que o backend permita o acesso do frontend.

---

## 📱 4. Guia de Uso das Novas Telas e Funcionalidades

### 📊 Dashboard JT
* **Visualização por Período**: No canto superior direito, você pode filtrar os dados de faturamento e quantidade de OS por período. Há opções rápidas (Hoje, Últimos 7 dias, Mês Atual, Ano Atual) ou seleção personalizada de datas (ex: `01/07/2026` a `31/07/2026`).
* **Cards Informativos**: Indicam o total de OS e a quantidade em cada status, identificados por cores discretas e ícones modernos.
* **Tabela de OS Recentes**: Lista as últimas 10 ordens de serviço. O fundo é branco com letras pretas, e apenas a badge de status exibe a cor correspondente.

### 📋 Cores de Status das OS
Conforme solicitado, os status do sistema são identificados pelas seguintes cores nas tabelas e detalhes:
* 🔵 **ABERTA**: Azul (Início do atendimento, geração da OS de entrada).
* 🟠 **EM ANDAMENTO**: Laranja (Aparelho na bancada, técnico realizando o reparo).
* 🟡 **AGUARDANDO PEÇA**: Amarelo escuro (Aguardando chegada de insumos).
* 🟢 **PRONTO**: Verde claro (Reparo concluído, aparelho aguardando retirada).
* ✅ **ENTREGUE**: Verde escuro (Faturado, pago e entregue ao cliente).
* 🔴 **SEM SOLUÇÃO**: Vermelho (Aparelho sem possibilidade de reparo).
* ⚫ **ORÇAMENTO NEGADO**: Preto (Cliente optou por não realizar o serviço).

### 👥 Clientes (CRUD Completo)
* Cadastro completo contendo Nome, Telefone (WhatsApp), E-mail e **Endereço Detalhado** (Rua, Bairro, Cidade, Estado, CEP) — essencial para o controle de entrega/coleta do serviço "Leva e Traz".

### 📦 Produtos e Peças
* Cadastro de peças (Telas, Baterias, Conectores) com controle de estoque, preço de custo, preço de venda e **alerta visual de estoque baixo** caso o item atinja o estoque mínimo configurado.

### 📝 Nova OS (Formulário Inteligente)
1. **Cliente**: Selecione um cliente cadastrado diretamente no campo de busca.
2. **Aparelho**: Insira Marca, Modelo, Cor e IMEI/Número de Série.
3. **Serviço**: Descreva o problema relatado pelo cliente, acessórios deixados (carregador, capinha) e se o serviço inclui "Leva e Traz".
4. **Peças**: Adicione peças do estoque à OS. O sistema calcula automaticamente o valor total das peças.
5. **Mão de Obra**: Insira o valor do serviço técnico. O sistema soma tudo e exibe o **Valor Final** automaticamente.
6. **Garantia**: Selecione o tempo de garantia (90 dias padrão, 180 dias ou personalizado para serviços premium).

### 📄 Detalhes da OS e Geração de PDF (Termo de Garantia)
Ao acessar uma OS na lista, você pode:
1. **Atualizar o Status**: Mudar de "ABERTA" para "EM ANDAMENTO", "PRONTO", etc.
2. **Atualizar Diagnóstico**: Inserir o laudo técnico e a descrição do serviço realizado.
3. **Gerar PDF da OS**: O sistema gera um PDF profissional em duas vias (via da assistência e via do cliente) contendo:
   * Logotipo oficial da **Juninho Tech**.
   * Dados de contato: WhatsApp e Instagram `@juninho.tech`.
   * Detalhes completos do aparelho, peças utilizadas e valores.
   * **Termo de Garantia Robusto** (impresso no início e no final do processo).

---

## ⚖️ Termo de Garantia (Conforme o Código de Defesa do Consumidor)

O texto do termo de garantia foi redigido de forma extremamente robusta e explicativa, protegendo a assistência contra má-fé e deixando claras as regras de uso:

1. **Prazo de Garantia**: Estabelece o prazo legal de 90 dias (Art. 26, II do CDC) ou prazos superiores concedidos pela Juninho Tech, válidos exclusivamente para o serviço executado e peças substituídas.
2. **Exclusão de Cobertura (Mau Uso)**: Deixa explícito que a garantia **não cobre**:
   * Danos físicos (aparelho arranhado, trincado, amassado ou com marcas de impacto).
   * Contato com líquidos (oxidação, manchas de água na tela).
   * Telas com listras verticais/horizontais ou manchas escuras (causadas por impacto/pressão, mesmo sem trincos visíveis).
3. **Prazo de Solução**: Esclarece que, por lei (Art. 18 do CDC), a assistência dispõe de até 30 dias para sanar eventuais defeitos em garantia, embora a Juninho Tech preze pela agilidade e prioridade no atendimento.
4. **Serviços sem Relação**: A garantia é restrita ao reparo efetuado. Novos defeitos apresentados em outros componentes não relacionados ao serviço original não possuem cobertura.
5. **Cláusula de Abandono (Multa de Retirada)**: Aparelhos não retirados em até 30 dias após a notificação de conclusão (status "PRONTO", "SEM SOLUCAO" ou "ORÇAMENTO NEGADO") estarão sujeitos a cobrança de taxa de armazenamento de **R$ 10,00 por dia de atraso** (Art. 1.219 do Código Civil). Aparelhos abandonados por mais de 90 dias poderão ser vendidos para custear as despesas do reparo.
6. **Análise Técnica**: Todo acionamento de garantia passará por uma análise minuciosa de até 48 horas para constatar se o defeito não foi ocasionado por imperícia, queda ou mau uso por parte do cliente.
