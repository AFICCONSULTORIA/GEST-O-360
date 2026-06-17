const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/alert\((['"`])Botão em desenvolvimento(['"`])\)/g, "showToast('Botão em desenvolvimento', 'warning')");

content = content.replace(/alert\("Erro ao criar usuário no Supabase: " \+ error\.message\);/g, "showToast('Erro ao criar usuário no Supabase: ' + error.message, 'error');");

content = content.replace(/alert\("Erro ao salvar nível de acesso no banco de dados: " \+ error\.message\);/g, "showToast('Erro ao salvar nível de acesso no banco de dados: ' + error.message, 'error');");

content = content.replace(/alert\("Erro ao salvar permissões no banco de dados: " \+ error\.message\);/g, "showToast('Erro ao salvar permissões no banco de dados: ' + error.message, 'error');");

content = content.replace(/alert\("Erro ao salvar arquivo. Certifique-se de que o bucket 'certidoes' público existe no Supabase. A certidão será salva sem o arquivo."\);/g, "showToast('Erro ao salvar arquivo. Bucket ausente ou sem permissões.', 'error');");

content = content.replace(/alert\('Esta certidão foi salva sem um arquivo anexado\.'\);/g, "showToast('Esta certidão foi salva sem um arquivo anexado.', 'warning');");

content = content.replace(/alert\(`Você só pode adicionar mais \$\{remainingSlots\} foto\(s\)\. O limite é 5\.`\);/g, "showToast(`Você só pode adicionar mais ${remainingSlots} foto(s). O limite é 5.`, 'warning');");

fs.writeFileSync('src/App.tsx', content);
