import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';

interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  categoria: string;
  marca?: string;
  modelo?: string;
  preco_custo?: number;
  preco_venda: number;
  estoque: number;
  estoque_minimo: number;
  ativo: boolean;
}

const FORM_VAZIO = {
  nome: '',
  descricao: '',
  categoria: '',
  marca: '',
  modelo: '',
  preco_custo: '',
  preco_venda: '',
  estoque: '0',
  estoque_minimo: '2',
};

const CATEGORIAS = [
  'Tela / Display',
  'Bateria',
  'Conector de Carga',
  'Câmera',
  'Alto-falante / Microfone',
  'Carcaça / Chassi',
  'Placa / Componente',
  'Cabo Flex',
  'Botão / Switch',
  'Serviço de Mão de Obra',
  'Acessório',
  'Outro',
];

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);
  const [form, setForm] = useState({ ...FORM_VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [confirmExcluir, setConfirmExcluir] = useState<string | null>(null);

  const carregarProdutos = useCallback(() => {
    setCarregando(true);
    const params = new URLSearchParams();
    if (busca) params.set('search', busca);
    if (filtroCategoria) params.set('categoria', filtroCategoria);
    api.get(`/produtos?${params}`)
      .then((res) => setProdutos(res.data.data || res.data || []))
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, [busca, filtroCategoria]);

  useEffect(() => {
    const t = setTimeout(carregarProdutos, 300);
    return () => clearTimeout(t);
  }, [carregarProdutos]);

  const abrirNovo = () => {
    setProdutoEditando(null);
    setForm({ ...FORM_VAZIO });
    setErro('');
    setModalAberto(true);
  };

  const abrirEditar = (p: Produto) => {
    setProdutoEditando(p);
    setForm({
      nome: p.nome || '',
      descricao: p.descricao || '',
      categoria: p.categoria || '',
      marca: p.marca || '',
      modelo: p.modelo || '',
      preco_custo: p.preco_custo != null ? String(p.preco_custo) : '',
      preco_venda: String(p.preco_venda || ''),
      estoque: String(p.estoque || 0),
      estoque_minimo: String(p.estoque_minimo || 2),
    });
    setErro('');
    setModalAberto(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    const payload = {
      ...form,
      preco_custo: form.preco_custo ? parseFloat(form.preco_custo) : null,
      preco_venda: parseFloat(form.preco_venda),
      estoque: parseInt(form.estoque),
      estoque_minimo: parseInt(form.estoque_minimo),
    };
    try {
      if (produtoEditando) {
        await api.put(`/produtos/${produtoEditando.id}`, payload);
      } else {
        await api.post('/produtos', payload);
      }
      setModalAberto(false);
      carregarProdutos();
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao salvar produto.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await api.delete(`/produtos/${id}`);
      setConfirmExcluir(null);
      carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao excluir produto.');
    }
  };

  const f = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const estoqueBaixo = produtos.filter((p) => p.estoque <= p.estoque_minimo && p.ativo);

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔩 Produtos / Peças</h1>
          <p className="text-gray-500 text-sm mt-0.5">Catálogo de peças, serviços e componentes</p>
        </div>
        <button onClick={abrirNovo} className="btn-jt self-start sm:self-auto">
          ➕ Novo Produto
        </button>
      </div>

      {/* Alerta estoque baixo */}
      {estoqueBaixo.length > 0 && (
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}
        >
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="font-semibold text-orange-800 text-sm">Estoque baixo em {estoqueBaixo.length} produto(s):</p>
            <p className="text-orange-700 text-sm mt-0.5">
              {estoqueBaixo.map((p) => `${p.nome} (${p.estoque} un.)`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="jt-card flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="🔍  Buscar por nome ou marca..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="input-field flex-1"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="input-field sm:w-56"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="jt-card p-0 overflow-hidden">
        {carregando ? (
          <div className="p-10 text-center text-gray-400">Carregando produtos...</div>
        ) : produtos.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-4xl mb-2">🔩</p>
            <p>Nenhum produto encontrado.</p>
            <button onClick={abrirNovo} className="btn-jt mt-4">Cadastrar primeiro produto</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: '#f8f9fa' }}>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Marca/Modelo</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Preço Venda</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Estoque</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {produtos.map((p) => {
                  const baixo = p.estoque <= p.estoque_minimo;
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.ativo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.nome}</p>
                        {p.descricao && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{p.descricao}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: 'rgba(0,180,255,0.1)', color: '#0284c7' }}
                        >
                          {p.categoria}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {[p.marca, p.modelo].filter(Boolean).join(' / ') || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: '#166534' }}>
                        {formatarMoeda(p.preco_venda)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={
                            baixo
                              ? { background: '#fee2e2', color: '#991b1b' }
                              : { background: '#dcfce7', color: '#166534' }
                          }
                        >
                          {p.estoque} un.{baixo ? ' ⚠️' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirEditar(p)}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(0,180,255,0.1)', color: '#00b4ff' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmExcluir(p.id)}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastro/Edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div
              className="px-6 py-4 flex items-center justify-between rounded-t-2xl"
              style={{ background: 'linear-gradient(135deg, #0a0a0f, #111118)', borderBottom: '1px solid rgba(233,30,140,0.2)' }}
            >
              <h2 className="text-lg font-bold text-white">
                {produtoEditando ? '✏️ Editar Produto' : '➕ Novo Produto'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSalvar} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Nome do produto / serviço *</label>
                  <input
                    className="input-field"
                    value={form.nome}
                    onChange={(e) => f('nome', e.target.value)}
                    required
                    placeholder="Ex: Tela Samsung A32, Troca de Bateria..."
                  />
                </div>
                <div>
                  <label className="label">Categoria *</label>
                  <select
                    className="input-field"
                    value={form.categoria}
                    onChange={(e) => f('categoria', e.target.value)}
                    required
                  >
                    <option value="">Selecione...</option>
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Marca</label>
                  <input
                    className="input-field"
                    value={form.marca}
                    onChange={(e) => f('marca', e.target.value)}
                    placeholder="Samsung, Apple, Motorola..."
                  />
                </div>
                <div>
                  <label className="label">Modelo compatível</label>
                  <input
                    className="input-field"
                    value={form.modelo}
                    onChange={(e) => f('modelo', e.target.value)}
                    placeholder="A32, iPhone 13..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Descrição</label>
                  <input
                    className="input-field"
                    value={form.descricao}
                    onChange={(e) => f('descricao', e.target.value)}
                    placeholder="Detalhes adicionais..."
                  />
                </div>
                <div>
                  <label className="label">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field"
                    value={form.preco_custo}
                    onChange={(e) => f('preco_custo', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="label">Preço de Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field"
                    value={form.preco_venda}
                    onChange={(e) => f('preco_venda', e.target.value)}
                    required
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="label">Estoque atual</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.estoque}
                    onChange={(e) => f('estoque', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Estoque mínimo (alerta)</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.estoque_minimo}
                    onChange={(e) => f('estoque_minimo', e.target.value)}
                  />
                </div>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                  ⚠️ {erro}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={salvando} className="btn-jt">
                  {salvando ? 'Salvando...' : produtoEditando ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-500 text-sm mb-5">Tem certeza que deseja excluir este produto?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmExcluir(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => handleExcluir(confirmExcluir)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
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
