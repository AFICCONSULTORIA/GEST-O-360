import { supabase } from './supabase';
import { getSubdomain } from './subdomain';
import { showToast } from '../components/ui/Toast';
import { 
  DEMO_USER, 
  DEMO_INSTITUTION, 
  DEMO_PATRIMONIO, 
  DEMO_ORDERS, 
  DEMO_CONTROLS, 
  DEMO_PROTOCOLS, 
  DEMO_CONTRACTS, 
  DEMO_PATIENTS, 
  DEMO_APPOINTMENTS, 
  DEMO_MEDICATIONS, 
  DEMO_EXAMS, 
  DEMO_VEREADORES, 
  DEMO_MATERIAS, 
  DEMO_NEWS, 
  DEMO_COMPANIES, 
  DEMO_DEMANDAS, 
  DEMO_ENVIRONMENTAL_REPORTS, 
  DEMO_DOC_RECORDS 
} from './demoData';
import { INITIAL_MOCK_LAWS } from '../modules/Laws';
import { RADAR_DATA, MOCK_TEMPLATES } from './mockData';
import { MOCK_DEFAULT_FORMS } from '../modules/PublicForms/templates';
import { 
  INITIAL_COMISSOES, 
  INITIAL_SESSOES, 
  INITIAL_INDICACOES, 
  INITIAL_PNTP_CRITERIOS, 
  INITIAL_SUGESTOES 
} from '../modules/Camara/services/camaraService';

export { DEMO_USER, DEMO_INSTITUTION };

/**
 * Verifica se a aplicação está em ambiente de demonstração.
 * 
 * REGRA RIGOROSA:
 * Municípios reais (ex: torixoreu.gestao360sistema.com.br, aracruz.gestao360sistema.com.br)
 * NUNCA devem exibir ferramentas, banners ou botões de preenchimento com dados de demonstração.
 * 
 * O ambiente de demonstração fica restrito a:
 * - demo.gestao360sistema.com.br (ou subdomínio 'demo' / 'demonstracao')
 * - demo.localhost (desenvolvimento local com subdomínio demo)
 * - Parâmetro explícito ?demo=true em localhost quando NÃO estiver em subdomínio de município
 */
export const isDemoEnvironment = (institution?: { subdomain?: string | null; name?: string } | null): boolean => {
  if (typeof window === 'undefined') return false;

  const hostname = window.location.hostname.toLowerCase();
  const sub = getSubdomain();

  // 1. REGRA MÁXIMA DE SEGURANÇA: Se estiver em um subdomínio de município real, NUNCA é demo!
  if (sub && sub !== 'demo' && sub !== 'demonstracao' && sub !== 'admin') {
    return false;
  }

  // 2. Se a instituição ativa fornecida for de um município real, NUNCA é demo!
  if (institution && institution.subdomain && institution.subdomain !== 'demo' && institution.subdomain !== 'demonstracao') {
    return false;
  }

  // 3. Subdomínio oficial de demonstração (ex: demo.gestao360sistema.com.br, demo.gestao360sistema, demo.localhost)
  if (
    sub === 'demo' || 
    sub === 'demonstracao' || 
    hostname.startsWith('demo.gestao360sistema') ||
    hostname === 'demo.localhost'
  ) {
    return true;
  }

  // 4. Desenvolvimento local (localhost / 127.0.0.1) SOMENTE com parâmetro explícito ?demo=true ou flag de teste
  if (
    (hostname === 'localhost' || hostname === '127.0.0.1') &&
    (window.location.search.includes('demo=true') || window.location.hash.includes('demo') || localStorage.getItem('gestao360_demo_mode') === 'true')
  ) {
    return true;
  }

  return false;
};

/**
 * Ativa ou desativa o modo demonstração.
 */
