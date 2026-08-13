import { Router, type Request, type Response } from 'express';
import { query, queryOne } from '../config/database.js';
import { validarAssinaturaWebhook, verificarTokenWebhook } from '../services/whatsapp.js';

const router = Router();

type WebhookRequest = Request & { rawBody?: Buffer };
type MetaMessage = {
  id?: string;
  from?: string;
  type?: string;
  timestamp?: string;
  text?: { body?: string };
};
type MetaStatus = { id?: string; status?: string; errors?: Array<{ title?: string; message?: string }> };
type MetaChange = {
  value?: { contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>; messages?: MetaMessage[]; statuses?: MetaStatus[] };
};
type MetaPayload = { entry?: Array<{ changes?: MetaChange[] }> };

function dataMeta(timestamp?: string) {
  const segundos = Number(timestamp);
  return Number.isFinite(segundos) && segundos > 0 ? new Date(segundos * 1000).toISOString() : null;
}

// Verificação exigida pela Meta no momento de cadastrar o endereço do webhook.
router.get('/webhook', (req: Request, res: Response) => {
  const mode = String(req.query['hub.mode'] || '');
  const token = String(req.query['hub.verify_token'] || '');
  const challenge = String(req.query['hub.challenge'] || '');

  if (mode === 'subscribe' && verificarTokenWebhook(token)) {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

// Recebe mensagens e status. A resposta ao cliente é sempre bloqueada nesta fase.
router.post('/webhook', async (req: WebhookRequest, res: Response) => {
  const assinatura = req.header('x-hub-signature-256');
  const bruto = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  if (!validarAssinaturaWebhook(bruto, assinatura)) {
    res.sendStatus(401);
    return;
  }

  // Retornamos 200 rapidamente para a Meta e tratamos os dados no mesmo pedido,
  // sem uma segunda chamada automática nem geração de respostas para clientes.
  res.sendStatus(200);

  try {
    const payload = (req.body || {}) as MetaPayload;
    const changes = payload.entry?.flatMap((entry) => entry.changes || []) || [];

    for (const change of changes) {
      const value = change.value;
      if (!value) continue;
      const contatos = new Map((value.contacts || []).map((contato) => [contato.wa_id, contato.profile?.name || null]));

      for (const mensagem of value.messages || []) {
        if (!mensagem.id || !mensagem.from) continue;
        const telefone = mensagem.from.replace(/\D/g, '');
        const cliente = await queryOne<Record<string, unknown>>(
          `SELECT id FROM clientes
           WHERE regexp_replace(COALESCE(telefone, ''), '\\D', '', 'g') LIKE '%' || $1
           ORDER BY data_criacao DESC LIMIT 1`,
          [telefone]
        );
        const osAtiva = cliente
          ? await queryOne<Record<string, unknown>>(
              `SELECT id FROM service_orders
               WHERE cliente_id = $1 AND status NOT IN ('ENTREGUE', 'SEM_SOLUCAO', 'ORCAMENTO_NEGADO')
               ORDER BY data_atualizacao DESC NULLS LAST, data_criacao DESC LIMIT 1`,
              [cliente['id']]
            )
          : null;

        await query(
          `INSERT INTO whatsapp_mensagens_recebidas (
             whatsapp_message_id, telefone, nome_contato, tipo, texto, horario_mensagem,
             cliente_id, os_id, classificacao, resposta_automatica_bloqueada, payload_bruto
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDENTE_REVISAO', TRUE, $9)
           ON CONFLICT (whatsapp_message_id) DO NOTHING`,
          [
            mensagem.id, telefone, contatos.get(mensagem.from) || null, mensagem.type || 'text',
            mensagem.text?.body || null, dataMeta(mensagem.timestamp), cliente?.['id'] || null,
            osAtiva?.['id'] || null, JSON.stringify(mensagem),
          ]
        );
      }

      for (const status of value.statuses || []) {
        if (!status.id) continue;
        const situacao = status.status === 'failed' ? 'ERRO' : 'ENVIADO';
        const erro = status.errors?.map((item) => item.message || item.title).filter(Boolean).join(' | ') || null;
        await query(
          `UPDATE os_eventos
           SET notificacao_status = $1,
               notificacao_erro = CASE WHEN $1 = 'ERRO' THEN $2 ELSE notificacao_erro END,
               notificado_em = COALESCE(notificado_em, NOW())
           WHERE whatsapp_message_id = $3`,
          [situacao, erro, status.id]
        );
      }
    }
  } catch (erro) {
    // O retorno 200 já foi entregue. O erro fica no log para não provocar repetição desnecessária pela plataforma.
    console.error('Erro ao processar webhook do WhatsApp:', erro);
  }
});

export default router;
