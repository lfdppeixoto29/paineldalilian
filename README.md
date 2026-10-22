# Paineldalilian - Colégio Estadual Euclides Feliciano Tardin (Painel da Professora Lilian)

Sistema web acadêmico completo desenvolvido sob medida para a **Professora Lilian** gerenciar turmas, matérias, notas, frequências, relatórios, rankings e acompanhamento plurianual (2026 a 2031).

---

## 🚀 Principais Funcionalidades

1. **Gestão de Turmas e Matérias:**
   - Adicionar e excluir turmas por ano letivo.
   - Gerenciar disciplinas (Inglês, Língua Portuguesa, Matemática, Reforço, etc.).

2. **Sistema de Notas Inteligente:**
   - **Avaliação 1 e Avaliação 2:** Predomina automaticamente a maior nota (sem somar).
   - **Trabalhos (3 trabalhos):** De 0 a 2 pontos cada.
   - **Participação:** De 0 a 1 ponto.
   - **Média Final e Status:** Aprovação automática para Média Final $\ge 5.0$; abaixo disso, exibe status de recuperação / nota vermelha.
   - **Controle de Faltas:** Registro individual por trimestre.

3. **Integração com WhatsApp:**
   - Envio de boletim diretamente para o WhatsApp dos responsáveis cadastrados com 1 clique.

4. **Relatórios e Rankings:**
   - **Top 10 Melhores Alunos** por turma com cálculo de média geral.
   - **Gráficos Dinâmicos** com Chart.js para visualização do desempenho da turma e histórico individual do aluno.
   - **Exportação e Impressão:** Exportação para Excel (CSV) e impressão/PDF otimizada.

5. **Importação e Promoção de Anos (2026 - 2031):**
   - Importação rápida de alunos copiados do Word, Excel ou PDF.
   - **Promoção de Anos:** Clonagem e promoção de turmas e alunos para os anos letivos futuros (2027, 2028, 2029, 2030, 2031).

6. **Totalmente Responsivo para Celular:**
   - Layout otimizado com rolagem horizontal nas tabelas e adaptação completa para smartphones e tablets.

---

## 💻 Como Executar Localmente

1. Certifique-se de ter o **Node.js** instalado.
2. Abra o terminal na pasta do projeto (`G:\colegio-lilian`).
3. Instale as dependências:
   ```bash
   npm install
   ```
4. Inicie o servidor:
   ```bash
   npm start
   ```
5. Acesse no navegador:
   👉 **http://localhost:3000**

---

## 🌐 Publicar Online (Servidor na Nuvem)

Para colocar o painel online e acessá-lo de qualquer lugar (celular ou computador):

### Opção 1: Render.com (Recomendado e Gratuito)
1. Crie uma conta gratuita em [render.com](https://render.com).
2. Conecte seu repositório GitHub contendo o código do projeto (ou use o arquivo `render.yaml` incluído).
3. Crie um novo **Web Service**.
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Clique em **Deploy**. O Render gerará um link público (ex: `https://colegio-lilian.onrender.com`).

### Opção 2: Railway.app / Fly.io
- Importe o repositório e o Railway detectará automaticamente o Node.js e iniciará a aplicação.

---

## 📂 Estrutura do Projeto
- `server.js`: Servidor Express e banco de dados SQLite.
- `database.sqlite`: Banco de dados local com todas as turmas, alunos e notas.
- `views/`: Arquivos de template EJS (`painel.ejs`, `relatorios.ejs`, `import-export.ejs`, `aluno-detalhes.ejs`, etc.).
- `docs/MANUAL.md`: Manual completo do usuário e documentação técnica.
