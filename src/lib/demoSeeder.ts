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

    // 5. Saúde: Pacientes
    const patient1Id = generateId();
    const patient2Id = generateId();
    const patients = [
      {
        id: patient1Id,
        name: 'Maria Antonieta Silva',
        cpf: '111.111.111-11',
        sus_number: '111 1111 1111 1111',
        birth_date: '1985-04-12',
        gender: 'F',
        mother_name: 'Ana Maria Silva',
        phone: '(11) 99999-9999',
        address: 'Rua das Palmeiras, 120',
        neighborhood: 'Centro',
        ubs_reference: 'UBS Central',
        blood_type: 'O+',
        conditions: 'Hipertensão Arterial, Diabetes Mellitus',
        is_pregnant: false,
        is_pcd: false,
        institution_id: institutionId
      },
      {
        id: patient2Id,
        name: 'José Ferreira dos Santos',
        cpf: '222.222.222-22',
        sus_number: '222 2222 2222 2222',
        birth_date: '1962-11-20',
        gender: 'M',
        mother_name: 'Francisca Ferreira',
        phone: '(11) 98888-8888',
        address: 'Av. Brasil, 450',
        neighborhood: 'Bairro São José',
        ubs_reference: 'UBS Bairro São José',
        blood_type: 'A+',
        conditions: 'Hipertensão Arterial',
        is_pregnant: false,
        is_pcd: false,
        institution_id: institutionId
      }
    ];
    try {
      await supabase.from('patients').insert(patients);
    } catch (e) {
      console.log('Patients seed note:', e);
    }

    // 6. Saúde: Consultas (Appointments)
    const today = new Date().toISOString().split('T')[0];
    const appointments = [
      {
        id: generateId(),
        appointment_date: `${today}`,
        appointment_time: `10:00`,
        patient_name: 'Maria Antonieta Silva',
        patient_phone: '11999999999',
        patient_cpf: '111.111.111-11',
        patient_sus: '111 1111 1111 1111',
        patient_birth_date: '1985-04-12',
        is_pregnant: false,
        is_urgent: false,
        specialty: 'Clínico Geral',
        status: 'Agendado',
        unit_name: 'UBS Central',
        doctor_name: 'Dr. Lucas Silveira',
        institution_id: institutionId
      },
      {
        id: generateId(),
        appointment_date: `${today}`,
        appointment_time: `14:30`,
        patient_name: 'José Ferreira dos Santos',
        patient_phone: '11888888888',
        patient_cpf: '222.222.222-22',
        patient_sus: '222 2222 2222 2222',
        patient_birth_date: '1962-11-20',
        is_pregnant: false,
        is_urgent: false,
        specialty: 'Cardiologia',
        status: 'Atendido',
        unit_name: 'Centro de Especialidades Médicas (CEM)',
        doctor_name: 'Dra. Beatriz Santos',
        institution_id: institutionId
      }
    ];
    const { error: e5 } = await supabase.from('appointments').insert(appointments);
    if (e5) throw new Error('Appointments: ' + e5.message);

    // 7. Farmácia: Medicamentos (Medications)
    const med1Id = generateId();
    const med2Id = generateId();
    const med3Id = generateId();
    const medications = [
      {
        id: med1Id,
        name: 'Losartana Potássica 50mg',
        active_ingredient: 'Losartana Potássica',
        dosage: '50mg',
        form: 'Comprimido',
        batch_number: 'LT-LOS2026A',
        expiration_date: '2027-02-10',
        quantity: 3500,
        institution_id: institutionId
      },
      {
        id: med2Id,
        name: 'Dipirona 500mg',
        active_ingredient: 'Dipirona Sódica',
        dosage: '500mg',
        form: 'Comprimido',
        batch_number: 'LT-DIP2026B',
        expiration_date: '2026-12-31',
        quantity: 5000,
        institution_id: institutionId
      },
      {
        id: med3Id,
        name: 'Amoxicilina 500mg',
        active_ingredient: 'Amoxicilina Tri-hidratada',
        dosage: '500mg',
        form: 'Cápsula',
        batch_number: 'LT-AMX2025C',
        expiration_date: '2025-06-30',
        quantity: 800,
        institution_id: institutionId
      }
    ];
    const { error: e6 } = await supabase.from('medications').insert(medications);
    if (e6) throw new Error('Medications: ' + e6.message);

    // 8. Saúde: Catálogo de Exames (Exam Types)
    const examTypes = [
      {
        id: generateId(),
        name: 'Hemograma Completo',
        category: 'Laboratorial',
        min_interval_days: 30,
        preparation_instructions: 'Jejum obrigatório de 4 horas.',
        estimated_cost: 15.00,
        is_active: true,
        institution_id: institutionId
      },
      {
        id: generateId(),
        name: 'Glicemia de Jejum',
        category: 'Laboratorial',
        min_interval_days: 30,
        preparation_instructions: 'Jejum de 8 a 12 horas.',
        estimated_cost: 8.50,
        is_active: true,
        institution_id: institutionId
      },
      {
        id: generateId(),
        name: 'Ultrassonografia Abdominal Total',
        category: 'Imagem',
        min_interval_days: 60,
        preparation_instructions: 'Jejum de 6h e retenção urinária.',
        estimated_cost: 95.00,
        is_active: true,
        institution_id: institutionId
      },
      {
        id: generateId(),
        name: 'Eletrocardiograma (ECG)',
        category: 'Cardiológico',
        min_interval_days: 30,
        preparation_instructions: 'Evitar cremes e loções no peito.',
        estimated_cost: 35.00,
        is_active: true,
        institution_id: institutionId
      }
    ];
    try {
      await supabase.from('exam_types').insert(examTypes);
    } catch (e) {
      console.log('Exam types seed note:', e);
    }

    // 9. Saúde: Solicitações de Exames (Exam Requests)
    // Criamos casos de teste, inclusive um exame recente (há 8 dias) para testar o alerta de duplicidade <30d
    const tenDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const examRequests = [
      {
        id: generateId().substring(0, 8),
        patient_name: 'Maria Antonieta Silva',
        patient_cpf: '111.111.111-11',
        patient_sus: '111 1111 1111 1111',
        patient_phone: '11999999999',
        patient_birth_date: '1985-04-12',
        exam_name: 'Hemograma Completo',
        category: 'Laboratorial',
        doctor_name: 'Dr. Lucas Silveira',
        doctor_crm: 'CRM 45890/SP',
        requesting_unit: 'UBS Central',
        executing_unit: 'Laboratório Central Municipal',
        requested_date: tenDaysAgo,
        performed_date: tenDaysAgo,
        status: 'Realizado',
        clinical_indication: 'Check-up de rotina',
        result_notes: 'Hemograma normal, sem alterações hematológicas.',
        institution_id: institutionId
      },
      {
        id: generateId().substring(0, 8),
        patient_name: 'José Ferreira dos Santos',
        patient_cpf: '222.222.222-22',
        patient_sus: '222 2222 2222 2222',
        patient_phone: '11888888888',
        patient_birth_date: '1962-11-20',
        exam_name: 'Eletrocardiograma (ECG)',
        category: 'Cardiológico',
        doctor_name: 'Dra. Beatriz Santos',
        doctor_crm: 'CRM 33211/SP',
        requesting_unit: 'Centro de Especialidades Médicas (CEM)',
        executing_unit: 'Policlínica Municipal',
        requested_date: today,
        scheduled_date: today,
        status: 'Agendado',
        clinical_indication: 'Acompanhamento de hipertensão',
        institution_id: institutionId
      },
      {
        id: generateId().substring(0, 8),
        patient_name: 'Maria Antonieta Silva',
        patient_cpf: '111.111.111-11',
        patient_sus: '111 1111 1111 1111',
        exam_name: 'Ultrassonografia Abdominal Total',
        category: 'Imagem',
        doctor_name: 'Dr. Roberto Mendes',
        doctor_crm: 'CRM 12098/SP',
        requesting_unit: 'UBS Central',
        requested_date: today,
        status: 'Solicitado',
        clinical_indication: 'Investigação de desconforto em hipocôndrio direito',
        institution_id: institutionId
      }
    ];
    try {
      await supabase.from('exam_requests').insert(examRequests);
    } catch (e) {
      console.log('Exam requests seed note:', e);
    }

    // 10. Farmácia: Dispensações Registradas
    const nextRefillDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dispensations = [
      {
        id: generateId().substring(0, 8),
        patient_name: 'Maria Antonieta Silva',
        patient_cpf: '111.111.111-11',
        patient_sus: '111 1111 1111 1111',
        patient_phone: '11999999999',
        medication_id: med1Id,
        medication_name: 'Losartana Potássica 50mg',
        dosage: '50mg',
        form: 'Comprimido',
        batch_number: 'LT-LOS2026A',
        quantity_dispensed: 30,
        days_of_treatment: 30,
        next_allowed_dispensation_date: nextRefillDate,
        doctor_name: 'Dr. Lucas Silveira',
        doctor_crm: 'CRM 45890/SP',
        prescription_number: 'REC-90812',
        prescription_date: tenDaysAgo,
        dispensing_unit: 'Farmácia Popular Municipal',
        pharmacist_name: 'Farmacêutico Municipal',
        institution_id: institutionId
      }
    ];
    try {
      await supabase.from('medication_dispensations').insert(dispensations);
    } catch (e) {
      console.log('Dispensations seed note:', e);
    }

    // 11. Serviços Públicos (servicos_publicos_demandas)
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

    // 12. Protocolos (protocols)
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

    // 13. Pedidos (orders)
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
      }
    ];
    const { error: e9 } = await supabase.from('orders').insert(pedidos);
    if (e9) throw new Error('Orders: ' + e9.message);

    // 14. Controles (controls)
    const controles = [
      {
        id: generateId(),
        task: 'Auditoria de Frotas - Maio',
        status: 'pending',
        department: 'Transportes',
        deadline: '2026-05-15',
        notes: 'Aguardando envio dos diários de bordo.',
        institution_id: institutionId
      }
    ];
    const { error: e10 } = await supabase.from('controls').insert(controles);
    if (e10) throw new Error('Controls: ' + e10.message);

    // 15. Contratos (contracts)
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
      }
    ];
    const { error: e11 } = await supabase.from('contracts').insert(contratos);
    if (e11) throw new Error('Contracts: ' + e11.message);

    // 16. Numeração de Documentos (document_records)
    const docRecords = [
      {
        id: generateId(),
        type: 'Ofício',
        number: 1,
        year: 2026,
        requester: 'Gabinete do Prefeito',
        subject: 'Solicitação de reunião com Governo Estadual',
        institution_id: institutionId
      }
    ];
    const { error: e12 } = await supabase.from('document_records').insert(docRecords);
    if (e12) throw new Error('Document Records: ' + e12.message);

    // 17. Certidões (company_certificates)
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

    console.log(`Successfully seeded complete mock data for institution: ${institutionId}`);
    return true;
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return false;
  }
};

const resetInstitutionData = async (institutionId: string) => {
  const tables = [
    'appointments', 
    'medications', 
    'exam_requests',
    'exam_types',
    'medication_dispensations',
    'patients',
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
      console.log(`Table ${table} cleanup skipped.`, e);
    }
  }
};
