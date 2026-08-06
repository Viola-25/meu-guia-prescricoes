# Guia de Revisão — Guia de Emergência PS

Índice do processo de revisão do projeto **Guia de Emergência PS** (app web offline-first para Pronto-Socorro).

## Dois modos de revisão

| Modo | Arquivo a carregar | O que cobre |
|------|--------------------|-------------|
| **Sistema** (UI + Funcionalidades) | `revisao-sistema.md` | Renderização, calculadoras, busca/teclado, layout, dark mode, print, a11y, console |
| **Conteúdo** (Fontes Clínicas) | `revisao-conteudo.md` | Doses, diluições, escores, badges SUS, CIDs, consistência cruzada — sempre contra as fontes registradas |

## Como usar

1. Abrir nova sessão e carregar o arquivo do modo desejado (não este índice).
2. Cada arquivo é autossuficiente: contém regras, escopos de subagent, checklist e modelo de relatório.
3. **AGENTS.md é carregado em toda sessão** e contém as regras de auditoria clínica — o modo conteúdo referencia ele.

## Regras gerais (ambos os modos)

- Achei erro → corrijo. Nenhum erro fica sem correção.
- Disparar **quantos subagents forem necessários** (um escopo por subagent, rodar em paralelo). O agente principal orquestra, cruza relatórios e corrige.
- Fechar com `node validate.js` na raiz — falha = revisão incompleta.
- Texto sempre em português BR (exceto nomes de escores internacionais).
- Dúvida sem fonte → perguntar ao usuário, nunca inventar.

## Ferramentas de apoio

| Comando | Para que serve |
|---------|----------------|
| `node validate.js` | Validação final: campos, diluições, escores, inglês, badges, vasoativa, consistência cruzada, guard de fontes vazias, convenções visuais, pt-BR |
| `node scripts/index_fontes.js [termo]` | Índice fármaco → arquivo-fonte e linha (rodar antes de revisar qualquer fármaco/condição) |
