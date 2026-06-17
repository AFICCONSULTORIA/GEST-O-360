const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Normalize everything to \n for matching
content = content.replace(/\r\n/g, '\n');

// 1. Fix TS error Record
content = content.replace(
  `  certificates: {
    [key in 'Trabalhista' | 'Federal' | 'Estadual' | 'Municipal' | 'FGTS']: {
      issueDate: string;
      expiryDate: string;
      fileUrl?: string;
    } | null;
  };`,
  `  certificates: Record<'Trabalhista' | 'Federal' | 'Estadual' | 'Municipal' | 'FGTS', {
    issueDate: string;
    expiryDate: string;
    fileUrl?: string;
  } | null>;`
);

// 2. Add State Variables
content = content.replace(
  `  const [isNewControlModalOpen, setIsNewControlModalOpen] = React.useState(false);
  const [attachingFor, setAttachingFor] = React.useState<number | null>(null);

  const isPublicPortal = window.location.pathname === '/agendamento';`,
  `  const [isNewControlModalOpen, setIsNewControlModalOpen] = React.useState(false);
  const [attachingFor, setAttachingFor] = React.useState<number | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [forcePasswordChange, setForcePasswordChange] = React.useState(false);

  const isPublicPortal = window.location.pathname === '/agendamento';`
);

// 3. Auth session update
content = content.replace(
  `        } else {
          supabase.from('admin_users').select('*').eq('email', session.user.email).single().then(({data}) => {
            if (data) setCurrentUser({ ...data, lastLogin: data.last_login } as AdminUser);
          });
        }`,
  `        } else {
          supabase.from('admin_users').select('*').eq('email', session.user.email).single().then(({data}) => {
            if (data) {
              setCurrentUser({ ...data, lastLogin: data.last_login } as AdminUser);
              if (data.last_login === 'Nunca') {
                setIsChangingPassword(true);
                setForcePasswordChange(true);
              }
            }
          });
        }`
);

// 4. Change Password Modal rendering
content = content.replace(
  `                        {/* Top Navbar Component */}`,
  `      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <ChangePasswordModal 
            forceChange={forcePasswordChange}
            onClose={() => !forcePasswordChange && setIsChangingPassword(false)}
            onSuccess={async () => {
              if (forcePasswordChange && currentUser) {
                const now = new Date().toLocaleString('pt-BR');
                await supabase.from('admin_users').update({ last_login: now }).eq('id', currentUser.id);
                setCurrentUser({ ...currentUser, lastLogin: now } as AdminUser);
                setAdminUsers(adminUsers.map(u => u.id === currentUser.id ? { ...u, lastLogin: now } : u));
                setForcePasswordChange(false);
              }
              setIsChangingPassword(false);
            }}
          />
        )}
      </AnimatePresence>

                        {/* Top Navbar Component */}`
);

// 5. Replace UserCircle to be a button
content = content.replace(
  `                {currentUser && (
                  <div className="hidden sm:flex items-center gap-2 mr-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 rounded-full border border-neutral-100 dark:border-neutral-700">
                    <UserCircle size={16} className="text-neutral-500 dark:text-neutral-400" />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold leading-none text-neutral-900 dark:text-white truncate max-w-[120px]">{currentUser.name || currentUser.email}</span>
                      <span className="text-[9px] leading-none text-neutral-500 dark:text-neutral-400 mt-0.5">{currentUser.role}</span>
                    </div>
                  </div>
                )}`,
  `                {currentUser && (
                  <button 
                    onClick={() => { setIsChangingPassword(true); setForcePasswordChange(false); }}
                    className="hidden sm:flex items-center gap-2 mr-2 px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-full border border-neutral-100 dark:border-neutral-700 transition-colors text-left"
                    title="Alterar Senha"
                  >
                    <UserCircle size={16} className="text-neutral-500 dark:text-neutral-400" />
                    <div className="flex flex-col text-left">
                      <span className="text-[11px] font-bold leading-none text-neutral-900 dark:text-white truncate max-w-[120px]">{currentUser.name || currentUser.email}</span>
                      <span className="text-[9px] leading-none text-neutral-500 dark:text-neutral-400 mt-0.5">{currentUser.role}</span>
                    </div>
                  </button>
                )}`
);

// 6. Add ChangePasswordModal Component at the end
content = content.replace(
  `// --- Protocol Module ---`,
  `const ChangePasswordModal = ({ forceChange, onClose, onSuccess }: { forceChange: boolean, onClose: () => void, onSuccess: () => void }) => {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    
    if (error) {
      showToast('Erro ao atualizar senha: ' + error.message, 'error');
    } else {
      showToast('Senha atualizada com sucesso!', 'success');
      onSuccess();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      {...(!forceChange ? { onClick: onClose } : {})}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl space-y-6 relative"
        onClick={e => e.stopPropagation()}
      >
        {!forceChange && (
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all">
            <X size={20} />
          </button>
        )}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sky-50 dark:bg-sky-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-sky-100 dark:border-sky-500/20 text-sky-500">
            <Lock size={24} />
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">
            {forceChange ? 'Defina sua Senha' : 'Alterar Senha'}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {forceChange ? 'Como este é seu primeiro acesso, por favor defina uma senha segura para continuar.' : 'Insira sua nova senha abaixo.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nova Senha</label>
            <input 
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Confirmar Nova Senha</label>
            <input 
              type="password" required
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-sky-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-sky-700 transition-all shadow-xl shadow-sky-600/20 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : forceChange ? 'Definir Senha e Acessar' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- Protocol Module ---`
);

// We need to run remove_onClick changes as well.
// But we can just use the script we already have for that.
fs.writeFileSync(path, content, 'utf8');
console.log('Done modifying App.tsx programmatically.');
