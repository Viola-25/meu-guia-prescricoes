#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const prescricoesPath = path.join(rootDir, 'data', 'prescricoes.json');
const remumePath = path.join(rootDir, 'data', 'remume-sp.json');

const strictWarnings = process.argv.includes('--strict-warnings');

const issues = [];

function addIssue(level, file, message, index) {
  issues.push({ level, file, message, index });
}

function readJson(filePath, label) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    addIssue('error', label, `Falha ao ler ou parsear JSON: ${error.message}`);
    return null;
  }
}

function pick(record, keys) {
  if (!record || typeof record !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }

  const lowered = Object.keys(record).reduce((acc, key) => {
    acc[String(key).toLowerCase()] = record[key];
    return acc;
  }, {});

  for (const key of keys) {
    const value = lowered[String(key).toLowerCase()];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function asText(value) {
  return String(value == null ? '' : value).trim();
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validatePrescricoes(data) {
  const file = 'data/prescricoes.json';

  if (!Array.isArray(data)) {
    addIssue('error', file, 'O arquivo precisa conter uma lista JSON.');
    return;
  }

  const idSet = new Set();
  const diseaseSet = new Set();
  const cidPattern = /^[A-TV-Z][0-9]{2}(\.[0-9A-Z]{1,2})?$/i;

  data.forEach((item, i) => {
    const itemPos = i + 1;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      addIssue('error', file, 'Cada item deve ser um objeto JSON.', itemPos);
      return;
    }

    const id = asText(pick(item, ['ID', 'id']));
    const area = asText(pick(item, ['AREA', 'area']));
    const doenca = asText(pick(item, ['DOENCA', 'doenca']));
    const cid = asText(pick(item, ['CID', 'cid']));
    const texto = asText(pick(item, ['TEXTO', 'texto']));

    const receituario = pick(item, ['RECEITUARIO', 'receituario']);
    const orientacoes = pick(item, ['ORIENTACOES', 'orientacoes']);

    if (!id) {
      addIssue('error', file, 'Campo ID ausente ou vazio.', itemPos);
    } else if (idSet.has(id)) {
      addIssue('error', file, `ID duplicado: ${id}.`, itemPos);
    } else {
      idSet.add(id);
    }

    if (!area) {
      addIssue('error', file, 'Campo AREA ausente ou vazio.', itemPos);
    }

    if (!doenca) {
      addIssue('error', file, 'Campo DOENCA ausente ou vazio.', itemPos);
    }

    if (!cid) {
      addIssue('warning', file, 'Campo CID vazio.', itemPos);
    } else if (!cidPattern.test(cid)) {
      addIssue('warning', file, `Formato de CID possivelmente invalido: ${cid}.`, itemPos);
    }

    if (receituario !== undefined && !Array.isArray(receituario)) {
      addIssue('error', file, 'Campo RECEITUARIO deve ser uma lista.', itemPos);
    }

    if (orientacoes !== undefined && !Array.isArray(orientacoes)) {
      addIssue('error', file, 'Campo ORIENTACOES deve ser uma lista.', itemPos);
    }

    const recItems = Array.isArray(receituario) ? receituario.filter((v) => asText(v)) : [];
    const oriItems = Array.isArray(orientacoes) ? orientacoes.filter((v) => asText(v)) : [];

    if (!texto && recItems.length === 0 && oriItems.length === 0) {
      addIssue('warning', file, 'Item sem texto clinico (TEXTO, RECEITUARIO e ORIENTACOES vazios).', itemPos);
    }

    if (recItems.some((v) => !isNonEmptyString(v))) {
      addIssue('warning', file, 'RECEITUARIO contem item nao textual ou vazio.', itemPos);
    }

    if (oriItems.some((v) => !isNonEmptyString(v))) {
      addIssue('warning', file, 'ORIENTACOES contem item nao textual ou vazio.', itemPos);
    }

    const diseaseKey = `${area}||${doenca}`.toLowerCase();
    if (area && doenca) {
      if (diseaseSet.has(diseaseKey)) {
        addIssue('warning', file, `Area + doenca duplicada: ${area} / ${doenca}.`, itemPos);
      } else {
        diseaseSet.add(diseaseKey);
      }
    }
  });
}

function validateRemume(data) {
  const file = 'data/remume-sp.json';

  if (!Array.isArray(data)) {
    addIssue('error', file, 'O arquivo precisa conter uma lista JSON.');
    return;
  }

  const idSet = new Set();
  const suspiciousNamePrefix = /^(NESTAS UNIDADES |HOSPITAL DIA |SAE\/IST\/AIDS, |REFERENCIA - EXCLUSIVO |REFERÊNCIA - EXCLUSIVO |REFERENCIA PARA O TRATAMENTO |REFERÊNCIA PARA O TRATAMENTO )/i;

  data.forEach((item, i) => {
    const itemPos = i + 1;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      addIssue('error', file, 'Cada item deve ser um objeto JSON.', itemPos);
      return;
    }

    const id = asText(pick(item, ['ID', 'id']));
    const nome = asText(pick(item, ['NOME', 'nome']));
    const grupo = asText(pick(item, ['GRUPO', 'grupo']));
    const observacao = asText(pick(item, ['OBSERVACAO', 'observacao']));

    if (!id) {
      addIssue('error', file, 'Campo ID ausente ou vazio.', itemPos);
    } else if (idSet.has(id)) {
      addIssue('error', file, `ID duplicado: ${id}.`, itemPos);
    } else {
      idSet.add(id);
    }

    if (!nome) {
      addIssue('error', file, 'Campo NOME ausente ou vazio.', itemPos);
    } else {
      if (suspiciousNamePrefix.test(nome)) {
        addIssue('warning', file, `NOME com prefixo administrativo suspeito: ${nome.slice(0, 90)}...`, itemPos);
      }

      const dosageHints = nome.match(/\b(\d+[\.,]?\d*\s?(MG|MCG|G|UI|ML|%)|\d+\/\d+)\b/gi) || [];
      if (dosageHints.length > 4) {
        addIssue('warning', file, 'NOME parece conter mais de um medicamento concatenado.', itemPos);
      }
    }

    if (!grupo) {
      addIssue('warning', file, 'Campo GRUPO vazio.', itemPos);
    }

    if (!observacao) {
      addIssue('warning', file, 'Campo OBSERVACAO vazio.', itemPos);
    }
  });
}

function printReport() {
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  console.log('=== Validacao de dados: meu-guia-prescricoes ===');

  if (issues.length === 0) {
    console.log('Sem erros ou avisos.');
    return 0;
  }

  for (const issue of issues) {
    const where = issue.index ? `${issue.file} [item ${issue.index}]` : issue.file;
    const tag = issue.level === 'error' ? 'ERRO' : 'AVISO';
    console.log(`[${tag}] ${where}: ${issue.message}`);
  }

  console.log('');
  console.log(`Resumo: ${errors.length} erro(s), ${warnings.length} aviso(s).`);

  if (errors.length > 0) {
    return 1;
  }

  if (strictWarnings && warnings.length > 0) {
    console.log('Modo estrito ativo: avisos contam como falha.');
    return 2;
  }

  return 0;
}

const prescricoesData = readJson(prescricoesPath, 'data/prescricoes.json');
const remumeData = readJson(remumePath, 'data/remume-sp.json');

if (prescricoesData) {
  validatePrescricoes(prescricoesData);
}

if (remumeData) {
  validateRemume(remumeData);
}

process.exitCode = printReport();
