import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn()
}));

vi.mock('../../supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: vi.fn()
  },
  supabaseAnon: {
    rpc: mockRpc,
    from: vi.fn()
  }
}));

import {
  calculateLdbAttendanceSummary,
  authenticateFamilyStudentByCpfBirth,
  acknowledgeFamilyAnnouncement
} from '../education';

describe('Regras Críticas de Educação (LDB, LGPD e Multi-Tenant)', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe('calculateLdbAttendanceSummary (LDB Art. 24 e 31)', () => {
    it('exige 75% de frequência mínima no Ensino Fundamental', () => {
      const ok = calculateLdbAttendanceSummary(200, 50, '4º Ano A');
      expect(ok.isInfantil).toBe(false);
      expect(ok.minLegalAttendance).toBe(75);
      expect(ok.attendanceRate).toBe(75);
      expect(ok.isCompliant).toBe(true);

      const alert = calculateLdbAttendanceSummary(200, 51, '5º Ano B');
      expect(alert.attendanceRate).toBe(74.5);
      expect(alert.isCompliant).toBe(false);
    });

    it('exige 60% de frequência mínima na Educação Infantil (Creche/Pré-escola)', () => {
      const ok = calculateLdbAttendanceSummary(200, 80, 'Maternal II - CMEI');
      expect(ok.isInfantil).toBe(true);
      expect(ok.minLegalAttendance).toBe(60);
      expect(ok.attendanceRate).toBe(60);
      expect(ok.isCompliant).toBe(true);

      const alert = calculateLdbAttendanceSummary(200, 82, 'Berçário I');
      expect(alert.isInfantil).toBe(true);
      expect(alert.attendanceRate).toBe(59);
      expect(alert.isCompliant).toBe(false);
    });

    it('trata limites de faltas negativas ou acima do total de dias letivos', () => {
      expect(calculateLdbAttendanceSummary(200, -5, '4º Ano A').attendanceRate).toBe(100);
      expect(calculateLdbAttendanceSummary(200, 250, '4º Ano A').attendanceRate).toBe(0);
    });
  });

  describe('authenticateFamilyStudentByCpfBirth (LGPD RPC)', () => {
    it('rejeita CPF incompleto ou data ausente antes de consultar o banco', async () => {
      const res = await authenticateFamilyStudentByCpfBirth('inst_torixoreu', '123.456', '2016-05-10');
      expect(res.found).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('chama RPC get_family_student_by_cpf_birth com institution_id e CPF sanitizado', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          found: true,
          student: {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Ana Silva',
            className: '4º Ano A',
            institutionId: 'inst_torixoreu'
          }
        },
        error: null
      });

      const res = await authenticateFamilyStudentByCpfBirth(
        'inst_torixoreu',
        '123.456.789-01',
        '2016-05-10'
      );

      expect(mockRpc).toHaveBeenCalledWith('get_family_student_by_cpf_birth', {
        p_institution_id: 'inst_torixoreu',
        p_cpf: '12345678901',
        p_birth_date: '2016-05-10'
      });
      expect(res.found).toBe(true);
      expect(res.student?.name).toBe('Ana Silva');
      expect(res.student?.institutionId).toBe('inst_torixoreu');
    });
  });

  describe('acknowledgeFamilyAnnouncement (Persistência Ciente)', () => {
    it('ignora IDs inválidos que não sejam UUID', async () => {
      const ok = await acknowledgeFamilyAnnouncement('invalido', '11111111-1111-1111-1111-111111111111');
      expect(ok).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('persiste confirmação Ciente via RPC com institution_id', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const ok = await acknowledgeFamilyAnnouncement(
        'c0000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000001',
        true,
        'inst_torixoreu'
      );

      expect(ok).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('acknowledge_family_announcement', {
        p_institution_id: 'inst_torixoreu',
        p_announcement_id: 'c0000000-0000-0000-0000-000000000001',
        p_student_id: '00000000-0000-0000-0000-000000000001',
        p_acknowledged: true
      });
    });
  });
});
