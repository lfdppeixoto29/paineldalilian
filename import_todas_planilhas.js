const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const dadosGerais = [
  // Turma 901 - Inglês
  {
    turma: '901', materia: 'Inglês', alunos: [
      { nome: 'ALBERTO DA SILVA BONIOLO', av1: 1.8, av2: 2.0, t1: 1.0, t2: 0.0, t3: 0.0, part: 1.5, faltas: 6 },
      { nome: 'ALERRANDRA DE OLIVEIRA REZENDE', av1: 2.7, av2: 0.0, t1: 0.0, t2: 0.0, t3: 0.0, part: 1.5, faltas: 10 },
      { nome: 'ANA LUIZA MAIA BENEDICTO', av1: 3.9, av2: 0.0, t1: 2.0, t2: 2.0, t3: 0.0, part: 1.8, faltas: 4 },
      { nome: 'ANTONIO NETO PIMENTEL CESAR MEDEIROS', av1: 3.5, av2: 0.0, t1: 2.0, t2: 2.0, t3: 0.0, part: 1.3, faltas: 0 },
      { nome: 'BRENDA COUTO SILVA', av1: 3.4, av2: 0.0, t1: 2.0, t2: 2.0, t3: 0.0, part: 2.0, faltas: 0 },
      { nome: 'DANIELLE BAZILIO DE AGUIAR', av1: 3.9, av2: 0.0, t1: 2.0, t2: 2.0, t3: 0.0, part: 1.3, faltas: 0 },
      { nome: 'GABRIEL DA SILVA VENTURI', av1: 4.0, av2: 0.0, t1: 1.5, t2: 2.0, t3: 0.0, part: 2.0, faltas: 2 },
      { nome: 'ISABELLE LOBO FERNANDES', av1: 4.0, av2: 0.0, t1: 2.0, t2: 0.0, t3: 0.0, part: 1.5, faltas: 0 },
      { nome: 'KIARA CORREA BORGES', av1: 4.0, av2: 0.0, t1: 1.0, t2: 2.0, t3: 0.0, part: 1.2, faltas: 6 }
    ]
  },
  // Turma 902 - Inglês
  {
    turma: '902', materia: 'Inglês', alunos: [
      { nome: 'EMENY BARROSO MORAES', av1: 3.4, av2: 1.7, t1: 2.0, t2: 0.0, t3: 0.0, part: 1.5, faltas: 0 },
      { nome: 'GABRIEL DE PAULA CORRÊA', av1: 3.4, av2: 1.6, t1: 0.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 4 },
      { nome: 'GUILHERME BORGES DE ANDRADE', av1: 4.0, av2: 1.6, t1: 2.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'HEITOR ALVES DE SOUZA', av1: 3.3, av2: 2.0, t1: 0.0, t2: 0.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'KÁUANE BARBOSA PEREIRA DA SILVA', av1: 3.8, av2: 1.0, t1: 1.5, t2: 2.0, t3: 1.0, part: 0.0, faltas: 0 },
      { nome: 'LUIZ PHILLIP SILVA ANDRADE', av1: 3.8, av2: 1.9, t1: 1.7, t2: 1.6, t3: 1.2, part: 0.0, faltas: 0 },
      { nome: 'MARIA EDUARDA DA SILVA BASTOS', av1: 1.8, av2: 1.9, t1: 0.6, t2: 2.0, t3: 1.0, part: 0.0, faltas: 0 }
    ]
  },
  // Turma 2001 EMTI - Língua Portuguesa
  {
    turma: '2001 EMTI', materia: 'Língua Portuguesa', alunos: [
      { nome: 'ANDRESSA MARIA VITO GRACIANO', av1: 2.3, av2: 3.0, t1: 2.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'KAMILLY VICTÓRIA FREITAS MARCILIO', av1: 2.2, av2: 3.0, t1: 2.0, t2: 0.5, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'KIARA OLIVEIRA MEDEIROS', av1: 3.3, av2: 3.0, t1: 1.6, t2: 0.5, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'LARA DE OLIVEIRA MOTTA', av1: 3.3, av2: 3.0, t1: 2.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'MARIA PAULA BARTHOLAZZI COSTA', av1: 2.9, av2: 3.0, t1: 1.8, t2: 0.5, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'VITÓRIA MARIA RODRIGUES MACHADO', av1: 2.5, av2: 3.0, t1: 1.7, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 }
    ]
  },
  // Turma 3001 - Língua Portuguesa
  {
    turma: '3001', materia: 'Língua Portuguesa', alunos: [
      { nome: 'ANA JULIA OLIMPIO ALVES', av1: 3.0, av2: 3.0, t1: 2.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'BIANCA DOS SANTOS MARQUES', av1: 3.0, av2: 2.3, t1: 2.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'CASSIANY CAMILO CURCIO MACHADO', av1: 2.0, av2: 3.0, t1: 1.6, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'DEIVLYN JOSÉ DE OLIVEIRA CARNEIRO DEAMANTINO PELUCHE', av1: 2.8, av2: 3.0, t1: 1.8, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'LAVYNIA OLIVEIRA DA SILVA', av1: 1.6, av2: 3.6, t1: 3.0, t2: 1.8, t3: 1.0, part: 0.0, faltas: 0 },
      { nome: 'YASMIN COK', av1: 3.1, av2: 3.0, t1: 2.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 5 }
    ]
  },
  // Turma 3002 - Língua Portuguesa
  {
    turma: '3002', materia: 'Língua Portuguesa', alunos: [
      { nome: 'ARTHUR LIMA MELO ALVES', av1: 2.2, av2: 3.0, t1: 2.0, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'LAURA DA SILVA RAMOS', av1: 3.2, av2: 1.5, t1: 1.9, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'LAURA DELATORRE DUTRA', av1: 3.4, av2: 3.0, t1: 1.9, t2: 0.5, t3: 0.0, part: 0.0, faltas: 6 },
      { nome: 'LAURIELLY PAINS DA SILVA NASCIMENTO', av1: 3.1, av2: 3.0, t1: 1.9, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'LORRAINY MALAQUIAS GONÇALVES DUTRA', av1: 2.2, av2: 3.0, t1: 1.7, t2: 1.0, t3: 0.0, part: 0.0, faltas: 0 },
      { nome: 'MARIA ANGÉLICA MENDES GENTILUCE', av1: 2.6, av2: 3.0, t1: 1.9, t2: 0.5, t3: 0.0, part: 0.0, faltas: 12 }
    ]
  }
];

