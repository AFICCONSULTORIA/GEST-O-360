import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartPulse, Calendar, CheckCircle2, AlertTriangle, FileText, 
  XCircle, Search, Clock, Activity, CalendarCheck2, Home,
  Building2, User, Phone, MapPin, AlertCircle, Sparkles,
  Info, ShieldCheck, Check, Stethoscope, Pill, Lock, LogOut,
  UserPlus, Edit3, ShieldAlert, ArrowRight, Eye, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { 
  Patient, ExamRequest, MedicationDispensation, HealthUnit, HealthProfessional,
  COMMON_SPECIALTIES, DEFAULT_HEALTH_UNITS, 
  formatCPF, formatSUS, formatPhone, getAge,
  maskCPF, maskSUS, maskPhone, maskName, generateUUID, isValidUUID
} from './types';

interface PublicSaudePortalProps {
  darkMode: boolean;
  currentInstitution?: { id: string; name?: string } | null;
}

export const PublicSaudePortal: React.FC<PublicSaudePortalProps> = ({ darkMode, currentInstitution }) => {
  const [activeTab, setActiveTab] = useState<'agendar' | 'minha_saude' | 'cadastro'>('agendar');
  const [subTabMinhaSaude, setSubTabMinhaSaude] = useState<'consultas' | 'exames' | 'farmacia' | 'dados'>('consultas');

  // Sessão do Cidadão (Reconhecimento Seguro)
  const [currentCitizen, setCurrentCitizen] = useState<Patient | null>(null);
  
  // Login / Identificação Rápida
  const [loginCpf, setLoginCpf] = useState('');
  const [loginBirthDate, setLoginBirthDate] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Dados carregados do paciente
  const [patientAppointments, setPatientAppointments] = useState<any[]>([]);
  const [patientExams, setPatientExams] = useState<ExamRequest[]>([]);
  const [patientDispensations, setPatientDispensations] = useState<MedicationDispensation[]>([]);
  const [isLoadingHealthData, setIsLoadingHealthData] = useState(false);

  // Lista de especialidades / profissionais
  const [professionals, setProfessionals] = useState<HealthProfessional[]>([]);
  const [units, setUnits] = useState<HealthUnit[]>([]);

  // Estado do formulário de solicitação de consulta
  const [formData, setFormData] = useState({
    specialty: COMMON_SPECIALTIES[0],
    preferred_unit: 'UBS Central',
    referral_details: '',
    has_referral: false,
    notes: ''
  });
  const [isSubmittingApt, setIsSubmittingApt] = useState(false);
  const [createdProtocol, setCreatedProtocol] = useState<string | null>(null);
  const [aptError, setAptError] = useState('');

  // Estado do formulário de Primeiro Cadastro / Atualização
  const [registerForm, setRegisterForm] = useState({
    name: '',
    cpf: '',
    sus_number: '',
    birth_date: '',
    gender: 'M' as 'M' | 'F' | 'Outro',
    mother_name: '',
    phone: '',
    address: '',
    neighborhood: '',
    ubs_reference: 'UBS Central',
    blood_type: '',
    allergies: '',
    conditions: '',
    is_pregnant: false,
    is_pcd: false
  });
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');
  const [registerErrorMsg, setRegisterErrorMsg] = useState('');

  // Carregar dados gerais (unidades e especialidades)
  useEffect(() => {
    const loadMetadata = async () => {
      let profQuery = supabase.from('health_professionals').select('*');
      if (currentInstitution?.id) profQuery = profQuery.eq('institution_id', currentInstitution.id);
      const { data: profData } = await profQuery;
      if (profData) setProfessionals(profData as HealthProfessional[]);

      let unitQuery = supabase.from('health_units').select('*');
      if (currentInstitution?.id) unitQuery = unitQuery.eq('institution_id', currentInstitution.id);
      const { data: unitData } = await unitQuery;
      if (unitData) setUnits(unitData as HealthUnit[]);
    };
    loadMetadata();
  }, [currentInstitution]);

  // Carregar histórico completo do munícipe (Consultas, Exames, Farmácia)
  const loadCitizenHealthData = async (patient: Patient) => {
    setIsHealthDataLoading();
    setIsLoadingHealthData(true);
    try {
      const cleanCpf = (patient.cpf || '').replace(/\D/g, '');

      // 1. Consultas do paciente
      let aptQuery = supabase.from('appointments').select('*');
      if (cleanCpf) {
        aptQuery = aptQuery.or(`patient_cpf.eq.${patient.cpf},patient_cpf.eq.${cleanCpf},patient_id.eq.${patient.id}`);
      } else {
        aptQuery = aptQuery.eq('patient_id', patient.id);
      }
      if (currentInstitution?.id) aptQuery = aptQuery.eq('institution_id', currentInstitution.id);
      const { data: aptData } = await aptQuery.order('created_at', { ascending: false });
      if (aptData) setPatientAppointments(aptData);

      // 2. Exames do paciente
      let examQuery = supabase.from('exam_requests').select('*');
      if (cleanCpf) {
        examQuery = examQuery.or(`patient_cpf.eq.${patient.cpf},patient_cpf.eq.${cleanCpf},patient_id.eq.${patient.id}`);
      } else {
        examQuery = examQuery.eq('patient_id', patient.id);
      }
      if (currentInstitution?.id) examQuery = examQuery.eq('institution_id', currentInstitution.id);
      const { data: examData } = await examQuery.order('requested_date', { ascending: false });
      if (examData) setPatientExams(examData as ExamRequest[]);

      // 3. Dispensações da Farmácia Popular
      let dispQuery = supabase.from('medication_dispensations').select('*');
      if (cleanCpf) {
        dispQuery = dispQuery.or(`patient_cpf.eq.${patient.cpf},patient_cpf.eq.${cleanCpf},patient_id.eq.${patient.id}`);
      } else {
        dispQuery = dispQuery.eq('patient_id', patient.id);
      }
      if (currentInstitution?.id) dispQuery = dispQuery.eq('institution_id', currentInstitution.id);
      const { data: dispData } = await dispQuery.order('created_at', { ascending: false });
      if (dispData) setPatientDispensations(dispData as MedicationDispensation[]);
    } catch (err) {
      console.error('Erro ao carregar prontuário do munícipe:', err);
    } finally {
      setIsLoadingHealthData(false);
    }
  };

  const setIsHealthDataLoading = () => {};

  // =========================================================
  // HANDLER: AUTENTICAÇÃO / IDENTIFICAÇÃO SEGURA DO CIDADÃO
  // =========================================================
  const handleAuthenticateCitizen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const cleanCpf = loginCpf.replace(/\D/g, '');
      if (cleanCpf.length < 11) {
        setLoginError('Por favor, digite um CPF válido com 11 dígitos.');
        setIsLoggingIn(false);
        return;
      }
      if (!loginBirthDate) {
        setLoginError('Por favor, informe sua Data de Nascimento.');
        setIsLoggingIn(false);
        return;
      }

      // Consulta segura por CPF (formatado ou puro) e data de nascimento
      let query = supabase.from('patients').select('*');
      query = query.or(`cpf.eq.${loginCpf},cpf.eq.${cleanCpf}`);
      query = query.eq('birth_date', loginBirthDate);
      if (currentInstitution?.id) {
        query = query.eq('institution_id', currentInstitution.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoginError('Nenhum cadastro encontrado com este CPF e Data de Nascimento na rede municipal.');
        return;
      }

      const patient = data as Patient;
      setCurrentCitizen(patient);
      setShowLoginModal(false);
      loadCitizenHealthData(patient);

      // Preenche o formulário de cadastro caso queira editar
      setRegisterForm({
        name: patient.name,
        cpf: patient.cpf,
        sus_number: patient.sus_number,
        birth_date: patient.birth_date || '',
        gender: patient.gender || 'M',
        mother_name: patient.mother_name || '',
        phone: patient.phone || '',
        address: patient.address || '',
        neighborhood: patient.neighborhood || '',
        ubs_reference: patient.ubs_reference || 'UBS Central',
        blood_type: patient.blood_type || '',
        allergies: patient.allergies || '',
        conditions: patient.conditions || '',
        is_pregnant: patient.is_pregnant || false,
        is_pcd: patient.is_pcd || false
      });
    } catch (err: any) {
      console.error(err);
      setLoginError('Erro ao validar identificação: ' + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentCitizen(null);
    setPatientAppointments([]);
    setPatientExams([]);
    setPatientDispensations([]);
    setLoginCpf('');
    setLoginBirthDate('');
    setCreatedProtocol(null);
  };

  // =========================================================
  // HANDLER: PRIMEIRO CADASTRO OU ATUALIZAÇÃO DO MUNÍCIPE
  // =========================================================
  const handleSavePatientProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRegister(true);
    setRegisterErrorMsg('');
    setRegisterSuccessMsg('');

    try {
      const payload = {
        name: registerForm.name,
        cpf: registerForm.cpf,
        sus_number: registerForm.sus_number,
        birth_date: registerForm.birth_date || null,
        gender: registerForm.gender,
        mother_name: registerForm.mother_name || null,
        phone: registerForm.phone || null,
        address: registerForm.address || null,
        neighborhood: registerForm.neighborhood || null,
        ubs_reference: registerForm.ubs_reference || 'UBS Central',
        blood_type: registerForm.blood_type || null,
        allergies: registerForm.allergies || null,
        conditions: registerForm.conditions || null,
        is_pregnant: registerForm.is_pregnant,
        is_pcd: registerForm.is_pcd,
        institution_id: currentInstitution?.id || null
      };

      if (currentCitizen) {
        // Atualizar dados existentes
        const { error } = await supabase.from('patients').update(payload).eq('id', currentCitizen.id);
        if (error) throw error;
        setRegisterSuccessMsg('Seus dados cadastrais foram atualizados com sucesso no sistema da Saúde!');
        const updated = { ...currentCitizen, ...payload };
        setCurrentCitizen(updated);
      } else {
        // Inserir novo cadastro
        const { data: newPatient, error } = await supabase
          .from('patients')
          .insert([payload])
          .select('*')
          .single();

        if (error) throw error;

        setRegisterSuccessMsg('Cadastro realizado com sucesso! Você já está registrado na rede de Saúde.');
        setCurrentCitizen(newPatient as Patient);
        loadCitizenHealthData(newPatient as Patient);
        setActiveTab('agendar');
      }
    } catch (err: any) {
      console.error(err);
      setRegisterErrorMsg('Erro ao salvar cadastro: ' + err.message);
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  // =========================================================
  // HANDLER: ENVIAR NOVA SOLICITAÇÃO (AUTOPREENCHIDA)
  // =========================================================
  const handleSubmitAgendamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCitizen) {
      setShowLoginModal(true);
      return;
    }

    setIsSubmittingApt(true);
    setAptError('');

    try {
      const generatedProtocol = Math.random().toString(36).substring(2, 8).toUpperCase();
      const institutionId = currentInstitution?.id || null;

      const newAppointment = {
        id: generateUUID(),
        patient_id: currentCitizen.id,
        patient_name: currentCitizen.name,
        patient_cpf: currentCitizen.cpf,
        patient_sus: currentCitizen.sus_number,
        patient_phone: currentCitizen.phone,
        patient_birth_date: currentCitizen.birth_date,
        is_pregnant: currentCitizen.is_pregnant,
        is_urgent: false,
        specialty: formData.specialty,
        unit_name: formData.preferred_unit || currentCitizen.ubs_reference || 'UBS Central',
        referral_details: formData.specialty === 'Clínico Geral' ? null : formData.referral_details,
        appointment_date: new Date().toISOString().split('T')[0],
        status: 'Aguardando Regulação',
        notes: formData.notes ? `[SOLICITAÇÃO WEB]: ${formData.notes}` : null,
        institution_id: institutionId
      };

      const { error: dbError } = await supabase.from('appointments').insert(newAppointment);
      if (dbError) throw dbError;

      setCreatedProtocol(generatedProtocol);
      loadCitizenHealthData(currentCitizen);
    } catch (err: any) {
      console.error(err);
      setAptError('Ocorreu um erro ao enviar sua solicitação. Por favor, tente novamente: ' + err.message);
    } finally {
      setIsSubmittingApt(false);
    }
  };

  // =========================================================
  // HANDLER: CANCELAMENTO VOLUNTÁRIO PELO MUNÍCIPE
  // =========================================================
  const handleCancelByCitizen = async (appointmentId: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar esta solicitação e liberar a vaga para outro munícipe?')) return;

    try {
      const { error } = await supabase.from('appointments').update({
        status: 'Cancelado',
        cancellation_reason: 'Cancelamento voluntário solicitado pelo munícipe no Portal da Saúde.'
      }).eq('id', appointmentId);

      if (error) throw error;
      alert('Sua solicitação foi cancelada com sucesso. Obrigado por nos avisar, isso permite adiantar o atendimento de outros munícipes!');
      if (currentCitizen) loadCitizenHealthData(currentCitizen);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao cancelar: ' + err.message);
    }
  };

  return (
    <div className={`min-h-screen py-10 px-4 flex flex-col items-center font-sans ${darkMode ? 'bg-neutral-950 text-white' : 'bg-neutral-50 text-neutral-900'}`}>
      
      {/* Barra Superior de Navegação & Status LGPD */}
      <div className="w-full max-w-4xl flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>Ambiente Seguro e Conforme à <strong>LGPD (Lei nº 13.709/2018)</strong></span>
        </div>

        <div className="flex items-center gap-2">
          {currentCitizen ? (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 rounded-2xl text-xs">
              <User size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                {maskName(currentCitizen.name)}
              </span>
              <span className="text-neutral-400 font-mono text-[11px]">
                ({maskCPF(currentCitizen.cpf)})
              </span>
              <button 
                onClick={handleLogout}
                title="Encerrar Sessão / Trocar Paciente"
                className="ml-2 p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors flex items-center gap-1 font-bold text-[10px]"
              >
                <LogOut size={12} /> Sair
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Lock size={14} /> Entrar / Identificar-se
            </button>
          )}

          <a
            href="/"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
              darkMode 
                ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border-neutral-700' 
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-200'
            } border shadow-sm`}
          >
            <Home size={14} /> Início
          </a>
        </div>
      </div>

      {/* Container Principal */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden border ${
          darkMode ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-100'
        }`}
      >
        {/* Banner do Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 p-8 md:p-10 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <HeartPulse size={48} className="mx-auto mb-3 text-emerald-100 drop-shadow-md" />
          <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
            {currentInstitution?.name || 'Prefeitura Municipal'} · Secretaria de Saúde
          </h1>
          <p className="text-emerald-100 font-medium text-xs md:text-sm mt-1 max-w-xl mx-auto">
            Autoatendimento Oficial do SUS: Solicite consultas, acompanhe sua posição na fila de regulação, exames e medicamentos da Farmácia Popular.
          </p>
        </div>

        {/* Barra de Navegação das Abas Principais */}
        <div className="flex justify-center p-6 md:p-8 pb-0">
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl w-full max-w-2xl flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('agendar')}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'agendar' 
                  ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Calendar size={14} /> Nova Solicitação
            </button>

            <button
              onClick={() => {
                if (!currentCitizen) {
                  setShowLoginModal(true);
                } else {
                  setActiveTab('minha_saude');
                }
              }}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'minha_saude' 
                  ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Activity size={14} /> Minha Saúde 360°
              {currentCitizen && patientAppointments.filter(a => a.status === 'Agendado').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('cadastro')}
              className={`flex-1 py-3 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'cadastro' 
                  ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <UserPlus size={14} /> {currentCitizen ? 'Meus Dados' : 'Primeiro Cadastro'}
            </button>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-6 md:p-10 pt-6">
          <AnimatePresence mode="wait">

            {/* ========================================================= */}
            {/* ABA 1: NOVA SOLICITAÇÃO (AUTOPREENCHIDA)                  */}
            {/* ========================================================= */}
            {activeTab === 'agendar' && (
              createdProtocol ? (
                /* Confirmação de Sucesso */
                <motion.div 
                  key="sucesso"
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-6 space-y-6"
                >
                  <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={44} />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">Solicitação Registrada na Fila do SUS!</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                      Seu pedido de consulta para <strong className="text-emerald-600 dark:text-emerald-400">{formData.specialty}</strong> foi registrado e vinculado ao seu prontuário com sucesso.
                    </p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-3xl p-6 max-w-md mx-auto text-left space-y-3">
                    <div className="flex justify-between items-center border-b border-emerald-200/60 pb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Protocolo da Solicitação</span>
                      <span className="font-mono font-black text-lg text-emerald-800 dark:text-emerald-200">{createdProtocol}</span>
                    </div>

                    <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                      <p><strong>Paciente:</strong> {currentCitizen ? maskName(currentCitizen.name) : 'Munícipe'}</p>
                      <p><strong>CPF:</strong> {currentCitizen ? maskCPF(currentCitizen.cpf) : '---'}</p>
                      <p><strong>Unidade de Referência:</strong> {formData.preferred_unit}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto">
                    <button 
                      onClick={() => {
                        setCreatedProtocol(null);
                        setActiveTab('minha_saude');
                      }}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Activity size={16} /> Acompanhar Minhas Solicitações
                    </button>
                    <button 
                      onClick={() => setCreatedProtocol(null)}
                      className="px-5 py-3.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-2xl font-bold text-xs transition-colors"
                    >
                      Nova Solicitação
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Formulário de Solicitação */
                <motion.div 
                  key="form-agendar"
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Se o cidadão AINDA NÃO está identificado, exibe card de login / identificação segura */}
                  {!currentCitizen ? (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 md:p-8 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
                        <Lock size={24} />
                      </div>
                      <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-lg font-black text-neutral-900 dark:text-white">Identifique-se para Preenchimento Automático</h3>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          Informe seu CPF e Data de Nascimento. Seus dados cadastrais serão reconhecidos de forma segura, sem expor seu CPF e sem precisar redigitar tudo.
                        </p>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          onClick={() => setShowLoginModal(true)}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Lock size={15} /> Entrar com CPF & Nascimento
                        </button>
                        <button
                          onClick={() => setActiveTab('cadastro')}
                          className="px-6 py-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
                        >
                          <UserPlus size={15} /> Primeiro Cadastro no SUS
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Cidadão Identificado: Banner com dados reconhecidos e autopreenchidos */
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                          {currentCitizen.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                              Cadastro Verificado ✓
                            </span>
                            <span className="text-xs text-neutral-400">
                              {getAge(currentCitizen.birth_date)} anos
                            </span>
                          </div>
                          <h3 className="text-base font-black text-neutral-900 dark:text-white mt-0.5">
                            {currentCitizen.name}
                          </h3>
                          <p className="text-xs text-neutral-500 font-mono">
                            CPF: {maskCPF(currentCitizen.cpf)} · SUS: {maskSUS(currentCitizen.sus_number)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleLogout}
                        className="text-xs font-bold text-neutral-500 hover:text-rose-600 underline transition-colors"
                      >
                        Não é você? Trocar de paciente
                      </button>
                    </div>
                  )}

                  {/* Formulário de Envio da Consulta */}
                  <form onSubmit={handleSubmitAgendamento} className="space-y-6">
                    {aptError && (
                      <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-2">
                        <XCircle size={16} /> {aptError}
                      </div>
                    )}

                    <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                        <Stethoscope size={16} className="text-emerald-500" />
                        Detalhes da Consulta
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Especialidade Médica Desejada *</label>
                          <select 
                            value={formData.specialty}
                            onChange={e => setFormData({...formData, specialty: e.target.value})}
                            required
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                          >
                            {professionals.length > 0
                              ? Array.from(new Set(professionals.map(p => p.specialty))).map(s => <option key={s} value={s}>{s}</option>)
                              : COMMON_SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Unidade de Atendimento de Preferência</label>
                          <select 
                            value={formData.preferred_unit}
                            onChange={e => setFormData({...formData, preferred_unit: e.target.value})}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                          >
                            {units.length > 0
                              ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                              : DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>

                        {formData.specialty !== 'Clínico Geral' && (
                          <div className="md:col-span-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">
                              Médico Solicitante / Encaminhamento da UBS *
                            </label>
                            <input 
                              type="text" required
                              value={formData.referral_details}
                              onChange={e => setFormData({...formData, referral_details: e.target.value})}
                              placeholder="Ex: Dr. Carlos (UBS Central) - CRM 12345"
                              className="w-full bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 px-4 py-2.5 rounded-xl text-xs outline-none dark:text-white"
                            />
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                              <input 
                                type="checkbox" required
                                checked={formData.has_referral}
                                onChange={e => setFormData({...formData, has_referral: e.target.checked})}
                                className="rounded text-amber-600"
                              />
                              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                Declaro que possuo o encaminhamento físico em mãos para apresentar na consulta. *
                              </span>
                            </label>
                          </div>
                        )}

                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Motivo / Principais Sintomas (Opcional)</label>
                          <textarea 
                            rows={3}
                            value={formData.notes}
                            onChange={e => setFormData({...formData, notes: e.target.value})}
                            placeholder="Descreva brevemente o motivo da consulta para orientar a equipe de triagem..."
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmittingApt}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingApt ? 'Registrando Solicitação...' : <><Calendar size={18} /> Enviar Solicitação para a Fila do SUS</>}
                    </button>
                  </form>
                </motion.div>
              )
            )}

            {/* ========================================================= */}
            {/* ABA 2: MINHA SAÚDE 360° (PRONTUÁRIO DO CIDADÃO & LGPD)   */}
            {/* ========================================================= */}
            {activeTab === 'minha_saude' && (
              <motion.div 
                key="minha-saude"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {!currentCitizen ? (
                  <div className="text-center py-12 space-y-4">
                    <Lock size={36} className="mx-auto text-neutral-400" />
                    <h3 className="text-lg font-black">Área Restrita do Munícipe</h3>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Identifique-se com seu CPF e Data de Nascimento para visualizar suas consultas, exames e remédios retirados.
                    </p>
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="px-6 py-3 bg-emerald-600 text-white font-bold text-xs rounded-2xl shadow-md"
                    >
                      Entrar no Meu Prontuário
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Sub-menu do Prontuário */}
                    <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-2xl gap-1 flex-wrap">
                      <button
                        onClick={() => setSubTabMinhaSaude('consultas')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          subTabMinhaSaude === 'consultas'
                            ? 'bg-white dark:bg-neutral-900 text-emerald-600 shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Calendar size={14} /> Minhas Consultas ({patientAppointments.length})
                      </button>

                      <button
                        onClick={() => setSubTabMinhaSaude('exames')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          subTabMinhaSaude === 'exames'
                            ? 'bg-white dark:bg-neutral-900 text-blue-600 shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Activity size={14} /> Meus Exames ({patientExams.length})
                      </button>

                      <button
                        onClick={() => setSubTabMinhaSaude('farmacia')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          subTabMinhaSaude === 'farmacia'
                            ? 'bg-white dark:bg-neutral-900 text-purple-600 shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Pill size={14} /> Farmácia Popular ({patientDispensations.length})
                      </button>

                      <button
                        onClick={() => setSubTabMinhaSaude('dados')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          subTabMinhaSaude === 'dados'
                            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-800'
                        }`}
                      >
                        <Edit3 size={14} /> Atualizar Meus Contatos
                      </button>
                    </div>

                    {/* SUB-ABA 1: CONSULTAS & FILA */}
                    {subTabMinhaSaude === 'consultas' && (
                      <div className="space-y-4">
                        {patientAppointments.length === 0 ? (
                          <div className="p-12 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                            <CalendarCheck2 size={36} className="mx-auto mb-2 text-neutral-300" />
                            <p className="font-bold text-sm">Você não possui consultas ou solicitações registradas.</p>
                            <button
                              onClick={() => setActiveTab('agendar')}
                              className="mt-4 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md"
                            >
                              Fazer Nova Solicitação
                            </button>
                          </div>
                        ) : (
                          patientAppointments.map(apt => (
                            <div key={apt.id} className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] font-mono text-neutral-400">Protocolo: {apt.id.substring(0, 8).toUpperCase()}</span>
                                  <h4 className="text-base font-black text-neutral-900 dark:text-white">{apt.specialty}</h4>
                                  <p className="text-xs text-neutral-500">Unidade: {apt.unit_name || 'UBS de Referência'}</p>
                                </div>
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                                  apt.status === 'Agendado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                  apt.status === 'Atendido' ? 'bg-blue-100 text-blue-800' :
                                  apt.status === 'Cancelado' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse'
                                }`}>
                                  {apt.status}
                                </span>
                              </div>

                              {apt.status === 'Agendado' && (
                                <div className="p-4 bg-emerald-100/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs space-y-1">
                                  <p className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                                    <CheckCircle2 size={14} /> Consulta Confirmada!
                                  </p>
                                  <p><strong>Data:</strong> {apt.appointment_date?.split('-').reverse().join('/')} às <strong>{apt.appointment_time || '08:00'}</strong></p>
                                  <p><strong>Médico:</strong> {apt.doctor_name || 'Profissional da Rede'}</p>
                                </div>
                              )}

                              {apt.status === 'Aguardando Regulação' && (
                                <div className="flex justify-between items-center pt-2">
                                  <span className="text-[11px] text-neutral-400">Aguardando definição de data pela regulação médica.</span>
                                  <button
                                    onClick={() => handleCancelByCitizen(apt.id)}
                                    className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                                  >
                                    Não preciso mais / Liberar vaga
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUB-ABA 2: EXAMES */}
                    {subTabMinhaSaude === 'exames' && (
                      <div className="space-y-4">
                        {patientExams.length === 0 ? (
                          <div className="p-12 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                            <Activity size={36} className="mx-auto mb-2 text-neutral-300" />
                            <p className="font-bold text-sm">Nenhum exame prescrito ou registrado para seu CPF.</p>
                          </div>
                        ) : (
                          patientExams.map(exam => (
                            <div key={exam.id} className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-2 text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-base font-black text-neutral-900 dark:text-white">{exam.exam_name}</h4>
                                  <p className="text-[11px] text-neutral-400">Categoria: {exam.category} · Solicitante: {exam.doctor_name}</p>
                                </div>
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                                  exam.status === 'Realizado' ? 'bg-emerald-100 text-emerald-700' :
                                  exam.status === 'Agendado' ? 'bg-purple-100 text-purple-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {exam.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-neutral-500 pt-1">
                                <span>Solicitado em: {exam.requested_date?.split('-').reverse().join('/')}</span>
                                {exam.scheduled_date && <span>Data Agendada: {exam.scheduled_date.split('-').reverse().join('/')}</span>}
                              </div>

                              {exam.result_notes && (
                                <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 mt-2">
                                  <span className="font-bold block text-neutral-800 dark:text-neutral-200">Resultado / Laudo:</span>
                                  <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">{exam.result_notes}</p>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUB-ABA 3: FARMÁCIA POPULAR */}
                    {subTabMinhaSaude === 'farmacia' && (
                      <div className="space-y-4">
                        {patientDispensations.length === 0 ? (
                          <div className="p-12 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-100 dark:border-neutral-800">
                            <Pill size={36} className="mx-auto mb-2 text-neutral-300" />
                            <p className="font-bold text-sm">Nenhuma retirada de medicamentos registrada em seu nome.</p>
                          </div>
                        ) : (
                          patientDispensations.map(disp => (
                            <div key={disp.id} className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-3 text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-base font-black text-emerald-700 dark:text-emerald-300">{disp.medication_name}</h4>
                                  <p className="text-neutral-400">{disp.dosage} - {disp.form}</p>
                                </div>
                                <span className="font-black text-sm text-emerald-600">{disp.quantity_dispensed} un.</span>
                              </div>

                              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-900 dark:text-amber-200">
                                <strong>📅 Próxima retirada liberada a partir de:</strong> {disp.next_allowed_dispensation_date?.split('-').reverse().join('/') || '---'}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-neutral-500 text-[11px]">
                                <span>Retirado em: {disp.created_at ? new Date(disp.created_at).toLocaleDateString('pt-BR') : '---'}</span>
                                <span>Prescritor: {disp.doctor_name || 'Médico da Rede'}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* SUB-ABA 4: ATUALIZAÇÃO CADASTRAL */}
                    {subTabMinhaSaude === 'dados' && (
                      <form onSubmit={handleSavePatientProfile} className="space-y-4">
                        {registerSuccessMsg && (
                          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold">
                            {registerSuccessMsg}
                          </div>
                        )}
                        <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                          <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">
                            Atualização de Contato e Endereço
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Telefone / WhatsApp</label>
                              <input 
                                type="text" required
                                value={registerForm.phone}
                                onChange={e => setRegisterForm({...registerForm, phone: formatPhone(e.target.value)})}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Bairro</label>
                              <input 
                                type="text"
                                value={registerForm.neighborhood}
                                onChange={e => setRegisterForm({...registerForm, neighborhood: e.target.value})}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                              />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Endereço Completo</label>
                              <input 
                                type="text"
                                value={registerForm.address}
                                onChange={e => setRegisterForm({...registerForm, address: e.target.value})}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                              />
                            </div>
                          </div>
                        </div>

                        <button 
                          type="submit"
                          disabled={isSubmittingRegister}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20"
                        >
                          {isSubmittingRegister ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* ABA 3: PRIMEIRO CADASTRO NO SUS MUNICIPAL                 */}
            {/* ========================================================= */}
            {activeTab === 'cadastro' && (
              <motion.div 
                key="form-cadastro"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="border-b border-neutral-100 dark:border-neutral-800 pb-4">
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">
                    {currentCitizen ? 'Ficha Cadastral do Munícipe' : 'Primeiro Cadastro no SUS Municipal'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Cadastre-se uma única vez para acessar agendamentos, histórico de exames e retirada de remédios.
                  </p>
                </div>

                {registerSuccessMsg && (
                  <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={18} /> {registerSuccessMsg}
                  </div>
                )}
                {registerErrorMsg && (
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <XCircle size={18} /> {registerErrorMsg}
                  </div>
                )}

                <form onSubmit={handleSavePatientProfile} className="space-y-4">
                  <div className="bg-neutral-50 dark:bg-neutral-800/40 p-6 rounded-3xl border border-neutral-100 dark:border-neutral-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome Completo *</label>
                        <input 
                          type="text" required
                          value={registerForm.name} onChange={e => setRegisterForm({...registerForm, name: e.target.value})}
                          placeholder="Ex: João da Silva Santos"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CPF *</label>
                        <input 
                          type="text" required
                          value={registerForm.cpf} onChange={e => setRegisterForm({...registerForm, cpf: formatCPF(e.target.value)})}
                          placeholder="000.000.000-00"
                          disabled={!!currentCitizen}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Cartão Nacional do SUS *</label>
                        <input 
                          type="text" required
                          value={registerForm.sus_number} onChange={e => setRegisterForm({...registerForm, sus_number: formatSUS(e.target.value)})}
                          placeholder="000 0000 0000 0000"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data de Nascimento *</label>
                        <input 
                          type="date" required
                          value={registerForm.birth_date} onChange={e => setRegisterForm({...registerForm, birth_date: e.target.value})}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Telefone / WhatsApp *</label>
                        <input 
                          type="text" required
                          value={registerForm.phone} onChange={e => setRegisterForm({...registerForm, phone: formatPhone(e.target.value)})}
                          placeholder="(00) 00000-0000"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome da Mãe</label>
                        <input 
                          type="text"
                          value={registerForm.mother_name} onChange={e => setRegisterForm({...registerForm, mother_name: e.target.value})}
                          placeholder="Ex: Maria de Souza Santos"
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Bairro</label>
                        <input 
                          type="text"
                          value={registerForm.neighborhood} onChange={e => setRegisterForm({...registerForm, neighborhood: e.target.value})}
                          placeholder="Ex: Centro, Bairro São José..."
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">UBS Mais Próxima</label>
                        <select 
                          value={registerForm.ubs_reference} onChange={e => setRegisterForm({...registerForm, ubs_reference: e.target.value})}
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-bold outline-none dark:text-white"
                        >
                          {units.length > 0
                            ? units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)
                            : DEFAULT_HEALTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center gap-6 md:col-span-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={registerForm.is_pregnant}
                            onChange={e => setRegisterForm({...registerForm, is_pregnant: e.target.checked})}
                            className="rounded text-amber-500"
                          />
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Paciente Gestante</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={registerForm.is_pcd}
                            onChange={e => setRegisterForm({...registerForm, is_pcd: e.target.checked})}
                            className="rounded text-purple-500"
                          />
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Pessoa com Deficiência (PCD)</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isSubmittingRegister}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmittingRegister ? 'Gravando no Sistema...' : <><Check size={18} /> Salvar Cadastro no SUS Municipal</>}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* MODAL: LOGIN / IDENTIFICAÇÃO SEGURA EM 2 FATORES (LGPD)   */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-neutral-100 dark:border-neutral-800 p-6 space-y-5 text-neutral-900 dark:text-white"
            >
              <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base">Identificação Segura</h3>
                    <p className="text-[10px] text-neutral-400">Conforme diretrizes da LGPD</p>
                  </div>
                </div>
                <button onClick={() => setShowLoginModal(false)} className="p-1 text-neutral-400 hover:text-neutral-600">
                  <XCircle size={20} />
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" /> {loginError}
                </div>
              )}

              <form onSubmit={handleAuthenticateCitizen} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">CPF do Munícipe</label>
                  <input 
                    type="text" required
                    value={loginCpf}
                    onChange={e => setLoginCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs font-mono outline-none dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Data de Nascimento</label>
                  <input 
                    type="date" required
                    value={loginBirthDate}
                    onChange={e => setLoginBirthDate(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-xs outline-none dark:text-white"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoggingIn ? 'Validando Dados...' : <><ArrowRight size={16} /> Entrar e Preencher Automaticamente</>}
                </button>
              </form>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-center">
                <p className="text-xs text-neutral-500">Ainda não tem cadastro na rede de saúde?</p>
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    setRegisterForm(prev => ({ ...prev, cpf: loginCpf, birth_date: loginBirthDate }));
                    setActiveTab('cadastro');
                  }}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-1 cursor-pointer"
                >
                  Cadastrar-se no SUS Municipal agora →
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
