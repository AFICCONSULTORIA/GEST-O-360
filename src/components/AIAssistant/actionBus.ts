import { AssistantActionPayload } from './types';

type ActionListener = (payload: AssistantActionPayload) => void;

class AssistantActionBus {
  private listeners: Map<string, Set<ActionListener>> = new Map();

  /**
   * Registra um ouvinte para um tipo específico de ação (ou '*' para todas)
   */
  public subscribe(actionType: string, listener: ActionListener): () => void {
    if (!this.listeners.has(actionType)) {
      this.listeners.set(actionType, new Set());
    }
    this.listeners.get(actionType)!.add(listener);

    // Retorna função para desinscrever
    return () => {
      this.listeners.get(actionType)?.delete(listener);
    };
  }

  /**
   * Dispara uma ação para os ouvintes registrados e emite CustomEvent na window
   */
  public dispatch(action: AssistantActionPayload): void {
    // 1. Notifica ouvintes diretos do tipo de ação
    const specific = this.listeners.get(action.type);
    if (specific) {
      specific.forEach(cb => {
        try {
          cb(action);
        } catch (err) {
          console.error(`Erro ao executar listener de ação ${action.type}:`, err);
        }
      });
    }

    // 2. Notifica ouvintes globais '*'
    const wildcard = this.listeners.get('*');
    if (wildcard) {
      wildcard.forEach(cb => {
        try {
          cb(action);
        } catch (err) {
          console.error(`Erro ao executar wildcard listener:`, err);
        }
      });
    }

    // 3. Emite evento CustomEvent no browser para desacoplamento total
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('assistant-action', { detail: action });
      window.dispatchEvent(event);
    }
  }
}

export const assistantActionBus = new AssistantActionBus();

