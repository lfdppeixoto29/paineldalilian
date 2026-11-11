const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// Quantos dias o link publico do PDF continua valido (padrao: 7 dias)
const PDF_LINK_TTL_DIAS = Math.max(1, parseInt(process.env.PDF_LINK_TTL_DIAS || '7', 10) || 7);

// Necessario para identificar https atras do proxy do Render
app.set('trust proxy', true);

process.chdir(__dirname);

const dbFile = path.join(__dirname, 'database.sqlite');
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

let db;
if (tursoUrl) {
    const { criarBancoRemoto } = require('./db-client');
    db = criarBancoRemoto(tursoToken ? { url: tursoUrl, authToken: tursoToken } : { url: tursoUrl });
    console.log('Conectado ao banco de dados remoto (Turso):', tursoUrl);
    initDb();
} else {
    db = new sqlite3.Database(dbFile, (err) => {
        if (err) {
            console.error('Erro ao abrir o banco de dados:', err.message);
        } else {
            console.log('Conectado ao banco de dados do Colégio Estadual Euclides Feliciano Tardin.');
            initDb();
        }
    });
}

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

        // PDFs publicados no servidor para download via link (WhatsApp)
        // Nome proprio para nao conflitar com a tabela legada "pdfs" (schema antigo).
        db.run(`CREATE TABLE IF NOT EXISTS pdf_links (
            token TEXT PRIMARY KEY,
            aluno_id INTEGER,
            nome_arquivo TEXT NOT NULL,
            conteudo TEXT NOT NULL,
            criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
            expira_em TEXT NOT NULL
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_pdf_links_expira_em ON pdf_links (expira_em)`);
        db.run(`DELETE FROM pdf_links WHERE expira_em < ?`, [new Date().toISOString()]);

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

app.post('/aluno/adicionar', (req, res) => {
    const { nome, turma } = req.body;
    const anoLetivo = req.body.ano_letivo || req.body.ano || '2026';
    if (!nome || !turma) return res.redirect('/');

    const nomeLimpo = nome.trim();
    const turmaLimpa = turma.trim();
    const prefixo = (turmaLimpa.match(/\d+/g) || []).join('') || '0000';

    function tentarInserir(sequencia) {
        const matricula = prefixo + String(sequencia).padStart(2, '0');
        db.run(
            'INSERT INTO alunos (nome, matricula, turma, telefone, responsavel, ano_letivo) VALUES (?, ?, ?, ?, ?, ?)',
            [nomeLimpo, matricula, turmaLimpa, '', '', anoLetivo],
            function (err) {
                if (err) {
                    // Matricula ja existente: tenta a proxima sequencia
                    if (/UNIQUE/i.test(err.message || '') && sequencia < 999) {
                        return tentarInserir(sequencia + 1);
                    }
                    return res.redirect('/?ano=' + anoLetivo + '&turma=' + encodeURIComponent(turmaLimpa) + '&sucesso=Erro ao incluir aluno: ' + encodeURIComponent(err.message || 'falha desconhecida'));
                }

                const alunoId = this.lastID;
                db.all('SELECT nome FROM materias ORDER BY nome ASC', (err2, materiasRows) => {
                    const materias = (materiasRows && materiasRows.length ? materiasRows.map((m) => m.nome) : ['Inglês', 'Língua Portuguesa', 'Reforço']);
                    const stmt = db.prepare('INSERT INTO notas (aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0)');
                    materias.forEach((materia) => {
                        [1, 2, 3].forEach((trim) => {
                            stmt.run(alunoId, turmaLimpa, materia, trim);
                        });
                    });
                    stmt.finalize();
                    res.redirect('/?ano=' + anoLetivo + '&turma=' + encodeURIComponent(turmaLimpa) + '&sucesso=Aluno incluido com sucesso!');
                });
            }
        );
    }

    tentarInserir(1);
});

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
    const autoImprimir = req.query.imprimir === '1';
    db.get("SELECT * FROM alunos WHERE id = ?", [alunoId], (err, aluno) => {
        if (!aluno) return res.status(404).send("Aluno não encontrado.");
        
        db.all("SELECT * FROM notas WHERE aluno_id = ?", [alunoId], (err, notas) => {
            res.render('aluno-detalhes', { aluno, notas: notas || [], autoImprimir });
        });
    });
});

