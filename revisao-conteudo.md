# Revisão de CONTEÚDO — Fontes Clínicas

Instruções de revisão de **conteúdo clínico** do Guia de Emergência PS.
Objetivo: **cada dado clínico está de acordo com as fontes registradas e confiáveis.** Nada é invenção.

> Referência obrigatória de regras detalhadas: **AGENTS.md** (Auditoria Obrigatória, checklists de fármaco/diluição/escore/condição, mapeamento capítulos→arquivos).

## Regras gerais

1. Achei erro → corrijo na hora e re-valido.
2. Disparar **quantos subagents forem necessários** (um escopo estreito por subagent, em paralelo). Agente principal cruza relatórios e corrige.
3. Fechar com `node validate.js`. Falha = revisão incompleta.
4. Todo texto em português BR (exceto nomes de escores internacionais).
5. Sem fonte para o dado → não inventar. Perguntar ao usuário.
6. **Rodar `node scripts/index_fontes.js` ANTES de revisar** — mostra em qual arquivo-fonte e linha cada fármaco aparece (evita re-ler capítulos inteiros).

## Passo 0 — Preparação (obrigatório)

1. `node scripts/index_fontes.js` → gera índice fármaco → arquivo:linha nas fontes.
2. `node validate.js` → o check **8. FONTES** sinaliza arquivos-fonte vazios (0 bytes). Assunto sem fonte extraída **não pode ser revisado** — registrar como pendente e perguntar ao usuário.
3. `node validate.js` também lista (em INFO) as **doses cross-condição** da mesma droga — é a base para o passo de consistência cruzada.

## Fontes registradas (ordem de prioridade — as fontes mandam)

| # | Fonte | Onde |
|---|-------|------|
| 1 | Medicina de Emergência 19ed (livro-texto) | `data/livro-extracoes/chXX_*.txt` |
| 2 | Diretrizes/protocolos extraídos (SBC, Sepse, GINA, GOLD, Sanford, PCDT) | `data/guias-extracoes/*.txt` |
| 3 | SBC (FA 2025, IC 2018, SCC 2025, PCDT SCA) | `referencia-sbcardio/` |
| 4 | Protocolos de Sepse (EM 2025, SES-DF 2025) | `protocolos-sepse/` |
| 5 | Manuais de Injetáveis (HUPE-UERJ 2025, HUAC-UFCG 2024, PrefSP 2025) | `injetaveis-anvisa/` |
| 6 | GINA 2025, GOLD 2025 | `asma-dpoc-gina-gold/` |
| 7 | Sanford Guide 2022 (antimicrobianos) | `data/guias-extracoes/sanford-guide-2022-extracted.txt` |

> **Nota:** as pastas de fontes existem localmente no repo, mas são gitignored (não vão pro GitHub). Se o agente não achar o arquivo-fonte, apontar o caminho ao usuário — nunca prosseguir sem fonte.

## Regra de conteúdo (obrigatória)

- **Nunca inventar, completar ou "melhorar" dado clínico.** Se não está na fonte, não existe.
- **Nunca adicionar critério, dose, escore ou diluição** sem ter lido o arquivo-fonte correspondente.
- **Nunca copiar dose de outro fármaco/condição** sem recalcular contra a fonte original.
- Fonte não cobre o assunto → deixar em branco ou marcar como pendente. Perguntar ao usuário.
- Campo `fontes` de cada condição deve citar o capítulo/diretriz real usada (conferir tabelas de mapeamento no AGENTS.md).

## Escopos de subagent (um por ARQUIVO-FONTE, cobrindo as condições que o usam)

