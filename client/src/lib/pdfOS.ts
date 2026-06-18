import jsPDF from 'jspdf';
import { LOGO_BASE64 } from '../assets/logo-base64';

// ============================================================
// GERADOR DE PDF — Ordem de Serviço + Termo de Garantia
// Juninho.Tech — Assistência Técnica
// ============================================================

interface ItemOS {
  id?: string;
  descricao_manual: string;
  quantidade: number;
  preco_unitario: number;
}

interface OSParaPDF {
  numero_os: number;
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
  leva_traz?: boolean;
  endereco_coleta?: string;
  valor_pecas: number;
  valor_servico: number;
  valor_final: number;
  desconto?: number;
  forma_pagamento?: string;
  parcelas?: number;
  data_criacao: string;
  data_conclusao?: string;
  observacoes?: string;
  cliente?: {
    nome: string;
    telefone: string;
    email?: string;
    rua?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  itens?: ItemOS[];
}

function formatarMoeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function formatarData(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('pt-BR');
}

function formatarDataVencimentoGarantia(dataCriacao: string, dias: number): string {
  if (!dias) return 'Sem garantia';
  const d = new Date(dataCriacao);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('pt-BR');
}

// Cores da marca
const ROSA = '#e91e8c';
const AZUL = '#00b4ff';
const ESCURO = '#0a0a0f';

// Converte hex para RGB
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

export function gerarPDFOS(os: OSParaPDF): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ─────────────────────────────────────────────────────────
  // FUNÇÕES AUXILIARES
  // ─────────────────────────────────────────────────────────

  function novaPage() {
    doc.addPage();
    y = 0;
    desenharHeader();
  }

  function checkY(needed: number) {
    if (y + needed > pageH - 20) novaPage();
  }

  function setFont(size: number, style: 'normal' | 'bold' | 'italic' = 'normal', color = '#1a1a2e') {
    doc.setFontSize(size);
    doc.setFont('helvetica', style);
    const [r, g, b] = hexToRgb(color);
    doc.setTextColor(r, g, b);
  }

  function secaoTitulo(titulo: string) {
    checkY(10);
    const [r, g, b] = hexToRgb(ROSA);
    doc.setFillColor(r, g, b);
    doc.rect(margin, y, contentW, 7, 'F');
    setFont(9, 'bold', '#ffffff');
    doc.text(titulo.toUpperCase(), margin + 3, y + 5);
    y += 10;
  }

  function campo(label: string, valor: string, xPos: number, largura: number) {
    setFont(7, 'bold', '#6b7280');
    doc.text(label, xPos, y);
    setFont(8, 'normal', '#1a1a2e');
    const linhas = doc.splitTextToSize(valor || '-', largura - 2);
    doc.text(linhas, xPos, y + 4);
    return linhas.length * 4 + 5;
  }

  function linhaDivisoria(cor = '#e5e7eb') {
    const [r, g, b] = hexToRgb(cor);
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 3;
  }

  // ─────────────────────────────────────────────────────────
  // HEADER COM LOGO E DADOS DA EMPRESA
  // ─────────────────────────────────────────────────────────

  function desenharHeader() {
    // Fundo escuro do header
    const [r, g, b] = hexToRgb(ESCURO);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageW, 38, 'F');

    // Logo
    try {
      doc.addImage(LOGO_BASE64, 'JPEG', margin, 4, 28, 28);
    } catch (_) {
      // Logo não disponível
    }

    // Nome da empresa
    setFont(16, 'bold', '#ffffff');
    doc.text('JUNINHO', margin + 32, 14);
    setFont(16, 'bold', AZUL);
    doc.text('.TECH', margin + 32 + doc.getTextWidth('JUNINHO'), 14);

    setFont(7, 'normal', '#9ca3af');
    doc.text('Assistência Técnica de Celulares e Eletrônicos', margin + 32, 19);
    doc.text('WhatsApp: (21) 97346-8654  |  Instagram: @juninho.tech', margin + 32, 24);

