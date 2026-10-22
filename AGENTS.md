# AGENTS.md — Memória do Projeto

Contexto permanente para agentes que trabalharem neste repositório.
Atualizado em: 22/10/2026

---

## Identidade do projeto

- **Nome:** Painel Acadêmico — Professora Lilian (Colégio Estadual Euclides Feliciano Tardin)
- **URL de produção (não alterar):** https://paineldalilian.onrender.com — já foi divulgada; o endereço deve permanecer o mesmo.
- **Repositório:** https://github.com/lfdppeixoto29/paineldalilian (branch `master`, **público**)
- **Stack:** Node.js + Express + EJS + `@libsql/client` (Turso)
- **Deploy:** Render, Web Service, plano **Free** (sem disco persistente), região Oregon, auto-deploy no `master`.

---

## Banco de dados (crítico)

- **Produção usa Turso (libSQL), não o arquivo local.**
  - URL: `libsql://paineldalilian-lfdppeixoto29.aws-sa-east-1.turso.io`
  - Variáveis de ambiente no Render: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
  - Região São Paulo (grupo `salao`), org `lfdppeixoto29`.
- **Sem as variáveis acima**, `server.js` cai no `database.sqlite` local (modo dev). Nunca dependa do arquivo local em produção.
- `db-client.js` adapta a API do `sqlite3` (`run/get/all/serialize/prepare`, `this.lastID`, `this.changes`) sobre o `@libsql/client`, com fila serializada e retry em falhas transitórias.
- `database.sqlite` continua versionado (seed de desenvolvimento). Não é mais a fonte de verdade.
- **Histórico do problema resolvido:** antes, cada deploy/restart restaurava o snapshot do SQLite versionado — alunos excluídos "voltavam". Isso **não** acontece mais com o Turso.

### Schema (sem coluna `ano_letivo` em `notas`)
- `turmas (id, nome, ano_letivo)`
- `alunos (id, nome, matricula UNIQUE NOT NULL, turma, telefone, responsavel, ano_letivo)`
- `materias (id, nome UNIQUE)`
- `notas (id, aluno_id, turma, materia, trimestre, avaliacao1, avaliacao2, trabalho1, trabalho2, trabalho3, participacao, faltas)`
- `avisos (id, titulo, conteudo, data)`

---

## Credenciais

- **Nunca** versionar chaves. Elas ficam em `config.local.js` e `CREDENCIAIS.local.md` (ambos no `.gitignore`).
- Em produção, ficam nas env vars do Render.
- **Pendência:** a API key do Render (`rnd_...`) esteve versionada em `test_render.js` desde o commit inicial (`7f98e2e`) no repo público — ou seja, está no histórico do Git. O arquivo foi sanitizado, mas a chave deve ser **rotacionada** pelo usuário. Os scripts agora leem `process.env` ou `config.local.js`.

---

## Regras de trabalho

1. **Deploy só existe depois de `git push`.** `trigger_redeploy.js` recompila o último commit enviado; sem push, nada muda. Várias reclamações de "não atualizou" vieram disso.
2. **Plano Free = instância única.** Durante deploy/restart o site responde **502** por ~40 s. Evitar salvar dados nesse intervalo; nunca fazer deploy enquanto o usuário estiver lançando notas.
3. **Não trocar a URL** de produção.
4. **Nunca** rodar scripts destrutivos (`deduplicar_alunos.js`, `limpar_notas_duplicadas.js`, `remover_turmas.js`, etc.) sem confirmação explícita do usuário.
5. Testes de escrita em produção devem usar registros temporários (ex.: turma `TESTE_QA`) e ser removidos em seguida.
6. Preferir validar localmente com as variáveis do Turso antes de publicar.

---

## Estado atual dos dados (22/10/2026)

- 228 alunos ativos, 8 turmas: `2001 EMTI` (10), `3001` (29), `3002` (26), `3003` (34), `901` (33), `902` (32), `903` (29), `Ensino Médio Integrado` (35).
- 3 matérias: Inglês, Língua Portuguesa, Reforço.
- Último commit de referência: `8fb73c4`.

---

## Funcionalidades implementadas recentemente

1. **Relatórios (`views/relatorios.ejs` + rota `/relatorios`)**
   - Top 10 geral (todas as turmas).
   - Pódio Top 3 da turma (🥇🥈🥉) e **Pódio Geral Top 3** lado a lado, dentro da área de filtros.
   - Consultas usam `MAX(n.avaliacao1, n.avaliacao2)` + `AVG(...)` — compatível com libSQL.
2. **Inclusão de aluno (`/aluno/adicionar`)** — gera matrícula automática e notas zeradas; antes falhava silenciosamente por causa da coluna `matricula NOT NULL`.
3. **Resiliência** — keep-alive via GitHub Actions (`*/10 * * * *`), retry no banco, handlers globais de erro no Express.
4. **Persistência real** — Turso, validada com criação/exclusão de aluno + restart do serviço.

---

## Comandos úteis

```powershell
# status do deploy
node check_deploy.js

# disparar deploy do último commit enviado
node trigger_redeploy.js

# rodar local com o banco de produção
$env:TURSO_DATABASE_URL = 'libsql://paineldalilian-lfdppeixoto29.aws-sa-east-1.turso.io'
$env:TURSO_AUTH_TOKEN = '<token>'
node server.js

# migrar dados do banco local para o Turso
node migrar_turso.js
```

---

## Armadilhas conhecidas

- `notas` **não** possui `ano_letivo`; o ano é derivado de `alunos.ano_letivo`.
- O Render Free dorme após ~15 min sem acesso; o workflow de keep-alive evita o 502 da primeira requisição.
- Workflows agendados do GitHub são desativados após ~60 dias sem atividade no repositório; se o keep-alive parar, reativar em Actions.
- `seed_oficial.js` não é executado pelo `server.js` — não sobrescreve dados.
- Repositório `lfdppeixoto29/paineldalilian-data` foi criado por engano (vazio, privado); pode ser apagado manualmente.
