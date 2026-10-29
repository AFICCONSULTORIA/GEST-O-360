import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, XCircle, FileBadge, Download, CheckCircle2, AlertTriangle, Plus, Search, ExternalLink, Trash2, FileText, Link as LinkIcon, Settings, Edit2, Printer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, ShieldCheck, Clock, AlertCircle
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '../../lib/supabase';
import { isDemoEnvironment } from '../../lib/demoManager';
import { CompanyCertificates, CertificateTypeKey, CertificateRecord } from '../../types';
import { hasPermission } from '../../lib/permissions';
import { showToast } from '../../components/ui/Toast';
import { WhatsNewBanner } from '../../components/ui/WhatsNewBanner';
import { DemoFillButton } from '../../components/DemoFillButton';

export const DEFAULT_STATE_LINKS: Record<string, string> = {
  AC: 'https://sefaznet.ac.gov.br/sefazonline/servlet/wcertidaonegativa',
  AL: 'https://contribuinte.sefaz.al.gov.br/certidao',
  AP: 'https://www.sefaz.ap.gov.br',
  AM: 'http://sistemas.sefaz.am.gov.br/gae/certidao-negativa',
  BA: 'https://www.sefaz.ba.gov.br/scripts/certidao/certidaoBaResult.asp',
  CE: 'https://internet-consultapublica.apps.sefaz.ce.gov.br/certidaonegativa',
  DF: 'https://ww1.receita.fazenda.df.gov.br/cidadao/certidoes',
  ES: 'https://internet.sefaz.es.gov.br/agenciavirtual/area_publica/cnd/emissao.php',
  GO: 'https://www.economia.go.gov.br/certidao.html',
  MA: 'https://sistemas1.sefaz.ma.gov.br/certidoes/jsp/emissaoCertidaoNegativa/emissaoCertidaoNegativa.jsf',
  MT: 'https://www.sefaz.mt.gov.br/cnd/certidao/servlet/ServletRotd',
  MS: 'https://eservicos.sefaz.ms.gov.br/certidao',
  MG: 'https://www2.fazenda.mg.gov.br/sol',
  PA: 'https://app.sefa.pa.gov.br/emissao-certidao',
  PB: 'https://www.sefaz.pb.gov.br/servirtual/cnd',
  PR: 'https://www.arinternet.pr.gov.br/certidao',
  PE: 'https://efisco.sefaz.pe.gov.br/sfi_trb_gcc/PREmitirCertidaoNegativaDebitosFiscal',
  PI: 'https://webas.sefaz.pi.gov.br/certidaonet',
  RJ: 'https://www4.fazenda.rj.gov.br/certidao-fiscal-web',
  RN: 'https://uvt.set.rn.gov.br',
  RS: 'https://www.sefaz.rs.gov.br/SAT/CER-PUB-SOL.aspx',
  RO: 'https://portalcontribuinte.sefin.ro.gov.br',
  RR: 'https://www.sefaz.rr.gov.br',
  SC: 'https://sat.sef.sc.gov.br/tax.NET/Sat.CtaCte.Web/SolicitacaoCnd.aspx',
  SP: 'https://www10.fazenda.sp.gov.br/CertidaoNegativaDeb/Pages/EmissaoCertidaoNegativa.aspx',
  SE: 'https://www.sefaz.se.gov.br/SitePages/servico.aspx?cod=8',
  TO: 'https://www.to.gov.br/sefaz/cnd-certidao-negativa-de-debitos/7h3xx8lr88vg'
};

export const DEFAULT_CERT_LINKS: Record<string, string> = {
  'Trabalhista': 'https://cndt-certidao.tst.jus.br/inicio.faces',
  'Federal': 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home',
  'Estadual': 'https://www.sefaz.mt.gov.br/cnd/certidao/servlet/ServletRotdAberto?origem=60',
  'Municipal': 'http://45.161.37.1:8080/servicosweb/home.jsf',
  'FGTS': 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf',
  'Falência e Concordata': 'https://sec.tjmt.jus.br/',
  'CEIS/CNEP': 'https://certidoes.cgu.gov.br/',
  'TCU/TCE': 'https://certidoes-apf.apps.tcu.gov.br/'
};

export const MAIN_CERT_TYPES: CertificateTypeKey[] = ['Trabalhista', 'Federal', 'Estadual', 'Municipal', 'FGTS'];
export const EXTRA_CERT_TYPES: CertificateTypeKey[] = ['Falência e Concordata', 'CEIS/CNEP', 'TCU/TCE'];
export const ALL_CERT_TYPES: CertificateTypeKey[] = [...MAIN_CERT_TYPES, ...EXTRA_CERT_TYPES];

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

// Validação matemática oficial de CNPJ (14 dígitos)
const isValidCNPJ = (cnpj: string): boolean => {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(clean.slice(0, 12), w1);
  const d2 = calcDigit(clean.slice(0, 12) + d1, w2);

  return clean.endsWith(`${d1}${d2}`);
};

// Validação matemática oficial de CPF (11 dígitos)
const isValidCPF = (cpf: string): boolean => {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean[10], 10);
};

// Remove arquivo antigo do Supabase Storage para evitar acúmulo de PDFs vencidos
const removeStorageFileByUrl = async (fileUrl?: string) => {
  if (!fileUrl) return;
  try {
    const marker = '/certidoes/';
    const idx = fileUrl.indexOf(marker);
    if (idx !== -1) {
      const storagePath = decodeURIComponent(fileUrl.slice(idx + marker.length).split('?')[0]);
      if (storagePath) {
        await supabase.storage.from('certidoes').remove([storagePath]);
      }
    }
  } catch (err) {
    console.warn('Não foi possível remover o arquivo antigo do Storage:', err);
  }
};

