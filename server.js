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

// ---------------------------------------------------------------------------
// Geracao do PDF do aluno (visual profissional + grafico de desempenho)
// ---------------------------------------------------------------------------
const PDF_CORES = {
    primaria: '#1e3c72',
    primariaClara: '#2a5298',
    destaque: '#2e86de',
    sucesso: '#1e8449',
    perigo: '#c0392b',
    texto: '#2c3e50',
    suave: '#7f8c8d',
    linha: '#dbe4ee',
    fundo: '#f4f7fb',
    zebra: '#f9fbfd',
    branco: '#ffffff'
};

function notaFinalPdf(n) {
    const maior = Math.max(Number(n.avaliacao1) || 0, Number(n.avaliacao2) || 0);
    const trabalhos = (Number(n.trabalho1) || 0) + (Number(n.trabalho2) || 0) + (Number(n.trabalho3) || 0);
    const participacao = Number(n.participacao) || 0;
    return Math.min(10, maior + trabalhos + participacao);
}

function formatarNotaPdf(valor) {
    return (Number(valor) || 0).toFixed(1).replace('.', ',');
}

function dataBrPdf(data) {
    const d = data || new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function truncarPdf(texto, max) {
    const t = String(texto == null ? '' : texto);
    return t.length > max ? `${t.slice(0, Math.max(1, max - 3)).trimEnd()}...` : t;
}

function calcularResumoPdf(notas) {
    const lista = (notas || []).map((n) => ({
        materia: n.materia || 'N/A',
        trimestre: n.trimestre,
        av1: Number(n.avaliacao1) || 0,
        av2: Number(n.avaliacao2) || 0,
        trabalhos: (Number(n.trabalho1) || 0) + (Number(n.trabalho2) || 0) + (Number(n.trabalho3) || 0),
        participacao: Number(n.participacao) || 0,
        faltas: Number(n.faltas) || 0,
        final: notaFinalPdf(n)
    }));

    lista.sort((a, b) => String(a.materia).localeCompare(String(b.materia), 'pt-BR') || (Number(a.trimestre) || 0) - (Number(b.trimestre) || 0));

    const total = lista.length;
    const mediaGeral = total ? lista.reduce((soma, n) => soma + n.final, 0) / total : 0;
    const faltas = lista.reduce((soma, n) => soma + n.faltas, 0);
    const materias = new Set(lista.map((n) => n.materia));

    const porMateria = {};
    lista.forEach((n) => {
        if (!porMateria[n.materia]) porMateria[n.materia] = { materia: n.materia, soma: 0, quantidade: 0 };
        porMateria[n.materia].soma += n.final;
        porMateria[n.materia].quantidade += 1;
    });
    const grafico = Object.values(porMateria)
        .map((m) => ({ materia: m.materia, media: m.soma / m.quantidade }))
        .sort((a, b) => String(a.materia).localeCompare(String(b.materia), 'pt-BR'));

    return { lista, mediaGeral, faltas, totalMaterias: materias.size, grafico };
}

function desenharGraficoPdf(doc, dados, x, y, largura, altura) {
    const baseY = y + altura;
    const eixoX = x + 30;
    const larguraPlot = largura - 30;

    doc.save();

    // Grade horizontal e escala de 0 a 10
    doc.lineWidth(0.5).strokeColor(PDF_CORES.linha);
    for (let valor = 0; valor <= 10; valor += 2) {
        const gy = baseY - (valor / 10) * altura;
        doc.moveTo(eixoX, gy).lineTo(eixoX + larguraPlot, gy).stroke();
        doc.font('Helvetica').fontSize(7).fillColor(PDF_CORES.suave)
            .text(String(valor), x, gy - 3.5, { width: 22, align: 'right', lineBreak: false });
    }

    // Linha de referencia (media minima 5,0)
    const yRef = baseY - 0.5 * altura;
    doc.dash(3, { space: 3 }).strokeColor(PDF_CORES.destaque).lineWidth(0.9)
        .moveTo(eixoX, yRef).lineTo(eixoX + larguraPlot, yRef).stroke().undash();

    const quantidade = Math.max(1, dados.length);
    const espaco = quantidade > 8 ? 6 : 20;
    const larguraBarra = Math.max(12, Math.min(48, (larguraPlot - espaco * (quantidade + 1)) / quantidade));
    const larguraTotal = larguraBarra * quantidade + espaco * (quantidade - 1);
    const inicio = eixoX + (larguraPlot - larguraTotal) / 2;

    dados.forEach((item, indice) => {
        const media = Math.max(0, Math.min(10, Number(item.media) || 0));
        const alturaBarra = (media / 10) * altura;
        const bx = inicio + indice * (larguraBarra + espaco);
        const by = baseY - alturaBarra;
        const cor = media >= 5 ? PDF_CORES.sucesso : PDF_CORES.perigo;

        doc.roundedRect(bx, by, larguraBarra, alturaBarra, 2).fill(cor);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(PDF_CORES.texto)
            .text(formatarNotaPdf(media), bx - 8, by - 12, { width: larguraBarra + 16, align: 'center', lineBreak: false });
        doc.font('Helvetica').fontSize(7).fillColor(PDF_CORES.suave)
            .text(truncarPdf(item.materia, 16), bx - 18, baseY + 5, { width: larguraBarra + 36, align: 'center', lineBreak: false });
    });

    // Rotulo da linha de referencia (desenhado por ultimo para ficar por cima das barras)
    doc.font('Helvetica').fontSize(7).fillColor(PDF_CORES.destaque)
        .text('Média mínima 5,0', eixoX + larguraPlot - 82, yRef - 11, { width: 82, align: 'right', lineBreak: false });

    doc.restore();
}

// Gera o PDF do aluno em memoria (usado pelo download direto e pelo link publico)
function gerarPdfBuffer(aluno, notas) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                bufferPages: true,
                info: {
                    Title: `Boletim - ${aluno.nome}`,
                    Author: 'Colégio Estadual Euclides Feliciano Tardin',
                    Subject: 'Relatório de Desempenho Escolar'
                }
            });
            const partes = [];
            doc.on('data', (parte) => partes.push(parte));
            doc.on('end', () => resolve(Buffer.concat(partes)));
            doc.on('error', reject);

            const largura = doc.page.width;
            const altura = doc.page.height;
            const margem = 40;
            const conteudo = largura - margem * 2;
            const resumo = calcularResumoPdf(notas);
            const emitidoEm = dataBrPdf(new Date());

            // ---- Faixa de cabecalho ----
            doc.rect(0, 0, largura, 92).fill(PDF_CORES.primaria);
            doc.rect(0, 92, largura, 4).fill(PDF_CORES.destaque);
            doc.font('Helvetica-Bold').fontSize(16).fillColor(PDF_CORES.branco)
                .text('Colégio Estadual Euclides Feliciano Tardin', margem, 24, { width: conteudo, align: 'center', lineBreak: false });
            doc.font('Helvetica').fontSize(10).fillColor('#cfe0ff')
                .text(`Relatório de Desempenho Escolar • Ano Letivo ${aluno.ano_letivo || '2026'}`, margem, 50, { width: conteudo, align: 'center', lineBreak: false });
            doc.font('Helvetica').fontSize(8).fillColor('#9fc0ff')
                .text(`Emitido em ${emitidoEm}`, margem, 68, { width: conteudo, align: 'center', lineBreak: false });

            // ---- Cartao do aluno ----
            const cardY = 116;
            doc.roundedRect(margem, cardY, conteudo, 82, 8).fillAndStroke(PDF_CORES.fundo, PDF_CORES.linha);
            doc.roundedRect(margem, cardY, 5, 82, 2.5).fill(PDF_CORES.destaque);
            doc.font('Helvetica-Bold').fontSize(13).fillColor(PDF_CORES.texto)
                .text(aluno.nome || 'Aluno', margem + 18, cardY + 12, { width: conteudo - 36, lineBreak: false });
            doc.font('Helvetica').fontSize(9).fillColor(PDF_CORES.suave)
                .text(`Matrícula: ${aluno.matricula || '-'}    •    Turma: ${aluno.turma || '-'}`, margem + 18, cardY + 36, { width: conteudo - 36, lineBreak: false });
            doc.text(`Responsável: ${aluno.responsavel || 'Não informado'}    •    Telefone: ${aluno.telefone || 'Não informado'}`, margem + 18, cardY + 54, { width: conteudo - 36, lineBreak: false });

            // ---- Indicadores ----
            const kpiY = 214;
            const kpiAltura = 58;
            const kpiEspaco = 10;
            const kpiLargura = (conteudo - kpiEspaco * 3) / 4;
            const situacao = resumo.mediaGeral >= 5 ? 'APROVADO' : 'RECUPERAÇÃO';
            const corSituacao = resumo.mediaGeral >= 5 ? PDF_CORES.sucesso : PDF_CORES.perigo;
            const kpis = [
                { rotulo: 'MÉDIA GERAL', valor: formatarNotaPdf(resumo.mediaGeral), cor: corSituacao },
                { rotulo: 'SITUAÇÃO', valor: situacao, cor: corSituacao },
                { rotulo: 'FALTAS REGISTRADAS', valor: String(resumo.faltas), cor: PDF_CORES.texto },
                { rotulo: 'MATÉRIAS', valor: String(resumo.totalMaterias), cor: PDF_CORES.texto }
            ];
            kpis.forEach((kpi, i) => {
                const kx = margem + i * (kpiLargura + kpiEspaco);
                doc.roundedRect(kx, kpiY, kpiLargura, kpiAltura, 6).fillAndStroke(PDF_CORES.branco, PDF_CORES.linha);
                doc.font('Helvetica').fontSize(7).fillColor(PDF_CORES.suave)
                    .text(kpi.rotulo, kx + 8, kpiY + 10, { width: kpiLargura - 16, align: 'center', lineBreak: false });
                doc.font('Helvetica-Bold').fontSize(kpi.rotulo === 'SITUAÇÃO' ? 10 : 16).fillColor(kpi.cor)
                    .text(kpi.valor, kx + 8, kpiY + 27, { width: kpiLargura - 16, align: 'center', lineBreak: false });
            });

            // ---- Tabela ----
            const tabelaY = 296;
            doc.font('Helvetica-Bold').fontSize(12).fillColor(PDF_CORES.primaria)
                .text('Detalhamento das notas', margem, tabelaY, { lineBreak: false });
            doc.font('Helvetica').fontSize(8).fillColor(PDF_CORES.suave)
                .text('Nota final = maior avaliação + trabalhos + participação', margem, tabelaY + 16, { lineBreak: false });

            const colunas = [
                { chave: 'materia', titulo: 'Matéria', x: margem, largura: 145, alinhamento: 'left' },
                { chave: 'trimestre', titulo: 'Trim.', x: margem + 145, largura: 38, alinhamento: 'center' },
                { chave: 'av1', titulo: 'Av1', x: margem + 183, largura: 40, alinhamento: 'center' },
                { chave: 'av2', titulo: 'Av2', x: margem + 223, largura: 40, alinhamento: 'center' },
                { chave: 'trabalhos', titulo: 'Trab.', x: margem + 263, largura: 42, alinhamento: 'center' },
                { chave: 'participacao', titulo: 'Part.', x: margem + 305, largura: 40, alinhamento: 'center' },
                { chave: 'faltas', titulo: 'Faltas', x: margem + 345, largura: 42, alinhamento: 'center' },
                { chave: 'final', titulo: 'Nota', x: margem + 387, largura: 48, alinhamento: 'center' },
                { chave: 'status', titulo: 'Status', x: margem + 435, largura: 80, alinhamento: 'center' }
            ];
            const larguraTabela = 515;
            const alturaCabecalho = 24;
            const alturaLinha = 22;
            const limiteInferior = altura - 86;

            function desenharCabecalhoTabela(posY) {
                doc.rect(margem, posY, larguraTabela, alturaCabecalho).fill(PDF_CORES.primaria);
                colunas.forEach((col) => {
                    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(PDF_CORES.branco)
                        .text(col.titulo, col.x + 4, posY + 8, { width: col.largura - 8, align: col.alinhamento, lineBreak: false });
                });
            }

            function desenharCabecalhoContinuacao() {
                doc.rect(0, 0, largura, 46).fill(PDF_CORES.primaria);
                doc.rect(0, 46, largura, 3).fill(PDF_CORES.destaque);
                doc.font('Helvetica-Bold').fontSize(10).fillColor(PDF_CORES.branco)
                    .text('Colégio Estadual Euclides Feliciano Tardin', margem, 15, { width: conteudo, align: 'center', lineBreak: false });
                doc.font('Helvetica').fontSize(7.5).fillColor('#cfe0ff')
                    .text(`Boletim de ${aluno.nome} • Matrícula ${aluno.matricula || '-'}`, margem, 30, { width: conteudo, align: 'center', lineBreak: false });
            }

            let y = tabelaY + 34;
            desenharCabecalhoTabela(y);
            y += alturaCabecalho;

            if (!resumo.lista.length) {
                doc.rect(margem, y, larguraTabela, 30).fill(PDF_CORES.zebra);
                doc.font('Helvetica').fontSize(9).fillColor(PDF_CORES.suave)
                    .text('Nenhuma nota lançada para este aluno.', margem, y + 10, { width: larguraTabela, align: 'center', lineBreak: false });
                y += 30;
            }

            resumo.lista.forEach((linha, indice) => {
                if (y + alturaLinha > limiteInferior) {
                    doc.addPage();
                    desenharCabecalhoContinuacao();
                    y = 70;
                    desenharCabecalhoTabela(y);
                    y += alturaCabecalho;
                }

                if (indice % 2 === 1) {
                    doc.rect(margem, y, larguraTabela, alturaLinha).fill(PDF_CORES.zebra);
                }
                doc.lineWidth(0.4).strokeColor(PDF_CORES.linha)
                    .moveTo(margem, y + alturaLinha).lineTo(margem + larguraTabela, y + alturaLinha).stroke();

                const aprovado = linha.final >= 5;
                const valores = {
                    materia: truncarPdf(linha.materia, 30),
                    trimestre: `${linha.trimestre}º`,
                    av1: formatarNotaPdf(linha.av1),
                    av2: formatarNotaPdf(linha.av2),
                    trabalhos: formatarNotaPdf(linha.trabalhos),
                    participacao: formatarNotaPdf(linha.participacao),
                    faltas: String(linha.faltas),
                    final: formatarNotaPdf(linha.final),
                    status: aprovado ? 'APROVADO' : 'REPROVADO'
                };

                colunas.forEach((col) => {
                    const destaque = col.chave === 'final' || col.chave === 'status';
                    let cor = PDF_CORES.texto;
                    if (col.chave === 'final' || col.chave === 'status') cor = aprovado ? PDF_CORES.sucesso : PDF_CORES.perigo;

                    doc.font(destaque ? 'Helvetica-Bold' : 'Helvetica')
                        .fontSize(col.chave === 'status' ? 6.8 : 8)
                        .fillColor(cor)
                        .text(valores[col.chave], col.x + 4, y + 7, { width: col.largura - 8, align: col.alinhamento, lineBreak: false });
                });

                y += alturaLinha;
            });

            // ---- Grafico de desempenho ----
            const alturaGrafico = 120;
            const blocoGrafico = 38 + alturaGrafico + 30;
            if (y + blocoGrafico > limiteInferior) {
                doc.addPage();
                desenharCabecalhoContinuacao();
                y = 70;
            } else {
                y += 26;
            }

            doc.font('Helvetica-Bold').fontSize(12).fillColor(PDF_CORES.primaria)
                .text('Desempenho por matéria', margem, y, { lineBreak: false });
            doc.font('Helvetica').fontSize(8).fillColor(PDF_CORES.suave)
                .text('Média das notas finais em cada disciplina', margem, y + 16, { lineBreak: false });

            if (resumo.grafico.length) {
                desenharGraficoPdf(doc, resumo.grafico, margem, y + 38, conteudo, alturaGrafico);
            } else {
                doc.font('Helvetica').fontSize(9).fillColor(PDF_CORES.suave)
                    .text('Sem dados suficientes para gerar o gráfico.', margem, y + 44, { width: conteudo, align: 'center' });
            }

            // Legenda do grafico
            const legendaY = y + 38 + alturaGrafico + 20;
            doc.circle(margem + 4, legendaY + 4, 3).fill(PDF_CORES.sucesso);
            doc.font('Helvetica').fontSize(7.5).fillColor(PDF_CORES.suave)
                .text('Média igual ou acima de 5,0', margem + 12, legendaY, { lineBreak: false });
            doc.circle(margem + 170, legendaY + 4, 3).fill(PDF_CORES.perigo);
            doc.font('Helvetica').fontSize(7.5).fillColor(PDF_CORES.suave)
                .text('Média abaixo de 5,0', margem + 178, legendaY, { lineBreak: false });

            // ---- Rodape e numeracao de paginas ----
            const rodapeY = altura - 66;
            doc.lineWidth(0.5).strokeColor(PDF_CORES.linha)
                .moveTo(margem, rodapeY).lineTo(margem + conteudo, rodapeY).stroke();
            doc.font('Helvetica').fontSize(7.5).fillColor(PDF_CORES.suave)
                .text('Documento gerado automaticamente pelo Sistema Acadêmico • Colégio Estadual Euclides Feliciano Tardin',
                    margem, rodapeY + 10, { width: conteudo * 0.72, align: 'left', lineBreak: false });

            const paginas = doc.bufferedPageRange();
            for (let i = 0; i < paginas.count; i++) {
                doc.switchToPage(paginas.start + i);
                doc.font('Helvetica').fontSize(7.5).fillColor(PDF_CORES.suave)
                    .text(`Página ${i + 1} de ${paginas.count}`, margem + conteudo * 0.72, rodapeY + 10,
                        { width: conteudo * 0.28, align: 'right', lineBreak: false });
            }

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
