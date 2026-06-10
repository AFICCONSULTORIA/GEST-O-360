import { supabase } from './supabase';

const generateId = () => crypto.randomUUID();

export const seedDemoInstitution = async (institutionId: string) => {
  try {
    console.log(`Starting mock data seeding for institution: ${institutionId}`);
    
    // 1. Apagar dados antigos (Reset opcional mas seguro para demos)
    await resetInstitutionData(institutionId);

    // 2. Secretarias (Departments)
    const depts = [
      { id: generateId(), name: 'Secretaria de Saúde', institution_id: institutionId },
      { id: generateId(), name: 'Secretaria de Educação', institution_id: institutionId },
      { id: generateId(), name: 'Secretaria de Obras', institution_id: institutionId },
      { id: generateId(), name: 'Gabinete do Prefeito', institution_id: institutionId },
    ];
    const { error: e2 } = await supabase.from('departments').insert(depts);
    if (e2) throw new Error('Departments: ' + e2.message);

    // 3. Usuários (Admin Users)
    const users = [
      {
        id: generateId(),
        name: 'Prefeito Fictício',
        email: 'prefeito@demo.com',
        role: 'Visualizador',
        status: 'Ativo',
        last_login: 'Hoje',
        permissions: ['home', 'reports', 'calendar'],
        institution_id: institutionId,
        department_id: depts[3].id
      },
      {
        id: generateId(),
        name: 'João Saúde',
        email: 'joao.saude@demo.com',
        role: 'Editor',
        status: 'Ativo',
        last_login: 'Ontem',
        permissions: ['home', 'saude', 'protocol'],
        institution_id: institutionId,
        department_id: depts[0].id
      }
    ];
    const { error: e3 } = await supabase.from('admin_users').insert(users);
    if (e3) throw new Error('Admin Users: ' + e3.message);

    // 4. Patrimônio
    const patrimonio = [
      {
        id: generateId(),
        code: 'PAT-2026-001',
        item_type: 'Veículo',
        object_name: 'Ambulância SAMU',
        location: 'Secretaria de Saúde',
        status: 'Servível',
        condition: 'Bom',
        department: 'Saúde',
        year: 2024,
        plate: 'ABC-1234',
        model: 'Sprinter',
        institution_id: institutionId
      },
      {
        id: generateId(),
        code: 'PAT-2026-002',
        item_type: 'Geral',
        object_name: 'Computador Desktop',
        location: 'Recepção Principal',
        status: 'Servível',
        condition: 'Excelente',
        department: 'Administração',
        year: 2026,
        institution_id: institutionId
      }
    ];
    const { error: e4 } = await supabase.from('patrimonio').insert(patrimonio);
    if (e4) throw new Error('Patrimônio: ' + e4.message);

    // 5. Saúde: Consultas (Appointments)
    const today = new Date().toISOString().split('T')[0];
    const appointments = [
      {
        id: generateId(),
        appointment_date: `${today}`,
        appointment_time: `10:00`,
        patient_name: 'Maria Antonieta',
        patient_phone: '11999999999',
        patient_cpf: '111.111.111-11',
        patient_sus: '111 1111 1111 1111',
        patient_birth_date: '1990-01-01',
        is_pregnant: false,
        is_urgent: true,
        specialty: 'Clínico Geral',
        status: 'Agendado',
        institution_id: institutionId
      },
      {
        id: generateId(),
        appointment_date: `${today}`,
        appointment_time: `14:30`,
        patient_name: 'José Ferreira',
        patient_phone: '11888888888',
        patient_cpf: '222.222.222-22',
        patient_sus: '222 2222 2222 2222',
        patient_birth_date: '2015-05-05',
        is_pregnant: false,
        is_urgent: false,
        specialty: 'Pediatria',
        status: 'Atendido',
        institution_id: institutionId
      }
    ];
    const { error: e5 } = await supabase.from('appointments').insert(appointments);
    if (e5) throw new Error('Appointments: ' + e5.message);

    // 6. Farmácia: Medicamentos (Medications)
    const medications = [
      {
        id: generateId(),
        name: 'Dipirona 500mg',
        active_ingredient: 'Dipirona Sódica',
        dosage: '500mg',
        form: 'Comprimido',
        batch_number: 'Lote A123',
        expiration_date: '2026-12-31',
        quantity: 5000,
        institution_id: institutionId
      },
      {
        id: generateId(),
        name: 'Amoxicilina 500mg',
        active_ingredient: 'Amoxicilina Tri-hidratada',
        dosage: '500mg',
        form: 'Cápsula',
        batch_number: 'Lote B456',
        expiration_date: '2025-06-30',
        quantity: 800,
        institution_id: institutionId
      }
    ];
    const { error: e6 } = await supabase.from('medications').insert(medications);
    if (e6) throw new Error('Medications: ' + e6.message);

    // 7. Serviços Públicos (servicos_publicos_demandas)
    const demandas = [
      {
        id: generateId(),
        protocolo: `SP-2026-0001`,
        descricao: 'Lâmpada queimada no poste central',
        categoria: 'Iluminação',
        endereco: 'Praça Matriz',
        solicitante: 'Cidadão Fictício',
        telefone: '11977777777',
        status: 'Aberto',
        data_solicitacao: today,
        institution_id: institutionId
      },
      {
        id: generateId(),
        protocolo: `SP-2026-0002`,
        descricao: 'Asfalto cedendo perto do mercado',
        categoria: 'Tapa buraco',
        endereco: 'Rua das Flores, 100',
        solicitante: 'Morador Fictício',
        telefone: '11966666666',
        status: 'Concluído',
        data_solicitacao: today,
        institution_id: institutionId
      }
    ];
    const { error: e7 } = await supabase.from('servicos_publicos_demandas').insert(demandas);
    if (e7) throw new Error('Servicos Publicos: ' + e7.message);

    // 8. Protocolos (protocols)
    const protocolos = [
      {
        id: generateId(),
        subject: 'Licença de Funcionamento - Padaria Pão Quente',
        type: 'Alvará',
        from: 'João Padadeiro',
        to: 'Secretaria de Administração e Finanças',
        status: 'Em Análise',
        date: today,
        institution_id: institutionId
      },
      {
        id: generateId(),
        subject: 'Requerimento de Férias',
        type: 'RH',
        from: 'Maria Servidora',
        to: 'RH',
        status: 'Concluído',
        date: today,
        institution_id: institutionId
      }
    ];
    const { error: e8 } = await supabase.from('protocols').insert(protocolos);
    if (e8) throw new Error('Protocols: ' + e8.message);

    // 9. Pedidos (orders)
    const pedidos = [
      {
        id: generateId(),
        type: 'obras_abrange',
        description: 'Cimento, areia e brita para reforma do posto de saúde',
        requester: 'João - Obras',
        date_requested: today,
        quotation_number: 'COT-2024-055',
        winning_supplier: 'Construmax Materiais',
        status: 'concluido',
        institution_id: institutionId
      },
      {
        id: generateId(),
        type: 'veiculos_gtf',
        description: 'Troca de óleo e filtros da ambulância',
        requester: 'Maria - Saúde',
        date_requested: today,
        status: 'em_cotacao',
        institution_id: institutionId
      }
    ];
    const { error: e9 } = await supabase.from('orders').insert(pedidos);
    if (e9) throw new Error('Orders: ' + e9.message);

    // 10. Controles (controls)
    const controles = [
      {
        id: generateId(),
        task: 'Auditoria de Frotas - Maio',
        status: 'pending',
        department: 'Transportes',
        deadline: '2026-05-15',
        notes: 'Aguardando envio dos diários de bordo.',
        institution_id: institutionId
      },
      {
        id: generateId(),
        task: 'Revisão de Folha de Pagamento',
        status: 'completed',
        department: 'RH',
        deadline: '2026-05-30',
        notes: 'Confrontado com o e-Social e sem divergências.',
        institution_id: institutionId
      }
    ];
    const { error: e10 } = await supabase.from('controls').insert(controles);
    if (e10) throw new Error('Controls: ' + e10.message);

    // 11. Contratos (contracts)
    const contratos = [
      {
        id: generateId(),
        number: '045/2026',
        object: 'Fornecimento de Merenda Escolar',
        vendor_name: 'Alimentos Saudáveis Ltda',
        amount: 150000.00,
        category: 'Pregão Eletrônico',
        status: 'active',
        deadline: '2026-12-31',
        institution_id: institutionId
      },
      {
        id: generateId(),
        number: '046/2026',
        object: 'Locação de Veículos',
        vendor_name: 'Transportes Rápidos',
        amount: 80000.00,
        category: 'Dispensa',
        status: 'review',
        deadline: '2026-12-31',
        institution_id: institutionId
      }
    ];
    const { error: e11 } = await supabase.from('contracts').insert(contratos);
    if (e11) throw new Error('Contracts: ' + e11.message);

    // 12. Numeração de Documentos (document_records)
    const docRecords = [
      {
        id: generateId(),
        type: 'Ofício',
        number: 1,
        year: 2026,
        requester: 'Gabinete do Prefeito',
        subject: 'Solicitação de reunião com Governo Estadual',
        institution_id: institutionId
      },
      {
        id: generateId(),
        type: 'Decreto',
        number: 1,
        year: 2026,
        requester: 'Administração',
        subject: 'Nomeação de Secretário',
        institution_id: institutionId
      }
    ];
    const { error: e12 } = await supabase.from('document_records').insert(docRecords);
    if (e12) throw new Error('Document Records: ' + e12.message);

    // 13. Certidões (company_certificates)
    const certidoes = [
      {
        id: generateId(),
        company_name: 'Construmax Materiais',
        cnpj: '12.345.678/0001-90',
        certificates: {
          Trabalhista: { issueDate: today, expiryDate: '2026-12-31' },
          Federal: { issueDate: today, expiryDate: '2026-12-31' },
          Estadual: null,
          Municipal: null,
          FGTS: null
        },
        institution_id: institutionId
      }
    ];
    const { error: e13 } = await supabase.from('company_certificates').insert(certidoes);
    if (e13) throw new Error('Certificates: ' + e13.message);

    console.log(`Successfully seeded mock data for institution: ${institutionId}`);
    return true;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return false;
  }
};

const resetInstitutionData = async (institutionId: string) => {
  // Limpa as tabelas (requer que a coluna institution_id exista nelas)
  const tables = [
    'appointments', 
    'medications', 
    'servicos_publicos_demandas', 
    'patrimonio', 
    'admin_users', 
    'departments',
    'protocols',
    'orders',
    'controls',
    'contracts',
    'document_records',
    'company_certificates'
  ];

  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq('institution_id', institutionId);
    } catch (e) {
      console.log(`Table ${table} cleanup failed or not supported.`, e);
    }
  }
};
