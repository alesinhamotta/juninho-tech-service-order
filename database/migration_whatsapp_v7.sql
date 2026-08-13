-- ============================================================================
-- MIGRAÇÃO v7 — Integração WhatsApp Oficial e Auditoria de Mensagens
-- Sistema Juninho Tech OS
-- Execute uma única vez no SQL Editor do banco PostgreSQL/Neon, após a v6.
-- ============================================================================

-- Resultado técnico de cada disparo de status da Ordem de Serviço.
ALTER TABLE os_eventos
  ADD COLUMN IF NOT EXISTS whatsapp_message_id VARCHAR(160),
  ADD COLUMN IF NOT EXISTS notificacao_erro TEXT,
  ADD COLUMN IF NOT EXISTS notificado_em TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_os_eventos_whatsapp_message_id
  ON os_eventos(whatsapp_message_id)
  WHERE whatsapp_message_id IS NOT NULL;

-- Todas as mensagens recebidas pelo webhook entram primeiro como registro.
-- Isso permite análise do atendimento sem permitir resposta automática indevida.
CREATE TABLE IF NOT EXISTS whatsapp_mensagens_recebidas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id VARCHAR(160) NOT NULL UNIQUE,
  telefone            VARCHAR(40) NOT NULL,
  nome_contato        VARCHAR(255),
  tipo                VARCHAR(40) NOT NULL DEFAULT 'text',
  texto               TEXT,
  horario_mensagem    TIMESTAMP WITH TIME ZONE,
  cliente_id          UUID REFERENCES clientes(id) ON DELETE SET NULL,
  os_id               UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  classificacao       VARCHAR(40) NOT NULL DEFAULT 'PENDENTE_REVISAO',
  resposta_automatica_bloqueada BOOLEAN NOT NULL DEFAULT TRUE,
  payload_bruto       JSONB,
  recebido_em         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_telefone_data
  ON whatsapp_mensagens_recebidas(telefone, recebido_em DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_classificacao
  ON whatsapp_mensagens_recebidas(classificacao, recebido_em DESC);

SELECT 'Migração v7 (WhatsApp oficial, auditoria e fila de triagem) aplicada com sucesso!' AS resultado;
