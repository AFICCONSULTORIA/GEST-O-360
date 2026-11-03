import { GoogleGenAI } from "@google/genai";
import { AssistantActionPayload, UserContextData } from "../components/AIAssistant/types";

export type { AssistantActionPayload, UserContextData };

export interface ChatMessage {
  id: string;
  sender?: 'user' | 'agent' | 'assistant' | 'model';
  role?: 'user' | 'model' | 'assistant';
  text?: string;
  content?: string;
  timestamp: Date;
  action?: AssistantActionPayload | null;
  actions?: AssistantActionPayload[];
  isStreaming?: boolean;
}

export type AgentAction = AssistantActionPayload;

export interface AgentResponse {
  cleanText: string;
  actions: AssistantActionPayload[];
}

export const GESTAO_360_SYSTEM_INSTRUCTION = `
Você é a Sexta-Feira (F.R.I.D.A.Y.), a inteligência artificial operacional avançada do ecossistema Gestão 360, inspirada na assistente inteligente do Homem de Ferro. Você conversa diretamente com servidores públicos municipais (professores, diretores, coordenadores de frotas, equipes de postos de saúde, secretários e gestores).

Sua missão é atuar como uma parceira estratégica hiper-eficiente: perspicaz, ágil, acolhedora e precisa, ajudando o servidor a realizar as tarefas do dia a dia com tranquilidade, clareza e empatia, reduzindo dúvidas operacionais e orientando procedimentos municipais.

---

### 1. REGRA SUPREMA DE INTEGRIDADE (PROIBIÇÃO ABSOLUTA DE DELÍRIOS E ALUCINAÇÕES):
- Você SÓ PODE MENCIONAR, EXPLICAR E REDIRECIONAR PARA MÓDULOS QUE REALMENTE EXISTEM NO GESTÃO 360.
- NUNCA invente telas, módulos ou funcionalidades inexistentes. Em especial:
  * O Gestão 360 NÃO POSSUI no momento: Módulo de RH/Folha de Pagamento, Almoxarifado/Estoque de Materiais Gerais, Módulo de Diárias de Viagem, Secretaria de Obras, Secretaria de Tributos/IPTU, Agricultura ou Esporte.
  * Se o servidor perguntar sobre Folha de Pagamento, Diárias, IPTU ou qualquer módulo inexistente, você DEVE responder honestamente:
    "Esse módulo ainda não está disponível no Gestão 360 do nosso município. Atualmente o sistema atende as áreas de Saúde (PEP e Farmácia Básica), Educação (SAEB e Frequência LDB), Frotas & Combustível, Controles Internos & Contabilidade, Protocolo, Licitações, Patrimônio e Atos Oficiais. Posso abrir um chamado de suporte ou te orientar em um desses módulos?"
  * NUNCA crie um botão <<<ACTION:...>>> apontando para telas que não existem! Isso causa tela em branco para o usuário.

---

### 2. ATENÇÃO CRÍTICA: BANCO DE CERTIDÕES vs VALIDADOR FISCAL

⚠️ **REGRA DE OURO PARA CERTIDÕES DE EMPRESAS E FORNECEDORES (ex: BICKI, CONSTRUTORAS, PRESTADORES):**
- **NÃO EXISTE no sistema "Portal Fiscal / Tributos" nem cadastro de empresas em módulo fiscal.**
- **SEMPRE que o servidor perguntar sobre certidões de empresas, fornecedores contratados (ex: Bicki, construtoras, cooperativas, prestadores), certidões negativas de débitos (CNDs), CNDT trabalhista, FGTS, certidão estadual SEFAZ, federal Receita/PGFN, certidão municipal, falência ou alvarás:**
  * O módulo correto, oficial e ÚNICO no sistema é o **BANCO DE CERTIDÕES (targetRoute: "certificates")**, acessível no menu **Gestão > Banco de Certidões**.
  * É no **Banco de Certidões** que o servidor busca a empresa pelo CNPJ ou Razão Social (ex: digita "Bicki" na busca), visualiza o semáforo de validade de cada certidão (Verde, Amarelo, Vermelho), faz upload de novas certidões e clica em **"Mesclar Certidões"** para gerar o PDF unificado para liquidação e empenho.
  * O botão de ação DEVE ser OBRIGATORIAMENTE:
    <<<ACTION:{"type":"NAVIGATE","label":"Ir para Banco de Certidões","targetRoute":"certificates"}>>>
  * **NUNCA diga "Acesse o Portal Fiscal / Tributos". NUNCA direcione para "fiscal" ou "/notafiscal" quando o assunto for empresas, fornecedores ou certidões!**

- **O MÓDULO VALIDADOR DE NOTAS FISCAIS (targetRoute: "notafiscal")**:
  * É **EXCLUSIVAMENTE** para fazer upload e análise técnica de arquivos **PDF (DANFE/DANFSe)** ou **XML** de Notas Fiscais para conferência da Reforma Tributária (IBS/CBS, cClassTrib, CST, ISSQN).
  * O Validador de Notas Fiscais **NÃO** possui cadastro de empresas, nem consulta CNPJ, nem emite ou guarda certidões.

---

### 3. CATÁLOGO COMPLETO DE MÓDULOS REAIS E SUAS ROTAS EXATAS:

1. **Banco de Certidões (targetRoute: "certificates")**:
   - Cadastro e consulta de empresas/fornecedores por CNPJ ou Razão Social (ex: Bicki, empresas contratadas).
   - Monitoramento de CNDs: Federal (Receita/PGFN), Estadual (SEFAZ), Municipal, Trabalhista (CNDT), FGTS (CRF), Falência e Concordata.
   - Semáforo de validade e botão para Mesclar Certidões em PDF único para liquidação de empenhos.

2. **Emissor em Lote de Certificados & Cursos (targetRoute: "course_certificates")**:
   - Acessível no menu **Gestão > Emissor de Certificados**.
   - Emissão oficial em lote de certificados em PDF com QR Code de autenticidade (Lei 14.063/2020) para cursos, palestras, oficinas e capacitações de todas as secretarias municipais.
   - Upload de planilhas Excel/CSV com mapeamento automático de participantes e download unificado em arquivo ZIP.

3. **Frotas & Combustível (targetRoute: "fleet_fuel")**:
   - Ordens digitais de abastecimento, canhotos com QR Code validador, conciliação em três vias.
   - Trava física do tanque (impede litragem maior que a capacidade cadastrada).
   - Regime Top-Off (Tanque Cheio) para viaturas e ambulâncias de socorro contínuo com cálculo por odômetro.
   - Prestação de contas: fotos do hodômetro e canhoto assinado pelo condutor.

2. **Controles Internos & Compliance (targetRoute: "controls")**:
   - Monitoramento preventivo de prazos e checklists do Tribunal de Contas (TCE).
   - Controle de Verbas Indenizatórias (acompanhamento mensal de relatórios comprobatórios por servidor).

3. **Alterações na Contabilidade / SRC (targetRoute: "accounting_changes")**:
   - Auditoria de solicitações de retificações de empenho, estornos, anulações e pareceres contábeis.

4. **Educação Municipal (targetRoute: "education")**:
   - Boletim Escolar com Escala de Proficiência do SAEB: Abaixo do Básico (Crítico), Básico, Adequado, Avançado + parecer pedagógico. NÃO usa notas de 0 a 10.
   - Controle de presença com regra dos 75% obrigatórios da LDB e alerta de busca ativa.
   - Fila de espera da creche (TAC do Ministério Público e pontuação social).
   - Professores não se cadastram pela tela de login; são enturmados pela Direção.

5. **Saúde Pública & Farmácia Básica (targetRoute: "saude")**:
   - Regulação SUS de exames e consultas especializadas por prioridade médica (Urgência, Prioritário, Eletivo).
   - Farmácia Municipal com regra FEFO (First Expire, First Out: vence primeiro, sai primeiro) com controle de lote e validade.
   - Sigilo absoluto e LGPD para dados clínicos de pacientes.

6. **Consultório Médico & Triagem (targetRoute: "consultorio_medico")**:
   - Prontuário Eletrônico do Paciente (PEP SOAP): Subjetivo, Objetivo, Avaliação e Plano.
   - Triagem com sinais vitais e histórico clínico.

7. **Licitações & Contratos (targetRoute: "contracts")**:
   - Gestão de contratos pela Nova Lei de Licitações (Lei 14.133/2021), vigências, certidões e aditivos contratuais.

8. **Protocolo Digital (targetRoute: "protocol")**:
   - Abertura de processos administrativos, tramitação digital com QR Code e despachos setoriais.

9. **Patrimônio Municipal (targetRoute: "patrimonio")**:
   - Tombamento de bens móveis e imóveis, placas de patrimônio, inventário anual e localização física.

10. **Pedidos & Requisições (targetRoute: "orders")**:
    - Solicitação interna de materiais e pedidos de serviços entre secretarias.

11. **Radar Nacional PNTP (targetRoute: "pntp")**:
    - Matriz de transparência da Atricon e Lei de Responsabilidade Fiscal (LRF).

12. **Banco de Certidões (targetRoute: "certificates")**:
    - CNDs federais, estaduais e municipais com semáforo de vigência e compilação em PDF único.

13. **Banco de Leis Municipais (targetRoute: "laws")**:
    - Legislação municipal compilada (Leis ordinárias, complementares e emendas).

14. **Atos Normativos & Decretos (targetRoute: "norms")**:
    - Decretos, portarias e publicações oficiais da administração.

15. **Calendário Oficial TCE (targetRoute: "calendar")**:
    - Prazos e calendários de envio de prestações de contas ao Tribunal de Contas.

16. **Validador de Notas Fiscais (targetRoute: "notafiscal")**:
    - Auditoria de notas fiscais municipais e adequação à Reforma Tributária (IBS/CBS - NT 2026.010).

17. **Ouvidoria Municipal (targetRoute: "ouvidoria")**:
    - Manifestações de cidadãos conforme Lei 13.460/2017 (reclamações, denúncias, elogios).

18. **Notícias & Divulgação (targetRoute: "noticias")**:
    - Mural e publicações oficiais de comunicação da prefeitura.

19. **Modelos Oficiais (targetRoute: "templates")**:
    - Minutas padronizadas de ofícios e memorandos.

20. **Central de Comunicação (targetRoute: "communication")**:
    - Disparos informativos e canais de comunicação com a comunidade.

21. **Suporte Técnico & Atendente Humano (targetRoute: "support")**:
    - Central de chamados, base de conhecimento e transbordo para operadores humanos.

22. **Visão do Prefeito (targetRoute: "mayor")**:
    - Cockpit executivo do prefeito com despesas por secretaria e metas de governo.

---

### 3. PROTOCOLO DE AÇÕES (ACTION CALLING):
Quando o usuário pedir para ir a uma tela existente ou executar uma rotina, anexe no final da resposta:
<<<ACTION:{"type":"NAVIGATE"|"NAVIGATE_TAB","label":"Texto do Botão","targetRoute":"id_da_view","params":{"tab":"nome_da_aba"}}>>>

Exemplos permitidos:
- Frotas e Abastecimento:
  targetRoute: "fleet_fuel"
- Controles e Prazos TCE:
  targetRoute: "controls"
- Alterações Contábeis (SRC):
  targetRoute: "accounting_changes"
- Educação / Boletim SAEB:
  targetRoute: "education"
- Saúde / Farmácia FEFO:
  targetRoute: "saude"
- Consultório Médico PEP:
  targetRoute: "consultorio_medico"
- Licitações & Contratos:
  targetRoute: "contracts"
- Protocolo:
  targetRoute: "protocol"
- Validador de Notas Fiscais:
  targetRoute: "notafiscal"
- Suporte Técnico:
  targetRoute: "support"

---

### 4. REGRA DE TRANSBORDO HUMANO:
Se o usuário pedir para falar com uma pessoa, atendente humano ou se tiver uma pendência técnica que o sistema não resolve sozinho:
1. "Compreendo perfeitamente! Vou transferir seu atendimento agora mesmo para nossa equipe de suporte técnico especializada no painel."
2. Anexe obrigatoriamente a ação:
<<<ACTION:{"type":"REQUEST_HUMAN_ATTENDANT","label":"Chamar Atendente Humano","params":{"reason":"Solicitação de atendimento humano"}}>>>
`;

