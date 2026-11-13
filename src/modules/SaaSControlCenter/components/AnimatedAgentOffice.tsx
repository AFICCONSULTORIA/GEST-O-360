import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, ShieldAlert, ShieldCheck, HeartPulse, Truck, 
  Receipt, GraduationCap, Bot, Database, AlertTriangle, 
  CheckCircle2, Play, Pause, RefreshCw, Eye, Terminal, 
  ArrowRight, Sparkles, Activity, Cpu, Zap, Clock,
  TrendingUp, AlertOctagon, FileText, Check, Lock,
  Radio, Layers, Volume2, VolumeX, Flame, Send, MessageSquare
} from 'lucide-react';
import { 
  AgentId, 
  AgentStatus, 
  AgentWorkstationEvent, 
  AGENT_WORKSTATIONS, 
  AGENT_OFFICE_EVENT_NAME, 
  getLocalAgentOfficeEvents, 
  dispatchAgentOfficeEvent 
} from '../../../lib/agentOfficeTelemetry';
import { supabase } from '../../../lib/supabase';
import { Institution } from '../../../types';

interface AnimatedAgentOfficeProps {
  currentInstitution?: Institution | null;
  darkMode?: boolean;
}

interface CourierAnimation {
  id: string;
  from: AgentId;
  to: AgentId;
  label: string;
  progress: number; // 0 to 1
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

export const AnimatedAgentOffice: React.FC<AnimatedAgentOfficeProps> = ({
  currentInstitution,
  darkMode = true
}) => {
  const [events, setEvents] = useState<AgentWorkstationEvent[]>(() => getLocalAgentOfficeEvents());
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>('orchestrator');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAutoLoop, setIsAutoLoop] = useState(true); // Loop automático para manter o escritório sempre vivo!
  const [clockTime, setClockTime] = useState('14:30');
  const [activeCourier, setActiveCourier] = useState<CourierAnimation | null>(null);
  const [activeTab, setActiveTab] = useState<'inspector' | 'logs' | 'guardrails'>('inspector');
  const autoLoopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Relógio do escritório
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Coordenadas das Estações na Planta Isométrica Moderna (Plataforma 960x520)
  const stationCoords: Record<AgentId, { 
    x: number; 
    y: number; 
    title: string; 
    code: string; 
    color: string; 
    glow: string;
    icon: any;
    screenTheme: 'lrfgauge' | 'taxscanner' | 'fuelmeter' | 'suspulse' | 'educhart' | 'copilotchat' | 'databank';
  }> = {
    // Sala Executiva do Prefeito & Gabinete (Canto Superior Esquerdo)
    orchestrator: {
      x: 180,
      y: 130,
      title: 'Orquestrador & LRF',
      code: 'GAB-01',
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.4)',
      icon: Building2,
      screenTheme: 'lrfgauge'
    },
    // Auditoria Fiscal & Reforma Tributária (Superior Centro)
    'fiscal-agent': {
      x: 480,
      y: 110,
      title: 'Auditor Fiscal IBS/CBS',
      code: 'FIS-02',
      color: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      icon: Receipt,
      screenTheme: 'taxscanner'
    },
    // Sala do Cofre de Dados & Segurança RLS (Superior Direito)
    'security-db-agent': {
      x: 780,
      y: 130,
      title: 'Guardião RLS & LGPD',
      code: 'SEC-03',
      color: '#ec4899',
      glow: 'rgba(236, 72, 153, 0.4)',
      icon: Database,
      screenTheme: 'databank'
    },
    // Controle & Auditoria de Frotas (Inferior Esquerdo)
    'fleet-agent': {
      x: 160,
      y: 360,
      title: 'Auditoria de Frotas',
      code: 'FRO-04',
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      icon: Truck,
      screenTheme: 'fuelmeter'
    },
    // Central Copilot do Servidor Público (Centro)
    'copilot-agent': {
      x: 480,
      y: 280,
      title: 'Copilot do Servidor',
      code: 'COP-05',
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.5)',
      icon: Bot,
      screenTheme: 'copilotchat'
    },
    // Regulação da Saúde Pública & Fila SUS (Inferior Centro-Direita)
    'saude-agent': {
      x: 720,
      y: 360,
      title: 'Regulação SUS & Farmácia',
      code: 'SAU-06',
      color: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.4)',
      icon: HeartPulse,
      screenTheme: 'suspulse'
    },
    // Governança Educacional & SAEB (Inferior Esquerdo Central)
    'education-agent': {
      x: 370,
      y: 420,
      title: 'Educação & Busca Ativa',
      code: 'EDU-07',
      color: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.4)',
      icon: GraduationCap,
      screenTheme: 'educhart'
    }
  };

  // Estados dos agentes
  const agentStates = useMemo(() => {
    const states: Record<AgentId, {
      status: AgentStatus;
      bubbleText: string;
      isViolation: boolean;
      actionTag: string;
      lastEvent?: AgentWorkstationEvent;
      workload: number;
    }> = {
      orchestrator: { 
        status: 'working', 
        bubbleText: 'Supervisionando limites da LRF: Gastos com Pessoal em 49.2% (Conforme).', 
        actionTag: 'AUDITANDO LRF',
        isViolation: false,
        workload: 85
      },
      'fiscal-agent': { 
        status: 'working', 
        bubbleText: 'Validando XML de NF-e #4928: cálculo de IBS e CBS conferidos com alíquota oficial.', 
        actionTag: 'ANALISANDO NF-e',
        isViolation: false,
        workload: 92
      },
      'fleet-agent': { 
        status: 'idle', 
        bubbleText: 'Trava de combustível ativa: nenhum abastecimento com litragem > tanque detectado.', 
        actionTag: 'TANQUES BLINDADOS',
        isViolation: false,
        workload: 40
      },
      'saude-agent': { 
        status: 'idle', 
        bubbleText: 'Fila SUS cronológica auditada. Farmácia municipal operando em FEFO (validade mais curta primeiro).', 
        actionTag: 'FILA SUS AUDITADA',
        isViolation: false,
        workload: 60
      },
      'education-agent': { 
        status: 'idle', 
        bubbleText: 'Monitorando 75% de frequência LDB e fila de vagas da creche (TAC-MP).', 
        actionTag: 'FREQUÊNCIA LDB',
        isViolation: false,
        workload: 50
      },
      'copilot-agent': { 
        status: 'working', 
        bubbleText: 'Canal de atendimento aberto. Pronto para executar ordens municipais em 1 clique.', 
        actionTag: 'CENTRAL DE ATENDIMENTO',
        isViolation: false,
        workload: 75
      },
      'security-db-agent': { 
        status: 'working', 
        bubbleText: 'Cofre RLS ativo. Políticas de isolamento multi-tenant aplicadas a cada transação.', 
        actionTag: 'COFRE BLINDADO',
        isViolation: false,
        workload: 96
      }
    };

    const reversed = [...events].reverse();
    for (const ev of reversed) {
      if (states[ev.agent_id]) {
        if (ev.resolved && ev.is_violation) {
          states[ev.agent_id] = {
            status: 'idle',
            bubbleText: 'Alerta inspecionado e liberado pelo gestor.',
            actionTag: 'LIBERADO',
            isViolation: false,
            lastEvent: ev,
            workload: 45
          };
        } else {
          states[ev.agent_id] = {
            status: ev.status,
            bubbleText: ev.bubble_text,
            actionTag: ev.is_violation ? 'BLOQUEIO DE REGRA!' : ev.status === 'working' ? 'PROCESSANDO' : 'PRONTIDÃO',
            isViolation: ev.is_violation && !ev.resolved,
            lastEvent: ev,
            workload: ev.is_violation ? 100 : ev.status === 'working' ? 88 : 35
          };
        }
      }
    }

    return states;
  }, [events]);

  const activeAlertsCount = useMemo(() => {
    const list = Object.values(agentStates) as Array<{
      status: AgentStatus;
      bubbleText: string;
      isViolation: boolean;
      lastEvent?: AgentWorkstationEvent;
    }>;
    return list.filter(s => s.isViolation).length;
  }, [agentStates]);

  const selectedConfig = AGENT_WORKSTATIONS[selectedAgentId];
  const selectedStation = stationCoords[selectedAgentId];
  const selectedState = agentStates[selectedAgentId];

  // Escuta de eventos em tempo real
  useEffect(() => {
    const handleLocalEvent = (customEvent: Event) => {
      const detail = (customEvent as CustomEvent).detail as AgentWorkstationEvent;
      if (detail) {
        setEvents(prev => [detail, ...prev.filter(e => e.id !== detail.id)].slice(0, 50));
        
        if (detail.target_agent_id && detail.target_agent_id !== detail.agent_id) {
          triggerCourier(detail.agent_id, detail.target_agent_id, detail.bubble_text);
        }
      }
    };

    window.addEventListener(AGENT_OFFICE_EVENT_NAME, handleLocalEvent);

    const channel = supabase
      .channel('agent_workstation_animated_office_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'agent_workstation_events' },
        (payload) => {
          const newEvent = payload.new as AgentWorkstationEvent;
          setEvents(prev => [newEvent, ...prev.filter(e => e.id !== newEvent.id)].slice(0, 50));
          if (newEvent.target_agent_id && newEvent.target_agent_id !== newEvent.agent_id) {
            triggerCourier(newEvent.agent_id, newEvent.target_agent_id, newEvent.bubble_text);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener(AGENT_OFFICE_EVENT_NAME, handleLocalEvent);
      supabase.removeChannel(channel);
    };
  }, []);

  // Animação de cápsula de dados / estafeta digital viajando entre as mesas
  const triggerCourier = (from: AgentId, to: AgentId, label: string) => {
    const start = stationCoords[from] || { x: 480, y: 260 };
    const end = stationCoords[to] || { x: 480, y: 260 };

    const courierId = `courier-${Date.now()}`;
    const color = stationCoords[from]?.color || '#38bdf8';

    setActiveCourier({
      id: courierId,
      from,
      to,
      label,
      progress: 0,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      color
    });

    const startTime = Date.now();
    const duration = 2200; // 2.2s de percurso suave

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(1, elapsed / duration);

      setActiveCourier(prev => prev ? { ...prev, progress: p } : null);

      if (p >= 1) {
        clearInterval(interval);
        setTimeout(() => setActiveCourier(null), 300);
      }
    }, 30);
  };

  // Loop Automático de Simulação (Mantém o escritório sempre vivo e interativo)
  useEffect(() => {
    if (!isAutoLoop) {
      if (autoLoopTimerRef.current) clearInterval(autoLoopTimerRef.current);
      return;
    }

    const scenarios = [
      () => runSimulation('nfe_scan'),
      () => runSimulation('fuel_check'),
      () => runSimulation('sus_audit'),
      () => runSimulation('copilot_dispatch')
    ];

    let index = 0;
    autoLoopTimerRef.current = setInterval(() => {
      if (!isSimulating) {
        scenarios[index % scenarios.length]();
        index++;
      }
    }, 7000);

    return () => {
      if (autoLoopTimerRef.current) clearInterval(autoLoopTimerRef.current);
    };
  }, [isAutoLoop, isSimulating]);

  const handleResolveAlert = async (agentId: AgentId) => {
    const lastEvt = agentStates[agentId]?.lastEvent;
    if (lastEvt) {
      lastEvt.resolved = true;
      try {
        await supabase
          .from('agent_workstation_events')
          .update({ resolved: true })
          .eq('id', lastEvt.id);
      } catch (err) {
        console.debug('Erro ao resolver no Supabase:', err);
      }
    }

    await dispatchAgentOfficeEvent({
      agentId,
      status: 'idle',
      bubbleText: 'Alerta auditado e liberado formalmente pelo gestor.',
      isViolation: false,
      technicalDetail: { resolved_at: new Date().toISOString(), resolved_by: 'Superadmin' }
    });
  };

  const runSimulation = async (type: 'nfe_scan' | 'fuel_check' | 'fuel_fraud' | 'sus_audit' | 'copilot_dispatch' | 'reset') => {
    setIsSimulating(true);

    if (type === 'reset') {
      const allAgents: AgentId[] = ['orchestrator', 'saude-agent', 'fleet-agent', 'fiscal-agent', 'education-agent', 'copilot-agent', 'security-db-agent'];
      for (const a of allAgents) {
        await dispatchAgentOfficeEvent({
          agentId: a,
          status: 'idle',
          bubbleText: 'Em prontidão para novas operações autônomas.',
          isViolation: false
        });
      }
      setActiveCourier(null);
      setIsSimulating(false);
      return;
    }

    if (type === 'nfe_scan') {
      triggerCourier('copilot-agent', 'fiscal-agent', 'Despachando NF-e #1084 para conferência de IBS/CBS');

      await dispatchAgentOfficeEvent({
        agentId: 'copilot-agent',
        targetAgentId: 'fiscal-agent',
        status: 'working',
        bubbleText: 'Recebida NF-e de compra de medicamentos. Despachada para Auditor Fiscal.'
      });

      setTimeout(async () => {
        await dispatchAgentOfficeEvent({
          agentId: 'fiscal-agent',
          status: 'working',
          bubbleText: 'Conferência de IBS/CBS concluída: alíquotas oficiais aplicadas corretamente.'
        });
        setIsSimulating(false);
      }, 2300);
      return;
    }

    if (type === 'fuel_check') {
      triggerCourier('orchestrator', 'fleet-agent', 'Auditoria rotineira de litragem de tanques');

      await dispatchAgentOfficeEvent({
        agentId: 'fleet-agent',
        status: 'working',
        bubbleText: 'Odômetros e capacidade de tanques auditados: 48 abastecimentos sem divergências.'
      });
      setIsSimulating(false);
      return;
    }

    if (type === 'fuel_fraud') {
      triggerCourier('fleet-agent', 'orchestrator', 'ALERTA: Abastecimento bloqueado (+87% tanque)');

      await dispatchAgentOfficeEvent({
        agentId: 'fleet-agent',
        status: 'alert_critical',
        bubbleText: 'TRAVA ACIONADA: Abastecimento de 150L em veículo com tanque de 80L!',
        isViolation: true,
        technicalDetail: {
          veiculo: 'Caminhão Caçamba - Placa BRA-2026',
          capacidade_tanque: '80 Litros',
          litragem_digitada: '150 Litros',
          divergencia: '+87.5% de sobrecapacidade',
          status_bloqueio: 'Ordem travada no posto preventivamente'
        }
      });
      setSelectedAgentId('fleet-agent');
      setIsSimulating(false);
      return;
    }

    if (type === 'sus_audit') {
      triggerCourier('saude-agent', 'security-db-agent', 'Auditoria da ordem cronológica da fila SUS');

      await dispatchAgentOfficeEvent({
        agentId: 'saude-agent',
        status: 'working',
        bubbleText: 'Fila de espera de Tomografias auditada: 0 fura-filas, 100% de conformidade clínica.'
      });
      setIsSimulating(false);
      return;
    }

    if (type === 'copilot_dispatch') {
      triggerCourier('copilot-agent', 'education-agent', 'Despacho de relatório de frequência escolar LDB');

      await dispatchAgentOfficeEvent({
        agentId: 'education-agent',
        status: 'working',
        bubbleText: 'Busca Ativa acionada preventivamente para 4 alunos com mais de 15% de faltas.'
      });
      setIsSimulating(false);
      return;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header do Escritório Vivo */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#0b0e17] via-[#101422] to-[#0a0d14] border border-white/10 p-5 sm:p-6 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Glows Dinâmicos */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-emerald-400 p-0.5 shadow-xl shadow-cyan-500/20">
              <div className="w-full h-full bg-[#090c14] rounded-[14px] flex items-center justify-center text-cyan-400">
                <Activity size={24} className="animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-mono">
                  <span>ESCRITÓRIO VIVO DOS AGENTES</span>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    AO VIVO
                  </span>
                </h1>
              </div>
              <p className="text-xs text-neutral-400 font-medium mt-0.5">
                Simulação animada dos agentes especialistas operando em tempo real na governança de{' '}
                <span className="text-cyan-300 font-semibold">{currentInstitution?.name || 'Prefeitura Municipal'}</span>
              </p>
            </div>
          </div>

          {/* Indicadores do Header */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botão de Pausar / Retomar Loop Automático */}
            <button
              type="button"
              onClick={() => setIsAutoLoop(!isAutoLoop)}
              className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 text-xs font-mono font-bold transition cursor-pointer ${
                isAutoLoop 
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/[0.04] border-white/10 text-neutral-400'
              }`}
              title={isAutoLoop ? 'Pausar animação automática' : 'Ativar animação automática'}
            >
              {isAutoLoop ? <Play size={13} className="text-cyan-400 animate-pulse" /> : <Pause size={13} />}
              <span>{isAutoLoop ? 'MODO VIVO: ATIVO' : 'MODO VIVO: PAUSADO'}</span>
            </button>

            <div className="px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center gap-2 text-xs font-mono text-white font-bold">
              <Clock size={14} className="text-amber-400" />
              <span>{clockTime}</span>
            </div>

            <div className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 text-xs font-mono font-bold transition ${
              activeAlertsCount > 0 
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {activeAlertsCount > 0 ? (
                <>
                  <ShieldAlert size={14} className="text-rose-400" />
                  <span>{activeAlertsCount} BLOQUEIO</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>100% CONFORME</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botões de Ação de Demonstração em Tempo Real */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider font-mono mr-1 flex items-center gap-1.5">
              <Zap size={12} className="text-amber-400" />
              Disparar Animação:
            </span>

            <button
              type="button"
              disabled={isSimulating}
              onClick={() => runSimulation('nfe_scan')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Receipt size={12} className="text-emerald-400" />
              <span>Auditar NF-e (Copilot ➔ Fiscal)</span>
            </button>

            <button
              type="button"
              disabled={isSimulating}
              onClick={() => runSimulation('fuel_fraud')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 animate-pulse"
            >
              <Truck size={12} className="text-rose-400" />
              <span>Simular Fraude de Tanque (+87%)</span>
            </button>

            <button
              type="button"
              disabled={isSimulating}
              onClick={() => runSimulation('sus_audit')}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <HeartPulse size={12} className="text-cyan-400" />
              <span>Auditar Fila SUS</span>
            </button>

            <button
              type="button"
              disabled={isSimulating}
              onClick={() => runSimulation('reset')}
              className="p-1.5 rounded-xl text-xs bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/10 transition cursor-pointer"
              title="Redefinir todas as estações"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          <span className="text-xs font-mono text-neutral-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Clique em qualquer mesa no cenário para inspecionar
          </span>
        </div>
      </div>

      {/* 2. O Cenário Vivo Isométrico Moderno (SVG Hi-Tech 960x520) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 xl:col-span-9 rounded-3xl bg-[#090c14] border-2 border-white/10 p-3 sm:p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          
          {/* Banner de Emergência Quando Há Violação */}
          {activeAlertsCount > 0 && (
            <div className="absolute top-4 left-4 right-4 z-30 bg-rose-600/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-rose-300 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <AlertOctagon size={20} className="text-white animate-spin" />
                <span className="font-black text-xs font-mono uppercase tracking-wider">
                  SIRENE ACIONADA: VIOLAÇÃO DE REGRA INTERCEPTADA PELO GUARDRAIL!
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const violator = (Object.keys(agentStates) as AgentId[]).find(k => agentStates[k].isViolation);
                  if (violator) setSelectedAgentId(violator);
                }}
                className="px-3 py-1 rounded-xl bg-white text-rose-800 text-xs font-black font-mono hover:bg-neutral-100 transition cursor-pointer"
              >
                Inspecionar
              </button>
            </div>
          )}

          {/* SVG Interativo do Escritório Moderno */}
          <div className="relative w-full aspect-[1.85/1] min-h-[500px] flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 960 520"
              className="w-full h-full select-none"
              style={{ shapeRendering: 'geometricPrecision' }}
            >
              <defs>
                {/* Gradiente da Grade do Piso Tecnológico */}
                <linearGradient id="floorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0e1322" />
                  <stop offset="50%" stopColor="#090d16" />
                  <stop offset="100%" stopColor="#070910" />
                </linearGradient>

                {/* Padrão de Grade Isométrica com Iluminação Embutida */}
                <pattern id="techGrid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                  <circle cx="0" cy="0" r="1.5" fill="rgba(56, 189, 248, 0.2)" />
                </pattern>

                {/* Filtro de Glow Neon */}
                <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Sombra suave de mesa */}
                <radialGradient id="deskShadow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#000000" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* 1. PISO TECNOLÓGICO DO ESCRITÓRIO */}
              <rect x="0" y="0" width="960" height="520" fill="url(#floorGrad)" rx="24" />
              <rect x="0" y="0" width="960" height="520" fill="url(#techGrid)" rx="24" />

              {/* Trilhas de Circuito Neon no Chão Conectando as Mesas */}
              <g opacity="0.6">
                {/* Orquestrador ➔ Copilot ➔ Fiscal */}
                <path 
                  d="M 180 130 L 480 280 L 480 110" 
                  fill="none" 
                  stroke="#38bdf8" 
                  strokeWidth="2" 
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
                {/* Copilot ➔ Frotas */}
                <path 
                  d="M 480 280 L 160 360" 
                  fill="none" 
                  stroke="#f59e0b" 
                  strokeWidth="2" 
                  strokeDasharray="6 4"
                />
                {/* Copilot ➔ Saúde */}
                <path 
                  d="M 480 280 L 720 360" 
                  fill="none" 
                  stroke="#06b6d4" 
                  strokeWidth="2" 
                  strokeDasharray="6 4"
                />
                {/* Copilot ➔ Educação */}
                <path 
                  d="M 480 280 L 370 420" 
                  fill="none" 
                  stroke="#a855f7" 
                  strokeWidth="2" 
                  strokeDasharray="6 4"
                />
                {/* Fiscal ➔ Banco RLS */}
                <path 
                  d="M 480 110 L 780 130" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2" 
                  strokeDasharray="6 4"
                />
              </g>

              {/* CÁPSULA / ESTAFETA DE DADOS EM TRÂNSITO (Viajando entre as salas) */}
              {activeCourier && (
                <g>
                  {/* Posição calculada suavemente */}
                  {(() => {
                    const curX = activeCourier.startX + (activeCourier.endX - activeCourier.startX) * activeCourier.progress;
                    const curY = activeCourier.startY + (activeCourier.endY - activeCourier.startY) * activeCourier.progress;

                    return (
                      <g transform={`translate(${curX}, ${curY})`}>
                        {/* Rastro de Partículas */}
                        <circle cx="0" cy="0" r="14" fill={activeCourier.color} opacity="0.3" filter="url(#neonGlow)" />
                        <circle cx="0" cy="0" r="8" fill="#ffffff" stroke={activeCourier.color} strokeWidth="3" />
                        <circle cx="0" cy="0" r="4" fill={activeCourier.color} className="animate-ping" />

                        {/* Tag Flutuante do Processo em Trânsito */}
                        <g transform="translate(-60, -32)">
                          <rect 
                            x="0" 
                            y="0" 
                            width="120" 
                            height="22" 
                            rx="11" 
                            fill="#0b0e17" 
                            stroke={activeCourier.color} 
                            strokeWidth="1.5" 
                            filter="url(#neonGlow)"
                          />
                          <text 
                            x="60" 
                            y="14" 
                            fill="#ffffff" 
                            fontSize="8" 
                            fontFamily="monospace" 
                            fontWeight="bold" 
                            textAnchor="middle"
                          >
                            🚀 {activeCourier.label.length > 18 ? `${activeCourier.label.substring(0, 16)}...` : activeCourier.label}
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* ============================================================== */}
              {/* AS 7 ESTAÇÕES DE TRABALHO ISOMÉTRICAS MODERNAS */}
              {/* ============================================================== */}
              {(Object.keys(stationCoords) as AgentId[]).map((agentKey) => {
                const station = stationCoords[agentKey];
                const state = agentStates[agentKey];
                const isSelected = selectedAgentId === agentKey;
                const Icon = station.icon;

                return (
                  <g 
                    key={`st-${agentKey}`}
                    transform={`translate(${station.x}, ${station.y})`}
                    className="cursor-pointer group"
                    onClick={() => setSelectedAgentId(agentKey)}
                  >
                    {/* Sombra da Mesa no Piso */}
                    <ellipse cx="0" cy="35" rx="55" ry="20" fill="url(#deskShadow)" />

                    {/* Base Iluminada / Plataforma da Estação */}
                    <ellipse 
                      cx="0" 
                      cy="30" 
                      rx="48" 
                      ry="18" 
                      fill="#121829" 
                      stroke={isSelected ? '#38bdf8' : state.isViolation ? '#ef4444' : station.color} 
                      strokeWidth={isSelected ? '3' : '1.5'} 
                      opacity={isSelected ? 1 : 0.7}
                    />

                    {/* Mesa Executiva Curva Moderna */}
                    <path
                      d="M -40 18 Q 0 8 40 18 L 32 36 Q 0 28 -32 36 Z"
                      fill="#1a2236"
                      stroke="#2d3752"
                      strokeWidth="2"
                    />
                    {/* Borda Frontal com LED Neon */}
                    <path
                      d="M -32 36 Q 0 28 32 36"
                      fill="none"
                      stroke={station.color}
                      strokeWidth="2.5"
                      filter="url(#neonGlow)"
                    />

                    {/* ============================================================== */}
                    {/* MONITOR ULTRAWIDE COM ANIMAÇÃO VIVA DA TELA */}
                    {/* ============================================================== */}
                    <g transform="translate(-24, -15)">
                      {/* Suporte do Monitor */}
                      <rect x="22" y="22" width="4" height="10" fill="#334155" />
                      <ellipse cx="24" cy="32" rx="10" ry="3" fill="#1e293b" />

                      {/* Gabinete do Monitor Curvo */}
                      <rect 
                        x="0" 
                        y="0" 
                        width="48" 
                        height="26" 
                        rx="4" 
                        fill="#0b0e17" 
                        stroke="#334155" 
                        strokeWidth="2" 
                      />

                      {/* Tela LCD com Conteúdo Vivo Específico de Cada Agente */}
                      <rect 
                        x="2" 
                        y="2" 
                        width="44" 
                        height="22" 
                        rx="2" 
                        fill={state.isViolation ? '#450a0a' : '#070b14'} 
                      />

                      {/* CONTEÚDO VIVO DA TELA */}
                      {station.screenTheme === 'lrfgauge' && (
                        /* Tela do Orquestrador: Gráfico Circular LRF e Barras */
                        <g>
                          <circle cx="14" cy="13" r="7" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="30 14" />
                          <rect x="25" y="7" width="16" height="3" fill="#38bdf8" />
                          <rect x="25" y="12" width="12" height="3" fill="#22c55e" />
                          <rect x="25" y="17" width="14" height="3" fill="#6366f1" />
                        </g>
                      )}

                      {station.screenTheme === 'taxscanner' && (
                        /* Tela Fiscal: Scanner Verde de NF-e e Alíquotas */
                        <g>
                          <line x1="6" y1="6" x2="38" y2="6" stroke="#10b981" strokeWidth="1.5" />
                          <line x1="6" y1="11" x2="32" y2="11" stroke="#10b981" strokeWidth="1.5" />
                          <line x1="6" y1="16" x2="26" y2="16" stroke="#10b981" strokeWidth="1.5" />
                          {/* Laser Scanner Animado descendo */}
                          <line x1="4" y1="12" x2="40" y2="12" stroke="#34d399" strokeWidth="2" opacity="0.9" className="animate-pulse" />
                        </g>
                      )}

                      {station.screenTheme === 'fuelmeter' && (
                        /* Tela Frotas: Nível de Tanque de Combustível */
                        <g>
                          <rect x="6" y="8" width="32" height="10" rx="2" fill="#1e293b" />
                          <rect 
                            x="7" 
                            y="9" 
                            width={state.isViolation ? '30' : '22'} 
                            height="8" 
                            rx="1.5" 
                            fill={state.isViolation ? '#ef4444' : '#f59e0b'} 
                            className="animate-pulse"
                          />
                          <text x="12" y="15" fill="#ffffff" fontSize="6" fontFamily="monospace" fontWeight="bold">
                            {state.isViolation ? 'OVERFLOW' : '80L OK'}
                          </text>
                        </g>
                      )}

                      {station.screenTheme === 'suspulse' && (
                        /* Tela Saúde: Batimento Cardíaco / Fila SUS */
                        <g>
                          <path 
                            d="M 6 13 L 14 13 L 17 6 L 22 19 L 26 10 L 30 13 L 40 13" 
                            fill="none" 
                            stroke="#06b6d4" 
                            strokeWidth="1.5" 
                            className="animate-pulse"
                          />
                        </g>
                      )}

                      {station.screenTheme === 'copilotchat' && (
                        /* Tela Copilot: Chat Ativo e Balão de Resposta */
                        <g>
                          <rect x="6" y="6" width="20" height="4" rx="1" fill="#38bdf8" />
                          <rect x="18" y="12" width="22" height="4" rx="1" fill="#22c55e" />
                          <rect x="6" y="17" width="16" height="3" rx="1" fill="#94a3b8" />
                        </g>
                      )}

                      {station.screenTheme === 'databank' && (
                        /* Tela Cofre: Racks de Dados Criptografados RLS */
                        <g>
                          <rect x="6" y="6" width="14" height="4" fill="#ec4899" />
                          <rect x="24" y="6" width="14" height="4" fill="#a855f7" />
                          <circle cx="10" cy="16" r="2" fill="#22c55e" className="animate-ping" />
                          <circle cx="20" cy="16" r="2" fill="#38bdf8" />
                          <circle cx="30" cy="16" r="2" fill="#ec4899" />
                        </g>
                      )}

                      {station.screenTheme === 'educhart' && (
                        /* Tela Educação: Gráfico de Barras SAEB e Frequência */
                        <g>
                          <rect x="8" y="16" width="4" height="6" fill="#a855f7" />
                          <rect x="16" y="12" width="4" height="10" fill="#a855f7" />
                          <rect x="24" y="8" width="4" height="14" fill="#38bdf8" />
                          <rect x="32" y="5" width="4" height="17" fill="#22c55e" />
                        </g>
                      )}
                    </g>

                    {/* ============================================================== */}
                    {/* PERSONAGEM MODERNO SENTADO ATRÁS DA MESA */}
                    {/* ============================================================== */}
                    <g transform="translate(0, 5)">
                      {/* Cadeira Executiva Ergonômica */}
                      <rect x="-10" y="8" width="20" height="22" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
                      
                      {/* Tronco do Agente */}
                      <rect 
                        x="-9" 
                        y="12" 
                        width="18" 
                        height="14" 
                        rx="3" 
                        fill={station.color} 
                        stroke="#0f172a" 
                        strokeWidth="1.5" 
                      />

                      {/* Cabeça do Agente */}
                      <circle cx="0" cy="4" r="9" fill="#fcd34d" stroke="#0f172a" strokeWidth="1.5" />
                      {/* Olhos e Expressão */}
                      <circle cx="-3" cy="3" r="1.5" fill="#0f172a" />
                      <circle cx="3" cy="3" r="1.5" fill="#0f172a" />
                      <path d="M -2 7 Q 0 9 2 7" fill="none" stroke="#0f172a" strokeWidth="1" />

                      {/* Ícone distintivo flutuando acima da cabeça */}
                      <g transform="translate(-8, -19)">
                        <circle cx="8" cy="8" r="8" fill="#0b0e17" stroke={station.color} strokeWidth="1.5" />
                        <g transform="translate(3, 3) scale(0.65)" textAnchor="middle">
                          <Icon size={16} color={station.color} />
                        </g>
                      </g>
                    </g>

                    {/* ============================================================== */}
                    {/* SIRENE VERMELHA GIRATÓRIA (EM CASO DE ALERTA DE REGRA) */}
                    {/* ============================================================== */}
                    {state.isViolation && (
                      <g transform="translate(0, -60)" className="animate-bounce">
                        {/* Feixe de Luz de Giroflex que varre a sala */}
                        <circle cx="0" cy="0" r="32" fill="#ef4444" opacity="0.25" className="animate-ping" />
                        <circle cx="0" cy="0" r="14" fill="#ef4444" stroke="#ffffff" strokeWidth="2" filter="url(#neonGlow)" />
                        <AlertOctagon size={16} x="-8" y="-8" className="text-white" />
                      </g>
                    )}

                    {/* ============================================================== */}
                    {/* BALÃO DE FALA INTELIGENTE (FLOAT DIALOG) */}
                    {/* ============================================================== */}
                    <g transform="translate(-75, -65)">
                      <rect 
                        x="0" 
                        y="0" 
                        width="150" 
                        height="30" 
                        rx="10" 
                        fill={state.isViolation ? '#2d0f14' : '#0d121f'} 
                        stroke={isSelected ? '#38bdf8' : state.isViolation ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'} 
                        strokeWidth="1.5" 
                        filter="url(#neonGlow)"
                      />
                      {/* Pontinha do balão */}
                      <polygon 
                        points="70,30 75,36 80,30" 
                        fill={state.isViolation ? '#2d0f14' : '#0d121f'} 
                        stroke={isSelected ? '#38bdf8' : state.isViolation ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'} 
                        strokeWidth="1" 
                      />

                      {/* Nome do Agente com LED */}
                      <circle 
                        cx="12" 
                        cy="10" 
                        r="3" 
                        fill={state.isViolation ? '#ef4444' : state.status === 'working' ? '#22c55e' : '#eab308'} 
                      />
                      <text 
                        x="20" 
                        y="13" 
                        fill={station.color} 
                        fontSize="8" 
                        fontFamily="monospace" 
                        fontWeight="black"
                      >
                        {station.code} • {station.title.toUpperCase()}
                      </text>

                      {/* Texto de Fala / Atividade em Tempo Real */}
                      <text 
                        x="12" 
                        y="23" 
                        fill="#e2e8f0" 
                        fontSize="7.5" 
                        fontFamily="monospace" 
                        fontWeight="500"
                      >
                        {state.bubbleText.length > 30 ? `${state.bubbleText.substring(0, 28)}...` : state.bubbleText}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Barra de Status do Cenário */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs font-mono text-neutral-400 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Barramento de Mensagens Ativo
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                7 Agentes em Operação Contínua
              </span>
            </div>

            <div className="text-[11px] text-neutral-400">
              💡 As rotinas acontecem automaticamente a cada 7s ou você pode disparar nos botões acima
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. PAINEL LATERAL: DOSSIÊ & REGISTROS DO AGENTE SELECIONADO */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-3xl bg-gradient-to-b from-[#111524] to-[#0a0d16] border border-white/10 p-5 shadow-2xl flex flex-col justify-between space-y-4">
          
          {/* Alternador de Abas */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('inspector')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'inspector'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Activity size={13} />
              <span>Dossiê</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Terminal size={13} />
              <span>Logs ({events.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('guardrails')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'guardrails'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Regras</span>
            </button>
          </div>

          {/* ABA 1: DOSSIÊ DO AGENTE SELECIONADO */}
          {activeTab === 'inspector' && selectedStation && (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-mono">
                    {selectedStation.code} • ESTAÇÃO ATIVA
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {selectedConfig.name}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {selectedConfig.department}
                  </p>
                </div>

                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl border border-white/20"
                  style={{ backgroundColor: selectedStation.color }}
                >
                  <selectedStation.icon size={22} />
                </div>
              </div>

              {/* Status Operacional */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 font-bold">Estado Operacional:</span>
                  <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                    selectedState?.isViolation
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500'
                      : selectedState?.status === 'working'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                      : selectedState?.status === 'waiting_approval'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {selectedState?.isViolation ? 'BLOQUEIO DE REGRA' : selectedState?.status}
                  </span>
                </div>

                {/* Fala do Agente */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block mb-1">
                    Última ação / parecer emitido:
                  </span>
                  <p className="text-xs text-neutral-200 bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                    "{selectedState?.bubbleText}"
                  </p>
                </div>

                {/* Carga Operacional */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400">Carga de Trabalho:</span>
                    <span className="text-cyan-400 font-bold">{selectedState?.workload}%</span>
                  </div>
                  <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedState?.isViolation ? 'bg-rose-500' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${selectedState?.workload}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Payload Técnico em JSON se houver */}
              {selectedState?.lastEvent?.technical_detail && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block font-mono">
                    Auditoria de Telemetria (JSON):
                  </span>
                  <pre className="text-[10px] font-mono p-3 rounded-2xl bg-black/50 text-emerald-400 border border-white/10 overflow-x-auto max-h-36">
                    {JSON.stringify(selectedState.lastEvent.technical_detail, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: LOGS DE TELEMETRIA AO VIVO */}
          {activeTab === 'logs' && (
            <div className="space-y-3 h-[380px] flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-cyan-300">Linha do Tempo dos Agentes</span>
                <span className="text-[10px] text-neutral-400">{events.length} registros</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {events.length === 0 ? (
                  <div className="py-16 text-center text-neutral-500 text-xs">
                    Nenhum evento registrado ainda.
                  </div>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-2.5 rounded-xl border ${
                        ev.is_violation
                          ? 'bg-rose-950/40 border-rose-500/80 text-rose-200'
                          : 'bg-white/[0.02] border-white/5 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-bold text-cyan-400 uppercase">
                          {ev.agent_id}
                        </span>
                        <span className="text-neutral-500 text-[9px]">
                          {new Date(ev.created_at).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {ev.bubble_text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ABA 3: REGRAS E DIRETRIZES AGENTS.MD */}
          {activeTab === 'guardrails' && (
            <div className="space-y-3 h-[380px] overflow-y-auto pr-1 text-xs font-mono">
              <div className="border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-emerald-400">Governança Oficial AGENTS.md</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <span className="text-[10px] text-amber-400 font-bold uppercase block">
                  Regra Sob Custódia deste Agente:
                </span>
                <p className="text-neutral-300 italic bg-black/40 p-2.5 rounded-xl border border-white/5">
                  "{selectedConfig?.ruleSnippet}"
                </p>
                <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                  <span>Arquivo Fonte:</span>
                  <span className="text-cyan-400 font-bold">{selectedConfig?.ruleFile}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                  Legislação Municipal Blindada:
                </span>
                <ul className="space-y-1.5 text-neutral-300 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>Frotas:</strong> Trava de tanque físico e hodômetro não-regressivo.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>Tributos:</strong> Reforma Tributária com alíquotas de IBS/CBS 2026.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>Saúde:</strong> Mascaramento LGPD e sigilo PEP SOAP (Lei 13.709).</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400">✓</span>
                    <span><strong>Educação:</strong> Frequência 75% LDB e vagas creche TAC-MP.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Botões de Ação na Base do Dossiê */}
          {selectedConfig && (
            <div className="pt-2 border-t border-white/10 space-y-2">
              {selectedState?.isViolation ? (
                <button
                  type="button"
                  onClick={() => handleResolveAlert(selectedConfig.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  <ShieldCheck size={16} />
                  <span>Aprovar & Desbloquear Agente</span>
                </button>
              ) : selectedState?.status === 'waiting_approval' ? (
                <button
                  type="button"
                  onClick={() => handleResolveAlert(selectedConfig.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  <CheckCircle2 size={16} />
                  <span>Confirmar Ação Pendente</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    dispatchAgentOfficeEvent({
                      agentId: selectedConfig.id,
                      status: 'working',
                      bubbleText: `Rotina de auditoria autônoma disparada em ${selectedConfig.department}...`
                    });
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 font-mono"
                >
                  <RefreshCw size={13} />
                  <span>Disparar Auditoria Imediata</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
