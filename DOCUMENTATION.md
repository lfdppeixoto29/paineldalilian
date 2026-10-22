# Documentação Técnica - Painel Acadêmico (Professora Lilian)
**Colégio Estadual Euclides Feliciano Tardin**  
**URL Online:** [https://paineldalilian.onrender.com](https://paineldalilian.onrender.com)  
**Repositório GitHub:** `lfdppeixoto29/paineldalilian`

---

## 1. Atualizações Recentes (Outubro de 2026)
- **Perfil do Aluno Editável**: Na página de histórico e desempenho individual do aluno, agora é possível editar e salvar diretamente o Nome do Aluno, o Responsável e o Celular / WhatsApp.
- **Limpeza de Telefones Genéricos**: Os números de telefone automáticos e genéricos de importação foram limpos do banco de dados, deixando os campos em branco para preenchimento real conforme necessário.
- **Modal Inteligente de WhatsApp e QR Code**: Ao acionar o WhatsApp do aluno, abre-se uma janela interativa para conferir/ajustar o número e gerar QR Code instantâneo para conexão via WhatsApp Web.
- **Navegação Otimizada**: Correção do botão "Voltar" na página de detalhes do aluno, permitindo retornar ao painel principal de forma fluida sem perda de sessão.

---

## 2. Visão Geral do Sistema
O Painel Acadêmico é uma aplicação web desenvolvida sob medida para a Professora Lilian gerenciar diários de classe, notas, faltas, frequência, relatórios estatísticos e comunicação via WhatsApp com responsáveis, suportando múltiplos anos letivos (2026-2031) e turmas do Ensino Fundamental e Médio (incluindo EMTI).

---

## 2. Tecnologias Utilizadas
- **Backend:** Node.js, Express.js
- **Banco de Dados:** SQLite (`database.sqlite`) com inicialização e auto-sincronização de listas oficiais (`seed_oficial.js`).
- **Template Engine:** EJS (Embedded JavaScript Templates)
- **Estilização:** CSS Responsivo com suporte otimizado para dispositivos móveis (Smartphones e Tablets).
- **Hospedagem e Deploy:** Render (Serviço Web Node.js com deploy contínuo via GitHub).

---

## 3. Funcionalidades Principais
1. **Gerenciamento de Turmas e Matérias:**
   - Criação e exclusão dinâmica de turmas e disciplinas por ano letivo.
   - Listagem alfabética de alunos com numeração sequencial de chamada em frente à matrícula.
   - **Contador Dinâmico em Tempo Real:** Exibição clara no topo do painel (`Turma: [Nome] | [Matéria] ([Período]ºT) — Total de Alunos: [X]`).
   - Listas oficiais rigorosamente isoladas e validadas por turma (ex: 901 com 33 alunos, 903 com 29 alunos, 3001 com 29 alunos, 3002 com 26 alunos, 2001 EMTI com 16 alunos, 3003 com 34 alunos, etc.).

2. **Sistema de Avaliação e Notas:**
   - **Avaliações 1 e 2:** Prevalência da maior nota (não há somatória entre as avaliações).
   - **Trabalhos:** Até 3 trabalhos (com pontuações configuráveis).
   - **Participação:** Pontuação de participação (até 1.0 ponto).
   - **Faltas e Frequência:** Registro trimestral de faltas por aluno.
   - **Status Automático:** Marcação visual em vermelho (Notas de 0 a 4.9) e aprovação automática para média `>= 5.0`.

3. **Relatórios e Integrações:**
   - **Ranking Top 10:** Melhores alunos por turma.
   - **Gráficos estatísticos:** Visualização de desempenho com Chart.js.
   - **Exportação:** Suporte para exportação de dados em Excel/CSV e impressão em PDF.
   - **WhatsApp:** Integração direta para envio de boletins e recados aos responsáveis.

---

## 4. Estrutura do Projeto
- `server.js`: Aplicação principal Express, rotas e operações SQL otimizadas com `GROUP BY a.id`.
- `seed_oficial.js`: Módulo de validação e garantia das listas oficiais de alunos por turma.
- `database.sqlite`: Banco de dados relacional contendo turmas, alunos, notas, matérias e avisos.
- `views/painel.ejs`: Interface principal do diário de classe e filtros.
- `views/aluno-detalhes.ejs`: Histórico individual do aluno e gráficos de desempenho.
- `views/relatorios.ejs`: Relatórios consolidados da turma e rankings.
- `views/import-export.ejs`: Gerenciamento de anos letivos e importação de diários.
