import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Plus, Edit2, Trash2, 
  AlertCircle, CheckCircle, Clock, Save, X, Ticket
} from 'lucide-react';

type TicketStatus = 'Aberto' | 'Pendente' | 'Fechado';
type TicketPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  date: string;
}

const MOCK_TICKETS: SupportTicket[] = [
  { id: "#1024", subject: "Erro ao gerar boletim da Turma 8A", description: "O sistema trava ao exportar o PDF do boletim.", status: "Aberto", priority: "Alta", date: "Hoje, 10:45" },
  { id: "#0988", subject: "Dúvida sobre importação de faltas", description: "Como faço para importar via excel?", status: "Pendente", priority: "Média", date: "Ontem, 15:20" },
  { id: "#0845", subject: "Recuperação de senha de aluno", description: "O aluno joao perdeu a senha.", status: "Fechado", priority: "Baixa", date: "15/05/2026" },
];

const STATUS_COLORS: Record<TicketStatus, string> = {
  'Aberto': 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  'Pendente': 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  'Fechado': 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
};

const STATUS_ICONS: Record<TicketStatus, React.ReactNode> = {
  'Aberto': <AlertCircle size={14} />,
  'Pendente': <Clock size={14} />,
  'Fechado': <CheckCircle size={14} />
};

export const SupportTicketsManager = ({ onBack }: { onBack: () => void }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | 'Todos'>('Todos');
  
  // States for Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [formData, setFormData] = useState({ subject: '', description: '', status: 'Aberto' as TicketStatus, priority: 'Média' as TicketPriority });

  useEffect(() => {
    const saved = localStorage.getItem('gestao360_support_tickets');
    if (saved) {
      setTickets(JSON.parse(saved));
    } else {
      setTickets(MOCK_TICKETS);
      localStorage.setItem('gestao360_support_tickets', JSON.stringify(MOCK_TICKETS));
    }
  }, []);

  const saveTickets = (newTickets: SupportTicket[]) => {
    setTickets(newTickets);
    localStorage.setItem('gestao360_support_tickets', JSON.stringify(newTickets));
  };

  const handleOpenForm = (ticket?: SupportTicket) => {
    if (ticket) {
      setEditingTicket(ticket);
      setFormData({ subject: ticket.subject, description: ticket.description, status: ticket.status, priority: ticket.priority });
    } else {
      setEditingTicket(null);
      setFormData({ subject: '', description: '', status: 'Aberto', priority: 'Média' });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTicket(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      alert('Por favor, preencha o assunto e a descrição.');
      return;
    }

    if (editingTicket) {
      const updated = tickets.map(t => 
        t.id === editingTicket.id 
          ? { ...t, subject: formData.subject, description: formData.description, status: formData.status, priority: formData.priority }
          : t
      );
      saveTickets(updated);
    } else {
      const newId = `#${Math.floor(1000 + Math.random() * 9000)}`;
      const newTicket: SupportTicket = {
        id: newId,
        subject: formData.subject,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        date: new Date().toLocaleDateString('pt-BR')
      };
      saveTickets([newTicket, ...tickets]);
    }
    handleCloseForm();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir este chamado?')) {
      saveTickets(tickets.filter(t => t.id !== id));
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'Todos' || t.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (isFormOpen) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={handleCloseForm} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
              <ArrowLeft size={24} className="text-neutral-600 dark:text-neutral-400" />
            </button>
            <div>
              <h2 className="text-3xl font-black text-neutral-900 dark:text-white">
                {editingTicket ? `Editar Chamado ${editingTicket.id}` : 'Abrir Novo Chamado'}
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400">Preencha os detalhes para que nossa equipe de suporte possa ajudar.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Assunto</label>
            <input 
              type="text" 
              value={formData.subject}
              onChange={e => setFormData({...formData, subject: e.target.value})}
              placeholder="Ex: Problema ao exportar diário de classe"
              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-neutral-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-900 dark:text-white">Status</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as TicketStatus})}
                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-neutral-900 dark:text-white"
              >
                <option value="Aberto">Aberto</option>
                <option value="Pendente">Pendente</option>
                <option value="Fechado">Fechado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-neutral-900 dark:text-white">Prioridade</label>
              <select 
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as TicketPriority})}
                className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-neutral-900 dark:text-white"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-neutral-900 dark:text-white">Descrição do Problema</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Descreva o problema com o máximo de detalhes possível..."
              rows={5}
              className="w-full p-4 bg-neutral-50 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button 
              type="button"
              onClick={handleCloseForm}
              className="px-6 py-3 font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors flex items-center gap-2"
            >
              <X size={20} /> Cancelar
            </button>
            <button 
              type="submit"
              className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/20 flex items-center gap-2"
            >
              <Save size={20} /> Salvar Chamado
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header and Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-neutral-600 dark:text-neutral-400" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-neutral-900 dark:text-white">Meus Chamados</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Acompanhe o status dos seus atendimentos.</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3.5 rounded-2xl hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/20 transition-all whitespace-nowrap"
        >
          <Plus size={20} />
          Abrir Chamado
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-neutral-900 p-4 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por ID ou assunto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 text-neutral-900 dark:text-white"
          />
        </div>
        <div className="relative md:w-64">
          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as TicketStatus | 'Todos')}
            className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 text-neutral-900 dark:text-white appearance-none font-medium"
          >
            <option value="Todos">Todos os Status</option>
            <option value="Aberto">Aberto</option>
            <option value="Pendente">Pendente</option>
            <option value="Fechado">Fechado</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-20">
            <Ticket size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Nenhum chamado encontrado</h3>
            <p className="text-neutral-500">Tudo limpo por aqui.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200/50 dark:border-neutral-800/50">
                  <th className="p-4 font-semibold text-neutral-500 dark:text-neutral-400 text-sm">ID</th>
                  <th className="p-4 font-semibold text-neutral-500 dark:text-neutral-400 text-sm">Assunto</th>
                  <th className="p-4 font-semibold text-neutral-500 dark:text-neutral-400 text-sm">Prioridade</th>
                  <th className="p-4 font-semibold text-neutral-500 dark:text-neutral-400 text-sm">Status</th>
                  <th className="p-4 font-semibold text-neutral-500 dark:text-neutral-400 text-sm">Data</th>
                  <th className="p-4 font-semibold text-neutral-500 dark:text-neutral-400 text-sm text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group">
                    <td className="p-4 text-sm font-bold text-neutral-900 dark:text-white">{ticket.id}</td>
                    <td className="p-4">
                      <div className="text-sm font-bold text-neutral-900 dark:text-white mb-1">{ticket.subject}</div>
                      <div className="text-xs text-neutral-500 truncate max-w-xs">{ticket.description}</div>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                      {ticket.priority}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[ticket.status]}`}>
                        {STATUS_ICONS[ticket.status]}
                        {ticket.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-neutral-500">{ticket.date}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleOpenForm(ticket)}
                          className="p-2 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(ticket.id, e)}
                          className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
