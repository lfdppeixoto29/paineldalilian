const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

process.chdir(__dirname);

const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados do Colégio Estadual Euclides Feliciano Tardin.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS turmas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            ano_letivo TEXT DEFAULT '2026'
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS alunos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            matricula TEXT UNIQUE NOT NULL,
            turma TEXT NOT NULL,
            telefone TEXT,
            responsavel TEXT,
            ano_letivo TEXT DEFAULT '2026'
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS materias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT UNIQUE NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS notas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            aluno_id INTEGER,
            turma TEXT NOT NULL,
            materia TEXT NOT NULL,
            trimestre INTEGER NOT NULL,
            avaliacao1 REAL DEFAULT 0,
            avaliacao2 REAL DEFAULT 0,
            trabalho1 REAL DEFAULT 0,
            trabalho2 REAL DEFAULT 0,
            trabalho3 REAL DEFAULT 0,
            participacao REAL DEFAULT 0,
            faltas INTEGER DEFAULT 0,
            FOREIGN KEY(aluno_id) REFERENCES alunos(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS avisos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            conteudo TEXT NOT NULL,
            data TEXT DEFAULT CURRENT_TIMESTAMP
        )`);

        // Atualizar registros sem ano_letivo para '2026'
        db.run(`UPDATE alunos SET ano_letivo = '2026' WHERE ano_letivo IS NULL`);
        db.run(`UPDATE turmas SET ano_letivo = '2026' WHERE ano_letivo IS NULL`);
    });
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const ANOS_LETIVOS_DISPONIVEIS = ['2026', '2027', '2028', '2029', '2030', '2031'];

function getDadosGerais(anoLetivo, callback) {
    const ano = anoLetivo || '2026';
    db.all("SELECT nome FROM turmas WHERE ano_letivo = ? ORDER BY nome ASC", [ano], (err, turmasRows) => {
        const turmas = turmasRows ? turmasRows.map(t => t.nome) : [];
        db.all("SELECT nome FROM materias ORDER BY nome ASC", (err, materiasRows) => {
            const materias = materiasRows ? materiasRows.map(m => m.nome) : ['Inglês', 'Língua Portuguesa', 'Reforço', 'Matemática'];
            callback(turmas, materias);
        });
    });
}

app.get('/', (req, res) => {
    const anoLetivo = req.query.ano || '2026';
    getDadosGerais(anoLetivo, (turmas, materias) => {
        const turmaSelecionada = req.query.turma || (turmas.length > 0 ? turmas[0] : '');
        const materiaSelecionada = req.query.materia || (materias.length > 0 ? materias[0] : 'Inglês');
        const trimestreSelecionado = req.query.trimestre || '1';

        const query = `
            SELECT a.id as aluno_id, a.nome, a.matricula, a.telefone, a.responsavel,
                   n.id as nota_id, n.trimestre, 
                   MAX(n.avaliacao1) as avaliacao1, 
                   MAX(n.avaliacao2) as avaliacao2, 
                   MAX(n.trabalho1) as trabalho1, 
                   MAX(n.trabalho2) as trabalho2, 
                   MAX(n.trabalho3) as trabalho3, 
                   MAX(n.participacao) as participacao, 
                   MAX(n.faltas) as faltas
            FROM alunos a
            LEFT JOIN notas n ON a.id = n.aluno_id AND n.materia = ? AND n.trimestre = ?
            WHERE a.turma = ? AND a.ano_letivo = ?
            GROUP BY a.id
            ORDER BY a.nome ASC
        `;

        db.all(query, [materiaSelecionada, trimestreSelecionado, turmaSelecionada, anoLetivo], (err, registros) => {
            db.all("SELECT * FROM avisos ORDER BY id DESC", (err, avisos) => {
                res.render('painel', {
                    anos: ANOS_LETIVOS_DISPONIVEIS,
                    anoLetivo,
                    turmas,
                    materias,
                    turmaSelecionada,
                    materiaSelecionada,
                    trimestreSelecionado,
                    registros: registros || [],
                    avisos: avisos || [],
                    sucesso: req.query.sucesso
                });
            });
        });
    });
});

// Aba de Importação / Exportação e Promoção de Anos
app.get('/import-export', (req, res) => {
    getDadosGerais('2026', (turmas, materias) => {
        res.render('import-export', { 
            anos: ANOS_LETIVOS_DISPONIVEIS, 
            turmas, 
            materias, 
            sucesso: req.query.sucesso 
        });
    });
});

// Excluir Aluno individual
app.post('/aluno/excluir', (req, res) => {
    const { aluno_id, turma, ano } = req.body;
    if (aluno_id) {
        db.run("DELETE FROM notas WHERE aluno_id = ?", [aluno_id], () => {
            db.run("DELETE FROM alunos WHERE id = ?", [aluno_id], () => {
                res.redirect(`/?ano=${ano || '2026'}&turma=${encodeURIComponent(turma || '')}&sucesso=Aluno excluído com sucesso!`);
            });
        });
    } else {
        res.redirect('/');
    }
});

// Promover / Exportar Alunos para Novo Ano Letivo (2027 a 2031)
app.post('/promover-ano', (req, res) => {
    const { turma_origem, ano_origem, ano_destino } = req.body;
    if (turma_origem && ano_origem && ano_destino) {
        // Buscar alunos da turma e ano origem
        db.all("SELECT * FROM alunos WHERE turma = ? AND ano_letivo = ?", [turma_origem, ano_origem], (err, alunos) => {
            if (alunos && alunos.length > 0) {
                // Criar turma no ano destino se não existir
                db.run("INSERT OR IGNORE INTO turmas (nome, ano_letivo) VALUES (?, ?)", [turma_origem, ano_destino], () => {
                    alunos.forEach(aluno => {
                        const novaMatricula = aluno.matricula + '-' + ano_destino.slice(-2);
                        db.run("INSERT OR IGNORE INTO alunos (nome, matricula, turma, telefone, responsavel, ano_letivo) VALUES (?, ?, ?, ?, ?, ?)",
                            [aluno.nome, novaMatricula, turma_origem, aluno.telefone, aluno.responsavel, ano_destino], function(err) {
                                if (!err && this.lastID) {
                                    const novoAlunoId = this.lastID;
                                    // Copiar notas básicas zera ou mantidas
                                    db.all("SELECT * FROM notas WHERE aluno_id = ?", [aluno.id], (err, notasAntigas) => {
                                        if (notasAntigas) {
                                            notasAntigas.forEach(n => {
                                                db.run("INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0)",
                                                    [novoAlunoId, turma_origem, n.materia, n.trimestre]);
                                            });
                                        }
                                    });
                                }
                            });
                    });
                    res.redirect(`/import-export?sucesso=Alunos da turma ${turma_origem} exportados para o ano letivo ${ano_destino} com sucesso!`);
                });
            } else {
                res.redirect(`/import-export?sucesso=Nenhum aluno encontrado na turma ${turma_origem} para o ano ${ano_origem}.`);
            }
        });
    } else {
        res.redirect('/import-export');
    }
});

app.post('/turmas/adicionar', (req, res) => {
    const { nome_turma, ano_letivo } = req.body;
    if (nome_turma) {
        const ano = ano_letivo || '2026';
        db.run("INSERT OR IGNORE INTO turmas (nome, ano_letivo) VALUES (?, ?)", [nome_turma.trim(), ano], () => {
            res.redirect(`/?ano=${ano}&turma=${encodeURIComponent(nome_turma.trim())}&sucesso=Turma cadastrada com sucesso!`);
        });
    } else {
        res.redirect('/');
    }
});

app.post('/turmas/excluir', (req, res) => {
    const { turma_remover, ano_letivo } = req.body;
    if (turma_remover) {
        const ano = ano_letivo || '2026';
        db.run("DELETE FROM notas WHERE turma = ? AND aluno_id IN (SELECT id FROM alunos WHERE ano_letivo = ?)", [turma_remover, ano], () => {
            db.run("DELETE FROM alunos WHERE turma = ? AND ano_letivo = ?", [turma_remover, ano], () => {
                db.run("DELETE FROM turmas WHERE nome = ? AND ano_letivo = ?", [turma_remover, ano], () => {
                    res.redirect(`/?ano=${ano}&sucesso=Turma excluída com sucesso!`);
                });
            });
        });
    } else {
        res.redirect('/');
    }
});

app.post('/materias/adicionar', (req, res) => {
    const { nome_materia } = req.body;
    if (nome_materia) {
        db.run("INSERT OR IGNORE INTO materias (nome) VALUES (?)", [nome_materia.trim()], () => {
            res.redirect('/?sucesso=Matéria adicionada com sucesso!');
        });
    } else {
        res.redirect('/');
    }
});

app.post('/materias/excluir', (req, res) => {
    const { materia_remover } = req.body;
    if (materia_remover) {
        db.run("DELETE FROM materias WHERE nome = ?", [materia_remover], () => {
            db.run("DELETE FROM notas WHERE materia = ?", [materia_remover], () => {
                res.redirect('/?sucesso=Matéria excluída com sucesso!');
            });
        });
    } else {
        res.redirect('/');
    }
});

app.get('/aluno/:id', (req, res) => {
    const alunoId = req.params.id;
    db.get("SELECT * FROM alunos WHERE id = ?", [alunoId], (err, aluno) => {
        if (!aluno) return res.status(404).send("Aluno não encontrado.");
        
        db.all("SELECT * FROM notas WHERE aluno_id = ?", [alunoId], (err, notas) => {
            res.render('aluno-detalhes', { aluno, notas: notas || [] });
        });
    });
});

app.get('/relatorios', (req, res) => {
    const anoLetivo = req.query.ano || '2026';
    getDadosGerais(anoLetivo, (turmas, materias) => {
        const turmaFiltro = req.query.turma || (turmas.length > 0 ? turmas[0] : '');
        
        const qTurma = `
            SELECT a.nome, n.materia, n.trimestre, 
                   (MAX(n.avaliacao1, n.avaliacao2) + n.trabalho1 + n.trabalho2 + n.trabalho3 + n.participacao) as notafinal
            FROM alunos a
            JOIN notas n ON a.id = n.aluno_id
            WHERE a.turma = ? AND a.ano_letivo = ?
        `;
        db.all(qTurma, [turmaFiltro, anoLetivo], (err, notasTurma) => {
            const qRankingTurma = `
                SELECT a.id, a.nome, a.turma, AVG(MAX(n.avaliacao1, n.avaliacao2) + n.trabalho1 + n.trabalho2 + n.trabalho3 + n.participacao) as media_geral
                FROM alunos a
                JOIN notas n ON a.id = n.aluno_id
                WHERE a.turma = ? AND a.ano_letivo = ?
                GROUP BY a.id
                ORDER BY media_geral DESC
                LIMIT 10
            `;
            db.all(qRankingTurma, [turmaFiltro, anoLetivo], (err, rankingTurma) => {
                res.render('relatorios', {
                    anos: ANOS_LETIVOS_DISPONIVEIS,
                    anoLetivo,
                    turmas,
                    turmaFiltro,
                    notasTurma: notasTurma || [],
                    rankingTurma: rankingTurma || []
                });
            });
        });
    });
});

app.post('/atualizar-notas', (req, res) => {
    const { turma, materia, trimestre, aluno_id, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas, ano } = req.body;

    if (!aluno_id) {
        return res.redirect(`/?ano=${ano || '2026'}&turma=${encodeURIComponent(turma)}&materia=${encodeURIComponent(materia)}&trimestre=${trimestre}`);
    }

    const alunoIds = Array.isArray(aluno_id) ? aluno_id : [aluno_id];
    let completed = 0;

    for (let i = 0; i < alunoIds.length; i++) {
        const aid = alunoIds[i];
        const av1 = parseFloat(Array.isArray(avaliacao1) ? avaliacao1[i] : avaliacao1) || 0;
        const av2 = parseFloat(Array.isArray(avaliacao2) ? avaliacao2[i] : avaliacao2) || 0;
        const t1 = parseFloat(Array.isArray(trabalho1) ? trabalho1[i] : trabalho1) || 0;
        const t2 = parseFloat(Array.isArray(trabalho2) ? trabalho2[i] : trabalho2) || 0;
        const t3 = parseFloat(Array.isArray(trabalho3) ? trabalho3[i] : trabalho3) || 0;
        const pt = parseFloat(Array.isArray(participacao) ? participacao[i] : participacao) || 0;
        const ft = parseInt(Array.isArray(faltas) ? faltas[i] : faltas) || 0;

        db.get("SELECT id FROM notas WHERE aluno_id = ? AND materia = ? AND trimestre = ?", [aid, materia, trimestre], (err, row) => {
            if (row) {
                db.run("UPDATE notas SET avaliacao1 = ?, avaliacao2 = ?, trabalho1 = ?, trabalho2 = ?, trabalho3 = ?, participacao = ?, faltas = ? WHERE id = ?",
                    [av1, av2, t1, t2, t3, pt, ft, row.id], checkDone);
            } else {
                db.run("INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [aid, turma, materia, trimestre, av1, av2, t1, t2, t3, pt, ft], checkDone);
            }
        });
    }

    function checkDone() {
        completed++;
        if (completed === alunoIds.length) {
            res.redirect(`/?ano=${ano || '2026'}&turma=${encodeURIComponent(turma)}&materia=${encodeURIComponent(materia)}&trimestre=${trimestre}&sucesso=Notas atualizadas com sucesso!`);
        }
    }
});

app.post('/importar-diario', (req, res) => {
    const { turma, dados_brutos, ano_letivo } = req.body;
    const ano = ano_letivo || '2026';
    if (dados_brutos) {
        const linhas = dados_brutos.split('\n');
        linhas.forEach(linha => {
            const partes = linha.split(/[,;\t]/);
            if (partes.length >= 1 && partes[0].trim().length > 0) {
                const nome = partes[0].trim();
                const matricula = partes[1] ? partes[1].trim() : String(Math.floor(Date.now() + Math.random() * 1000));
                const telefone = partes[2] ? partes[2].trim() : '(11) 99999-9999';
                
                db.run(`INSERT OR IGNORE INTO alunos (nome, matricula, turma, telefone, responsavel, ano_letivo) VALUES (?, ?, ?, ?, ?, ?)`,
                    [nome, matricula, turma, telefone, 'Responsável Padrão', ano]);
            }
        });
    }
    res.redirect(`/import-export?sucesso=Alunos importados com sucesso para o ano ${ano}!`);
});

app.get('/exportar/excel', (req, res) => {
    const { turma, materia, trimestre, ano } = req.query;
    const anoLetivo = ano || '2026';
    const query = `
        SELECT a.matricula, a.nome, a.turma, n.materia, n.trimestre, n.avaliacao1, n.avaliacao2, n.trabalho1, n.trabalho2, n.trabalho3, n.participacao, n.faltas
        FROM alunos a
        LEFT JOIN notas n ON a.id = n.aluno_id AND n.materia = ? AND n.trimestre = ?
        WHERE a.turma = ? AND a.ano_letivo = ?
    `;
    db.all(query, [materia || 'Inglês', trimestre || '1', turma || '901', anoLetivo], (err, rows) => {
        let csv = `Colégio Estadual Euclides Feliciano Tardin - Diário de Classe (${anoLetivo})\n`;
        csv += "Matricula,Nome,Turma,Materia,Trimestre,Avaliacao1,Avaliacao2,MaiorAvaliacao,Trabalho1,Trabalho2,Trabalho3,Participacao,Faltas,NotaFinal,Status\n";
        (rows || []).forEach(r => {
            const av1 = r.avaliacao1 || 0;
            const av2 = r.avaliacao2 || 0;
            const maiorAv = Math.max(av1, av2);
            const t1 = r.trabalho1 || 0;
            const t2 = r.trabalho2 || 0;
            const t3 = r.trabalho3 || 0;
            const pt = r.participacao || 0;
            const notaFinalCalculada = Math.min(10, maiorAv + t1 + t2 + t3 + pt).toFixed(1);
            const status = notaFinalCalculada >= 5.0 ? "Aprovado" : "Reprovado (Nota Vermelha)";
            csv += `"${r.matricula}","${r.nome}","${r.turma}","${r.materia || materia}","${r.trimestre || trimestre}",${av1},${av2},${maiorAv},${t1},${t2},${t3},${pt},${r.faltas || 0},${notaFinalCalculada},"${status}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=diario_oficial_${anoLetivo}_${turma}_${materia}.csv`);
        res.send(csv);
    });
});

app.listen(PORT, () => {
    console.log(`Painel do Colégio Estadual Euclides Feliciano Tardin rodando em http://localhost:${PORT}`);
});

app.post('/aluno/atualizar/:id', (req, res) => {
    const alunoId = req.params.id;
    const { nome, telefone, responsavel } = req.body;
    if (nome) {
        db.run("UPDATE alunos SET nome = ?, telefone = ?, responsavel = ? WHERE id = ?", 
            [nome.trim(), telefone ? telefone.trim() : '', responsavel ? responsavel.trim() : '', alunoId], () => {
            res.redirect(`/aluno/${alunoId}?sucesso=Dados atualizados com sucesso!`);
        });
    } else {
        res.redirect(`/aluno/${alunoId}`);
    }
});