export const SYSTEM_INSTRUCTION = GESTAO_360_SYSTEM_INSTRUCTION;

/**
 * Conjunto estrito de todas as views que REALMENTE existem no App.tsx
 */
export const ALLOWED_SYSTEM_VIEWS = new Set<string>([
  'home',
  'mayor',
  'controls',
  'accounting_changes',
  'fleet_fuel',
  'calendar',
  'norms',
  'risk',
  'pntp',
  'protocol',
  'contracts',
  'education',
  'orders',
  'doc_numbers',
  'reports',
  'certificates',
  'course_certificates',
  'laws',
  'saude',
  'consultorio_medico',
  'servicos_publicos',
  'meio_ambiente',
  'assistencia_social',
  'camara',
  'settings',
  'support',
  'templates',
  'communication',
  'forms',
  'noticias',
  'ouvidoria',
  'notafiscal',
  'patrimonio'
]);

/**
 * Normaliza rota textual e mapeia sinônimos estritamente para views que existem.
 * Se a rota não for válida, retorna '' (evitando qualquer navegação para telas em branco).
 */
export function normalizeTargetRoute(targetRoute?: string): string {
  if (!targetRoute) return '';
  const clean = targetRoute.replace(/^\//, '').toLowerCase().trim();

  // Emissor em lote de certificados de cursos, palestras e eventos (Gestão Geral)
  if (
    clean === 'course_certificates' ||
    clean === 'emissor_certificados' ||
    clean === 'certificados_cursos' ||
    clean.includes('emissor_cert') ||
    clean.includes('certificado_curso') ||
    clean.includes('lote_cert')
  ) {
    return 'course_certificates';
  }

  // Regra de Ouro: Qualquer referência a certidões, CNDs, empresas, fornecedores ou regularidade deve SEMPRE ir para certificates
  if (
    clean.includes('certid') || 
    clean.includes('cnd') || 
    clean.includes('certific') ||
    clean.includes('fornecedor') ||
    clean.includes('empresa') ||
    clean.includes('bicki') ||
    clean.includes('alvara') ||
    clean.includes('situacao_fiscal') ||
    clean.includes('regularidade_fiscal') ||
    clean.includes('banco_certid')
  ) {
    return 'certificates';
  }

  // Prioridade: Frotas e combustível
  if (clean.includes('frota') || clean.includes('combustivel') || clean.includes('abastecimento') || clean.includes('topoff') || clean.includes('tanque')) {
    return 'fleet_fuel';
  }

  // Prioridade: Contabilidade SRC
  if (clean.includes('contabil') || clean.includes('accounting') || clean === 'src') {
    return 'accounting_changes';
  }

  // Prioridade: Nota fiscal (apenas validação e auditoria de XML/PDF da Reforma Tributária)
  if (clean.includes('notafiscal') || clean.includes('nota_fiscal') || clean === 'notafiscal' || clean === 'danfe' || clean === 'xml_nota' || clean === 'auditor_fiscal' || clean === 'reforma_tributaria') {
    return 'notafiscal';
  }

  // Se o usuário/IA citou termos fiscais genéricos, portal_fiscal ou tributos sem citar nota fiscal, direciona para certificates
  if (clean === 'fiscal' || clean.includes('portal_fiscal') || clean.includes('tributo') || clean === 'certidoes_fiscais') {
    return 'certificates';
  }

  // Mapeamento semântico de termos comuns para rotas reais
  switch (clean) {
    case 'home':
    case 'inicio':
    case 'dashboard':
    case 'painel':
      return 'home';

    case 'mayor':
    case 'prefeito':
    case 'gabinete':
    case 'visao_prefeito':
      return 'mayor';

    case 'controls':
    case 'controle':
    case 'controles':
    case 'controles_internos':
    case 'compliance':
    case 'verbas':
    case 'tce':
      return 'controls';

    case 'accounting_changes':
    case 'contabilidade':
    case 'contabil':
    case 'src':
    case 'mudancas_contabeis':
    case 'alteracoes_contabeis':
      return 'accounting_changes';

    case 'fleet_fuel':
    case 'frotas':
    case 'frota':
    case 'combustivel':
    case 'veiculos':
    case 'abastecimento':
    case 'topoff':
      return 'fleet_fuel';

    case 'education':
    case 'educacao':
    case 'escola':
    case 'escolas':
    case 'boletim':
    case 'saeb':
    case 'creche':
    case 'professores':
    case 'alunos':
      return 'education';

    case 'saude':
    case 'saude_municipal':
    case 'farmacia':
    case 'fefo':
    case 'medicamentos':
    case 'regulacao':
    case 'sus':
      return 'saude';

    case 'consultorio':
    case 'consultorio_medico':
    case 'pep':
    case 'prontuario':
    case 'triagem':
    case 'medico':
      return 'consultorio_medico';

    case 'contracts':
    case 'contratos':
    case 'licitacao':
    case 'licitacoes':
    case 'aditivos':
      return 'contracts';

    case 'protocol':
    case 'protocolo':
    case 'processos':
    case 'tramitacao':
      return 'protocol';

    case 'patrimonio':
    case 'bens':
    case 'tombamento':
    case 'inventario':
      return 'patrimonio';

    case 'orders':
    case 'pedidos':
    case 'requisicoes':
    case 'compras':
      return 'orders';

    case 'certificates':
    case 'certificados':
    case 'certidoes':
    case 'cnd':
    case 'banco_certidoes':
    case 'fornecedores':
    case 'fornecedor':
    case 'empresas':
    case 'empresa':
    case 'situacao_fiscal':
    case 'regularidade_fiscal':
      return 'certificates';

    case 'laws':
    case 'leis':
    case 'legislacao':
      return 'laws';

    case 'norms':
    case 'normas':
    case 'decretos':
    case 'portarias':
      return 'norms';

    case 'notafiscal':
    case 'nota_fiscal':
    case 'danfe':
    case 'auditor_fiscal':
    case 'reforma_tributaria':
      return 'notafiscal';

    case 'pntp':
    case 'transparencia':
    case 'radar_pntp':
      return 'pntp';

    case 'risk':
    case 'risco':
    case 'riscos':
      return 'risk';

    case 'calendar':
    case 'calendario':
    case 'prazos':
      return 'calendar';

    case 'doc_numbers':
    case 'numeracao':
      return 'doc_numbers';

    case 'reports':
    case 'relatorios':
      return 'reports';

    case 'ouvidoria':
    case 'reclamacao':
      return 'ouvidoria';

    case 'noticias':
    case 'noticia':
    case 'comunicacao_social':
      return 'noticias';

    case 'communication':
    case 'whatsapp':
    case 'mensagens':
      return 'communication';

    case 'forms':
    case 'formularios':
    case 'pesquisas':
      return 'forms';

    case 'templates':
    case 'modelos':
      return 'templates';

    case 'servicos_publicos':
    case 'servicos':
    case 'iluminacao':
    case 'limpeza':
      return 'servicos_publicos';

    case 'meio_ambiente':
    case 'ambiental':
      return 'meio_ambiente';

    case 'assistencia_social':
    case 'social':
    case 'cras':
      return 'assistencia_social';

    case 'camara':
    case 'legislativo':
      return 'camara';

    case 'support':
    case 'suporte':
    case 'ajuda':
    case 'chamados':
    case 'saas-control-center':
      return 'support';

    case 'settings':
    case 'configuracoes':
    case 'usuarios':
      return 'settings';

    default:
      // Se não for um ID de view válido, NÃO deixa passar para evitar tela branca
      if (ALLOWED_SYSTEM_VIEWS.has(clean)) {
        return clean;
      }
      return '';
  }
}

/**
 * Faz o parsing de ações embutidas na resposta do agente:
 * 1. Protocolo Oficial: <<<ACTION:{...}>>>
 * 2. Tags simples: [ACTION:NAVIGATE:view_id:Texto do Botão]
 * 3. Blocos JSON: ```action-payload ... ```
 */
export function parseAgentActions(rawText: string): { cleanText: string; actions: AssistantActionPayload[] } {
  const actions: AssistantActionPayload[] = [];
  let cleanText = rawText;

  // 1. Parsing do Protocolo Oficial <<<ACTION:{...}>>>
  const actionCallRegex = /<<<ACTION:([\s\S]*?)>>>/gi;
  cleanText = cleanText.replace(actionCallRegex, (_match, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr.trim());
      if (parsed && typeof parsed === 'object') {
        let targetRoute = parsed.targetRoute || parsed.route || '';
        const label = parsed.label || 'Acessar no Sistema';
        const labelLower = label.toLowerCase();
        
        // Safeguard supremo: se o rótulo do botão mencionar certidões, CNDs ou fornecedores, direciona para certificates
        if (
          labelLower.includes('certid') || 
          labelLower.includes('cnd') || 
          labelLower.includes('certific') ||
          labelLower.includes('banco de cert') ||
          (labelLower.includes('empresa') && labelLower.includes('fiscal'))
        ) {
          targetRoute = 'certificates';
        }

        const normalizedRoute = normalizeTargetRoute(targetRoute);
        const actionPayload: AssistantActionPayload = {
          type: parsed.type || 'NAVIGATE',
          label,
          targetRoute: targetRoute || normalizedRoute,
          route: normalizedRoute,
          tab: parsed.params?.tab || parsed.tab,
          modalId: parsed.params?.modalId || parsed.modalId,
          params: parsed.params,
          formData: parsed.params?.formData || parsed.formData
        };
        actions.push(actionPayload);
      }
    } catch (err) {
      console.warn("Falha ao analisar JSON da tag <<<ACTION:...>>>", err);
    }
    return '';
  });

  // 2. Parsing de Tags [ACTION:TYPE:TARGET:LABEL]
  const regexTag = /\[ACTION:(NAVIGATE|NAVIGATE_TAB|TRIGGER_MODAL|SELECT_TAB|TAB|OPEN_MODAL|MODAL|REPORT|THEME|SUPPORT_TICKET|TICKET):?([^:\]]*):?([^:\]]*):?([^\]]*)\]/gi;
  cleanText = cleanText.replace(regexTag, (_match, rawType, p1, p2) => {
    const normType = rawType.toUpperCase();
    if (normType === 'THEME') {
      actions.push({
        type: 'THEME',
        label: p1 || p2 || 'Alternar Modo Escuro/Claro'
      });
    } else if (normType === 'SELECT_TAB' || normType === 'TAB' || normType === 'NAVIGATE_TAB') {
      actions.push({
        type: 'NAVIGATE_TAB',
        tab: (p1 || '').trim(),
        label: (p2 || p1 || 'Ir para Aba').trim(),
        params: { tab: (p1 || '').trim() }
      });
    } else if (normType === 'OPEN_MODAL' || normType === 'MODAL' || normType === 'TRIGGER_MODAL') {
      actions.push({
        type: 'TRIGGER_MODAL',
        modalId: (p1 || '').trim(),
        label: (p2 || p1 || 'Abrir Formulário').trim(),
        params: { modalId: (p1 || '').trim() }
      });
    } else if (normType === 'SUPPORT_TICKET' || normType === 'TICKET') {
      actions.push({
        type: 'SUPPORT_TICKET',
        description: (p1 || '').trim(),
        label: (p2 || p1 || 'Abrir Chamado de Suporte').trim(),
        targetRoute: '/saas-control-center',
        route: 'support',
        params: { tab: 'support' }
      });
    } else if (normType === 'REPORT') {
      actions.push({
        type: 'REPORT',
        reportId: (p1 || '').trim(),
        label: (p2 || p1 || 'Gerar Relatório A4').trim()
      });
    } else {
      const rawTarget = (p1 || '').trim();
      actions.push({
        type: 'NAVIGATE',
        targetRoute: rawTarget,
        route: normalizeTargetRoute(rawTarget),
        label: (p2 || p1 || 'Navegar').trim()
      });
    }
    return '';
  });

  // 3. Suporte a bloco de payload JSON estruturado
  const jsonBlockRegex = /```action-payload\s*([\s\S]*?)\s*```/gi;
  cleanText = cleanText.replace(jsonBlockRegex, (_match, jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        actions.push(...parsed);
      } else if (parsed && parsed.type) {
        actions.push(parsed);
      }
    } catch {
      // Ignora erro de JSON mal formatado
    }
    return '';
  });

  return { cleanText: cleanText.trim(), actions };
}

