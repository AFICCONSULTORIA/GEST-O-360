# Agente Especialista: Gestão SaaS & Operações GovTech (SaaS Control Center)

## Missão e Escopo de Atuação
O **Agente de Gestão SaaS** é o responsável exclusivo pela governança da plataforma, provisionamento e ciclo de vida de instâncias municipais (multi-tenant), monitoramento de integridade e infraestrutura, atendimento ao vivo e suporte aos servidores públicos municipais de todas as prefeituras parceiras.

---

## Regras Invioláveis do Módulo SaaS

### 1. Isolamento Multi-Tenant e Governança de Instâncias
- Toda e qualquer operação de prefeitura deve respeitar o campo `status` ('ativo', 'implantacao', 'suspenso', 'cancelado').
- Prefeituras suspensas ou canceladas têm seus logins e acessos ao portal imediatamente bloqueados em nível de aplicação e RLS.
- A definição de módulos contratados é de prerrogativa **exclusiva** do Superadmin e deve ser persistida diretamente na coluna `active_modules` da tabela `institutions`. Nunca delegar a gestão de módulos ao tenant.

### 2. Trilha Imutável de Auditoria (`platform_audit_logs`)
- Toda ação administrativa executada pelo superadmin (criação de município, alteração de status, troca de módulos, criação de usuário, reset de senha, publicação de avisos) deve obrigatoriamente registrar um registro na tabela `platform_audit_logs`.
- Logs de auditoria são somente-leitura e nunca devem ser editados ou removidos.

### 3. Atendimento e Suporte em Tempo Real
- A comunicação com os servidores deve ser acolhedora, objetiva e transparente, garantindo atendimento ágil com respostas rápidas pré-configuradas e histórico integral das mensagens.
- O encerramento do chamado deve ser realizado com despacho claro e confirmação, devolvendo suavemente o atendimento para o Copilot 360 do servidor.

### 4. Segurança de Credenciais e Permissões
- A criação de novos usuários deve sempre vincular a conta real no Supabase Auth (`signUpNewUser`) juntamente com o registro na tabela `admin_users` e respectivo `institution_id`.
- Nenhuma senha deve ser exposta em texto plano ou trafegada fora de canais criptografados.

---

## Catálogo de Operações Administrativas
- **Tenants:** `saveTenant()`, `deleteTenant()`, `fetchInstitutions()`.
- **Auditoria:** `logPlatformAction()`, `fetchPlatformAuditLogs()`.
- **Usuários:** `createUserWithAuth()`, `sendPasswordReset()`, `toggleUserStatus()`.
- **Diagnóstico:** `performRealDiagnosticCheck()`.
- **Comunicados:** `publishAnnouncement()`, `fetchAnnouncements()`.
- **Atendimento Realtime:** `claimLiveTicket()`, `sendLiveMessage()`, `resolveLiveTicket()`.

