-- ============================================================================
-- MIGRAÇÃO v2 — Sistema Juninho Tech OS
-- Execute este script no console do Neon (console.neon.tech > SQL Editor)
-- ATENÇÃO: Execute APÓS o schema.sql original já estar aplicado
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ATUALIZAR TABELA clientes
--    Adicionar campo 'rua' separado do 'endereco' existente
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rua VARCHAR(255);

-- Migrar dados existentes: copiar 'endereco' para 'rua'
UPDATE clientes SET rua = endereco WHERE rua IS NULL AND endereco IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ATUALIZAR TABELA service_orders
--    Substituir campos antigos pelos novos campos do sistema v2
-- ─────────────────────────────────────────────────────────────────────────────

-- Novos campos de aparelho
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_marca    VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_modelo   VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_cor      VARCHAR(50);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_imei     VARCHAR(100);

-- Migrar dados antigos: aparelho → aparelho_marca + aparelho_modelo
UPDATE service_orders
SET aparelho_marca = SPLIT_PART(COALESCE(aparelho, ''), ' ', 1),
    aparelho_modelo = TRIM(SUBSTRING(COALESCE(aparelho, '') FROM POSITION(' ' IN COALESCE(aparelho, '')) + 1))
WHERE aparelho_marca IS NULL AND aparelho IS NOT NULL;

-- Campos de descrição do serviço
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS problema_descrito TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS servico_realizado TEXT;

-- Migrar descricao → problema_descrito
UPDATE service_orders SET problema_descrito = descricao WHERE problema_descrito IS NULL AND descricao IS NOT NULL;

-- Garantia em dias (substituir garantia_meses)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS garantia_dias INTEGER DEFAULT 90;
UPDATE service_orders SET garantia_dias = COALESCE(garantia_meses, 3) * 30 WHERE garantia_dias = 90;

-- Valores separados de peças e serviço
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS valor_pecas   NUMERIC(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS valor_servico NUMERIC(10,2) DEFAULT 0;

-- Atualizar status para os novos valores
-- Mapeamento: PENDENTE → ABERTA, APROVADO → EM_ANDAMENTO, CONCLUIDO → PRONTO, PAGO → ENTREGUE, CANCELADO → SEM_SOLUCAO

-- Primeiro, remover a constraint CHECK antiga
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;

-- Atualizar os valores de status existentes
UPDATE service_orders SET status = 'ABERTA'          WHERE status = 'PENDENTE';
UPDATE service_orders SET status = 'EM_ANDAMENTO'    WHERE status = 'APROVADO';
UPDATE service_orders SET status = 'PRONTO'          WHERE status = 'CONCLUIDO';
UPDATE service_orders SET status = 'ENTREGUE'        WHERE status = 'PAGO';
UPDATE service_orders SET status = 'SEM_SOLUCAO'     WHERE status = 'CANCELADO';

-- Adicionar nova constraint CHECK com os novos status
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check
  CHECK (status IN ('ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_PECA', 'PRONTO', 'ENTREGUE', 'SEM_SOLUCAO', 'ORCAMENTO_NEGADO'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ATUALIZAR TABELA itens_os
--    Adicionar campo descricao_manual (renomear de descricao)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS descricao_manual VARCHAR(255);
UPDATE itens_os SET descricao_manual = descricao WHERE descricao_manual IS NULL AND descricao IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ATUALIZAR VIEW v_faturamento_mes para usar novos status
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_faturamento_mes AS
SELECT
  TO_CHAR(DATE_TRUNC('month', data_criacao), 'YYYY-MM') AS mes,
  COUNT(*) AS total_os,
  COUNT(*) FILTER (WHERE status = 'ENTREGUE') AS os_entregues,
  COALESCE(SUM(valor_final) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_faturado
FROM service_orders
GROUP BY DATE_TRUNC('month', data_criacao)
ORDER BY DATE_TRUNC('month', data_criacao) DESC;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ATUALIZAR VIEW v_service_orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_service_orders AS
SELECT
  os.*,
  c.nome      AS cliente_nome,
  c.telefone  AS cliente_telefone,
  c.email     AS cliente_email,
  c.rua       AS cliente_rua,
  c.bairro    AS cliente_bairro,
  c.cidade    AS cliente_cidade,
  c.estado    AS cliente_estado
FROM service_orders os
JOIN clientes c ON os.cliente_id = c.id;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIM DA MIGRAÇÃO v2
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'Migração v2 concluída com sucesso!' AS resultado;