| # | Subagent | Escopo (fonte) | Condições cobertas |
|---|----------|----------------|--------------------|
| 1 | ch02_via_aerea | `data/livro-extracoes/ch02_via_aerea.txt` | SV: Via Aérea |
| 2 | ch04_sva | `data/livro-extracoes/ch04_sva.txt` | SV: PCR, Choque (5H/5T, vasopressores) |
| 3 | ch08+ch09 | `ch08_choque.txt` + `ch09_sepse.txt` | SV: Choque, Choque Séptico, vasopressores |
| 4 | ch14_sedacao | `data/livro-extracoes/ch14_sedacao.txt` | Vasoativa: Midazolam, Propofol, Fentanil |
| 5 | ch30+ch31 | `ch30_sca_sst.txt` + `ch31_iamcsst.txt` | SV: SCA sST, IAMCSST |
| 6 | ch32+ch33+ch34 | FA + Taquiarritmias + Bradicardias | SV: FA/Taquiarritmias/Bradicardias |
| 7 | ch35_ic_aguda | `data/livro-extracoes/ch35_ic_aguda.txt` | SV: IC Aguda, Choque Cardiogênico, dobutamina/milrinona/dopamina |
| 8 | ch36_eh | `data/livro-extracoes/ch36_emergencia_hipertensiva.txt` | SV: Emergência HT, nitroprussiato |
| 9 | ch43+ch44 | DPOC + Pneumonia | Porta: DPOC, Pneumonia |
| 10 | ch46_tep | `data/livro-extracoes/ch46_tep.txt` | SV: TEP (Wells, PESI, trombólise) |
| 11 | ch47_pneumotorax | `data/livro-extracoes/ch47_pneumotorax.txt` | SV: Pneumotórax |
| 12 | ch54_avc | `data/livro-extracoes/ch54_avc_isquemico.txt` | Porta: AVC Isquêmico |
| 13 | comp18_mal_epileptico | `data/livro-extracoes/comp18_mal_epileptico.txt` | SV: Mal Epiléptico |
| 14 | GINA/GOLD | `gina_2025` + `gold_2025` (guias-extracoes) | Porta: Asma, DPOC |
| 15 | Sanford | `data/guias-extracoes/sanford-guide-2022-extracted.txt` | Antimicrobianos em todas as condições |
| 16 | Sepse (EM+SES-DF) | `sepse_em_2025` + `sepse_ses_df_2025` | SV: Choque Séptico, hidrocortisona |
| 17 | SBC IC 2018 | `guias-extracoes/sbc_ic_cronica_aguda_2018.txt` | ICAD, dobutamina |
| 18 | Injetáveis (HUPE/HUAC/PrefSP) | `injetaveis-anvisa/*` | Diluições de vasoativas |
| 19 | Cálculos de diluição | Todos os fármacos, cruzando `concentracao`, `volume_ml`, `dose_min/max` e o texto |
| 20 | Escores | Todos os escores, contra a referência original |
| 21 | Badges SUS + consistência cruzada | RENAME/CEAF/Básico/Comercial; usar lista INFO do validate.js |

## Ledger do subagent (formato de retorno OBRIGATÓRIO)

Cada subagent responde um item por linha — agente principal NÃO re-lê a fonte, apenas cruza:

```
[achado] <arquivo>.<condição/fármaco>: <trecho atual>
[fonte]  <arquivo-fonte>:<linha> — <trecho da fonte>
[fix]    <correção proposta exata>
[status] corrigido | pendente | falso-positivo | sem-fonte
```

- `falso-positivo` → achado que a fonte contradiz; explicar em uma linha.
- `sem-fonte` → assunto não coberto pelas fontes; NÃO inventar correção, reportar ao usuário.

---

# IMPLEMENTAÇÃO DE CONTEÚDO NOVO (fazer subagents para nada sair errado)

Processo para **adicionar uma condição/fármaco novo** ao app (não é revisão — é criação).
Objetivo: **cada dado clínico novo nasce da fonte, com citação, e passa por auditoria dupla antes de entrar no JSON.**

## Regra-ouro da implementação

> **Um dado clínico só entra no JSON se o subagent entregar `fonte:linha` para ele.**
> Trecho sem fonte no draft → o subagent marca `[PENDENTE]` no final do report — o agente principal NUNCA "completa" de memória. Sem fonte = pergunta ao usuário ou campo em branco.

## Passo a passo

