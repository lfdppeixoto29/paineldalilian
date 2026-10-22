# Documentação Técnica - Painel Acadêmico (Professora Lilian)
**Colégio Estadual Euclides Feliciano Tardin**
**URL Online:** [https://paineldalilian.onrender.com](https://paineldalilian.onrender.com)
**Repositório GitHub:** `lfdppeixoto29/paineldalilian`

---

## 1. Atualizações Recentes (Outubro de 2026)

### 1.1 Persistência definitiva dos dados (banco externo Turso)
- O banco passou a ser **externo e permanente**: Turso (libSQL/SQLite na nuvem), região **São Paulo (aws-sa-east-1)**.
- Motivo: o Render no plano gratuito **não tem disco persistente**. O `database.sqlite` versionado no Git era restaurado a cada deploy/reinício, fazendo alunos excluídos "voltarem".
- Integração feita pela camada `db-client.js`, que expõe a mesma API do `sqlite3` (`run`, `get`, `all`, `serialize`, `prepare`) sobre o `@libsql/client` — nenhuma rota precisou ser reescrita.
- Sem as variáveis `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`, o app usa o `database.sqlite` local (modo desenvolvimento).
- Dados migrados do banco local para o Turso com `migrar_turso.js` (idempotente, `INSERT OR REPLACE`).
- **Resultado:** exclusões, notas e cadastros permanecem após deploy, reinício ou "dormir" do serviço.

### 1.2 Relatórios: Top 10 geral + pódios
- **Top 10 Melhores Alunos (Todas as Turmas)** — ranking geral do ano letivo, não mais restrito a uma turma.
- **Pódio - Top 3 da Turma** com 3 troféus (🥇 🥈 🥉), nome e média.
- **Pódio Geral - Top 3 de Todas as Turmas**, exibido **ao lado** do pódio da turma, dentro da área de filtros do relatório.

### 1.3 Correções
- **Inclusão de aluno:** a rota `/aluno/adicionar` nunca gravava (a coluna `matricula` é `NOT NULL` e não era preenchida; as notas usavam uma coluna `ano_letivo` inexistente em `notas`). Agora gera matrícula automática (prefixo da turma + sequência, com tratamento de duplicidade) e cria as notas zeradas em todas as matérias/trimestres.
- **Erro 502 (Bad Gateway):** ocorria durante deploys/restarts, quando a única instância do plano gratuito é substituída. Mitigações aplicadas:
  - *Keep-alive* automático a cada 10 minutos (`.github/workflows/keepalive.yml`) para o serviço não dormir por inatividade.
  - *Retry* automático no `db-client.js` (até 3 tentativas) para falhas transitórias de rede no Turso.
  - *Rede de segurança* no `server.js`: erro isolado em uma requisição não derruba mais o processo (handler de erro do Express + `unhandledRejection`/`uncaughtException`).
- **Segurança:** as chaves de API saíram dos scripts versionados e passaram a ser lidas de `config.local.js` (ignorado pelo Git) ou de variáveis de ambiente.

---

## 2. Visão Geral do Sistema
O Painel Acadêmico é uma aplicação web desenvolvida sob medida para a Professora Lilian gerenciar diários de classe, notas, faltas, frequência, relatórios estatísticos e comunicação via WhatsApp com responsáveis, suportando múltiplos anos letivos (2026-2031) e turmas do Ensino Fundamental e Médio (incluindo EMTI).

---

## 3. Tecnologias Utilizadas
- **Backend:** Node.js, Express.js
- **Banco de Dados:** Turso (libSQL / SQLite na nuvem) em produção, via `@libsql/client` + camada de compatibilidade `db-client.js`. Em desenvolvimento, sem as variáveis de ambiente do Turso, usa `database.sqlite`.
- **Template Engine:** EJS (Embedded JavaScript Templates)
- **Estilização:** CSS responsivo com suporte a smartphones e tablets.
- **Hospedagem e Deploy:** Render (Web Service Node.js, deploy contínuo via GitHub, plano Free).
- **Automação:** GitHub Actions (keep-alive do serviço).

---

## 4. Infraestrutura e Credenciais

> As chaves **não são versionadas**. Ficam em `config.local.js` / `CREDENCIAIS.local.md` (ambos no `.gitignore`) e, em produção, nas variáveis de ambiente do Render.

### 4.1 Aplicação (Render)
| Item | Valor |
|---|---|
| URL | `https://paineldalilian.onrender.com` |
| Service ID | `srv-dbcls2om7kps73c5r5u0` |
| Owner ID | `tea-db7uncmq1p3s739kpg7g` |
| Plano / região | Free / Oregon |
| Branch de deploy | `master` (auto-deploy) |

**Variáveis de ambiente configuradas no Render:**
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

### 4.2 Banco de dados (Turso)
| Item | Valor |
|---|---|
| Organização | `lfdppeixoto29` |
| Grupo / região | `salao` / `aws-sa-east-1` (São Paulo) |
| Banco | `paineldalilian` |
| URL libSQL | `libsql://paineldalilian-lfdppeixoto29.aws-sa-east-1.turso.io` |

As credenciais completas (tokens de API do Render e do Turso) estão em `CREDENCIAIS.local.md`, na raiz do projeto, **fora do controle de versão**.

> ⚠️ **Pendência de segurança:** a chave `rnd_...` do Render esteve versionada no repositório público
> (arquivo `test_render.js`, desde o commit inicial `7f98e2e`). O arquivo já foi sanitizado, mas a chave
> continua no histórico do Git. Recomenda-se revogá-la em Render → Account Settings → API Keys e gerar uma nova.

### 4.3 API do Render (operações administrativas)
```powershell
$h = @{ Authorization = "Bearer $env:RENDER_API_KEY"; Accept = "application/json" }
# status dos deploys
Invoke-WebRequest "https://api.render.com/v1/services/srv-dbcls2om7kps73c5r5u0/deploys" -Headers $h -UseBasicParsing
# reiniciar o serviço
Invoke-WebRequest "https://api.render.com/v1/services/srv-dbcls2om7kps73c5r5u0/restart" -Method POST -Headers $h -Body '{}' -ContentType "application/json" -UseBasicParsing
```

---

## 5. Funcionalidades Principais

1. **Gerenciamento de Turmas e Matérias**
   - Criação e exclusão dinâmica de turmas e disciplinas por ano letivo.
   - Listagem alfabética com numeração sequencial de chamada antes da matrícula.
   - Contador em tempo real no topo do painel (`Turma: [Nome] | [Matéria] ([Período]ºT) — Total de Alunos: [X]`).
   - Listas isoladas e validadas por turma (dados atuais: 228 alunos distribuídos em 8 turmas).

2. **Sistema de Avaliação e Notas**
   - **Avaliações 1 e 2:** prevalece a maior nota (não há somatória).
   - **Trabalhos:** até 3 trabalhos com pontuações configuráveis.
   - **Participação:** até 1,0 ponto.
   - **Faltas e frequência:** registro trimestral por aluno.
   - **Status automático:** destaque em vermelho para médias de 0 a 4,9 e aprovação a partir de 5,0.

3. **Relatórios e Integrações**
   - **Ranking Top 10** geral (todas as turmas) e por turma.
   - **Pódio Top 3** por turma e pódio geral, com troféus.
   - **Gráficos estatísticos** com Chart.js.
   - **Exportação** em Excel/CSV e impressão em PDF.
   - **WhatsApp** para envio de boletins e recados aos responsáveis.

---

## 6. Estrutura do Projeto
- `server.js`: aplicação Express, rotas e operações SQL.
- `db-client.js`: camada de compatibilidade `sqlite3` → `@libsql/client` (Turso), com fila serializada e retry.
- `migrar_turso.js`: migração dos dados do `database.sqlite` local para o Turso (idempotente).
- `config.local.js`: credenciais locais (Render/Turso) — **não versionado**.
- `CREDENCIAIS.local.md`: documentação das credenciais e comandos de infraestrutura — **não versionado**.
- `seed_oficial.js`: validação das listas oficiais de alunos por turma (não é executado automaticamente).
- `database.sqlite`: banco local usado apenas em desenvolvimento.
- `check_deploy.js`: consulta o status dos deploys no Render.
- `trigger_redeploy.js`: dispara um novo deploy do último commit.
- `render.yaml`: blueprint do serviço no Render.
- `.github/workflows/keepalive.yml`: ping a cada 10 minutos para evitar que o serviço durma.
- `views/painel.ejs`: interface principal do diário de classe e filtros.
- `views/aluno-detalhes.ejs`: histórico individual e gráficos de desempenho.
- `views/relatorios.ejs`: relatórios, Top 10 geral e pódios.
- `views/import-export.ejs`: gerenciamento de anos letivos e importação de diários.

---

## 7. Desenvolvimento Local
```powershell
cd G:\colegio-lilian
npm install

# Com banco remoto (igual à produção)
$env:TURSO_DATABASE_URL = 'libsql://paineldalilian-lfdppeixoto29.aws-sa-east-1.turso.io'
$env:TURSO_AUTH_TOKEN = '<token>'
node server.js

# Ou com o banco local
node server.js
```
Acesse `http://localhost:3000`.

---

## 8. Processo de Deploy

> **Regra de ouro:** o Render só publica o que está **commitado e enviado ao GitHub**.
> Rodar `trigger_redeploy.js` sem `git push` recompila o commit antigo — foi a causa de várias
> atualizações que "não apareciam".

1. Alterar o código local.
2. `git add -A && git commit -m "mensagem" && git push origin master`
3. O Render inicia o build automaticamente (≈ 1 min).
4. Conferir com `node check_deploy.js` (status deve ser `live`).
5. Evitar salvar dados no painel durante o deploy: a instância única é substituída e o site pode responder **502** por ~40 segundos.

### Migração/backup de dados
```powershell
$env:TURSO_DATABASE_URL = '...'
$env:TURSO_AUTH_TOKEN = '...'
node migrar_turso.js
```
