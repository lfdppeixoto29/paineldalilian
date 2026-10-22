const sqlite3 = require('sqlite3').verbose();

function garantirAlunosOficiais(db) {
    const alunos901 = [
        "ALBERTO DA SILVA BONIOLO", "ALERRANDRA DE OLIVEIRA REZENDE", "ANA LUIZA MAIA BENEDICTO", 
        "ANTONELLA RANGEL CANEDO CARVALHO (RARU)", "ANTONIO NETO PIMENTEL CESAR MEDEIROS", "BERNARDO ALVES DOS SANTOS", 
        "BERNARDO FRANÇA LOPES", "BRENDA COUTO SILVA", "CLARA PESSANHA ALVES", "DAMYANN RIBEIRO LOPES DE CARVALHO", 
        "DANIELLE BAZILIO DE AGUIAR", "DAVI CORREIA MARSSOLA", "DAVI NUNES JARDIM", "DAVI OLIVEIRA DE SOUZA DINNIZ", 
        "DAVY BARBOSA SALES", "DEBORA VITÓRIA SEVERINO DE ARAÚJO", "ELOÁ FERREIRA DA SILVA", "EMANUEL DUTRA AZEVEDO", 
        "ENZO OLIVEIRA CONDÉ BARRETO", "ENZO VANTIL DA COSTA ROELES", "FABIANO DE SOUZA RODRIGUES", "GABRIEL DA SILVA VENTURI", 
        "GUSTAVO ARAÚJO DA SILVA", "HUGO LEONARDO RIBEIRO AVILA FILHO", "ISABELLE LOBO FERNANDES", "JULYA DUARTE DE MELLO", 
        "KIARA CORREA BORGES", "LARA SOUZA LOCATEL", "MARIA FERNANDA DE SOUZA MACHARETH NISTALDO", "MEL ALESSANDRA DOS ANJOS LIMA", 
        "MICAELLA GONÇALVES SOUZA", "WANDERSON PEREIRA CORCINO DE JESUS", "ANA LUIZA DORNELAS"
    ];

    const alunos903 = [
        "ADRYAN ADRIANO CORRÊA", "GUIMAS VEIGA OLIVEIRA", "ISAC WALISON LIMA DE OLIVEIRA FERNANDES", 
        "KAÍKE VICTOR ARAUJO BRANCO", "KAYQUE VEIGA MARTINS P-", "LUDIMILA DA SILVA OLIVEIRA", 
        "LUIS OTÁVIO NUNES DE SOUZA", "MARIANA JACOMINI SOARES", "MARIANA RIBAS SOARES", 
        "MAYZA DE SOUZA MARTINS", "PAOLA DE ALMEIDA MACHADO LEPRE", "PEDRO LUCAS DA SILVA OLIVEIRA", 
        "PEDRO LUCAS MIRANDA RODRIGUES", "PHABLO NASCIMENTO BORGES DE ASSIS", "RACKEL SÁ DA SILVA", 
        "RAQUELI MARTINS DOS SANTOS", "RAYNA ARAÚJO GOMES RODRIGUES", "REBECA VIEIRA DE JESUS", 
        "SAMUEL DE OLIVEIRA SILVA SEVERINO", "SOPHIA MOREIRA CARVALHO FRANÇA DA SILVA", "SURIA SOARES DE ALVARENGA- ED", 
        "THACYLLA MARIA FERNANDES DE SOUZA", "THIAGO COSTA DA SILVA", "THIAGO HENRIQUE GOMES DE SOUZA MATTOS", 
        "WESLLEY COSTA DA SILVA", "YAGO CADEI MENDES DA SILVA", "YCARO XAVIER GOMES", 
        "YKARO GABRIEL PEREIRA FIRMINO DOS SANTOS", "YSACK FERREIRA OLIVEIRA"
    ];

    const alunos3001 = [
        "ANA JULIA OLIMPIO ALVES", "ANDRÉ EGIDIO DE SOUZA", "ANGELYNA ROSA SOUZA", "ANNA LAURA MEDEIROS DE SOUZA", 
        "BIANCA DOS SANTOS MARQUES", "CASSIANY CAMILO CURCIO MACHADO", "CRISTIANO RONALDO DIAS DA SILVA", 
        "DANIEL DA SILVA FILHO", "DEIVLYN JOSÉ DE OLIVEIRA CARNEIRO DEAMANTINO PELUCHE", "EDNA PROCOPIO DE SOUZA", 
        "EMILY APARECIDA F. DOS SANTOS BARBOSA", "ENDREW DE SOUZA PERES", "ENZO LEONARDO VIEIRA DOS SANTOS", 
        "ESTER FRIAS NASCIMENTO", "FARLEN JUNIOR FLORENCIO CARNEIRO", "FILIPI TEIXEIRA DE OLIVEIRA SANTOS", 
        "GELIANE AGUIAR DE SOUZA", "GUILHERME DANIEL DE SOUZA CASTRO OLIVEIRA", "HELLENA SILVA DE OLIVEIRA", 
        "HEMILLY VITÓRIA MOUTINHO OLIVEIRA", "JOSÉ RENATO BATISTA TEIXEIRA TARDIM", "LAVYNIA OLIVEIRA DA SILVA", 
        "MATHEUS FERREIRA NOVAIS GOMES", "RAPHAELA OLIVEIRA DA COSTA", "THAVYNE DOS SANTOS MELO", 
        "WALLACE JOSÉ SATOLO DEGLI ESPOSTI", "YASMIM PEREIRA FIRMINO DOS SANTOS", "YSABHELLY APARECIDA FLORENCIO CHAGAS", "YASMIN COK"
    ];

    const alunos3002 = [
        "ANA CECILIA DO CARMO GONÇALVES", "ARTHUR LIMA MELO ALVES", "EYSHILA VIEIRA DE OLIVEIRA", 
        "JÉSSICA VIEIRA DE SOUZA", "KAIQUE SOBRAL DE OLIVEIRA", "KÉSSILY ANGELYNA REIS OLIVEIRA", 
        "LARA CARNEIRO DA SILVA", "LAURA DA SILVA RAMOS", "LAURA DELATORRE DUTRA", 
        "LAURIELLY PAINS DA SILVA NASCIMENTO", "LORRAINY MALAQUIAS GONÇALVES DUTRA", "LUAN CARNEIRO DA SILVA", 
        "MANOEL JOSE DA SILVA CHAVES", "MARCOS JOSÉ NEVES DA SILVA FILHO", "MARIA ANGÉLICA MENDES GENTILUCE", 
        "MARIA EDUARDA MILIOLI DO VALE", "MARIA EDUARDA PEREIRA DE SOUZA", "MARIA RAQUELY DA SILVA DOMINGOS", 
        "MATHEUS APOLINARIO DE OLIVEIRA", "MYRIAH PEÇANHA NEVES MACHARETH", "NICOLLY VITÓRIA GONÇALVES MORAES", 
        "RENATO GABRIEL CARDOSO MARSSOLA", "RODRIGO MACHADO ALVES DO CARMO", "RYAN GOMES FIGUEIREDO DE PAULA", 
        "THAUANNE RANIA DA SILVA E SOUZA", "VERENA PRADO COSTA DE FREITAS"
    ];

    const alunos2001 = [
        "ANDRESSA MARIA VITO GRACIANO", "BRENDA ROSA MOREIRA DA SILVA VIANA", "KAMILLY VICTÓRIA FREITAS MARCILIO", 
        "KIARA OLIVEIRA MEDEIROS", "LARA DE OLIVEIRA MOTTA", "LEONNY DA SILVA FURTADO", 
        "MARIA PAULA BARTHOLAZZI COSTA", "NICOLLY MOURA SILVA", "PAULA DE SOUZA DA SILVA", 
        "PEDRO HENRIQUE CARDOSO RANGEL", "VITÓRIA MARIA RODRIGUES MACHADO", "GABRIEL SILVA SANTOS", 
        "HELENA MARTINS DIAS", "IGOR SOUZA COSTA", "JULIA OLIVEIRA LIMA", "KAIO PEREIRA SILVA"
    ];

    db.serialize(() => {
        const turmasAlvo = [
            { nome: '901', lista: alunos901 },
            { nome: '903', lista: alunos903 },
            { nome: '3001', lista: alunos3001 },
            { nome: '3002', lista: alunos3002 },
            { nome: '2001 EMTI', lista: alunos2001 }
        ];

        turmasAlvo.forEach(t => {
            db.get("SELECT COUNT(*) as total FROM alunos WHERE turma = ?", [t.nome], (err, row) => {
                if (!row || row.total !== t.lista.length) {
                    console.log(`Garantindo turma ${t.nome} com exatamente ${t.lista.length} alunos oficiais...`);
                    db.run("DELETE FROM notas WHERE turma = ?", [t.nome]);
                    db.run("DELETE FROM alunos WHERE turma = ?", [t.nome]);
                    db.run("INSERT OR IGNORE INTO turmas (nome, ano_letivo) VALUES (?, '2026')", [t.nome]);
                    
                    t.lista.forEach((nome, idx) => {
                        const prefixo = t.nome.replace(/\D/g, '') || '2001';
                        const matricula = prefixo + (idx + 1 < 10 ? '0' + (idx + 1) : (idx + 1));
                        db.run("INSERT INTO alunos (nome, matricula, turma, telefone, responsavel, ano_letivo) VALUES (?, ?, ?, '(44) 99999-8888', 'Responsável', '2026')",
                            [nome, matricula, t.nome], function(err) {
                                if (this.lastID) {
                                    const alunoId = this.lastID;
                                    ['Língua Portuguesa', 'Inglês', 'Reforço'].forEach(materia => {
                                        [1, 2, 3].forEach(trimestre => {
                                            db.run("INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, ?, ?, ?, 3.5, 3.0, 2.0, 1.0, 0, 1.0, 0)",
                                                [alunoId, t.nome, materia, trimestre]);
                                        });
                                    });
                                }
                            });
                    });
                }
            });
        });
    });
}

module.exports = { garantirAlunosOficiais };