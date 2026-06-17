-- ============================================================================
-- SCHEMA v2 — Sistema Juninho Tech OS
-- Atualizado para suportar todos os campos do frontend
-- ============================================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABELA: usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  senha_hash   VARCHAR(255) NOT NULL,
  ativo        BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ultimo_login TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- TABELA: clientes
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         VARCHAR(255) NOT NULL,
  telefone     VARCHAR(20) NOT NULL,  -- WhatsApp
  email        VARCHAR(255),
  rua          VARCHAR(255),
  bairro       VARCHAR(100),
  cidade       VARCHAR(100),
  estado       VARCHAR(2),
  cep          VARCHAR(10),
  observacoes  TEXT,
  ativo        BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA: produtos (peças, serviços e materiais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT,
  categoria       VARCHAR(100) NOT NULL,
  marca           VARCHAR(100),
  modelo          VARCHAR(100),
  preco_custo     NUMERIC(10,2),
  preco_venda     NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque         INTEGER DEFAULT 0,
  estoque_minimo  INTEGER DEFAULT 2,
  ativo           BOOLEAN DEFAULT true,
  data_criacao    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABELA: service_orders (Ordens de Serviço)
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_os         SERIAL,  -- Número sequencial simples
  cliente_id        UUID NOT NULL REFERENCES clientes(id),
  tecnico_id        UUID REFERENCES usuarios(id),

  -- Status com os valores do sistema Juninho Tech
  status            VARCHAR(30) NOT NULL DEFAULT 'ABERTA'
                      CHECK (status IN (
                        'ABERTA',
                        'EM_ANDAMENTO',
                        'AGUARDANDO_PECA',
                        'PRONTO',
                        'ENTREGUE',
                        'SEM_SOLUCAO',
                        'ORCAMENTO_NEGADO'
                      )),

  -- Aparelho
  aparelho_marca    VARCHAR(100),
  aparelho_modelo   VARCHAR(100),
  aparelho_cor      VARCHAR(50),
  aparelho_imei     VARCHAR(100),  -- IMEI ou número de série
  acessorios        TEXT,          -- Acessórios entregues pelo cliente

  -- Descrição do serviço
  problema_descrito TEXT,          -- Problema relatado pelo cliente
  diagnostico       TEXT,          -- Diagnóstico do técnico
  servico_realizado TEXT,          -- O que foi executado

  -- Garantia (em dias)
  garantia_dias     INTEGER DEFAULT 90,

  -- Valores
  valor_pecas       NUMERIC(10,2) DEFAULT 0,
  valor_servico     NUMERIC(10,2) DEFAULT 0,
  valor_final       NUMERIC(10,2) DEFAULT 0,

  -- Leva e Traz
  leva_traz         BOOLEAN DEFAULT false,
  endereco_coleta   TEXT,

  -- Datas
  data_criacao      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_conclusao    TIMESTAMP WITH TIME ZONE,
  data_entrega      TIMESTAMP WITH TIME ZONE,

  observacoes       TEXT
);

-- ============================================================================
-- TABELA: itens_os (peças e materiais de cada OS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS itens_os (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id            UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  produto_id       UUID REFERENCES produtos(id),
  descricao_manual VARCHAR(255),  -- Descrição manual se não tiver produto cadastrado
  quantidade       INTEGER NOT NULL DEFAULT 1,
  preco_unitario   NUMERIC(10,2) NOT NULL,
  data_criacao     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
CREATE INDEX IF NOT EXISTS idx_os_numero ON service_orders(numero_os);
CREATE INDEX IF NOT EXISTS idx_os_cliente ON service_orders(cliente_id);
CREATE INDEX IF NOT EXISTS idx_os_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_os_data ON service_orders(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_itens_os ON itens_os(os_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: OS com nome do cliente
CREATE OR REPLACE VIEW v_service_orders AS
SELECT
  os.*,
  c.nome      AS cliente_nome,
  c.telefone  AS cliente_telefone,
  c.email     AS cliente_email,
  c.rua       AS cliente_rua,
  c.cidade    AS cliente_cidade,
  c.estado    AS cliente_estado
FROM service_orders os
JOIN clientes c ON os.cliente_id = c.id;

-- View: Faturamento por mês (OS entregues)
CREATE OR REPLACE VIEW v_faturamento_mes AS
SELECT
  TO_CHAR(DATE_TRUNC('month', data_criacao), 'YYYY-MM') AS mes,
  COUNT(*) AS total_os,
  COUNT(*) FILTER (WHERE status = 'ENTREGUE') AS os_entregues,
  COALESCE(SUM(valor_final) FILTER (WHERE status = 'ENTREGUE'), 0) AS total_faturado
FROM service_orders
GROUP BY DATE_TRUNC('month', data_criacao)
ORDER BY DATE_TRUNC('month', data_criacao) DESC;

-- ============================================================================
-- FIM DO SCHEMA v2
-- ============================================================================