// Gera o PDF do aluno em memoria (usado pelo download direto e pelo link publico)
function gerarPdfBuffer(aluno, notas) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const partes = [];
            doc.on('data', (parte) => partes.push(parte));
            doc.on('end', () => resolve(Buffer.concat(partes)));
            doc.on('error', reject);

            // Cabeçalho
            doc.fontSize(18).fillColor('#1e3c72').text('Colégio Estadual Euclides Feliciano Tardin', { align: 'center' });
            doc.fontSize(12).fillColor('#555').text('Relatório de Desempenho Escolar', { align: 'center' });
            doc.moveDown(1.5);

            // Dados do Aluno
            doc.fontSize(12).fillColor('#000').text(`Aluno(a): ${aluno.nome}`);
            doc.text(`Matrícula: ${aluno.matricula} | Turma: ${aluno.turma}`);
            doc.text(`Responsável: ${aluno.responsavel || 'Não informado'} | Telefone: ${aluno.telefone || 'Não informado'}`);
            doc.moveDown(1.5);

            // Tabela de Notas
            doc.fontSize(14).fillColor('#1e3c72').text('Histórico de Notas e Frequência', { underline: true });
            doc.moveDown(0.8);

            (notas || []).forEach((n, idx) => {
                const av1 = n.avaliacao1 || 0;
                const av2 = n.avaliacao2 || 0;
                const maior = Math.max(av1, av2);
                const trabalhos = (n.trabalho1 || 0) + (n.trabalho2 || 0) + (n.trabalho3 || 0);
                const part = n.participacao || 0;
                const final = Math.min(10, maior + trabalhos + part).toFixed(1);
                const status = final >= 5.0 ? 'APROVADO' : 'REPROVADO';

                doc.fontSize(11).fillColor('#333').text(`${idx + 1}. Matéria: ${n.materia} (${n.trimestre}º Trimestre)`);
                doc.text(`   Av1: ${av1} | Av2: ${av2} (Maior: ${maior}) | Trabalhos: ${trabalhos} | Part: ${part} | Faltas: ${n.faltas || 0}`);
                doc.text(`   Nota Final: ${final} - Status: ${status}`);
                doc.moveDown(0.5);
            });

            doc.moveDown(2);
            doc.fontSize(10).fillColor('#777').text('Documento gerado automaticamente pelo Sistema Acadêmico.', { align: 'center' });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// Nome de arquivo seguro (sem acentos, espacos ou caracteres especiais)
function nomeArquivoSeguro(nome, matricula) {
    const base = `boletim_${nome || 'aluno'}_${matricula || ''}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const limpo = base
        .replace(/[^A-Za-z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    return `${limpo || 'boletim'}.pdf`;
}

// Endereco publico do servidor (para montar o link enviado no WhatsApp)
function obterUrlPublica(req) {
    const configurada = process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL;
    if (configurada) return String(configurada).replace(/\/+$/, '');
    const protocolo = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    return `${protocolo}://${req.get('host')}`;
}

function limparPdfsExpirados() {
    db.run("DELETE FROM pdf_links WHERE expira_em < ?", [new Date().toISOString()], (err) => {
        if (err) console.error('Erro ao limpar PDFs expirados:', err);
    });
}

// Visualizar/baixar o PDF do aluno na hora (sem publicar link)
app.get('/api/gerar-pdf/:id', (req, res) => {
    const alunoId = req.params.id;
    db.get("SELECT * FROM alunos WHERE id = ?", [alunoId], (err, aluno) => {
        if (!aluno) return res.status(404).send("Aluno não encontrado.");

        db.all("SELECT * FROM notas WHERE aluno_id = ?", [alunoId], async (err2, notas) => {
            try {
                const buffer = await gerarPdfBuffer(aluno, notas || []);
                const nomeArquivo = nomeArquivoSeguro(aluno.nome, aluno.matricula);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${nomeArquivo}"`);
                res.setHeader('Content-Length', buffer.length);
                res.send(buffer);
            } catch (e) {
                console.error('Erro ao gerar PDF do aluno', alunoId, e);
                res.status(500).send('Erro ao gerar o PDF.');
            }
        });
    });
});

