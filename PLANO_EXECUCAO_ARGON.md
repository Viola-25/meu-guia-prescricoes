# 📋 Plano de Ação e Execução com Argon — Guia de Emergência PS

> **Status do Repositório:** Base limpa e estável. Zero erros em `node validate.js`.  
> **Objetivo:** Registro completo do estado do projeto, diagnóstico de bugs e inconsistências encontrados, e roteiro em 5 fases otimizado para execução com o **Argon** no máximo desempenho.

---

## 1. Diagnóstico do Estado Atual (Revisão 360°)

### 1.1 Base de Dados e Conteúdo Clínico
Atualmente o aplicativo conta com **38 itens** distribuídos em 3 abas:
- **Sala Vermelha (`data/guia-sala-vermelha.json`):** 13 condições críticas (Sepse, Choque Cardiogênico, SRI, PCR, Emergência Hipertensiva, SCA sST, IAMCSST, TEP, EME, ICAD, Arritmias, CAD/EHH, Crise Tireotóxica).
- **Condutas de Porta (`data/condutas-porta.json`):** 16 condições ambulatoriais/porta (Cólica Nefrética, Asma, Lombalgia, Dengue, IVAS/Amigdalite, DPOC, HDA, AVCi, Pneumonia, Pneumotórax, Hipoglicemia, LRA, Distúrbios Ácido-Básicos, Pancreatite, Intoxicações Agudas, Intoxicações por Fármacos).
- **Vasoativa e Sedação (`data/vasoativa-sedacao.json`):** 9 fármacos contínuos (Noradrenalina, Nitroprussiato, Fentanil, Midazolam, Propofol, Dopamina, Adrenalina, Dobutamina, Vasopressina).

### 1.2 Fontes Clínicas e Acervo Local
- **Livro-texto:** *Medicina de Emergência — Abordagem Prática (19ª ed. 2025, HCFMUSP)* — 1973 páginas íntegras em PDF, **33 capítulos extraídos** em `data/livro-extracoes/` (incluindo novos: Anafilaxia ch12, Cefaleia ch27, ITU ch50, Politrauma ch63 e Choque Hemorrágico ch68).
- **PCDT AVC Isquêmico Agudo CONITEC / Ministério da Saúde (Portaria 29/2023, 83 pp):** Baixado e extraído em `data/guias-extracoes/pcdt_avci_conitec_2023.txt`.
- **Guia para Uso de Hemocomponentes do Ministério da Saúde (138 pp):** Baixado e extraído em `data/guias-extracoes/ms_guia_hemocomponentes.txt` (Transfusão Maciça, Ácido Tranexâmico).
- **Guia de Bolso:** `GUIA_DE_BOLSO_PLANTAO.pdf` (Edição Outubro/2026, 41 páginas) — íntegro, excelente fonte para condutas rápidas, trauma e rotinas de plantão.
- **Diretrizes e Manuais:** GINA 2025 (274 pp), GOLD 2025 (215 pp), Sanford Guide 2022 (324 pp OCR), Sepse EM 2025 (28 pp), Sepse SES-DF (13 pp), Manuais de Injetáveis (HUPE 226 pp, HUAC 30 pp, PrefSP 17 pp), SBC FA 2025 (107 pp), SBC IC 2018 (104 pp), PCDT SCA CONITEC (46 pp).
- ⚠️ **Alerta de Fonte:** O arquivo `referencia-sbcardio/SBC-SCC-Cronica-2025.pdf` foi truncado no download original (6,17 MB, stream corrompido sem `%%EOF`). Isso gerou o alerta em `validate.js` de `sbc_scc_cronica_2025.txt (0 bytes)`. As condições agudas coronarianas estão 100% amparadas por `ch30_sca_sst.txt`, `ch31_iamcsst.txt` e `pcdt_sca_conitec.txt`.

### 1.3 Achados Críticos e Oportunidades de Correção Imediata
1. **Bug visual da Calculadora de Vasopressina (`js/app.js:984`):**
   - No JSON: `"dose_fixa": true`.
   - No código: `fmtNum(calc.dose_fixa)` executa `fmtNum(true)`, exibindo no display da bomba a string `"true UI/min (fixo)"` em vez da dose real `"0,03 UI/min (fixo)"`.
