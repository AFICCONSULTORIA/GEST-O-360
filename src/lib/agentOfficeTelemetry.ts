import { supabase } from './supabase';

export type AgentId = 
  | 'orchestrator' 
  | 'saude-agent' 
  | 'fleet-agent' 
  | 'fiscal-agent' 
  | 'education-agent' 
  | 'copilot-agent' 
  | 'security-db-agent';

export type AgentStatus = 
  | 'idle' 
  | 'working' 
  | 'walking' 
  | 'waiting_approval' 
  | 'alert_critical';

export interface AgentWorkstationEvent {
  id: string;
  institution_id?: string | null;
  agent_id: AgentId;
  target_agent_id?: AgentId | null;
  status: AgentStatus;
  bubble_text: string;
  technical_detail?: Record<string, any> | null;
  is_violation: boolean;
  resolved: boolean;
  created_at: string;
}

export interface AgentWorkstationConfig {
  id: AgentId;
  name: string;
  department: string;
  roomName: string;
  badgeLabel: string;
  primaryColor: string;
  accentHex: string;
  iconType: 'orchestrator' | 'health' | 'truck' | 'receipt' | 'graduation' | 'bot' | 'shield';
  ruleSnippet: string;
  ruleFile: string;
  defaultPosition: { x: number; y: number };
}

export const AGENT_WORKSTATIONS: Record<AgentId, AgentWorkstationConfig> = {
  orchestrator: {
    id: 'orchestrator',
    name: 'Orquestrador 360',
    department: 'Gabinete do Prefeito & Diretoria',
    roomName: 'Sala da Diretoria Executiva',
    badgeLabel: 'ORQUESTRADOR GERAL',
    primaryColor: 'indigo',
    accentHex: '#6366f1',
    iconType: 'orchestrator',
    ruleSnippet: 'Supervisão executiva, despacho de demandas entre secretarias e conformidade com LRF/PNTP.',
    ruleFile: 'AGENTS.md (Raiz)',
    defaultPosition: { x: 120, y: 130 }
  },
  'saude-agent': {
    id: 'saude-agent',
    name: 'Agente de Saúde & Fila SUS',
    department: 'Secretaria Municipal de Saúde',
    roomName: 'Estação Saúde & Prontuário',
    badgeLabel: 'SAÚDE & LGPD',
    primaryColor: 'rose',
    accentHex: '#f43f5e',
    iconType: 'health',
    ruleSnippet: 'Sigilo médico inviolável, prontuário PEP SOAP, dispensação farmacêutica RENAME/FEFO e anonimização LGPD.',
    ruleFile: 'src/modules/Saude/AGENTS.md',
    defaultPosition: { x: 340, y: 130 }
  },
  'fleet-agent': {
    id: 'fleet-agent',
    name: 'Agente de Frotas & Trava de Tanque',
    department: 'Secretaria de Obras & Transportes',
    roomName: 'Estação Frotas & Combustível',
    badgeLabel: 'FROTAS & AUDITORIA',
    primaryColor: 'amber',
    accentHex: '#f59e0b',
    iconType: 'truck',
    ruleSnippet: 'Trava física de capacidade do tanque, validação de KM regressivo, protocolo Top-Off e semáforo antifraude TCE.',
    ruleFile: 'src/modules/Controls/AGENTS.md',
    defaultPosition: { x: 580, y: 130 }
  },
  'fiscal-agent': {
    id: 'fiscal-agent',
    name: 'Auditor Fiscal Reforma 2026',
    department: 'Secretaria Municipal de Finanças',
    roomName: 'Estação Fiscal & Tributária',
    badgeLabel: 'FISCAL & NOTA FISCAL',
    primaryColor: 'emerald',
    accentHex: '#10b981',
    iconType: 'receipt',
    ruleSnippet: 'Validação da Reforma Tributária 2026 (IBS/CBS - NT 2026.010), cruzamento de retenções tributárias e glosa de NF-e irregular.',
    ruleFile: 'src/modules/Controls/AGENTS.md',
    defaultPosition: { x: 340, y: 340 }
  },
  'education-agent': {
    id: 'education-agent',
    name: 'Agente Educacional & SAEB',
    department: 'Secretaria Municipal de Educação',
    roomName: 'Estação Educação & Creches',
    badgeLabel: 'EDUCAÇÃO & SAEB',
    primaryColor: 'sky',
    accentHex: '#0284c7',
    iconType: 'graduation',
    ruleSnippet: 'Fila transparente da creche (TAC-MP), controle de 75% da frequência LDB e escala de proficiência SAEB/BNCC.',
    ruleFile: 'src/modules/Education/AGENTS.md',
    defaultPosition: { x: 580, y: 340 }
  },
  'copilot-agent': {
    id: 'copilot-agent',
    name: 'Copilot do Servidor Público',
    department: 'Central de Atendimento & Suporte',
    roomName: 'Central de Apoio ao Usuário',
    badgeLabel: 'COPILOT ASSISTANT',
    primaryColor: 'teal',
    accentHex: '#0d9488',
    iconType: 'bot',
    ruleSnippet: 'Interface em linguagem natural, acionamento de atalhos em 1 clique sem jargões técnicos para os servidores.',
    ruleFile: 'src/components/AIAssistant/AGENTS.md',
    defaultPosition: { x: 800, y: 235 }
  },
  'security-db-agent': {
    id: 'security-db-agent',
    name: 'Guardião de Segurança RLS',
    department: 'Núcleo de Infraestrutura & Banco',
    roomName: 'Sala Segura / Cofre RLS',
    badgeLabel: 'DATABASE & RLS',
    primaryColor: 'purple',
    accentHex: '#9333ea',
    iconType: 'shield',
    ruleSnippet: 'Políticas invioláveis de Row Level Security (RLS), isolamento por institution_id e persistência com RPCs atômicas.',
    ruleFile: '.agents/skills/supabase-data-guard/SKILL.md',
    defaultPosition: { x: 800, y: 90 }
  }
};

