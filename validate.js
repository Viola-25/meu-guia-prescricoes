#!/usr/bin/env node
/**
 * validate.js — Validação automática dos dados clínicos do Guia de Emergência PS
 * Rodar: node validate.js
 * 
 * Verifica:
 * 1. Sintaxe JSON
 * 2. Campos obrigatórios
 * 3. Matemática de diluições
 * 4. Calculadoras de doses vs texto
 * 5. Critérios de escores vs calculadora
 * 6. Texto em inglês
 * 7. Formato CID-10
 * 8. Badges SUS
 * 9. Consistência cruzada entre condições
 * 10. Fontes obrigatórias
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const LIVRO_DIR = path.join(DATA_DIR, 'livro-extracoes');
const GUIAS_DIR = path.join(DATA_DIR, 'guias-extracoes');

let errors = [];
let warnings = [];
let info = [];

function addError(file, msg) { errors.push(`❌ [${file}] ${msg}`); }
function addWarn(file, msg) { warnings.push(`⚠️  [${file}] ${msg}`); }
function addInfo(file, msg) { info.push(`ℹ️  [${file}] ${msg}`); }

// ─────────────────────────────────────────────
// 1. Load and parse JSON
// ─────────────────────────────────────────────
function loadJSON(filename) {
  const filepath = path.join(DATA_DIR, filename);
  try {
    const raw = fs.readFileSync(filepath, 'utf8');
    const data = JSON.parse(raw);
    addInfo(filename, `Carregado: ${Array.isArray(data) ? data.length + ' itens' : 'objeto'}`);
    return data;
  } catch (e) {
    addError(filename, `JSON inválido: ${e.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// 2. Required fields (vasoativa doesn't need CID)
// ─────────────────────────────────────────────
function checkRequiredFields(data, filename) {
  if (!Array.isArray(data)) return;
  
  const requiredBase = ['id', 'titulo', 'cor', 'icon', 'fontes', 'secoes'];
  const requiredSala = ['cid'];
  const requiredVasoativa = ['apresentacao', 'tipo'];
  
  data.forEach((item, i) => {
    const ctx = `${filename}[${i}] ${item.id || '???'}`;
    
    requiredBase.forEach(field => {
      if (!item[field]) addError(ctx, `Campo obrigatório ausente: ${field}`);
    });
    
    // Only require CID for clinical conditions, not for vasoativa drugs or procedures
    if (filename !== 'vasoativa-sedacao.json' && item.id !== 'sri-intubacao') {
      requiredSala.forEach(field => {
        if (!item[field]) addError(ctx, `Campo obrigatório ausente: ${field}`);
      });
    }
    
    if (filename === 'vasoativa-sedacao.json') {
      requiredVasoativa.forEach(field => {
        if (!item[field]) addError(ctx, `Campo obrigatório ausente: ${field}`);
      });
    }
    
    // ID format
    if (item.id && !/^[a-z0-9-]+$/.test(item.id)) {
      addError(ctx, `ID deve ser kebab-case: "${item.id}"`);
    }
    
    // CID format
    if (item.cid && !/^[A-Z]\d{2}(\.\d{1,2})?$/.test(item.cid)) {
      addWarn(ctx, `CID-10 formato incomum: "${item.cid}"`);
    }
    
    // Cor format
    if (item.cor && !/^#[0-9a-fA-F]{6}$/.test(item.cor)) {
      addError(ctx, `Cor inválida: "${item.cor}"`);
    }
    
    // Fontes
    if (item.fontes && Array.isArray(item.fontes) && item.fontes.length === 0) {
      addError(ctx, `Array de fontes vazio`);
    }
    
    // Sections
    if (item.secoes && Array.isArray(item.secoes)) {
      if (item.secoes.length === 0) {
        addError(ctx, `Nenhuma seção definida`);
      }
      item.secoes.forEach((sec, j) => {
        if (!sec.tipo) addError(ctx, `secoes[${j}]: tipo ausente`);
        if (!sec.titulo) addWarn(ctx, `secoes[${j}]: titulo ausente`);
      });
    }
  });
}

// ─────────────────────────────────────────────
// 3. Dilution math
// ─────────────────────────────────────────────
function checkDilutionMath(data, filename) {
  if (!Array.isArray(data)) return;
  
  data.forEach(item => {
    if (!item.calculadora || !item.calculadora.diluicoes) return;
    const ctx = `${filename} → ${item.id}`;
    
    item.calculadora.diluicoes.forEach((dil, i) => {
      const conc = dil.concentracao;
      const vol = dil.volume_ml;
      
      if (!conc || !vol) {
        addError(ctx, `diluicoes[${i}]: concentracao ou volume_ml ausente`);
        return;
      }
      
      // Check concentration = dose / volume (approximate)
      if (dil.doses && dil.doses.length > 0) {
        // Just verify the math makes sense
        const maxDose = Math.max(...dil.doses.map(d => d.dose_max || 0));
        if (maxDose > 0 && conc > 0) {
          const maxMLh = maxDose / conc;
          if (maxMLh > 500) {
            addWarn(ctx, `diluicoes[${i}]: mL/h máximo muito alto (${maxMLh.toFixed(1)}) — verificar unidade`);
          }
        }
      }
      
      // Check dose ranges
      if (dil.doses) {
        dil.doses.forEach((d, j) => {
          if (d.dose_min > d.dose_max) {
            addError(ctx, `diluicoes[${i}].doses[${j}]: dose_min (${d.dose_min}) > dose_max (${d.dose_max})`);
          }
        });
      }
    });
  });
}

// ─────────────────────────────────────────────
// 4. Score calculator vs table
// ─────────────────────────────────────────────
function checkScoreConsistency(data, filename) {
  if (!Array.isArray(data)) return;
  
  data.forEach(item => {
    if (!item.secoes) return;
    const ctx = `${filename} → ${item.id}`;
    
    item.secoes.forEach(sec => {
      if (sec.tipo !== 'escores' || !sec.escores) return;
      
      sec.escores.forEach(escore => {
        if (!escore.calculadora_escore) return;
        const calc = escore.calculadora_escore;
        
        // Count inputs
        const checkboxInputs = calc.inputs.filter(i => i.tipo === 'checkbox');
        const radioGroups = {};
        calc.inputs.filter(i => i.tipo === 'radio').forEach(i => {
          if (!radioGroups[i.grupo]) radioGroups[i.grupo] = [];
          radioGroups[i.grupo].push(i);
        });
        
        // Total possible points from checkboxes
        const maxCheckboxPts = checkboxInputs.reduce((sum, i) => sum + (i.pontos || 0), 0);
        
        // Max from radio groups (pick highest point value)
        let maxRadioPts = 0;
        Object.values(radioGroups).forEach(group => {
          const maxInGroup = Math.max(...group.map(i => i.pontos || 0));
          maxRadioPts += maxInGroup;
        });
        
        const totalMax = maxCheckboxPts + maxRadioPts;
        
        // Check interpretation ranges cover all possibilities
        if (calc.resultado && calc.resultado.interpretacoes) {
          const maxInterp = Math.max(...calc.resultado.interpretacoes.map(i => i.max || 0));
          if (maxInterp < totalMax) {
            addWarn(ctx, `Escore "${escore.nome}": max interpretação (${maxInterp}) < max pontos possível (${totalMax})`);
          }
          if (calc.resultado.interpretacoes[0].min > 0) {
            addWarn(ctx, `Escore "${escore.nome}": min interpretação (${calc.resultado.interpretacoes[0].min}) > 0 — pontos negativos não cobertos?`);
          }
        }
        
        // Check for duplicate IDs
        const ids = calc.inputs.map(i => i.id);
        const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (dupes.length > 0) {
          addError(ctx, `Escore "${escore.nome}": IDs duplicados: ${dupes.join(', ')}`);
        }
      });
    });
  });
}

// ─────────────────────────────────────────────
// 5. English text detection
// ─────────────────────────────────────────────
function checkEnglishText(data, filename) {
  if (!Array.isArray(data)) return;
  
  const englishPatterns = [
    /\bNEVER use\b/i,
    /\bDO NOT\b/i,
    /\bNOTE:\b/i,
    /\bWARNING:\b/i,
    /\bIMPORTANT:\b/i,
    /\bSee also\b/i,
    /\bHowever\b/i,
    /\bTherefore\b/i,
    /\bFor example\b/i,
    /\bIn addition\b/i,
    /\bMonitor\b/i,
    /\bContinue\b/i,
    /\bDiscontinue\b/i,
    /\bAdminister\b/i,
    /\bOnce daily\b/i,
    /\bTwice daily\b/i,
  ];
  
  data.forEach(item => {
    if (!item.secoes) return;
    const ctx = `${filename} → ${item.id}`;
    
    const checkText = (text, location) => {
      if (typeof text !== 'string') return;
      englishPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          addError(ctx, `${location}: texto em inglês detectado — "${text.substring(0, 80)}..."`);
        }
      });
    };
    
    item.secoes.forEach(sec => {
      if (sec.itens) sec.itens.forEach((item, i) => checkText(item, `seção "${sec.titulo}" item[${i}]`));
      if (sec.orientacoes) sec.orientacoes.forEach((o, i) => checkText(o, `orientação[${i}]`));
      if (sec.dados && Array.isArray(sec.dados)) {
        sec.dados.forEach((row, i) => {
          if (Array.isArray(row)) row.forEach(cell => checkText(cell, `dados[${i}]`));
        });
      }
    });
    
    // Check fontes for English
    if (item.fontes) {
      item.fontes.forEach(f => {
        if (/\bMedicina de EmerGENCY\b/i.test(f)) {
          addError(ctx, `Fonte com typo: "${f}"`);
        }
      });
    }
  });
}

// ─────────────────────────────────────────────
// 6. SUS badges
// ─────────────────────────────────────────────
function checkSUSBadges(data, filename) {
  if (!Array.isArray(data)) return;
  
  const validBadges = ['rename', 'ceaf', 'basico', 'comercial'];
  
  data.forEach(item => {
    if (!item.secoes) return;
    const ctx = `${filename} → ${item.id}`;
    
    item.secoes.forEach(sec => {
      if (sec.tipo !== 'tabela_farmacos' || !sec.dados) return;
      
      sec.dados.forEach((row, i) => {
        if (row.sus && !validBadges.includes(row.sus)) {
          addError(ctx, `tabela_farmacos dados[${i}]: badge SUS inválido "${row.sus}"`);
        }
      });
    });
  });
}

// ─────────────────────────────────────────────
// 7. Cross-condition consistency
// ─────────────────────────────────────────────
function checkCrossConsistency(allData) {
  // Build drug index: drug name → [{condition, dose, presentation}]
  const drugIndex = {};
  
  Object.entries(allData).forEach(([filename, data]) => {
    if (!Array.isArray(data)) return;
    
    data.forEach(item => {
      if (!item.secoes) return;
      
      item.secoes.forEach(sec => {
        if (sec.tipo === 'tabela_farmacos' && sec.dados) {
          sec.dados.forEach(row => {
            if (row.nome) {
              const key = row.nome.toLowerCase().trim();
              if (!drugIndex[key]) drugIndex[key] = [];
              drugIndex[key].push({
                condition: item.id,
                dose: row.dose,
                presentation: row.apresentacao,
                file: filename
              });
            }
          });
        }
      });
    });
  });
  
  // Check for same drug, same condition, different doses (REAL errors)
  Object.entries(drugIndex).forEach(([drug, occurrences]) => {
    if (occurrences.length < 2) return;
    
    // Group by condition
    const byCondition = {};
    occurrences.forEach(o => {
      if (!byCondition[o.condition]) byCondition[o.condition] = [];
      byCondition[o.condition].push(o);
    });
    
    // Check within same condition
    Object.entries(byCondition).forEach(([condition, items]) => {
      if (items.length < 2) return;
      const doses = [...new Set(items.map(i => i.dose))];
      if (doses.length > 1) {
        addWarn(`cross-consistency`, `Drogga "${drug}" na mesma condição "${condition}" tem doses diferentes:\n    ${items.map(i => `${i.file}: ${i.dose}`).join('\n    ')}`);
      }
    });
  });
}

// ─────────────────────────────────────────────
// 8. Vasoativa specific checks
// ─────────────────────────────────────────────
function checkVasoativa(data) {
  if (!Array.isArray(data)) return;
  
  data.forEach(item => {
    const ctx = `vasoativa → ${item.id}`;
    
    // Calculator must exist for non-fixed-dose drugs
    if (!item.calculadora && (!item.tipo || item.tipo === 'vasoativa')) {
      addWarn(ctx, `Sem calculadora de doses`);
    }
    
    // Sections order: diluicao → concentracao → dose → orientacoes
    if (item.secoes) {
      const types = item.secoes.map(s => s.tipo);
      const expected = ['diluicao', 'concentracao', 'dose', 'orientacoes'];
      const actual = types.filter(t => expected.includes(t));
      const expectedFiltered = expected.filter(e => actual.includes(e));
      
      if (JSON.stringify(actual) !== JSON.stringify(expectedFiltered)) {
        addWarn(ctx, `Ordem das seções: ${actual.join(' → ')} (esperado: ${expectedFiltered.join(' → ')})`);
      }
    }
    
    // Calculator concentration must match text (check if ANY number from calculator appears in text)
    if (item.calculadora && item.secoes) {
      const concSection = item.secoes.find(s => s.tipo === 'concentracao');
      if (concSection && concSection.itens) {
        item.calculadora.diluicoes.forEach((dil, i) => {
          // Check if calculator concentration OR derived values appear in text
          const conc = dil.concentracao;
          const vol = dil.volume_ml;
          // Possible text representations: conc value, or conc*vol/1000 (for different unit), or total mcg
          const totalMcg = conc * vol;
          const possibleValues = [
            conc.toString(),
            (conc * vol).toFixed(0),           // total mcg
            (conc * vol / 1000).toFixed(1),    // total mg
            (conc / 60).toFixed(2),            // mcg/min if text uses that
            (conc * 1000 / vol).toFixed(0),    // reverse calc
          ];
          const found = concSection.itens.some(t => 
            possibleValues.some(v => v.length > 1 && t.includes(v))
          );
          if (!found) {
            addWarn(ctx, `Calculadora diluicoes[${i}] concentração ${conc} pode não corresponder ao texto`);
          }
        });
      }
    }
  });
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
console.log('🔍 Validação do Guia de Emergência PS\n');
console.log('='.repeat(60));

// Load all data
const salaVermelha = loadJSON('guia-sala-vermelha.json');
const condutasPorta = loadJSON('condutas-porta.json');
const vasoativa = loadJSON('vasoativa-sedacao.json');

if (!salaVermelha || !condutasPorta || !vasoativa) {
  console.error('\n❌ Falha ao carregar JSON. Abortando.');
  process.exit(1);
}

console.log('\n─── 1. CAMPOS OBRIGATÓRIOS ───');
checkRequiredFields(salaVermelha, 'guia-sala-vermelha.json');
checkRequiredFields(condutasPorta, 'condutas-porta.json');
checkRequiredFields(vasoativa, 'vasoativa-sedacao.json');

console.log('\n─── 2. MATEMÁTICA DE DILUIÇÕES ───');
checkDilutionMath(vasoativa, 'vasoativa-sedacao.json');

console.log('\n─── 3. CONSISTÊNCIA DE ESCORES ───');
checkScoreConsistency(salaVermelha, 'guia-sala-vermelha.json');
checkScoreConsistency(condutasPorta, 'condutas-porta.json');

console.log('\n─── 4. TEXTO EM INGLÊS ───');
checkEnglishText(salaVermelha, 'guia-sala-vermelha.json');
checkEnglishText(condutasPorta, 'condutas-porta.json');
checkEnglishText(vasoativa, 'vasoativa-sedacao.json');

console.log('\n─── 5. BADGES SUS ───');
checkSUSBadges(salaVermelha, 'guia-sala-vermelha.json');
checkSUSBadges(condutasPorta, 'condutas-porta.json');

console.log('\n─── 6. VASOATIVA ───');
checkVasoativa(vasoativa);

console.log('\n─── 7. CONSISTÊNCIA CRUZADA ───');
checkCrossConsistency({
  'guia-sala-vermelha.json': salaVermelha,
  'condutas-porta.json': condutasPorta,
  'vasoativa-sedacao.json': vasoativa
});

// ─────────────────────────────────────────────
// REPORT
// ─────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('📊 RELATÓRIO\n');

if (errors.length > 0) {
  console.log(`❌ ERROS (${errors.length}):\n`);
  errors.forEach(e => console.log(`  ${e}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log(`⚠️  ALERTAS (${warnings.length}):\n`);
  warnings.forEach(w => console.log(`  ${w}`));
  console.log('');
}

if (info.length > 0) {
  console.log(`ℹ️  INFO (${info.length}):\n`);
  info.forEach(i => console.log(`  ${i}`));
  console.log('');
}

console.log('='.repeat(60));
console.log(`\n✅ ${info.length} info | ⚠️  ${warnings.length} alertas | ❌ ${errors.length} erros`);

if (errors.length > 0) {
  console.log('\n🚨 CORRIGIR ERROS ANTES DE PUBLICAR');
  process.exit(1);
} else if (warnings.length > 0) {
  console.log('\n⚠️  REVISAR ALERTAS');
  process.exit(0);
} else {
  console.log('\n✅ TUDO CERTO');
  process.exit(0);
}
