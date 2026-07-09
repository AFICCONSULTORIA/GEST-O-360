import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Users, Car, Box, UserCheck, Calendar, FileText, 
  CheckCircle2, XCircle, Clock, AlertTriangle, Plus, Search, 
  ChevronRight, Fuel, ShieldAlert, BadgeInfo, Pencil, Trash2 
} from 'lucide-react';
import { showToast } from '../../components/ui/Toast';

// --- TYPES ---
export interface EmployeeRequest {
  id: string;
  name: string;
  role: string;
  type: 'Férias' | 'Licença Prêmio' | 'Licença Médica';
  period: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
}

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  role: string;
  department: string;
  status: 'Ativo' | 'Afastado' | 'Férias';
  agencia?: string;
  conta?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  driver: string;
  status: 'Disponível' | 'Em Rota' | 'Manutenção';
  fuelLevel: string;
  licensingExpiry: string;
  licensingStatus: 'Regular' | 'A vencer' | 'Vencido';
}

export interface SupplyItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minQuantity: number;
  unit: string;
}
const formatSafeDate = (dateString?: string) => {
  if (!dateString) return '--/--/----';
  const d = new Date(dateString + 'T12:00:00');
  return isNaN(d.getTime()) ? '--/--/----' : d.toLocaleDateString('pt-BR');
};

const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2')
    .replace(/(\d{4})(\d{4})$/, '$1-$2');
};

// --- GLOBAL MOCKS FOR PERSISTENCE ---
const MOCK_REQUESTS: EmployeeRequest[] = [
  { id: 'req_1', name: 'Ana Souza', role: 'Assistente Administrativo', type: 'Férias', period: '01/08/2026 a 30/08/2026', status: 'Pendente' },
  { id: 'req_2', name: 'Carlos Lima', role: 'Motorista', type: 'Licença Prêmio', period: '15/09/2026 a 15/12/2026', status: 'Pendente' },
  { id: 'req_3', name: 'Juliana Costa', role: 'Analista de RH', type: 'Férias', period: '10/07/2026 a 24/07/2026', status: 'Aprovado' },
  { id: 'req_4', name: 'Marcos Oliveira', role: 'Auxiliar de Serviços Gerais', type: 'Licença Médica', period: '05/07/2026 a 12/07/2026', status: 'Aprovado' },
];

const MOCK_EMPLOYEES: Employee[] = [
  { id: 'emp_1', name: 'Ana Souza', cpf: '123.456.789-00', phone: '(11) 98765-4321', role: 'Assistente Administrativo', department: 'Gabinete', status: 'Ativo', agencia: '0001', conta: '12345-6' },
  { id: 'emp_2', name: 'Carlos Lima', cpf: '987.654.321-11', phone: '(11) 91234-5678', role: 'Motorista', department: 'Frota', status: 'Férias', agencia: '0001', conta: '98765-4' },
];

const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v_1', model: 'Chevrolet Spin (Gabinete)', plate: 'QWA-3A45', driver: 'Antônio Santos', status: 'Em Rota', fuelLevel: '80%', licensingExpiry: '2026-11-30', licensingStatus: 'Regular' },
  { id: 'v_2', model: 'Toyota Hilux (Obras)', plate: 'RTY-9F12', driver: 'Carlos Lima', status: 'Disponível', fuelLevel: '45%', licensingExpiry: '2026-07-28', licensingStatus: 'A vencer' },
  { id: 'v_3', model: 'Fiat Cronos (Saúde)', plate: 'FGH-2B88', driver: 'Mariana Lima', status: 'Manutenção', fuelLevel: '10%', licensingExpiry: '2026-05-15', licensingStatus: 'Vencido' },
  { id: 'v_4', model: 'Renault Master (Ambulância)', plate: 'AMB-0I99', driver: 'Pedro Silva', status: 'Disponível', fuelLevel: '95%', licensingExpiry: '2027-02-28', licensingStatus: 'Regular' },
];

const MOCK_SUPPLIES: SupplyItem[] = [
  { id: 's_1', name: 'Papel A4 Branco', category: 'Expediente', quantity: 15, minQuantity: 10, unit: 'Resmas' },
  { id: 's_2', name: 'Toner Impressora HP', category: 'Informática', quantity: 2, minQuantity: 5, unit: 'Unidades' },
  { id: 's_3', name: 'Pasta Suspensa AZ', category: 'Organização', quantity: 45, minQuantity: 20, unit: 'Unidades' },
  { id: 's_4', name: 'Caneta Esferográfica Azul', category: 'Escritório', quantity: 120, minQuantity: 50, unit: 'Unidades' },
  { id: 's_5', name: 'Álcool Gel 70%', category: 'Higiene', quantity: 4, minQuantity: 10, unit: 'Frascos' },
];

