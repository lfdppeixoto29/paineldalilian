# Sistema de Envio de PDF na Nuvem (Abordagem 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a server-side cloud storage & URL generator for student report PDFs so that clicking "Enviar WhatsApp" sends a direct public cloud link to the parent, keeping zero files on the teacher's local device/computer/phone and avoiding any WhatsApp app installation requirements on desktop.

**Architecture:** 
1. Create a `public/pdfs` directory on the server.
2. In `server.js`, whenever a WhatsApp share action is requested, generate the PDF using `pdfkit`, save it temporarily with a unique cryptographic token filename into `public/pdfs/`, and return its public URL (`https://<domain>/pdfs/<filename>.pdf`).
3. Update frontend (`painel.ejs` and `relatorios.ejs`) to receive this public URL and inject it directly into the WhatsApp text message (`wa.me/?text=...`), allowing the parent to click and view/download the PDF directly from the cloud without cluttering or saving anything on the teacher's device.

**Tech Stack:** Express, SQLite3, PDFKit, Node.js filesystem.

**Spec:** N/A (Direct requirement implementation)

## Global Constraints
- Zero local downloads on teacher device.
- Zero WhatsApp desktop/app requirements.
- Public web URLs for PDF reports hosted directly by the server.

## Review Focus
1. Cleanup of old temporary PDFs so disk space doesn't fill up over time.
2. Safe unique file naming (`crypto.randomBytes`).

---

### Task 1: Add Cloud PDF Storage & Generation Endpoint to `server.js`

**Files:**
- Modify: `server.js`

**Interfaces:**
- Produces: `POST /api/gerar-link-pdf` or `GET /api/criar-pdf-url/:id` which generates the PDF, saves it to `public/pdfs/`, and returns `{ url: 'https://...' }`.

- [x] **Step 1: Ensure `public/pdfs` directory exists at startup in `server.js`**
- [x] **Step 2: Add endpoint `/api/criar-pdf-url/:id` in `server.js` using `pdfkit` and `crypto`**
- [x] **Step 3: Commit**

### Task 2: Update Frontend Views (`painel.ejs` & `relatorios.ejs`)

**Files:**
- Modify: `views/painel.ejs`
- Modify: `views/relatorios.ejs`

**Interfaces:**
- Consumes: `/api/criar-pdf-url/:id` endpoint.

- [x] **Step 1: Update `enviarMensagemWhatsApp` in `views/painel.ejs` to fetch the cloud PDF URL and append it to the WhatsApp text message.**
- [x] **Step 2: Update `enviarRelatorioIndividual` in `views/relatorios.ejs` to do the same.**
- [x] **Step 3: Commit and deploy.**

---

## Nota de implementação (11/11/2026)

O Render Free não tem disco persistente, então os PDFs **não** foram salvos em `public/pdfs`.
Foram armazenados na tabela `pdf_links` do Turso (base64) e servidos por `GET /pdf/:token`,
o que mantém os links válidos mesmo após deploy/restart. Validade padrão: 7 dias
(ajustável por `PDF_LINK_TTL_DIAS`). A tabela `pdfs` que já existia no Turso é legada
(schema antigo, vazia) e não é utilizada.