    // Número da OS (destaque)
    const osNumStr = `OS #${String(os.numero_os).padStart(4, '0')}`;
    setFont(14, 'bold', ROSA);
    doc.text(osNumStr, pageW - margin, 14, { align: 'right' });
    setFont(7, 'normal', '#9ca3af');
    doc.text(`Data: ${formatarData(os.data_criacao)}`, pageW - margin, 19, { align: 'right' });
    doc.text(`Status: ${os.status}`, pageW - margin, 24, { align: 'right' });

    y = 42;
  }

  // ─────────────────────────────────────────────────────────
  // PÁGINA 1: ORDEM DE SERVIÇO
  // ─────────────────────────────────────────────────────────

  desenharHeader();

  // ── DADOS DO CLIENTE ──
  secaoTitulo('Dados do Cliente');
  const col1 = margin;
  const col2 = margin + contentW / 2 + 2;
  const halfW = contentW / 2 - 4;

  const h1 = campo('Nome', os.cliente?.nome || '-', col1, halfW);
  const h2 = campo('WhatsApp', os.cliente?.telefone || '-', col2, halfW);
  y += Math.max(h1, h2);

  if (os.cliente?.email) {
    const h3 = campo('Email', os.cliente.email, col1, halfW);
    y += h3;
  }

  const enderecoCliente = [os.cliente?.rua, os.cliente?.bairro, os.cliente?.cidade, os.cliente?.estado]
    .filter(Boolean).join(', ');
  if (enderecoCliente) {
    const h4 = campo('Endereço', enderecoCliente, col1, contentW);
    y += h4;
  }

  if (os.leva_traz && os.endereco_coleta) {
    const h5 = campo('Endereco de Coleta (Leva e Traz)', os.endereco_coleta, col1, contentW);
    y += h5;
  }

  y += 3;
  linhaDivisoria();

  // ── DADOS DO APARELHO ──
  secaoTitulo('Dados do Aparelho');

  const hMarca = campo('Marca', os.aparelho_marca, col1, halfW);
  const hModelo = campo('Modelo', os.aparelho_modelo, col2, halfW);
  y += Math.max(hMarca, hModelo);

  const hCor = campo('Cor', os.aparelho_cor || '-', col1, halfW);
  const hImei = campo('IMEI / Número de Série', os.aparelho_imei || '-', col2, halfW);
  y += Math.max(hCor, hImei);

  if (os.acessorios) {
    const hAcess = campo('Acessórios Entregues', os.acessorios, col1, contentW);
    y += hAcess;
  }

  y += 3;
  linhaDivisoria();

  // ── SERVIÇO ──
  secaoTitulo('Descrição do Serviço');

  if (os.problema_descrito) {
    const hProb = campo('Problema Relatado pelo Cliente', os.problema_descrito, col1, contentW);
    y += hProb;
  }

  if (os.diagnostico) {
    checkY(15);
    const hDiag = campo('Diagnóstico Técnico', os.diagnostico, col1, contentW);
    y += hDiag;
  }

  if (os.servico_realizado) {
    checkY(15);
    const hServ = campo('Serviço Realizado', os.servico_realizado, col1, contentW);
    y += hServ;
  }

  const hGar = campo('Garantia do Serviço', os.garantia_dias > 0 ? `${os.garantia_dias} dias (até ${formatarDataVencimentoGarantia(os.data_criacao, os.garantia_dias)})` : 'Sem garantia', col1, halfW);
  y += hGar;

  y += 3;
  linhaDivisoria();

  // ── PEÇAS / ITENS ──
  if (os.itens && os.itens.length > 0) {
    secaoTitulo('Peças e Materiais Utilizados');

    // Cabeçalho da tabela
    const [rg, gg, bg] = hexToRgb('#f3f4f6');
    doc.setFillColor(rg, gg, bg);
    doc.rect(margin, y, contentW, 6, 'F');
    setFont(7, 'bold', '#6b7280');
    doc.text('DESCRIÇÃO', margin + 2, y + 4);
    doc.text('QTD', margin + contentW * 0.65, y + 4);
    doc.text('UNIT.', margin + contentW * 0.75, y + 4);
    doc.text('TOTAL', margin + contentW - 2, y + 4, { align: 'right' });
    y += 7;

    os.itens.forEach((item, idx) => {
      checkY(7);
      if (idx % 2 === 0) {
        const [rf, gf, bf] = hexToRgb('#fafafa');
        doc.setFillColor(rf, gf, bf);
        doc.rect(margin, y - 1, contentW, 6, 'F');
      }
      setFont(8, 'normal', '#1a1a2e');
      const nomeItem = doc.splitTextToSize(item.descricao_manual || '-', contentW * 0.6);
      doc.text(nomeItem, margin + 2, y + 3);
      doc.text(String(item.quantidade), margin + contentW * 0.65, y + 3);
      doc.text(formatarMoeda(item.preco_unitario), margin + contentW * 0.75, y + 3);
      setFont(8, 'bold', '#166534');
      doc.text(formatarMoeda(item.quantidade * item.preco_unitario), margin + contentW - 2, y + 3, { align: 'right' });
      y += 6;
    });

    y += 3;
    linhaDivisoria();
  }

  // ── VALORES ──
  checkY(35);
  secaoTitulo('Resumo Financeiro');

  const colVal = margin + contentW - 40;

  setFont(8, 'normal', '#6b7280');
  doc.text('Pecas e materiais:', margin + 2, y + 4);
  doc.text(formatarMoeda(os.valor_pecas), colVal + 38, y + 4, { align: 'right' });
  y += 7;

  doc.text('Mao de obra / servico:', margin + 2, y);
  doc.text(formatarMoeda(os.valor_servico), colVal + 38, y, { align: 'right' });
  y += 6;

  // Desconto com valor original riscado
  if (os.desconto && os.desconto > 0) {
    const valorOriginal = os.valor_final + os.desconto;

    // Linha: valor original riscado
    setFont(8, 'normal', '#9ca3af');
    const valorOrigStr = formatarMoeda(valorOriginal);
    const xValOrig = colVal + 38;
    doc.text('Subtotal:', margin + 2, y);
    doc.text(valorOrigStr, xValOrig, y, { align: 'right' });
    // Linha de risco sobre o valor original
    const larguraTexto = doc.getTextWidth(valorOrigStr);
    const [rg2, gg2, bg2] = hexToRgb('#9ca3af');
    doc.setDrawColor(rg2, gg2, bg2);
    doc.setLineWidth(0.4);
    doc.line(xValOrig - larguraTexto, y - 0.5, xValOrig, y - 0.5);
    y += 5;

    // Linha: desconto em verde
    setFont(8, 'bold', '#16a34a');
    doc.text('Desconto especial:', margin + 2, y);
    doc.text('- ' + formatarMoeda(os.desconto), colVal + 38, y, { align: 'right' });
    y += 5;
  }

  linhaDivisoria(ROSA);

  // Total final destacado
  const [rr, gr, br] = hexToRgb(ROSA);
  doc.setFillColor(rr, gr, br);
  setFont(12, 'bold', ROSA);
  doc.text('TOTAL A PAGAR:', margin + 2, y + 5);
  doc.text(formatarMoeda(os.valor_final), colVal + 38, y + 5, { align: 'right' });
  y += 8;

  // Forma de pagamento (visível ao cliente)
  if (os.forma_pagamento && os.forma_pagamento !== 'PENDENTE') {
    const fpLabel: Record<string, string> = {
      PIX: 'Pix / Transferencia',
      DINHEIRO: 'Dinheiro',
      CREDITO: 'Cartao de Credito',
      DEBITO: 'Cartao de Debito',
      PARCELADO: 'Parcelado no Cartao',
    };
    const fpTexto = fpLabel[os.forma_pagamento] || os.forma_pagamento;
    const parcelasTexto = (os.forma_pagamento === 'PARCELADO' || os.forma_pagamento === 'CREDITO') && os.parcelas && os.parcelas > 1
      ? ` — ${os.parcelas}x de ${formatarMoeda(os.valor_final / os.parcelas)}`
      : '';
    setFont(8, 'normal', '#374151');
    doc.text(`Forma de pagamento: ${fpTexto}${parcelasTexto}`, margin + 2, y + 3);
    y += 7;
  }

  y += 3;

  // ── ASSINATURA ──
  checkY(30);
  y += 8;
  linhaDivisoria();

  setFont(7, 'normal', '#6b7280');
  const assinY = y + 12;
  doc.line(margin, assinY, margin + 70, assinY);
  doc.line(pageW - margin - 70, assinY, pageW - margin, assinY);
  doc.text('Assinatura do Cliente', margin + 35, assinY + 4, { align: 'center' });
  doc.text('Responsável Técnico', pageW - margin - 35, assinY + 4, { align: 'center' });
  y = assinY + 10;

  // ── RODAPÉ ──
  setFont(7, 'normal', '#9ca3af');
  doc.text('Juninho.Tech - Assistencia Tecnica  |  @juninho.tech  |  WhatsApp: (21) 97346-8654', pageW / 2, pageH - 8, { align: 'center' });

  // ─────────────────────────────────────────────────────────
  // PÁGINA 2: TERMO DE GARANTIA
  // ─────────────────────────────────────────────────────────

  novaPage();

  // Título do Termo
  checkY(20);
  const [rt, gt, bt] = hexToRgb(ESCURO);
  doc.setFillColor(rt, gt, bt);
  doc.rect(margin, y, contentW, 12, 'F');
  setFont(12, 'bold', '#ffffff');
  doc.text('TERMO DE GARANTIA E CONDIÇÕES DE SERVIÇO', pageW / 2, y + 8, { align: 'center' });
  y += 16;

  setFont(8, 'bold', ROSA);
  doc.text(`OS #${String(os.numero_os).padStart(4, '0')}  —  ${os.cliente?.nome || ''}  —  ${os.aparelho_marca} ${os.aparelho_modelo}`, pageW / 2, y, { align: 'center' });
  y += 6;

  if (os.garantia_dias > 0) {
    setFont(8, 'bold', AZUL);
    doc.text(`Garantia válida por ${os.garantia_dias} dias — até ${formatarDataVencimentoGarantia(os.data_criacao, os.garantia_dias)}`, pageW / 2, y, { align: 'center' });
  } else {
    setFont(8, 'bold', '#991b1b');
    doc.text('Este serviço não possui cobertura de garantia.', pageW / 2, y, { align: 'center' });
  }
  y += 8;

  linhaDivisoria(ROSA);

  // Função para bloco de texto do termo
  function blocoTermo(titulo: string, texto: string) {
    checkY(20);
    setFont(8, 'bold', ESCURO);
    doc.text(titulo, margin, y);
    y += 5;
    setFont(7.5, 'normal', '#374151');
    const linhas = doc.splitTextToSize(texto, contentW);
    checkY(linhas.length * 4 + 4);
    doc.text(linhas, margin, y);
    y += linhas.length * 4 + 5;
  }

  blocoTermo(
    '1. COBERTURA DA GARANTIA',
    `A garantia concedida cobre exclusivamente o serviço executado e as peças substituídas pela Juninho.Tech, pelo prazo de ${os.garantia_dias > 0 ? os.garantia_dias + ' (${os.garantia_dias} dias)' : '0'} dias a contar da data de entrega do aparelho ao cliente. Durante este período, nos comprometemos a solucionar, sem custo adicional, qualquer defeito que seja diretamente relacionado ao serviço realizado, conforme previsto no Art. 26 do Código de Defesa do Consumidor (Lei 8.078/1990).`
  );

  blocoTermo(
    '2. EXCLUSÕES DA GARANTIA — O QUE NÃO É COBERTO',
    'A garantia NÃO cobre, em nenhuma hipótese, os seguintes casos:\n\n' +
    '• Danos causados por mau uso, quedas, impactos ou pressão mecânica sobre o aparelho;\n' +
    '• Contato com líquidos, umidade, suor excessivo ou submersão em água;\n' +
    '• Manchas na tela causadas por pressão, impacto ou contato com líquidos (inclusive manchas escuras ou esbranquiçadas internas);\n' +
    '• Listras, faixas ou anomalias visuais na tela decorrentes de impacto, mesmo que não haja trinca visível externamente — este tipo de dano é causado pela estrutura interna do display e não está relacionado ao serviço executado;\n' +
    '• Arranhados, riscos ou danos estéticos na carcaça ou tela;\n' +
    '• Defeitos em componentes que não foram objeto do serviço realizado;\n' +
    '• Danos causados por software, vírus, atualização de sistema ou intervenção de terceiros;\n' +
    '• Peças com desgaste natural por uso contínuo;\n' +
    '• Qualquer defeito que não guarde relação de causalidade com o serviço executado pela Juninho.Tech.'
  );

  blocoTermo(
    '3. PRAZO PARA SOLUÇÃO DE DEFEITO EM GARANTIA',
    'Caso o cliente identifique um defeito coberto pela garantia, deverá entrar em contato com a Juninho.Tech imediatamente, preferencialmente via WhatsApp. Nos comprometemos a analisar o aparelho em até 5 (cinco) dias úteis após o recebimento e a solucionar o defeito em até 30 (trinta) dias corridos, conforme o Art. 18, §1° do CDC. Caso o prazo não seja cumprido por motivo de força maior, o cliente será informado e poderá optar por aguardar ou receber reembolso proporcional ao serviço garantido. Nosso compromisso é com a satisfação real do cliente — não apenas com o cumprimento formal da lei.'
  );

  blocoTermo(
    '4. CLÁUSULA DE ABANDONO DE APARELHO',
    'O aparelho deixado para reparo deverá ser retirado pelo cliente em até 30 (trinta) dias corridos após a comunicação de conclusão do serviço ou de orçamento (aprovado ou não). Após este prazo, incidirá uma taxa de custódia de R$ 10,00 (dez reais) por dia de permanência do aparelho nas dependências da Juninho.Tech, a título de armazenamento e responsabilidade sobre o bem. Após 90 (noventa) dias sem retirada e sem qualquer contato do cliente, o aparelho poderá ser destinado conforme a legislação vigente, inclusive para cobrir os custos de custódia acumulados. Esta cláusula está em conformidade com o Art. 1.216 do Código Civil Brasileiro.'
  );

  blocoTermo(
    '5. RESPONSABILIDADE SOBRE O APARELHO',
    'A Juninho.Tech não se responsabiliza por dados, fotos, contatos ou arquivos armazenados no aparelho. Recomendamos fortemente que o cliente realize backup de seus dados antes de entregar o aparelho para reparo. Não nos responsabilizamos por perda de dados decorrente do processo de reparo, formatação ou substituição de componentes.'
  );

  blocoTermo(
    '6. ORÇAMENTO E APROVAÇÃO',
    'O orçamento é gratuito. Caso o cliente não aprove o orçamento apresentado, poderá retirar o aparelho sem custo de diagnóstico. Após a aprovação do orçamento e início do serviço, o cliente concorda com os valores apresentados. Qualquer alteração no escopo do serviço será comunicada previamente ao cliente para nova aprovação.'
  );

  blocoTermo(
    '7. ACEITAÇÃO DO TERMO',
    'Ao entregar o aparelho para reparo e/ou ao retirar o aparelho após a conclusão do serviço, o cliente declara ter lido, compreendido e concordado com todos os termos e condições descritos neste documento. Este termo tem validade legal e pode ser utilizado como prova em eventuais disputas administrativas ou judiciais.'
  );

  // Assinatura do termo
  checkY(35);
  y += 5;
  linhaDivisoria(ROSA);

  setFont(7.5, 'normal', '#374151');
  doc.text(`Local e data: _________________________, ${formatarData(os.data_criacao)}`, margin, y + 6);
  y += 14;

  doc.line(margin, y, margin + 75, y);
  doc.line(pageW - margin - 75, y, pageW - margin, y);
  setFont(7, 'normal', '#6b7280');
  doc.text('Assinatura do Cliente', margin + 37, y + 4, { align: 'center' });
  doc.text('Responsável — Juninho.Tech', pageW - margin - 37, y + 4, { align: 'center' });
  y += 10;

  // Rodapé página 2
  setFont(7, 'normal', '#9ca3af');
  doc.text('Juninho.Tech - Assistencia Tecnica  |  @juninho.tech  |  WhatsApp: (21) 97346-8654', pageW / 2, pageH - 8, { align: 'center' });

  // ─────────────────────────────────────────────────────────
  // SALVAR PDF
  // ─────────────────────────────────────────────────────────
  const nomeArquivo = `OS-${String(os.numero_os).padStart(4, '0')}-${(os.cliente?.nome || 'cliente').replace(/\s+/g, '-')}.pdf`;
  doc.save(nomeArquivo);
}
