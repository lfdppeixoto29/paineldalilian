const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const turmasParaRemover = [
  '1º Ano A', '1º Ano B', '2º Ano A', '2º Ano B', 
  '3º Ano A', '3º Ano B'
];

db.serialize(() => {
  turmasParaRemover.forEach(turma => {
    // Excluir notas associadas aos alunos dessas turmas
    db.run('DELETE FROM notas WHERE turma = ?', [turma]);
    // Excluir alunos dessas turmas
    db.run('DELETE FROM alunos WHERE turma = ?', [turma]);
    // Excluir a turma
    db.run('DELETE FROM turmas WHERE nome = ?', [turma]);
  });
  console.log('Turmas padrão antigas removidas com sucesso! Restaram apenas as turmas oficiais importadas (901, 902, 903, 2001 EMTI, 3001, 3002).');
});
