// ============================================================================
// UTILITÁRIOS GERAIS DO FRONTEND
// ============================================================================

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Combina classes CSS com suporte a Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um valor numérico como moeda brasileira (R$)
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

/**
 * Formata uma data ISO para o formato brasileiro (dd/MM/yyyy)
 */
export function formatarData(data: string): string {
  try {
    return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return data;
  }
}

/**
 * Formata uma data ISO para o formato brasileiro com hora
 */
export function formatarDataHora(data: string): string {
  try {
    return format(parseISO(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return data;
  }
}

/**
 * Retorna o label amigável para o status da OS
 */
export function labelStatus(status: string): string {
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    APROVADO: 'Aprovado',
    PAGO: 'Pago',
    CONCLUIDO: 'Concluído',
    CANCELADO: 'Cancelado',
  };
  return labels[status] || status;
}

/**
 * Retorna o label amigável para o tipo da OS
 */
export function labelTipo(tipo: string): string {
  const labels: Record<string, string> = {
    ORCAMENTO: 'Orçamento',
    VENDA: 'Venda',
    REPARO: 'Reparo',
  };
  return labels[tipo] || tipo;
}

/**
 * Retorna o label amigável para a forma de pagamento
 */
export function labelFormaPagamento(forma: string): string {
  const labels: Record<string, string> = {
    DINHEIRO: 'Dinheiro',
    CREDITO: 'Cartão de Crédito',
    DEBITO: 'Cartão de Débito',
    PIX: 'PIX',
    PARCELADO: 'Parcelado',
    PENDENTE: 'Pendente',
  };
  return labels[forma] || forma;
}

/**
 * Formata um número de telefone para exibição
 */
export function formatarTelefone(telefone: string): string {
  const nums = telefone.replace(/\D/g, '');
  if (nums.length === 11) {
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  }
  if (nums.length === 10) {
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  }
  return telefone;
}
