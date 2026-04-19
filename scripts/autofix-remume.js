#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const remumePath = path.join(rootDir, 'data', 'remume-sp.json');

const LEAK_PREFIXES = [
  '/ AMAE/ AE E EM UNIDADES DE REFERÊNCIA EM OFTALMOLOGIA ',
  'E EM UNIDADES DE REFERÊNCIA PARA TRATAMENTO DE ESQUEMAS ESPECIAIS DE TB/MNT ',
  'E EM UNIDADES DE REFERÊNCIA PARA TRATAMENTO DE TUBERCULOSE EM CONDIÇÕES ESPECÍFICAS ',
  'GLAUCOMA. PRESCRIÇÃO POR MÉDICO OFTALMOLOGISTA DAS UNIDADES DA REDE MUNICIPAL ',
  'PROGRAMA DE SAÚDE INTEGRAL DA POPULAÇÃO LGBTIA+ DA SMS ',
  'REFERÊNCIA DISPENSAÇÃO SOB PROTOCOLO (EM ELABORAÇÃO) ',
  'REDE MUNICIPAL DE SAÚDE ORIENTAÇÃO TÉCNICA PARA PRESCRIÇÃO E DISPENSAÇÃO ',
  'LINHA DE CUIDADO DO SOBREPESO E OBESIDADE DA REDE MUNICIPAL ',
  'REFERÊNCIA -EXCLUSIVO PARA TRATAMENTO DE TB EM GESTANTES ',
  'REFERÊNCIA, UTILIZADO NO TRATAMENTO DA ESQUISTOSSOMOSE ',
  'MÉDICO OFTALMOLOGISTA ',
  'TOXOPLASMOSE ',
  'HEPATITES VIRAIS ',
  'DISPENSAÇÃO '
];

const DOSE_START_REGEX = /\d+(?:[.,]\d+)?\s*(?:MG|MCG|G|UI|U|ML|MEQ|%)(?:\s*\/\s*\d+(?:[.,]\d+)?\s*(?:MG|MCG|G|UI|U|ML|MEQ|DOSE|JATO|GOTA|GOTAS))?/i;

const TRAILING_FORM_IN_NAME = [
  'COMPRIMIDO MASTIGÁVEL',
  'COMPRIMIDO',
  'CÁPSULA',
  'CAPSULA',
  'SACHÊ',
  'SACHE',
  'GEL',
  'CREME',
  'XAROPE',
  'FRASCO'
];

const TRAILING_FORM_WITHOUT_DOSE = [
  'PÓ PARA SOLUÇÃO ORAL',
  'PÓ PARA SUSPENSÃO ORAL',
  'PÓ PARA SUSPENSÃO INJETÁVEL',
  'PÓ EM CÁPSULA PARA INALAÇÃO',
  'SOLUÇÃO ORAL (GOTAS)',
  'SOLUÇÃO ORAL GOTAS',
  'SOLUÇÃO ORAL',
  'SUSPENSÃO ORAL',
  'SOLUÇÃO INJETÁVEL',
  'SOLUÇÃO OFTÁLMICA',
  'POMADA OFTÁLMICA',
  'AEROSSOL ORAL',
  'AEROSSOL NASAL',
  'COMPRIMIDOS EM BLISTER',
  'COMPRIMIDO MASTIGÁVEL',
  'COMPRIMIDO',
  'CÁPSULA',
  'CAPSULA',
  'GEL VAGINAL',
  'CREME VAGINAL',
  'CREME',
  'GEL',
  'SHAMPOO',
  'XAROPE',
  'FRASCO'
];

