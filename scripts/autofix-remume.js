#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const remumePath = path.join(rootDir, 'data', 'remume-sp.json');

const KNOWN_PREFIXES = [
  'NESTAS UNIDADES ',
  'HOSPITAL DIA ',
  'HOSPITAL DIA / AMAE/ AE E EM UNIDADES DE REFERÊNCIA EM OFTALMOLOGIA ',
  'SAE/IST/AIDS, CENTRO DE ESPECIALIDADES ODONTOLÓGICAS, CASA SER, HOSPITAL DIA/ AMAE/ AE ',
  'REFERÊNCIA - EXCLUSIVO PARA TRATAMENTO DE ESQUEMAS ESPECIAIS DE TB/MNT ',
  'REFERENCIA - EXCLUSIVO PARA TRATAMENTO DE ESQUEMAS ESPECIAIS DE TB/MNT ',
  'REFERÊNCIA PARA O TRATAMENTO DA HANSENÍASE ',
  'REFERENCIA PARA O TRATAMENTO DA HANSENIASE ',
  'REFERÊNCIA - EXCLUSIVO PARA O TRATAMENTO DE TB PARA PACIENTES EM USO DE INIBIDORES DE PROTEASE; ',
  'REFERÊNCIA - EXCLUSIVO PARA TRATAMENTO DE TB EM CRIANÇAS; COBERTURA DE FOCO DE MENINGITES BACTERIANAS E DOENCA MININGOCÓCCICA; TRATAMENTO DA INFECCÇÃO LATENTE DA TUBERCULOSE (ILTB); TRATAMENTO DE ESQUEMAS ESPECIAIS DE TB ',
  'REFERÊNCIA - EXCLUSIVO PARA COBERTURA DE FOCO DE MENINGITES BACTERIANAS E DOENÇA MENINGOCÓCCICA; HIDRADENITE SUPURATIVA; TRATAMENTO DA INFECCÇÃO LATENTE DA TUBERCULOSE (ILTB); TRATAMENTO DE ESQUEMAS ESPECIAIS DE TB/ MNT ',
  'REFERÊNCIA - EXCLUSIVO PARA TRATAMENTO DE TUBERCULOSE EM CRIANÇAS ',
  'REFERÊNCIA - EXCLUSIVO PARA TRATAMENTO DA INFECÇÃO LATENTE DE TUBERCULOSE (ILTB) '
];

function asText(value) {
  return String(value == null ? '' : value).trim();
}

function collapseSpaces(value) {
  return asText(value).replace(/\s+/g, ' ');
}

function extractPrefix(nome) {
  for (const prefix of KNOWN_PREFIXES) {
    if (nome.startsWith(prefix)) {
      return {
        prefix,
        cleanName: nome.slice(prefix.length).trim()
      };
    }
  }

  return null;
}

function ensureObservationHasPrefix(observacao, prefix) {
  if (!prefix) {
    return observacao;
  }

  const normalizedPrefix = collapseSpaces(prefix).replace(/\s+$/, '');
  const normalizedObs = collapseSpaces(observacao);

  if (!normalizedObs) {
    return `Contexto de dispensacao: ${normalizedPrefix}`;
  }

  if (normalizedObs.toLowerCase().includes(normalizedPrefix.toLowerCase())) {
    return observacao;
  }

  return `${observacao.trim()} | Contexto de dispensacao: ${normalizedPrefix}`;
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
  let cleanedNames = 0;
  let normalizedFields = 0;

  const updated = data.map((item) => {
    const record = { ...item };

    const originalNome = asText(record.NOME);
    const originalObs = asText(record.OBSERVACAO);
    const originalGrupo = asText(record.GRUPO);
    const originalCategoria = asText(record.CATEGORIA);
    const originalApresentacao = asText(record.APRESENTACAO);

    const nomeCollapsed = collapseSpaces(originalNome);
    const obsCollapsed = collapseSpaces(originalObs);
    const grupoCollapsed = collapseSpaces(originalGrupo);
    const categoriaCollapsed = collapseSpaces(originalCategoria);
    const apresentacaoCollapsed = collapseSpaces(originalApresentacao);

    if (
      nomeCollapsed !== originalNome ||
      obsCollapsed !== originalObs ||
      grupoCollapsed !== originalGrupo ||
      categoriaCollapsed !== originalCategoria ||
      apresentacaoCollapsed !== originalApresentacao
    ) {
      normalizedFields += 1;
    }

    record.NOME = nomeCollapsed;
    record.OBSERVACAO = obsCollapsed;
    record.GRUPO = grupoCollapsed;
    record.CATEGORIA = categoriaCollapsed;
    record.APRESENTACAO = apresentacaoCollapsed;

    const prefixResult = extractPrefix(record.NOME);
    if (prefixResult && prefixResult.cleanName) {
      record.NOME = prefixResult.cleanName;
      record.OBSERVACAO = ensureObservationHasPrefix(record.OBSERVACAO, prefixResult.prefix);
      cleanedNames += 1;
    }

    if (
      record.NOME !== originalNome ||
      record.OBSERVACAO !== originalObs ||
      record.GRUPO !== originalGrupo ||
      record.CATEGORIA !== originalCategoria ||
      record.APRESENTACAO !== originalApresentacao
    ) {
      changed += 1;
    }

    return record;
  });

  fs.writeFileSync(remumePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');

  console.log('=== Autofix REMUME concluido ===');
  console.log(`Registros alterados: ${changed}`);
  console.log(`Nomes limpos (prefixo removido): ${cleanedNames}`);
  console.log(`Registros com normalizacao de espacos: ${normalizedFields}`);
}

main();