export const setDemoEnvironment = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  const sub = getSubdomain();
  // Se for subdomínio de município, bloqueia ativação de demo
  if (sub && sub !== 'demo' && sub !== 'demonstracao' && sub !== 'admin') {
    localStorage.removeItem('gestao360_demo_mode');
    sessionStorage.removeItem('gestao360_demo_mode');
    return;
  }

  if (enabled) {
    localStorage.setItem('gestao360_demo_mode', 'true');
    window.dispatchEvent(new CustomEvent('gestao360:demo-mode-changed', { detail: { enabled: true } }));
  } else {
    localStorage.removeItem('gestao360_demo_mode');
    sessionStorage.removeItem('gestao360_demo_mode');
    window.dispatchEvent(new CustomEvent('gestao360:demo-mode-changed', { detail: { enabled: false } }));
  }
};

/**
 * Mapeamento de nomes amigáveis para os módulos.
 */
export const getModuleFriendlyName = (moduleKey: string): string => {
  const map: Record<string, string> = {
    home: 'Início & Dashboard',
    mayor: 'Visão do Prefeito',
    controls: 'Controles Internos',
    patrimonio: 'Patrimônio & Frotas',
    orders: 'Pedidos & Cotações',
    contracts: 'Licitações & Contratos',
    saude: 'Saúde Pública & Farmácia',
    camara: 'Câmara Municipal 360',
    education: 'Educação & Vagas CMEI',
    protocol: 'Protocolo Digital',
    laws: 'Banco de Leis Municipal',
    noticias: 'Notícias & Projetos',
    certificates: 'Certidões de Fornecedores',
    servicos_publicos: 'Serviços Públicos',
    meio_ambiente: 'Meio Ambiente & Fiscalização',
    pntp: 'Radar PNTP (Transparência)',
    admin_financas: 'Finanças & Contabilidade',
    financas: 'Finanças & Gestão Fiscal',
    administracao: 'Administração & RH',
    assistencia_social: 'Assistência Social & CRAS',
    doc_numbers: 'Controle de Numeração Oficial',
    forms: 'Formulários & Consultas Populares',
    communication: 'Central de WhatsApp',
    calendar: 'Calendário Oficial',
    risk: 'Gestão de Riscos (IA)',
    norms: 'Atos Normativos',
    reports: 'Relatórios Executivos',
    templates: 'Modelos de Documentos',
    settings: 'Configurações'
  };
  return map[moduleKey] || moduleKey;
};

/**
 * Verifica se um módulo específico já possui dados de demonstração preenchidos.
 */
export const hasDemoDataForModule = (moduleKey: string): boolean => {
  if (typeof window === 'undefined') return false;

  switch (moduleKey) {
    case 'patrimonio':
      return !!localStorage.getItem('gestao360_demo_patrimonio');
    case 'orders':
      return !!localStorage.getItem('gestao360_demo_orders');
    case 'controls':
      return !!localStorage.getItem('gestao360_demo_controls');
    case 'contracts':
      return !!localStorage.getItem('gestao360_demo_contracts');
    case 'saude':
      return !!localStorage.getItem('gestao360_demo_saude_appointments') || !!localStorage.getItem('gestao360_demo_saude_patients');
    case 'camara':
      return !!localStorage.getItem('camara_360_vereadores_v2');
    case 'noticias':
      return !!localStorage.getItem('gestao360_municipal_news');
    case 'laws':
      return !!localStorage.getItem('gestao360_demo_laws');
    case 'certificates':
      return !!localStorage.getItem('gestao360_demo_certificates');
    case 'servicos_publicos':
      return !!localStorage.getItem('gestao360_demo_demandas') || !!localStorage.getItem('gestao360_demo_servicos_publicos');
    case 'meio_ambiente':
      return !!localStorage.getItem('gestao360_demo_meio_ambiente');
    case 'protocol':
      return !!localStorage.getItem('gestao360_demo_protocols');
    case 'doc_numbers':
      return !!localStorage.getItem('gestao360_demo_doc_records');
    case 'education':
      return !!localStorage.getItem('gestao360_demo_creche_settings');
    case 'pntp':
      return !!localStorage.getItem('gestao360_pntp_categories_2026');
    case 'admin_financas':
    case 'financas':
      return !!localStorage.getItem('fin_monthly_history');
    case 'home':
    case 'mayor':
      return !!localStorage.getItem('gestao360_demo_patrimonio') || !!localStorage.getItem('gestao360_demo_controls');
    default:
      return false;
  }
};