// Publica o PDF no servidor e devolve um link publico para enviar no WhatsApp
function criarLinkPdf(req, res) {
    const alunoId = req.params.id;
    db.get("SELECT * FROM alunos WHERE id = ?", [alunoId], (err, aluno) => {
        if (err || !aluno) return res.status(404).json({ erro: 'Aluno não encontrado.' });

        db.all("SELECT * FROM notas WHERE aluno_id = ?", [alunoId], async (err2, notas) => {
            if (err2) return res.status(500).json({ erro: 'Erro ao consultar as notas do aluno.' });

            try {
                const buffer = await gerarPdfBuffer(aluno, notas || []);
                const token = crypto.randomBytes(16).toString('hex');
                const nomeArquivo = nomeArquivoSeguro(aluno.nome, aluno.matricula);
                const agora = new Date();
                const expiraEm = new Date(agora.getTime() + PDF_LINK_TTL_DIAS * 24 * 60 * 60 * 1000).toISOString();

                db.run(
                    "INSERT INTO pdf_links (token, aluno_id, nome_arquivo, conteudo, criado_em, expira_em) VALUES (?, ?, ?, ?, ?, ?)",
                    [token, aluno.id, nomeArquivo, buffer.toString('base64'), agora.toISOString(), expiraEm],
                    (err3) => {
                        if (err3) {
                            console.error('Erro ao salvar PDF no banco:', err3);
                            return res.status(500).json({ erro: 'Não foi possível publicar o PDF no servidor.' });
                        }

                        const caminho = `/pdf/${token}`;
                        res.json({
                            url: `${obterUrlPublica(req)}${caminho}`,
                            caminho,
                            token,
                            nome_arquivo: nomeArquivo,
                            tamanho: buffer.length,
                            expira_em: expiraEm
                        });

                        limparPdfsExpirados();
                    }
                );
            } catch (e) {
                console.error('Erro ao gerar PDF para link', alunoId, e);
                res.status(500).json({ erro: 'Erro ao gerar o PDF.' });
            }
        });
    });
}

app.post('/api/criar-pdf-url/:id', criarLinkPdf);
app.get('/api/criar-pdf-url/:id', criarLinkPdf);

