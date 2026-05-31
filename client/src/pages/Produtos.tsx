// ============================================================================
// PÁGINA DE PRODUTOS / PEÇAS
// ============================================================================

import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatarMoeda } from '../lib/utils';

interface Produto {
  id: string;
  nome: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  preco_venda: number;
  estoque: number;
  estoque_minimo: number;
  ativo: boolean;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', categoria: '', marca: '', modelo: '', descricao: '', preco_custo: '', preco_venda: '', estoque: '0', estoque_minimo: '5' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarProdutos = () => {
    setCarregando(true);
    api.get(`/produtos${busca ? `?search=${busca}` : ''}`)
      .then((res) => setProdutos(res.data.data || []))
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregarProdutos(); }, [busca]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await api.post('/produtos', {
        ...form,
        preco_custo: form.preco_custo ? parseFloat(form.preco_custo) : null,
        preco_venda: parseFloat(form.preco_venda),
        estoque: parseInt(form.estoque),
        estoque_minimo: parseInt(form.estoque_minimo),
      });
      setModalAberto(false);
      setForm({ nome: '', categoria: '', marca: '', modelo: '', descricao: '', preco_custo: '', preco_venda: '', estoque: '0', estoque_minimo: '5' });
      carregarProdutos();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar produto');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Produtos / Peças</h1>
        <button onClick={() => setModalAberto(true)} className="btn-primary">+ Novo Produto</button>
      </div>

      <div className="card flex gap-3">
        <input
          type="text"
          placeholder="Buscar por nome, categoria ou marca..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input-field max-w-sm"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : produtos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum produto encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Marca/Modelo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Preço Venda</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {produtos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{p.categoria}</td>
                  <td className="px-4 py-3 text-gray-500">{[p.marca, p.modelo].filter(Boolean).join(' / ') || '-'}</td>
                  <td className="px-4 py-3 font-medium text-green-700">{formatarMoeda(p.preco_venda)}</td>
                  <td className="px-4 py-3">
                    <span className={p.estoque <= p.estoque_minimo ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {p.estoque} un.
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo Produto */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Novo Produto</h2>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nome *</label>
                  <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Categoria *</label>
                  <input className="input-field" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required placeholder="Ex: Tela, Bateria..." />
                </div>
                <div>
                  <label className="label">Marca</label>
                  <input className="input-field" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
                </div>
                <div>
                  <label className="label">Preço de Custo (R$)</label>
                  <input type="number" step="0.01" min="0" className="input-field" value={form.preco_custo} onChange={(e) => setForm({ ...form, preco_custo: e.target.value })} />
                </div>
                <div>
                  <label className="label">Preço de Venda (R$) *</label>
                  <input type="number" step="0.01" min="0" className="input-field" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Estoque Atual</label>
                  <input type="number" min="0" className="input-field" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: e.target.value })} />
                </div>
                <div>
                  <label className="label">Estoque Mínimo</label>
                  <input type="number" min="0" className="input-field" value={form.estoque_minimo} onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })} />
                </div>
              </div>
              {erro && <p className="text-red-600 text-sm">{erro}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={salvando} className="btn-primary">{salvando ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
