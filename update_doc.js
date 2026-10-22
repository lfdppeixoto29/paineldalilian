const fs = require('fs');
let doc = fs.readFileSync('DOCUMENTATION.md', 'utf8');
const updateLog = `\n- **Inclusão Direta de Alunos**: Adicionado botão e card de 'Incluir Aluno na Turma' diretamente no painel principal ao lado da exclusão de turma, com criação automática de registros de notas vazias em todas as matérias para os 3 trimestres.`;

if (!doc.includes('Inclusão Direta de Alunos')) {
    doc = doc.replace('## 1. Atualizações Recentes (Outubro de 2026)', '## 1. Atualizações Recentes (Outubro de 2026)' + updateLog);
    fs.writeFileSync('DOCUMENTATION.md', doc, 'utf8');
    console.log('DOCUMENTATION.md atualizado com sucesso!');
}