export const AdministracaoModule = () => {
  const [activeTab, setActiveTab] = useState<'rh' | 'frota' | 'almoxarifado'>('rh');
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({ status: 'Ativo' });
  const [requests, setRequests] = useState<EmployeeRequest[]>(MOCK_REQUESTS);
  const [isAddRequestOpen, setIsAddRequestOpen] = useState(false);
  const [newRequest, setNewRequest] = useState<Partial<EmployeeRequest>>({ type: 'Férias', status: 'Pendente' });
  const [vehicles, setVehicles] = useState<Vehicle[]>(MOCK_VEHICLES);
  const [supplies, setSupplies] = useState<SupplyItem[]>(MOCK_SUPPLIES);

  const [isAddSupplyOpen, setIsAddSupplyOpen] = useState(false);
  const [newSupply, setNewSupply] = useState<Partial<SupplyItem>>({ unit: 'Unidades', quantity: 0, minQuantity: 0 });
  const [isEditSupplyOpen, setIsEditSupplyOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<SupplyItem | null>(null);

  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({ status: 'Disponível', licensingStatus: 'Regular' });

  // RH Actions
  const handleRequestStatus = (id: string, status: 'Aprovado' | 'Rejeitado') => {
    const updated = requests.map(r => r.id === id ? { ...r, status } : r);
    // Persist globally
    MOCK_REQUESTS.length = 0;
    MOCK_REQUESTS.push(...updated);
    setRequests(updated);
    showToast(`Solicitação ${status === 'Aprovado' ? 'aprovada' : 'rejeitada'} com sucesso!`, status === 'Aprovado' ? 'success' : 'info');
  };

  // Frota Actions
  const handleToggleVehicleStatus = (id: string, newStatus: 'Disponível' | 'Em Rota' | 'Manutenção') => {
    const updated = vehicles.map(v => v.id === id ? { ...v, status: newStatus } : v);
    // Persist globally
    MOCK_VEHICLES.length = 0;
    MOCK_VEHICLES.push(...updated);
    setVehicles(updated);
    showToast(`Status do veículo atualizado para: ${newStatus}`, 'success');
  };

  const handleRenewLicensing = (id: string) => {
    const updated = vehicles.map(v => {
      if (v.id === id) {
        const nextYear = new Date(v.licensingExpiry);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        const nextYearStr = nextYear.toISOString().split('T')[0];
        return {
          ...v,
          licensingExpiry: nextYearStr,
          licensingStatus: 'Regular' as const
        };
      }
      return v;
    });
    MOCK_VEHICLES.length = 0;
    MOCK_VEHICLES.push(...updated);
    setVehicles(updated);
    showToast('Licenciamento renovado com sucesso (prorrogado por 1 ano)!', 'success');
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.model || !newVehicle.plate) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    const vehicle: Vehicle = {
      id: `v_${Date.now()}`,
      model: newVehicle.model,
      plate: newVehicle.plate,
      driver: newVehicle.driver || 'Não atribuído',
      status: (newVehicle.status as any) || 'Disponível',
      fuelLevel: newVehicle.fuelLevel || '100%',
      licensingExpiry: newVehicle.licensingExpiry || '',
      licensingStatus: (newVehicle.licensingStatus as any) || 'Regular',
    };
    const updated = [...vehicles, vehicle];
    MOCK_VEHICLES.length = 0;
    MOCK_VEHICLES.push(...updated);
    setVehicles(updated);
    setIsAddVehicleOpen(false);
    setNewVehicle({ status: 'Disponível', licensingStatus: 'Regular' });
    showToast('Veículo cadastrado com sucesso!', 'success');
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.cpf || !newEmployee.role) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    const emp: Employee = {
      id: `emp_${Date.now()}`,
      name: newEmployee.name,
      cpf: newEmployee.cpf,
      phone: newEmployee.phone || '',
      role: newEmployee.role,
      department: newEmployee.department || 'Geral',
      status: (newEmployee.status as any) || 'Ativo',
    };
    const updated = [...employees, emp];
    MOCK_EMPLOYEES.length = 0;
    MOCK_EMPLOYEES.push(...updated);
    setEmployees(updated);
    setIsAddEmployeeOpen(false);
    setNewEmployee({ status: 'Ativo' });
    showToast('Servidor cadastrado com sucesso!', 'success');
  };

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.name || !newRequest.role || !newRequest.period) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    const req: EmployeeRequest = {
      id: `req_${Date.now()}`,
      name: newRequest.name,
      role: newRequest.role,
      type: (newRequest.type as any) || 'Férias',
      period: newRequest.period,
      status: 'Pendente',
    };
    const updated = [...requests, req];
    MOCK_REQUESTS.length = 0;
    MOCK_REQUESTS.push(...updated);
    setRequests(updated);
    setIsAddRequestOpen(false);
    setNewRequest({ type: 'Férias', status: 'Pendente' });
    showToast('Solicitação cadastrada com sucesso!', 'success');
  };

  // Almoxarifado Actions
  const handleAddSupply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupply.name || !newSupply.category) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    const supply: SupplyItem = {
      id: `s_${Date.now()}`,
      name: newSupply.name,
      category: newSupply.category,
      quantity: Number(newSupply.quantity) || 0,
      minQuantity: Number(newSupply.minQuantity) || 0,
      unit: newSupply.unit || 'Unidades',
    };
    const updated = [...supplies, supply];
    MOCK_SUPPLIES.length = 0;
    MOCK_SUPPLIES.push(...updated);
    setSupplies(updated);
    setIsAddSupplyOpen(false);
    setNewSupply({ unit: 'Unidades', quantity: 0, minQuantity: 0 });
    showToast('Insumo cadastrado com sucesso!', 'success');
  };

  const handleEditSupplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupply || !editingSupply.name || !editingSupply.category) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }
    const updated = supplies.map(s => s.id === editingSupply.id ? editingSupply : s);
    MOCK_SUPPLIES.length = 0;
    MOCK_SUPPLIES.push(...updated);
    setSupplies(updated);
    setIsEditSupplyOpen(false);
    setEditingSupply(null);
    showToast('Insumo atualizado com sucesso!', 'success');
  };

  const handleDeleteSupply = (id: string) => {
    if (confirm('Tem certeza que deseja remover este insumo?')) {
      const updated = supplies.filter(s => s.id !== id);
      MOCK_SUPPLIES.length = 0;
      MOCK_SUPPLIES.push(...updated);
      setSupplies(updated);
      showToast('Insumo removido com sucesso!', 'success');
    }
  };

  const handleRestockSupply = (id: string, amount: number) => {
    const item = supplies.find(s => s.id === id);
    if (!item) return;
    const updated = supplies.map(s => s.id === id ? { ...s, quantity: s.quantity + amount } : s);
    MOCK_SUPPLIES.length = 0;
    MOCK_SUPPLIES.push(...updated);
    setSupplies(updated);
    showToast(`Estoque de ${item.name} reabastecido com sucesso! (+${amount})`, 'success');
  };

  const handleRequisition = (id: string) => {
    const item = supplies.find(s => s.id === id);
    if (!item) return;
    if (item.quantity <= 0) {
      showToast('Estoque esgotado para este item!', 'error');
      return;
    }
    const updated = supplies.map(s => s.id === id ? { ...s, quantity: s.quantity - 1 } : s);
    // Persist globally
    MOCK_SUPPLIES.length = 0;
    MOCK_SUPPLIES.push(...updated);
    setSupplies(updated);
    showToast(`1 ${item.unit} de ${item.name} requisitada com sucesso!`, 'success');
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 font-['Inter']">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#003B6F] dark:text-white tracking-tight flex items-center gap-3 font-['Montserrat']">
            <Briefcase className="text-[#003B6F] dark:text-white" size={32} />
            Secretaria de Administração
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-2">
            Gestão de Recursos Humanos, Controle de Frota e Almoxarifado Central.
          </p>
        </div>
      </div>

      {/* CARDS DE MONITORAMENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Recursos Humanos */}
        <div className="bg-white dark:bg-[#171717] border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Users size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Recursos Humanos</h3>
            </div>
          </div>
          <div>
            <h4 className="text-3xl font-black text-neutral-900 dark:text-white font-['Montserrat']">342 Servidores</h4>
            <p className="text-xs text-neutral-500 mt-1">Folha mensal estimada: R$ 1.250.000,00</p>
          </div>
        </div>

        {/* Card 2: Frota */}
        <div className="bg-white dark:bg-[#171717] border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Car size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Controle de Frota</h3>
            </div>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
              1 em Manutenção
            </span>
          </div>
          <div>
            <h4 className="text-3xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
              {vehicles.filter(v => v.status === 'Disponível').length} / {vehicles.length} disp.
            </h4>
            <p className="text-xs text-neutral-500 mt-1">Veículos em rota ativa no momento: {vehicles.filter(v => v.status === 'Em Rota').length}</p>
          </div>
        </div>

        {/* Card 3: Almoxarifado */}
        <div className="bg-white dark:bg-[#171717] border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Box size={18} />
              <h3 className="text-sm font-bold uppercase tracking-widest">Almoxarifado</h3>
            </div>
            {supplies.some(s => s.quantity <= s.minQuantity) && (
              <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <AlertTriangle size={12} /> Reposição Necessária
              </span>
            )}
          </div>
          <div>
            <h4 className="text-3xl font-black text-neutral-900 dark:text-white font-['Montserrat']">
              {supplies.filter(s => s.quantity <= s.minQuantity).length} Itens em Alerta
            </h4>
            <p className="text-xs text-neutral-500 mt-1">Total de insumos ativos cadastrados: {supplies.length}</p>
          </div>
        </div>
      </div>

      {/* ÁREA CENTRAL - SISTEMA DE ABAS */}
      <div className="bg-white dark:bg-[#171717] rounded-[32px] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="flex border-b border-neutral-100 dark:border-neutral-800 p-2 gap-2 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('rh')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'rh'
                ? 'bg-white dark:bg-[#171717] text-[#003B6F] dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Aba de Recursos Humanos"
          >
            <UserCheck size={18} /> Recursos Humanos & Servidor
          </button>
          <button
            onClick={() => setActiveTab('frota')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'frota'
                ? 'bg-white dark:bg-[#171717] text-[#003B6F] dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Aba de Gestão de Frota"
          >
            <Car size={18} /> Gestão de Frota
          </button>
          <button
            onClick={() => setActiveTab('almoxarifado')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'almoxarifado'
                ? 'bg-white dark:bg-[#171717] text-[#003B6F] dark:text-white shadow-sm border border-neutral-100 dark:border-neutral-800'
                : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            aria-label="Aba do Almoxarifado"
          >
            <Box size={18} /> Almoxarifado & Insumos
          </button>
        </div>

        <div className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {/* ABA RH: SOLICITAÇÕES DE FÉRIAS E LICENÇAS */}
            {activeTab === 'rh' && (
              <motion.div
                key="rh"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-[#003B6F] dark:text-white">Gerenciamento de Servidores</h3>
                  <button
                    onClick={() => setIsAddEmployeeOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00A86B] text-white rounded-xl font-bold hover:bg-[#008f5b] transition-colors shadow-sm"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Adicionar Servidor</span>
                  </button>
                </div>
                
                <div className="overflow-x-auto mb-8 border border-neutral-100 dark:border-neutral-800 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-black uppercase tracking-widest text-neutral-400 bg-neutral-50 dark:bg-neutral-900/50">
                        <th className="py-4 px-4">Nome do Servidor</th>
                        <th className="py-4 px-4">CPF</th>
                        <th className="py-4 px-4">Cargo / Setor</th>
                        <th className="py-4 px-4">Contato</th>
                        <th className="py-4 px-4">Dados Bancários</th>
                        <th className="py-4 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors">
                          <td className="py-4 px-4 font-bold text-neutral-900 dark:text-white">{emp.name}</td>
                          <td className="py-4 px-4 text-neutral-600 dark:text-neutral-300 font-mono text-sm">{emp.cpf}</td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">{emp.role}</p>
                            <p className="text-xs text-neutral-500">{emp.department}</p>
                          </td>
                          <td className="py-4 px-4 text-neutral-600 dark:text-neutral-300 text-sm">{emp.phone || '-'}</td>
                          <td className="py-4 px-4">
                            <p className="text-sm font-bold text-neutral-900 dark:text-white">Ag: {emp.agencia || '-'}</p>
                            <p className="text-xs text-neutral-500">C/C: {emp.conta || '-'}</p>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border inline-block ${
                              emp.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-[#00A86B]/20 dark:bg-[#00A86B]/10 dark:text-[#00A86B]' :
                              emp.status === 'Férias' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400' :
                              'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-450'
                            }`}>
                              {emp.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-12">
                  <h3 className="text-xl font-black text-[#003B6F] dark:text-white">Solicitações de Férias e Licenças</h3>
                  <button
                    onClick={() => setIsAddRequestOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00A86B] text-white rounded-xl font-bold hover:bg-[#008f5b] transition-colors shadow-sm"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Nova Solicitação</span>
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-black uppercase tracking-widest text-neutral-400">
                        <th className="py-4">Servidor</th>
                        <th className="py-4">Cargo</th>
                        <th className="py-4">Tipo</th>
                        <th className="py-4">Período</th>
                        <th className="py-4">Status</th>
                        <th className="py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req) => (
                        <tr key={req.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors">
                          <td className="py-4 font-bold text-neutral-900 dark:text-white">{req.name}</td>
                          <td className="py-4 text-neutral-600 dark:text-neutral-300 text-sm">{req.role}</td>
                          <td className="py-4">
                            <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs font-semibold text-neutral-700 dark:text-neutral-100">
                              {req.type}
                            </span>
                          </td>
                          <td className="py-4 text-neutral-500 text-xs">{req.period}</td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border inline-block ${
                              req.status === 'Pendente' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400' :
                              req.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-600 border-[#00A86B]/20 dark:bg-[#00A86B]/10 dark:text-[#00A86B]' :
                              'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-450'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            {req.status === 'Pendente' ? (
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => handleRequestStatus(req.id, 'Aprovado')}
                                  className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-[#00A86B]/20 text-[#00A86B] rounded-xl transition-colors"
                                  aria-label={`Aprovar solicitação de ${req.name}`}
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button 
                                  onClick={() => handleRequestStatus(req.id, 'Rejeitado')}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 rounded-xl transition-colors"
                                  aria-label={`Rejeitar solicitação de ${req.name}`}
                                >
                                  <XCircle size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-neutral-400 italic">Processado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ABA FROTA: VEÍCULOS E MUDANÇA DE STATUS */}
            {activeTab === 'frota' && (
              <motion.div
                key="frota"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-[#003B6F] dark:text-white">Gerenciamento de Frota</h3>
                  <button
                    onClick={() => setIsAddVehicleOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00A86B] text-white rounded-xl font-bold hover:bg-[#008f5b] transition-colors shadow-sm"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Adicionar Veículo</span>
                  </button>
                </div>

                {/* Painel Separado de Alertas de Licenciamento */}
                {vehicles.some(v => v.licensingStatus !== 'Regular') && (
                  <div className="bg-rose-500/10 border border-rose-500/20 dark:bg-rose-900/10 dark:border-rose-900/20 rounded-2xl p-6 space-y-4">
                    <h4 className="text-sm font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2">
                      <ShieldAlert size={18} /> Alertas de Licenciamento Pendentes
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vehicles.filter(v => v.licensingStatus !== 'Regular').map(v => (
                        <div key={v.id} className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-4">
                          <div>
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border inline-block mb-1 ${
                              v.licensingStatus === 'A vencer' 
                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-455' 
                                : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 animate-pulse'
                            }`}>
                              {v.licensingStatus === 'A vencer' ? 'Vence em Breve' : 'Licenciamento Vencido'}
                            </span>
                            <h5 className="font-bold text-neutral-900 dark:text-white text-sm">{v.model}</h5>
                            <p className="text-xs text-neutral-500">Placa: {v.plate} · Vence em: {formatSafeDate(v.licensingExpiry)}</p>
                          </div>
                          <button
                            onClick={() => handleRenewLicensing(v.id)}
                            className="px-4 py-2 bg-[#003B6F] dark:bg-white text-white dark:text-neutral-950 rounded-xl text-xs font-bold hover:bg-[#002d55] dark:hover:bg-neutral-100 transition-colors shadow-sm whitespace-nowrap"
                          >
                            Regularizar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {vehicles.map((v) => (
                    <div key={v.id} className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800/80 rounded-2xl p-6 space-y-4 hover:shadow-md transition-shadow relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            <Car size={16} className="text-neutral-400" />
                            {v.model}
                          </h4>
                          <p className="text-xs text-neutral-500 mt-1">Placa: {v.plate} · Motorista: {v.driver}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border inline-block ${
                          v.status === 'Disponível' ? 'bg-emerald-50 text-emerald-600 border-[#00A86B]/20 dark:bg-[#00A86B]/10 dark:text-[#00A86B]' :
                          v.status === 'Em Rota' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400' :
                          'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-450'
                        }`}>
                          {v.status}
                        </span>
                      </div>

                      {/* Controle de Licenciamento Simplificado */}
                      <div className="flex justify-between items-center text-xs bg-white dark:bg-neutral-900/30 p-3 rounded-xl border border-neutral-150 dark:border-neutral-800/40">
                        <span className="text-neutral-500 flex items-center gap-1.5">
                          <Calendar size={13} /> Licenc.: <strong className="text-neutral-900 dark:text-white">{formatSafeDate(v.licensingExpiry)}</strong>
                        </span>
                        <span className={`font-black uppercase text-[9px] px-2 py-0.5 rounded border ${
                          v.licensingStatus === 'Regular' ? 'bg-emerald-50 text-[#00A86B] border-[#00A86B]/20 dark:bg-[#00A86B]/10' :
                          v.licensingStatus === 'A vencer' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400' :
                          'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-455 animate-pulse'
                        }`}>
                          {v.licensingStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs border-t border-neutral-150 dark:border-neutral-700/50 pt-4">
                        <div className="flex items-center gap-1.5 text-neutral-500">
                          <Fuel size={14} /> Combustível: <strong className="text-neutral-800 dark:text-white">{v.fuelLevel}</strong>
                        </div>
                        <div className="flex gap-2">
                          {v.status !== 'Disponível' && (
                            <button 
                              onClick={() => handleToggleVehicleStatus(v.id, 'Disponível')}
                              className="px-3 py-1.5 bg-emerald-50 dark:bg-[#00A86B]/10 text-[#00A86B] rounded-lg font-bold hover:bg-emerald-100 transition-colors"
                              aria-label="Liberar Veículo"
                            >
                              Liberar
                            </button>
                          )}
                          {v.status !== 'Em Rota' && (
                            <button 
                              onClick={() => handleToggleVehicleStatus(v.id, 'Em Rota')}
                              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                              aria-label="Colocar Veículo em Rota"
                            >
                              Em Rota
                            </button>
                          )}
                          {v.status !== 'Manutenção' && (
                            <button 
                              onClick={() => handleToggleVehicleStatus(v.id, 'Manutenção')}
                              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-lg font-bold hover:bg-amber-100 transition-colors"
                              aria-label="Enviar Veículo para Manutenção"
                            >
                              Manutenção
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ABA ALMOXARIFADO: NÍVEIS E REQUISITAR */}
            {activeTab === 'almoxarifado' && (
              <motion.div
                key="almoxarifado"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-[#003B6F] dark:text-white">Almoxarifado & Insumos</h3>
                  <button
                    onClick={() => setIsAddSupplyOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00A86B] text-white rounded-xl font-bold hover:bg-[#008f5b] transition-colors shadow-sm"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Adicionar Insumo</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-black uppercase tracking-widest text-neutral-400">
                        <th className="py-4">Item</th>
                        <th className="py-4">Categoria</th>
                        <th className="py-4">Qtd. Atual</th>
                        <th className="py-4">Mín. Exigido</th>
                        <th className="py-4">Status</th>
                        <th className="py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplies.map((item) => {
                        const isCritical = item.quantity <= item.minQuantity;
                        return (
                          <tr key={item.id} className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/20 transition-colors">
                            <td className="py-4 font-bold text-neutral-900 dark:text-white">{item.name}</td>
                            <td className="py-4 text-neutral-600 dark:text-neutral-300 text-sm">{item.category}</td>
                            <td className="py-4 font-mono font-bold text-sm text-neutral-900 dark:text-white">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-4 text-neutral-500 font-mono text-xs">{item.minQuantity} {item.unit}</td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border inline-block w-fit ${
                                  isCritical 
                                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400' 
                                    : 'bg-emerald-50 text-emerald-600 border-[#00A86B]/20 dark:bg-[#00A86B]/10 dark:text-[#00A86B]'
                                }`}>
                                  {isCritical ? 'Crítico' : 'Normal'}
                                </span>
                                <div className="w-24 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className={`h-full ${isCritical ? 'bg-rose-500' : 'bg-[#00A86B]'}`}
                                    style={{ width: `${Math.min((item.quantity / Math.max(item.minQuantity * 2, 1)) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingSupply(item);
                                    setIsEditSupplyOpen(true);
                                  }}
                                  className="p-1.5 text-neutral-400 hover:text-[#003B6F] dark:hover:text-white transition-colors"
                                  aria-label={`Editar ${item.name}`}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSupply(item.id)}
                                  className="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors"
                                  aria-label={`Excluir ${item.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                                <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1"></div>
                                <button
                                  onClick={() => handleRestockSupply(item.id, 10)}
                                  className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                                  aria-label={`Repor 10 itens de ${item.name}`}
                                >
                                  +10
                                </button>
                                <button
                                  onClick={() => handleRequisition(item.id)}
                                  disabled={item.quantity <= 0}
                                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                                  aria-label={`Requisitar 1 item de ${item.name}`}
                                >
                                  -1
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Modal Adicionar Veículo */}
      <AnimatePresence>
        {isAddVehicleOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#171717] w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-[#003B6F] dark:text-white font-['Montserrat']">Adicionar Novo Veículo</h3>
                <button onClick={() => setIsAddVehicleOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddVehicle} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Modelo</label>
                  <input required type="text" value={newVehicle.model || ''} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: Chevrolet Spin" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Placa</label>
                    <input required type="text" value={newVehicle.plate || ''} onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all uppercase" placeholder="ABC-1234" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Vencimento Lic.</label>
                    <input required type="date" value={newVehicle.licensingExpiry || ''} onChange={e => setNewVehicle({...newVehicle, licensingExpiry: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Motorista</label>
                  <input type="text" value={newVehicle.driver || ''} onChange={e => setNewVehicle({...newVehicle, driver: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Nome do motorista (opcional)" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddVehicleOpen(false)} className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#00A86B] text-white font-bold hover:bg-[#008f5b] transition-colors shadow-sm">
                    Salvar Veículo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Adicionar Servidor */}
      <AnimatePresence>
        {isAddEmployeeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#171717] w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-[#003B6F] dark:text-white font-['Montserrat']">Adicionar Servidor</h3>
                <button onClick={() => setIsAddEmployeeOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Nome Completo</label>
                  <input required type="text" value={newEmployee.name || ''} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: João da Silva" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">CPF</label>
                    <input required type="text" value={newEmployee.cpf || ''} onChange={e => setNewEmployee({...newEmployee, cpf: formatCPF(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="000.000.000-00" maxLength={14} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Telefone</label>
                    <input type="text" value={newEmployee.phone || ''} onChange={e => setNewEmployee({...newEmployee, phone: formatPhone(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="(00) 00000-0000" maxLength={15} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Cargo</label>
                    <input required type="text" value={newEmployee.role || ''} onChange={e => setNewEmployee({...newEmployee, role: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: Analista" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Setor</label>
                    <input type="text" value={newEmployee.department || ''} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: RH" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Agência</label>
                    <input type="text" value={newEmployee.agencia || ''} onChange={e => setNewEmployee({...newEmployee, agencia: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: 0001" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Conta Corrente</label>
                    <input type="text" value={newEmployee.conta || ''} onChange={e => setNewEmployee({...newEmployee, conta: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: 12345-6" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddEmployeeOpen(false)} className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#00A86B] text-white font-bold hover:bg-[#008f5b] transition-colors shadow-sm">
                    Salvar Servidor
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Adicionar Solicitação */}
      <AnimatePresence>
        {isAddRequestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#171717] w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-[#003B6F] dark:text-white font-['Montserrat']">Nova Solicitação</h3>
                <button onClick={() => setIsAddRequestOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddRequest} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Nome do Servidor</label>
                  <input required type="text" value={newRequest.name || ''} onChange={e => setNewRequest({...newRequest, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: João da Silva" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Cargo</label>
                  <input required type="text" value={newRequest.role || ''} onChange={e => setNewRequest({...newRequest, role: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: Analista" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Tipo</label>
                    <select required value={newRequest.type || 'Férias'} onChange={e => setNewRequest({...newRequest, type: e.target.value as any})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all appearance-none cursor-pointer">
                      <option value="Férias" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Férias</option>
                      <option value="Licença Prêmio" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Licença Prêmio</option>
                      <option value="Licença Médica" className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">Licença Médica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Período</label>
                    <input required type="text" value={newRequest.period || ''} onChange={e => setNewRequest({...newRequest, period: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: 01/08 a 30/08" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddRequestOpen(false)} className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#00A86B] text-white font-bold hover:bg-[#008f5b] transition-colors shadow-sm">
                    Salvar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal Adicionar Insumo */}
      <AnimatePresence>
        {isAddSupplyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#171717] w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-[#003B6F] dark:text-white font-['Montserrat']">Adicionar Insumo</h3>
                <button onClick={() => setIsAddSupplyOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddSupply} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Nome do Item</label>
                  <input required type="text" value={newSupply.name || ''} onChange={e => setNewSupply({...newSupply, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: Papel A4" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Categoria</label>
                    <select required value={newSupply.category || ''} onChange={e => setNewSupply({...newSupply, category: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all appearance-none cursor-pointer">
                      <option value="" disabled>Selecione a categoria</option>
                      <option value="Expediente">Expediente</option>
                      <option value="Informática">Informática</option>
                      <option value="Organização">Organização</option>
                      <option value="Escritório">Escritório</option>
                      <option value="Higiene">Higiene</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Copa e Cozinha">Copa e Cozinha</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Unidade de Medida</label>
                    <select required value={newSupply.unit || ''} onChange={e => setNewSupply({...newSupply, unit: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all appearance-none cursor-pointer">
                      <option value="" disabled>Selecione a unidade</option>
                      <option value="Unidades">Unidades</option>
                      <option value="Caixas">Caixas</option>
                      <option value="Resmas">Resmas</option>
                      <option value="Frascos">Frascos</option>
                      <option value="Pacotes">Pacotes</option>
                      <option value="Litros">Litros</option>
                      <option value="Galões">Galões</option>
                      <option value="Rolos">Rolos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Qtd. Inicial</label>
                    <input required type="number" min="0" value={newSupply.quantity || 0} onChange={e => setNewSupply({...newSupply, quantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Qtd. Mínima (Alerta)</label>
                    <input required type="number" min="0" value={newSupply.minQuantity || 0} onChange={e => setNewSupply({...newSupply, minQuantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsAddSupplyOpen(false)} className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#00A86B] text-white font-bold hover:bg-[#008f5b] transition-colors shadow-sm">
                    Salvar Insumo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Editar Insumo */}
      <AnimatePresence>
        {isEditSupplyOpen && editingSupply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#171717] w-full max-w-md rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xl font-black text-[#003B6F] dark:text-white font-['Montserrat']">Editar Insumo</h3>
                <button onClick={() => { setIsEditSupplyOpen(false); setEditingSupply(null); }} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleEditSupplySubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Nome do Item</label>
                  <input required type="text" value={editingSupply.name} onChange={e => setEditingSupply({...editingSupply, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" placeholder="Ex: Papel A4" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Categoria</label>
                    <select required value={editingSupply.category} onChange={e => setEditingSupply({...editingSupply, category: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all appearance-none cursor-pointer">
                      <option value="" disabled>Selecione a categoria</option>
                      <option value="Expediente">Expediente</option>
                      <option value="Informática">Informática</option>
                      <option value="Organização">Organização</option>
                      <option value="Escritório">Escritório</option>
                      <option value="Higiene">Higiene</option>
                      <option value="Limpeza">Limpeza</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Copa e Cozinha">Copa e Cozinha</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Unidade de Medida</label>
                    <select required value={editingSupply.unit} onChange={e => setEditingSupply({...editingSupply, unit: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all appearance-none cursor-pointer">
                      <option value="" disabled>Selecione a unidade</option>
                      <option value="Unidades">Unidades</option>
                      <option value="Caixas">Caixas</option>
                      <option value="Resmas">Resmas</option>
                      <option value="Frascos">Frascos</option>
                      <option value="Pacotes">Pacotes</option>
                      <option value="Litros">Litros</option>
                      <option value="Galões">Galões</option>
                      <option value="Rolos">Rolos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Qtd. Atual</label>
                    <input required type="number" min="0" value={editingSupply.quantity} onChange={e => setEditingSupply({...editingSupply, quantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">Qtd. Mínima (Alerta)</label>
                    <input required type="number" min="0" value={editingSupply.minQuantity} onChange={e => setEditingSupply({...editingSupply, minQuantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A86B]/50 transition-all" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => { setIsEditSupplyOpen(false); setEditingSupply(null); }} className="px-6 py-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#003B6F] text-white font-bold hover:bg-[#002d55] transition-colors shadow-sm">
                    Atualizar Insumo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
