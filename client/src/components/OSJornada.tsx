import { useEffect, useRef, useState, type PointerEvent } from 'react';
import api from '../lib/api';

export interface OSEvidencia {
  id: string;
  etapa: 'ANTES' | 'DEPOIS' | 'OUTRO';
  titulo?: string;
  arquivo_url: string;
  mime_type?: string;
  data_criacao: string;
}

export interface OSAssinatura {
  id: string;
  tipo: 'COLETA' | 'APROVACAO' | 'ENTREGA';
  nome_signatario: string;
  assinatura_data_url: string;
  aceite_termos: boolean;
  data_assinatura: string;
}

export interface OSEvento {
  id: string;
  codigo: string;
  titulo: string;
  mensagem_cliente?: string;
  status_os?: string;
  notificar_whatsapp: boolean;
  notificacao_status: 'PENDENTE' | 'ENVIADO' | 'NAO_ENVIAR' | 'ERRO';
  data_evento: string;
  whatsapp_message_id?: string;
  notificacao_erro?: string;
}

interface Props {
  osId: string;
  clienteNome: string;
  evidencias?: OSEvidencia[];
  assinaturas?: OSAssinatura[];
  eventos?: OSEvento[];
  onAtualizar: () => void;
}

const ACOES = [
  { codigo: 'TECNICO_A_CAMINHO', titulo: 'Técnico a caminho', descricao: 'Prepara o aviso de deslocamento.' },
  { codigo: 'APARELHO_COLETADO', titulo: 'Aparelho coletado', descricao: 'Confirma a coleta e inicia o acompanhamento.' },
  { codigo: 'ANALISE_CONCLUIDA', titulo: 'Análise concluída', descricao: 'Deixa a mensagem de orçamento pronta.' },
  { codigo: 'SERVICO_INICIADO', titulo: 'Serviço iniciado', descricao: 'Atualiza o cliente sobre a execução.' },
  { codigo: 'SERVICO_CONCLUIDO', titulo: 'Serviço concluído', descricao: 'Marca a OS como pronta.' },
  { codigo: 'SAINDO_PARA_ENTREGA', titulo: 'Saindo para entrega', descricao: 'Prepara a mensagem de entrega.' },
  { codigo: 'ENTREGUE', titulo: 'Entrega concluída', descricao: 'Marca a OS como entregue.' },
] as const;

const fmtDataHora = (data?: string) => data ? new Date(data).toLocaleString('pt-BR') : '-';

