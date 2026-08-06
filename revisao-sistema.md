# Revisão de SISTEMA — UI + Funcionalidades

Instruções de revisão de **funcionalidade** do Guia de Emergência PS.
Objetivo: o app renderiza corretamente e todas as funcionalidades funcionam em desktop e mobile.

## Regras gerais

1. Achei erro → corrijo na hora e re-valido.
2. Disparar **quantos subagents forem necessários** (um escopo estreito por subagent, em paralelo). Agente principal cruza relatórios e corrige.
3. Fechar com `node validate.js` (dados) e conferência no navegador via servidor HTTP local (`python -m http.server 8000`). Falha = revisão incompleta.
4. Todo texto em português BR.

## Áreas e escopos de subagent

| # | Subagent | Escopo | O que verificar |
|---|----------|--------|-----------------|
| 1 | `index.html` estrutura | Estrutura do shell | IDs, seções, tabs, header, sidebar, skip-link, aria roles |
| 2 | `js/app.js` — carregamento | Fetch/parse dos 3 JSONs, loading/erro | Fallbacks, mensagens de erro, `aria-live` |
| 3 | `js/app.js` — renderers 1 | conduta, tabela_farmacos, causas_reversiveis, urgencia | Cada `tipo` do JSON vira DOM correto; badges SUS; negrito `**` |
| 4 | `js/app.js` — renderers 2 | escores, calculadora_escore, receituario, orientacoes | Soma de pontos, faixas de interpretação, cores, radio/checkbox |
| 5 | `js/app.js` — renderers 3 | diluicao, concentracao, dose, orientacoes enfermagem | Coerência com JSON da vasoativa |
| 6 | `js/app.js` — calculadora de doses | Input peso, seletor diluição, tabela mL/h | Fórmulas: `(dose×peso×60)/conc`, `dose/conc`, `(dose×60)/conc`, unidades mcg/mg/UI |
| 7 | `js/app.js` — busca e teclado | Busca global, `/`, Ctrl+K, setas, Escape, D dark mode | Filtros, navegação, troca de aba, persistência localStorage |
| 8 | `css/styles.css` — layout | Sidebar (drawer mobile), tabs sticky, header, grid | 320px a 1920px; sem overlap; sidebar fecha em mobile |
| 9 | `css/styles.css` — dark mode | `data-theme="dark"` | Contraste, cores consistentes, badge SUS legível |
| 10 | `css/styles.css` — print | Print CSS | Header/sidebar/tabs/calculadora/escore/fontes ocultos; margem zero |
| 11 | `css/styles.css` — a11y/motion | WCAG 2.1 AA | `:focus-visible`, `prefers-reduced-motion`, `forced-colors`, touch ≥44px |
| 12 | Console | Abrir app no navegador | Zero erros/avisos JS; fetch 200 nos 3 JSONs |

## Checklist do Modo Sistema

- [ ] 3 abas (Sala Vermelha, Condutas de Porta, Vasoativa) renderizam, trocam e lembram a última (`localStorage`)
- [ ] Sidebar agrupada por categoria; busca filtra em todas as abas
- [ ] Calculadora de doses: peso 20–300 kg, 5 modos de unidade, mL/h corretos para cada diluição
- [ ] Calculadora de escore: checkbox/radio → soma → interpretação colorida
- [ ] Copy/Export/Print funcionais
- [ ] Dark mode consistente
- [ ] Mobile: drawer 85vw, tabs acessíveis, sem corte de conteúdo
- [ ] Teclado: `/` ou Ctrl+K busca, `D` dark, setas navegam, Escape fecha sidebar
- [ ] `aria-live` nas áreas dinâmicas; skip-link funciona
- [ ] Sem erros no console do navegador

## Orquestração

1. Definir lista de subagents (tabela acima), um escopo por subagent.
2. Subagent **acha e reporta** (arquivo, função/linha, o que quebra, correção proposta). Correção fica com o agente principal.
   - Exceção: erro trivial e sem ambiguidade (typo, classe CSS, negrito) o subagent corrige e reporta.
3. Paralelizar escopos independentes; esperar todos; cruzar (ex: renderer novo × JSON novo).
4. Após correções: rodar `node validate.js` e abrir o app para conferência final.

## Relatório final (modelo)

```
## Relatório de revisão de sistema — <data>
### Subagents executados
- <nome>: <escopo> — <encontrados> / <corrigidos> / <pendentes>
### Erros não corrigidos
- [arquivo] <descrição> — <motivo>
### Correções aplicadas
- [arquivo] <o que mudou>
### Validação
- node validate.js: <passou / falhou>
- Console do navegador: <limpo / erros restantes>
```
