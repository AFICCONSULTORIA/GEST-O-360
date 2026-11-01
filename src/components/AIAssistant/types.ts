export type AssistantActionType = 
  | 'NAVIGATE'
  | 'NAVIGATE_TAB'
  | 'TRIGGER_MODAL'
  | 'SELECT_TAB'
  | 'OPEN_MODAL'
  | 'FILL_DATA'
  | 'REPORT'
  | 'THEME'
  | 'SUPPORT_TICKET'
  | 'REQUEST_HUMAN_ATTENDANT';

export interface AssistantActionPayload {
  type: AssistantActionType;
  label: string;
  targetRoute?: string;
  route?: string;
  tab?: string;
  modalId?: string;
  reportId?: string;
  params?: {
    tab?: string;
    modalId?: string;
    reportId?: string;
    formData?: Record<string, any>;
    [key: string]: any;
  };
  formData?: Record<string, any>;
  description?: string;
}

export interface AssistantMessage {
  id: string;
  sender?: 'user' | 'assistant' | 'model';
  role?: 'user' | 'model' | 'assistant';
  text?: string;
  content?: string;
  timestamp: Date;
  action?: AssistantActionPayload | null;
  actions?: AssistantActionPayload[];
  isStreaming?: boolean;
}

export interface ContextualShortcut {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export interface UserContextData {
  name?: string;
  role?: string;
  email?: string;
  [key: string]: any;
}

export interface ChatAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeView: string;
  activeTab?: string;
  institutionName?: string;
  userData?: UserContextData;
  currentPath?: string;
  onExecuteAction?: (action: AssistantActionPayload) => void;
  onNavigate?: (view: string) => void;
  onSelectTab?: (tab: string) => void;
  onOpenModal?: (modalId: string, data?: any) => void;
  onOpenReport?: (reportId: string) => void;
  onToggleTheme?: () => void;
}
