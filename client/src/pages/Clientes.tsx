import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  rua?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  observacoes?: string;
  ativo: boolean;
  data_criacao?: string;
}

const FORM_VAZIO = {
  nome: '',
  telefone: '',
  email: '',
  rua: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  observacoes: '',
};

function formatarWhatsApp(v: string) {
  const n = v.replace(/\D/g, '');
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
}

function linkWhatsApp(tel: string) {
  const n = tel.replace(/\D/g, '');
  return `https://wa.me/55${n}`;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null);

  const carregarClientes = useCallback(() => {
    setCarregando(true);
    api.get(`/clientes${busca ? `?search=${encodeURIComponent(busca)}` : ''}`)
      .then((res) => setClientes(res.data.data || res.data || []))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(carregarClientes, 300);
    return () => clearTimeout(t);
  }, [carregarClientes]);

  const abrirNovo = () => {
    setClienteEditando(null);
    setForm({ ...FORM_VAZIO });
    setErro('');
    setModalAberto(true);
  };

  const abrirEditar = (c: Cliente) => {
    setClienteEditando(c);
    setForm({
      nome: c.nome || '',
      telefone: c.telefone || '',
      email: c.email || '',
      rua: c.rua || '',
      bairro: c.bairro || '',
      cidade: c.cidade || '',
      estado: c.estado || '',
      cep: c.cep || '',
      observacoes: c.observacoes || '',
    });
    setErro('');
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      if (clienteEditando) {
        await api.put(`/clientes/${clienteEditando.id}`, form);
      } else {
        await api.post('/clientes', form);
      }
      setModalAberto(false);
      carregarClientes();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar cliente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await api.delete(`/clientes/${id}`);
      setConfirmExcluir(null);
      carregarClientes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir cliente.');
    }
  };

  const f = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Cadastro e gestão de clientes</p>
        </div>
        <button onClick={abrirNovo} className="btn-jt self-start sm:self-auto">
          ➕ Novo Cliente
        </button>
      </div>

      {/* Busca */}
      <div className="jt-card">
        <input
          type="text"
          placeholder="🔍  Buscar por nome, WhatsApp ou email..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input-field w-full max-w-md"
        />
      </div>

      {/* Tabela */}
      <div className="jt-card p-0 overflow-hidden">
        {carregando ? (
          <div className="p-10 text-center text-gray-400">Carregando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-4xl mb-2">👤</p>
            <p>Nenhum cliente encontrado.</p>
            <button onClick={abrirNovo} className="btn-jt mt-4">Cadastrar primeiro cliente</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8f9fa' }}>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">WhatsApp</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Cidade</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                    <td className="px-4 py-3">
                      {c.telefone ? (
                        <a
                          href={linkWhatsApp(c.telefone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-medium"
                          style={{ color: '#25d366' }}
                        >
                          <span>📱</span>
                          {formatarWhatsApp(c.telefone)}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {c.cidade ? `${c.cidade}${c.estado ? `/${c.estado}` : ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirEditar(c)}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: 'rgba(0,180,255,0.1)', color: '#00b4ff' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmExcluir(c.id)}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header do modal */}
            <div
              className="px-6 py-4 flex items-center justify-between rounded-t-2xl"
              style={{ background: 'linear-gradient(135deg, #0a0a0f, #111118)', borderBottom: '1px solid rgba(233,30,140,0.2)' }}
            >
              <h2 className="text-lg font-bold text-white">
                {clienteEditando ? '✏️ Editar Cliente' : '➕ Novo Cliente'}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-5">
              {/* Dados principais */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">
                  Dados Pessoais
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Nome completo *</label>
                    <input
                      className="input-field"
                      value={form.nome}
                      onChange={(e) => f('nome', e.target.value)}
                      required
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <label className="label">WhatsApp *</label>
                    <input
                      className="input-field"
                      value={form.telefone}
                      onChange={(e) => f('telefone', e.target.value)}
                      required
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      value={form.email}
                      onChange={(e) => f('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-100">
                  Endereço <span className="text-gray-400 font-normal">(necessário para Leva e Traz)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Rua / Logradouro</label>
                    <input
                      className="input-field"
                      value={form.rua}
                      onChange={(e) => f('rua', e.target.value)}
                      placeholder="Rua, número e complemento"
                    />
                  </div>
                  <div>
                    <label className="label">Bairro</label>
                    <input
                      className="input-field"
                      value={form.bairro}
                      onChange={(e) => f('bairro', e.target.value)}
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <label className="label">CEP</label>
                    <input
                      className="input-field"
                      value={form.cep}
                      onChange={(e) => f('cep', e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <label className="label">Cidade</label>
                    <input
                      className="input-field"
                      value={form.cidade}
                      onChange={(e) => f('cidade', e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <label className="label">Estado (UF)</label>
                    <input
                      className="input-field"
                      value={form.estado}
                      onChange={(e) => f('estado', e.target.value.toUpperCase())}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="label">Observações</label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => f('observacoes', e.target.value)}
                  placeholder="Anotações sobre o cliente..."
                />
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                  ⚠️ {erro}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="btn-jt">
                  {salvando ? 'Salvando...' : clienteEditando ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-500 text-sm mb-5">
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmExcluir(null)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmExcluir)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: '#ef4444' }}
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