2. **Inconsistência de Categoria e Ícone na PCR (`data/guia-sala-vermelha.json`):**
   - Parada Cardiorrespiratória está com `categoria: "Neurológico"`, `cor: "#ea580c"` e `icon: "electrocardiogram-outline"`.
   - `electrocardiogram-outline` **não existe** no Ionicons 7 (fica invisível no DOM).
   - PCR deve pertencer a `Cardiovascular`, com cor `#dc2626` e ícone `pulse-outline` ou `heart-outline`.
3. **Alerta de CID-10 composto:**
   - Em `data/condutas-porta.json[4]` (`ivas-amigdalite`), o CID é `"J02/J03"`, disparando aviso no validador.
4. **Proteção de limites no listener de setas (`js/app.js:1448`):**
   - Se a lista estiver vazia por filtro ou erro, tentar indexar `condicoes[nextIdx].id` causa erro de runtime.

---

## 2. Planejamento em 5 Fases para Execução com o Argon

### 🎯 FASE 1: Correções Imediatas de Sistema e Consistência (Quick Fixes)
- [x] **Fix 1.1 — Vasopressina no `js/app.js`:**
  - Tratar `calc.dose_fixa`:
    ```javascript
    const valorFixo = typeof calc.dose_fixa === 'number' 
      ? calc.dose_fixa 
      : (dil.doses && dil.doses[0] ? dil.doses[0].dose_min : doseAtual);
    ```
- [x] **Fix 1.2 — PCR Metadados no `data/guia-sala-vermelha.json`:**
  - Alterar `categoria` para `"Cardiovascular"`.
  - Alterar `cor` para `"#dc2626"`.
  - Alterar `icon` para `"pulse-outline"`.
- [x] **Fix 1.3 — Padronização CID em `data/condutas-porta.json`:**
  - Ajustar `ivas-amigdalite` para `J02.9` (ou atualizar regex do validador para aceitar barra).
- [x] **Fix 1.4 — Guarda de array vazio nas teclas Up/Down (`js/app.js`):**
  - Adicionar checagem `if (!condicoes || condicoes.length === 0) return;`.
- [x] **Validação:** Rodar `node validate.js` e conferir relatório limpo.

---

### 🎯 FASE 2: Expansão de Fármacos em Vasoativa e Sedoanalgesia
> *Regra de Ouro:* Todo cálculo de concentração e diluição auditado contra `injetaveis-anvisa/` e `data/livro-extracoes/`.

- [x] **Card 2.1 — Nitroglicerina (Tridil):**
  - *Diluição padrão:* 50 mg (1 amp 10 mL) + SG5% 240 mL (Concentração: 200 mcg/mL).
  - *Diluição concentrada:* 50 mg + SG5% 90 mL (Concentração: 500 mcg/mL).
  - *Calculadora:* Unidade `mcg/min` (faixa 5 a 200 mcg/min). Fórmula mL/h = `(dose * 60) / conc`.
- [x] **Card 2.2 — Cetamina (Ketamina / Ketalar):**
  - *Apresentação:* Frasco-ampola 50 mg/mL (10 mL = 500 mg).
  - *Doses:* Indução SRI (1,5–2,0 mg/kg IV); Sedoanalgesia / Dissociativa (0,2–0,5 mg/kg IV bolus ou infusão 0,5–1,0 mg/kg/h).
  - *Diluição em BIC:* 500 mg + SF 240 mL (2 mg/mL).
- [x] **Card 2.3 — Dexmedetomidina (Precedex):**
  - *Apresentação:* 100 mcg/mL (ampola 2 mL = 200 mcg).
  - *Diluição:* 200 mcg (2 mL) + SF 48 mL (4 mcg/mL).
  - *Calculadora:* Unidade `mcg/kg/h` (faixa 0,2 a 1,4 mcg/kg/h).
- [x] **Card 2.4 — Milrinona (Primacor):**
  - *Apresentação:* 1 mg/mL (ampola 10 mL ou 20 mL).
  - *Diluição:* 20 mg + SG5% 80 mL (200 mcg/mL).
  - *Calculadora:* Unidade `mcg/kg/min` (faixa 0,375 a 0,75 mcg/kg/min).
- [x] **Validação:** Rodar `node validate.js`.

---

