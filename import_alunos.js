const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

const alunos = [
  'CHRISTIANE SANTOS MOREIRA', 'EMENY BARROSO MORAES', 'GABRIEL DE PAULA CORRÊA',
  'GUILHERME BORGES DE ANDRADE', 'HEITOR ALVES DE SOUZA', 'HEITOR CARVALHO MAGALHAES',
  'ÍTALO GOMES DE ALMEIDA', 'JHUAN PABLO PEREIRA DE SOUZA', 'JOÃO PAULO XIMENES DA SILVA',
  'JULIA SILVA BARBOSA', 'KAIKY CORRÊA DE OLIVEIRA', 'KAILA VITÓRIA ROSA DA SILVA',
  'KAUAN DA SILVA OLIVEIRA', 'KÁUANE BARBOSA PEREIRA DA SILVA', 'KAUE ALEXANDRO ARAUJO DA SILVEIRA',
  'KEROLYN VEIGA DA SILVA', 'KEVILLINY DOMINGUES PEÇANHA', 'LAURA MARIANO GULINELLI DA SILVA',
  'LEONARDO FRANCISCO SANTOS DE PAULA', 'LETÍCIA GOMES VIEIRA PACHECO', 'LILIA MARIA ALVES DA SILVA',
  'LOYANNE SOARES GUALANDE DE ANDRADE', 'LUCAS DE OLIVEIRA DA SILVA', 'LUIZ PHILLIP SILVA ANDRADE',
  'MARIA EDUARDA DA SILVA BASTOS', 'MARIA EDUARDA DA SILVA COSTA', 'MELISSA GONÇALVES DA SILVA',
  'MURILLO BORGES DUARTE PORTUGAL FIGUEIREDO', 'NATAN COSTA AMBROSIO', 'THALYA DE OLIVEIRA SANTOS',
  'ESHILLEY', 'JULIA GUIMARÃES BRITTO'
];

db.serialize(() => {
  db.run('INSERT OR IGNORE INTO turmas (nome) VALUES ("902")');
  db.run('INSERT OR IGNORE INTO materias (nome) VALUES ("Inglês")');
  alunos.forEach((nome, idx) => {
    const mat = '202690' + (idx < 9 ? '0' + (idx+1) : (idx+1));
    db.run('INSERT OR IGNORE INTO alunos (nome, matricula, turma, telefone, responsavel) VALUES (?, ?, "902", "(11) 98888-1111", "Responsável")', [nome, mat], function(err) {
      if (!err && this.lastID) {
        const aid = this.lastID;
        for (let trim = 1; trim <= 3; trim++) {
          db.run('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, "902", "Inglês", ?, 6.0, 7.5, 1.5, 1.5, 1.5, 1.0, 1)', [aid, trim]);
        }
      }
    });
  });
  console.log('Turma 902 e alunos importados com sucesso!');
});
