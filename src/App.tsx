import React from 'react';
import { supabase, signUpNewUser } from './lib/supabase';
import { ToastContainer, showToast } from './components/ui/Toast';
import { CertificatesModule } from './modules/Certificates';
import { SettingsModule } from './modules/Settings';
import { ProtocolModule } from './modules/Protocol';
import { hasPermission } from './lib/permissions';
import { getSubdomain, fetchInstitutionBySubdomain } from './lib/subdomain';
import { SaaSControlCenter } from './modules/SaaSControlCenter';

import { ReportsModule, PatrimonioPrintLayout } from './modules/Reports';
import { ControlsModule } from './modules/Controls';
import { RiskModule } from './modules/Risk';
import { PNTPModule } from './modules/PNTP';
import { DocumentNumbersModule } from './modules/DocumentNumbers';
import { OrdersModule } from './modules/Orders';
import { PatrimonioModule } from './modules/Patrimonio';
import { TemplatesModule } from './modules/Templates';
import { SaudeModule } from './modules/Saude';
import { PublicSaudePortal } from './modules/Saude/PublicPortal';
import { PublicFarmaciaPortal } from './modules/Saude/PublicFarmacia';
import { ServicosPublicosModule } from './modules/ServicosPublicos';
import { PublicServicosPortal } from './modules/ServicosPublicos/PublicPortal';
import { PublicEducacaoPortal } from './modules/Education/PublicPortal';
import { MeioAmbienteModule } from './modules/MeioAmbiente';
import { PublicMeioAmbientePortal } from './modules/MeioAmbiente/PublicPortal';
import { CamaraModule } from './modules/Camara';
import { ContractsModule } from './modules/Contracts';
import { EducationModule } from './modules/Education';
import { CalendarModule } from './modules/Calendar';
import { NormsModule } from './modules/Norms';
import { SupportModule } from './modules/Support';
import { AssistenciaSocialModule } from './modules/AssistenciaSocial';
import { FinanceModules } from './modules/AdminFinancas';
import { AdministracaoModule } from './modules/Administracao';