const StateSelectionModal = ({ stateLinks, onClose }: { stateLinks: Record<string, string>, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-[40px] p-10 shadow-2xl space-y-6 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center shrink-0">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2"><ExternalLink size={24} /> Selecione o Estado</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">Escolha a Unidade Federativa para emitir a certidão na SEFAZ correspondente.</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(stateLinks).map(([uf, link]) => (
              <a 
                key={uf}
                href={link} 
                target="_blank" 
                rel="noreferrer" 
                onClick={onClose}
                className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 rounded-xl flex items-center justify-center font-black text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shadow-sm">
                    {uf}
                  </div>
                  <span className="font-bold text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                    {STATE_NAMES[uf] || uf}
                  </span>
                </div>
                <ExternalLink size={16} className="text-neutral-300 dark:text-neutral-600 group-hover:text-emerald-500 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CertificateUploadModal = ({ title, onClose, onConfirm }: { title: string, onClose: () => void, onConfirm: (expiryDate: string, file: File | null) => void }) => {
  const [expiryDate, setExpiryDate] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-neutral-100 dark:border-neutral-700">
            <FileText size={32} className="text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Anexar Certidão</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{title}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2">Data de Vencimento</label>
            <input 
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white outline-none dark:text-white"
            />
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-center hover:border-neutral-900 dark:hover:border-white transition-colors cursor-pointer"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => e.target.files && setFile(e.target.files[0])}
            />
            <Download size={24} className="mx-auto mb-2 text-neutral-400" />
            <p className="text-sm font-bold text-neutral-900 dark:text-white">
              {file ? file.name : "Clique para selecionar o arquivo (PDF ou Imagem)"}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            disabled={!expiryDate || isUploading}
            onClick={async () => {
              setIsUploading(true);
              await onConfirm(expiryDate, file);
              setIsUploading(false);
            }}
            className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-[20px] font-black uppercase tracking-widest text-xs disabled:opacity-50 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
          >
            {isUploading ? 'Enviando...' : 'Salvar Certidão'}
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-4 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-[20px] font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CertificateEditDateModal = ({ title, currentExpiryDate, onClose, onConfirm }: { title: string, currentExpiryDate: string, onClose: () => void, onConfirm: (expiryDate: string) => void }) => {
  const [expiryDate, setExpiryDate] = React.useState(currentExpiryDate);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-neutral-100 dark:border-neutral-700">
            <Edit2 size={32} className="text-neutral-400 dark:text-neutral-500" />
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Editar Validade</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{title}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-2">Nova Data de Vencimento</label>
            <input 
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white outline-none dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            disabled={!expiryDate}
            onClick={() => onConfirm(expiryDate)}
            className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-[20px] font-black uppercase tracking-widest text-xs disabled:opacity-50 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
          >
            Salvar Alteração
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-4 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-[20px] font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ManageCertificatesModal = ({ 
  company, 
  certLinks, 
  stateLinks, 
  institutionId,
  onClose, 
  onUpdate, 
  canEdit = true 
}: { 
  company: CompanyCertificates, 
  certLinks: Record<string, string>, 
  stateLinks: Record<string, string>, 
  institutionId?: string,
  onClose: () => void, 
  onUpdate: (comp: CompanyCertificates) => void, 
  canEdit?: boolean 
}) => {
  const [uploadingCert, setUploadingCert] = React.useState<string | null>(null);
  const [editingDateCert, setEditingDateCert] = React.useState<string | null>(null);
  const [isStateModalOpen, setIsStateModalOpen] = React.useState(false);
  const [isPrintingAll, setIsPrintingAll] = React.useState(false);
  const [selectedCerts, setSelectedCerts] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<'principais' | 'complementares'>('principais');

  const handlePrint = async (selectedOnly: boolean) => {
    const certsToPrint = selectedOnly ? selectedCerts : ALL_CERT_TYPES;
    if (certsToPrint.length === 0) {
      showToast('Nenhuma certidão selecionada para impressão.', 'warning');
      return;
    }

    setIsPrintingAll(true);
    try {
      const pdfDoc = await PDFDocument.create();
      let hasPages = false;

      for (const certType of certsToPrint) {
        const cert = company.certificates[certType];
        if (cert && cert.fileUrl) {
          try {
            const response = await fetch(cert.fileUrl);
            const arrayBuffer = await response.arrayBuffer();
            const contentType = response.headers.get('content-type') || '';
            
            if (cert.fileUrl.toLowerCase().endsWith('.pdf') || contentType.includes('pdf')) {
              const donorPdf = await PDFDocument.load(arrayBuffer);
              const copiedPages = await pdfDoc.copyPages(donorPdf, donorPdf.getPageIndices());
              copiedPages.forEach((page) => pdfDoc.addPage(page));
              hasPages = true;
            } else if (contentType.includes('image') || cert.fileUrl.match(/\.(jpeg|jpg|png)$/i)) {
              let image;
              if (contentType.includes('png') || cert.fileUrl.toLowerCase().endsWith('.png')) {
                image = await pdfDoc.embedPng(arrayBuffer);
              } else {
                image = await pdfDoc.embedJpg(arrayBuffer);
              }
              const page = pdfDoc.addPage([image.width, image.height]);
              page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
              });
              hasPages = true;
            }
          } catch (err) {
            console.error(`Erro ao processar certidão ${certType}:`, err);
            showToast(`Erro ao incluir certidão ${certType} na impressão.`, 'warning');
          }
        }
      }

      if (hasPages) {
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        showToast('Documento gerado! O arquivo foi aberto em uma nova guia para impressão.', 'success');
      } else {
        showToast('Nenhuma certidão com arquivo anexado foi encontrada para impressão.', 'warning');
      }
    } catch (error) {
      console.error(error);
      showToast('Erro inesperado ao gerar a impressão.', 'error');
    }
    setIsPrintingAll(false);
  };

  if (uploadingCert) {
    return (
      <CertificateUploadModal 
        title={uploadingCert}
        onClose={() => setUploadingCert(null)}
        onConfirm={async (expiryDate, file) => {
          const previousCert = company.certificates[uploadingCert];
          let fileUrl = previousCert?.fileUrl;

          if (file) {
             const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
             const safeCertType = uploadingCert.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '_');
             const folder = institutionId ? `cnds/${institutionId}` : 'cnds/geral';
             const filename = `${folder}/${company.id}-${safeCertType}-${Date.now()}-${safeName}`;
             const { error } = await supabase.storage.from('certidoes').upload(filename, file);
             if (error) {
               console.error(error);
               showToast('Erro ao salvar arquivo no Storage.', 'error');
             } else {
               // Limpar arquivo antigo do Storage se estiver substituindo
               if (previousCert?.fileUrl) {
                 await removeStorageFileByUrl(previousCert.fileUrl);
               }
               const { data: publicUrlData } = supabase.storage.from('certidoes').getPublicUrl(filename);
               fileUrl = publicUrlData.publicUrl;
             }
          }
          const issue = new Date().toISOString().split('T')[0];
          
          const updated: CompanyCertificates = { 
            ...company,
            certificates: { 
              ...company.certificates, 
              [uploadingCert]: { issueDate: issue, expiryDate: expiryDate, fileUrl } 
            }
          };
          onUpdate(updated);
          setUploadingCert(null);
        }}
      />
    );
  }

  if (editingDateCert) {
    const cert = company.certificates[editingDateCert];
    if (cert) {
      return (
        <CertificateEditDateModal 
          title={editingDateCert}
          currentExpiryDate={cert.expiryDate}
          onClose={() => setEditingDateCert(null)}
          onConfirm={(newExpiryDate) => {
            const updated: CompanyCertificates = {
              ...company,
              certificates: { 
                ...company.certificates, 
                [editingDateCert]: { ...cert, expiryDate: newExpiryDate } 
              }
            };
            onUpdate(updated);
            setEditingDateCert(null);
          }}
        />
      );
    }
  }

  const currentList = activeTab === 'principais' ? MAIN_CERT_TYPES : EXTRA_CERT_TYPES;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-8 md:p-10 shadow-2xl space-y-6 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center shrink-0">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Gerenciar Certidões</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">{company.companyName} • <span className="font-mono">{company.cnpj}</span></p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="flex gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3 shrink-0">
          <button
            onClick={() => setActiveTab('principais')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'principais'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Fiscais Principais (5)
          </button>
          <button
            onClick={() => setActiveTab('complementares')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              activeTab === 'complementares'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <ShieldCheck size={14} /> Complementares Lei 14.133 (3)
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
          {currentList.map(certType => {
            const cert = company.certificates[certType];
            const isPresent = !!cert;
            
            return (
              <div key={certType} className={`flex flex-col sm:flex-row justify-between sm:items-center p-4 rounded-2xl border transition-all gap-4 ${selectedCerts.includes(certType) ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700'}`}>
                <div className="flex items-center gap-4">
                   <div className="w-5 flex justify-center shrink-0">
                     {isPresent && (
                       <input 
                         type="checkbox" 
                         className="w-5 h-5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                         checked={selectedCerts.includes(certType)}
                         onChange={(e) => {
                           if (e.target.checked) setSelectedCerts([...selectedCerts, certType]);
                           else setSelectedCerts(selectedCerts.filter(c => c !== certType));
                         }}
                       />
                     )}
                   </div>
                   <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                     <FileBadge size={18} className={selectedCerts.includes(certType) ? "text-emerald-600" : "text-neutral-400"} />
                   </div>
                   <div>
                     <div className="flex items-center gap-2 relative flex-wrap">
                       <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{certType}</p>
                       
                       {certType === 'Estadual' ? (
                         <button 
                           onClick={() => setIsStateModalOpen(true)}
                           title={`Emitir Certidão ${certType}`} 
                           className="text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 px-3 py-1 rounded-lg border border-transparent transition-all flex items-center gap-1.5 font-bold uppercase tracking-widest shadow-sm"
                         >
                           <ExternalLink size={12} /> Selecionar UF
                         </button>
                       ) : (
                         certLinks[certType] && (
                           <a href={certLinks[certType]} target="_blank" rel="noreferrer" title={`Emitir Certidão ${certType}`} className="text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 px-2 py-0.5 rounded border border-transparent transition-all flex items-center gap-1">
                             <ExternalLink size={10} /> Emitir
                           </a>
                         )
                       )}
                     </div>
                     {isPresent ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Válida até {new Date(cert.expiryDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                          {canEdit && (
                            <button 
                              onClick={() => setEditingDateCert(certType)} 
                              title="Editar Validade"
                              className="text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors bg-neutral-100 dark:bg-neutral-800 hover:bg-sky-50 dark:hover:bg-sky-500/10 p-1 rounded border border-transparent hover:border-sky-200 dark:hover:border-sky-500/30"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                        </div>
                     ) : (
                        <p className="text-xs text-rose-500 dark:text-rose-400 font-bold mt-0.5">Ausente / Não cadastrada</p>
                     )}
                   </div>
                </div>
                
                <div className="flex gap-2">
                  {isPresent && (
                    <a 
                      href={cert.fileUrl || '#'} 
                      target={cert.fileUrl ? "_blank" : undefined} 
                      rel="noreferrer"
                      onClick={(e) => { if (!cert.fileUrl) { e.preventDefault(); showToast('Esta certidão foi salva sem um arquivo anexado.', 'warning'); } }}
                      className="px-4 py-2 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold hover:text-neutral-900 dark:hover:text-white transition-all shadow-sm flex items-center gap-2"
                    >
                      <Download size={14} /> Via
                    </a>
                  )}
                  {canEdit && isPresent && (
                    <button 
                      onClick={async () => {
                        if (confirm(`Tem certeza que deseja excluir a certidão ${certType}?`)) {
                          if (cert?.fileUrl) {
                            await removeStorageFileByUrl(cert.fileUrl);
                          }
                          const updated: CompanyCertificates = {
                            ...company,
                            certificates: { ...company.certificates, [certType]: null }
                          };
                          onUpdate(updated);
                        }
                      }}
                      className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  )}
                  {canEdit && (
                    <button 
                      onClick={() => setUploadingCert(certType)}
                      className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-sm flex items-center gap-2"
                    >
                      {isPresent ? 'Substituir' : 'Anexar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end gap-3 flex-wrap shrink-0">
          {selectedCerts.length > 0 && (
            <button 
              onClick={() => handlePrint(true)}
              disabled={isPrintingAll}
              className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-neutral-900/20 disabled:opacity-50"
            >
              <Printer size={16} />
              {isPrintingAll ? 'Gerando...' : `Imprimir Selecionadas (${selectedCerts.length})`}
            </button>
          )}
          <button 
            onClick={() => handlePrint(false)}
            disabled={isPrintingAll}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <Printer size={16} />
            {isPrintingAll ? 'Gerando PDF...' : 'Imprimir Todas'}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isStateModalOpen && (
          <StateSelectionModal stateLinks={stateLinks} onClose={() => setIsStateModalOpen(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const CompanyFormModal = ({ 
  onClose, 
  onConfirm, 
  initialData,
  existingCompanies = []
}: { 
  onClose: () => void, 
  onConfirm: (comp: CompanyCertificates) => void, 
  initialData?: CompanyCertificates,
  existingCompanies?: CompanyCertificates[]
}) => {
  const isEditing = !!initialData;
  const cleanInitialDoc = initialData?.cnpj.replace(/\D/g, '') || '';
  const initialUseCpf = cleanInitialDoc.length === 11;
  const [formData, setFormData] = React.useState({ 
    companyName: initialData?.companyName || '', 
    cnpj: initialUseCpf ? '' : (initialData?.cnpj || ''), 
    cpf: initialUseCpf ? (initialData?.cnpj || '') : '', 
    useCpf: initialUseCpf 
  });
  const [isFetchingCnpj, setIsFetchingCnpj] = React.useState(false);
  const [cnpjInfo, setCnpjInfo] = React.useState<{ fantasia?: string; situacao?: string; municipio?: string; uf?: string } | null>(null);

  const lookupCnpjOnBrasilApi = async (rawCnpj: string, forceOverwriteName = false) => {
    const clean = rawCnpj.replace(/\D/g, '');
    if (clean.length !== 14) {
      showToast('Digite os 14 números do CNPJ para consultar.', 'warning');
      return;
    }
    if (!isValidCNPJ(clean)) {
      showToast('O CNPJ informado possui dígitos verificadores inválidos.', 'error');
      return;
    }

    setIsFetchingCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!res.ok) {
        if (res.status === 404) {
          showToast('CNPJ não localizado na base da Receita Federal.', 'warning');
        } else {
          showToast('Não foi possível consultar a Receita agora. Preencha manualmente.', 'info');
        }
        return;
      }
      const data = await res.json();
      const razao = (data.razao_social || data.nome_fantasia || '').trim();
      if (razao) {
        setFormData(prev => ({
          ...prev,
          companyName: (forceOverwriteName || !prev.companyName.trim()) ? razao : prev.companyName
        }));
      }
      setCnpjInfo({
        fantasia: data.nome_fantasia || undefined,
        situacao: data.descricao_situacao_cadastral || undefined,
        municipio: data.municipio || undefined,
        uf: data.uf || undefined
      });
      showToast('Dados do CNPJ preenchidos automaticamente!', 'success');
    } catch (err) {
      console.warn('Erro ao consultar BrasilAPI:', err);
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '');
    if (raw.length > 14) raw = raw.slice(0, 14);
    
    let formatted = raw;
    if (raw.length > 12) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, '$1.$2.$3/$4-$5');
    } else if (raw.length > 8) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
    } else if (raw.length > 5) {
      formatted = raw.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
    } else if (raw.length > 2) {
      formatted = raw.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
    }
    
    setFormData(prev => ({ ...prev, cnpj: formatted }));
    if (raw.length < 14) {
      setCnpjInfo(null);
    } else if (raw.length === 14 && isValidCNPJ(raw) && !isEditing) {
      lookupCnpjOnBrasilApi(raw, false);
    }
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
    }

    setFormData({ ...formData, cpf: value });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{isEditing ? 'Editar Empresa' : 'Nova Empresa'}</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">{isEditing ? 'Atualizar os dados do fornecedor.' : 'Digite o CNPJ para buscar a Razão Social automaticamente.'}</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-6 mb-2">
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 font-bold cursor-pointer">
              <input type="radio" checked={!formData.useCpf} onChange={() => setFormData({ ...formData, useCpf: false })} className="accent-neutral-900" /> Pessoa Jurídica (CNPJ)
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 font-bold cursor-pointer">
              <input type="radio" checked={formData.useCpf} onChange={() => setFormData({ ...formData, useCpf: true })} className="accent-neutral-900" /> Pessoa Física (CPF)
            </label>
          </div>

          {!formData.useCpf ? (
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">CNPJ</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold font-mono"
                  value={formData.cnpj}
                  onChange={handleCNPJChange}
                  maxLength={18}
                  placeholder="00.000.000/0001-00"
                />
                <button
                  type="button"
                  disabled={isFetchingCnpj}
                  onClick={() => lookupCnpjOnBrasilApi(formData.cnpj, true)}
                  className="px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 shrink-0"
                  title="Consultar Razão Social na Receita Federal (BrasilAPI)"
                >
                  {isFetchingCnpj ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  {isFetchingCnpj ? 'Buscando...' : 'Consultar'}
                </button>
              </div>
              {cnpjInfo && (
                <div className="mt-2 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>Situação:</strong> {cnpjInfo.situacao || 'Consultada'}
                    {cnpjInfo.municipio ? ` • ${cnpjInfo.municipio}/${cnpjInfo.uf}` : ''}
                  </span>
                  {cnpjInfo.fantasia && cnpjInfo.fantasia !== formData.companyName && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, companyName: cnpjInfo.fantasia! }))}
                      className="underline font-bold hover:text-emerald-600"
                    >
                      Usar Nome Fantasia ({cnpjInfo.fantasia})
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">CPF</label>
              <input 
                type="text" 
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold font-mono"
                value={formData.cpf}
                onChange={handleCPFChange}
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Razão Social / Nome do Fornecedor</label>
            <input 
              type="text" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Ex: Empresa Silva Ltda"
            />
          </div>
        </div>

        <div className="pt-2 flex gap-4">
          <button 
            onClick={() => {
              const doc = formData.useCpf ? formData.cpf : formData.cnpj;
              const cleanDoc = doc.replace(/\D/g, '');
              const hasRightLength = formData.useCpf ? cleanDoc.length === 11 : cleanDoc.length === 14;

              if (!formData.companyName.trim()) {
                showToast('Por favor, preencha a Razão Social.', 'warning');
                return;
              }

              if (!hasRightLength) {
                showToast(`Por favor, preencha o ${formData.useCpf ? 'CPF' : 'CNPJ'} completamente.`, 'warning');
                return;
              }

              const isMathValid = formData.useCpf ? isValidCPF(cleanDoc) : isValidCNPJ(cleanDoc);
              if (!isMathValid) {
                showToast(`O ${formData.useCpf ? 'CPF' : 'CNPJ'} informado é matematicamente inválido. Verifique os dígitos.`, 'error');
                return;
              }

              const duplicate = existingCompanies.find(
                c => c.id !== initialData?.id && c.cnpj.replace(/\D/g, '') === cleanDoc
              );
              if (duplicate) {
                showToast(`Este ${formData.useCpf ? 'CPF' : 'CNPJ'} já está cadastrado para "${duplicate.companyName}".`, 'warning');
                return;
              }

              onConfirm({
                id: initialData ? initialData.id : Date.now().toString(),
                companyName: formData.companyName.trim(),
                cnpj: doc,
                certificates: initialData ? initialData.certificates : {
                  Trabalhista: null,
                  Federal: null,
                  Estadual: null,
                  Municipal: null,
                  FGTS: null,
                  'Falência e Concordata': null,
                  'CEIS/CNEP': null,
                  'TCU/TCE': null
                }
              });
            }}
            className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all text-center"
          >
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfigLinksModal = ({ currentLinks, currentStateLinks, onClose, onSave }: { currentLinks: Record<string, string>, currentStateLinks: Record<string, string>, onClose: () => void, onSave: (links: Record<string, string>, stateLinks: Record<string, string>) => void }) => {
  const [links, setLinks] = React.useState({ ...DEFAULT_CERT_LINKS, ...currentLinks });
  const [localStateLinks, setLocalStateLinks] = React.useState({ ...DEFAULT_STATE_LINKS, ...currentStateLinks });
  const [activeTab, setActiveTab] = React.useState<'Gerais' | 'Estaduais'>('Gerais');

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-6 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center shrink-0">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2"><LinkIcon size={24} /> Configurar Links da Prefeitura</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">Os links salvos aqui ficam disponíveis para todos os computadores desta prefeitura.</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="flex gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2 shrink-0">
          <button 
            onClick={() => setActiveTab('Gerais')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'Gerais' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
          >
            Fiscais & Lei 14.133
          </button>
          <button 
            onClick={() => setActiveTab('Estaduais')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${activeTab === 'Estaduais' ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
          >
            Por Estado (UF)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === 'Gerais' ? (
            <div className="space-y-4">
              {ALL_CERT_TYPES.map(type => (
                <div key={type}>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 uppercase tracking-widest">{type}</label>
                  <input 
                    type="url" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none text-neutral-900 dark:text-neutral-100"
                    value={links[type] || ''}
                    onChange={e => setLinks({ ...links, [type]: e.target.value })}
                    placeholder={`https://link-para-certidao-${type.toLowerCase()}.gov.br`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(localStateLinks).sort().map(uf => (
                <div key={uf}>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 uppercase tracking-widest">Estado: {uf}</label>
                  <input 
                    type="url" 
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-3 py-2 rounded-xl text-xs outline-none text-neutral-900 dark:text-neutral-100"
                    value={localStateLinks[uf] || ''}
                    onChange={e => setLocalStateLinks({ ...localStateLinks, [uf]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex gap-4 shrink-0">
          <button 
            onClick={() => onSave(links, localStateLinks)}
            className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all text-center"
          >
            Salvar Todos os Links na Prefeitura
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const CertificatesModule = ({ currentUser, institution }: { currentUser?: any, institution?: any }) => {
  const canEdit = hasPermission(currentUser, 'certificates', 'edit');
  const canAdmin = hasPermission(currentUser, 'certificates', 'admin');

  const [searchName, setSearchName] = React.useState('');
  const [searchCnpj, setSearchCnpj] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'expired' | 'warning' | 'valid' | 'incomplete'>('all');
  const [companies, setCompanies] = React.useState<CompanyCertificates[]>([]);
  const [managingCompany, setManagingCompany] = React.useState<CompanyCertificates | null>(null);
  const [isAddingCompany, setIsAddingCompany] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<CompanyCertificates | null>(null);
  const [isConfiguringLinks, setIsConfiguringLinks] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const certLinksStorageKey = `@gestao360:certLinks_v2_${institution?.id || 'global'}`;
  const stateLinksStorageKey = `@gestao360:stateLinks_v3_${institution?.id || 'global'}`;

  const [certLinks, setCertLinks] = React.useState<Record<string, string>>(() => {
    if (institution?.cert_links) {
      const parsed = typeof institution.cert_links === 'string' ? JSON.parse(institution.cert_links) : institution.cert_links;
      return { ...DEFAULT_CERT_LINKS, ...parsed };
    }
    const saved = localStorage.getItem(certLinksStorageKey);
    return saved ? { ...DEFAULT_CERT_LINKS, ...JSON.parse(saved) } : DEFAULT_CERT_LINKS;
  });

  const [stateLinks, setStateLinks] = React.useState<Record<string, string>>(() => {
    if (institution?.state_links) {
      const parsed = typeof institution.state_links === 'string' ? JSON.parse(institution.state_links) : institution.state_links;
      return { ...DEFAULT_STATE_LINKS, ...parsed };
    }
    const saved = localStorage.getItem(stateLinksStorageKey);
    return saved ? { ...DEFAULT_STATE_LINKS, ...JSON.parse(saved) } : DEFAULT_STATE_LINKS;
  });

  // Sincroniza links configurados diretamente da tabela institutions no Supabase para que todos os computadores da prefeitura compartilhem
  React.useEffect(() => {
    if (!institution?.id) return;
    let isMounted = true;

    const syncInstitutionLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('institutions')
          .select('cert_links, state_links')
          .eq('id', institution.id)
          .maybeSingle();

        if (!error && data && isMounted) {
          if (data.cert_links) {
            const parsedCert = typeof data.cert_links === 'string' ? JSON.parse(data.cert_links) : data.cert_links;
            const mergedCert = { ...DEFAULT_CERT_LINKS, ...parsedCert };
            setCertLinks(mergedCert);
            institution.cert_links = mergedCert;
            localStorage.setItem(certLinksStorageKey, JSON.stringify(mergedCert));
          }
          if (data.state_links) {
            const parsedState = typeof data.state_links === 'string' ? JSON.parse(data.state_links) : data.state_links;
            const mergedState = { ...DEFAULT_STATE_LINKS, ...parsedState };
            setStateLinks(mergedState);
            institution.state_links = mergedState;
            localStorage.setItem(stateLinksStorageKey, JSON.stringify(mergedState));
          }
        }
      } catch (err) {
        console.warn('Falha ao sincronizar links da prefeitura:', err);
      }
    };

    syncInstitutionLinks();
    return () => { isMounted = false; };
  }, [institution?.id, certLinksStorageKey, stateLinksStorageKey]);

  const loadCompanies = React.useCallback(() => {
    setIsLoading(true);
    let query = supabase.from('company_certificates').select('*');
    if (institution?.id) query = query.eq('institution_id', institution.id);
    query.then(({ data, error }) => {
      setIsLoading(false);
      if (error || !data || data.length === 0) {
        if (isDemoEnvironment(institution)) {
          const demoStorage = localStorage.getItem('gestao360_demo_certificates');
          if (demoStorage) {
            try {
              setCompanies(JSON.parse(demoStorage));
              return;
            } catch (e) {
              console.error("Erro ao carregar dados demo de certidões:", e);
            }
          }
        }
        setCompanies([]);
        if (error) console.error("Erro ao buscar empresas:", error);
      } else if (data) {
        setCompanies(data.map(c => ({ ...c, companyName: c.company_name } as CompanyCertificates)));
      }
    });
  }, [institution]);

  React.useEffect(() => {
    loadCompanies();
    const handleReload = (e: any) => {
      const mod = e.detail?.moduleKey || e.detail?.module;
      if (!mod || mod === 'certificates' || mod === 'all') {
        if (isDemoEnvironment(institution)) {
          const demoStorage = localStorage.getItem('gestao360_demo_certificates');
          if (demoStorage) {
            try {
              setCompanies(JSON.parse(demoStorage));
            } catch (e) {}
          }
        }
        loadCompanies();
      }
    };
    window.addEventListener('gestao360:reload-module', handleReload);
    return () => window.removeEventListener('gestao360:reload-module', handleReload);
  }, [loadCompanies, institution]);

  const getStatusInfo = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expiryDate + 'T12:00:00');
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Vencida', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: XCircle, state: 'expired' as const };
    } else if (diffDays <= 30) {
      return { label: `${diffDays}d`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: AlertTriangle, state: 'warning' as const };
    } else {
      return { label: 'Válida', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2, state: 'valid' as const };
    }
  };

  const evaluateCompanyHealth = React.useCallback((comp: CompanyCertificates) => {
    let hasExpired = false;
    let hasWarning = false;
    let missingMain = false;

    for (const type of MAIN_CERT_TYPES) {
      const cert = comp.certificates?.[type];
      if (!cert) {
        missingMain = true;
      } else {
        const st = getStatusInfo(cert.expiryDate).state;
        if (st === 'expired') hasExpired = true;
        if (st === 'warning') hasWarning = true;
      }
    }

    for (const type of EXTRA_CERT_TYPES) {
      const cert = comp.certificates?.[type];
      if (cert) {
        const st = getStatusInfo(cert.expiryDate).state;
        if (st === 'expired') hasExpired = true;
        if (st === 'warning') hasWarning = true;
      }
    }

    const isRegular = !hasExpired && !missingMain;
    return { hasExpired, hasWarning, missingMain, isRegular };
  }, []);

  const statusCounts = React.useMemo(() => {
    let expired = 0;
    let warning = 0;
    let valid = 0;
    let incomplete = 0;

    companies.forEach(c => {
      const h = evaluateCompanyHealth(c);
      if (h.hasExpired) expired++;
      if (h.hasWarning) warning++;
      if (h.isRegular) valid++;
      if (h.missingMain) incomplete++;
    });

    return {
      all: companies.length,
      expired,
      warning,
      valid,
      incomplete
    };
  }, [companies, evaluateCompanyHealth]);

  const filtered = companies.filter(comp => {
    const cName = comp.companyName || '';
    const cCnpj = comp.cnpj || '';
    const matchName = searchName === '' || cName.toLowerCase().includes(searchName.toLowerCase());
    const cleanSearchCnpj = searchCnpj.replace(/\D/g, '');
    const cleanCompCnpj = cCnpj.replace(/\D/g, '');
    const matchCnpj = searchCnpj === '' || cCnpj.includes(searchCnpj) || (cleanSearchCnpj.length > 0 && cleanCompCnpj.includes(cleanSearchCnpj));
    if (!matchName || !matchCnpj) return false;

    if (statusFilter !== 'all') {
      const h = evaluateCompanyHealth(comp);
      if (statusFilter === 'expired' && !h.hasExpired) return false;
      if (statusFilter === 'warning' && !h.hasWarning) return false;
      if (statusFilter === 'valid' && !h.isRegular) return false;
      if (statusFilter === 'incomplete' && !h.missingMain) return false;
    }

    return true;
  });

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchName, searchCnpj, statusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderCertBadge = (cert: { expiryDate: string } | null | undefined) => {
    if (!cert) return <span className="text-xs text-neutral-400 font-medium italic">Ausente</span>;
    const status = getStatusInfo(cert.expiryDate);
    return (
      <div className="flex flex-col gap-1 w-max">
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
          {new Date(cert.expiryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
        </span>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.color}`}>
          <status.icon size={10} />
          {status.label}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <WhatsNewBanner 
        version="1.4.0"
        title="Novidades no Banco de Certidões"
        features={[
          "Busca Automática de CNPJ: Ao digitar o CNPJ do fornecedor, a Razão Social é preenchida automaticamente via Receita/BrasilAPI.",
          "Filtros de Regularidade Fiscal: Filtre rapidamente empresas com certidões vencidas, vencendo em 30 dias ou 100% regulares.",
          "Lei 14.133/2021: Suporte às certidões complementares (Falência e Concordata, CEIS/CNEP e TCU/TCE) e links sincronizados por prefeitura."
        ]}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
            <FileBadge size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Banco de <span className="text-neutral-400 font-normal">Certidões</span></h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Gerenciamento de certidões fiscais, trabalhistas e da Lei 14.133/2021 por fornecedor.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <DemoFillButton moduleKey="certificates" currentInstitution={institution} onSuccess={loadCompanies} />
          {canAdmin && (
            <button onClick={() => setIsConfiguringLinks(true)} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-2">
              <Settings size={16} /> Links
            </button>
          )}
          {canEdit && (
            <button onClick={() => setIsAddingCompany(true)} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 shadow-xl shadow-neutral-900/10 dark:shadow-neutral-950/10">
              <Plus size={16} /> Nova Empresa
            </button>
          )}
        </div>
      </div>

      {/* Filtros Rápidos de Vencimento */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
            statusFilter === 'all'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-md'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Todas</p>
            <p className="text-2xl font-black mt-0.5">{statusCounts.all}</p>
          </div>
          <Building2 size={20} className="opacity-60" />
        </button>

        <button
          onClick={() => setStatusFilter('expired')}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
            statusFilter === 'expired'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-rose-600 dark:text-rose-400 hover:border-rose-200'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Com Vencidas</p>
            <p className="text-2xl font-black mt-0.5">{statusCounts.expired}</p>
          </div>
          <XCircle size={20} className="opacity-80" />
        </button>

        <button
          onClick={() => setStatusFilter('warning')}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
            statusFilter === 'warning'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-amber-600 dark:text-amber-400 hover:border-amber-200'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Vencendo (30d)</p>
            <p className="text-2xl font-black mt-0.5">{statusCounts.warning}</p>
          </div>
          <Clock size={20} className="opacity-80" />
        </button>

        <button
          onClick={() => setStatusFilter('valid')}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
            statusFilter === 'valid'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-emerald-600 dark:text-emerald-400 hover:border-emerald-200'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">100% Regulares</p>
            <p className="text-2xl font-black mt-0.5">{statusCounts.valid}</p>
          </div>
          <CheckCircle2 size={20} className="opacity-80" />
        </button>

        <button
          onClick={() => setStatusFilter('incomplete')}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between col-span-2 sm:col-span-1 ${
            statusFilter === 'incomplete'
              ? 'bg-sky-600 text-white border-sky-600 shadow-md'
              : 'bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 text-sky-600 dark:text-sky-400 hover:border-sky-200'
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Incompletas</p>
            <p className="text-2xl font-black mt-0.5">{statusCounts.incomplete}</p>
          </div>
          <AlertCircle size={20} className="opacity-80" />
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full md:w-1/2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por Nome da Empresa..." 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
          <div className="relative flex-1 w-full md:w-1/2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por CNPJ ou CPF..." 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={searchCnpj}
              maxLength={18}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 14) value = value.slice(0, 14);
                
                if (value.length > 11) {
                  if (value.length > 12) {
                    value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2}).*/, '$1.$2.$3/$4-$5');
                  } else if (value.length > 8) {
                    value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
                  } else if (value.length > 5) {
                    value = value.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
                  } else if (value.length > 2) {
                    value = value.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
                  }
                } else {
                  if (value.length > 9) {
                    value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
                  } else if (value.length > 6) {
                    value = value.replace(/^(\d{3})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
                  } else if (value.length > 3) {
                    value = value.replace(/^(\d{3})(\d{1,3}).*/, '$1.$2');
                  }
                }
                setSearchCnpj(value);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">
                <th className="px-4 py-4 w-72">Empresa / Fornecedor</th>
                <th className="px-4 py-4">Trabalhista</th>
                <th className="px-4 py-4">Federal</th>
                <th className="px-4 py-4">Estadual</th>
                <th className="px-4 py-4">Municipal</th>
                <th className="px-4 py-4">FGTS</th>
                <th className="px-4 py-4">Lei 14.133</th>
                <th className="px-4 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {paginatedItems.map(comp => {
                const extraCount = EXTRA_CERT_TYPES.filter(t => !!comp.certificates?.[t]).length;
                return (
                  <tr key={comp.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                          <Building2 size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate w-48" title={comp.companyName}>{comp.companyName}</span>
                          <span className="text-[11px] font-mono text-neutral-400">{comp.cnpj}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates?.Trabalhista)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates?.Federal)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates?.Estadual)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates?.Municipal)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates?.FGTS)}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => setManagingCompany(comp)}
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-all ${
                          extraCount > 0
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                            : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:text-neutral-700'
                        }`}
                      >
                        {extraCount}/3 Anexadas
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canAdmin && (
                          <button 
                            onClick={async () => {
                              if (confirm(`Tem certeza que deseja excluir a empresa ${comp.companyName} e todas as suas certidões?`)) {
                                 const { error } = await supabase.from('company_certificates').delete().eq('id', comp.id);
                                 if (error) {
                                   showToast(`Erro ao excluir: ${error.message}`, "error");
                                 } else {
                                   // Limpa arquivos anexados no Storage
                                   for (const cert of Object.values(comp.certificates || {}) as (CertificateRecord | null | undefined)[]) {
                                     if (cert?.fileUrl) {
                                       await removeStorageFileByUrl(cert.fileUrl);
                                     }
                                   }
                                   setCompanies(companies.filter(c => c.id !== comp.id));
                                   showToast("Empresa e arquivos excluídos com sucesso!", "success");
                                 }
                              }
                            }}
                            className="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all" 
                            title="Excluir Empresa"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <button 
                            onClick={() => setEditingCompany(comp)}
                            className="p-2 text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all" 
                            title="Editar Empresa"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => setManagingCompany(comp)}
                          className="p-2 text-neutral-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-xl transition-all" 
                          title="Gerenciar Certidões"
                        >
                          <ExternalLink size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {isLoading ? (
                 <tr>
                   <td colSpan={8} className="py-10 text-center text-sm font-medium text-neutral-500">
                     <div className="animate-pulse flex flex-col items-center justify-center gap-2">
                       <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-900 dark:border-t-white rounded-full animate-spin"></div>
                       <span>Carregando empresas...</span>
                     </div>
                   </td>
                 </tr>
              ) : filtered.length === 0 && (
                 <tr>
                   <td colSpan={8} className="py-12 text-center text-sm font-medium text-neutral-500">
                     <div className="flex flex-col items-center justify-center gap-3">
                       <p>Nenhuma empresa encontrada para os filtros selecionados.</p>
                       <DemoFillButton moduleKey="certificates" currentInstitution={institution} onSuccess={loadCompanies} />
                     </div>
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm gap-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium text-center sm:text-left">
              Mostrando <strong className="text-neutral-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong className="text-neutral-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> de <strong className="text-neutral-900 dark:text-white">{filtered.length}</strong> fornecedores
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center hidden sm:flex"
                title="Primeira Página"
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center"
                title="Página Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${
                        currentPage === pageNum
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-md'
                          : 'border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hidden sm:flex'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center"
                title="Próxima Página"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center hidden sm:flex"
                title="Última Página"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {managingCompany && (
          <ManageCertificatesModal 
            company={managingCompany}
            certLinks={certLinks}
            stateLinks={stateLinks}
            institutionId={institution?.id}
            canEdit={canEdit}
            onClose={() => setManagingCompany(null)}
            onUpdate={async (updatedCompany) => {
              setCompanies(companies.map(c => c.id === updatedCompany.id ? updatedCompany : c));
              setManagingCompany(updatedCompany);
              const { error } = await supabase.from('company_certificates').update({
                company_name: updatedCompany.companyName,
                cnpj: updatedCompany.cnpj,
                certificates: updatedCompany.certificates
              }).eq('id', updatedCompany.id);
              if (error) {
                showToast(`Erro do Banco: ${error.message} (Código: ${error.code})`, "error");
                console.error("Supabase Update Error:", error);
              } else {
                showToast("Certidão salva com sucesso!", "success");
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingCompany && (
          <CompanyFormModal 
            existingCompanies={companies}
            onClose={() => setIsAddingCompany(false)}
            onConfirm={async (comp) => {
              setCompanies([comp, ...companies]);
              setIsAddingCompany(false);
              const { error } = await supabase.from('company_certificates').insert({
                id: comp.id,
                company_name: comp.companyName,
                cnpj: comp.cnpj,
                certificates: comp.certificates,
                institution_id: institution?.id || null
              });
              if (error) {
                showToast(`Erro do Banco: ${error.message} (Código: ${error.code})`, "error");
                console.error("Supabase Insert Error:", error);
              } else {
                showToast("Empresa cadastrada com sucesso!", "success");
              }
            }}
          />
        )}
        {editingCompany && (
          <CompanyFormModal 
            initialData={editingCompany}
            existingCompanies={companies}
            onClose={() => setEditingCompany(null)}
            onConfirm={async (comp) => {
              setEditingCompany(null);
              const { error } = await supabase.from('company_certificates').update({
                company_name: comp.companyName,
                cnpj: comp.cnpj
              }).eq('id', comp.id);
              if (error) {
                showToast(`Erro ao editar: ${error.message}`, "error");
              } else {
                setCompanies(companies.map(c => c.id === comp.id ? { ...c, companyName: comp.companyName, cnpj: comp.cnpj } : c));
                showToast("Empresa atualizada com sucesso!", "success");
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isConfiguringLinks && (
          <ConfigLinksModal 
            currentLinks={certLinks}
            currentStateLinks={stateLinks}
            onClose={() => setIsConfiguringLinks(false)}
            onSave={async (links, newStateLinks) => {
              setCertLinks(links);
              setStateLinks(newStateLinks);
              localStorage.setItem(certLinksStorageKey, JSON.stringify(links));
              localStorage.setItem(stateLinksStorageKey, JSON.stringify(newStateLinks));
              
              if (institution) {
                institution.cert_links = links;
                institution.state_links = newStateLinks;
              }

              if (institution?.id) {
                const { error } = await supabase
                  .from('institutions')
                  .update({ cert_links: links, state_links: newStateLinks })
                  .eq('id', institution.id);
                
                if (error) {
                  console.error("Erro ao salvar links na instituição:", error);
                  showToast("Salvo localmente. Para compartilhar entre computadores, execute a migração SQL de cert_links na tabela institutions.", "warning");
                  setIsConfiguringLinks(false);
                  return;
                }
              }

              setIsConfiguringLinks(false);
              showToast("Links salvos e compartilhados para toda a prefeitura!", "success");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