1. **Identificar a seção de destino** (Sala Vermelha / Condutas de Porta / Vasoativa) pelo AGENTS.md.
2. **Confirmar fonte disponível**: `node scripts/index_fontes.js <termo>` — capítulo extraído ou diretriz. Sem arquivo-fonte (ex: Trauma, Pediatria) → **não implementar**, perguntar ao usuário.
3. **Escrever o draft como subagent** (um subagent por condição, em paralelo). O subagent:
   - Lê o arquivo-fonte do começo ao fim.
   - Escreve o **objeto JSON completo** (id, cid, cor, icon, categoria, fontes, secoes, escores, calculadora) no formato do AGENTS.md.
   - **Cada item de `conduta`/`receituario` e cada linha de `tabela_farmacos`/`escores` deve terminar com ` [F chXX:L]`** indicando a linha da fonte — o agente principal remove os marcadores ao aplicar.
   - NUNCA inclui dado sem `[F ...]`. Trecho sem fonte → vira bullet `[PENDENTE]` no final.
4. **Auditoria do agente principal** (dupla checagem) antes de aplicar:
   - Conferir **todos** os marcadores `[F chXX:L]` contra a fonte real (o principal relê as linhas citadas).
   - Conferir matemática: concentração = droga ÷ volume total; diluente = volume final − volume da droga; 1 mL/h = X mcg/h (não mcg/min).
   - Conferir nomes (HNF≠HBPM), via, badge SUS, CID-10, categoria, cor/ícone da paleta do AGENTS.md.
   - Conferir consistência cruzada: mesmo fármaco em outras condições (dose igual ou justificar).
5. **Aplicar** no JSON (remover marcadores `[F ...]`), inserir após o último objeto do array.
6. **`node validate.js`** → 0 erros (alvos: 2 alertas conhecidos tolerados).
7. **Testar renderização** com `python -m http.server 8000` (desktop + mobile).

## Ledger do subagent de IMPLEMENTAÇÃO (formato obrigatório)

```
[condicao] <id> <título> <CID> <seção destino>
[fontes]   <arquivo-fonte(s)>
[F chXX:L] <dado clínico> — citação da linha da fonte
[F chXX:L] <dado clínico>
[PENDENTE] <trecho que não tem fonte> — perguntar ao usuário
[draft]    <objeto JSON completo proposto>
```

Regras do subagent de implementação:
- Só citar linhas que ELE leu no arquivo-fonte. Linha inventada = falha grave (o principal relê a linha).
- Não criar escore/calculadora sem o capítulo conter todos os critérios/pontos.
- Não traduzir diretrizes de memória — tudo sai do arquivo-fonte.
- Fórmulas da calculadora vasoativa: usar as tabelas do AGENTS.md (não "melhorar").

## Checklist final de implementação (antes de publicar)

- [ ] `node scripts/index_fontes.js <termo>` confirmou a fonte antes de implementar
- [ ] Todo dado clínico tem `[F chXX:L]` verificada pelo agente principal
- [ ] Nenhum `[PENDENTE]` ficou sem resposta do usuário
- [ ] Concentração = droga ÷ volume total (conferir números)
- [ ] Diluente = volume final − volume da droga
- [ ] 1 mL/h = X mcg/h (÷60 se for mcg/min)
- [ ] Nomes/vias/badges SUS/CID-10 corretos
- [ ] Cor/ícone/categoria conforme paleta do AGENTS.md
- [ ] `node validate.js` = 0 erros
- [ ] Renderização testada no navegador (desktop + mobile)

## Checklist de conteúdo por condição/fármaco

