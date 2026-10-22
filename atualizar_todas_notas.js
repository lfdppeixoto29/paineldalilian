const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  // Garantir todas as matérias oficiais
  const materiasOficiais = ['Inglês', 'Língua Portuguesa', 'Reforço', 'Matemática'];
  materiasOficiais.forEach(m => db.run('INSERT OR IGNORE INTO materias (nome) VALUES (?)', [m]));

  // Buscar todas as turmas e alunos
  db.all('SELECT DISTINCT turma FROM alunos', (err, turmasRows) => {
    if (!turmasRows) return;
    turmasRows.forEach(tRow => {
      const turma = tRow.turma;
      db.all('SELECT id FROM alunos WHERE turma = ?', [turma], (err, alunosRows) => {
        if (!alunosRows) return;
        alunosRows.forEach(aRow => {
          const alunoId = aRow.id;
          materiasOficiais.forEach(materia => {
            for (let trimestre = 1; trimestre <= 3; trimestre++) {
              // Verificar se já tem nota
              db.get('SELECT id FROM notas WHERE aluno_id = ? AND materia = ? AND trimestre = ?', [alunoId, materia, trimestre], (err, notaRow) => {
                if (!notaRow) {
                  // Inserir nota padrão realista baseada no ID do aluno e trimestre
                  const av1 = parseFloat((3.0 + (alunoId % 20) * 0.1).toFixed(1));
                  const av2 = parseFloat((2.5 + (trimestre * 0.5)).toFixed(1));
                  const t1 = 2.0;
                  const t2 = 1.0;
                  const t3 = 0.0;
                  const part = 1.0;
                  const faltas = alunoId % 3;

                  db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [alunoId, turma, materia, trimestre, av1, av2, t1, t2, t3, part, faltas]);
                }
              });
            }
          });
        });
      });
    });
    console.log('Notas de todas as turmas, matérias e períodos (1º, 2º e 3º Trimestre) atualizadas com sucesso!');
  });
});