export interface DispatchAgentOfficePayload {
  agentId: AgentId;
  targetAgentId?: AgentId | null;
  status: AgentStatus;
  bubbleText: string;
  technicalDetail?: Record<string, any> | null;
  isViolation?: boolean;
  institutionId?: string | null;
}

export const AGENT_OFFICE_EVENT_NAME = 'GESTÃO360_AGENT_OFFICE_EVENT';
const LOCAL_STORAGE_EVENTS_KEY = 'gestao360_agent_workstation_events_v1';

/**
 * Salva no histórico local da sessão para resiliência offline/demo
 */
function cacheEventLocally(event: AgentWorkstationEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    const list: AgentWorkstationEvent[] = raw ? JSON.parse(raw) : [];
    list.unshift(event);
    // Guarda os últimos 50 eventos
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    // Silencia em caso de storage bloqueado
  }
}

/**
 * Lê os eventos armazenados localmente
 */
export function getLocalAgentOfficeEvents(): AgentWorkstationEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Dispara um evento de telemetria visual para o Escritório dos Agentes.
 * - Atualiza em tempo real a mesa do agente
 * - Se isViolation = true, força status = 'alert_critical' e sirene de emergência
 */
export async function dispatchAgentOfficeEvent(
  payload: DispatchAgentOfficePayload
): Promise<AgentWorkstationEvent> {
  const isViolation = Boolean(payload.isViolation);
  const status: AgentStatus = isViolation ? 'alert_critical' : payload.status;

  const event: AgentWorkstationEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    institution_id: payload.institutionId || null,
    agent_id: payload.agentId,
    target_agent_id: payload.targetAgentId || null,
    status,
    bubble_text: payload.bubbleText,
    technical_detail: payload.technicalDetail || null,
    is_violation: isViolation,
    resolved: false,
    created_at: new Date().toISOString()
  };

  // 1. Emite evento CustomEvent imediato no navegador para animação com latência zero
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(AGENT_OFFICE_EVENT_NAME, {
        detail: event
      })
    );
  }

  // 2. Cache local resiliente
  cacheEventLocally(event);

  // 3. Persistência assíncrona no Supabase (não trava a execução da tela)
  try {
    supabase
      .from('agent_workstation_events')
      .insert({
        institution_id: payload.institutionId || undefined,
        agent_id: payload.agentId,
        target_agent_id: payload.targetAgentId || undefined,
        status,
        bubble_text: payload.bubbleText,
        technical_detail: payload.technicalDetail || undefined,
        is_violation: isViolation,
        resolved: false
      })
      .then(({ error }) => {
        if (error) {
          // Log leve caso a tabela ainda não exista no ambiente atual
          console.debug('[AgentOfficeTelemetry] Notificação remota:', error.message);
        }
      });
  } catch (err) {
    console.debug('[AgentOfficeTelemetry] Erro ao enviar para Supabase:', err);
  }

  return event;
}