db.serialize(() => {
  dadosGerais.forEach(grupo => {
    db.run('INSERT OR IGNORE INTO turmas (nome) VALUES (?)', [grupo.turma]);
    db.run('INSERT OR IGNORE INTO materias (nome) VALUES (?)', [grupo.materia]);

    grupo.alunos.forEach((a, idx) => {
      const mat = '2026' + grupo.turma.replace(/\D/g, '') + (idx < 9 ? '0' + (idx+1) : (idx+1));
      db.run('INSERT OR IGNORE INTO alunos (nome, matricula, turma, telefone, responsavel) VALUES (?, ?, ?, "(11) 98888-3333", "Responsável")', 
        [a.nome, mat, grupo.turma], function(err) {
          db.get('SELECT id FROM alunos WHERE nome = ? AND turma = ?', [a.nome, grupo.turma], (err, aluno) => {
            if (aluno) {
              for (let trim = 1; trim <= 3; trim++) {
                db.get('SELECT id FROM notas WHERE aluno_id = ? AND materia = ? AND trimestre = ?', [aluno.id, grupo.materia, trim], (err, row) => {
                  if (row) {
                    db.run('UPDATE notas SET avaliacao1 = ?, avaliacao2 = ?, trabalho1 = ?, trabalho2 = ?, trabalho3 = ?, participacao = ?, faltas = ? WHERE id = ?',
                      [a.av1, a.av2, a.t1, a.t2, a.t3, a.part, a.faltas, row.id]);
                  } else {
                    db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      [aluno.id, grupo.turma, grupo.materia, trim, a.av1, a.av2, a.t1, a.t2, a.t3, a.part, a.faltas]);
                  }
                });
              }
            }
          });
        });
    });
  });
  console.log('Todas as turmas, alunos e instrumentos avaliativos oficiais importados e corrigidos com sucesso!');
});
