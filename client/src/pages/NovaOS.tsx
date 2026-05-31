// ============================================================================
// PÁGINA DE NOVA ORDEM DE SERVIÇO
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
}

export default function NovaOS() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [form, setForm] = useState({
    cliente_id: '',
    tipo: 'ORCAMENTO',
    descricao: '',
    forma_pagamento: 'PENDENTE',
    parcelas: '1',
    garantia_meses: '12',
    observacoes: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (buscaCliente.length >= 2) {
      api.get(`/clientes?search=${buscaCliente}`)
        .then((res) => setClientes(res.data.data || []))
        .catch(console.error);
    }
  }, [buscaCliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!form.cliente_id) {
      setErro('Selecione um cliente para continuar');
      return;
    }
    setSalvando(true);
    try {
      const res = await api.post('/os', {
        ...form,
        parcelas: parseInt(form.parcelas),
        garantia_meses: parseInt(form.garantia_meses),
      });
      navigate(`/os/${res.data.data.id}`);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao criar ordem de serviço');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
        <p className="text-gray-500 text-sm mt-1">Preencha os dados para criar uma nova OS</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Cliente */}
        <div>
          <label className="label">Buscar Cliente *</label>
          <input
            type="text"
            className="input-field"
            placeholder="Digite o nome ou telefone do cliente..."
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
          />
          {clientes.length > 0 && !form.cliente_id && (
            <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {clientes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, cliente_id: c.id });
                    setBuscaCliente(`${c.nome} - ${c.telefone}`);
                    setClientes([]);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium">{c.nome}</span>
                  <span className="text-gray-400 ml-2">{c.telefone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tipo */}
        <div>
          <label className="label">Tipo da OS *</label>
          <select
            className="input-field"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            <option value="ORCAMENTO">Orçamento</option>
            <option value="REPARO">Reparo</option>
            <option value="VENDA">Venda</option>
          </select>
        </div>

        {/* Descrição */}
        <div>
          <label className="label">Descrição do Problema</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Descreva o problema ou serviço solicitado..."
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
          />
        </div>

        {/* Pagamento */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Forma de Pagamento</label>
            <select
              className="input-field"
              value={form.forma_pagamento}
              onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
            >
              <option value="PENDENTE">A definir</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">PIX</option>
              <option value="CREDITO">Cartão de Crédito</option>
              <option value="DEBITO">Cartão de Débito</option>
              <option value="PARCELADO">Parcelado</option>
            </select>
          </div>
          <div>
            <label className="label">Parcelas</label>
            <input
              type="number"
              min="1"
              max="24"
              className="input-field"
              value={form.parcelas}
              onChange={(e) => setForm({ ...form, parcelas: e.target.value })}
            />
          </div>
        </div>

        {/* Garantia */}
        <div>
          <label className="label">Garantia (meses)</label>
          <input
            type="number"
            min="0"
            className="input-field max-w-xs"
            value={form.garantia_meses}
            onChange={(e) => setForm({ ...form, garantia_meses: e.target.value })}
          />
        </div>

        {/* Observações */}
        <div>
          <label className="label">Observações</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
        </div>

        {erro && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{erro}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button type="button" onClick={() => navigate('/os')} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Criando OS...' : 'Criar Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  );
}