/**
 * Preenche o módulo especificado com dados fictícios ultra-realistas.
 */
export const seedDemoDataForModule = async (
  moduleKey: string, 
  options: { institutionId?: string; silent?: boolean } = {}
): Promise<boolean> => {
  // SEGURANÇA MUNICIPAL: Bloqueia geração de dados se não for ambiente de demonstração
  if (!isDemoEnvironment()) {
    console.warn(`[DemoManager] Bloqueado: tentativa de gerar dados demo em ambiente de município.`);
    return false;
  }

  try {
    const instId = options.institutionId || DEMO_INSTITUTION.id;

    const syncBackground = (fn: () => any) => {
      try {
        Promise.resolve(fn()).catch(e => console.debug('Supabase background sync skipped:', e));
      } catch (e) {
        console.debug('Supabase background sync invocation error:', e);
      }
    };

    switch (moduleKey) {
      case 'patrimonio': {
        const items = DEMO_PATRIMONIO.map(p => ({ ...p, institution_id: instId }));
        localStorage.setItem('gestao360_demo_patrimonio', JSON.stringify(items));
        syncBackground(() => supabase.from('patrimonio').upsert(items.map(p => ({
          id: p.id,
          code: p.code,
          item_type: p.itemType,
          object_name: p.objectName,
          location: p.location,
          status: p.status,
          condition: p.condition,
          department: p.department,
          year: p.year,
          plate: p.plate,
          model: p.model,
          image_urls: p.imageUrls,
          created_by_name: p.createdByName,
          institution_id: instId
        }))));
        break;
      }

      case 'orders': {
        const orders = DEMO_ORDERS.map(o => ({ ...o, institution_id: instId }));
        localStorage.setItem('gestao360_demo_orders', JSON.stringify(orders));
        syncBackground(() => supabase.from('orders').upsert(orders.map(o => ({
          id: o.id,
          type: o.type,
          description: o.description,
          requester: o.requester,
          date_requested: o.dateRequested,
          quotation_number: o.quotationNumber,
          winning_supplier: o.winningSupplier,
          status: o.status,
          institution_id: instId
        }))));
        break;
      }

      case 'controls': {
        const controls = DEMO_CONTROLS.map(c => ({ ...c, institution_id: instId }));
        localStorage.setItem('gestao360_demo_controls', JSON.stringify(controls));
        syncBackground(() => supabase.from('controls').upsert(controls.map(c => ({
          id: c.id,
          task: c.task,
          status: c.status,
          department: c.department,
          deadline: c.deadline,
          notes: c.notes,
          history: c.history,
          institution_id: instId
        }))));
        break;
      }

      case 'contracts': {
        const contracts = DEMO_CONTRACTS.map(c => ({ ...c, institution_id: instId }));
        localStorage.setItem('gestao360_demo_contracts', JSON.stringify(contracts));
        syncBackground(() => supabase.from('contracts').upsert(contracts.map(c => ({
          id: c.id,
          number: c.number,
          object: c.object,
          vendor_name: c.vendorName,
          amount: c.amount,
          category: c.category,
          status: c.status,
          deadline: c.deadline,
          institution_id: instId
        }))));
        break;
      }

      case 'saude': {
        localStorage.setItem('gestao360_demo_saude_patients', JSON.stringify(DEMO_PATIENTS));
        localStorage.setItem('gestao360_demo_saude_appointments', JSON.stringify(DEMO_APPOINTMENTS));
        localStorage.setItem('gestao360_demo_saude_medications', JSON.stringify(DEMO_MEDICATIONS));
        localStorage.setItem('gestao360_demo_saude_exams', JSON.stringify(DEMO_EXAMS));

        syncBackground(() => supabase.from('patients').upsert(DEMO_PATIENTS.map(p => ({ ...p, institution_id: instId }))));
        syncBackground(() => supabase.from('appointments').upsert(DEMO_APPOINTMENTS.map(a => ({ ...a, institution_id: instId }))));
        syncBackground(() => supabase.from('medications').upsert(DEMO_MEDICATIONS.map(m => ({ ...m, institution_id: instId }))));
        syncBackground(() => supabase.from('exam_requests').upsert(DEMO_EXAMS.map(e => ({ ...e, institution_id: instId }))));
        break;
      }

      case 'camara': {
        localStorage.setItem('camara_360_vereadores_v2', JSON.stringify(DEMO_VEREADORES));
        localStorage.setItem('camara_360_materias_v2', JSON.stringify(DEMO_MATERIAS));
        localStorage.setItem('camara_360_comissoes_v2', JSON.stringify(INITIAL_COMISSOES));
        localStorage.setItem('camara_360_sessoes_v2', JSON.stringify(INITIAL_SESSOES));
        localStorage.setItem('camara_360_indicacoes_v2', JSON.stringify(INITIAL_INDICACOES));
        localStorage.setItem('camara_360_pntp_v2', JSON.stringify(INITIAL_PNTP_CRITERIOS));
        localStorage.setItem('camara_360_sugestoes_v2', JSON.stringify(INITIAL_SUGESTOES));

        syncBackground(() => supabase.from('camara_vereadores').upsert(DEMO_VEREADORES));
        syncBackground(() => supabase.from('camara_materias').upsert(DEMO_MATERIAS));
        break;
      }

      case 'noticias': {
        localStorage.setItem('gestao360_municipal_news', JSON.stringify(DEMO_NEWS));
        syncBackground(() => supabase.from('municipal_news').upsert(DEMO_NEWS.map(n => ({ ...n, institution_id: instId }))));
        break;
      }

      case 'laws': {
        localStorage.setItem('gestao360_demo_laws', JSON.stringify(INITIAL_MOCK_LAWS));
        syncBackground(() => supabase.from('municipal_laws').upsert(INITIAL_MOCK_LAWS.map(l => ({ ...l, institution_id: instId }))));
        break;
      }

      case 'certificates': {
        localStorage.setItem('gestao360_demo_certificates', JSON.stringify(DEMO_COMPANIES));
        syncBackground(() => supabase.from('company_certificates').upsert(DEMO_COMPANIES.map(c => ({
          id: c.id,
          company_name: c.companyName,
          cnpj: c.cnpj,
          certificates: c.certificates,
          institution_id: instId
        }))));
        break;
      }

      case 'servicos_publicos': {
        localStorage.setItem('gestao360_demo_servicos_publicos', JSON.stringify(DEMO_DEMANDAS));
        localStorage.setItem('gestao360_demo_demandas', JSON.stringify(DEMO_DEMANDAS));
        syncBackground(() => supabase.from('servicos_publicos_demandas').upsert(DEMO_DEMANDAS.map(d => ({ ...d, institution_id: instId }))));
        break;
      }

      case 'meio_ambiente': {
        localStorage.setItem('gestao360_demo_meio_ambiente', JSON.stringify(DEMO_ENVIRONMENTAL_REPORTS));
        syncBackground(() => supabase.from('meio_ambiente_denuncias').upsert(DEMO_ENVIRONMENTAL_REPORTS.map(r => ({ ...r, institution_id: instId }))));
        break;
      }

      case 'protocol': {
        localStorage.setItem('gestao360_demo_protocols', JSON.stringify(DEMO_PROTOCOLS));
        syncBackground(() => supabase.from('protocols').upsert(DEMO_PROTOCOLS.map(p => ({ ...p, institution_id: instId }))));
        break;
      }

      case 'doc_numbers': {
        localStorage.setItem('gestao360_demo_doc_records', JSON.stringify(DEMO_DOC_RECORDS));
        syncBackground(() => supabase.from('document_records').upsert(DEMO_DOC_RECORDS.map(d => ({ ...d, institution_id: instId }))));
        break;
      }

      case 'education': {
        const crecheData = {
          bercarioTotal: 25,
          bercarioOccupied: 22,
          maternal1Total: 40,
          maternal1Occupied: 38,
          maternal2Total: 50,
          maternal2Occupied: 47,
          decretoUrl: '',
          decretoName: 'Decreto Municipal nº 042/2026',
          decretoDescription: 'Regulamentação da Fila Única dos CMEIs Municipais e Critérios de Prioridade Social.',
          isOpen: true,
          fichaUrl: ''
        };
        localStorage.setItem('gestao360_demo_creche_settings', JSON.stringify(crecheData));
        syncBackground(() => supabase.from('creche_settings').upsert([{
          id: 'creche_settings_demo',
          bercario_total: crecheData.bercarioTotal,
          bercario_occupied: crecheData.bercarioOccupied,
          maternal1_total: crecheData.maternal1Total,
          maternal1_occupied: crecheData.maternal1Occupied,
          maternal2_total: crecheData.maternal2Total,
          maternal2_occupied: crecheData.maternal2Occupied,
          decreto_name: crecheData.decretoName,
          decreto_description: crecheData.decretoDescription,
          is_open: crecheData.isOpen
        }]));
        break;
      }

      case 'pntp': {
        const fullRadar = [
          {
            category: 'Prioritários',
            score: 95,
            items: [
              { name: 'Receitas', status: 'compliant', score: 100, weight: 10, department: 'Administração e Finanças', evidences: [{ label: 'Portal da Transparência - Receitas 2026', type: 'URL', link: '#' }] },
              { name: 'Despesas', status: 'compliant', score: 95, weight: 10, department: 'Administração e Finanças', evidences: [{ label: 'Execução Orçamentária e Empenhos', type: 'URL', link: '#' }] },
              { name: 'Licitações', status: 'compliant', score: 90, weight: 15, department: 'Administração e Finanças', evidences: [{ label: 'Editais e Contratos PNCP', type: 'URL', link: '#' }] },
              { name: 'Contratos', status: 'compliant', score: 95, weight: 15, department: 'Administração e Finanças', evidences: [{ label: 'Relação de Contratos e Aditivos', type: 'PDF', link: '#' }] },
              { name: 'Folha de Pagamento', status: 'compliant', score: 95, weight: 10, department: 'Administração e Finanças', evidences: [{ label: 'Tabela de Cargos e Salários', type: 'PDF', link: '#' }] }
            ]
          },
          {
            category: 'Essenciais',
            score: 90,
            items: [
              { name: 'Obras Públicas', status: 'compliant', score: 85, weight: 12, department: 'Viação e Obras', evidences: [{ label: 'Plano Municipal de Obras 2026', type: 'PDF', link: '#' }] },
              { name: 'Diárias', status: 'compliant', score: 100, weight: 8, department: 'Administração e Finanças', evidences: [{ label: 'Consulta Pública de Diárias', type: 'URL', link: '#' }] },
              { name: 'Relatórios Fiscais', status: 'compliant', score: 95, weight: 10, department: 'Administração e Finanças', evidences: [{ label: 'RREO 3º Bimestre / RGF', type: 'PDF', link: '#' }] }
            ]
          },
          {
            category: 'Obrigatórios',
            score: 92,
            items: [
              { name: 'Ouvidoria/e-SIC', status: 'compliant', score: 100, weight: 8, department: 'Administração e Finanças', evidences: [{ label: 'Sistema Eletrônico e-SIC', type: 'URL', link: '#' }] },
              { name: 'Estrutura Organizacional', status: 'compliant', score: 90, weight: 7, department: 'Administração e Finanças', evidences: [{ label: 'Organograma Municipal Atualizado', type: 'PDF', link: '#' }] }
            ]
          }
        ];
        localStorage.setItem('gestao360_pntp_categories_2026', JSON.stringify(fullRadar));
        break;
      }

      case 'admin_financas':
      case 'financas': {
        const demoHistory = {
          '2026-09': {
            files: [
              {
                id: 'file-demo-1',
                fileName: 'EXTRATO_CONTA_MOVIMENTO_092026.TXT',
                fileType: 'CNAB 240',
                totalAmount: 1845200.50,
                category: 'Movimento',
                uploadDate: '2026-09-15',
                isExpanded: false,
                lines: [
                  { id: 'l1', account: 'Fundo de Participação dos Municípios (FPM)', amount: 1200000.00, date: '10/09/2026' },
                  { id: 'l2', account: 'Arrecadação Municipal IPTU / ISSQN', amount: 645200.50, date: '15/09/2026' }
                ]
              },
              {
                id: 'file-demo-2',
                fileName: 'EXTRATO_FUS_SAUDE_092026.TXT',
                fileType: 'CNAB 240',
                totalAmount: 920400.00,
                category: 'FUS / Saúde',
                uploadDate: '2026-09-18',
                isExpanded: false,
                lines: [
                  { id: 'l3', account: 'Repasse Fundo Nacional de Saúde (FNS)', amount: 920400.00, date: '12/09/2026' }
                ]
              }
            ],
            invoices: [
              { id: 'inv-1', number: 'NF-00189', supplier: 'Pavimax Asfaltos Ltda', account: 'Movimento', amount: 450000.00, issueDate: '2026-09-12' },
              { id: 'inv-2', number: 'NF-00842', supplier: 'Distribuidora Farmacêutica Nacional', account: 'FUS / Saúde', amount: 180000.00, issueDate: '2026-09-14' }
            ]
          }
        };
        localStorage.setItem('fin_monthly_history', JSON.stringify(demoHistory));
        break;
      }

      case 'forms': {
        localStorage.setItem('gestao360_public_forms', JSON.stringify(MOCK_DEFAULT_FORMS));
        break;
      }

      case 'home':
      case 'mayor': {
        // Alimenta os dados centrais do Dashboard e visão do prefeito
        await seedDemoDataForModule('controls', { institutionId: instId, silent: true });
        await seedDemoDataForModule('orders', { institutionId: instId, silent: true });
        await seedDemoDataForModule('patrimonio', { institutionId: instId, silent: true });
        await seedDemoDataForModule('doc_numbers', { institutionId: instId, silent: true });
        break;
      }

      case 'all': {
        const modules = [
          'patrimonio', 'orders', 'controls', 'contracts', 'saude',
          'camara', 'noticias', 'laws', 'certificates', 'servicos_publicos',
          'meio_ambiente', 'protocol', 'doc_numbers', 'education', 'pntp',
          'financas', 'forms'
        ];
        for (const m of modules) {
          await seedDemoDataForModule(m, { institutionId: instId, silent: true });
        }
        break;
      }

      default:
        console.warn(`Seed específico não implementado para o módulo: ${moduleKey}`);
        break;
    }

    // Dispara evento global para que os componentes abertos atualizem seus estados imediatamente
    window.dispatchEvent(new CustomEvent('gestao360:reload-module', { 
      detail: { 
        module: moduleKey,
        moduleKey: moduleKey,
        action: 'seed',
        timestamp: Date.now()
      } 
    }));

    if (!options.silent) {
      const friendlyName = getModuleFriendlyName(moduleKey);
      showToast(`Módulo "${friendlyName}" preenchido com dados de exemplo com sucesso!`, 'success');
    }

    return true;
  } catch (err) {
    console.error(`Erro ao gerar dados de demonstração para ${moduleKey}:`, err);
    if (!options.silent) {
      showToast('Ocorreu um erro ao gerar os dados de exemplo.', 'error');
    }
    return false;
  }
};

