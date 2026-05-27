import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, XCircle, FileBadge, Download, CheckCircle2, AlertTriangle, Plus, Search, ExternalLink, Trash2, FileText, Link as LinkIcon, Settings, Edit2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { showToast } from '../../components/ui/Toast';
import { CompanyCertificates } from '../../types';

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
              onChange={e => e.target.files && setFile(e.target.files[0])}
            />
            <Download size={24} className="mx-auto mb-2 text-neutral-400" />
            <p className="text-sm font-bold text-neutral-900 dark:text-white">
              {file ? file.name : "Clique para selecionar o arquivo"}
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

const ManageCertificatesModal = ({ company, certLinks, onClose, onUpdate }: { company: CompanyCertificates, certLinks: Record<string, string>, onClose: () => void, onUpdate: (comp: CompanyCertificates) => void }) => {
  const [uploadingCert, setUploadingCert] = React.useState<string | null>(null);

  const certTypes = ['Trabalhista', 'Federal', 'Estadual', 'Municipal', 'FGTS'] as const;

  if (uploadingCert) {
    return (
      <CertificateUploadModal 
        title={uploadingCert}
        onClose={() => setUploadingCert(null)}
        onConfirm={async (expiryDate, file) => {
          let fileUrl = undefined;
          if (file) {
             const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.-]/g, '_');
             const filename = `${company.id}-${uploadingCert}-${Date.now()}-${safeName}`;
             const { error } = await supabase.storage.from('certidoes').upload(filename, file);
             if (error) {
               console.error(error);
               showToast('Erro ao salvar arquivo. Bucket ausente ou sem permissões.', 'error');
             } else {
               const { data: publicUrlData } = supabase.storage.from('certidoes').getPublicUrl(filename);
               fileUrl = publicUrlData.publicUrl;
             }
          }
          const issue = new Date().toISOString().split('T')[0];
          
          const updated = { ...company };
          updated.certificates = { ...updated.certificates, [uploadingCert]: { issueDate: issue, expiryDate: expiryDate, fileUrl } };
          onUpdate(updated);
          setUploadingCert(null);
        }}
      />
    );
  }

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
        className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Gerenciar Certidões</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">{company.companyName}</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="space-y-4">
          {certTypes.map(certType => {
            const cert = company.certificates[certType];
            const isPresent = !!cert;
            
            return (
              <div key={certType} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-100 dark:border-neutral-700 gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-xl flex items-center justify-center shadow-sm">
                     <FileBadge size={18} className="text-neutral-400" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                       <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{certType}</p>
                       {certLinks[certType] && (
                         <a href={certLinks[certType]} target="_blank" rel="noreferrer" title={`Emitir Certidão ${certType}`} className="text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 px-2 py-0.5 rounded border border-transparent transition-all flex items-center gap-1">
                           <ExternalLink size={10} /> Emitir
                         </a>
                       )}
                     </div>
                     {isPresent ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Válida até {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}</p>
                     ) : (
                        <p className="text-xs text-rose-500 dark:text-rose-400 font-bold mt-0.5">Ausente / Não cadastrada</p>
                     )}
                   </div>
                </div>
                
                <div className="flex gap-2">
                  {isPresent && (
                    <>
                      <a 
                        href={cert.fileUrl || '#'} 
                        target={cert.fileUrl ? "_blank" : undefined} 
                        rel="noreferrer"
                        onClick={(e) => { if (!cert.fileUrl) { e.preventDefault(); showToast('Esta certidão foi salva sem um arquivo anexado.', 'warning'); } }}
                        className="px-4 py-2 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold hover:text-neutral-900 dark:hover:text-white transition-all shadow-sm flex items-center gap-2"
                      >
                        <Download size={14} /> Via
                      </a>
                      <button 
                        onClick={async () => {
                          if (confirm(`Tem certeza que deseja excluir a certidão ${certType}?`)) {
                            const updated = { ...company };
                            updated.certificates = { ...updated.certificates, [certType]: null };
                            onUpdate(updated);
                          }
                        }}
                        className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all shadow-sm flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Excluir
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => setUploadingCert(certType)}
                    className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-sm flex items-center gap-2"
                  >
                    {isPresent ? 'Substituir' : 'Anexar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

const NewCompanyModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (comp: CompanyCertificates) => void }) => {
  const [formData, setFormData] = React.useState({ companyName: '', cnpj: '', cpf: '', useCpf: false });

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,3}).*/, '$1.$2');
    }
    
    setFormData({ ...formData, cnpj: value });
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, '$1.$2.$3-$4');
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
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Nova Empresa</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">Cadastrar novo fornecedor.</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Razão Social</label>
            <input 
              type="text" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={formData.companyName}
              onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Ex: Empresa Silva Ltda"
            />
          </div>
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
              <input 
                type="text" 
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
                value={formData.cnpj}
                onChange={handleCNPJChange}
                maxLength={18}
                placeholder="00.000.000/0001-00"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">CPF</label>
              <input 
                type="text" 
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
                value={formData.cpf}
                onChange={handleCPFChange}
                maxLength={14}
                placeholder="000.000.000-00"
              />
            </div>
          )}
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            onClick={() => {
              const doc = formData.useCpf ? formData.cpf : formData.cnpj;
              if (formData.companyName && doc) {
                onConfirm({
                  id: Date.now().toString(),
                  companyName: formData.companyName,
                  cnpj: doc,
                  certificates: { Trabalhista: null, Federal: null, Estadual: null, Municipal: null, FGTS: null }
                });
              }
            }}
            className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all text-center"
          >
            Cadastrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfigLinksModal = ({ currentLinks, onClose, onSave }: { currentLinks: Record<string, string>, onClose: () => void, onSave: (links: Record<string, string>) => void }) => {
  const [links, setLinks] = React.useState(currentLinks);
  const certTypes = ['Trabalhista', 'Federal', 'Estadual', 'Municipal', 'FGTS'];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
           <div>
             <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2"><LinkIcon size={24} /> Configurar Links</h3>
             <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mt-1">Links para emissão rápida de certidões.</p>
           </div>
           <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-2xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
              <XCircle size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {certTypes.map(type => (
            <div key={type}>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 uppercase tracking-widest">{type}</label>
              <input 
                type="url" 
                className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-xl text-sm outline-none text-neutral-900 dark:text-neutral-100"
                value={links[type] || ''}
                onChange={e => setLinks({ ...links, [type]: e.target.value })}
                placeholder={`https://link-para-certidao-${type.toLowerCase()}.com.br`}
              />
            </div>
          ))}
        </div>

        <div className="pt-2 flex gap-4">
          <button 
            onClick={() => onSave(links)}
            className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all text-center"
          >
            Salvar Links
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const CertificatesModule = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [companies, setCompanies] = React.useState<CompanyCertificates[]>([]);
  const [managingCompany, setManagingCompany] = React.useState<CompanyCertificates | null>(null);
  const [isAddingCompany, setIsAddingCompany] = React.useState(false);
  const [isConfiguringLinks, setIsConfiguringLinks] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  const [certLinks, setCertLinks] = React.useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('@gestao360:certLinks_v2');
    return saved ? JSON.parse(saved) : {
      'Trabalhista': 'https://cndt-certidao.tst.jus.br/inicio.faces',
      'Federal': 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home',
      'Estadual': 'https://www.sefaz.mt.gov.br/cnd/certidao/servlet/ServletRotdAberto?origem=60',
      'Municipal': 'http://45.161.37.1:8080/servicosweb/home.jsf',
      'FGTS': 'https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf'
    };
  });

  React.useEffect(() => {
    supabase.from('company_certificates').select('*').then(({ data, error }) => {
      setIsLoading(false);
      if (error) {
        console.error("Erro ao buscar empresas:", error);
      } else if (data) {
        setCompanies(data.map(c => ({ ...c, companyName: c.company_name } as CompanyCertificates)));
      }
    });
  }, []);

  const getStatusInfo = (expiryDate: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Vencida', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: XCircle, state: 'expired' };
    } else if (diffDays <= 30) {
      return { label: `${diffDays}d`, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: AlertTriangle, state: 'warning' };
    } else {
      return { label: 'Válida', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2, state: 'valid' };
    }
  };

  const filtered = companies.filter(comp => {
    return comp.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || comp.cnpj.includes(searchQuery);
  });

  const renderCertBadge = (cert: { expiryDate: string } | null) => {
    if (!cert) return <span className="text-xs text-neutral-400 font-medium italic">Ausente</span>;
    const status = getStatusInfo(cert.expiryDate);
    return (
      <div className="flex flex-col gap-1 w-max">
        <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
          {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
            <FileBadge size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight italic">Banco de <span className="text-neutral-400 font-normal">Certidões</span></h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">Gerenciamento de certidões e prazos de validade por fornecedor.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsConfiguringLinks(true)} className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-2">
            <Settings size={16} /> Links
          </button>
          <button onClick={() => setIsAddingCompany(true)} className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all flex items-center gap-2 shadow-xl shadow-neutral-900/10 dark:shadow-neutral-950/10">
            <Plus size={16} /> Nova Empresa
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por Empresa ou CNPJ..." 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 pl-11 pr-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <th className="px-4 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
              {filtered.map(comp => {
                return (
                  <tr key={comp.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-50 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 shrink-0">
                          <Building2 size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 truncate w-48" title={comp.companyName}>{comp.companyName}</span>
                          <span className="text-xs font-bold text-neutral-400">{comp.cnpj}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Trabalhista)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Federal)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Estadual)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.Municipal)}</td>
                    <td className="px-4 py-4">{renderCertBadge(comp.certificates.FGTS)}</td>
                    <td className="px-4 py-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={async () => {
                            if(confirm("Tem certeza que deseja excluir esta empresa? Todas as certidões atreladas a ela serão perdidas.")) {
                               const { error } = await supabase.from('company_certificates').delete().eq('id', comp.id);
                               if (error) {
                                 showToast(`Erro ao excluir: ${error.message}`, "error");
                               } else {
                                 setCompanies(companies.filter(c => c.id !== comp.id));
                                 showToast("Empresa excluída com sucesso!", "success");
                               }
                            }
                          }}
                          className="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all" 
                          title="Excluir Empresa"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button 
                          onClick={async () => {
                            const newName = window.prompt("Editar nome da empresa / fornecedor:", comp.companyName);
                            if (newName && newName.trim() !== "" && newName !== comp.companyName) {
                              const { error } = await supabase.from('company_certificates').update({ company_name: newName.trim() }).eq('id', comp.id);
                              if (error) {
                                showToast(`Erro ao editar: ${error.message}`, "error");
                              } else {
                                setCompanies(companies.map(c => c.id === comp.id ? { ...c, companyName: newName.trim() } : c));
                                showToast("Nome da empresa atualizado!", "success");
                              }
                            }
                          }}
                          className="p-2 text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all" 
                          title="Editar Nome"
                        >
                          <Edit2 size={18} />
                        </button>
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
                   <td colSpan={7} className="py-10 text-center text-sm font-medium text-neutral-500">
                     <div className="animate-pulse flex flex-col items-center justify-center gap-2">
                       <div className="w-6 h-6 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-900 dark:border-t-white rounded-full animate-spin"></div>
                       <span>Carregando empresas...</span>
                     </div>
                   </td>
                 </tr>
              ) : filtered.length === 0 && (
                 <tr>
                   <td colSpan={7} className="py-10 text-center text-sm font-medium text-neutral-500">
                     Nenhuma empresa cadastrada.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {managingCompany && (
          <ManageCertificatesModal 
            company={managingCompany}
            certLinks={certLinks}
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
          <NewCompanyModal 
            onClose={() => setIsAddingCompany(false)}
            onConfirm={async (comp) => {
              setCompanies([comp, ...companies]);
              setIsAddingCompany(false);
              const { error } = await supabase.from('company_certificates').insert({
                id: comp.id,
                company_name: comp.companyName,
                cnpj: comp.cnpj,
                certificates: comp.certificates
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
      </AnimatePresence>

      <AnimatePresence>
        {isConfiguringLinks && (
          <ConfigLinksModal 
            currentLinks={certLinks}
            onClose={() => setIsConfiguringLinks(false)}
            onSave={(links) => {
              setCertLinks(links);
              localStorage.setItem('@gestao360:certLinks_v2', JSON.stringify(links));
              setIsConfiguringLinks(false);
              showToast("Links configurados com sucesso!", "success");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
