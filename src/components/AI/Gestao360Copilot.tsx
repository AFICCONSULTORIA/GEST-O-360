import React from 'react';
import { ChatAssistantModal } from '../AIAssistant/ChatAssistantModal';
import { AssistantActionPayload, UserContextData } from '../AIAssistant/types';

export interface Gestao360CopilotProps {
  activeView: string;
  activeTab?: string;
  institutionName?: string;
  userData?: UserContextData;
  currentPath?: string;
  onNavigate?: (view: string) => void;
  onSelectTab?: (tab: string) => void;
  onOpenModal?: (modalId: string, data?: any) => void;
  onOpenReport?: (reportId: string) => void;
  onToggleTheme?: () => void;
  onExecuteAction?: (action: AssistantActionPayload) => void;
}

export const Gestao360Copilot: React.FC<Gestao360CopilotProps> = (props) => {
  return <ChatAssistantModal {...props} />;
};

export default Gestao360Copilot;
