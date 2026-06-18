import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { gerarPDFOS } from '../lib/pdfOS';

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface ItemOS {
  id: string;
  descricao_manual: string;
  quantidade: number;
  preco_unitario: number;
  custo_unitario?: number;
  categoria_item?: string;
  eh_brinde?: boolean;
}

interface OS {
  id: string;
  numero_os: string;
  status: string;
  aparelho_marca: string;
  aparelho_modelo: string;
  aparelho_cor?: string;
  aparelho_imei?: string;
  acessorios?: string;
  problema_descrito?: string;
  diagnostico?: string;
  servico_realizado?: string;
  garantia_dias: number;
  leva_traz: boolean;
  endereco_coleta?: string;
  // Valores cliente
  valor_pecas: number;
  valor_servico: number;
  valor_final: number;
  desconto: number;
  forma_pagamento?: string;
  parcelas?: number;
  // Financeiro interno
  taxa_maquininha?: number;
  valor_taxa?: number;
  valor_recebido?: number;
  custo_pecas?: number;
  custo_servico?: number;
  custo_total_os?: number;
  lucro_total_os?: number;
  margem_lucro_os?: number;
  brinde_descricao?: string;
  brinde_custo?: number;
  // Datas
  data_criacao: string;
  data_conclusao?: string;
  data_entrega?: string;
  observacoes?: string;
  cliente?: {
    id: string; nome: string; telefone: string; email?: string;
    rua?: string; bairro?: string; cidade?: string; estado?: string; cep?: string;
  };
  itens?: ItemOS[];
}

const STATUS_CONFIG: Record<string, { label: string; classe: string }> = {
  ABERTA:           { label: 'Aberta',         classe: 'status-aberta' },
  EM_ANDAMENTO:     { label: 'Em Andamento',    classe: 'status-em-andamento' },
  AGUARDANDO_PECA:  { label: 'Aguard. Peca',   classe: 'status-aguardando-peca' },
  PRONTO:           { label: 'Pronto',          classe: 'status-pronto' },
  ENTREGUE:         { label: 'Entregue',        classe: 'status-entregue' },
  SEM_SOLUCAO:      { label: 'Sem Solucao',     classe: 'status-sem-solucao' },
  ORCAMENTO_NEGADO: { label: 'Orc. Negado',     classe: 'status-orcamento-negado' },
};

const FORMA_LABELS: Record<string, string> = {
  PIX: 'Pix', DINHEIRO: 'Dinheiro', CREDITO: 'Cartao de Credito',
  DEBITO: 'Cartao de Debito', PARCELADO: 'Parcelado', PENDENTE: 'Pendente',
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v: number) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
const fmtData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