function normalize(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function removeMetadata(value) {
  return normalize(value).replace(/\s*\|\s*(?:Contexto de dispensacao:|Texto de origem consolidado:).*$/i, '').trim();
}

function extractLeakPrefix(nome) {
  for (const prefix of LEAK_PREFIXES) {
    if (nome.startsWith(prefix)) {
      const cleanName = normalize(nome.slice(prefix.length));
      if (cleanName) {
        return { prefix: normalize(prefix), cleanName };
      }
    }
  }

  return null;
}

function appendToObservation(observacao, suffix) {
  const base = normalize(observacao);
  const tail = normalize(suffix);

  if (!tail) {
    return base;
  }

  if (!base) {
    return tail;
  }

  return `${base} ${tail}`;
}

function splitNomeApresentacao(fullName) {
  const nome = normalize(fullName);
  if (!nome) {
    return { nome: '', apresentacao: '' };
  }

  const doseMatch = DOSE_START_REGEX.exec(nome);
  if (doseMatch) {
    const idx = doseMatch.index;
    let principle = normalize(nome.slice(0, idx));
    let presentation = normalize(nome.slice(idx));

    for (const form of TRAILING_FORM_IN_NAME) {
      if (principle.toUpperCase().endsWith(` ${form}`)) {
        const base = normalize(principle.slice(0, -(` ${form}`).length));
        if (base && !presentation.toUpperCase().includes(form)) {
          principle = base;
          presentation = normalize(`${presentation} ${form}`);
        }
        break;
      }
    }

    if (!principle || !presentation) {
      return { nome, apresentacao: '' };
    }

    return { nome: principle, apresentacao: presentation };
  }

  for (const form of TRAILING_FORM_WITHOUT_DOSE) {
    if (nome.toUpperCase().endsWith(` ${form}`)) {
      const principle = normalize(nome.slice(0, -(` ${form}`).length));
      if (principle) {
        return { nome: principle, apresentacao: form };
      }
    }
  }

  return { nome, apresentacao: '' };
}

function main() {
  if (!fs.existsSync(remumePath)) {
    console.error('Arquivo nao encontrado:', remumePath);
    process.exit(1);
  }

  const raw = fs.readFileSync(remumePath, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    console.error('O arquivo remume-sp.json precisa ser uma lista JSON.');
    process.exit(1);
  }

  let changed = 0;
  let leakFixes = 0;
  let metadataFixes = 0;
  let splitFixes = 0;

  const updated = [];

  for (let index = 0; index < data.length; index += 1) {
    const item = data[index];
    const record = { ...item };

    const originalNome = normalize(record.NOME);
    const originalObs = normalize(record.OBSERVACAO);
    const originalGrupo = normalize(record.GRUPO);
    const originalCategoria = normalize(record.CATEGORIA);

    record.NOME = originalNome;
    record.OBSERVACAO = removeMetadata(originalObs);
    record.GRUPO = originalGrupo;
    record.CATEGORIA = originalCategoria;
    record.APRESENTACAO = normalize(record.APRESENTACAO);

    if (record.OBSERVACAO !== originalObs) {
      metadataFixes += 1;
    }

    const leak = extractLeakPrefix(record.NOME);
    if (leak && index > 0) {
      record.NOME = leak.cleanName;
      const previousRecord = updated[index - 1];
      previousRecord.OBSERVACAO = appendToObservation(previousRecord.OBSERVACAO, leak.prefix);
      leakFixes += 1;
    }

    const split = splitNomeApresentacao(record.NOME);
    if (split.apresentacao) {
      record.NOME = split.nome;
      record.APRESENTACAO = split.apresentacao;
      splitFixes += 1;
    }

    if (
      record.NOME !== originalNome ||
      record.OBSERVACAO !== originalObs ||
      record.GRUPO !== originalGrupo ||
      record.CATEGORIA !== originalCategoria ||
      record.APRESENTACAO !== normalize(item.APRESENTACAO)
    ) {
      changed += 1;
    }

    updated.push(record);
  }

  fs.writeFileSync(remumePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

  console.log('=== Higienizacao REMUME concluida ===');
  console.log(`Registros alterados: ${changed}`);
  console.log(`Correcao de vazamento OBSERVACAO->NOME: ${leakFixes}`);
  console.log(`Remocoes de metadados em OBSERVACAO: ${metadataFixes}`);
  console.log(`Separacoes NOME/APRESENTACAO: ${splitFixes}`);
}

main();
