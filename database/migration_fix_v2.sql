-- ============================================================================
-- MIGRAÇÃO FIX v2 — Juninho Tech OS
-- Execute este script no SQL Editor do Neon (console.neon.tech)
-- Este script é SEGURO: usa IF NOT EXISTS e não apaga dados existentes
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABELA clientes — adicionar campo 'rua' separado
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rua VARCHAR(255);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABELA service_orders — adicionar novos campos do sistema v2
-- ─────────────────────────────────────────────────────────────────────────────

-- Campos de aparelho com novos nomes
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_marca   VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_modelo  VARCHAR(100);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_cor     VARCHAR(50);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS aparelho_imei    VARCHAR(100);

-- Campos de descrição do serviço
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS problema_descrito TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS servico_realizado TEXT;

-- Garantia em dias
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS garantia_dias INTEGER DEFAULT 90;

-- Valores separados
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS valor_pecas   NUMERIC(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS valor_servico NUMERIC(10,2) DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Atualizar a constraint de status para aceitar os novos valores
-- ─────────────────────────────────────────────────────────────────────────────

-- Remover constraint antiga
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;

-- Atualizar registros com status antigos para os novos valores
UPDATE service_orders SET status = 'ABERTA'          WHERE status = 'PENDENTE';
UPDATE service_orders SET status = 'EM_ANDAMENTO'    WHERE status = 'APROVADO';
UPDATE service_orders SET status = 'PRONTO'          WHERE status = 'CONCLUIDO';
UPDATE service_orders SET status = 'ENTREGUE'        WHERE status = 'PAGO';
UPDATE service_orders SET status = 'SEM_SOLUCAO'     WHERE status = 'CANCELADO';

-- Adicionar nova constraint com os 7 status do sistema v2
ALTER TABLE service_orders ADD CONSTRAINT service_orders_status_check
  CHECK (status IN ('ABERTA','EM_ANDAMENTO','AGUARDANDO_PECA','PRONTO','ENTREGUE','SEM_SOLUCAO','ORCAMENTO_NEGADO'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABELA itens_os — adicionar campo descricao_manual
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE itens_os ADD COLUMN IF NOT EXISTS descricao_manual VARCHAR(255);

-- Remover constraint de tipo que não existe mais no novo sistema
ALTER TABLE itens_os DROP CONSTRAINT IF EXISTS itens_os_tipo_check;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIM — Verificar resultado
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'Migração fix v2 aplicada com sucesso!' AS resultado;
