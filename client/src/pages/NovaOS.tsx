import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  rua?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
}

interface Produto {
  id: string;
  nome: string;
  preco_venda: number;
  categoria: string;
}

interface ItemOS {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  descricao_manual?: string;
}

const GARANTIAS = [
  { label: '30 dias', value: 30 },
  { label: '60 dias', value: 60 },
  { label: '90 dias', value: 90 },
  { label: '180 dias (6 meses)', value: 180 },
  { label: '365 dias (1 ano)', value: 365 },
  { label: 'Sem garantia', value: 0 },
];

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

export default function NovaOS() {
  const navigate = useNavigate();

  // Cliente
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clientesSugestao, setClientesSugestao] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  // Aparelho
  const [aparelho, setAparelho] = useState({
    marca: '',
    modelo: '',
    cor: '',
    imei: '',
    acessorios: '',
  });

  // Serviço
  const [servico, setServico] = useState({
    problema_descrito: '',
    diagnostico: '',
    servico_realizado: '',
    garantia_dias: 90,
    valor_servico: '',
    observacoes: '',
  });

  // Leva e traz
  const [levaTraz, setLevaTraz] = useState(false);
  const [enderecoColeta, setEnderecoColeta] = useState('');

  // Itens / Peças
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosSugestao, setProdutosSugestao] = useState<Produto[]>([]);
  const [itens, setItens] = useState<ItemOS[]>([]);
  const [mostrarSugestoesProd, setMostrarSugestoesProd] = useState(false);

  // Estado geral
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Busca de clientes
  useEffect(() => {
    if (buscaCliente.length < 2) {
      setClientesSugestao([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/clientes?search=${encodeURIComponent(buscaCliente)}`)
        .then((res) => setClientesSugestao(res.data.data || res.data || []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  // Busca de produtos
  useEffect(() => {
    if (buscaProduto.length < 2) {
      setProdutosSugestao([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/produtos?search=${encodeURIComponent(buscaProduto)}`)
        .then((res) => setProdutosSugestao(res.data.data || res.data || []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [buscaProduto]);

  // Preencher endereço de coleta com dados do cliente
  useEffect(() => {
    if (levaTraz && clienteSelecionado) {
      const partes = [
        clienteSelecionado.rua,
        clienteSelecionado.bairro,
        clienteSelecionado.cidade,
        clienteSelecionado.estado,
        clienteSelecionado.cep,
      ].filter(Boolean);
      if (partes.length > 0) setEnderecoColeta(partes.join(', '));
    }
  }, [levaTraz, clienteSelecionado]);

  const selecionarCliente = (c: Cliente) => {
    setClienteSelecionado(c);
    setBuscaCliente(c.nome);
    setClientesSugestao([]);
    setMostrarSugestoes(false);
  };

  const adicionarItem = (p: Produto) => {
    const existente = itens.findIndex((i) => i.produto_id === p.id);
    if (existente >= 0) {
      const novos = [...itens];
      novos[existente].quantidade += 1;
      setItens(novos);
    } else {
      setItens([...itens, {
        produto_id: p.id,
        nome: p.nome,
        quantidade: 1,
        preco_unitario: p.preco_venda,
      }]);
    }
    setBuscaProduto('');
    setProdutosSugestao([]);
    setMostrarSugestoesProd(false);
  };

  const adicionarItemManual = () => {
    setItens([...itens, {
      produto_id: '',
      nome: '',
      quantidade: 1,
      preco_unitario: 0,
      descricao_manual: '',
    }]);
  };

  const atualizarItem = (idx: number, campo: keyof ItemOS, valor: string | number) => {
    const novos = [...itens];
    (novos[idx] as any)[campo] = valor;
    setItens(novos);
  };

  const removerItem = (idx: number) => {
    setItens(itens.filter((_, i) => i !== idx));
  };

  const totalPecas = itens.reduce((acc, i) => acc + i.quantidade * i.preco_unitario, 0);
  const totalServico = parseFloat(servico.valor_servico || '0') || 0;
  const totalFinal = totalPecas + totalServico;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!clienteSelecionado) {
      setErro('Selecione um cliente para continuar.');
      return;
    }
    if (!aparelho.marca || !aparelho.modelo) {
      setErro('Informe a marca e o modelo do aparelho.');
      return;
    }
    if (!servico.problema_descrito) {
      setErro('Descreva o problema relatado pelo cliente.');
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        cliente_id: clienteSelecionado.id,
        aparelho_marca: aparelho.marca,
        aparelho_modelo: aparelho.modelo,
        aparelho_cor: aparelho.cor,
        aparelho_imei: aparelho.imei,
        acessorios: aparelho.acessorios,
        problema_descrito: servico.problema_descrito,
        diagnostico: servico.diagnostico,
        servico_realizado: servico.servico_realizado,
        garantia_dias: servico.garantia_dias,
        valor_servico: totalServico,
        valor_pecas: totalPecas,
        valor_final: totalFinal,
        leva_traz: levaTraz,
        endereco_coleta: levaTraz ? enderecoColeta : null,
        observacoes: servico.observacoes,
        itens: itens.map((i) => ({
          produto_id: i.produto_id || null,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          descricao_manual: i.descricao_manual || i.nome,
        })),
      };

      const res = await api.post('/os', payload);
      const osId = res.data.data?.id || res.data?.id;
      navigate(`/os/${osId}`);
    } catch (err: any) {
      setErro(err.response?.data?.error || 'Erro ao criar ordem de serviço.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📋 Nova Ordem de Serviço</h1>
        <p className="text-gray-500 text-sm mt-0.5">Preencha os dados para abrir uma nova OS</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── SEÇÃO 1: CLIENTE ── */}
        <div className="jt-card space-y-4">
          <h2 className="section-title">👤 Cliente</h2>

          <div className="relative">
            <label className="label">Buscar cliente *</label>
            <input
              ref={buscaRef}
              type="text"
              className="input-field"
              placeholder="Digite o nome ou WhatsApp do cliente..."
              value={buscaCliente}
              onChange={(e) => {
                setBuscaCliente(e.target.value);
                setClienteSelecionado(null);
                setMostrarSugestoes(true);
              }}
              onFocus={() => setMostrarSugestoes(true)}
            />
            {mostrarSugestoes && clientesSugestao.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {clientesSugestao.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{c.nome}</span>
                    <span className="text-gray-400 ml-2 text-xs">📱 {c.telefone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {clienteSelecionado && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(0,180,255,0.08)', border: '1px solid rgba(0,180,255,0.2)' }}
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-gray-900">{clienteSelecionado.nome}</p>
                <p className="text-sm text-gray-500">📱 {clienteSelecionado.telefone}</p>
              </div>
              <button
                type="button"
                onClick={() => { setClienteSelecionado(null); setBuscaCliente(''); }}
                className="ml-auto text-xs text-gray-400 hover:text-red-500"
              >
                Trocar
              </button>
            </div>
          )}

          {/* Leva e Traz */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setLevaTraz(!levaTraz)}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${levaTraz ? '' : 'bg-gray-200'}`}
                style={levaTraz ? { background: 'linear-gradient(135deg, #e91e8c, #00b4ff)' } : {}}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${levaTraz ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </div>
              <span className="font-medium text-gray-700">🚗 Leva e Traz</span>
              <span className="text-xs text-gray-400">(coleta e entrega em domicílio)</span>
            </label>

            {levaTraz && (
              <div className="mt-3">
                <label className="label">Endereço de coleta</label>
                <input
                  className="input-field"
                  value={enderecoColeta}
                  onChange={(e) => setEnderecoColeta(e.target.value)}
                  placeholder="Rua, número, bairro, cidade..."
                />
              </div>
            )}
          </div>
        </div>

        {/* ── SEÇÃO 2: APARELHO ── */}
        <div className="jt-card space-y-4">
          <h2 className="section-title">📱 Dados do Aparelho</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Marca *</label>
              <input
                className="input-field"
                value={aparelho.marca}
                onChange={(e) => setAparelho({ ...aparelho, marca: e.target.value })}
                required
                placeholder="Samsung, Apple, Motorola..."
              />
            </div>
            <div>
              <label className="label">Modelo *</label>
              <input
                className="input-field"
                value={aparelho.modelo}
                onChange={(e) => setAparelho({ ...aparelho, modelo: e.target.value })}
                required
                placeholder="Galaxy A32, iPhone 13..."
              />
            </div>
            <div>
              <label className="label">Cor</label>
              <input
                className="input-field"
                value={aparelho.cor}
                onChange={(e) => setAparelho({ ...aparelho, cor: e.target.value })}
                placeholder="Preto, Azul, Dourado..."
              />
            </div>
            <div>
              <label className="label">IMEI / Número de série</label>
              <input
                className="input-field"
                value={aparelho.imei}
                onChange={(e) => setAparelho({ ...aparelho, imei: e.target.value })}
                placeholder="IMEI ou S/N do aparelho"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Acessórios entregues</label>
              <input
                className="input-field"
                value={aparelho.acessorios}
                onChange={(e) => setAparelho({ ...aparelho, acessorios: e.target.value })}
                placeholder="Capinha, carregador, fone... (deixe em branco se nenhum)"
              />
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 3: SERVIÇO ── */}
        <div className="jt-card space-y-4">
          <h2 className="section-title">🔧 Serviço</h2>
          <div>
            <label className="label">Problema relatado pelo cliente *</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={servico.problema_descrito}
              onChange={(e) => setServico({ ...servico, problema_descrito: e.target.value })}
              required
              placeholder="Descreva o que o cliente relatou sobre o problema..."
            />
          </div>
          <div>
            <label className="label">Diagnóstico técnico</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={servico.diagnostico}
              onChange={(e) => setServico({ ...servico, diagnostico: e.target.value })}
              placeholder="Diagnóstico após análise técnica (pode preencher depois)..."
            />
          </div>
          <div>
            <label className="label">Serviço realizado</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={servico.servico_realizado}
              onChange={(e) => setServico({ ...servico, servico_realizado: e.target.value })}
              placeholder="Descreva o serviço executado (pode preencher depois)..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Garantia do serviço *</label>
              <select
                className="input-field"
                value={servico.garantia_dias}
                onChange={(e) => setServico({ ...servico, garantia_dias: parseInt(e.target.value) })}
              >
                {GARANTIAS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Valor do serviço / mão de obra (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field"
                value={servico.valor_servico}
                onChange={(e) => setServico({ ...servico, valor_servico: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label className="label">Observações internas</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={servico.observacoes}
              onChange={(e) => setServico({ ...servico, observacoes: e.target.value })}
              placeholder="Anotações internas, não aparece no PDF do cliente..."
            />
          </div>
        </div>

        {/* ── SEÇÃO 4: PEÇAS / ITENS ── */}
        <div className="jt-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title mb-0">🔩 Peças e Materiais</h2>
            <button
              type="button"
              onClick={adicionarItemManual}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c' }}
            >
              + Item manual
            </button>
          </div>

          {/* Busca de produto */}
          <div className="relative">
            <input
              type="text"
              className="input-field"
              placeholder="🔍  Buscar peça ou serviço do catálogo..."
              value={buscaProduto}
              onChange={(e) => { setBuscaProduto(e.target.value); setMostrarSugestoesProd(true); }}
              onFocus={() => setMostrarSugestoesProd(true)}
            />
            {mostrarSugestoesProd && produtosSugestao.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {produtosSugestao.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => adicionarItem(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{p.nome}</span>
                    <span className="text-gray-400 ml-2 text-xs">{p.categoria}</span>
                    <span className="float-right font-medium" style={{ color: '#166534' }}>
                      {formatarMoeda(p.preco_venda)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de itens */}
          {itens.length > 0 && (
            <div className="space-y-2">
              {itens.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: '#f8f9fa', border: '1px solid #e5e7eb' }}
                >
                  <div className="flex-1 min-w-0">
                    {item.produto_id ? (
                      <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                    ) : (
                      <input
                        className="input-field text-sm py-1"
                        placeholder="Nome do item..."
                        value={item.nome}
                        onChange={(e) => atualizarItem(idx, 'nome', e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-500">Qtd:</span>
                    <input
                      type="number"
                      min="1"
                      className="input-field text-sm py-1 w-16 text-center"
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(idx, 'quantidade', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field text-sm py-1 w-24"
                      value={item.preco_unitario}
                      onChange={(e) => atualizarItem(idx, 'preco_unitario', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <span className="text-sm font-semibold shrink-0" style={{ color: '#166534', minWidth: 70, textAlign: 'right' }}>
                    {formatarMoeda(item.quantidade * item.preco_unitario)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removerItem(idx)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {itens.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">Nenhuma peça adicionada. Você pode adicionar depois.</p>
          )}
        </div>

        {/* ── RESUMO DE VALORES ── */}
        <div
          className="jt-card"
          style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.05), rgba(0,180,255,0.05))', border: '1px solid rgba(233,30,140,0.15)' }}
        >
          <h2 className="section-title">💰 Resumo de Valores</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Peças e materiais:</span>
              <span className="font-medium">{formatarMoeda(totalPecas)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Mão de obra / serviço:</span>
              <span className="font-medium">{formatarMoeda(totalServico)}</span>
            </div>
            <div
              className="flex justify-between text-lg font-bold pt-2"
              style={{ borderTop: '2px solid rgba(233,30,140,0.2)', color: '#e91e8c' }}
            >
              <span>Total da OS:</span>
              <span>{formatarMoeda(totalFinal)}</span>
            </div>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
            ⚠️ {erro}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3 justify-end pb-6">
          <button type="button" onClick={() => navigate('/os')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn-jt">
            {salvando ? '⏳ Criando OS...' : '✅ Criar Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  );
}
