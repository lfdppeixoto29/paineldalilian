// Adaptador que expoe a mesma API do sqlite3 (run/get/all/serialize/prepare)
// sobre o @libsql/client, permitindo usar o banco remoto (Turso) sem alterar as rotas.

function criarBancoRemoto(config) {
    const { createClient } = require('@libsql/client');
    const client = createClient(config);

    function normalizar(params) {
        if (!Array.isArray(params)) return [];
        return params.map((v) => {
            if (v === undefined) return null;
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (v instanceof Date) return v.toISOString();
            return v;
        });
    }

    function linhaParaObjeto(columns, row) {
        const obj = {};
        for (let i = 0; i < columns.length; i++) obj[columns[i]] = row[i];
        return obj;
    }

    // Fila para garantir a ordem das operacoes (equivalente ao modo serialized)
    let fila = Promise.resolve();

    function executar(sql, params) {
        const execucao = fila.then(() => client.execute({ sql, args: normalizar(params) }));
        fila = execucao.then(
            () => undefined,
            () => undefined
        );
        return execucao;
    }

    function run(sql, params, cb) {
        if (typeof params === 'function') {
            cb = params;
            params = [];
        }
        executar(sql, params)
            .then((res) => {
                if (cb) cb.call({ lastID: Number(res.lastInsertRowid || 0), changes: Number(res.rowsAffected || 0) }, null);
            })
            .catch((err) => {
                if (cb) cb.call({ lastID: 0, changes: 0 }, err);
            });
        return this;
    }

    function all(sql, params, cb) {
        if (typeof params === 'function') {
            cb = params;
            params = [];
        }
        executar(sql, params)
            .then((res) => {
                const linhas = res.rows.map((row) => linhaParaObjeto(res.columns, row));
                if (cb) cb(null, linhas);
            })
            .catch((err) => {
                if (cb) cb(err, []);
            });
        return this;
    }

    function get(sql, params, cb) {
        if (typeof params === 'function') {
            cb = params;
            params = [];
        }
        executar(sql, params)
            .then((res) => {
                const linhas = res.rows.map((row) => linhaParaObjeto(res.columns, row));
                if (cb) cb(null, linhas[0]);
            })
            .catch((err) => {
                if (cb) cb(err, undefined);
            });
        return this;
    }

    function serialize(fn) {
        if (typeof fn === 'function') fn();
        return this;
    }

    function prepare(sql) {
        const stmt = {
            run(...args) {
                let cb;
                let params = args;
                if (params.length && typeof params[params.length - 1] === 'function') {
                    cb = params[params.length - 1];
                    params = params.slice(0, -1);
                }
                if (params.length === 1 && Array.isArray(params[0])) params = params[0];
                run(sql, params, cb);
                return stmt;
            },
            finalize(cb) {
                if (typeof cb === 'function') cb(null);
                return stmt;
            },
        };
        return stmt;
    }

    return {
        run,
        get,
        all,
        serialize,
        prepare,
        exec(sql, cb) {
            return run(sql, [], cb);
        },
        close(cb) {
            client.close();
            if (typeof cb === 'function') cb(null);
        },
    };
}

module.exports = { criarBancoRemoto };
