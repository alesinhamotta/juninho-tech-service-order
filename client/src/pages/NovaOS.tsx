import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface Cliente { id: number; nome: string; telefone: string; email?: string; }
interface Produto { id: number; nome: string; preco_venda: number; preco_custo: number; categoria: string; }
interface ItemOS {
  produto_id: number | null;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario: number;
  categoria_item: 'PRODUTO' | 'SERVICO';
  eh_brinde: boolean;
}

const GARANTIAS = [
  { value: 30,  label: '30 dias' },
  { value: 90,  label: '90 dias' },
  { value: 180, label: '180 dias' },
  { value: 365, label: '1 ano' },
];

const FORMAS_PAGAMENTO = [
  { value: 'PENDENTE',  label: 'Pendente (definir depois)' },
  { value: 'PIX',       label: 'Pix' },
  { value: 'DINHEIRO',  label: 'Dinheiro' },
  { value: 'DEBITO',    label: 'Cartão de Débito' },
  { value: 'CREDITO',   label: 'Cartão de Crédito (1x)' },
  { value: 'PARCELADO', label: 'Cartão Parcelado' },
];

const formatarMoeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarPct = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';

// ─── Componente ─────────────────────────────────────────────────────────────
export default function NovaOS() {
  const navigate = useNavigate();

  // Dados do aparelho / serviço
  const [cliente_id, setClienteId] = useState<number | ''>('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [mostrarClientes, setMostrarClientes] = useState(false);

  const [aparelho, setAparelho] = useState({
    marca: '', modelo: '', cor: '', imei: '', acessorios: '',
  });
  const [servico, setServico] = useState({
    problema_descrito: '', diagnostico: '', servico_realizado: '',
    garantia_dias: 90, valor_servico: '', custo_servico: '', observacoes: '',
  });

  // Itens / peças
  const [itens, setItens] = useState<ItemOS[]>([]);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtosSugestao, setProdutosSugestao] = useState<Produto[]>([]);
  const [mostrarSugestoesProd, setMostrarSugestoesProd] = useState(false);

  // Brinde
  const [brinde, setBrinde] = useState({ descricao: '', custo: '' });

  // Pagamento
  const [pagamento, setPagamento] = useState({
    forma: 'PENDENTE',
    parcelas: 1,
    taxa_maquininha: 0,
    desconto: 0,
  });

  // Logística
  const [leva_traz, setLevaTraz] = useState(false);
  const [endereco_coleta, setEnderecoColeta] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // ─── Busca de clientes ───────────────────────────────────────────────────
  useEffect(() => {
    if (buscaCliente.length < 2) { setClientes([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get(`/clientes?search=${encodeURIComponent(buscaCliente)}&limit=8`);
        setClientes(r.data.data || []);
        setMostrarClientes(true);
      } catch { setClientes([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [buscaCliente]);

  // ─── Busca de produtos ───────────────────────────────────────────────────
  useEffect(() => {
    if (buscaProduto.length < 2) { setProdutosSugestao([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get(`/produtos?search=${encodeURIComponent(buscaProduto)}&limit=8`);
        setProdutosSugestao(r.data.data || []);
        setMostrarSugestoesProd(true);
      } catch { setProdutosSugestao([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [buscaProduto]);

  // ─── Cálculos financeiros ────────────────────────────────────────────────
  const totalPecasVenda = itens
    .filter((i) => !i.eh_brinde)
    .reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);

  const totalPecasCusto = itens
    .reduce((s, i) => s + i.quantidade * i.custo_unitario, 0);

  const valorServico = parseFloat(servico.valor_servico || '0') || 0;
  const custoServico = parseFloat(servico.custo_servico || '0') || 0;
  const custoBrinde = parseFloat(brinde.custo || '0') || 0;

  // Valor final cobrado do cliente (peças + serviço)
  const valorFinalBruto = totalPecasVenda + valorServico;
  // Após desconto
  const valorFinalComDesconto = Math.max(0, valorFinalBruto - pagamento.desconto);
  // Taxa da maquininha
  const valorTaxa = parseFloat(((valorFinalComDesconto * pagamento.taxa_maquininha) / 100).toFixed(2));
  // O que o técnico recebe
  const valorRecebido = parseFloat((valorFinalComDesconto - valorTaxa).toFixed(2));
  // Custo total interno
  const custoTotal = parseFloat((totalPecasCusto + custoServico + custoBrinde).toFixed(2));
  // Lucro líquido
  const lucroLiquido = parseFloat((valorRecebido - custoTotal).toFixed(2));
  // Margem
  const margem = valorRecebido > 0
    ? parseFloat(((lucroLiquido / valorRecebido) * 100).toFixed(2))
    : 0;

  // ─── Helpers de itens ────────────────────────────────────────────────────
  const adicionarItem = (p: Produto) => {
    setItens((prev) => [
      ...prev,
      {
        produto_id: p.id,
        nome: p.nome,
        quantidade: 1,
        preco_unitario: p.preco_venda,
        custo_unitario: p.preco_custo || 0,
        categoria_item: 'PRODUTO',
        eh_brinde: false,
      },
    ]);
    setBuscaProduto('');
    setMostrarSugestoesProd(false);
  };

  const adicionarItemManual = () => {
    setItens((prev) => [
      ...prev,
      { produto_id: null, nome: '', quantidade: 1, preco_unitario: 0, custo_unitario: 0, categoria_item: 'PRODUTO', eh_brinde: false },
    ]);
  };

  const atualizarItem = (idx: number, campo: keyof ItemOS, valor: unknown) => {
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  };

  const removerItem = (idx: number) => setItens((prev) => prev.filter((_, i) => i !== idx));

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente_id) { setErro('Selecione um cliente'); return; }
    if (!aparelho.marca || !aparelho.modelo) { setErro('Informe a marca e o modelo do aparelho'); return; }

    setSalvando(true);
    setErro('');
    try {
      await api.post('/os', {
        cliente_id,
        aparelho_marca: aparelho.marca,
        aparelho_modelo: aparelho.modelo,
        aparelho_cor: aparelho.cor || null,
        aparelho_imei: aparelho.imei || null,
        acessorios: aparelho.acessorios || null,
        problema_descrito: servico.problema_descrito || null,
        diagnostico: servico.diagnostico || null,
        servico_realizado: servico.servico_realizado || null,
        garantia_dias: servico.garantia_dias,
        valor_pecas: totalPecasVenda,
        valor_servico: valorServico,
        valor_final: valorFinalComDesconto,
        // Financeiro interno
        custo_pecas: totalPecasCusto,
        custo_servico: custoServico,
        taxa_maquininha: pagamento.taxa_maquininha,
        forma_pagamento: pagamento.forma,
        parcelas: pagamento.parcelas,
        desconto: pagamento.desconto,
        brinde_descricao: brinde.descricao || null,
        brinde_custo: custoBrinde,
        // Logística
        leva_traz,
        endereco_coleta: leva_traz ? endereco_coleta : null,
        observacoes: servico.observacoes || null,
        itens: itens.map((it) => ({
          produto_id: it.produto_id,
          descricao_manual: it.nome,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          custo_unitario: it.custo_unitario,
          categoria_item: it.categoria_item,
          eh_brinde: it.eh_brinde,
        })),
      });
      navigate('/os');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; detalhe?: string } } })?.response?.data;
      setErro(msg?.detalhe || msg?.error || 'Erro ao criar OS');
    } finally {
      setSalvando(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nova Ordem de Serviço</h1>
          <p className="text-sm text-gray-500 mt-0.5">Preencha os dados para criar a OS</p>
        </div>
      </div>

      {/* ── SEÇÃO 1: CLIENTE ── */}
      <div className="jt-card space-y-4">
        <h2 className="section-title">Cliente</h2>
        <div className="relative">
          <label className="label">Buscar cliente *</label>
          <input
            className="input-field"
            placeholder="Digite o nome ou telefone..."
            value={buscaCliente}
            onChange={(e) => { setBuscaCliente(e.target.value); setClienteId(''); }}
            onFocus={() => buscaCliente.length >= 2 && setMostrarClientes(true)}
          />
          {mostrarClientes && clientes.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {clientes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setClienteId(c.id); setBuscaCliente(c.nome); setMostrarClientes(false); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-pink-50 text-sm border-b border-gray-50 last:border-0 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{c.nome}</span>
                  <span className="text-gray-400 ml-2">{c.telefone}</span>
                </button>
              ))}
            </div>
          )}
          {cliente_id && (
            <p className="text-xs text-green-600 mt-1 font-medium">Cliente selecionado</p>
          )}
        </div>
      </div>

      {/* ── SEÇÃO 2: APARELHO ── */}
      <div className="jt-card space-y-4">
        <h2 className="section-title">Aparelho</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Marca *</label>
            <input className="input-field" placeholder="Ex: Apple, Samsung..." value={aparelho.marca}
              onChange={(e) => setAparelho({ ...aparelho, marca: e.target.value })} />
          </div>
          <div>
            <label className="label">Modelo *</label>
            <input className="input-field" placeholder="Ex: iPhone 14, Galaxy S23..." value={aparelho.modelo}
              onChange={(e) => setAparelho({ ...aparelho, modelo: e.target.value })} />
          </div>
          <div>
            <label className="label">Cor</label>
            <input className="input-field" placeholder="Ex: Preto, Branco..." value={aparelho.cor}
              onChange={(e) => setAparelho({ ...aparelho, cor: e.target.value })} />
          </div>
          <div>
            <label className="label">IMEI / Nº de Série</label>
            <input className="input-field" placeholder="IMEI ou número de série" value={aparelho.imei}
              onChange={(e) => setAparelho({ ...aparelho, imei: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Acessórios entregues</label>
          <input className="input-field" placeholder="Ex: Carregador, capa, caixa..." value={aparelho.acessorios}
            onChange={(e) => setAparelho({ ...aparelho, acessorios: e.target.value })} />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input type="checkbox" id="leva_traz" checked={leva_traz}
            onChange={(e) => setLevaTraz(e.target.checked)} className="w-4 h-4 accent-pink-500" />
          <label htmlFor="leva_traz" className="text-sm font-medium text-gray-700">Serviço Leva e Traz</label>
        </div>
        {leva_traz && (
          <div>
            <label className="label">Endereço de coleta</label>
            <input className="input-field" placeholder="Rua, número, bairro, cidade..." value={endereco_coleta}
              onChange={(e) => setEnderecoColeta(e.target.value)} />
          </div>
        )}
      </div>

      {/* ── SEÇÃO 3: SERVIÇO ── */}
      <div className="jt-card space-y-4">
        <h2 className="section-title">Serviço</h2>
        <div>
          <label className="label">Problema relatado pelo cliente *</label>
          <textarea className="input-field resize-none" rows={2} value={servico.problema_descrito}
            onChange={(e) => setServico({ ...servico, problema_descrito: e.target.value })}
            placeholder="Descreva o que o cliente relatou..." />
        </div>
        <div>
          <label className="label">Diagnóstico técnico</label>
          <textarea className="input-field resize-none" rows={2} value={servico.diagnostico}
            onChange={(e) => setServico({ ...servico, diagnostico: e.target.value })}
            placeholder="Diagnóstico após análise (pode preencher depois)..." />
        </div>
        <div>
          <label className="label">Serviço realizado</label>
          <textarea className="input-field resize-none" rows={2} value={servico.servico_realizado}
            onChange={(e) => setServico({ ...servico, servico_realizado: e.target.value })}
            placeholder="Descreva o serviço executado (pode preencher depois)..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Garantia do serviço</label>
            <select className="input-field" value={servico.garantia_dias}
              onChange={(e) => setServico({ ...servico, garantia_dias: parseInt(e.target.value) })}>
              {GARANTIAS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Valor do serviço (R$)</label>
            <input type="number" step="0.01" min="0" className="input-field"
              value={servico.valor_servico}
              onChange={(e) => setServico({ ...servico, valor_servico: e.target.value })}
              placeholder="0,00" />
          </div>
          <div>
            <label className="label" title="Custo interno — não aparece para o cliente">
              Custo do serviço (R$) <span className="text-pink-400 text-xs">[interno]</span>
            </label>
            <input type="number" step="0.01" min="0" className="input-field"
              value={servico.custo_servico}
              onChange={(e) => setServico({ ...servico, custo_servico: e.target.value })}
              placeholder="0,00" />
          </div>
        </div>
        <div>
          <label className="label">Observações internas</label>
          <textarea className="input-field resize-none" rows={2} value={servico.observacoes}
            onChange={(e) => setServico({ ...servico, observacoes: e.target.value })}
            placeholder="Anotações internas — não aparece no PDF do cliente..." />
        </div>
      </div>

      {/* ── SEÇÃO 4: PEÇAS ── */}
      <div className="jt-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title mb-0">Pecas e Materiais</h2>
          <button type="button" onClick={adicionarItemManual}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c' }}>
            + Item manual
          </button>
        </div>

        <div className="relative">
          <input type="text" className="input-field"
            placeholder="Buscar peca ou servico do catalogo..."
            value={buscaProduto}
            onChange={(e) => { setBuscaProduto(e.target.value); setMostrarSugestoesProd(true); }}
            onFocus={() => setMostrarSugestoesProd(true)} />
          {mostrarSugestoesProd && produtosSugestao.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {produtosSugestao.map((p) => (
                <button key={p.id} type="button" onClick={() => adicionarItem(p)}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0 transition-colors">
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

        {itens.length > 0 && (
          <div className="space-y-2">
            {/* Cabeçalho */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-3">
              <span className="col-span-3">Item</span>
              <span className="col-span-1 text-center">Qtd</span>
              <span className="col-span-2 text-center">Venda R$</span>
              <span className="col-span-2 text-center text-pink-400">Custo R$ [int]</span>
              <span className="col-span-2 text-center">Tipo</span>
              <span className="col-span-1 text-center">Brinde</span>
              <span className="col-span-1"></span>
            </div>
            {itens.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-xl"
                style={{ background: item.eh_brinde ? 'rgba(233,30,140,0.04)' : '#f8f9fa', border: `1px solid ${item.eh_brinde ? 'rgba(233,30,140,0.2)' : '#e5e7eb'}` }}>
                {/* Nome */}
                <div className="col-span-3">
                  {item.produto_id ? (
                    <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                  ) : (
                    <input className="input-field text-sm py-1" placeholder="Nome..."
                      value={item.nome} onChange={(e) => atualizarItem(idx, 'nome', e.target.value)} />
                  )}
                </div>
                {/* Qtd */}
                <div className="col-span-1">
                  <input type="number" min="1" className="input-field text-sm py-1 text-center"
                    value={item.quantidade}
                    onChange={(e) => atualizarItem(idx, 'quantidade', parseInt(e.target.value) || 1)} />
                </div>
                {/* Preço venda */}
                <div className="col-span-2">
                  <input type="number" step="0.01" min="0" className="input-field text-sm py-1"
                    value={item.preco_unitario}
                    onChange={(e) => atualizarItem(idx, 'preco_unitario', parseFloat(e.target.value) || 0)} />
                </div>
                {/* Custo interno */}
                <div className="col-span-2">
                  <input type="number" step="0.01" min="0"
                    className="input-field text-sm py-1"
                    style={{ borderColor: 'rgba(233,30,140,0.3)' }}
                    value={item.custo_unitario}
                    onChange={(e) => atualizarItem(idx, 'custo_unitario', parseFloat(e.target.value) || 0)}
                    placeholder="Custo" />
                </div>
                {/* Tipo */}
                <div className="col-span-2">
                  <select className="input-field text-sm py-1" value={item.categoria_item}
                    onChange={(e) => atualizarItem(idx, 'categoria_item', e.target.value as 'PRODUTO' | 'SERVICO')}>
                    <option value="PRODUTO">Produto</option>
                    <option value="SERVICO">Servico</option>
                  </select>
                </div>
                {/* Brinde */}
                <div className="col-span-1 flex justify-center">
                  <input type="checkbox" checked={item.eh_brinde}
                    onChange={(e) => atualizarItem(idx, 'eh_brinde', e.target.checked)}
                    className="w-4 h-4 accent-pink-500" title="Marcar como brinde" />
                </div>
                {/* Remover */}
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => removerItem(idx)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {itens.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Nenhuma peca adicionada. Voce pode adicionar depois.</p>
        )}
      </div>

      {/* ── SEÇÃO 5: BRINDE ── */}
      <div className="jt-card space-y-4">
        <h2 className="section-title">Brinde <span className="text-xs font-normal text-gray-400">(nao aparece para o cliente)</span></h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Descricao do brinde</label>
            <input className="input-field" placeholder="Ex: Pelicula de vidro, capa..." value={brinde.descricao}
              onChange={(e) => setBrinde({ ...brinde, descricao: e.target.value })} />
          </div>
          <div>
            <label className="label text-pink-500">Custo do brinde (R$) [interno]</label>
            <input type="number" step="0.01" min="0" className="input-field"
              value={brinde.custo}
              onChange={(e) => setBrinde({ ...brinde, custo: e.target.value })}
              placeholder="0,00" />
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 6: PAGAMENTO ── */}
      <div className="jt-card space-y-4">
        <h2 className="section-title">Pagamento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Forma de pagamento</label>
            <select className="input-field" value={pagamento.forma}
              onChange={(e) => {
                const f = e.target.value;
                // Sugestao de taxa por forma
                const taxaSugerida = f === 'DEBITO' ? 2 : f === 'CREDITO' ? 5 : f === 'PARCELADO' ? 10 : 0;
                setPagamento({ ...pagamento, forma: f, taxa_maquininha: taxaSugerida });
              }}>
              {FORMAS_PAGAMENTO.map((fp) => <option key={fp.value} value={fp.value}>{fp.label}</option>)}
            </select>
          </div>
          {(pagamento.forma === 'PARCELADO') && (
            <div>
              <label className="label">Numero de parcelas</label>
              <input type="number" min="2" max="24" className="input-field"
                value={pagamento.parcelas}
                onChange={(e) => setPagamento({ ...pagamento, parcelas: parseInt(e.target.value) || 1 })} />
            </div>
          )}
          {pagamento.forma !== 'PIX' && pagamento.forma !== 'DINHEIRO' && pagamento.forma !== 'PENDENTE' && (
            <div>
              <label className="label text-pink-500">
                Taxa da maquininha (%) <span className="text-xs font-normal text-gray-400">[interno]</span>
              </label>
              <input type="number" step="0.01" min="0" max="100" className="input-field"
                value={pagamento.taxa_maquininha}
                onChange={(e) => setPagamento({ ...pagamento, taxa_maquininha: parseFloat(e.target.value) || 0 })}
                placeholder="Ex: 16.67" />
              {pagamento.taxa_maquininha > 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Taxa: {formatarMoeda(valorTaxa)} | Voce recebe: {formatarMoeda(valorRecebido)}
                </p>
              )}
            </div>
          )}
          <div>
            <label className="label">Desconto (R$)</label>
            <input type="number" step="0.01" min="0" className="input-field"
              value={pagamento.desconto}
              onChange={(e) => setPagamento({ ...pagamento, desconto: parseFloat(e.target.value) || 0 })}
              placeholder="0,00" />
          </div>
        </div>
      </div>

      {/* ── RESUMO FINANCEIRO ── */}
      <div className="jt-card space-y-3">
        <h2 className="section-title">Resumo Financeiro</h2>

        {/* Valores para o cliente */}
        <div className="p-3 rounded-xl" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p className="text-xs font-semibold text-green-700 mb-2 uppercase tracking-wide">Valores do cliente</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Pecas e materiais:</span>
              <span className="font-medium">{formatarMoeda(totalPecasVenda)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Mao de obra / servico:</span>
              <span className="font-medium">{formatarMoeda(valorServico)}</span>
            </div>
            {pagamento.desconto > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto:</span>
                <span className="font-medium">- {formatarMoeda(pagamento.desconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2"
              style={{ borderTop: '2px solid #bbf7d0', color: '#166534' }}>
              <span>Total cobrado:</span>
              <span>{formatarMoeda(valorFinalComDesconto)}</span>
            </div>
            {pagamento.forma !== 'PENDENTE' && pagamento.forma !== 'PIX' && pagamento.forma !== 'DINHEIRO' && pagamento.parcelas > 1 && (
              <p className="text-xs text-gray-500 text-right">
                {pagamento.parcelas}x de {formatarMoeda(valorFinalComDesconto / pagamento.parcelas)}
              </p>
            )}
          </div>
        </div>

        {/* Financeiro interno */}
        <div className="p-3 rounded-xl" style={{ background: 'rgba(233,30,140,0.04)', border: '1px solid rgba(233,30,140,0.15)' }}>
          <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#e91e8c' }}>
            Financeiro interno (nao aparece para o cliente)
          </p>
          <div className="space-y-1 text-sm">
            {pagamento.taxa_maquininha > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Taxa maquininha ({pagamento.taxa_maquininha}%):</span>
                <span className="font-medium text-red-500">- {formatarMoeda(valorTaxa)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Voce recebe:</span>
              <span className="font-medium text-blue-600">{formatarMoeda(valorRecebido)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Custo total (pecas + servico + brinde):</span>
              <span className="font-medium text-red-500">- {formatarMoeda(custoTotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2"
              style={{ borderTop: '1px solid rgba(233,30,140,0.2)' }}>
              <span>Lucro liquido:</span>
              <span style={{ color: lucroLiquido >= 0 ? '#166534' : '#dc2626' }}>
                {formatarMoeda(lucroLiquido)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Margem de lucro:</span>
              <span className="font-semibold" style={{ color: margem >= 0 ? '#166534' : '#dc2626' }}>
                {formatarPct(margem)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {erro}
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 justify-end pb-6">
        <button type="button" onClick={() => navigate('/os')} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={salvando} className="btn-jt">
          {salvando ? 'Criando OS...' : 'Criar Ordem de Servico'}
        </button>
      </div>
    </form>
  );
}