/**
 * Transmite a resposta da IA em tempo real (Streaming de Tokens)
 * Suporta streaming direto client-side e streaming Edge nativo via SSE na Vercel.
 */
export async function streamMessageFromAgent({
  message,
  history,
  moduleContext,
  userData,
  currentPath,
  onChunk
}: {
  message: string;
  history: ChatMessage[];
  moduleContext: string;
  userData?: UserContextData;
  currentPath?: string;
  onChunk: (accumulatedText: string) => void;
}): Promise<AgentResponse> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  
  const dynamicContext = `
DADOS DO USUÁRIO EM ATENDIMENTO:
- Nome do Servidor: ${userData?.name || 'Servidor(a)'}
- Perfil / Secretaria: ${userData?.role || 'Geral'}
- Município / Instância: ${userData?.municipio || 'Prefeitura Municipal'}
- Tela / Rota onde o servidor está navegando no momento: ${currentPath || moduleContext || 'Painel Inicial'}
`;

  const finalSystemInstruction = `${GESTAO_360_SYSTEM_INSTRUCTION}\n\n${dynamicContext}`;

  // 1. Streaming Direto via @google/genai (se chave presente no front)
  if (apiKey) {
    try {
      const genAI = new GoogleGenAI({ apiKey });

      const contents: any[] = [];
      const recentHistory = history.slice(-6);
      let lastRole = '';

      for (const item of recentHistory) {
        const role = item.sender === 'user' ? 'user' : 'model';
        if (role !== lastRole && item.text?.trim()) {
          contents.push({
            role,
            parts: [{ text: item.text }]
          });
          lastRole = role;
        }
      }

      if (lastRole === 'user' && contents.length > 0) {
        contents[contents.length - 1].parts[0].text += `\n\n[Tela Atual: ${currentPath || moduleContext}]\n${message}`;
      } else {
        contents.push({
          role: 'user',
          parts: [{ text: `[Tela Atual: ${currentPath || moduleContext}]\n\n${message}` }]
        });
      }

      const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
      let fullAccumulated = '';
      let succeeded = false;

      for (const modelName of modelsToTry) {
        try {
          const responseStream = await genAI.models.generateContentStream({
            model: modelName,
            contents,
            config: {
              systemInstruction: finalSystemInstruction,
              temperature: 0.6
            }
          });

          for await (const chunk of responseStream) {
            const textChunk = chunk.text;
            if (textChunk) {
              fullAccumulated += textChunk;
              onChunk(fullAccumulated);
            }
          }

          if (fullAccumulated.trim()) {
            succeeded = true;
            break;
          }
        } catch (modelError: any) {
          console.warn(`Tentativa direta com ${modelName} falhou:`, modelError?.message || modelError);
          if (fullAccumulated.trim()) break;
        }
      }

      if (succeeded && fullAccumulated.trim()) {
        const { cleanText, actions } = parseAgentActions(fullAccumulated);
        return { cleanText, actions };
      }
    } catch (clientErr) {
      console.warn("Falha no client-side SDK, tentando rota Edge serverless /api/chat-assistant...", clientErr);
    }
  }

  // 2. Chamada ao Backend Serverless Edge (/api/chat-assistant) com SSE Streaming
  try {
    const formattedHistory = history.slice(-6).map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      content: msg.text
    }));

    const res = await fetch('/api/chat-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: formattedHistory,
        currentPath: currentPath || moduleContext,
        userData
      })
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      
      // Streaming nativo via SSE
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseAccumulated = '';
        const serverActions: AssistantActionPayload[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'text' && data.content) {
                  sseAccumulated += data.content;
                  onChunk(sseAccumulated);
                } else if (data.type === 'action' && data.action) {
                  const act = data.action;
                  const normalizedRoute = normalizeTargetRoute(act.targetRoute || act.route);
                  serverActions.push({
                    type: act.type || 'NAVIGATE',
                    label: act.label || 'Acessar no Sistema',
                    targetRoute: act.targetRoute || act.route,
                    route: normalizedRoute,
                    tab: act.params?.tab || act.tab,
                    modalId: act.params?.modalId || act.modalId,
                    params: act.params,
                    formData: act.params?.formData || act.formData
                  });
                }
              } catch {
                // Fragmentos de chunks ignorados
              }
            }
          }
        }

        const { cleanText, actions } = parseAgentActions(sseAccumulated);
        return {
          cleanText: cleanText || sseAccumulated,
          actions: serverActions.length > 0 ? serverActions : actions
        };
      } else {
        // Resposta JSON padrão
        const data = await res.json();
        const rawText = data.reply || data.rawReply || '';
        onChunk(rawText);
        const { cleanText, actions } = parseAgentActions(rawText);
        return { 
          cleanText: cleanText || rawText, 
          actions: (data.actions && data.actions.length > 0) ? data.actions : actions 
        };
      }
    }
  } catch (backendErr) {
    console.error("Falha na chamada ao backend serverless Edge:", backendErr);
  }

  throw new Error("Não foi possível conectar aos servidores de inteligência artificial do Gestão 360. Verifique sua conexão e tente novamente.");
}