### 🎯 FASE 3: Expansão de Condições Críticas de Sala Vermelha
- [x] **Condição 3.1 — Protocolo AVC Isquêmico Hiperagudo / Trombólise:**
  - *Fonte:* `data/livro-extracoes/ch54_avc_isquemico.txt`.
  - *Conteúdo:* Janela terapêutica (delta T < 4h30); metas de PA (< 185x110 antes, < 180x105 após); Escore NIHSS; Doses de Alteplase (0,9 mg/kg, máx 90 mg; 10% bolus + 90% em 60 min) e Tenecteplase (0,25 mg/kg bolus, máx 25 mg); Protocolo de sangramento pós-trombólise.
- [x] **Condição 3.2 — Choque Anafilático e Anafilaxia Grave:**
  - *Fonte:* Livro-texto Cap. Choque / `GUIA_DE_BOLSO_PLANTAO.pdf`.
  - *Conteúdo:* Adrenalina 1:1.000 IM imediata (0,5 mg no vasto lateral da coxa, repetir a cada 5-15 min); Expansão cristaloide rápida (20 mL/kg); Corticosteroide (Metilprednisolona/Hidrocortisona); Anti-histamínicos; Prevenção de edema de glote / SRI antecipada.
- [x] **Condição 3.3 — Politrauma e Choque Hemorrágico:**
  - *Fonte:* `GUIA_DE_BOLSO_PLANTAO.pdf` (Seção Trauma XABCDE) + Cap. Choque.
  - *Conteúdo:* Protocolo de Transfusão Maciça (CH : PFC : Plaquetas na proporção 1:1:1); Ácido Tranexâmico (CRASH-2: 1g IV em 10 min dentro de 3h + 1g em 8h); Hipotensão permissiva (PAS 80-90 mmHg); Prevenção da tríade letal (hipotermia, acidose, coagulopatia).

---

### 🎯 FASE 4: Expansão de Condições de Alta Demanda na Porta
- [x] **Condição 4.1 — Infecção do Trato Urinário (ITU):**
  - *Fonte:* `data/guias-extracoes/sanford-guide-2022-extracted.txt` + RENAME.
  - *Conteúdo:* Cistite aguda (Fosfomicina trometamol 3g dose única VO; Nitrofurantoína 100mg 6/6h por 5 dias); Pielonefrite aguda leve/moderada (Ciprofloxacino 500mg 12/12h 7 dias ou Ceftriaxona 1g IV inicial); Sinais de alarme.
- [x] **Condição 4.2 — Cefaleia Aguda e Enxaqueca:**
  - *Fonte:* `data/livro-extracoes/ch54_avc_isquemico.txt` / `GUIA_DE_BOLSO_PLANTAO.pdf`.
  - *Conteúdo:* Manejo de crise aguda (Dipirona + Cetoprofeno + Metoclopramida/Clorpromazina); Triptanos; Red flags para neuroimagem (SNOOP).
- [x] **Condição 4.3 — Gastroenterite Aguda (GECA) e Desidratação:**
  - *Fonte:* Livro-texto / Protocolo MS.
  - *Conteúdo:* Planos de Reidratação A, B e C; Ondansetrona sublingual/oral/IV; Sinais de gravidade e critérios para não prescrever antimicrobianos empiricamente.
- [x] **Condição 4.4 — Celulite e Erisipela (Infecções de Pele e Partes Moles):**
  - *Fonte:* `data/guias-extracoes/sanford-guide-2022-extracted.txt`.
  - *Conteúdo:* Cefalexina 500mg 6/6h VO; Amoxicilina+Clavulanato; Clindamicina (alérgicos); Demarcação com caneta; Critérios de internação hospitalar.

---

### 🎯 FASE 5: Refinamentos de UI, Usabilidade e Acessibilidade
- [x] **5.1 — Botão "Voltar ao Topo" (Floating Action Button):**
  - Acessível e responsivo para leitura ágil no plantão.
- [x] **5.2 — Responsividade em Telas Ultra-Estreitas (< 360px):**
  - Otimizar quebra de colunas da calculadora e badges SUS.
- [x] **5.3 — Auditoria Final Rigorosa:**
  - Executar `node scripts/index_fontes.js`.
  - Executar `node validate.js` (exigir 0 erros).
  - Testar com servidor local (`python -m http.server 8000`).

---

## 3. Guia de Execução Rápida para o Argon
1. Siga a ordem sequencial das fases (Fase 1 primeiro para garantir integridade).
2. Use subagents focados por condição/fármaco respeitando o formato de ledger descrito no `revisao-conteudo.md`.
3. Valide continuamente com `node validate.js`.
