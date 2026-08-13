# Guia Operacional — Automação Juninho Tech

**Autora:** Manus AI  
**Objetivo:** explicar como usar o novo fluxo de orçamento, Ordem de Serviço e mensagens de status sem depender do Claude Code ou do n8n.

> A automação foi desenhada para proteger a Juninho Tech: a equipe controla o orçamento e confirma cada mensagem de status. A IA não envia custos internos, mão de obra, margem ou informações não aprovadas.

## 1. O que já está preparado

| Área | Entrega implementada | Como será usada na operação |
|---|---|---|
| Site | Formulário de orçamento em etapas | O cliente informa como quer ser chamado, WhatsApp, tipo de equipamento, reparo e descrição do defeito. Ao concluir, abre uma mensagem organizada no WhatsApp. |
| Rastreamento | Base para Meta Pixel, Google Analytics e Google Ads com consentimento | Permite medir a origem dos pedidos de orçamento depois de inserir os IDs das contas. |
| OS digital | Fotos antes/depois, assinatura e linha do tempo | A equipe registra a coleta, serviço, entrega e as evidências do aparelho. |
| PDF | Inclusão de fotos e assinatura | A OS final pode funcionar como comprovante do serviço e da garantia. |
| WhatsApp | Estrutura para Cloud API oficial | A equipe confirma o envio de cada status; não há resposta automática nem orçamento automático nesta fase. |
| Caixa de entrada | Registro de mensagens recebidas | As mensagens ficam disponíveis para análise e triagem, com resposta automática bloqueada. |

## 2. Como será o atendimento no dia a dia

O formulário do site não calcula nem promete valores. Ele serve para transformar uma mensagem vaga, como “quanto custa?”, em um pedido organizado para o WhatsApp. A equipe continua responsável por confirmar modelo, qualidade de peça, disponibilidade e preço.

| Momento | Ação da equipe | Ação do sistema |
|---|---|---|
| Cliente acessa o site | Cliente preenche o orçamento guiado | O site registra eventos de conversão consentidos e abre o WhatsApp com o resumo. |
| Cliente conversa no WhatsApp | Juninho/Junior confirma modelo e condição do aparelho | A resposta segue a tabela e as regras aprovadas, sem expor custo ou mão de obra. |
| Coleta | Crie a OS e registre fotos “Antes” | A OS ganha número, linha do tempo e evidências. |
| Técnico sai para buscar | Clique em **Técnico a caminho** | A mensagem é preparada; com a API ativada, a equipe confere e clica em **Enviar atualização no WhatsApp**. |
| Aparelho coletado | Clique em **Aparelho coletado** | A OS passa para atendimento em andamento e registra o aviso. |
| Análise/orçamento | Registre o diagnóstico e envie somente após aprovação humana | Não há automação de preço nesta etapa. |
| Serviço concluído | Registre fotos “Depois” e clique em **Serviço concluído** | A OS fica pronta e a atualização pode ser enviada ao cliente. |
| Entrega | Capture a assinatura de entrega e clique em **Entrega concluída** | O PDF final reúne serviço, garantia, fotos e assinatura. |

## 3. Ativação do WhatsApp oficial

A integração usa a **WhatsApp Business Platform / Cloud API da Meta**. Ela exige uma conta empresarial, um aplicativo no painel da Meta, um número habilitado e uma URL pública segura para o webhook. A Meta verifica o endereço com um token e assina as chamadas do webhook para permitir validação no servidor. [1]

### 3.1 O que você precisa ter antes de ativar

| Item | Onde obter | Observação |
|---|---|---|
| Conta Business da Meta | Meta Business Suite | Use a empresa que controla o número da Juninho Tech. |
| App com produto WhatsApp | Painel Meta for Developers | É o conector oficial para as mensagens. |
| Número de telefone | WhatsApp Business Platform | O número deve estar elegível para a API e ser confirmado no painel. |
| Token de acesso | Configurações da API | Fica somente no servidor, nunca no site. |
| Modelo de utilidade aprovado | WhatsApp Manager | Necessário para atualizações fora da janela de atendimento. |
| URL pública HTTPS | Hospedagem do backend | Será cadastrada como webhook no app da Meta. |

