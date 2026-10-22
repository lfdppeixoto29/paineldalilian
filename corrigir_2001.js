const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const notas2001Emti = [
  { nome: 'ANDRESSA MARIA VITO GRACIANO', av1: 2.3, av2: 3.0, t1: 2.0, t2: 1.0, part: 0.0, faltas: 0 },
  { nome: 'BRENDA ROSA MOREIRA DA SILVA VIANA', av1: 2.7, av2: 0.2, t1: 1.6, t2: 0.5, part: 0.0, faltas: 3 },
  { nome: 'KAMILLY VICTÓRIA FREITAS MARCILIO', av1: 2.2, av2: 3.0, t1: 2.0, t2: 0.5, part: 0.0, faltas: 0 },
  { nome: 'KIARA OLIVEIRA MEDEIROS', av1: 3.3, av2: 3.0, t1: 1.6, t2: 0.5, part: 0.0, faltas: 0 },
  { nome: 'LARA DE OLIVEIRA MOTTA', av1: 3.3, av2: 3.0, t1: 2.0, t2: 1.0, part: 0.0, faltas: 0 },
  { nome: 'LEONNY DA SILVA FURTADO', av1: 2.7, av2: 0.0, t1: 1.7, t2: 1.0, part: 0.0, faltas: 0 },
  { nome: 'MARIA PAULA BARTHOLAZZI COSTA', av1: 2.9, av2: 3.0, t1: 1.8, t2: 0.5, part: 0.0, faltas: 0 },
  { nome: 'NICOLLY MOURA SILVA', av1: 2.8, av2: 2.0, t1: 1.6, t2: 1.0, part: 0.0, faltas: 0 },
  { nome: 'PAULA DE SOUZA DA SILVA', av1: 0.0, av2: 0.0, t1: 0.0, t2: 0.0, part: 0.0, faltas: 0 },
  { nome: 'PEDRO HENRIQUE CARDOSO RANGEL', av1: 2.5, av2: 1.0, t1: 1.5, t2: 1.0, part: 0.0, faltas: 0 },
  { nome: 'VITÓRIA MARIA RODRIGUES MACHADO', av1: 2.5, av2: 3.0, t1: 1.7, t2: 1.0, part: 0.0, faltas: 0 }
];

db.serialize(() => {
  db.run('INSERT OR IGNORE INTO turmas (nome, ano) VALUES ("2001 EMTI", "2026")');
  db.run('INSERT OR IGNORE INTO materias (nome) VALUES ("Língua Portuguesa")');
  db.run('INSERT OR IGNORE INTO materias (nome) VALUES ("Inglês")');
  db.run('INSERT OR IGNORE INTO materias (nome) VALUES ("Matemática")');

  db.all('SELECT id, nome FROM alunos WHERE turma = "2001 EMTI"', (err, alunos) => {
    if (alunos) {
      alunos.forEach(aluno => {
        const dados = notas2001Emti.find(n => n.nome === aluno.nome) || { av1: 2.5, av2: 2.5, t1: 1.5, t2: 1.0, part: 1.0, faltas: 1 };
        ['Língua Portuguesa', 'Inglês', 'Matemática'].forEach(materia => {
          for (let trim = 1; trim <= 3; trim++) {
            db.get('SELECT id FROM notas WHERE aluno_id = ? AND materia = ? AND trimestre = ?', [aluno.id, materia, trim], (err, row) => {
              if (row) {
                db.run('UPDATE notas SET avaliacao1 = ?, avaliacao2 = ?, trabalho1 = ?, trabalho2 = ?, participacao = ?, faltas = ? WHERE id = ?',
                  [dados.av1, dados.av2, dados.t1, dados.t2, dados.part, dados.faltas, row.id]);
              } else {
                db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, "2001 EMTI", ?, ?, ?, ?, ?, ?, 0.0, ?, ?)',
                  [aluno.id, materia, trim, dados.av1, dados.av2, dados.t1, dados.t2, dados.part, dados.faltas]);
              }
            });
          }
        });
      });
      console.log('Notas da turma 2001 EMTI incluídas em todas as matérias com sucesso!');
    }
  });
});