// Download publico do PDF a partir do token (link enviado ao responsavel)
app.get('/pdf/:token', (req, res) => {
    const token = String(req.params.token || '');
    if (!/^[a-f0-9]{32}$/.test(token)) return res.status(400).send('Link inválido.');

    db.get("SELECT nome_arquivo, conteudo, expira_em FROM pdf_links WHERE token = ?", [token], (err, row) => {
        if (err) {
            console.error('Erro ao buscar PDF', token, err);
            return res.status(500).send('Erro ao buscar o arquivo.');
        }
        if (!row) return res.status(404).send('Arquivo não encontrado. Peça um novo link à professora.');

        if (row.expira_em && new Date(row.expira_em).getTime() < Date.now()) {
            db.run("DELETE FROM pdf_links WHERE token = ?", [token]);
            return res.status(410).send('Este link expirou. Peça um novo link à professora.');
        }

        const buffer = Buffer.from(row.conteudo, 'base64');
        const nomeOriginal = row.nome_arquivo || 'boletim.pdf';
        const nomeAscii = String(nomeOriginal).replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nomeOriginal)}`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.send(buffer);
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
                WHERE a.ano_letivo = ?
                GROUP BY a.id
                ORDER BY media_geral DESC
                LIMIT 10
            `;
            db.all(qRankingTurma, [anoLetivo], (err, rankingTurma) => {
                const qPodioTurma = `
                    SELECT a.id, a.nome, a.turma, AVG(MAX(n.avaliacao1, n.avaliacao2) + n.trabalho1 + n.trabalho2 + n.trabalho3 + n.participacao) as media_geral
                    FROM alunos a
                    JOIN notas n ON a.id = n.aluno_id
                    WHERE a.turma = ? AND a.ano_letivo = ?
                    GROUP BY a.id
                    ORDER BY media_geral DESC
                    LIMIT 3
                `;
                db.all(qPodioTurma, [turmaFiltro, anoLetivo], (err, podioTurma) => {
                    const qPodioGeral = `
                        SELECT a.id, a.nome, a.turma, AVG(MAX(n.avaliacao1, n.avaliacao2) + n.trabalho1 + n.trabalho2 + n.trabalho3 + n.participacao) as media_geral
                        FROM alunos a
                        JOIN notas n ON a.id = n.aluno_id
                        WHERE a.ano_letivo = ?
                        GROUP BY a.id
                        ORDER BY media_geral DESC
                        LIMIT 3
                    `;
                    db.all(qPodioGeral, [anoLetivo], (err, podioGeral) => {
                        const qAlunosTurmaCompleta = `
                            SELECT a.id as aluno_id, a.nome, a.matricula, a.turma, a.telefone, a.responsavel,
                                   n.materia, n.trimestre, n.avaliacao1, n.avaliacao2, n.trabalho1, n.trabalho2, n.trabalho3, n.participacao, n.faltas
                            FROM alunos a
                            LEFT JOIN notas n ON a.id = n.aluno_id
                            WHERE a.turma = ? AND a.ano_letivo = ?
                        `;
                        db.all(qAlunosTurmaCompleta, [turmaFiltro, anoLetivo], (err, alunosTurmaRows) => {
                            const qTodosAlunosCompleta = `
                                SELECT a.id as aluno_id, a.nome, a.matricula, a.turma, a.telefone, a.responsavel,
                                       n.materia, n.trimestre, n.avaliacao1, n.avaliacao2, n.trabalho1, n.trabalho2, n.trabalho3, n.participacao, n.faltas
                                FROM alunos a
                                LEFT JOIN notas n ON a.id = n.aluno_id
                                WHERE a.ano_letivo = ?
                            `;
                            db.all(qTodosAlunosCompleta, [anoLetivo], (err, todosAlunosRows) => {
                                res.render('relatorios', {
                                    anos: ANOS_LETIVOS_DISPONIVEIS,
                                    anoLetivo,
                                    turmas,
                                    turmaFiltro,
                                    notasTurma: notasTurma || [],
                                    rankingTurma: rankingTurma || [],
                                    podioTurma: podioTurma || [],
                                    podioGeral: podioGeral || [],
                                    alunosTurmaRows: alunosTurmaRows || [],
                                    todosAlunosRows: todosAlunosRows || []
                                });
                            });
                        });
                    });
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
    const { turma, materia, trimestre, ano, aluno_id } = req.query;
    const anoLetivo = ano || '2026';
    
    let query = "";
    let params = [];
    let filename = "";

    if (aluno_id) {
        query = `
            SELECT a.matricula, a.nome, a.turma, n.materia, n.trimestre, n.avaliacao1, n.avaliacao2, n.trabalho1, n.trabalho2, n.trabalho3, n.participacao, n.faltas
            FROM alunos a
            LEFT JOIN notas n ON a.id = n.aluno_id
            WHERE a.id = ? AND a.ano_letivo = ?
        `;
        params = [aluno_id, anoLetivo];
        filename = `boletim_individual_${aluno_id}_${anoLetivo}.csv`;
    } else if (turma && !materia) {
        query = `
            SELECT a.matricula, a.nome, a.turma, n.materia, n.trimestre, n.avaliacao1, n.avaliacao2, n.trabalho1, n.trabalho2, n.trabalho3, n.participacao, n.faltas
            FROM alunos a
            LEFT JOIN notas n ON a.id = n.aluno_id
            WHERE a.turma = ? AND a.ano_letivo = ?
        `;
        params = [turma, anoLetivo];
        filename = `relatorio_turma_${turma}_${anoLetivo}.csv`;
    } else if (turma && materia) {
        query = `
            SELECT a.matricula, a.nome, a.turma, n.materia, n.trimestre, n.avaliacao1, n.avaliacao2, n.trabalho1, n.trabalho2, n.trabalho3, n.participacao, n.faltas
            FROM alunos a
            LEFT JOIN notas n ON a.id = n.aluno_id AND n.materia = ? AND n.trimestre = ?
            WHERE a.turma = ? AND a.ano_letivo = ?
        `;
        params = [materia, trimestre || '1', turma, anoLetivo];
        filename = `diario_${turma}_${materia}_T${trimestre || '1'}_${anoLetivo}.csv`;
    } else {
        query = `
            SELECT a.matricula, a.nome, a.turma, n.materia, n.trimestre, n.avaliacao1, n.avaliacao2, n.trabalho1, n.trabalho2, n.trabalho3, n.participacao, n.faltas
            FROM alunos a
            LEFT JOIN notas n ON a.id = n.aluno_id
            WHERE a.ano_letivo = ?
        `;
        params = [anoLetivo];
        filename = `relatorio_geral_${anoLetivo}.csv`;
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erro ao gerar arquivo.");
        }
        let csv = `Colégio Estadual Euclides Feliciano Tardin - Relatório (${anoLetivo})\n`;
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
            const status = notaFinalCalculada >= 5.0 ? "Aprovado" : "Reprovado";
            csv += `"${r.matricula}","${r.nome}","${r.turma}","${r.materia || 'N/A'}","${r.trimestre || 'N/A'}",${av1},${av2},${maiorAv},${t1},${t2},${t3},${pt},${r.faltas || 0},${notaFinalCalculada},"${status}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
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

// Rede de seguranca: evita que uma falha isolada derrube o processo (erro 502)
app.use((req, res) => {
    res.status(404).send('Pagina nao encontrada.');
});

app.use((err, req, res, next) => {
    console.error('Erro na requisicao', req.method, req.originalUrl, '-', err && err.stack ? err.stack : err);
    if (res.headersSent) return next(err);
    res.status(500).send('Ocorreu um erro ao processar a solicitacao. Tente novamente.');
});

process.on('unhandledRejection', (motivo) => {
    console.error('Promessa rejeitada sem tratamento:', motivo);
});

process.on('uncaughtException', (err) => {
    console.error('Erro nao capturado:', err && err.stack ? err.stack : err);
});
