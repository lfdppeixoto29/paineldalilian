// Migra os dados do database.sqlite local para o banco remoto (Turso).
// Uso: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... node migrar_turso.js

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
    process.exit(1);
}

const local = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
const remoto = createClient({ url, authToken });

const DDL = [
    `CREATE TABLE IF NOT EXISTS turmas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        ano_letivo TEXT DEFAULT '2026'
    )`,
    `CREATE TABLE IF NOT EXISTS alunos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        matricula TEXT UNIQUE NOT NULL,
        turma TEXT NOT NULL,
        telefone TEXT,
        responsavel TEXT,
        ano_letivo TEXT DEFAULT '2026'
    )`,
    `CREATE TABLE IF NOT EXISTS materias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS notas (
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
        faltas INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS avisos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        conteudo TEXT NOT NULL,
        data TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
];

const TABELAS = ['turmas', 'alunos', 'materias', 'notas', 'avisos'];

function lerLocal(tabela) {
    return new Promise((resolve, reject) => {
        local.all(`SELECT * FROM ${tabela}`, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
}

function fecharLocal() {
    return new Promise((resolve) => local.close(() => resolve()));
}

(async () => {
    for (const sql of DDL) await remoto.execute(sql);
    console.log('Tabelas garantidas no banco remoto.');

    for (const tabela of TABELAS) {
        const rows = await lerLocal(tabela);
        if (!rows.length) {
            console.log(`${tabela}: 0 registros locais.`);
            continue;
        }
        const colunas = Object.keys(rows[0]);
        const placeholders = colunas.map(() => '?').join(', ');
        const statements = rows.map((row) => ({
            sql: `INSERT OR REPLACE INTO ${tabela} (${colunas.join(', ')}) VALUES (${placeholders})`,
            args: colunas.map((c) => (row[c] === undefined ? null : row[c])),
        }));

        for (let i = 0; i < statements.length; i += 200) {
            await remoto.batch(statements.slice(i, i + 200), 'write');
        }

        const total = await remoto.execute(`SELECT COUNT(*) as total FROM ${tabela}`);
        console.log(`${tabela}: ${rows.length} enviados | ${total.rows[0][0]} no remoto.`);
    }

    await fecharLocal();
    remoto.close();
    console.log('Migracao concluida.');
})().catch(async (err) => {
    console.error('Falha na migracao:', err.message);
    await fecharLocal();
    process.exit(1);
});
