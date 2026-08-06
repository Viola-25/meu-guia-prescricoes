#!/usr/bin/env node
/**
 * index_fontes.js — Índice de fármacos → arquivos-fonte
 *
 * Coleta os nomes de fármacos dos JSONs do app e varre as fontes extraídas
 * (data/livro-extracoes/*.txt e data/guias-extracoes/*.txt), mostrando onde
 * cada fármaco aparece (nº de ocorrências + primeira linha).
 *
 * Uso:
 *   node scripts/index_fontes.js            # índice completo
 *   node scripts/index_fontes.js noradre    # filtra por termo
 *
 * Rodar ANTES de revisar uma condição/fármaco para saber qual arquivo-fonte
 * e em qual linha procurar. Também sinaliza arquivos-fonte vazios (0 bytes).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const LIVRO_DIR = path.join(DATA_DIR, 'livro-extracoes');
const GUIAS_DIR = path.join(DATA_DIR, 'guias-extracoes');

const JSONS = [
  'guia-sala-vermelha.json',
  'condutas-porta.json',
  'vasoativa-sedacao.json'
];

// Só fármacos: tabela_farmacos (todas as abas) + titulo/sinonimos da vasoativa
function collectDrugNames() {
  const names = new Map(); // name -> origem
  JSONS.forEach(f => {
    const filepath = path.join(DATA_DIR, f);
    if (!fs.existsSync(filepath)) return;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    data.forEach(item => {
      if (item.secoes) {
        item.secoes.forEach(sec => {
          if (sec.tipo === 'tabela_farmacos' && sec.dados) {
            sec.dados.forEach(row => {
              if (row.nome) names.set(row.nome.trim(), 'tabela');
            });
          }
        });
      }
      if (f === 'vasoativa-sedacao.json') {
        if (item.titulo) names.set(item.titulo.split(/[/(]/)[0].trim(), 'vasoativa');
        if (item.sinonimos) {
          item.sinonimos.split(/[,;/]/).map(s => s.trim()).filter(Boolean).forEach(s => names.set(s, 'vasoativa'));
        }
      }
    });
  });
  return [...names.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
}

// Agulhas de busca por fármaco: nome-frase, sigla (AAS, HNF), conteúdo de parênteses
function buildNeedles(name) {
  const needles = new Set();
  needles.add(name.toLowerCase());
  (name.match(/\b[A-Z]{2,}\b/g) || []).forEach(a => needles.add(a.toLowerCase()));
  (name.match(/\(([^)]+)\)/g) || []).forEach(p => needles.add(p.replace(/[()]/g, '').trim().toLowerCase()));
  return [...needles].filter(Boolean);
}

// Regex com palavra-limitada (fármacos são ASCII na maioria; com acento usa contains)
function toRegex(needle) {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/^[\x00-\x7F]+$/.test(needle)) {
    return new RegExp(`\\b${esc.replace(/\s+/g, '\\s+')}\\b`, 'i');
  }
  return new RegExp(esc.replace(/\s+/g, '\\s+'), 'i');
}

function scanSources(needles) {
  const hits = [];
  const seen = new Set();
  [['livro-extracoes', LIVRO_DIR], ['guias-extracoes', GUIAS_DIR]].forEach(([label, dir]) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort().forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).size === 0) return;
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      let count = 0;
      let first = 0;
      lines.forEach((line, i) => {
        if (needles.some(n => toRegex(n).test(line))) {
          count++;
          if (!first) first = i + 1;
        }
      });
      if (count > 0) hits.push({ label, file: f, count, first });
    });
  });
  return hits;
}

function emptySources() {
  const empties = [];
  [['livro-extracoes', LIVRO_DIR], ['guias-extracoes', GUIAS_DIR]].forEach(([label, dir]) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.txt')).forEach(f => {
      const p = path.join(dir, f);
      if (fs.statSync(p).size === 0) empties.push(`${label}/${f}`);
    });
  });
  return empties;
}

const filter = process.argv[2] ? process.argv[2].toLowerCase() : null;
const drugs = collectDrugNames();

console.log('🔎 Índice de fármacos → fontes extraídas\n');
console.log('Fármacos detectados nos JSONs: ' + drugs.length + '\n');

const empties = emptySources();
if (empties.length) {
  console.log('⚠️  Fontes VAZIAS (0 bytes) — revisão não cobre estes assuntos:');
  empties.forEach(e => console.log('   ' + e));
  console.log('');
}

drugs.forEach(([name, origin]) => {
  if (filter && !name.toLowerCase().includes(filter)) return;
  const hits = scanSources(buildNeedles(name)).sort((a, b) => b.count - a.count);

  console.log(`■ ${name}${origin === 'vasoativa' ? ' [vasoativa]' : ''}`);
  if (hits.length === 0) {
    console.log('   ⚠️  Nenhuma ocorrência em fontes extraídas (verificar diretrizes/PCDT em PDF não extraído)');
  } else {
    hits.forEach(h => console.log(`   ${h.label}/${h.file}: ${h.count} ocorr. (1ª linha ${h.first})`));
  }
  console.log('');
});
