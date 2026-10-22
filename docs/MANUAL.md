# Manual do Sistema - Paineldalilian (Colégio Estadual Euclides Feliciano Tardin)
**Professora Lilian | Painel de Gestão Acadêmica**

---

## 1. Visão Geral
Este sistema foi desenvolvido para auxiliar a Professora Lilian na gestão completa de notas, frequências, turmas, matérias, relatórios e acompanhamento plurianual (2026 a 2031) dos alunos do Colégio Estadual Euclides Feliciano Tardin.

---

## 2. Acesso e Navegação
- **Painel de Notas:** Tela principal onde são inseridas as notas de Avaliação 1, Avaliação 2, Trabalhos (1, 2 e 3), Participação e Faltas.
- **Relatórios & Ranking:** Exibe o Top 10 melhores alunos da turma, gráficos estatísticos e opção de impressão em PDF.
- **📂 Importar / Exportar / Anos:** Permite importar diários de classe copiados do Word/Excel e promover turmas para anos letivos futuros (2027 a 2031).

---

## 3. Regras de Cálculo de Notas
- **Avaliações:** Entre Avaliação 1 e Avaliação 2, o sistema considera automaticamente a **maior nota** (não há soma entre as avaliações).
- **Trabalhos:** Até 3 trabalhos (0 a 2 pontos cada).
- **Participação:** De 0 a 1 ponto.
- **Nota Final:** Soma da Maior Avaliação + Trabalhos + Participação (limitado a 10.0).
- **Aprovação:** Média Final $\ge 5.0$ (Aprovado). Abaixo de 5.0 (Recuperação / Vermelha).

---

## 4. Como Colocar o Painel Online (Servidor na Nuvem)
Recomendamos o uso da plataforma gratuita **Render** (render.com):
1. Suba o projeto para um repositório no GitHub.
2. No Render, clique em **New -> Web Service** e conecte seu repositório.
3. Defina o comando de inicialização: `npm start`.
4. O Render fornecerá um link web seguro para acessar o painel de qualquer smartphone ou computador.
