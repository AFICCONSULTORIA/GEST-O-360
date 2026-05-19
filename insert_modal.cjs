const fs = require('fs');

const modalCode = `const ManageCertificatesModal = ({ company, onClose, onUpdate }: { company: CompanyCertificates, onClose: () => void, onUpdate: (comp: CompanyCertificates) => void }) => {
  const [uploadingCert, setUploadingCert] = React.useState<string | null>(null);

  const certTypes = ['Trabalhista', 'Federal', 'Estadual', 'Municipal', 'FGTS'] as const;

  if (uploadingCert) {
    return (
      <AttachmentModal 
        title={\`Anexar \${uploadingCert}\`}
        onClose={() => setUploadingCert(null)}
        onConfirm={() => {
          const dt = new Date();
          const issue = dt.toISOString().split('T')[0];
          dt.setFullYear(dt.getFullYear() + 1);
          const expiry = dt.toISOString().split('T')[0];
          
          const updated = { ...company };
          updated.certificates = { ...updated.certificates, [uploadingCert]: { issueDate: issue, expiryDate: expiry } };
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
      onClick={onClose}
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
                     <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{certType}</p>
                     {isPresent ? (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Válida até {new Date(cert.expiryDate).toLocaleDateString('pt-BR')}</p>
                     ) : (
                        <p className="text-xs text-rose-500 dark:text-rose-400 font-bold mt-0.5">Ausente / Não cadastrada</p>
                     )}
                   </div>
                </div>
                
                <div className="flex gap-2">
                  {isPresent && (
                    <button 
                      onClick={() => alert(\`Imprimindo via da certidão \${certType}...\`)}
                      className="px-4 py-2 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold hover:text-neutral-900 dark:hover:text-white transition-all shadow-sm flex items-center gap-2"
                    >
                      <Download size={14} /> Via
                    </button>
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
`;

const code = fs.readFileSync('src/App.tsx', 'utf8');
const searchString = "const CertificatesModule = () => {";
const idx = code.indexOf(searchString);

if (idx !== -1) {
  const finalCode = code.slice(0, idx) + modalCode + "\n" + code.slice(idx);
  fs.writeFileSync('src/App.tsx', finalCode);
} else {
  console.log("Could not insert the modal code");
}
