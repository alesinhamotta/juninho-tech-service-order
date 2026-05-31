// ============================================================================
// PÁGINA DE CLIENTES
// ============================================================================

import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { formatarTelefone } from '../lib/utils';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  cidade?: string;
  estado?: string;
  ativo: boolean;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', cidade: '', estado: '', endereco: '', cep: '', observacoes: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarClientes = () => {
    setCarregando(true);
    api.get(`/clientes${busca ? `?search=${busca}` : ''}`)
      .then((res) => setClientes(res.data.data || []))
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregarClientes(); }, [busca]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await api.post('/clientes', form);
      setModalAberto(false);
      setForm({ nome: '', telefone: '', email: '', cidade: '', estado: '', endereco: '', cep: '', observacoes: '' });
      carregarClientes();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar cliente');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button onClick={() => setModalAberto(true)} className="btn-primary">+ Novo Cliente</button>
      </div>

      <div className="card flex gap-3">
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou email..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input-field max-w-sm"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {carregando ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum cliente encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Cidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{formatarTelefone(c.telefone)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.cidade ? `${c.cidade}/${c.estado}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo Cliente */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Novo Cliente</h2>
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nome *</label>
                  <input className="input-field" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Telefone *</label>
                  <input className="input-field" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label className="label">Cidade</label>
                  <input className="input-field" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
                </div>
                <div>
                  <label className="label">Estado (UF)</label>
                  <input className="input-field" maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} placeholder="SP" />
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