- [ ] Título e CID-10 corretos
- [ ] Dose, apresentação, diluição e via conferem com a fonte citada no campo `fontes`
- [ ] Concentração calculada = quantidade ÷ volume total (ex: 16 mg ÷ 250 mL = 64 mcg/mL)
- [ ] Diluente = volume final − volume da droga (ex: 250 − 16 = 234 mL)
- [ ] "1 mL/h = X mcg/h" (NUNCA mcg/min sem ÷60)
- [ ] Calculadora: `concentracao`, `dose_min`, `dose_max` batem com a seção de dose do texto
- [ ] Escore: todos os critérios presentes, nenhum extra, pontos e faixas corretos
- [ ] Badge SUS correto (RENAME/CEAF/Básico/Comercial)
- [ ] Nomes corretos (HNF ≠ HBPM; via bate com forma farmacêutica)
- [ ] Consistência cruzada: mesmo fármaco com mesma dose em condições diferentes (ou justificar) — usar lista INFO do validate.js
- [ ] Campo `fontes` preenchido e citando arquivo-fonte real
- [ ] Sem textos em outras línguas
- [ ] Números com formato pt-BR consistente

## Orquestração

1. Rodar Passo 0 (índice de fontes + validate.js) antes de disparar subagents.
2. Definir lista de subagents: nome, arquivo-fonte, condições cobertas (tabela acima), ledger obrigatório.
3. Um subagent = um arquivo-fonte. Ex: "Verificar TEP em guia-sala-vermelha.json contra ch46_tep.txt".
4. Subagent **acha, verifica a fonte e reporta** no formato do ledger (item por linha). Correção fica com o agente principal, que cruza relatórios.
   - Exceção: erro trivial e sem ambiguidade (typo, formato, negrito, badge) o subagent corrige e reporta.
5. Paralelizar escopos independentes; esperar todos; cruzar para achar inconsistências entre condições.
6. Fonte ausente (arquivo 0 bytes) → reportar "sem fonte disponível", não inventar.
7. Após correções: rodar `node validate.js`. Alvo: 0 erros; alertas apenas os conhecidos (CID J02/J03 em ivas-amigdalite, fonte vazia sbc_scc_cronica_2025.txt).

## Relatório final (modelo)

```
## Relatório de revisão de conteúdo — <data>
### Subagents executados
- <nome>: <arquivo-fonte> — <encontrados> / <corrigidos> / <pendentes> / <falsos-positivos>
### Erros não corrigidos
- [arquivo:condição] <descrição> — <motivo>
### Correções aplicadas
- [arquivo] <o que mudou> — <fonte:linha usada>
### Consistência cruzada
- <drogas com dose diferente entre condições e justificativa — base: INFO do validate.js>
### Validação
- node validate.js: <passou / falhou — erros restantes>
### Perguntas para o usuário
- <questões sem fonte>
```

---

## Ledger de implementação — rodada 2026-08-05 (8 condições novas)

Cada objeto foi aplicado com **auditoria dupla**: subagent marcou `[F chXX:L]`, agente principal releu as linhas citadas na fonte antes de aplicar. Nenhum dado foi completado de memória.

| Condição | CID | Seção | Fontes | Status |
|----------|-----|-------|--------|--------|
| `hipoglicemia` | E16.2 | Porta | ch90 | ✅ aplicada |
| `lesao-renal-aguda` | N17.9 | Porta | ch80 | ✅ aplicada |
| `disturbios-acidobasicos` | E87.2 | Porta | ch82 | ✅ aplicada |
| `pancreatite-aguda` | K85.9 | Porta | ch77 | ✅ aplicada |
| `intoxicacoes-agudas` | T65.9 | Porta | ch102 | ✅ aplicada |
| `intoxicacoes-por-farmacos` | T50.9 | Porta | ch104 | ✅ aplicada |
| `cad-ehh` | E14.1 | Sala Vermelha | ch91 | ✅ aplicada |
| `crise-tireotoxica` | E05.5 | Sala Vermelha | ch92 | ✅ aplicada |

