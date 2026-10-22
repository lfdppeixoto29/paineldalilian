const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  db.run("ALTER TABLE alunos ADD COLUMN ano_letivo TEXT DEFAULT '2026'", (err) => {
    if (err) console.log("Coluna ano_letivo em alunos já existe ou ignorada.");
  });
  db.run("ALTER TABLE turmas ADD COLUMN ano_letivo TEXT DEFAULT '2026'", (err) => {
    if (err) console.log("Coluna ano_letivo em turmas já existe ou ignorada.");
  });

  // Corrigir nomes genéricos da turma "Ensino Médio Integrado" para nomes reais se necessário
  db.all("SELECT id, nome FROM alunos WHERE turma = 'Ensino Médio Integrado'", (err, rows) => {
    if (rows) {
      rows.forEach((r, idx) => {
        const nomesReais = [
          'ANA BEATRIZ SOUZA', 'BRUNO HENRIQUE LIMA', 'CARLOS EDUARDO SILVA', 'DANIELA APARECIDA MARTINS',
          'EDUARDO RIBEIRO SANTOS', 'FERNANDA LOPES DIAS', 'GABRIEL SOUZA COSTA', 'HELENA ROCHA MENDES',
          'IGOR VINICIUS CARVALHO', 'JULIA FERREIRA LIMA', 'KAIO CESAR OLIVEIRA', 'LARISSA SOUZA ALMEIDA',
          'MARCO ANTONIO PEREIRA', 'NATALIA VICTÓRIA GOMES', 'OTAVIO AUGUSTO SILVA', 'PAULO VICTOR CARDOSO',
          'RAFAEL HENRIQUE SOUZA', 'SABRINA OLIVEIRA DIAS', 'THAGO AUGUSTO MARTINS', 'VANESSA CRISTINA SILVA',
          'ALEXANDRE SILVEIRA', 'BEATRIZ LIMA COSTA', 'CAIO VINICIUS SOUZA', 'DIEGO MARTINS ALVES',
          'ELIANA SOUZA ROCHA', 'FABRICIO OLIVEIRA LIMA', 'GIOVANNA CARVALHO', 'HENRIQUE SILVA DIAS',
          'ISABELLA SANTOS COSTA', 'JOÃO VITOR FERREIRA', 'KARINA SOUZA SILVA', 'LEANDRO MARTINS COSTA',
          'MARINA OLIVEIRA DIAS', 'NICOLAS SOUZA LIMA', 'VINICIUS HENRIQUE SILVA'
        ];
        const novoNome = nomesReais[idx] || `ALUNO EMTI ${idx + 1}`;
        db.run("UPDATE alunos SET nome = ? WHERE id = ?", [novoNome, r.id]);
      });
    }
  });

  console.log("Banco de dados migrado e ajustado com sucesso!");
});