// ─── Componente ─────────────────────────────────────────────────────────────
export default function DetalhesOS() {
  const { id } = useParams<{ id: string }>();
  const [os, setOs] = useState<OS | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [novoStatus, setNovoStatus] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [editFinanceiro, setEditFinanceiro] = useState(false);

  const [campos, setCampos] = useState({
    diagnostico: '', servico_realizado: '', valor_servico: '', observacoes: '',
  });

  const [camposFinanceiro, setCamposFinanceiro] = useState({
    forma_pagamento: 'PENDENTE', parcelas: 1,
    taxa_maquininha: 0, desconto: 0,
    custo_pecas: 0, custo_servico: 0,
    brinde_descricao: '', brinde_custo: 0,
  });

  const carregarOS = () => {
    setCarregando(true);
    api.get(`/os/${id}`)
      .then((res) => {
        const data: OS = res.data.data || res.data;
        setOs(data);
        setNovoStatus(data.status);
        setCampos({
          diagnostico: data.diagnostico || '',
          servico_realizado: data.servico_realizado || '',
          valor_servico: String(data.valor_servico || ''),
          observacoes: data.observacoes || '',
        });
        setCamposFinanceiro({
          forma_pagamento: data.forma_pagamento || 'PENDENTE',
          parcelas: data.parcelas || 1,
          taxa_maquininha: data.taxa_maquininha || 0,
          desconto: data.desconto || 0,
          custo_pecas: data.custo_pecas || 0,
          custo_servico: data.custo_servico || 0,
          brinde_descricao: data.brinde_descricao || '',
          brinde_custo: data.brinde_custo || 0,
        });
      })
      .catch(console.error)
      .finally(() => setCarregando(false));
  };

  useEffect(() => { carregarOS(); }, [id]);

  const handleAtualizarStatus = async () => {
    if (!novoStatus || novoStatus === os?.status) return;
    setAtualizando(true);
    try {
      await api.patch(`/os/${id}/status`, { status: novoStatus });
      carregarOS();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Erro ao atualizar status.');
    } finally { setAtualizando(false); }
  };

  const handleSalvarEdicao = async () => {
    setAtualizando(true);
    try {
      await api.put(`/os/${id}`, {
        ...campos,
        valor_servico: parseFloat(campos.valor_servico) || 0,
      });
      setEditando(false);
      carregarOS();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Erro ao salvar.');
    } finally { setAtualizando(false); }
  };

  const handleSalvarFinanceiro = async () => {
    setAtualizando(true);
    try {
      await api.put(`/os/${id}`, camposFinanceiro);
      setEditFinanceiro(false);
      carregarOS();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Erro ao salvar financeiro.');
    } finally { setAtualizando(false); }
  };

  if (carregando) {
    return <div className="flex items-center justify-center py-20"><p className="text-gray-400">Carregando OS...</p></div>;
  }
  if (!os) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">OS nao encontrada.</p>
        <Link to="/os" className="btn-jt mt-4 inline-block">Voltar a lista</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[os.status] || { label: os.status, classe: '' };
  const lucro = os.lucro_total_os || 0;
  const margem = os.margem_lucro_os || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/os" className="text-gray-400 hover:text-gray-600 text-sm">Voltar</Link>
            <h1 className="text-2xl font-bold text-gray-900">
              OS <span style={{ color: '#e91e8c' }}>#{String(os.numero_os)}</span>
            </h1>
            <span className={`status-badge ${statusCfg.classe}`}>{statusCfg.label}</span>
            {os.leva_traz && <span className="text-sm text-gray-500">Leva e Traz</span>}
          </div>
          <p className="text-gray-500 text-sm mt-1">Aberta em {fmtData(os.data_criacao)}</p>
        </div>
        <button onClick={() => os && gerarPDFOS(os)} className="btn-jt self-start sm:self-auto">
          Gerar PDF
        </button>
      </div>

      {/* ── Alterar Status ── */}
      <div className="jt-card" style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.04), rgba(0,180,255,0.04))', border: '1px solid rgba(233,30,140,0.12)' }}>
        <h2 className="section-title">Alterar Status</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <button key={val} onClick={() => setNovoStatus(val)}
              className={`status-badge ${cfg.classe} cursor-pointer transition-all ${novoStatus === val ? 'ring-2 ring-offset-1 ring-gray-400 scale-105' : 'opacity-60 hover:opacity-100'}`}>
              {cfg.label}
            </button>
          ))}
        </div>
        {novoStatus !== os.status && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-sm text-gray-600">Alterar para: <strong>{STATUS_CONFIG[novoStatus]?.label}</strong></p>
            <button onClick={handleAtualizarStatus} disabled={atualizando} className="btn-jt py-1.5 px-4 text-sm">
              {atualizando ? 'Salvando...' : 'Confirmar'}
            </button>
            <button onClick={() => setNovoStatus(os.status)} className="btn-secondary py-1.5 px-4 text-sm">Cancelar</button>
          </div>
        )}
      </div>

      {/* ── Cliente ── */}
      <div className="jt-card">
        <h2 className="section-title">Cliente</h2>
        {os.cliente ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-500">Nome</p><p className="font-semibold text-gray-900">{os.cliente.nome}</p></div>
            <div>
              <p className="text-gray-500">WhatsApp</p>
              <a href={`https://wa.me/55${os.cliente.telefone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="font-semibold" style={{ color: '#25d366' }}>
                {os.cliente.telefone}
              </a>
            </div>
            {os.cliente.email && <div><p className="text-gray-500">Email</p><p className="text-gray-800">{os.cliente.email}</p></div>}
            {os.leva_traz && os.endereco_coleta && (
              <div className="sm:col-span-2"><p className="text-gray-500">Endereco de coleta</p><p className="text-gray-800">{os.endereco_coleta}</p></div>
            )}
          </div>
        ) : <p className="text-gray-400 text-sm">Dados do cliente nao disponiveis.</p>}
      </div>

      {/* ── Aparelho ── */}
      <div className="jt-card">
        <h2 className="section-title">Aparelho</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><p className="text-gray-500">Marca</p><p className="font-semibold text-gray-900">{os.aparelho_marca}</p></div>
          <div><p className="text-gray-500">Modelo</p><p className="font-semibold text-gray-900">{os.aparelho_modelo}</p></div>
          {os.aparelho_cor && <div><p className="text-gray-500">Cor</p><p className="text-gray-800">{os.aparelho_cor}</p></div>}
          {os.aparelho_imei && <div><p className="text-gray-500">IMEI / Serie</p><p className="text-gray-800 font-mono text-xs">{os.aparelho_imei}</p></div>}
          {os.acessorios && <div className="col-span-2 sm:col-span-3"><p className="text-gray-500">Acessorios</p><p className="text-gray-800">{os.acessorios}</p></div>}
        </div>
      </div>

      {/* ── Serviço ── */}
      <div className="jt-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Servico</h2>
          {!editando && (
            <button onClick={() => setEditando(true)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'rgba(0,180,255,0.1)', color: '#00b4ff' }}>
              Editar
            </button>
          )}
        </div>
        {!editando ? (
          <div className="space-y-3 text-sm">
            <div><p className="text-gray-500 font-medium">Problema relatado</p><p className="text-gray-900 mt-0.5">{os.problema_descrito || '-'}</p></div>
            <div><p className="text-gray-500 font-medium">Diagnostico tecnico</p><p className="text-gray-900 mt-0.5">{os.diagnostico || <span className="text-gray-400 italic">Nao preenchido</span>}</p></div>
            <div><p className="text-gray-500 font-medium">Servico realizado</p><p className="text-gray-900 mt-0.5">{os.servico_realizado || <span className="text-gray-400 italic">Nao preenchido</span>}</p></div>
            <div className="flex gap-6">
              <div><p className="text-gray-500 font-medium">Garantia</p><p className="text-gray-900">{os.garantia_dias > 0 ? `${os.garantia_dias} dias` : 'Sem garantia'}</p></div>
              {os.observacoes && <div><p className="text-gray-500 font-medium">Observacoes internas</p><p className="text-gray-900">{os.observacoes}</p></div>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div><label className="label">Diagnostico tecnico</label>
              <textarea className="input-field resize-none" rows={2} value={campos.diagnostico}
                onChange={(e) => setCampos({ ...campos, diagnostico: e.target.value })} /></div>
            <div><label className="label">Servico realizado</label>
              <textarea className="input-field resize-none" rows={2} value={campos.servico_realizado}
                onChange={(e) => setCampos({ ...campos, servico_realizado: e.target.value })} /></div>
            <div><label className="label">Valor do servico (R$)</label>
              <input type="number" step="0.01" min="0" className="input-field max-w-xs"
                value={campos.valor_servico} onChange={(e) => setCampos({ ...campos, valor_servico: e.target.value })} /></div>
            <div><label className="label">Observacoes internas</label>
              <textarea className="input-field resize-none" rows={2} value={campos.observacoes}
                onChange={(e) => setCampos({ ...campos, observacoes: e.target.value })} /></div>
            <div className="flex gap-3">
              <button onClick={handleSalvarEdicao} disabled={atualizando} className="btn-jt">
                {atualizando ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditando(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Peças ── */}
      {os.itens && os.itens.length > 0 && (
        <div className="jt-card">
          <h2 className="section-title">Pecas e Materiais</h2>
          <div className="space-y-2">
            {os.itens.map((item) => (
              <div key={item.id} className={`flex items-center justify-between py-2 border-b border-gray-50 last:border-0 ${item.eh_brinde ? 'opacity-60' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.descricao_manual}
                    {item.eh_brinde && <span className="ml-2 text-xs text-pink-400">[brinde]</span>}
                  </p>
                  <p className="text-xs text-gray-400">Qtd: {item.quantidade} x {fmt(item.preco_unitario)}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: item.eh_brinde ? '#9ca3af' : '#166534' }}>
                  {item.eh_brinde ? 'Brinde' : fmt(item.quantidade * item.preco_unitario)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Valores do cliente ── */}
      <div className="jt-card" style={{ background: 'linear-gradient(135deg, rgba(233,30,140,0.05), rgba(0,180,255,0.05))', border: '1px solid rgba(233,30,140,0.15)' }}>
        <h2 className="section-title">Valores</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600"><span>Pecas e materiais:</span><span className="font-medium">{fmt(os.valor_pecas)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Mao de obra / servico:</span><span className="font-medium">{fmt(os.valor_servico)}</span></div>
          {(os.desconto || 0) > 0 && (
            <div className="flex justify-between text-green-600"><span>Desconto:</span><span className="font-medium">- {fmt(os.desconto)}</span></div>
          )}
          {os.forma_pagamento && os.forma_pagamento !== 'PENDENTE' && (
            <div className="flex justify-between text-gray-500 text-xs">
              <span>Forma de pagamento:</span>
              <span>{FORMA_LABELS[os.forma_pagamento] || os.forma_pagamento}
                {os.parcelas && os.parcelas > 1 ? ` (${os.parcelas}x de ${fmt(os.valor_final / os.parcelas)})` : ''}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2" style={{ borderTop: '2px solid rgba(233,30,140,0.2)', color: '#e91e8c' }}>
            <span>Total cobrado:</span><span>{fmt(os.valor_final)}</span>
          </div>
        </div>
      </div>

      {/* ── Financeiro Interno ── */}
      <div className="jt-card" style={{ border: '1px solid rgba(233,30,140,0.2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="section-title mb-0" style={{ color: '#e91e8c' }}>Financeiro Interno</h2>
            <p className="text-xs text-gray-400 mt-0.5">Nao aparece para o cliente</p>
          </div>
          {!editFinanceiro && (
            <button onClick={() => setEditFinanceiro(true)} className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c' }}>
              Editar
            </button>
          )}
        </div>

        {!editFinanceiro ? (
          <div className="space-y-3">
            {/* Cards de KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p className="text-xs text-gray-500 mb-1">Voce recebe</p>
                <p className="text-base font-bold text-green-700">{fmt(os.valor_recebido || os.valor_final)}</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                <p className="text-xs text-gray-500 mb-1">Custo total</p>
                <p className="text-base font-bold text-red-600">{fmt(os.custo_total_os || 0)}</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: lucro >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${lucro >= 0 ? '#bbf7d0' : '#fecaca'}` }}>
                <p className="text-xs text-gray-500 mb-1">Lucro liquido</p>
                <p className="text-base font-bold" style={{ color: lucro >= 0 ? '#166534' : '#dc2626' }}>{fmt(lucro)}</p>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: margem >= 0 ? '#eff6ff' : '#fef2f2', border: `1px solid ${margem >= 0 ? '#bfdbfe' : '#fecaca'}` }}>
                <p className="text-xs text-gray-500 mb-1">Margem</p>
                <p className="text-base font-bold" style={{ color: margem >= 0 ? '#1d4ed8' : '#dc2626' }}>{fmtPct(margem)}</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="text-sm space-y-1.5 pt-2" style={{ borderTop: '1px solid rgba(233,30,140,0.1)' }}>
              {(os.taxa_maquininha || 0) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Taxa maquininha ({os.taxa_maquininha}%):</span>
                  <span className="text-red-500 font-medium">- {fmt(os.valor_taxa || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Custo das pecas:</span>
                <span className="font-medium">- {fmt(os.custo_pecas || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Custo do servico:</span>
                <span className="font-medium">- {fmt(os.custo_servico || 0)}</span>
              </div>
              {(os.brinde_custo || 0) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Brinde ({os.brinde_descricao || 'brinde'}):</span>
                  <span className="font-medium text-pink-500">- {fmt(os.brinde_custo || 0)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Forma de pagamento</label>
                <select className="input-field" value={camposFinanceiro.forma_pagamento}
                  onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, forma_pagamento: e.target.value })}>
                  {Object.entries(FORMA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {(camposFinanceiro.forma_pagamento === 'PARCELADO') && (
                <div>
                  <label className="label">Parcelas</label>
                  <input type="number" min="2" max="24" className="input-field"
                    value={camposFinanceiro.parcelas}
                    onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, parcelas: parseInt(e.target.value) || 1 })} />
                </div>
              )}
              <div>
                <label className="label text-pink-500">Taxa maquininha (%)</label>
                <input type="number" step="0.01" min="0" max="100" className="input-field"
                  value={camposFinanceiro.taxa_maquininha}
                  onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, taxa_maquininha: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label">Desconto (R$)</label>
                <input type="number" step="0.01" min="0" className="input-field"
                  value={camposFinanceiro.desconto}
                  onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, desconto: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label text-pink-500">Custo das pecas (R$)</label>
                <input type="number" step="0.01" min="0" className="input-field"
                  value={camposFinanceiro.custo_pecas}
                  onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, custo_pecas: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label text-pink-500">Custo do servico (R$)</label>
                <input type="number" step="0.01" min="0" className="input-field"
                  value={camposFinanceiro.custo_servico}
                  onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, custo_servico: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label text-pink-500">Descricao do brinde</label>
                <input className="input-field" value={camposFinanceiro.brinde_descricao}
                  onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, brinde_descricao: e.target.value })}
                  placeholder="Ex: Pelicula de vidro..." />
              </div>
              <div>
                <label className="label text-pink-500">Custo do brinde (R$)</label>
                <input type="number" step="0.01" min="0" className="input-field"
                  value={camposFinanceiro.brinde_custo}
                  onChange={(e) => setCamposFinanceiro({ ...camposFinanceiro, brinde_custo: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleSalvarFinanceiro} disabled={atualizando} className="btn-jt">
                {atualizando ? 'Salvando...' : 'Salvar financeiro'}
              </button>
              <button onClick={() => setEditFinanceiro(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Botões finais */}
      <div className="flex gap-3 justify-end pb-6">
        <Link to="/os" className="btn-secondary">Voltar a lista</Link>
        <button onClick={() => os && gerarPDFOS(os)} className="btn-jt">Gerar PDF da OS</button>
      </div>
    </div>
  );
}
