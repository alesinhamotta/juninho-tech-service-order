# Arquitetura de Automação — WhatsApp Oficial

## Confirmação técnica

A WhatsApp Business Platform (Cloud API) suporta um fluxo orientado a eventos: ela envia **webhooks HTTPS** para um servidor definido pela empresa quando chega uma mensagem do cliente e quando há alterações de status das mensagens enviadas, como enviada, entregue e lida. Isso permite integrar o formulário do site, o sistema de Ordem de Serviço e as notificações ao cliente sem a necessidade de consultar mensagens em intervalos.

Para produzir uma integração, a Juninho Tech precisará de uma aplicação Meta configurada para o caso de uso WhatsApp, uma conta comercial do WhatsApp vinculada, um número conectado, um token de acesso permanente de usuário de sistema e um endereço HTTPS público para receber os eventos. A Meta documenta que mensagens fora da janela de atendimento iniciada pelo cliente devem seguir as regras aplicáveis da plataforma, incluindo o uso de modelos de mensagem quando necessário.

## Implicação para a Juninho Tech

O sistema deve registrar cada alteração de status como um evento interno e, somente depois de uma confirmação explícita da equipe, enviar a mensagem correspondente pelo conector oficial. A automação deverá manter uma lista de bloqueio de termos internos, impedindo o envio de texto que revele custo de fornecedor, mão de obra ou margem.

## Fontes oficiais

1. [Webhooks — WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview), atualizado em 26 de junho de 2026.
2. [WhatsApp Cloud API — Get Started](https://developers.facebook.com/documentation/business-messaging/whatsapp/get-started), atualizado em 16 de junho de 2026.
3. [Messages webhook reference — WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages), atualizado em 17 de junho de 2026.

## Medição de conversão do site

O formulário de orçamento deverá registrar eventos sem enviar dados identificáveis do cliente aos pixels no navegador. A proposta é registrar `orcamento_inicio`, `orcamento_etapa_concluida`, `lead` e `contato_whatsapp`; internamente, o CRM/OS manterá a ligação segura entre o lead e o atendimento.

A documentação do Google Analytics 4 prevê o envio de eventos por `gtag('event', '<nome>', { ...parâmetros })`, depois que a Google tag já estiver carregada. A referência do Meta Pixel prevê, entre os eventos padronizados, `Lead` para conclusão de captação, `Contact` para início de contato e `Schedule` para agendamento. O formulário usará esses eventos em seus momentos equivalentes, respeitando a escolha de cookies do visitante.

## Fontes adicionais

4. [Google Analytics — Set up events](https://developers.google.com/analytics/devguides/collection/ga4/events), atualizado em 9 de junho de 2026.
5. [Meta Pixel — Reference](https://developers.facebook.com/documentation/meta-pixel/reference), atualizado em 16 de julho de 2024.

## Arquitetura centralizada na Manus

A solução será composta por um único ecossistema de software, sem depender de Claude Code ou de n8n:

| Camada | Responsabilidade | Implementação planejada |
|---|---|---|
| Site Juninho Tech | Captar e qualificar o pedido inicial | Formulário guiado, página de sucesso e redirecionamento com contexto para o WhatsApp |
| Medição | Atribuir origem de cada lead e campanha | Meta Pixel, Google tag/GA4 e eventos próprios, acionados somente após consentimento aplicável |
| Base operacional | Manter clientes, leads, OS, fotos, assinaturas e histórico | Backend do sistema de OS + banco de dados relacional |
| Automação | Enviar status e receber atualizações | Rotas de webhook e conector oficial da WhatsApp Cloud API |
| IA com aprovação humana | Sugerir respostas e classificar pedidos | Serviço de IA com política de preço, redatores internos bloqueados e triagem para Juninho |

### Estado do lead de orçamento

`NOVO` → `QUALIFICADO` → `EM_ATENDIMENTO_HUMANO` → `AGENDADO` → `CONVERTIDO_EM_OS` ou `ENCERRADO`.

O formulário não dará um preço automático ao cliente nesta primeira versão. Ele entrega um resumo estruturado ao WhatsApp e cria o lead no sistema. Isso evita respostas equivocadas para modelos, defeitos e qualidades de peça que exigem verificação.

### Controle de segurança de respostas

Nenhuma automação poderá enviar uma resposta de orçamento se o texto contiver, sem autorização explícita, termos internos como `custo`, `fornecedor`, `mão de obra`, `margem`, `lucro`, `premium 150` ou `base 100`. Casos com modelo não identificado, preço ausente, tela Incell, atendimento de MacBook/Apple Watch, pedido de desconto ou pergunta técnica ambígua serão direcionados ao Juninho para revisão.

### Jornada de status da Ordem de Serviço

| Ação operacional confirmada pela equipe | Status visível ao cliente | Mensagem planejada |
|---|---|---|
| Junior sai para coleta | Técnico a caminho | Aviso de deslocamento e disponibilidade no WhatsApp |
| Aparelho recebido | Aparelho coletado | Confirmação de recebimento e próximo passo de análise |
| Diagnóstico concluído | Orçamento em análise/aprovação | Resumo sem custos internos; segue para aprovação humana |
| Reparo concluído | Serviço concluído | Confirmação de teste e preparação para entrega |
| Junior sai para entrega | Em rota de entrega | Aviso de chegada próxima |
| Cliente recebe o aparelho | Entregue | Link/arquivo da OS com garantia, fotos e assinatura |

Cada envio será inicialmente iniciado por um botão no sistema da OS. Quando o fluxo estiver validado, poderemos ativar gatilhos automáticos para apenas os estados que não envolvam preço ou decisão comercial.
