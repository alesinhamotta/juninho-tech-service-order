import crypto from 'node:crypto';

const TERMOS_INTERNOS_BLOQUEADOS = [
  'custo', 'fornecedor', 'mão de obra', 'mao de obra', 'margem', 'lucro',
  'premium 150', 'base 100', 'custo de peça', 'custo da peça',
];

type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
  templateName: string;
  templateLanguage: string;
};

export type ResultadoEnvioWhatsApp = {
  messageId: string;
  telefone: string;
};

function getConfig(): WhatsAppConfig {
  const accessToken = process.env['WHATSAPP_ACCESS_TOKEN'];
  const phoneNumberId = process.env['WHATSAPP_PHONE_NUMBER_ID'];
  const graphApiVersion = process.env['WHATSAPP_GRAPH_API_VERSION'];
  const templateName = process.env['WHATSAPP_TEMPLATE_STATUS_NAME'];
  const templateLanguage = process.env['WHATSAPP_TEMPLATE_STATUS_LANGUAGE'] || 'pt_BR';

  if (!accessToken || !phoneNumberId || !graphApiVersion || !templateName) {
    throw new Error('Integração WhatsApp ainda não configurada. Preencha as variáveis WHATSAPP_* no ambiente de produção.');
  }

  return { accessToken, phoneNumberId, graphApiVersion, templateName, templateLanguage };
}

export function normalizarTelefoneWhatsApp(valor: string) {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) throw new Error('O cliente não possui um WhatsApp válido cadastrado.');
  return digitos.startsWith('55') ? digitos : `55${digitos}`;
}

export function validarMensagemExterna(mensagem: string) {
  const normalizada = mensagem.toLocaleLowerCase('pt-BR');
  const termoBloqueado = TERMOS_INTERNOS_BLOQUEADOS.find((termo) => normalizada.includes(termo));
  if (termoBloqueado) {
    throw new Error(`O envio foi bloqueado porque a mensagem contém informação interna: “${termoBloqueado}”.`);
  }
}

/**
 * Dispara uma atualização operacional através de um modelo previamente aprovado
 * no WhatsApp Business Manager. O código não envia texto livre nem orçamentos.
 */
export async function enviarAtualizacaoOS(params: {
  telefone: string;
  nomeCliente: string;
  numeroOS: string;
  mensagem: string;
}): Promise<ResultadoEnvioWhatsApp> {
  validarMensagemExterna(params.mensagem);
  const config = getConfig();
  const telefone = normalizarTelefoneWhatsApp(params.telefone);

  const endpoint = `https://graph.facebook.com/${encodeURIComponent(config.graphApiVersion)}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  const resposta = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: telefone,
      type: 'template',
      template: {
        name: config.templateName,
        language: { code: config.templateLanguage },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: params.nomeCliente },
            { type: 'text', text: params.numeroOS },
            { type: 'text', text: params.mensagem },
          ],
        }],
      },
    }),
  });

  const dados = await resposta.json().catch(() => ({})) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!resposta.ok || !dados.messages?.[0]?.id) {
    throw new Error(dados.error?.message || `O WhatsApp recusou o envio (HTTP ${resposta.status}).`);
  }

  return { messageId: dados.messages[0].id, telefone };
}

export function validarAssinaturaWebhook(payloadBruto: Buffer | string, assinatura?: string) {
  const appSecret = process.env['WHATSAPP_APP_SECRET'];
  if (!appSecret) return process.env['NODE_ENV'] !== 'production';
  if (!assinatura?.startsWith('sha256=')) return false;

  const calculada = `sha256=${crypto.createHmac('sha256', appSecret).update(payloadBruto).digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(calculada), Buffer.from(assinatura));
}

export function verificarTokenWebhook(token?: string) {
  const esperado = process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'];
  return Boolean(esperado && token && crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(token)));
}
