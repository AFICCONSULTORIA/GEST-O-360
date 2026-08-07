import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scale, Plus, Search, Filter, Edit2, Trash2, Eye, Download, FileText, 
  ExternalLink, CheckCircle2, AlertTriangle, BookOpen, Building2, Calendar, 
  Tag, ShieldCheck, XCircle, Share2, Copy, Printer, RefreshCw, LayoutGrid, 
  List, FileCheck, Layers, ChevronRight, Globe, Info, Sparkles
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { supabase } from '../../lib/supabase';
import { MunicipalLaw, LawType, LawStatus, LawCategory, AdminUser, Institution } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { showToast } from '../../components/ui/Toast';
import { WhatsNewBanner } from '../../components/ui/WhatsNewBanner';

export const INITIAL_MOCK_LAWS: MunicipalLaw[] = [
  {
    id: 'law_1',
    number: '001/1990',
    title: 'Lei Orgânica do Município',
    type: 'Lei Orgânica',
    category: 'Administração Geral',
    publication_date: '1990-04-05',
    status: 'Em Vigor',
    author: 'Câmara Municipal Constitunte',
    ementa: 'Dispõe sobre a organização política, administrativa e financeira do Município, fixando direitos, garantias fundamentais e diretrizes gerais dos poderes municipais.',
    full_text: `PREÂMBULO: Nós, os representantes do povo do Município, reunidos em Câmara Municipal Constitunte, invocando a proteção de Deus, promulgamos a seguinte LEI ORGÂNICA:

ARTIGO 1º - O Município é uma unidade territorial que integra a organização político-administrativa da República Federativa do Brasil, dotado de autonomia política, administrativa e financeira.

ARTIGO 2º - São Poderes do Município, independentes e harmônicos entre si: o Legislativo e o Executivo.

ARTIGO 3º - A sede do Município dá-lhe o nome e tem a categoria de Cidade.

ARTIGO 4º - São símbolos do Município a Bandeira, o Brasão e o Hino representativos de sua cultura e história.`,
    tags: ['Lei Orgânica', 'Autonomia Municipal', 'Poderes', 'Constituição Local'],
    external_link: 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm'
  },
  {
    id: 'law_2',
    number: '045/2021',
    title: 'Código Tributário Municipal',
    type: 'Lei Complementar',
    category: 'Finanças e Tributos',
    publication_date: '2021-12-20',
    status: 'Em Vigor',
    author: 'Poder Executivo Municipal',
    ementa: 'Institui o Código Tributário do Município, regulando as normas relativas ao ISSQN, IPTU, ITBI, Taxas de Licenciamento, Contribuição de Melhoria e Fiscalização Tributária.',
    full_text: `CAPÍTULO I - DISPOSIÇÕES GERAIS E SISTEMA TRIBUTÁRIO MUNICIPAL

ARTIGO 1º - Esta Lei Complementar regula os direitos e obrigações que emanam das relações jurídicas tributárias entre o Município e os contribuintes.

ARTIGO 2º - Integram o Sistema Tributário do Município os seguintes tributos:
I - Imposto sobre a Propriedade Predial e Territorial Urbana (IPTU);
II - Imposto sobre Serviços de Qualquer Natureza (ISSQN);
III - Imposto sobre Transmissão Inter Vivos de Bens Imóveis (ITBI);
IV - Taxas pelo Exercício do Poder de Polícia e Prestação de Serviços Públicos;
V - Contribuição de Melhoria e Contribuição para o Custeio da Iluminação Pública (CIP).`,
    tags: ['Tributos', 'ISSQN', 'IPTU', 'ITBI', 'Arrecadação', 'Fiscal'],
    external_link: ''
  },
  {
    id: 'law_3',
    number: '1.420/2023',
    title: 'Estatuto dos Servidores Públicos Municipais',
    type: 'Lei Ordinária',
    category: 'Servidores e RH',
    publication_date: '2023-05-18',
    status: 'Em Vigor',
    author: 'Poder Executivo Municipal',
    ementa: 'Dispõe sobre o Regime Jurídico dos Servidores Públicos do Município, prevendo direitos, vantagens, deveres, regime disciplinar e plano de desenvolvimento funcional.',
    full_text: `TÍTULO I - DAS DISPOSIÇÕES PRELIMINARES

ARTIGO 1º - Esta Lei institui o Regime Jurídico Único dos Servidores Públicos da Administração Direta, Autárquica e Fundacional do Município.

ARTIGO 2º - Para os efeitos deste Estatuto, servidor é a pessoa legalmente investida em cargo público mediante concurso público de provas ou de provas e títulos.

ARTIGO 3º - Cargo público é o conjunto de atribuições e responsabilidades criadas por lei, com denominação própria e vencimento pago pelos cofres públicos.`,
    tags: ['RH', 'Servidores', 'Estatuto', 'Regime Jurídico', 'Concurso Público'],
    external_link: ''
  },
  {
    id: 'law_4',
    number: '089/2024',
    title: 'Regulamento da Nova Lei de Licitações (Lei nº 14.133/2021)',
    type: 'Decreto',
    category: 'Administração Geral',
    publication_date: '2024-01-15',
    status: 'Em Vigor',
    author: 'Prefeito Municipal',
    ementa: 'Regulamenta no âmbito da Administração Pública Municipal a aplicação da Lei Federal nº 14.133/2021 para licitações, contratação direta, dispensation e governança de contratos.',
    full_text: `DECRETO MUNICIPAL Nº 089/2024

O PREFEITO MUNICIPAL, no uso das atribuições legais que lhe confere a Lei Orgânica do Município,

DECRETA:
Art. 1º Este Decreto regulamenta as regras de transição, a atuação dos agentes de contratação, comissão de contratação, equipe de apoio, fiscais e gestores no âmbito da Lei Federal nº 14.133, de 1º de abril de 2021.

Art. 2º É obrigatório o uso da modalidade pregão eletrônico para aquisições de bens e serviços comuns, priorizando o critério de menor preço ou maior desconto.`,
    tags: ['Licitações', 'Contratos', 'Lei 14.133', 'Compras Públicas', 'Decreto'],
    external_link: ''
  },
  {
    id: 'law_5',
    number: '1.380/2022',
    title: 'Plano Diretor de Desenvolvimento Urbano e Ambiental',
    type: 'Lei Ordinária',
    category: 'Urbanismo e Patrimônio',
    publication_date: '2022-09-10',
    status: 'Em Vigor',
    author: 'Poder Executivo Municipal',
    ementa: 'Estabelece as diretrizes de expansão urbana, ordenamento do solo, proteção das bacias hidrográficas e zoneamento ambiental do Município.',
    full_text: `PLANO DIRETOR MUNICIPAL

Art. 1º O Plano Diretor é o instrumento básico da política de desenvolvimento urbano e de expansão do Município, determinante para todos os agentes públicos e privados.

Art. 2º Fica dividida a zona urbana em perímetros de expansão residencial, comercial, industrial e de preservação ambiental permanente.`,
    tags: ['Urbanismo', 'Plano Diretor', 'Zoneamento', 'Obras', 'Meio Ambiente'],
    external_link: ''
  },
  {
    id: 'law_6',
    number: '012/2024',
    title: 'Instituição do Diário Oficial Eletrônico do Município',
    type: 'Decreto',
    category: 'Administração Geral',
    publication_date: '2024-02-01',
    status: 'Em Vigor',
    author: 'Prefeito Municipal',
    ementa: 'Institui o Diário Oficial Eletrônico como meio oficial de publicação de leis, decretos, portarias, avisos de licitação e demais atos administrativos municipais.',
    full_text: `DECRETO MUNICIPAL Nº 012/2024

Art. 1º Fica instituído o Diário Oficial Eletrônico do Município, veiculado na rede mundial de computadores, para publicação dos atos oficiais do Poder Executivo e Autarquias.

Art. 2º As edições do Diário Oficial Eletrônico serão assinadas digitalmente com certificado ICP-Brasil, garantindo autenticidade e validade jurídica.`,
    tags: ['Diário Oficial', 'Transparência', 'Publicidade', 'Certificação ICP'],
    external_link: ''
  },
  {
    id: 'law_7',
    number: '034/2025',
    title: 'Nomeação da Comissão Técnica do Radar PNTP',
    type: 'Portaria',
    category: 'Administração Geral',
    publication_date: '2025-03-10',
    status: 'Em Vigor',
    author: 'Secretário Municipal de Administração',
    ementa: 'Designa servidores para compor a Comissão Especial responsável pelo envio de evidências e auditoria contínua do Portal da Transparência no Radar PNTP.',
    full_text: `PORTARIA MUNICIPAL Nº 034/2025

Art. 1º Designar os servidores municipais abaixo relacionados para integrarem a Comissão do Programa Nacional de Transparência Pública (PNTP).

Art. 2º A comissão responderá pelo upload regular de certidões, contratos, despesas e relatórios exigidos pelo Tribunal de Contas.`,
    tags: ['PNTP', 'Portaria', 'Comissão', 'Transparência', 'TCE'],
    external_link: ''
  },
  {
    id: 'law_8',
    number: '1.102/2018',
    title: 'Antigo Código de Posturas e Licenciamento Ambiental',
    type: 'Lei Ordinária',
    category: 'Meio Ambiente',
    publication_date: '2018-06-14',
    status: 'Alterada',
    author: 'Câmara Municipal',
    ementa: 'Regulamentava o licenciamento ambiental simplificado e posturas urbanas. Alterada parcialmente pela Lei nº 1.380/2022.',
    full_text: `LEI MUNICIPAL Nº 1.102/2018 (Com alterações da Lei nº 1.380/2022)

Art. 1º Nenhuma atividade comercial, industrial ou prestadora de serviços poderá funcionar no Município sem a licença prévia de localização e vistoria ambiental.`,
    tags: ['Licenciamento', 'Meio Ambiente', 'Alterada', 'Posturas'],
    external_link: ''
  }
];

