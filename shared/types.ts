// ============================================================================
// SHARED TYPES - Service Order System
// ============================================================================

// ============================================================================
// CLIENTE (Customer)
// ============================================================================
export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  data_criacao: string;
  data_atualizacao: string;
  ativo: boolean;
  observacoes?: string;
}

export interface CreateClienteDTO {
  nome: string;
  telefone: string;
  email?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
}

// ============================================================================
// SERVICE ORDER (OS)
// ============================================================================
export type OSType = 'ORCAMENTO' | 'VENDA' | 'REPARO';
export type OSStatus = 'PENDENTE' | 'APROVADO' | 'PAGO' | 'CONCLUIDO' | 'CANCELADO';
export type FormaPagamento = 'DINHEIRO' | 'CREDITO' | 'DEBITO' | 'PIX' | 'PARCELADO' | 'PENDENTE';

export interface ServiceOrder {
  id: string;
  numero_os: string;
  cliente_id: string;
  tipo: OSType;
  status: OSStatus;
  descricao?: string;
  data_criacao: string;
  data_conclusao?: string;
  data_atualizacao: string;
  
  valor_total: number;
  desconto: number;
  valor_final: number;
  
  forma_pagamento?: FormaPagamento;
  parcelas: number;
  valor_parcela?: number;
  data_pagamento?: string;
  
  garantia_meses: number;
  observacoes?: string;
  criado_por?: string;
}

export interface CreateServiceOrderDTO {
  cliente_id: string;
  tipo: OSType;
  descricao?: string;
  desconto?: number;
  forma_pagamento?: FormaPagamento;
  parcelas?: number;
  garantia_meses?: number;
  observacoes?: string;
}

export interface UpdateServiceOrderDTO {
  status?: OSStatus;
  forma_pagamento?: FormaPagamento;
  parcelas?: number;
  data_pagamento?: string;
  observacoes?: string;
}

// ============================================================================
// PRODUTO (Product)
// ============================================================================
export interface Produto {
  id: string;
  nome: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  descricao?: string;
  preco_custo?: number;
  preco_venda: number;
  estoque: number;
  estoque_minimo: number;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface CreateProdutoDTO {
  nome: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  descricao?: string;
  preco_custo?: number;
  preco_venda: number;
  estoque?: number;
  estoque_minimo?: number;
}

// ============================================================================
// ACESSÓRIO (Accessory)
// ============================================================================
export interface Acessorio {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  descricao?: string;
  estoque: number;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface CreateAcessorioDTO {
  nome: string;
  categoria: string;
  preco: number;
  descricao?: string;
  estoque?: number;
}

// ============================================================================
// ITEM DA OS (Service Order Item)
// ============================================================================
export type ItemTipo = 'PRODUTO' | 'SERVICO' | 'ACESSORIO';

export interface ItemOS {
  id: string;
  os_id: string;
  produto_id?: string;
  acessorio_id?: string;
  descricao?: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  tipo: ItemTipo;
  data_criacao: string;
}

export interface CreateItemOSDTO {
  os_id: string;
  produto_id?: string;
  acessorio_id?: string;
  descricao?: string;
  quantidade: number;
  preco_unitario: number;
  tipo: ItemTipo;
}

// ============================================================================
// CHECKLIST
// ============================================================================
export type ChecklistTipo = 'CELULAR' | 'COMPUTADOR' | 'NOTEBOOK' | 'TABLET' | 'PC_GAMER';

export interface ChecklistItem {
  id: string;
  tipo: ChecklistTipo;
  item: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
}

export interface ChecklistItemMarcado {
  id: string;
  os_id: string;
  checklist_id: string;
  marcado: boolean;
  observacao?: string;
  data_criacao: string;
}

export interface CreateChecklistItemMarcadoDTO {
  os_id: string;
  checklist_id: string;
  marcado: boolean;
  observacao?: string;
}

// ============================================================================
// PAGAMENTO (Payment)
// ============================================================================
export interface Pagamento {
  id: string;
  os_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  numero_parcela: number;
  total_parcelas: number;
  data_pagamento: string;
  data_vencimento?: string;
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO';
  observacoes?: string;
}

export interface CreatePagamentoDTO {
  os_id: string;
  valor: number;
  forma_pagamento: FormaPagamento;
  numero_parcela?: number;
  total_parcelas?: number;
  data_vencimento?: string;
  observacoes?: string;
}

// ============================================================================
// USUARIO (User)
// ============================================================================
export interface Usuario {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  data_criacao: string;
  ultimo_login?: string;
}

export interface LoginDTO {
  email: string;
  senha: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

// ============================================================================
// API RESPONSES
// ============================================================================
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// RELATORIOS (Reports)
// ============================================================================
export interface FaturamentoMes {
  mes: string;
  total_os: number;
  total_faturado: number;
  os_pagas: number;
}

export interface ProdutoVendido {
  produto_id: string;
  nome: string;
  categoria: string;
  quantidade_vendida: number;
  valor_total: number;
}

export interface ClienteRecorrente {
  cliente_id: string;
  nome: string;
  telefone: string;
  total_os: number;
  valor_total_gasto: number;
}