### 3.2 Modelo de mensagem recomendado

Crie no WhatsApp Manager um modelo de **utilidade** (não promocional) com três variáveis de texto:

```text
Olá, {{1}}! Atualização da sua OS {{2}}:
{{3}}

Juninho Tech — assistência técnica e delivery.
```

O nome aprovado desse modelo deve ser inserido em `WHATSAPP_TEMPLATE_STATUS_NAME`. O sistema passa somente: primeiro nome do cliente, número da OS e mensagem operacional validada. Assim, a mensagem de status não carrega preço, custo, margem, mão de obra ou qualquer informação interna.

### 3.3 Variáveis do servidor

No ambiente de produção, preencha as variáveis incluídas em `.env.example`:

```bash
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GRAPH_API_VERSION=
WHATSAPP_TEMPLATE_STATUS_NAME=
WHATSAPP_TEMPLATE_STATUS_LANGUAGE=pt_BR
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

Nunca envie esse arquivo por WhatsApp, e-mail ou GitHub. Tokens dão acesso a mensagens e precisam ficar somente na configuração protegida do servidor.

### 3.4 URL do webhook

Depois de publicar o backend, cadastre no aplicativo Meta a URL:

```text
https://SEU-DOMINIO-DA-OS/api/whatsapp/webhook
```

Informe o mesmo valor configurado em `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Inscreva os eventos de mensagens e de status de mensagem. O sistema recebe esses eventos, registra mensagens recebidas para análise e atualiza o resultado dos avisos de OS. Ele **não responde automaticamente** nesta versão. [1]

## 4. Configuração dos rastreadores do site

No projeto do site, defina as variáveis equivalentes ao seu ambiente de publicação:

```bash
VITE_META_PIXEL_ID=
VITE_GA_MEASUREMENT_ID=
VITE_GOOGLE_ADS_ID=
VITE_GOOGLE_ADS_CONVERSION_LABEL=
```

O rastreamento só é carregado depois do aceite de cookies. Os eventos do orçamento guiado foram separados para identificar início de contato, avanço de etapa e conclusão. O Google Analytics recomenda usar eventos para registrar interações importantes da jornada; os nomes de eventos podem ser personalizados conforme os objetivos de negócio. [2]

## 5. Regras de segurança aprovadas

| Regra | Comportamento do sistema |
|---|---|
| Orçamentos | Não são enviados automaticamente. A equipe confirma qualidade de peça, valor e garantia. |
| Dados internos | O envio é bloqueado se a mensagem contiver termos como “custo”, “fornecedor”, “mão de obra”, “margem” ou “lucro”. |
| Mensagens de OS | Só são enviadas quando alguém clica em **Enviar atualização no WhatsApp** e confirma o texto. |
| Clientes antigos | Mensagens recebidas são registradas, mas nenhuma IA entra no meio de conversas existentes. |
| Falhas de envio | Ficam visíveis na linha do tempo para revisão; não há repetição cega. |
| Evidências | Fotos e assinaturas ficam anexadas à OS; em produção, a próxima evolução recomendada é movê-las para armazenamento privado. |

## 6. Próximas evoluções — somente após validação

A primeira versão deve operar por pelo menos duas semanas com envio manual aprovado. Depois de validar os textos, horários e a tabela de preços, podemos ativar por etapas:

1. Notificação automática somente para “Técnico a caminho”, “Aparelho coletado” e “Saindo para entrega”, com opção de desligar por OS.
2. Integração do formulário do site com o banco de leads da OS, para não depender apenas da abertura do WhatsApp.
3. Tela de triagem com análise de demandas recorrentes do WhatsApp, sem responder por conta própria.
4. Orçamento assistido pelo Mercúrio em cenários previamente liberados, começando por modelos e serviços com preço estabilizado.
5. Armazenamento privado das fotos e assinatura, em vez de dados embutidos no banco.

## Referências

[1] [Meta for Developers — WhatsApp Cloud API: Webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)  
[2] [Google Analytics — Eventos do GA4](https://developers.google.com/analytics/devguides/collection/ga4/events)