async function compactarImagem(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha uma imagem válida.');
  const imagem = new Image();
  const origem = URL.createObjectURL(arquivo);
  try {
    await new Promise<void>((resolve, reject) => {
      imagem.onload = () => resolve();
      imagem.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      imagem.src = origem;
    });
    const limite = 1600;
    const escala = Math.min(1, limite / Math.max(imagem.width, imagem.height));
    const largura = Math.max(1, Math.round(imagem.width * escala));
    const altura = Math.max(1, Math.round(imagem.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível preparar a imagem.');
    ctx.drawImage(imagem, 0, 0, largura, altura);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    URL.revokeObjectURL(origem);
  }
}

function AssinaturaDigital({
  osId, clienteNome, assinaturas, onAtualizar,
}: Pick<Props, 'osId' | 'clienteNome' | 'assinaturas' | 'onAtualizar'>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [tipo, setTipo] = useState<'COLETA' | 'APROVACAO' | 'ENTREGA'>('ENTREGA');
  const [nome, setNome] = useState(clienteNome || '');
  const [aceite, setAceite] = useState(false);
  const [assinou, setAssinou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { setNome(clienteNome || ''); }, [clienteNome]);

  function posicao(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    return { x: (event.clientX - box.left) * (canvas.width / box.width), y: (event.clientY - box.top) * (canvas.height / box.height) };
  }

  function iniciar(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = posicao(event);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#172033';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    desenhando.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function desenhar(event: PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const p = posicao(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setAssinou(true);
  }

  function finalizar() { desenhando.current = false; }
  function limpar() {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setAssinou(false);
  }

  async function salvar() {
    if (!nome.trim() || !assinou || !aceite || !canvasRef.current) {
      alert('Informe o nome, peça para o cliente assinar e marque o aceite dos termos.');
      return;
    }
    setSalvando(true);
    try {
      await api.post(`/os/${osId}/assinaturas`, {
        tipo, nome_signatario: nome.trim(), assinatura_data_url: canvasRef.current.toDataURL('image/png'), aceite_termos: true,
      });
      limpar();
      setAceite(false);
      alert('Assinatura registrada com sucesso.');
      onAtualizar();
    } catch (erro: unknown) {
      const msg = (erro as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Não foi possível salvar a assinatura.');
    } finally { setSalvando(false); }
  }

  return (
    <div className="jt-card space-y-4">
      <div>
        <h2 className="section-title mb-1">Assinatura digital</h2>
        <p className="text-xs text-gray-500">Capture a assinatura na coleta, aprovação ou entrega. Ela aparecerá no PDF final da OS.</p>
      </div>
      {assinaturas && assinaturas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {assinaturas.map((assinatura) => (
            <div key={assinatura.id} className="rounded-xl border border-gray-200 p-3 bg-gray-50">
              <p className="text-xs font-bold text-gray-700">{assinatura.tipo}</p>
              <img src={assinatura.assinatura_data_url} alt={`Assinatura de ${assinatura.nome_signatario}`} className="h-12 w-full object-contain my-1" />
              <p className="text-xs text-gray-600 truncate">{assinatura.nome_signatario}</p>
              <p className="text-[10px] text-gray-400">{fmtDataHora(assinatura.data_assinatura)}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="sm:col-span-1"><span className="label text-xs">Momento do aceite</span>
          <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="COLETA">Coleta do aparelho</option><option value="APROVACAO">Aprovação do orçamento</option><option value="ENTREGA">Entrega do aparelho</option>
          </select>
        </label>
        <label className="sm:col-span-2"><span className="label text-xs">Nome de quem assina</span>
          <input className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
        </label>
      </div>
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
        <canvas ref={canvasRef} width={800} height={230} className="w-full h-36 touch-none cursor-crosshair"
          onPointerDown={iniciar} onPointerMove={desenhar} onPointerUp={finalizar} onPointerLeave={finalizar} />
        <div className="border-t border-slate-200 px-3 py-2 flex justify-between text-xs text-gray-500"><span>Assine dentro da área acima</span><button type="button" onClick={limpar} className="text-pink-600 font-semibold">Limpar assinatura</button></div>
      </div>
      <label className="flex gap-2 items-start text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5" />
        <span>Declaro que li e concordo com as condições desta Ordem de Serviço e com o termo de garantia.</span>
      </label>
      <button type="button" onClick={salvar} disabled={salvando} className="btn-jt py-2 px-4 text-sm">{salvando ? 'Salvando...' : 'Registrar assinatura'}</button>
    </div>
  );
}

export default function OSJornada({ osId, clienteNome, evidencias = [], assinaturas = [], eventos = [], onAtualizar }: Props) {
  const [etapa, setEtapa] = useState<'ANTES' | 'DEPOIS'>('ANTES');
  const [titulo, setTitulo] = useState('');
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [executando, setExecutando] = useState<string | null>(null);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState<string | null>(null);

  async function enviarFoto(event: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      const arquivoCompactado = await compactarImagem(arquivo);
      await api.post(`/os/${osId}/evidencias`, {
        etapa, titulo: titulo.trim() || `Foto ${etapa.toLowerCase()}`,
        arquivo_url: arquivoCompactado, mime_type: 'image/jpeg', criado_por: 'Equipe Juninho Tech',
      });
      setTitulo('');
      onAtualizar();
    } catch (erro: unknown) {
      const msg = (erro as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || (erro instanceof Error ? erro.message : 'Não foi possível enviar a foto.'));
    } finally { setEnviandoFoto(false); }
  }

  async function executarAcao(codigo: string) {
    const acao = ACOES.find((item) => item.codigo === codigo);
    if (!acao || !confirm(`Registrar “${acao.titulo}”? A mensagem ficará pronta para o WhatsApp, mas não será enviada automaticamente ainda.`)) return;
    setExecutando(codigo);
    try {
      const resposta = await api.post(`/os/${osId}/acoes`, { acao: codigo });
      const mensagem = resposta.data?.data?.mensagem_cliente;
      alert(mensagem ? `Status registrado. Mensagem preparada:\n\n${mensagem}` : 'Status registrado com sucesso.');
      onAtualizar();
    } catch (erro: unknown) {
      const msg = (erro as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg || 'Não foi possível registrar a ação.');
    } finally { setExecutando(null); }
  }

  async function enviarWhatsApp(evento: OSEvento) {
    if (!evento.mensagem_cliente) return;
    const confirmar = window.confirm(
      `Enviar esta atualização pelo WhatsApp?\n\n“${evento.mensagem_cliente}”\n\nO envio será registrado na linha do tempo.`
    );
    if (!confirmar) return;

    setEnviandoWhatsapp(evento.id);
    try {
      await api.post(`/os/${osId}/eventos/${evento.id}/enviar-whatsapp`);
      alert('Atualização enviada e registrada com sucesso.');
      onAtualizar();
    } catch (erro: unknown) {
      const dados = (erro as { response?: { data?: { error?: string; detalhe?: string } } })?.response?.data;
      alert(dados?.detalhe || dados?.error || 'Não foi possível enviar a atualização pelo WhatsApp.');
      onAtualizar();
    } finally {
      setEnviandoWhatsapp(null);
    }
  }

  const antes = evidencias.filter((foto) => foto.etapa === 'ANTES');
  const depois = evidencias.filter((foto) => foto.etapa === 'DEPOIS');

  return (
    <>
      <div className="jt-card space-y-4" style={{ border: '1px solid rgba(0,180,255,0.22)', background: 'linear-gradient(135deg, rgba(0,180,255,0.04), rgba(233,30,140,0.04))' }}>
        <div><h2 className="section-title mb-1">Jornada do atendimento</h2><p className="text-xs text-gray-500">Registre cada etapa. A equipe confere e confirma manualmente cada atualização antes de enviá-la ao WhatsApp.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ACOES.map((acao) => <button key={acao.codigo} type="button" onClick={() => executarAcao(acao.codigo)} disabled={executando !== null}
            className="text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-cyan-400 hover:shadow-sm transition disabled:opacity-50">
            <span className="block text-sm font-bold text-slate-800">{executando === acao.codigo ? 'Registrando...' : acao.titulo}</span>
            <span className="block text-xs text-slate-500 mt-0.5">{acao.descricao}</span>
          </button>)}
        </div>
      </div>

      <div className="jt-card space-y-4">
        <div><h2 className="section-title mb-1">Fotos do aparelho</h2><p className="text-xs text-gray-500">Registre o estado do equipamento antes e depois do serviço. As imagens entram no PDF final.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <label><span className="label text-xs">Momento da foto</span><select className="input-field" value={etapa} onChange={(e) => setEtapa(e.target.value as typeof etapa)}><option value="ANTES">Antes do serviço</option><option value="DEPOIS">Depois do serviço</option></select></label>
          <label className="sm:col-span-1"><span className="label text-xs">Descrição (opcional)</span><input className="input-field" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Tela trincada" /></label>
          <label className="btn-jt py-2.5 px-4 text-sm text-center cursor-pointer">{enviandoFoto ? 'Enviando foto...' : 'Adicionar foto'}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={enviarFoto} disabled={enviandoFoto} /></label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Galeria titulo="Antes do serviço" fotos={antes} />
          <Galeria titulo="Depois do serviço" fotos={depois} />
        </div>
      </div>

      <AssinaturaDigital osId={osId} clienteNome={clienteNome} assinaturas={assinaturas} onAtualizar={onAtualizar} />

      <div className="jt-card">
        <div className="flex items-center justify-between mb-3"><div><h2 className="section-title mb-0">Linha do tempo</h2><p className="text-xs text-gray-500 mt-1">Histórico auditável da Ordem de Serviço.</p></div><span className="text-xs text-gray-400">{eventos.length} registros</span></div>
        {eventos.length === 0 ? <p className="text-sm text-gray-400">Nenhum evento registrado ainda.</p> : <div className="space-y-3">{eventos.map((evento) => <div key={evento.id} className="border-l-2 pl-3" style={{ borderColor: evento.notificacao_status === 'ENVIADO' ? '#22c55e' : evento.notificacao_status === 'PENDENTE' ? '#f59e0b' : '#cbd5e1' }}>
          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-slate-800">{evento.titulo}</p>{evento.notificar_whatsapp && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${evento.notificacao_status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : evento.notificacao_status === 'ENVIADO' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>WhatsApp: {evento.notificacao_status.toLowerCase()}</span>}</div>
          {evento.mensagem_cliente && <p className="text-xs text-slate-500 mt-1">Mensagem preparada: “{evento.mensagem_cliente}”</p>}
          {evento.notificar_whatsapp && evento.notificacao_status === 'PENDENTE' && evento.mensagem_cliente && <button type="button" onClick={() => enviarWhatsApp(evento)} disabled={enviandoWhatsapp !== null} className="mt-2 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1fb357] disabled:opacity-50">{enviandoWhatsapp === evento.id ? 'Enviando...' : 'Enviar atualização no WhatsApp'}</button>}
          {evento.notificacao_status === 'ERRO' && evento.notificacao_erro && <p className="mt-1 text-[11px] text-red-600">Falha no envio: {evento.notificacao_erro}</p>}
          <p className="text-[11px] text-gray-400 mt-1">{fmtDataHora(evento.data_evento)}</p>
        </div>)}</div>}
      </div>
    </>
  );
}

function Galeria({ titulo, fotos }: { titulo: string; fotos: OSEvidencia[] }) {
  return <div><p className="text-xs font-bold text-slate-700 mb-2">{titulo} ({fotos.length})</p>{fotos.length === 0 ? <div className="h-28 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-gray-400">Nenhuma foto registrada</div> : <div className="grid grid-cols-2 gap-2">{fotos.map((foto) => <a key={foto.id} href={foto.arquivo_url} target="_blank" rel="noreferrer" className="rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-50"><img src={foto.arquivo_url} alt={foto.titulo || titulo} className="w-full h-full object-cover" /></a>)}</div>}</div>;
}
