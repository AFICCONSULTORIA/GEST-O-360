const fs = require('fs');

const modalCode = `const NewCompanyModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (comp: CompanyCertificates) => void }) => {
  const [formData, setFormData] = React.useState({ companyName: '', cnpj: '' });

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
          <div>
            <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">CNPJ</label>
            <input 
              type="text" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm outline-none text-neutral-900 dark:text-neutral-100 font-bold"
              value={formData.cnpj}
              onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
            />
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            onClick={() => {
              if (formData.companyName && formData.cnpj) {
                onConfirm({
                  id: Date.now().toString(),
                  companyName: formData.companyName,
                  cnpj: formData.cnpj,
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