// Lucide icons used directly in App.tsx
import { 
  Building2, Menu, X, Users, Settings, Bell, Search, ChevronRight, AlertTriangle, 
  CheckCircle2, Info, CircleOff, AlertCircle, Clock, Edit2, Trash2, Eye, EyeOff, 
  Lock, Home, Users2, Package, Leaf, Plus, Upload, Sun, Moon, LogOut, Sparkles, 
  Check, Activity, PieChart as PieChartIcon, UserCircle, LifeBuoy, FileText, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Extracted subcomponents
import { LogoCompass } from './components/LogoCompass';
import { SidebarItem } from './components/SidebarItem';
import { Dashboard } from './components/Dashboard';
import { MayorDashboard } from './components/MayorDashboard';
import { SalesLandingPage } from './components/SalesLandingPage';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';

// Types
import { 
  View, Protocol, HistoryEntry, CheckItem, OrderItem, DocumentRecord, 
  PatrimonioItem, Institution, AdminUser, DocumentTemplate, Department 
} from './types';

// Mocks
import { 
  MOCK_DOCUMENTS, MOCK_ORDERS, MOCK_CONTROLS, COMPLIANCE_DATA, DEPT_DISTRIBUTION, 
  COLORS, getComplianceDataForYear, NAVBAR_CATEGORIES, AVAILABLE_PERMISSIONS, 
  MOCK_INSTITUTIONS, MOCK_USERS, MOCK_COMPANIES, MOCK_TEMPLATES 
} from './lib/mockData';

const PlaceholderModule = ({ title }: { title: string }) => (
  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
    <div className="flex flex-col items-center justify-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-sm p-16 text-center">
      <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 text-neutral-300 dark:text-neutral-600">
        <PieChartIcon size={40} />
      </div>
      <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md">
        Este módulo está em desenvolvimento. Em breve, ferramentas específicas para esta secretaria estarão disponíveis.
      </p>
      <button onClick={() => showToast('Botão em desenvolvimento', 'warning')} className="mt-8 px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl shadow-neutral-900/10">
        Notificar Lançamento
      </button>
    </div>
  </div>
);

export default function App() {
  React.useEffect(() => {
    const hostname = window.location.hostname;
    if (hostname.startsWith('www.')) {
      const parts = hostname.split('.');
      const isComBr = hostname.endsWith('.com.br');
      const baseDomainParts = isComBr ? 3 : 2;
      // Se tiver mais partes que www + dominio base (ex: www.torixoreu.gestao360sistema.com.br tem 5 partes)
      if (parts.length > baseDomainParts + 1) {
        window.location.replace(window.location.href.replace('www.', ''));
      }
    }
  }, []);

  const [currentInstitution, setCurrentInstitution] = React.useState<Institution | null>(null);
  const [loadingInstitution, setLoadingInstitution] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<AdminUser | null>(null);
  const [pendingReport, setPendingReport] = React.useState<'patrimonio' | null>(null);
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('gestao360-dark-mode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  React.useEffect(() => {
    localStorage.setItem('gestao360-dark-mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  React.useEffect(() => {
    const bootstrap = async () => {
      let activeInst: Institution | null = null;
      const subdomain = getSubdomain();
      let isSaaS = false;

      if (subdomain) {
        if (subdomain.toLowerCase() === 'admin') {
          isSaaS = true;
          setIsSuperAdminPortal(true);
          document.title = 'GESTÃO 360 · Central de Controle SaaS';
        } else {
          activeInst = await fetchInstitutionBySubdomain(subdomain);
          if (activeInst) {
            setCurrentInstitution(activeInst);
            document.title = `GESTÃO 360 · ${activeInst.name}`;
          } else {
            console.warn(`Subdomínio '${subdomain}' não encontrado no banco de dados.`);
          }
        }
      }

      const handleAuthSession = async (session: any, resolvedInst: Institution | null, isSaaSAdmin: boolean, event?: string) => {
        if (session?.user?.email) {
          // Prevenção de deadlocks e loop recursivo: evitamos chamadas ao Supabase
          // em eventos secundários (ex: alteração de senha 'USER_UPDATED' ou refresh de token).
          if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
            console.log('[Auth] Ignorando recarregamento de perfil no banco para o evento:', event);
            return;
          }

          if (session.user.email === 'aficconsultoria@gmail.com') {
            setCurrentUser({
              id: session.user.id,
              name: 'Gestão 360',
              email: session.user.email,
              role: 'Super Admin',
              status: 'Ativo',
              lastLogin: new Date().toISOString(),
              permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
            });
            setIsAuthenticated(true);
          } else {
            const { data, error } = await supabase.from('admin_users').select('*').eq('email', session.user.email).maybeSingle();
            
            if (error) {
              console.error('[Auth] Erro ao carregar perfil do usuário no banco:', error);
              showToast('Erro de conexão ao carregar perfil. Verifique sua rede.', 'error');
              // Mantém o estado atual, mas não chama signOut para evitar deslogar em caso de erro temporário
              setIsAuthenticated(false);
              setCurrentUser(null);
              return;
            }

            if (data) {
              // Bloqueio de Segurança para o Portal SaaS (Subdomínio 'admin')
              if (isSaaSAdmin && data.role !== 'Super Admin') {
                showToast('Acesso restrito para Super Administradores da plataforma.', 'error');
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                setCurrentUser(null);
                return;
              }

              // Bloqueio de Segurança para Prefeitura Municipal
              if (resolvedInst && data.role !== 'Super Admin' && data.institution_id !== resolvedInst.id) {
                showToast('Acesso não autorizado para esta prefeitura.', 'error');
                await supabase.auth.signOut();
                setIsAuthenticated(false);
                setCurrentUser(null);
                return;
              }

              const hasChangedPassword = sessionStorage.getItem('password_changed') === 'true';
              console.log('[Auth] User loaded:', data.email, 'last_login:', data.last_login, 'event:', event, 'hasChangedPassword:', hasChangedPassword);

              setCurrentUser({ ...data, lastLogin: data.last_login } as AdminUser);
              setIsAuthenticated(true);
              
              // Se o usuário já mudou a senha nesta sessão ou o evento é de atualização, ignora o estado 'Nunca' defasado (Race Condition fix)
              if (data.last_login === 'Nunca' && !hasChangedPassword && event !== 'USER_UPDATED') {
                console.log('[Auth] First login detected. Opening ChangePasswordModal.');
                setIsChangingPassword(true);
                setForcePasswordChange(true);
              }
            } else {
              console.warn('[Auth] Usuário autenticado não encontrado na tabela admin_users.');
              showToast('Seu usuário não possui acesso a este sistema.', 'error');
              await supabase.auth.signOut();
              setIsAuthenticated(false);
              setCurrentUser(null);
            }
          }
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      };

      const checkSession = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await handleAuthSession(session, activeInst, isSaaS, 'INITIAL_SESSION');
        } catch (e) {
          console.error('[Auth] Erro ao carregar sessão:', e);
        }
      };

      await checkSession();

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Executamos no próximo tick para desempilhar a execução e evitar deadlocks internos do cliente Supabase
        setTimeout(async () => {
          await handleAuthSession(session, activeInst, isSaaS, event);
        }, 0);
      });

      // Tenta re-checar a sessão caso o navegador volte a ficar online (útil para dispositivos móveis)
      const handleOnline = () => {
        console.log('[Auth] Conexão restaurada. Re-verificando sessão...');
        checkSession();
      };
      window.addEventListener('online', handleOnline);

      setLoadingInstitution(false);

      return () => {
        subscription.unsubscribe();
        window.removeEventListener('online', handleOnline);
      };
    };

    let cleanupFn: () => void = () => {};
    bootstrap().then(cleanup => {
      if (cleanup) cleanupFn = cleanup;
    });

    return () => cleanupFn();
  }, []);
  const [isSuperAdminPortal, setIsSuperAdminPortal] = React.useState(false);
  const [activeView, setActiveView] = React.useState<View>('home');
  const [patrimonioItems, setPatrimonioItems] = React.useState<PatrimonioItem[]>([]);
  const [adminUsers, setAdminUsers] = React.useState<AdminUser[]>(MOCK_USERS);
  const [institutions, setInstitutions] = React.useState<Institution[]>(MOCK_INSTITUTIONS);
  const [selectedYear, setSelectedYear] = React.useState('2026');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [controls, setControls] = React.useState<CheckItem[]>(MOCK_CONTROLS);
  const [orders, setOrders] = React.useState<OrderItem[]>(MOCK_ORDERS);
  const [docRecords, setDocRecords] = React.useState<DocumentRecord[]>(MOCK_DOCUMENTS);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [pendingReportsCount, setPendingReportsCount] = React.useState(0);

  React.useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchPendingReportsCount = async () => {
      const { count } = await supabase
        .from('meio_ambiente_denuncias')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Nova');
      if (count !== null) setPendingReportsCount(count);
    };
    
    fetchPendingReportsCount();
    
    const reportsSub = supabase.channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meio_ambiente_denuncias' }, payload => {
        fetchPendingReportsCount();
      })
      .subscribe();
      
    return () => {
      reportsSub.unsubscribe();
    };
  }, [isAuthenticated]);

  React.useEffect(() => {
    // Busca pública das prefeituras para exibir a logo na Landing Page
    const fetchPublicInstitutions = async () => {
      try {
        const { data, error } = await supabase.from('institutions').select('*');
        if (!error && data && data.length > 0) {
          setInstitutions(data as Institution[]);
        }
      } catch (err) {
        console.error('Erro ao buscar prefeituras públicas:', err);
      }
    };
    fetchPublicInstitutions();
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) return;

    const fetchGlobalData = async () => {
      try {
        const fetchPaginated = async (table: string, applyFilters?: (q: any) => any) => {
          let allData: any[] = [];
          let from = 0;
          let to = 999;
          let hasMore = true;

          while (hasMore) {
            let q = supabase.from(table).select('*').range(from, to);
            if (applyFilters) q = applyFilters(q);
            
            const { data, error } = await q;
            if (error || !data) {
              console.error(`Erro ao buscar ${table}:`, error);
              break;
            }
            
            allData = [...allData, ...data];
            if (data.length < 1000) {
              hasMore = false;
            } else {
              from += 1000;
              to += 1000;
            }
          }
          return { data: allData };
        };

        const { data: users } = await fetchPaginated('admin_users', q => currentInstitution ? q.eq('institution_id', currentInstitution.id) : q);
        const { data: docs } = await fetchPaginated('documents', q => currentInstitution ? q.eq('institution_id', currentInstitution.id) : q);
        const { data: ords } = await fetchPaginated('orders', q => currentInstitution ? q.eq('institution_id', currentInstitution.id) : q);
        const { data: ctrls } = await fetchPaginated('controls', q => currentInstitution ? q.eq('institution_id', currentInstitution.id) : q);
        const { data: insts } = await fetchPaginated('institutions', q => {
          if (currentInstitution && currentUser?.role !== 'Super Admin') {
            return q.eq('id', currentInstitution.id);
          }
          return q;
        });
        const { data: pats } = await fetchPaginated('patrimonio', q => {
          let query = q.order('created_at', { ascending: false });
          if (currentInstitution) query = query.eq('institution_id', currentInstitution.id);
          return query;
        });
        const { data: depts } = await fetchPaginated('departments', q => currentInstitution ? q.eq('institution_id', currentInstitution.id) : q);

        if (users) setAdminUsers(users.map(u => ({ ...u, lastLogin: u.last_login } as AdminUser)));
        if (docs) setDocRecords(docs.map(d => ({ ...d, dateCreated: d.date_created } as DocumentRecord)));
        if (ords) setOrders(ords.map(o => ({ ...o, dateRequested: o.date_requested, quotationNumber: o.quotation_number, winningSupplier: o.winning_supplier } as OrderItem)));
        if (ctrls) setControls(ctrls as CheckItem[]);
        if (insts) setInstitutions(insts as Institution[]);
        if (depts) setDepartments(depts as Department[]);
        if (pats) setPatrimonioItems(pats.map(p => ({
          ...p,
          itemType: p.item_type,
          objectName: p.object_name,
          imageUrls: p.image_urls,
          createdByName: p.created_by_name
        } as PatrimonioItem)));
      } catch (err) {
        console.error('Erro ao buscar dados do Supabase:', err);
      }
    };

    fetchGlobalData();
  }, [isAuthenticated, currentInstitution, currentUser?.id]);
  const [protocols, setProtocols] = React.useState<Protocol[]>([]);
  const [editingControl, setEditingControl] = React.useState<CheckItem | null>(null);
  const [viewingControl, setViewingControl] = React.useState<CheckItem | null>(null);
  const [viewingHistory, setViewingHistory] = React.useState<CheckItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
  const [notifications, setNotifications] = React.useState([
    { id: 1, text: 'Prazo do RREO vencendo em 15 dias', type: 'warning', read: false },
    { id: 2, text: 'Novo protocolo recebido da Secretaria de Saúde', type: 'info', read: false },
    { id: 3, text: 'Parecer do Gemini gerado para análise de frotas', type: 'success', read: true },
  ]);
  const [obligations, setObligations] = React.useState([
    { id: 1, title: 'RREO - 2º Bimestre', date: '2024-05-30', status: 'pending', priority: 'high' },
    { id: 2, title: 'Siace/TCE - Lançamento Mensal', date: '2024-05-15', status: 'completed', priority: 'medium' },
    { id: 3, title: 'PCA - Plano de Contratações Anual', date: '2024-06-01', status: 'urgent', priority: 'high' },
    { id: 4, title: 'Relatório de Gestão da Saúde', date: '2024-05-25', status: 'pending', priority: 'medium' },
  ]);
  const [isNewControlModalOpen, setIsNewControlModalOpen] = React.useState(false);
  const [attachingFor, setAttachingFor] = React.useState<number | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [forcePasswordChange, setForcePasswordChange] = React.useState(false);
  const [homeMode, setHomeMode] = React.useState<'quick_access' | 'mayor'>('mayor');
  const [recentViews, setRecentViews] = React.useState<View[]>([]);

  // Carrega os acessos recentes quando o usuário logar
  React.useEffect(() => {
    if (currentUser?.id) {
      const saved = localStorage.getItem(`gestao360-recent-views-${currentUser.id}`);
      if (saved) {
        setRecentViews(JSON.parse(saved));
      } else {
        setRecentViews([]);
      }
    }
  }, [currentUser?.id]);

  // Salva o acesso recente sempre que mudar de view (atrelado ao usuário)
  React.useEffect(() => {
    if (activeView !== 'home' && currentUser?.id) {
      setRecentViews(prev => {
        const updated = [activeView, ...prev.filter(v => v !== activeView)].slice(0, 8);
        localStorage.setItem(`gestao360-recent-views-${currentUser.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeView, currentUser?.id]);

  if (loadingInstitution) {
    return (
      <div className="min-h-dvh bg-[#F9F9F8] dark:bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-neutral-900/10 dark:border-white/10 border-t-neutral-900 dark:border-t-white rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Carregando Gestão 360...</p>
        </div>
      </div>
    );
  }

  const currentPath = window.location.pathname;
  const isPublicPortal = currentPath === '/agendamento';
  const isFarmaciaPortal = currentPath === '/farmaciasus';
  const isServicosPublicosPortal = currentPath === '/servicos';
  const isEducacaoPortal = currentPath === '/educacao';
  const isMeioAmbientePortal = currentPath === '/meio-ambiente';
  const isAdminRoute = currentPath === '/servidores' || currentPath.startsWith('/servidores/');
  const isLandingPage = currentPath === '/';
  const isSalesPage = currentPath === '/vendas' || currentPath === '/apresentacao' || currentPath === '/institucional';

  // Rota Especial: Central de Controle SaaS (Subdomínio 'admin')
  if (isSuperAdminPortal) {
    if (!isAuthenticated) {
      return (
        <Login onLogin={() => setIsAuthenticated(true)} onDemoLogin={() => { setIsAuthenticated(true); setCurrentUser(MOCK_USERS[0]); }} darkMode={darkMode} setDarkMode={setDarkMode} currentInstitution={null} isSaaSAdmin={true} />
      );
    }

    return (
      <SaaSControlCenter 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={currentUser}
        adminUsers={adminUsers}
        setAdminUsers={setAdminUsers}
        institutions={institutions}
        setInstitutions={setInstitutions}
        departments={departments}
        setDepartments={setDepartments}
        controls={controls}
        patrimonioItems={patrimonioItems}
        orders={orders}
      />
    );
  }

  // Rota de apresentação e vendas
  if (isSalesPage) {
    return <SalesLandingPage darkMode={darkMode} setDarkMode={setDarkMode} showMunicipalitySelector={true} institutions={institutions} />;
  }

  // Página inicial — se não houver subdomínio, exibe a página institucional com seletor.
  // Se houver subdomínio, exibe a landing page pública daquela prefeitura.
  if (isLandingPage) {
    if (!currentInstitution) {
      return <SalesLandingPage darkMode={darkMode} setDarkMode={setDarkMode} showMunicipalitySelector={true} institutions={institutions} />;
    }
    return <LandingPage darkMode={darkMode} setDarkMode={setDarkMode} currentInstitution={currentInstitution} />;
  }

  if (isFarmaciaPortal) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <div className="absolute top-10 right-10 z-50">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <PublicFarmaciaPortal darkMode={darkMode} currentInstitution={currentInstitution} />
      </div>
    );
  }

  if (isPublicPortal) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <div className="absolute top-10 right-10 z-50">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <PublicSaudePortal darkMode={darkMode} currentInstitution={currentInstitution} />
      </div>
    );
  }

  if (isServicosPublicosPortal) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <div className="absolute top-10 right-10 z-50">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <PublicServicosPortal darkMode={darkMode} currentInstitution={currentInstitution} />
      </div>
    );
  }

  if (isEducacaoPortal) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <div className="absolute top-10 right-10 z-50">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <PublicEducacaoPortal darkMode={darkMode} currentInstitution={currentInstitution} />
      </div>
    );
  }

  if (isMeioAmbientePortal) {
    return (
      <div className={darkMode ? 'dark' : ''}>
         <div className="absolute top-10 right-10 z-50">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:scale-110 transition-all"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          <PublicMeioAmbientePortal darkMode={darkMode} currentInstitution={currentInstitution} />
      </div>
    );
  }

  // Qualquer rota que não seja /servidores redireciona para a landing
  if (!isAdminRoute) {
    window.location.replace('/');
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Login onLogin={() => setIsAuthenticated(true)} onDemoLogin={() => { setIsAuthenticated(true); setCurrentUser(MOCK_USERS[0]); }} darkMode={darkMode} setDarkMode={setDarkMode} currentInstitution={currentInstitution} />
    );
  }

  const addControl = async (newControl: Omit<CheckItem, 'id'>) => {
    const control: CheckItem = {
      ...newControl,
      id: crypto.randomUUID()
    };
    setControls([control, ...controls]);
    setIsNewControlModalOpen(false);
    showToast('Controle adicionado com sucesso!');
    
    await supabase.from('controls').insert({
      id: control.id,
      task: control.task,
      status: control.status,
      department: control.department,
      deadline: control.deadline,
      notes: control.notes,
      history: control.history || [],
      institution_id: currentInstitution?.id || null
    }).then(({ error }) => { if (error) console.error(error) });
  };

  const updateControl = async (updated: CheckItem) => {
    setControls(controls.map(c => c.id === updated.id ? updated : c));
    setEditingControl(null);
    showToast('Alterações salvas!');
    
    await supabase.from('controls').update({
      task: updated.task,
      status: updated.status,
      department: updated.department,
      deadline: updated.deadline,
      notes: updated.notes,
      history: updated.history || []
    }).eq('id', updated.id).then(({ error }) => { if (error) console.error(error) });
  };

  const deleteControl = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este controle?')) {
      setControls(controls.filter(c => c.id !== id));
      showToast('Controle removido do sistema.');
      await supabase.from('controls').delete().eq('id', id).then(({ error }) => { if (error) console.error(error) });
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-dvh bg-[#F9F9F8] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex transition-colors duration-500 print:bg-white">
      {/* New Control Modal */}
      <AnimatePresence>
        {isNewControlModalOpen && (
          <NewControlModal 
            onClose={() => setIsNewControlModalOpen(false)} 
            onAdd={addControl} 
          />
        )}
      </AnimatePresence>
      {/* Edit Control Modal */}
      <AnimatePresence>
        {editingControl && (
          <NewControlModal 
            onClose={() => setEditingControl(null)} 
            onAdd={(c) => updateControl({ ...c, id: editingControl.id })}
            initialData={editingControl}
            title="Editar Controle"
          />
        )}
      </AnimatePresence>
      {/* View Control Detail Modal */}
      <AnimatePresence>
        {viewingControl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">{viewingControl.task}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{viewingControl.department}</p>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                  viewingControl.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                  viewingControl.status === 'urgent' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {viewingControl.status}
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Prazo Limite</p>
                  <p className="text-sm font-bold dark:text-neutral-200">{viewingControl.deadline}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">Observações</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">“{viewingControl.notes || 'Nenhuma observação informada.'}”</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingControl(null)}
                className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl font-bold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all"
              >
                Fechar Detalhes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* History Modal */}
      <AnimatePresence>
        {viewingHistory && (
          <HistoryModal 
            item={viewingHistory} 
            onClose={() => setViewingHistory(null)} 
          />
        )}
      </AnimatePresence>
      {/* Attachment Modal */}
      <AnimatePresence>
        {attachingFor && (
          <AttachmentModal 
            title={obligations.find(o => o.id === attachingFor)?.title || ''}
            onClose={() => setAttachingFor(null)}
            onConfirm={() => {
              setObligations(obligations.map(o => o.id === attachingFor ? {...o, status: 'completed'} : o));
              setAttachingFor(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <ChangePasswordModal 
            forceChange={forcePasswordChange}
            onClose={() => !forcePasswordChange && setIsChangingPassword(false)}
            onSuccess={async () => {
              console.log('[ChangePassword] Success handler started.');
              sessionStorage.setItem('password_changed', 'true');
              if (forcePasswordChange && currentUser) {
                const now = new Date().toLocaleString('pt-BR');
                console.log('[ChangePassword] Updating last_login in DB to:', now);
                try {
                  const { error } = await supabase.from('admin_users').update({ last_login: now }).eq('id', currentUser.id);
                  if (error) throw error;
                  console.log('[ChangePassword] DB updated successfully.');
                } catch (dbErr) {
                  console.error('[ChangePassword] Erro ao atualizar last_login no banco:', dbErr);
                }
                setCurrentUser({ ...currentUser, lastLogin: now } as AdminUser);
                setAdminUsers(adminUsers.map(u => u.id === currentUser.id ? { ...u, lastLogin: now } : u));
                setForcePasswordChange(false);
              }
              setIsChangingPassword(false);
              console.log('[ChangePassword] Success handler finished.');
            }}
          />
        )}
      </AnimatePresence>

                        {/* Top Navbar Component */}
      <div className="flex-1 flex flex-col min-h-dvh print:min-h-0 print:h-auto print:block relative z-10 transition-all duration-300 w-full overflow-x-hidden print:overflow-visible bg-neutral-50 dark:bg-neutral-950">
        <nav className="bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800 sticky top-0 z-40 transition-colors shadow-sm w-full print:hidden">
          <div className="max-w-[1400px] mx-auto px-6">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveView('home')}>
                  <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm group-hover:scale-110 transition-transform flex items-center justify-center">
                    <LogoCompass size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight leading-none italic dark:text-white">Gestão <span className="text-neutral-400 font-normal">360</span></h1>
                  </div>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden lg:flex items-center gap-2">
                  {NAVBAR_CATEGORIES.map((category) => {
                    const allowedItems = category.items.filter(item => hasPermission(currentUser, item.id as View, 'view'));
                    if (allowedItems.length === 0) return null;
                    const isActiveCategory = allowedItems.some(i => i.id === activeView);
                    
                    return (
                      <div key={category.id} className="relative">
                        <button
                          onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${
                            isActiveCategory 
                              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white'
                          }`}
                        >
                          <category.icon size={16} />
                          {category.label}
                          <ChevronRight size={14} className={`transition-transform duration-200 ${expandedCategory === category.id ? 'rotate-90' : ''}`} />
                        </button>

                        <AnimatePresence>
                        {expandedCategory === category.id && (
                          <>
                          <div className="fixed inset-0 z-30" onClick={() => setExpandedCategory(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-2 w-max min-w-[240px] z-40"
                          >
                            <div className="pt-2">
                              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xl overflow-hidden relative z-40 p-2">
                                {allowedItems.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => {
                                      setActiveView(item.id as View);
                                      setExpandedCategory(null);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all relative whitespace-nowrap ${
                                      activeView === item.id 
                                        ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white' 
                                        : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                                    }`}
                                  >
                                    <item.icon size={16} className="shrink-0" />
                                    {item.label}
                                    {item.id === 'meio_ambiente' && pendingReportsCount > 0 && (
                                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                                        {pendingReportsCount}
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                          </>
                        )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                {currentUser && (
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
                )}
                {/* Hamburger Button for Mobile */}
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2.5 rounded-xl transition-all text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                  title="Menu"
                >
                  <Menu size={20} />
                </button>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2.5 rounded-xl transition-all text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                  title={darkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {hasPermission(currentUser, 'settings', 'view') && (
                  <button 
                    onClick={() => setActiveView('settings')}
                    className={`p-2.5 rounded-xl transition-all ${
                      activeView === 'settings' 
                        ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white'
                    }`}
                    title="Configurações e Usuários"
                  >
                    <Settings size={20} />
                  </button>
                )}
                <button 
                  onClick={() => setActiveView('support')}
                  className={`p-2.5 rounded-xl transition-all ${
                    activeView === 'support' 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                      : 'text-neutral-500 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400'
                  }`}
                  title="Suporte & Ajuda"
                >
                  <LifeBuoy size={20} />
                </button>
                <a
                  href="/"
                  className="p-2.5 rounded-xl transition-all text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white"
                  title="Voltar à Página Inicial"
                >
                  <Home size={20} />
                </a>
                <button 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsAuthenticated(false);
                    window.location.href = '/';
                  }}
                  className="hidden sm:block p-2.5 rounded-xl transition-all text-neutral-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  title="Sair"
                >
                  <LogOut size={20} />
                </button>
              </div>

            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-40 lg:hidden print:hidden"
                />
                <motion.div 
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-neutral-900 z-50 shadow-2xl flex flex-col lg:hidden print:hidden"
                >
                  <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500 text-white p-2 rounded-xl">
                        <LogoCompass size={20} />
                      </div>
                      <h2 className="text-lg font-black italic dark:text-white">Gestão <span className="text-neutral-400 font-normal">360</span></h2>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {NAVBAR_CATEGORIES.map((category) => {
                      const allowedItems = category.items.filter(item => hasPermission(currentUser, item.id as View, 'view'));
                      if (allowedItems.length === 0) return null;

                      return (
                      <div key={category.id} className="space-y-2">
                        <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 flex items-center gap-2">
                          <category.icon size={12} /> {category.label}
                        </h3>
                        <div className="space-y-1">
                          {allowedItems.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveView(item.id as View);
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeView === item.id 
                                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md' 
                                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                              }`}
                            >
                              <item.icon size={16} />
                              {item.label}
                              {item.id === 'meio_ambiente' && pendingReportsCount > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                                  {pendingReportsCount}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )})}
                  </div>
                  
                  {/* Mobile Drawer Footer (User & Logout) */}
                  <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    {currentUser && (
                      <div className="flex items-center gap-3 px-3 py-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                          <UserCircle size={20} className="text-neutral-500 dark:text-neutral-400" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-bold text-neutral-900 dark:text-white truncate">{currentUser.name || currentUser.email}</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{currentUser.role}</span>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setIsAuthenticated(false);
                        window.location.href = '/';
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 rounded-xl font-bold transition-colors"
                    >
                      <LogOut size={18} />
                      Sair do Sistema
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </nav>

        <div className="flex-1 overflow-y-auto w-full relative z-10 custom-scrollbar print:overflow-visible print:h-auto">
          <main className="min-h-full p-6 lg:p-10 pb-20 print:p-0 print:pb-0">
            <div className="max-w-[1400px] mx-auto w-full">
            {/* View Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >

            {activeView === 'patrimonio' && (
              <PatrimonioModule 
                items={patrimonioItems} 
                canDelete={hasPermission(currentUser, 'patrimonio', 'admin')}
                canEdit={hasPermission(currentUser, 'patrimonio', 'edit')}
                userDepartment={hasPermission(currentUser, 'patrimonio', 'admin') ? '' : (departments.find(d => d.id === currentUser?.department_id)?.name || 'Sem Lotação Vinculada')}
                availableDepartments={departments.map(d => d.name)}
                currentUserName={currentUser?.name || currentUser?.email}

                onDelete={async (id) => {
                  try {
                    const { error } = await supabase.from('patrimonio').delete().eq('id', id);
                    if (error) throw error;
                    setPatrimonioItems(patrimonioItems.filter(p => p.id !== id));
                    showToast('Item excluído com sucesso', 'success');
                  } catch (error) {
                    console.error('Erro ao excluir patrimônio:', error);
                    showToast('Erro ao excluir item', 'error');
                  }
                }}
                onAdd={async (item) => {
                  const dbItem = {
                    item_type: item.itemType,
                    code: item.code,
                    object_name: item.objectName,
                    location: item.location,
                    status: item.status,
                    condition: item.condition,
                    department: item.department,
                    year: item.year,
                    image_urls: item.imageUrls,
                    plate: item.plate,
                    chassis: item.chassis,
                    model: item.model,
                    description: item.description,
                    created_by_name: currentUser?.name || currentUser?.email || 'Usuário Desconhecido',
                    institution_id: currentInstitution?.id || null
                  };
                  try {
                    const { data, error } = await supabase.from('patrimonio').insert([dbItem]).select().single();
                    if (error) throw error;
                    if (data) {
                      setPatrimonioItems([{
                        ...data,
                        itemType: data.item_type,
                        objectName: data.object_name,
                        imageUrls: data.image_urls,
                        description: data.description,
                        createdByName: data.created_by_name
                      } as PatrimonioItem, ...patrimonioItems]);
                      showToast('Item de patrimônio salvo com sucesso', 'success');
                    }
                  } catch (error) {
                    console.error('Erro ao salvar patrimônio:', error);
                    showToast('Erro ao salvar item', 'error');
                  }
                }}
                onEdit={async (item) => {
                  const dbItem = {
                    item_type: item.itemType,
                    code: item.code,
                    object_name: item.objectName,
                    location: item.location,
                    status: item.status,
                    condition: item.condition,
                    department: item.department,
                    year: item.year,
                    image_urls: item.imageUrls,
                    plate: item.plate,
                    chassis: item.chassis,
                    model: item.model,
                    description: item.description
                  };
                  try {
                    const { data, error } = await supabase.from('patrimonio').update(dbItem).eq('id', item.id).select().single();
                    if (error) throw error;
                    if (data) {
                      setPatrimonioItems(patrimonioItems.map(p => p.id === item.id ? {
                        ...data,
                        itemType: data.item_type,
                        objectName: data.object_name,
                        imageUrls: data.image_urls,
                        description: data.description,
                        createdByName: data.created_by_name
                      } as PatrimonioItem : p));
                      showToast('Item atualizado com sucesso', 'success');
                    }
                  } catch (error) {
                    console.error('Erro ao atualizar patrimônio:', error);
                    showToast('Erro ao atualizar item', 'error');
                  }
                }}
              />
            )}
            {activeView === 'orders' && (
              <OrdersModule 
                orders={orders.filter(o => o.description.toLowerCase().includes(searchQuery.toLowerCase()) || o.requester.toLowerCase().includes(searchQuery.toLowerCase()))}
                onAdd={async (newOrder) => {
                  const order = { ...newOrder, id: crypto.randomUUID() } as OrderItem;
                  setOrders([order, ...orders]);
                  setNotifications([{ id: Date.now(), text: `Novo pedido recebido de ${order.requester}`, type: 'info', read: false }, ...notifications]);
                  showToast('Pedido registrado com sucesso!', 'success');
                  
                  await supabase.from('orders').insert({
                    id: order.id,
                    type: order.type,
                    description: order.description,
                    requester: order.requester,
                    date_requested: order.dateRequested,
                    quotation_number: order.quotationNumber,
                    winning_supplier: order.winningSupplier,
                    status: order.status,
                    institution_id: currentInstitution?.id || null
                  }).then(({ error }) => { if (error) console.error(error) });
                }}
                onEdit={async (updatedOrder) => {
                  setOrders(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
                  await supabase.from('orders').update({
                    type: updatedOrder.type,
                    description: updatedOrder.description,
                    requester: updatedOrder.requester,
                    date_requested: updatedOrder.dateRequested,
                    quotation_number: updatedOrder.quotationNumber,
                    winning_supplier: updatedOrder.winningSupplier,
                    status: updatedOrder.status
                  }).eq('id', updatedOrder.id).then(({ error }) => { if (error) console.error(error) });
                }}
                setOrders={setOrders}
              />
            )}
            {activeView === 'home' && (
              <div className="w-full max-w-[1400px] mx-auto px-6 py-12 relative z-10 animate-in fade-in duration-500">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                      {homeMode === 'mayor' ? 'Painel Gerencial' : (recentViews.length > 0 ? 'Acessados Recentemente' : 'Acesso Rápido')}
                    </h2>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-2">
                      {homeMode === 'mayor' ? 'Indicadores estratégicos da gestão.' : (recentViews.length > 0 ? 'Suas ferramentas mais utilizadas recentemente.' : 'Selecione um módulo para começar.')}
                    </p>
                  </div>
                  <div className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-2xl flex items-center">
                    <button
                      onClick={() => setHomeMode('mayor')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${homeMode === 'mayor' ? 'bg-white dark:bg-neutral-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                    >
                      Visão do Prefeito
                    </button>
                    <button
                      onClick={() => setHomeMode('quick_access')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${homeMode === 'quick_access' ? 'bg-white dark:bg-neutral-900 shadow-sm text-purple-600 dark:text-purple-400' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                    >
                      Módulos do Sistema
                    </button>
                  </div>
                </div>
                
                {homeMode === 'mayor' ? (
                  <MayorDashboard darkMode={darkMode} userName={currentUser?.name} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                  {(() => {
                    // Flatten all allowed items
                    const allAllowedItems = NAVBAR_CATEGORIES.flatMap(category => 
                      category.items
                        .filter(item => hasPermission(currentUser, item.id as View, 'view'))
                        .map(item => ({ ...item, categoryLabel: category.label }))
                    );

                    // If no recent views, show all allowed items
                    let itemsToDisplay = allAllowedItems;
                    
                    if (recentViews.length > 0) {
                      // Map recentViews to items, maintaining order
                      itemsToDisplay = recentViews
                        .map(viewId => allAllowedItems.find(item => item.id === viewId))
                        .filter((item): item is typeof allAllowedItems[0] => item !== undefined);
                        
                      // If recent views somehow yielded no allowed items, fallback to all allowed
                      if (itemsToDisplay.length === 0) {
                        itemsToDisplay = allAllowedItems;
                      }
                    }

                    return itemsToDisplay.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActiveView(item.id as View)}
                        className="group flex flex-col text-left p-6 bg-white dark:bg-neutral-900 rounded-[32px] shadow-sm border border-neutral-100 dark:border-neutral-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-neutral-50 dark:bg-neutral-800/50 rounded-bl-[100px] -z-10 transition-transform duration-500 group-hover:scale-110" />
                        
                        <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-6 text-neutral-500 dark:text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-neutral-900 transition-colors shadow-inner">
                          <item.icon size={24} />
                        </div>
                        
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white mb-1 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                          {item.label}
                        </h3>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">
                          {item.categoryLabel}
                        </p>
                      </button>
                    ));
                  })()}
                </div>
                )}
                

                {/* Minimal watermark background */}
                <div className="fixed bottom-0 right-0 p-12 pointer-events-none opacity-[0.06] dark:opacity-10 z-0 flex items-center scale-50 origin-bottom-right">
                  <LogoCompass size={160} className="text-neutral-900 dark:text-white mr-8" />
                  <h1 className="text-[140px] font-black tracking-tight leading-none italic text-neutral-900 dark:text-white">Gestão <span className="font-normal">360</span></h1>
                </div>
              </div>
            )}
            {activeView === 'controls' && (
              <ControlsModule 
                controls={controls.filter(c => 
                  c.task.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  c.department.toLowerCase().includes(searchQuery.toLowerCase())
                )} 
                onAddNew={() => setIsNewControlModalOpen(true)} 
                onEdit={setEditingControl}
                onDelete={deleteControl}
                onView={setViewingControl}
                onViewHistory={setViewingHistory}
              />
            )}
            {activeView === 'risk' && <RiskModule />}
            {activeView === 'pntp' && <PNTPModule selectedYear={selectedYear} />}
            {activeView === 'calendar' && (
                  <CalendarModule 
                obligations={obligations.filter(o => o.title.toLowerCase().includes(searchQuery.toLowerCase()))} 
                onAttach={setAttachingFor} 
              />
            )}
            {activeView === 'norms' && <NormsModule />}
            {activeView === 'protocol' && <ProtocolModule searchQuery={searchQuery} currentUser={currentUser} currentInstitution={currentInstitution} />}
            {activeView === 'contracts' && <ContractsModule currentInstitution={currentInstitution} />}
            {activeView === 'education' && <EducationModule />}
            {activeView === 'doc_numbers' && <DocumentNumbersModule currentUser={currentUser} currentInstitution={currentInstitution} />}
            {activeView === 'reports' && <ReportsModule patrimonioItems={patrimonioItems} initialReport={pendingReport} clearPendingReport={() => setPendingReport(null)} currentInstitution={currentInstitution} />}
            {activeView === 'certificates' && <CertificatesModule currentUser={currentUser} institution={currentInstitution} />}
            {activeView === 'obras' && <PlaceholderModule title="Secretaria de Viação e Obras" />}
            {activeView === 'admin_financas' && <FinanceModules />}
            {activeView === 'administracao' && <AdministracaoModule />}
            {activeView === 'financas' && <FinanceModules />}
            {activeView === 'saude' && <SaudeModule currentInstitution={currentInstitution} />}
            {activeView === 'servicos_publicos' && <ServicosPublicosModule currentInstitution={currentInstitution} />}
            {activeView === 'meio_ambiente' && <MeioAmbienteModule currentInstitution={currentInstitution} currentUser={currentUser} />}
            {activeView === 'tributos' && <PlaceholderModule title="Secretaria de Tributos" />}
            {activeView === 'agricultura' && <PlaceholderModule title="Secretaria de Agricultura" />}
            {activeView === 'assistencia_social' && <AssistenciaSocialModule />}
            {activeView === 'esporte' && <PlaceholderModule title="Secretaria de Esporte" />}
            {activeView === 'planejamento' && <PlaceholderModule title="Secretaria de Planejamento" />}
            {activeView === 'camara' && <CamaraModule />}
            {activeView === 'settings' && <SettingsModule users={adminUsers} setUsers={setAdminUsers} institutions={institutions} setInstitutions={setInstitutions} departments={departments} setDepartments={setDepartments} currentUser={currentUser} />}
            {activeView === 'support' && <SupportModule currentUser={currentUser} institution={currentInstitution} />}
            {activeView === 'templates' && <TemplatesModule />}
          </motion.div>
        </AnimatePresence>
        </div>
      </main>
    </div>

      {/* Toasts */}
      <ToastContainer />
      
        </div>
      </div>
    </div>
  );
}

// --- Additional Modules ---

interface Contract {
  id: string;
  number: string;
  object: string;
  vendorName: string;
  amount: number;
  status: 'active' | 'review' | 'expired' | 'risk';
  category: 'Licitação' | 'Dispensa' | 'Inexigibilidade';
  deadline: string;
}

export const MOCK_CONTRACTS: Contract[] = [
  { id: '1', number: '015/2024', object: 'Locação de Software de Gestão', vendorName: 'TechGov Soluções Ltda', amount: 450000, status: 'active', category: 'Licitação', deadline: '2025-05-10' },
  { id: '2', number: '018/2024', object: 'Aquisição de Alimentos Escolares', vendorName: 'Distribuidora São Paulo', amount: 1200000, status: 'risk', category: 'Licitação', deadline: '2024-12-20' },
  { id: '3', number: '021/2024', object: 'Reforma da Praça Central', vendorName: 'Construtora Forte', amount: 890000, status: 'review', category: 'Licitação', deadline: '2024-08-30' },
  { id: '4', number: '005/2024-D', object: 'Serviços de Vigilância Emergencial', vendorName: 'Segurança Total Eireli', amount: 85000, status: 'expired', category: 'Dispensa', deadline: '2024-04-15' },
];



const NewControlModal = ({ 
  onClose, 
  onAdd, 
  initialData, 
  title = "Novo Controle Interno" 
}: { 
  onClose: () => void, 
  onAdd: (c: Omit<CheckItem, 'id'>) => void,
  initialData?: CheckItem,
  title?: string
}) => {
  const [formData, setFormData] = React.useState<Omit<CheckItem, 'id'>>(initialData ? {
    task: initialData.task,
    department: initialData.department,
    status: initialData.status,
    deadline: initialData.deadline,
    notes: initialData.notes || ''
  } : {
    task: '',
    department: '',
    status: 'pending',
    deadline: new Date().toISOString().split('T')[0],
    notes: ''
  });

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
        className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[40px] p-10 shadow-2xl space-y-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">{title}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Preencha as informações para monitoramento do procedimento.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
            <CircleOff size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Descrição do Procedimento</label>
            <input 
              type="text" 
              placeholder="Ex: Auditoria Semanal de Diárias"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 focus:border-neutral-900 dark:focus:border-white outline-none transition-all dark:text-neutral-100"
              value={formData.task}
              onChange={e => setFormData({...formData, task: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Secretaria / Setor</label>
            <select 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all appearance-none dark:text-neutral-100"
              value={formData.department}
              onChange={e => setFormData({...formData, department: e.target.value})}
            >
              <option value="">Selecione...</option>
              <option value="RH">Recursos Humanos</option>
              <option value="Saúde">Saúde</option>
              <option value="Obras">Obras</option>
              <option value="Transportes">Transportes</option>
              <option value="Administração">Administração</option>
              <option value="Contabilidade">Contabilidade</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Prazo Limite</label>
            <input 
              type="date" 
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all dark:text-neutral-100"
              value={formData.deadline}
              onChange={e => setFormData({...formData, deadline: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Prioridade / Status</label>
            <div className="flex gap-2">
              {(['pending', 'urgent', 'completed'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFormData({...formData, status: s})}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    formData.status === s 
                      ? (s === 'urgent' ? 'bg-rose-900 dark:bg-rose-700 text-white' : s === 'completed' ? 'bg-emerald-900 dark:bg-emerald-700 text-white' : 'bg-neutral-900 dark:bg-white dark:text-neutral-950 text-white')
                      : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {s === 'pending' ? 'Pendente' : s === 'urgent' ? 'Urgente' : 'Concluído'}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500 ml-1">Observações Internas (Opcional)</label>
            <textarea 
              rows={3}
              placeholder="Notas adicionais sobre o procedimento..."
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-6 py-4 rounded-2xl text-sm focus:ring-4 focus:ring-neutral-900/5 dark:focus:ring-white/5 outline-none transition-all resize-none dark:text-neutral-100"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-4">
          <button 
            onClick={() => onAdd(formData)}
            disabled={!formData.task || !formData.department}
            className="flex-1 bg-neutral-900 dark:bg-white text-emerald-400 dark:text-emerald-600 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-xl shadow-neutral-900/20 dark:shadow-black/40"
          >
            {initialData ? 'Atualizar Controle' : 'Cadastrar Controle'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


const AttachmentModal = ({ title, onClose, onConfirm }: { title: string, onClose: () => void, onConfirm: () => void }) => (
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
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-neutral-50 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-neutral-100 dark:border-neutral-700">
          <FileText size={32} className="text-neutral-400 dark:text-neutral-500" />
        </div>
        <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100">Anexar Documento</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{title}</p>
      </div>

      <div className="border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-3xl p-12 text-center space-y-4 hover:border-neutral-900/20 dark:hover:border-white/20 transition-colors cursor-pointer group">
        <div className="w-12 h-12 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
          <Download size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Clique ou arraste o arquivo</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">PDF, DOCX ou ZIP (Máx. 20MB)</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={onConfirm}
          className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all shadow-xl shadow-neutral-900/20 dark:shadow-black/40"
        >
          Confirmar Envio
        </button>
        <button 
          onClick={onClose}
          className="px-8 py-5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-[24px] font-bold text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
        >
          Cancelar
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const HistoryModal = ({ item, onClose }: { item: CheckItem, onClose: () => void }) => (
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
      className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[40px] p-10 shadow-2xl space-y-8 max-h-[85vh] flex flex-col"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History size={20} className="text-sky-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-500">Log de Alterações</span>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight">{item.task}</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">{item.department}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
          <CircleOff size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
        {item.history && item.history.length > 0 ? (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-neutral-100 dark:before:bg-neutral-800">
            {item.history.map((entry, idx) => (
              <div key={entry.id} className="relative flex items-start gap-6 group">
                <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all shadow-sm z-10 ${
                  idx === 0 ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950' : 'bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 text-neutral-400 dark:text-neutral-500'
                }`}>
                  <History size={16} />
                </div>
                <div className="flex-1 space-y-1 pt-1">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-sm font-black text-neutral-900 dark:text-neutral-100">{entry.action}</span>
                      <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-mono bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded">{entry.date}</span>
                   </div>
                   <p className="text-emerald-700 dark:text-emerald-400 text-xs font-bold italic mb-1">{entry.user}</p>
                   <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700">
                     {entry.changes}
                   </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-12 bg-neutral-50 dark:bg-neutral-800/50 rounded-[32px] border border-dashed border-neutral-200 dark:border-neutral-700">
            <History size={48} className="text-neutral-200 dark:text-neutral-700 mb-4" />
            <h4 className="text-lg font-bold text-neutral-400 dark:text-neutral-500">Sem Histórico Registrado</h4>
            <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-2 max-w-[240px]">Ainda não há registros de alterações manuais registradas para este controle.</p>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button 
          onClick={onClose}
          className="w-full py-5 bg-neutral-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-xs hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-900/20"
        >
          Fechar Histórico
        </button>
      </div>
    </motion.div>
  </motion.div>
);

const ChangePasswordModal = ({ forceChange, onClose, onSuccess }: { forceChange: boolean, onClose: () => void, onSuccess: () => void | Promise<void> }) => {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    
    let authError = null;
    try {
      const { error } = await supabase.auth.updateUser({ password });
      authError = error;
    } catch (err: any) {
      authError = { message: err.message || 'Erro inesperado ao atualizar a senha.' };
    }
    
    if (authError) {
      setError('Erro ao atualizar senha: ' + authError.message);
      setLoading(false);
    } else {
      showToast('Senha atualizada com sucesso!', 'success');
      try {
        await onSuccess();
      } catch (err) {
        console.error('Erro no onSuccess do ChangePasswordModal:', err);
      }
      setLoading(false);
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
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-2xl text-[13px] font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">Nova Senha</label>
            <input 
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 px-5 py-3.5 rounded-2xl text-sm focus:ring-4 focus:ring-sky-500/10 outline-none transition-all dark:text-white"
            />
            <p className="text-[10px] font-bold text-neutral-400 ml-1">A senha deve conter no mínimo 6 caracteres.</p>
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

// --- Protocol Module ---

