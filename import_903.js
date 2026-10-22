const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const alunos903 = [
  { nome: 'ADRYAN ADRIANO CORRÊA', av1: 1.9, av2: 0.0, t1: 0.0, t2: 0.0, part: 1.0, faltas: 12 },
  { nome: 'GUIMAS VEIGA OLIVEIRA', av1: 0.7, av2: 1.8, t1: 2.0, t2: 0.5, part: 0.8, faltas: 0 },
  { nome: 'ISAC WALISON LIMA DE OLIVEIRA FERNANDES', av1: 1.0, av2: 0.4, t1: 2.0, t2: 0.0, part: 1.0, faltas: 4 },
  { nome: 'KAÍKE VICTOR ARAUJO BRANCO', av1: 0.0, av2: 0.0, t1: 0.0, t2: 0.0, part: 0.0, faltas: 2 },
  { nome: 'KAYQUE VEIGA MARTINS P-', av1: 2.5, av2: 0.0, t1: 0.0, t2: 1.5, part: 1.0, faltas: 12 },
  { nome: 'LUIS OTÁVIO NUNES DE SOUZA', av1: 0.5, av2: 0.0, t1: 0.0, t2: 0.8, part: 0.5, faltas: 6 },
  { nome: 'MARIANA JACOMINI SOARES', av1: 2.7, av2: 0.0, t1: 2.0, t2: 1.0, part: 2.0, faltas: 4 },
  { nome: 'MARIANA RIBAS SOARES', av1: 0.0, av2: 0.0, t1: 0.0, t2: 1.0, part: 0.0, faltas: 8 },
  { nome: 'PEDRO LUCAS DA SILVA OLIVEIRA', av1: 0.3, av2: 2.2, t1: 2.0, t2: 0.0, part: 0.0, faltas: 6 },
  { nome: 'PEDRO LUCAS MIRANDA RODRIGUES', av1: 0.9, av2: 1.4, t1: 1.8, t2: 1.0, part: 1.7, faltas: 4 },
  { nome: 'PHABLO NASCIMENTO BORGES DE ASSIS', av1: 1.9, av2: 3.4, t1: 0.0, t2: 1.0, part: 1.0, faltas: 4 },
  { nome: 'RACKEL SÁ DA SILVA', av1: 3.5, av2: 0.0, t1: 0.0, t2: 0.0, part: 1.0, faltas: 8 },
  { nome: 'RAYNA ARAÚJO GOMES RODRIGUES', av1: 2.2, av2: 0.0, t1: 2.0, t2: 1.0, part: 1.0, faltas: 8 },
  { nome: 'REBECA VIEIRA DE JESUS', av1: 2.6, av2: 0.0, t1: 0.0, t2: 1.0, part: 1.0, faltas: 6 },
  { nome: 'SAMUEL DE OLIVEIRA SILVA SEVERINO', av1: 3.5, av2: 0.0, t1: 0.0, t2: 0.0, part: 1.0, faltas: 4 },
  { nome: 'THACYLLA MARIA FERNANDES DE SOUZA', av1: 1.8, av2: 3.2, t1: 2.0, t2: 0.0, part: 1.0, faltas: 10 },
  { nome: 'THIAGO COSTA DA SILVA', av1: 0.9, av2: 1.4, t1: 0.0, t2: 0.0, part: 1.0, faltas: 4 },
  { nome: 'THIAGO HENRIQUE GOMES DE SOUZA MATTOS', av1: 2.8, av2: 0.0, t1: 0.0, t2: 1.0, part: 1.0, faltas: 4 },
  { nome: 'WESLLEY COSTA DA SILVA', av1: 2.0, av2: 1.0, t1: 0.0, t2: 0.0, part: 1.0, faltas: 4 },
  { nome: 'YAGO CADEI MENDES DA SILVA', av1: 0.0, av2: 3.8, t1: 0.0, t2: 1.0, part: 1.0, faltas: 8 },
  { nome: 'YCARO XAVIER GOMES', av1: 3.7, av2: 0.0, t1: 0.0, t2: 1.0, part: 1.5, faltas: 4 },
  { nome: 'YKARO GABRIEL PEREIRA FIRMINO DOS SANTOS', av1: 0.7, av2: 2.2, t1: 2.0, t2: 1.0, part: 1.0, faltas: 2 },
  { nome: 'YSACK FERREIRA OLIVEIRA', av1: 3.6, av2: 0.0, t1: 0.0, t2: 0.0, part: 1.0, faltas: 0 }
];

db.serialize(() => {
  db.run('INSERT OR IGNORE INTO turmas (nome) VALUES ("903")');
  db.run('INSERT OR IGNORE INTO materias (nome) VALUES ("Reforço")');

  alunos903.forEach((a, idx) => {
    const mat = '2026903' + (idx < 9 ? '0' + (idx+1) : (idx+1));
    db.run('INSERT OR IGNORE INTO alunos (nome, matricula, turma, telefone, responsavel) VALUES (?, ?, "903", "(11) 98888-4444", "Responsável")', 
      [a.nome, mat], function(err) {
        db.get('SELECT id FROM alunos WHERE nome = ? AND turma = "903"', [a.nome], (err, aluno) => {
          if (aluno) {
            for (let trim = 1; trim <= 3; trim++) {
              db.get('SELECT id FROM notas WHERE aluno_id = ? AND materia = "Reforço" AND trimestre = ?', [aluno.id, trim], (err, row) => {
                if (row) {
                  db.run('UPDATE notas SET avaliacao1 = ?, avaliacao2 = ?, trabalho1 = ?, trabalho2 = ?, trabalho3 = ?, participacao = ?, faltas = ? WHERE id = ?',
                    [a.av1, a.av2, a.t1, a.t2, 0.0, a.part, a.faltas, row.id]);
                } else {
                  db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, "903", "Reforço", ?, ?, ?, ?, ?, 0.0, ?, ?)',
                    [aluno.id, trim, a.av1, a.av2, a.t1, a.t2, a.part, a.faltas]);
                }
              });
            }
          }
        });
      });
  });
  console.log('Turma 903 de Reforço e instrumentos avaliativos importados com sucesso!');
});
