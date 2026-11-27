import ExcelJS from 'exceljs';
import { formatCPF } from '../../../lib/masks';

export interface EducationStudentRecord {
  id: string;
  institution_id: string;
  name: string;
  cpf: string;
  birth_date: string;
  class_name: string;
  enrollment_code?: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function normalizeBirthDateToISO(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getUTCFullYear()}-${pad2(raw.getUTCMonth() + 1)}-${pad2(raw.getUTCDate())}`;
  }

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 1000 && raw < 100000) {
    const utcMs = Math.round((raw - 25569) * 86400 * 1000);
    const d = new Date(utcMs);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    }
  }

  const s = String(raw).trim();
  if (!s) return '';

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad2(Number(isoMatch[2]))}-${pad2(Number(isoMatch[3]))}`;
  }

  const brMatch = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    let year = Number(brMatch[3]);
    if (year < 100) year += year >= 30 ? 1900 : 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  return '';
}

export function formatBirthDateBR(iso?: string | null): string {
  if (!iso) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function generateStudentEnrollmentCode(cpfDigits: string): string {
  const year = new Date().getFullYear();
  const tail = cpfDigits ? cpfDigits.slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
  return `${year}${tail}${String(Math.floor(10 + Math.random() * 89))}`;
}

function triggerXlsxDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportStudentsToExcel(students: EducationStudentRecord[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Alunos Educação');
  ws.columns = [
    { header: 'Nome do Aluno', key: 'nome', width: 36 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'Data de Nascimento', key: 'nascimento', width: 20 },
    { header: 'Turma', key: 'turma', width: 20 }
  ];
  students.forEach((st) => {
    ws.addRow({
      nome: st.name,
      cpf: st.cpf ? formatCPF(st.cpf) : '',
      nascimento: formatBirthDateBR(st.birth_date),
      turma: st.class_name
    });
  });
  const buffer = await wb.xlsx.writeBuffer();
  triggerXlsxDownload(buffer, `alunos_educacao_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function downloadStudentsTemplateExcel(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Modelo Alunos');
  ws.columns = [
    { header: 'Nome do Aluno', key: 'nome', width: 36 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'Data de Nascimento', key: 'nascimento', width: 20 },
    { header: 'Turma', key: 'turma', width: 20 }
  ];
  ws.addRow({
    nome: 'Pedro Henrique Oliveira',
    cpf: '123.456.789-01',
    nascimento: '15/05/2016',
    turma: '5º Ano A'
  });
  const buffer = await wb.xlsx.writeBuffer();
  triggerXlsxDownload(buffer, 'modelo_importacao_alunos_educacao.xlsx');
}

export async function parseStudentsSpreadsheet(
  file: File,
  institutionId: string,
  currentStudents: EducationStudentRecord[]
): Promise<{ incoming: EducationStudentRecord[]; merged: EducationStudentRecord[] }> {
  const incoming: EducationStudentRecord[] = [];
  const existingByCpf = new Map<string, EducationStudentRecord>(
    currentStudents
      .filter((st) => (st.cpf || '').replace(/\D/g, '').length === 11)
      .map((st) => [st.cpf.replace(/\D/g, ''), st])
  );
  const existingOthers = currentStudents.filter((st) => (st.cpf || '').replace(/\D/g, '').length !== 11);

  const pushRow = (rawName: unknown, rawCpf: unknown, rawBirth: unknown, rawClass: unknown) => {
    const name = String(rawName ?? '').trim();
    const digits = String(rawCpf ?? '').replace(/\D/g, '');
    const cleanCpf = digits.length > 0 && digits.length < 11 ? digits.padStart(11, '0') : digits;
    const birthIso = normalizeBirthDateToISO(rawBirth);
    const className = String(rawClass ?? '').trim() || 'Sem Turma';

    if (name.length < 3 || cleanCpf.length !== 11 || !birthIso) return;

    const existing = existingByCpf.get(cleanCpf);
    const rec: EducationStudentRecord = {
      id: existing?.id || crypto.randomUUID(),
      institution_id: institutionId,
      name,
      cpf: cleanCpf,
      birth_date: birthIso,
      class_name: className !== 'Sem Turma' ? className : existing?.class_name || 'Sem Turma',
      enrollment_code: existing?.enrollment_code || generateStudentEnrollmentCode(cleanCpf)
    };
    existingByCpf.set(cleanCpf, rec);
    incoming.push(rec);
  };

  const ext = file.name.toLowerCase();
  if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
      const idxName = Math.max(0, headers.findIndex((h) => /nome|aluno|estudante/.test(h)));
      const idxCpf = Math.max(1, headers.findIndex((h) => /cpf|doc/.test(h)));
      const idxBirth = Math.max(2, headers.findIndex((h) => /nasc|data|dt|aniv/.test(h)));
      const idxClass = Math.max(3, headers.findIndex((h) => /turma|s[eé]rie|ano|classe/.test(h)));
      const start = /nome|aluno|cpf/.test(lines[0].toLowerCase()) ? 1 : 0;

      for (let i = start; i < lines.length; i++) {
        const cols = lines[i].split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
        pushRow(cols[idxName], cols[idxCpf], cols[idxBirth], cols[idxClass]);
      }
    }
  } else {
    const buffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    if (ws) {
      let cName = 1;
      let cCpf = 2;
      let cBirth = 3;
      let cClass = 4;
      let hasHeader = false;

      ws.getRow(1).eachCell((cell, colNum) => {
        const h = String(cell.value ?? '').toLowerCase();
        if (/nome|aluno|estudante/.test(h)) {
          cName = colNum;
          hasHeader = true;
        } else if (/cpf|doc/.test(h)) {
          cCpf = colNum;
          hasHeader = true;
        } else if (/nasc|data|dt|aniv/.test(h)) {
          cBirth = colNum;
          hasHeader = true;
        } else if (/turma|s[eé]rie|ano|classe/.test(h)) {
          cClass = colNum;
          hasHeader = true;
        }
      });

      ws.eachRow((row, rowNumber) => {
        if (hasHeader && rowNumber === 1) return;
        const birthCell = row.getCell(cBirth).value;
        const rawBirth =
          birthCell instanceof Date || typeof birthCell === 'number'
            ? birthCell
            : row.getCell(cBirth).text || birthCell;
        const val = (col: number) => row.getCell(col).text || row.getCell(col).value;
        pushRow(val(cName), val(cCpf), rawBirth, val(cClass));
      });
    }
  }

  const merged = [...existingOthers, ...Array.from(existingByCpf.values())].sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR')
  );
  return { incoming, merged };
}