### Decisões de auditoria (correções sobre os drafts dos subagents)
- **cad-ehh:** removido "reduzir insulina para 0,02-0,05 UI/kg/h" — não existe no capítulo; o protocolo real é iniciar SG 5% conforme glicemia (ch91 L399-416). Transição SC corrigida para 0,4-0,8 UI/kg/dia (ch91 L357-358, não 0,5-0,8). Critérios diagnósticos = tríade exata do capítulo (ch91 L10-17). Reposição de K: < 3,5 → 25 mEq KCl (L334) e < 3,3 → aguardar (L320).
- **crise-tireotoxica:** **Burch-Wartofsky removido como calculadora** — faixas de temperatura/FC ilegíveis no OCR (L220-258 embaralhadas) → manter apenas interpretação (L259) e usar **critérios de Akazi** (L265-282) como checklist operacional. Todas as doses de fármacos verificadas (L356-461).
- **pancreatite-aguda:** Ranson com 5 critérios da admissão (L321-327), mortalidades por pontos (L254-256); BISAP 5 critérios (L267-273); meperidina não indicada (L525-526); realimentação oral precoce (L283-287); TC mandatória se dúvida/necrose (L181).
- **intoxicacoes-por-farmacos:** tabela com 18 fármacos, todas as doses conferidas (L137-1259). Badges: NAC/naloxona/flumazenil/glicose/insulina/carvão/Mg/Ca/bicarb/diazepam/ciproeptadina/benztropina = básico; L-carnitina = ceaf; glucagon/emulsão lipídica/FAB/fisostigmina = comercial. Fisostigmina marcada como NÃO em ADT (L164).
- **intoxicacoes-agudas:** tabela toxina×antídoto convertida de tabela_farmacos para escore estático (capítulo não dá doses no mapeamento — evitar campo `[PENDENTE]`). Carvão 1 g/kg máx 50 g (L137/228/301); alcalinização 1-2 mEq/kg + 150 mEq/1.000 mL SG 5% (L690-692); emulsão lipídica 1,5 mL/kg + 0,25 mL/kg/min (L724-725); observação ≥ 6 h (L774).
- **hipoglicemia:** 15-20 g (até 50 g) glicose 50% (L240-241); glucagon IM 1-2 mg efeito fugaz não repetir (L241-242); tiamina 100-300 mg (L280-281); observação 12-24 h com glicemia 1/1 h (L284-285). Octreotide sem dose no capítulo (só citado p/ insulinoma, L237) → não incluído.
- **disturbios-acidobasicos:** Winter PaCO2=1,5×HCO3+8±2 (L303); AG normal 10±2 (L163); correção albumina +2,5/g/dL (L182-183); compensações respiratórias (L323-354); bicarbonato pH<7,2 na hiperclorêmica, receita 50 mL NaHCO3 8,4% + 950 mL SG 5% a 100-200 mL/h (L695-706); acetazolamida 250-500 mg (L793-794).
- **lesao-renal-aguda:** KDIGO 3 critérios (L63-65); FENa < 1% / > 2% e FEUr ≤ 35% (L379-382); furosemida 80 mg teste + diurese ≥ 200 mL em 2 h (L700/712); contraste 1 mL/kg/h 12 h (L336).

### Validação
- `node validate.js` = **0 erros**, 2 alertas conhecidos (CID "J02/J03" em ivas-amigdalite; arquivo-fonte vazio `sbc_scc_cronica_2025.txt`).
- JSON parse OK nos dois arquivos. Renderers existentes cobrem todos os `tipo` usados (conduta, receituario com `orientacoes`, tabela_farmacos, escores).
- Consistência cruzada (INFO validate): naloxona 15 mg (intox fármacos) vs 10 mg máx (PCR) — justificado: fontes diferentes (ch104 L870 vs cap. SVA); hidrocortisona crise tireotóxica 100 mg 8/8h vs choque séptico 50 mg 6/6h — indicações diferentes; furosemida teste 80 mg vs bolus 40-125 mg — intenção diagnóstica distinta. Diazepam 5 mg (intox) vs 10 mg (mal epiléptico) — agitação vs crise convulsiva.

### Não implementado (sem fonte)
- Escore calculadora para crise tireotóxica (BWPS) — faixas ilegíveis no OCR. Calculadora de BISAP/Ranson mantida apenas como tabela estática (capítulo não define pontos de mortalidade por critério individual de forma legível).

