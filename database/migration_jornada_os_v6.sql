-- ============================================================================
-- MIGRAÇÃO v6 — Jornada Digital da Ordem de Serviço
-- Sistema Juninho Tech OS
-- Execute uma única vez no SQL Editor do banco PostgreSQL/Neon.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Fotos e documentos que comprovam o estado do equipamento antes/depois.
-- A coluna arquivo_url aceita URL segura de storage ou imagem comprimida em data URL
-- somente durante a fase inicial de validação. Em produção, prefira storage externo.
CREATE TABLE IF NOT EXISTS os_evidencias (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id          UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  etapa          VARCHAR(20) NOT NULL CHECK (etapa IN ('ANTES', 'DEPOIS', 'OUTRO')),
  titulo         VARCHAR(120),
  arquivo_url    TEXT NOT NULL,
  mime_type      VARCHAR(100),
  criado_por     VARCHAR(120),
  data_criacao   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_evidencias_os_etapa
  ON os_evidencias(os_id, etapa, data_criacao);

-- Aceite/assinatura capturada no momento da coleta, aprovação ou entrega.
CREATE TABLE IF NOT EXISTS os_assinaturas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id              UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  tipo               VARCHAR(30) NOT NULL CHECK (tipo IN ('COLETA', 'APROVACAO', 'ENTREGA')),
  nome_signatario    VARCHAR(255) NOT NULL,
  assinatura_data_url TEXT NOT NULL,
  aceite_termos      BOOLEAN NOT NULL DEFAULT FALSE,
  data_assinatura    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_os_assinaturas_os_tipo
  ON os_assinaturas(os_id, tipo);

-- Linha do tempo de cada mudança operacional, incluindo a situação de notificação.
CREATE TABLE IF NOT EXISTS os_eventos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id               UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  codigo              VARCHAR(50) NOT NULL,
  titulo              VARCHAR(160) NOT NULL,
  mensagem_cliente    TEXT,
  status_os           VARCHAR(30),
  notificar_whatsapp  BOOLEAN NOT NULL DEFAULT TRUE,
  notificacao_status  VARCHAR(20) NOT NULL DEFAULT 'PENDENTE'
                      CHECK (notificacao_status IN ('PENDENTE', 'ENVIADO', 'NAO_ENVIAR', 'ERRO')),
  criado_por          VARCHAR(120),
  data_evento         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_eventos_os_data
  ON os_eventos(os_id, data_evento DESC);

-- Registra a abertura como primeiro evento para as OS já existentes sem timeline.
INSERT INTO os_eventos (
  os_id, codigo, titulo, mensagem_cliente, status_os,
  notificar_whatsapp, notificacao_status, data_evento
)
SELECT
  so.id,
  'OS_CRIADA',
  'Ordem de serviço criada',
  'Recebemos sua solicitação e sua ordem de serviço foi registrada.',
  so.status,
  FALSE,
  'NAO_ENVIAR',
  so.data_criacao
FROM service_orders so
WHERE NOT EXISTS (
  SELECT 1 FROM os_eventos ev WHERE ev.os_id = so.id
);

SELECT 'Migração v6 (evidências, assinaturas e linha do tempo) aplicada com sucesso!' AS resultado;
