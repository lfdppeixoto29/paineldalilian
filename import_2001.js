const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const alunosTurma2001 = [
  'ANDRESSA MARIA VITO GRACIANO', 'BRENDA ROSA MOREIRA DA SILVA VIANA', 
  'KAMILLY VICTÓRIA FREITAS MARCILIO', 'KIARA OLIVEIRA MEDEIROS', 
  'LARA DE OLIVEIRA MOTTA', 'LEONNY DA SILVA FURTADO', 
  'MARIA PAULA BARTHOLAZZI COSTA', 'NICOLLY MOURA SILVA', 
  'PAULA DE SOUZA DA SILVA', 'PEDRO HENRIQUE CARDOSO RANGEL', 
  'VITÓRIA MARIA RODRIGUES MACHADO'
];

const notas2001 = {
  'ANDRESSA MARIA VITO GRACIANO': { av1: 2.3, av2: 3.0, t1: 2.0, t2: 1.0, faltas: 0 },
  'BRENDA ROSA MOREIRA DA SILVA VIANA': { av1: 2.7, av2: 0.2, t1: 1.6, t2: 0.5, faltas: 3 },
  'KAMILLY VICTÓRIA FREITAS MARCILIO': { av1: 2.2, av2: 3.0, t1: 2.0, t2: 0.5, faltas: 0 },
  'KIARA OLIVEIRA MEDEIROS': { av1: 3.3, av2: 3.0, t1: 1.6, t2: 0.5, faltas: 0 },
  'LARA DE OLIVEIRA MOTTA': { av1: 3.3, av2: 3.0, t1: 2.0, t2: 1.0, faltas: 0 },
  'LEONNY DA SILVA FURTADO': { av1: 2.7, av2: 0.0, t1: 1.7, t2: 1.0, faltas: 0 },
  'MARIA PAULA BARTHOLAZZI COSTA': { av1: 2.9, av2: 3.0, t1: 1.8, t2: 0.5, faltas: 0 },
  'NICOLLY MOURA SILVA': { av1: 2.8, av2: 2.0, t1: 1.6, t2: 1.0, faltas: 0 },
  'PAULA DE SOUZA DA SILVA': { av1: 0.0, av2: 0.0, t1: 0.0, t2: 0.0, faltas: 0 },
  'PEDRO HENRIQUE CARDOSO RANGEL': { av1: 2.5, av2: 1.0, t1: 1.5, t2: 1.0, faltas: 0 },
  'VITÓRIA MARIA RODRIGUES MACHADO': { av1: 2.5, av2: 3.0, t1: 1.7, t2: 1.0, faltas: 0 }
};

db.serialize(() => {
  db.run('INSERT OR IGNORE INTO turmas (nome) VALUES ("2001 EMTI")');
  db.run('INSERT OR IGNORE INTO materias (nome) VALUES ("Língua Portuguesa")');

  alunosTurma2001.forEach((nome, idx) => {
    const mat = '202620' + (idx < 9 ? '0' + (idx+1) : (idx+1));
    db.run('INSERT OR IGNORE INTO alunos (nome, matricula, turma, telefone, responsavel) VALUES (?, ?, "2001 EMTI", "(11) 98888-2222", "Responsável")', [nome, mat], function(err) {
      db.get('SELECT id FROM alunos WHERE nome = ? AND turma = "2001 EMTI"', [nome], (err, aluno) => {
        if (aluno) {
          const d = notas2001[nome] || { av1: 0, av2: 0, t1: 0, t2: 0, faltas: 0 };
          db.get('SELECT id FROM notas WHERE aluno_id = ? AND materia = "Língua Portuguesa" AND trimestre = 1', [aluno.id], (err, row) => {
            if (row) {
              db.run('UPDATE notas SET avaliacao1 = ?, avaliacao2 = ?, trabalho1 = ?, trabalho2 = ?, faltas = ? WHERE id = ?',
                [d.av1, d.av2, d.t1, d.t2, d.faltas, row.id]);
            } else {
              db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, faltas) VALUES (?, "2001 EMTI", "Língua Portuguesa", 1, ?, ?, ?, ?, ?)',
                [aluno.id, d.av1, d.av2, d.t1, d.t2, d.faltas]);
            }
          });
        }
      });
    });
  });
  console.log('Turma 2001 EMTI e notas oficiais de Língua Portuguesa importadas com sucesso!');
});