/**
 * Remove os dados fictícios de um módulo específico (ou de todos) para voltar ao estado vazio.
 */
export const clearDemoDataForModule = (moduleKey: string, options: { silent?: boolean } = {}): boolean => {
  try {
    switch (moduleKey) {
      case 'patrimonio':
        localStorage.removeItem('gestao360_demo_patrimonio');
        break;
      case 'orders':
        localStorage.removeItem('gestao360_demo_orders');
        break;
      case 'controls':
        localStorage.removeItem('gestao360_demo_controls');
        break;
      case 'contracts':
        localStorage.removeItem('gestao360_demo_contracts');
        break;
      case 'saude':
        localStorage.removeItem('gestao360_demo_saude_patients');
        localStorage.removeItem('gestao360_demo_saude_appointments');
        localStorage.removeItem('gestao360_demo_saude_medications');
        localStorage.removeItem('gestao360_demo_saude_exams');
        break;
      case 'camara':
        localStorage.removeItem('camara_360_vereadores_v2');
        localStorage.removeItem('camara_360_materias_v2');
        localStorage.removeItem('camara_360_comissoes_v2');
        localStorage.removeItem('camara_360_sessoes_v2');
        localStorage.removeItem('camara_360_indicacoes_v2');
        localStorage.removeItem('camara_360_pntp_v2');
        localStorage.removeItem('camara_360_sugestoes_v2');
        break;
      case 'noticias':
        localStorage.removeItem('gestao360_municipal_news');
        break;
      case 'laws':
        localStorage.removeItem('gestao360_demo_laws');
        break;
      case 'certificates':
        localStorage.removeItem('gestao360_demo_certificates');
        break;
      case 'servicos_publicos':
        localStorage.removeItem('gestao360_demo_servicos_publicos');
        localStorage.removeItem('gestao360_demo_demandas');
        break;
      case 'meio_ambiente':
        localStorage.removeItem('gestao360_demo_meio_ambiente');
        break;
      case 'protocol':
        localStorage.removeItem('gestao360_demo_protocols');
        break;
      case 'doc_numbers':
        localStorage.removeItem('gestao360_demo_doc_records');
        break;
      case 'education':
        localStorage.removeItem('gestao360_demo_creche_settings');
        break;
      case 'pntp':
        localStorage.removeItem('gestao360_pntp_categories_2026');
        break;
      case 'admin_financas':
      case 'financas':
        localStorage.removeItem('fin_monthly_history');
        break;
      case 'all':
      case 'home':
      case 'mayor':
        const keys = [
          'gestao360_demo_patrimonio', 'gestao360_demo_orders', 'gestao360_demo_controls',
          'gestao360_demo_contracts', 'gestao360_demo_saude_patients', 'gestao360_demo_saude_appointments',
          'gestao360_demo_saude_medications', 'gestao360_demo_saude_exams', 'camara_360_vereadores_v2',
          'camara_360_materias_v2', 'camara_360_comissoes_v2', 'camara_360_sessoes_v2',
          'camara_360_indicacoes_v2', 'camara_360_pntp_v2', 'camara_360_sugestoes_v2',
          'gestao360_municipal_news', 'gestao360_demo_laws', 'gestao360_demo_certificates',
          'gestao360_demo_servicos_publicos', 'gestao360_demo_demandas', 'gestao360_demo_meio_ambiente',
          'gestao360_demo_protocols', 'gestao360_demo_doc_records', 'gestao360_demo_creche_settings',
          'gestao360_pntp_categories_2026', 'fin_monthly_history', 'gestao360_public_forms'
        ];
        keys.forEach(k => localStorage.removeItem(k));
        break;
      default:
        break;
    }

    window.dispatchEvent(new CustomEvent('gestao360:reload-module', { 
      detail: { 
        module: moduleKey,
        moduleKey: moduleKey,
        action: 'clear',
        timestamp: Date.now()
      } 
    }));

    if (!options.silent) {
      const friendlyName = getModuleFriendlyName(moduleKey);
      showToast(`Dados de exemplo do módulo "${friendlyName}" foram limpos.`, 'info');
    }

    return true;
  } catch (err) {
    console.error('Erro ao limpar dados de demonstração:', err);
    return false;
  }
};
