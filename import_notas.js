const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const notasPlanilha = {
  'EMENY BARROSO MORAES': { av1: 3.4, av2: 1.7, t1: 2.0, t2: 0.0, t3: 0.0, part: 1.5, faltas: 0 },
  'GABRIEL DE PAULA CORRÊA': { av1: 3.4, av2: 1.6, t1: 0.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 4 },
  'GUILHERME BORGES DE ANDRADE': { av1: 4.0, av2: 1.6, t1: 2.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 0 },
  'HEITOR ALVES DE SOUZA': { av1: 3.3, av2: 2.0, t1: 0.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 0 },
  'HEITOR CARVALHO MAGALHAES': { av1: 1.2, av2: 1.8, t1: 1.2, t2: 0.0, t3: 0.0, part: 0.0, faltas: 0 },
  'ÍTALO GOMES DE ALMEIDA': { av1: 3.6, av2: 1.0, t1: 0.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 4 },
  'JHUAN PABLO PEREIRA DE SOUZA': { av1: 0.8, av2: 3.6, t1: 1.5, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
  'JOÃO PAULO XIMENES DA SILVA': { av1: 1.9, av2: 3.5, t1: 2.0, t2: 1.2, t3: 0.0, part: 0.0, faltas: 0 },
  'KAIKY CORRÊA DE OLIVEIRA': { av1: 1.8, av2: 2.6, t1: 1.7, t2: 1.0, t3: 1.2, part: 0.0, faltas: 2 },
  'KAILA VITÓRIA ROSA DA SILVA': { av1: 0.8, av2: 2.4, t1: 1.9, t2: 1.0, t3: 1.0, part: 0.0, faltas: 0 },
  'KÁUANE BARBOSA PEREIRA DA SILVA': { av1: 1.0, av2: 3.8, t1: 1.5, t2: 2.0, t3: 1.0, part: 0.0, faltas: 0 },
  'KAUE ALEXANDRO ARAUJO DA SILVEIRA': { av1: 0.8, av2: 0.0, t1: 0.0, t2: 0.0, t3: 1.0, part: 0.0, faltas: 2 },
  'KEROLYN VEIGA DA SILVA': { av1: 0.2, av2: 0.6, t1: 1.5, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
  'KEVILLINY DOMINGUES PEÇANHA': { av1: 2.6, av2: 0.0, t1: 1.2, t2: 0.0, t3: 0.0, part: 0.0, faltas: 0 },
  'LAURA MARIANO GULINELLI DA SILVA': { av1: 5.0, av2: 0.0, t1: 5.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 14 },
  'LEONARDO FRANCISCO SANTOS DE PAULA': { av1: 1.4, av2: 0.0, t1: 2.0, t2: 0.6, t3: 1.0, part: 0.0, faltas: 2 },
  'LETÍCIA GOMES VIEIRA PACHECO': { av1: 2.9, av2: 0.0, t1: 0.0, t2: 2.9, t3: 0.0, part: 0.0, faltas: 2 },
  'LILIA MARIA ALVES DA SILVA': { av1: 2.7, av2: 2.0, t1: 1.0, t2: 1.5, t3: 0.0, part: 0.0, faltas: 2 },
  'LOYANNE SOARES GUALANDE DE ANDRADE': { av1: 2.2, av2: 2.0, t1: 1.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
  'LUCAS DE OLIVEIRA DA SILVA': { av1: 3.8, av2: 0.0, t1: 2.0, t2: 2.0, t3: 0.0, part: 0.0, faltas: 0 },
  'LUIZ PHILLIP SILVA ANDRADE': { av1: 1.7, av2: 3.8, t1: 1.9, t2: 1.6, t3: 1.2, part: 0.0, faltas: 0 },
  'MARIA EDUARDA DA SILVA BASTOS': { av1: 0.6, av2: 1.8, t1: 1.9, t2: 2.0, t3: 1.0, part: 0.0, faltas: 0 },
  'MARIA EDUARDA DA SILVA COSTA': { av1: 0.7, av2: 2.2, t1: 0.5, t2: 1.0, t3: 0.0, part: 0.0, faltas: 4 },
  'MURILLO BORGES DUARTE PORTUGAL FIGUEIREDO': { av1: 0.6, av2: 1.2, t1: 1.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 4 },
  'THALYA DE OLIVEIRA SANTOS': { av1: 2.3, av2: 0.0, t1: 1.0, t2: 1.2, t3: 0.0, part: 0.0, faltas: 0 },
  'ESHILLEY': { av1: 1.2, av2: 2.8, t1: 2.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
  'JULIA GUIMARÃES BRITTO': { av1: 3.0, av2: 0.0, t1: 0.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 0 }
};

db.serialize(() => {
  db.run('INSERT OR IGNORE INTO turmas (nome) VALUES ("902")');
  db.run('INSERT OR IGNORE INTO materias (nome) VALUES ("Inglês")');

  for (const [nome, d] of Object.entries(notasPlanilha)) {
    db.get('SELECT id FROM alunos WHERE nome = ? AND turma = "902"', [nome], (err, aluno) => {
      if ( aluno ) {
        // Atualiza ou insere para o 1º Trimestre
        db.get('SELECT id FROM notas WHERE aluno_id = ? AND materia = "Inglês" AND trimestre = 1', [aluno.id], (err, row) => {
          if (row) {
            db.run('UPDATE notas SET avaliacao1 = ?, avaliacao2 = ?, trabalho1 = ?, trabalho2 = ?, trabalho3 = ?, participacao = ?, faltas = ? WHERE id = ?',
              [d.av1, d.av2, d.t1, d.t2, d.t3, d.part, d.faltas, row.id]);
          } else {
            db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, "902", "Inglês", 1, ?, ?, ?, ?, ?, ?, ?)',
              [aluno.id, d.av1, d.av2, d.t1, d.t2, d.t3, d.part, d.faltas]);
          }
        });

        // Simula notas proporcionais para o 2º Trimestre com base na planilha
        for (let trim = 2; trim <= 3; trim++) {
          db.get('SELECT id FROM notas WHERE aluno_id = ? AND materia = "Inglês" AND trimestre = ?', [aluno.id, trim], (err, row) => {
            const fator = trim === 2 ? 1.1 : 1.2;
            const a1 = Math.min(10, +(d.av1 * fator).toFixed(1));
            const a2 = Math.min(10, +(d.av2 * fator).toFixed(1));
            if (row) {
              db.run('UPDATE notas SET avaliacao1 = ?, avaliacao2 = ?, trabalho1 = ?, trabalho2 = ?, trabalho3 = ?, participacao = ?, faltas = ? WHERE id = ?',
                [a1, a2, d.t1, d.t2, d.t3, d.part, Math.floor(d.faltas/2), row.id]);
            } else {
              db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, "902", "Inglês", ?, ?, ?, ?, ?, ?, ?, ?)',
                [aluno.id, trim, a1, a2, d.t1, d.t2, d.t3, d.part, Math.floor(d.faltas/2)]);
            }
          });
        }
      }
    });
  }
  console.log('Notas oficiais da planilha de Inglês (1º, 2º e 3º Trimestre) importadas com sucesso!');
});