const LAW_TYPES: LawType[] = [
  'Lei Orgânica', 'Lei Complementar', 'Lei Ordinária', 
  'Decreto', 'Portaria', 'Resolução', 'Emenda à LOM', 'Outros'
];

const LAW_CATEGORIES: LawCategory[] = [
  'Administração Geral', 'Finanças e Tributos', 'Saúde', 
  'Educação', 'Meio Ambiente', 'Viação e Obras', 
  'Servidores e RH', 'Assistência Social', 'Urbanismo e Patrimônio', 'Geral'
];

const LAW_STATUSES: LawStatus[] = [
  'Em Vigor', 'Revogada', 'Alterada', 'Regulamentada', 'Em Tramitação'
];

// Law Reader Modal Component
const LawReaderModal = ({ 
  law, 
  onClose,
  onEdit 
}: { 
  law: MunicipalLaw, 
  onClose: () => void,
  onEdit?: (law: MunicipalLaw) => void 
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  const handlePrintPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
      const { height } = page.getSize();
      
      const timesBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const timesRoman = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Header Bar
      page.drawRectangle({
        x: 40,
        y: height - 100,
        width: 515,
        height: 60,
        color: rgb(0.08, 0.12, 0.2)
      });

      page.drawText('ESTADO E MUNICÍPIO - REPOSITÓRIO OFICIAL', {
        x: 60,
        y: height - 65,
        size: 10,
        font: timesBold,
        color: rgb(0.7, 0.8, 1)
      });

      page.drawText(`FICHA TÉCNICA E TEXTO DA NORMA - ${law.number}`, {
        x: 60,
        y: height - 85,
        size: 14,
        font: timesBold,
        color: rgb(1, 1, 1)
      });

      // Law Information Table
      let currentY = height - 130;
      
      const drawField = (label: string, value: string) => {
        page.drawText(`${label}:`, {
          x: 40,
          y: currentY,
          size: 10,
          font: timesBold,
          color: rgb(0.3, 0.3, 0.3)
        });
        page.drawText(value || 'N/A', {
          x: 150,
          y: currentY,
          size: 10,
          font: timesRoman,
          color: rgb(0.1, 0.1, 0.1)
        });
        currentY -= 18;
      };

      drawField('Tipo de Norma', law.type);
      drawField('Número / Ano', law.number);
      drawField('Título', law.title);
      drawField('Categoria', law.category);
      drawField('Data Publicação', law.publication_date);
      drawField('Status da Norma', law.status);
      drawField('Autor / Origem', law.author || 'Poder Executivo');

      currentY -= 10;
      // Ementa Box
      page.drawRectangle({
        x: 40,
        y: currentY - 50,
        width: 515,
        height: 55,
        color: rgb(0.96, 0.97, 0.98)
      });

      page.drawText('EMENTA:', {
        x: 50,
        y: currentY - 12,
        size: 9,
        font: timesBold,
        color: rgb(0.2, 0.4, 0.7)
      });

      // Wrap Ementa Text
      const words = law.ementa.split(' ');
      let line = '';
      let lineY = currentY - 25;
      for (const word of words) {
        if ((line + word).length > 80) {
          page.drawText(line, { x: 50, y: lineY, size: 8, font: timesRoman });
          line = word + ' ';
          lineY -= 11;
        } else {
          line += word + ' ';
        }
      }
      if (line) {
        page.drawText(line, { x: 50, y: lineY, size: 8, font: timesRoman });
      }

      currentY -= 75;

      // Full Text Header
      page.drawText('INTEIRO TEOR / TEXTO DA NORMA:', {
        x: 40,
        y: currentY,
        size: 11,
        font: timesBold,
        color: rgb(0.1, 0.1, 0.1)
      });
      currentY -= 20;

      const textLines = (law.full_text || law.ementa).split('\n');
      for (const rawLine of textLines) {
        if (currentY < 60) break;
        const safeLine = rawLine.substring(0, 95);
        page.drawText(safeLine, {
          x: 40,
          y: currentY,
          size: 8,
          font: rawLine.startsWith('ARTIGO') || rawLine.startsWith('DECRETO') || rawLine.startsWith('LEI') ? timesBold : timesRoman,
          color: rgb(0.15, 0.15, 0.15)
        });
        currentY -= 12;
      }

      // Footer
      page.drawText(`Documento gerado pelo Banco de Leis - GESTÃO 360 em ${new Date().toLocaleDateString('pt-BR')}`, {
        x: 40,
        y: 30,
        size: 8,
        font: timesRoman,
        color: rgb(0.5, 0.5, 0.5)
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      showToast('Documento oficial gerado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erro ao gerar o documento PDF da lei.', 'error');
    }
    setIsGeneratingPdf(false);
  };

  const getStatusBadgeStyle = (status: LawStatus) => {
    switch (status) {
      case 'Em Vigor':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'Revogada':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'Alterada':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Regulamentada':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col border border-neutral-100 dark:border-neutral-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b border-neutral-100 dark:border-neutral-800 pb-5 shrink-0">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-black text-xs rounded-lg uppercase tracking-wider">
                {law.type}
              </span>
              <span className={`px-3 py-1 font-bold text-xs rounded-lg border ${getStatusBadgeStyle(law.status)}`}>
                ● {law.status}
              </span>
              <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold text-xs rounded-lg">
                {law.category}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {law.type} Nº {law.number}
            </h2>
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">
              {law.title}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <XCircle size={22} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
          {/* Ementa Banner */}
          <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                <FileText size={14} /> Ementa da Norma
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(law.ementa);
                  showToast('Ementa copiada para a área de transferência!', 'info');
                }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Copy size={12} /> Copiar Ementa
              </button>
            </div>
            <p className="text-sm sm:text-base text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed">
              {law.ementa}
            </p>
          </div>

          {/* Quick Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl text-xs">
            <div>
              <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5">Data de Publicidade</span>
              <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                <Calendar size={13} className="text-neutral-400" /> {law.publication_date ? new Date(law.publication_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5">Autor / Origem</span>
              <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1">
                <Building2 size={13} className="text-neutral-400" /> {law.author || 'Poder Executivo'}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5">Número de Registro</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {law.number}
              </span>
            </div>
            <div>
              <span className="text-neutral-400 dark:text-neutral-500 font-bold block mb-0.5">Ano da Norma</span>
              <span className="font-bold text-neutral-900 dark:text-white">
                {law.number.split('/')[1] || law.publication_date?.split('-')[0] || 'Atual'}
              </span>
            </div>
          </div>

          {/* Full Text / Inteiro Teor */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
              <BookOpen size={14} /> Texto Integral da Norma (Inteiro Teor)
            </h4>
            <div className="p-6 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl font-mono text-xs sm:text-sm text-neutral-800 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {law.full_text || law.ementa}
            </div>
          </div>

          {/* Tags */}
          {law.tags && law.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2">
              <Tag size={14} className="text-neutral-400" />
              {law.tags.map(tag => (
                <span key={tag} className="text-[10px] uppercase font-bold px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 dark:border-neutral-800 pt-5 shrink-0">
          <div className="flex items-center gap-2">
            {law.file_url && (
              <a 
                href={law.file_url} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-xs rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-2"
              >
                <Download size={14} /> Anexo Oficial (PDF)
              </a>
            )}
            {law.external_link && (
              <a 
                href={law.external_link} 
                target="_blank" 
                rel="noreferrer"
                className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-xs rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-2"
              >
                <ExternalLink size={14} /> Diário Oficial
              </a>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(law);
                }}
                className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-xs rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all flex items-center gap-2"
              >
                <Edit2 size={14} /> Editar
              </button>
            )}
            <button
              disabled={isGeneratingPdf}
              onClick={handlePrintPdf}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={14} /> {isGeneratingPdf ? 'Gerando PDF...' : 'Imprimir / Exportar Ficha'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Form Modal for Creating/Editing Laws
const LawFormModal = ({
  lawToEdit,
  onClose,
  onSave
}: {
  lawToEdit?: MunicipalLaw | null,
  onClose: () => void,
  onSave: (lawData: Partial<MunicipalLaw>, pdfFile?: File | null) => Promise<void>
}) => {
  const [number, setNumber] = React.useState(lawToEdit?.number || '');
  const [title, setTitle] = React.useState(lawToEdit?.title || '');
  const [type, setType] = React.useState<LawType>(lawToEdit?.type || 'Lei Ordinária');
  const [category, setCategory] = React.useState<LawCategory>(lawToEdit?.category || 'Administração Geral');
  const [status, setStatus] = React.useState<LawStatus>(lawToEdit?.status || 'Em Vigor');
  const [publicationDate, setPublicationDate] = React.useState(lawToEdit?.publication_date || new Date().toISOString().split('T')[0]);
  const [author, setAuthor] = React.useState(lawToEdit?.author || 'Poder Executivo Municipal');
  const [ementa, setEmenta] = React.useState(lawToEdit?.ementa || '');
  const [fullText, setFullText] = React.useState(lawToEdit?.full_text || '');
  const [externalLink, setExternalLink] = React.useState(lawToEdit?.external_link || '');
  const [tagsInput, setTagsInput] = React.useState(lawToEdit?.tags?.join(', ') || '');
  const [file, setFile] = React.useState<File | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number || !title || !ementa) {
      showToast('Por favor, preencha o número, título e ementa da norma.', 'warning');
      return;
    }

    setIsSaving(true);
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    await onSave({
      ...(lawToEdit ? { id: lawToEdit.id } : {}),
      number,
      title,
      type,
      category,
      status,
      publication_date: publicationDate,
      author,
      ementa,
      full_text: fullText,
      external_link: externalLink,
      tags
    }, file);
    setIsSaving(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[32px] p-8 shadow-2xl space-y-6 max-h-[92vh] flex flex-col border border-neutral-100 dark:border-neutral-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-4 shrink-0">
          <div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
              <Scale className="text-emerald-500" /> {lawToEdit ? 'Editar Ato Normativo' : 'Nova Lei ou Ato Normativo'}
            </h3>
            <p className="text-xs font-semibold text-neutral-400 mt-1">
              Cadastre e publique normas com controle de vigência e anexo oficial.
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            <XCircle size={20} className="text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Tipo de Ato *
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as LawType)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white"
              >
                {LAW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Número / Ano *
              </label>
              <input 
                type="text"
                placeholder="Ex: 1.234/2024"
                value={number}
                onChange={e => setNumber(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Status da Norma *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LawStatus)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white"
              >
                {LAW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Título / Nome Resumido *
              </label>
              <input 
                type="text"
                placeholder="Ex: Código Tributário Municipal"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Categoria / Área Temática
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as LawCategory)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white"
              >
                {LAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Data de Assinatura / Publicação
              </label>
              <input 
                type="date"
                value={publicationDate}
                onChange={e => setPublicationDate(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Autor / Iniciativa
              </label>
              <input 
                type="text"
                placeholder="Ex: Poder Executivo Municipal"
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Ementa (Resumo Explicativo Oficial) *
            </label>
            <textarea
              rows={3}
              placeholder="Descreva a ementa oficial da norma..."
              value={ementa}
              onChange={e => setEmenta(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 text-xs font-medium outline-none dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Inteiro Teor / Texto da Norma (Artigos e Parágrafos)
            </label>
            <textarea
              rows={6}
              placeholder="Digite ou cole o texto completo dos artigos da lei..."
              value={fullText}
              onChange={e => setFullText(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 font-mono text-xs outline-none dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Link do Diário Oficial / Externo (URL)
              </label>
              <input 
                type="url"
                placeholder="https://..."
                value={externalLink}
                onChange={e => setExternalLink(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-medium outline-none dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Palavras-chave (Tags separadas por vírgula)
              </label>
              <input 
                type="text"
                placeholder="Tributos, IPTU, Licitações"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 text-xs font-medium outline-none dark:text-white"
              />
            </div>
          </div>

          {/* PDF File Upload */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Documento Anexo (PDF Oficial)
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition-colors"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".pdf,.doc,.docx"
                className="hidden" 
                onChange={e => e.target.files && setFile(e.target.files[0])}
              />
              <Download size={20} className="mx-auto text-neutral-400 mb-1" />
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
                {file ? file.name : (lawToEdit?.file_url ? "Arquivo já anexado (Clique para substituir)" : "Selecione o arquivo em PDF para anexo")}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-3.5 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : (lawToEdit ? 'Salvar Alterações' : 'Publicar Lei / Ato')}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-3.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-bold text-xs rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Main Component
export const LawsModule = ({ 
  currentUser, 
  institution 
}: { 
  currentUser?: AdminUser, 
  institution?: Institution 
}) => {
  const canEdit = hasPermission(currentUser, 'laws', 'edit');
  const canAdmin = hasPermission(currentUser, 'laws', 'admin');

  const [laws, setLaws] = React.useState<MunicipalLaw[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedLaw, setSelectedLaw] = React.useState<MunicipalLaw | null>(null);
  const [editingLaw, setEditingLaw] = React.useState<MunicipalLaw | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<string>('Todos');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Todas');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('Todos');
  const [selectedYear, setSelectedYear] = React.useState<string>('Todos');
  const [viewLayout, setViewLayout] = React.useState<'grid' | 'table'>('grid');

  const loadLaws = React.useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('municipal_laws').select('*').order('created_at', { ascending: false });
      if (institution?.id) {
        query = query.eq('institution_id', institution.id);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Error fetching laws:', error);
        showToast('Erro ao carregar leis do banco de dados.', 'error');
        setLaws([]);
      } else {
        setLaws((data || []) as MunicipalLaw[]);
      }
    } catch (err) {
      console.error(err);
      setLaws([]);
    }
    setIsLoading(false);
  }, [institution?.id]);

  React.useEffect(() => {
    loadLaws();
  }, [loadLaws]);

  // Save / Update
  const handleSaveLaw = async (lawData: Partial<MunicipalLaw>, pdfFile?: File | null) => {
    let fileUrl = lawData.file_url;

    if (pdfFile) {
      const safeName = pdfFile.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `law_${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage.from('leis').upload(filename, pdfFile);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('leis').getPublicUrl(filename);
        fileUrl = publicUrlData.publicUrl;
      }
    }

    const payload = {
      ...lawData,
      file_url: fileUrl,
      institution_id: institution?.id || null
    };

    if (lawData.id) {
      // Update
      const { error } = await supabase.from('municipal_laws').update(payload).eq('id', lawData.id);
      if (error) {
        console.error(error);
        showToast('Erro ao atualizar a norma.', 'error');
      } else {
        await loadLaws();
        showToast('Lei/Ato normativo atualizado com sucesso!', 'success');
      }
    } else {
      // Create
      delete payload.id; // Allow Supabase to generate the UUID
      
      const { error } = await supabase.from('municipal_laws').insert([payload]);
      if (error) {
        console.error(error);
        showToast('Erro ao cadastrar a norma.', 'error');
      } else {
        await loadLaws();
        showToast('Nova lei cadastrada e publicada com sucesso!', 'success');
      }
    }

    setIsFormOpen(false);
    setEditingLaw(null);
  };

  // Delete
  const handleDeleteLaw = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta lei do repositório?')) return;

    const { error } = await supabase.from('municipal_laws').delete().eq('id', id);
    if (error) {
      console.error(error);
      showToast('Erro ao excluir a norma.', 'error');
    } else {
      await loadLaws();
      showToast('Norma excluída com sucesso.', 'info');
    }
  };

  // Filtered dataset
  const filteredLaws = laws.filter(l => {
    const matchesSearch = 
      l.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.ementa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.tags && l.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesType = selectedType === 'Todos' || l.type === selectedType;
    const matchesCategory = selectedCategory === 'Todas' || l.category === selectedCategory;
    const matchesStatus = selectedStatus === 'Todos' || l.status === selectedStatus;
    const matchesYear = selectedYear === 'Todos' || l.number.endsWith(selectedYear) || (l.publication_date && l.publication_date.startsWith(selectedYear));

    return matchesSearch && matchesType && matchesCategory && matchesStatus && matchesYear;
  });

  // Calculate metrics
  const totalCount = laws.length;
  const inForceCount = laws.filter(l => l.status === 'Em Vigor').length;
  const decreesCount = laws.filter(l => l.type === 'Decreto' || l.type === 'Portaria').length;
  const alteredCount = laws.filter(l => l.status === 'Revogada' || l.status === 'Alterada').length;

  return (
    <div className="space-y-8">
      {/* What's New Banner */}
      <WhatsNewBanner 
        version="1.0.0"
        title="Novo Banco de Leis e Atos Normativos Integrado"
        features={[
          "Consulte e publique leis municipais, decretos e resoluções.",
          "Controle completo de vigência (Em Vigor, Revogada, Alterada).",
          "Visualização de inteiro teor na própria plataforma.",
          "Geração automática e exportação oficial em formato PDF."
        ]}
      />

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white flex items-center gap-3 tracking-tight">
            <Scale className="text-emerald-500" size={34} /> Banco de Leis e Legislação
          </h1>
          <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
            Repositório oficial de normas municipais, decretos, portarias e regimentos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLaws}
            className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-sm"
            title="Atualizar lista"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          
          {canEdit && (
            <button
              onClick={() => {
                setEditingLaw(null);
                setIsFormOpen(true);
              }}
              className="px-6 py-3.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Nova Lei / Ato
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm space-y-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Total de Atos Registrados</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">{totalCount}</span>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full">Atualizado</span>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm space-y-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Leis em Vigor</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{inForceCount}</span>
            <span className="text-xs font-bold text-neutral-400">
              {totalCount ? Math.round((inForceCount / totalCount) * 100) : 0}% do total
            </span>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm space-y-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Decretos e Portarias</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-black text-purple-600 dark:text-purple-400">{decreesCount}</span>
            <span className="text-xs font-bold text-purple-500 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-full">Executivo</span>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm space-y-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Leis Alteradas / Revogadas</span>
          <div className="flex justify-between items-baseline">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{alteredCount}</span>
            <span className="text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full">Histórico</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por número da lei, título, ementa ou palavra-chave..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-3 rounded-xl transition-colors ${viewLayout === 'grid' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}
              title="Visualização em grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-3 rounded-xl transition-colors ${viewLayout === 'table' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}
              title="Visualização em tabela"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Tipo de Ato</label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
            >
              <option value="Todos">Todos os Tipos</option>
              {LAW_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Categoria / Área</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
            >
              <option value="Todas">Todas as Áreas</option>
              {LAW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Vigência / Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
            >
              <option value="Todos">Todos os Status</option>
              {LAW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-neutral-400 block mb-1">Ano da Norma</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none dark:text-white"
            >
              <option value="Todos">Todos os Anos</option>
              {['2026', '2025', '2024', '2023', '2022', '2021', '2020', '1990'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Rendering: Grid vs Table */}
      {filteredLaws.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-neutral-900 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl">
          <Scale size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-3" />
          <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-300">Nenhuma lei ou ato normativo encontrado</h3>
          <p className="text-xs font-medium text-neutral-400 mt-1 max-w-sm mx-auto">
            Tente modificar os termos da busca ou ajustar os filtros por tipo, categoria ou vigência.
          </p>
        </div>
      ) : viewLayout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLaws.map(law => (
            <motion.div
              key={law.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-black text-[10px] uppercase rounded-md">
                    {law.type}
                  </span>
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${
                    law.status === 'Em Vigor' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                    law.status === 'Revogada' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' :
                    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  }`}>
                    ● {law.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Nº {law.number}
                  </h3>
                  <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                    {law.title}
                  </p>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-3 leading-relaxed font-medium bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-2xl">
                  {law.ementa}
                </p>
              </div>

              <div className="space-y-3 pt-2 border-t border-neutral-50 dark:border-neutral-800/80">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {law.publication_date ? new Date(law.publication_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'}
                  </span>
                  <span className="font-semibold text-neutral-500 dark:text-neutral-400">
                    {law.category}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedLaw(law)}
                    className="flex-1 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-400 dark:hover:text-neutral-950 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye size={14} /> Ver Inteiro Teor
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingLaw(law);
                        setIsFormOpen(true);
                      }}
                      className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}

                  {canAdmin && (
                    <button
                      onClick={() => handleDeleteLaw(law.id)}
                      className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-400 font-black uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                  <th className="p-4">Tipo / Número</th>
                  <th className="p-4">Título</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Publicação</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredLaws.map(law => (
                  <tr key={law.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="p-4 font-black text-neutral-900 dark:text-white">
                      <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded font-bold mr-2 text-[10px]">
                        {law.type}
                      </span>
                      {law.number}
                    </td>
                    <td className="p-4 font-semibold text-neutral-800 dark:text-neutral-200 max-w-xs truncate">
                      {law.title}
                    </td>
                    <td className="p-4 text-neutral-500 dark:text-neutral-400 font-medium">
                      {law.category}
                    </td>
                    <td className="p-4 text-neutral-500 dark:text-neutral-400 font-medium">
                      {law.publication_date ? new Date(law.publication_date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${
                        law.status === 'Em Vigor' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                        law.status === 'Revogada' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800' :
                        'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}>
                        {law.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLaw(law)}
                          className="px-3 py-1.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                          Visualizar
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditingLaw(law);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-200"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canAdmin && (
                          <button
                            onClick={() => handleDeleteLaw(law.id)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reader Modal */}
      <AnimatePresence>
        {selectedLaw && (
          <LawReaderModal
            law={selectedLaw}
            onClose={() => setSelectedLaw(null)}
            onEdit={canEdit ? (law) => {
              setEditingLaw(law);
              setIsFormOpen(true);
            } : undefined}
          />
        )}
      </AnimatePresence>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <LawFormModal
            lawToEdit={editingLaw}
            onClose={() => {
              setIsFormOpen(false);
              setEditingLaw(null);
            }}
            onSave={handleSaveLaw}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
