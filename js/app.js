/**
 * Guia de Emergência — Aplicação Principal
 * Renderiza condições clínicas, busca, dark mode, acessibilidade
 * Suporta: Sala Vermelha (críticos) + Condutas de Porta (leve/moderado)
 */

(function () {
  'use strict';

  // =============================================
  // STATE
  // =============================================
  let condicoes = [];
  let condicaoAtual = null;
  let buscaTermo = '';
  let secaoAtual = 'sala-vermelha';
  let dadosPorSecao = {};

  // =============================================
  // DOM ELEMENTS
  // =============================================
  const loadingOverlay = document.getElementById('loading-overlay');
  const sidebarNav = document.getElementById('sidebar-nav');
  const navEmpty = document.getElementById('nav-empty');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const contentPlaceholder = document.getElementById('content-placeholder');
  const contentDisplay = document.getElementById('content-display');
  const conditionTitle = document.getElementById('condition-title');
  const conditionCid = document.getElementById('condition-cid');
  const conditionSections = document.getElementById('condition-sections');
  const copyBtn = document.getElementById('copy-btn');
  const exportBtn = document.getElementById('export-btn');
  const printBtn = document.getElementById('print-btn');
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIconMoon = document.getElementById('theme-icon-moon');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const tabBtnSala = document.getElementById('tab-btn-sala');
  const tabBtnPorta = document.getElementById('tab-btn-porta');
  const tabBtnVaso = document.getElementById('tab-btn-vaso');
  const backToTopBtn = document.getElementById('back-to-top');

  // =============================================
  // UTILS
  // =============================================
  const normalizeForSearch = (text) =>
    (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const showLoading = (show) => {
    loadingOverlay.style.display = show ? 'flex' : 'none';
    loadingOverlay.setAttribute('aria-hidden', !show);
  };

  const closeSidebarMobile = () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
      sidebarOverlay.setAttribute('aria-hidden', 'true');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  };

  // =============================================
  // DARK MODE
  // =============================================
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      themeIconMoon.style.display = 'none';
      themeIconSun.style.display = 'block';
      themeToggle.setAttribute('aria-label', 'Alternar modo claro');
    } else {
      themeIconMoon.style.display = 'block';
      themeIconSun.style.display = 'none';
      themeToggle.setAttribute('aria-label', 'Alternar modo escuro');
    }
    try { localStorage.setItem('guia-theme', theme); } catch (e) { /* noop */ }
  };

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  };

  const initTheme = () => {
    try {
      const saved = localStorage.getItem('guia-theme');
      if (saved === 'dark' || saved === 'light') { applyTheme(saved); return; }
    } catch (e) { /* noop */ }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    }
  };

  // =============================================
  // SECTION TABS
  // =============================================
  const switchSection = (sectionId) => {
    if (sectionId === secaoAtual && condicoes.length > 0) return;
    secaoAtual = sectionId;
    condicoes = dadosPorSecao[sectionId] || [];
    condicaoAtual = null;

    // Update tab UI
    [tabBtnSala, tabBtnPorta, tabBtnVaso].forEach((tab) => {
      const isActive = tab.dataset.section === sectionId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
    });

    // Update sidebar title
    const sectionLabels = {
      'sala-vermelha': 'Condições críticas — Sala Vermelha',
      'condutas-porta': 'Condutas de Porta — Leve/Moderado',
      'vasoativa-sedacao': 'Vasoativa e Sedoanalgesia — Diluições e Doses'
    };
    sidebar.setAttribute('aria-label', sectionLabels[sectionId] || 'Condições clínicas');

    // Reset content
    contentPlaceholder.hidden = false;
    contentDisplay.hidden = true;

    // Re-render sidebar
    renderSidebar(condicoes);

    // Update placeholder text
    const placeholder = document.getElementById('content-placeholder');
    if (placeholder) {
      const h2 = placeholder.querySelector('h2');
      const p = placeholder.querySelector('p');
      if (sectionId === 'sala-vermelha') {
        if (h2) h2.textContent = 'Guia Sala Vermelha';
        if (p) p.textContent = 'Selecione uma condição clínica no menu lateral para visualizar conduta, medicamentos e alvos terapêuticos.';
      } else if (sectionId === 'condutas-porta') {
        if (h2) h2.textContent = 'Condutas de Porta';
        if (p) p.textContent = 'Selecione uma condição para ver receituário, orientações e critérios de alta.';
      } else {
        if (h2) h2.textContent = 'Vasoativa / Sedoanalgesia';
        if (p) p.textContent = 'Selecione um fármaco para ver diluição, concentração, dose e orientações de enfermagem.';
      }
    }

    // Clear search
    searchInput.value = '';
    buscaTermo = '';
    _lastSearchTerm = '';
    clearSearchBtn.classList.remove('visible');

    try { localStorage.setItem('guia-secao', sectionId); } catch (e) { /* noop */ }
  };

  // =============================================
  // SIDEBAR RENDERING
  // =============================================
  const sectionLabels = {
    'sala-vermelha': 'Sala Vermelha',
    'condutas-porta': 'Porta',
    'vasoativa-sedacao': 'Vasoativa'
  };

  const renderSidebar = (items, showSectionBadge) => {
    sidebarNav.innerHTML = '';

    if (items.length === 0) {
      navEmpty.textContent = 'Nenhuma condição encontrada.';
      navEmpty.hidden = false;
      return;
    }

    navEmpty.hidden = true;
    const fragment = document.createDocumentFragment();

    // Group items by categoria
    const groups = new Map();
    items.forEach((cond) => {
      const cat = cond.categoria || '';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(cond);
    });

    const hasCategories = groups.size > 1 || (groups.size === 1 && groups.keys().next().value !== '');

    groups.forEach((catItems, catName) => {
      // Category header (only if there are multiple categories or a named one)
      if (hasCategories && catName) {
        const header = document.createElement('li');
        header.className = 'nav-category';
        header.setAttribute('role', 'presentation');
        header.textContent = catName;
        fragment.appendChild(header);
      }

      catItems.forEach((cond) => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.setAttribute('role', 'listitem');

        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.dataset.id = cond.id;
        btn.dataset.categoria = catName || '';
        btn.dataset.section = cond._section || secaoAtual;
        btn.setAttribute('role', 'button');
        if (condicaoAtual && condicaoAtual.id === cond.id) {
          btn.classList.add('active');
          btn.setAttribute('aria-current', 'true');
        }

        // Build search terms
        let searchTerms = [cond.titulo, cond.cid, catName];
        if (cond.apresentacao) searchTerms.push(cond.apresentacao);
        if (cond.sinonimos) searchTerms.push(cond.sinonimos);
        if (cond.fontes) searchTerms.push(cond.fontes.join(' '));
        if (cond.secoes) {
          cond.secoes.forEach((s) => {
            if (s.tipo === 'tabela_farmacos' && s.dados) {
              s.dados.forEach((d) => searchTerms.push(d.nome));
            }
            if (s.itens) {
              s.itens.forEach((item) => searchTerms.push(item));
            }
            if (s.orientacoes) {
              s.orientacoes.forEach((o) => searchTerms.push(o));
            }
            if (s.escores) {
              s.escores.forEach((e) => {
                searchTerms.push(e.nome);
                if (e.descricao) searchTerms.push(e.descricao);
              });
            }
            if (s.causas_reversiveis) {
              const cr = s.causas_reversiveis;
              if (cr.cinco_h) cr.cinco_h.forEach((h) => searchTerms.push(h.join(' ')));
              if (cr.cinco_t) cr.cinco_t.forEach((t) => searchTerms.push(t.join(' ')));
            }
          });
        }
        btn.dataset.searchTerm = normalizeForSearch(searchTerms.join(' '));

        // Icon with condition color
        const iconSpan = document.createElement('span');
        iconSpan.className = 'nav-icon';
        iconSpan.style.background = cond.cor;
        iconSpan.setAttribute('aria-hidden', 'true');
        const icon = document.createElement('ion-icon');
        icon.setAttribute('name', cond.icon);
        iconSpan.appendChild(icon);

        // Text info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'nav-info';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'nav-title';
        titleSpan.textContent = cond.titulo;
        infoDiv.appendChild(titleSpan);

        const metaDiv = document.createElement('span');
        metaDiv.className = 'nav-meta';
        const metaParts = [];
        if (cond.cid) metaParts.push(`CID: ${cond.cid}`);
        if (showSectionBadge && cond._section) {
          metaParts.push(sectionLabels[cond._section] || cond._section);
        }
        metaDiv.textContent = metaParts.join(' · ');
        infoDiv.appendChild(metaDiv);

        btn.appendChild(iconSpan);
        btn.appendChild(infoDiv);
        li.appendChild(btn);
        fragment.appendChild(li);
      });
    });

    sidebarNav.appendChild(fragment);
  };

  let _lastSearchTerm = '';

  const filterSidebar = (term) => {
    const normalizedTerm = normalizeForSearch(term);

    // Cross-section search: when searching, combine ALL sections
    if (normalizedTerm && dadosPorSecao['sala-vermelha']) {
      if (_lastSearchTerm !== normalizedTerm) {
        _lastSearchTerm = normalizedTerm;
        const allItems = [];
        Object.entries(dadosPorSecao).forEach(([secId, items]) => {
          if (Array.isArray(items)) {
            items.forEach((c) => allItems.push({ ...c, _section: secId }));
          }
        });
        renderSidebar(allItems, true);
      }
    } else if (!normalizedTerm && _lastSearchTerm) {
      _lastSearchTerm = '';
      renderSidebar(condicoes, false);
      navEmpty.hidden = true;
      return;
    }

    const buttons = sidebarNav.querySelectorAll('.nav-btn');
    let visibleCount = 0;

    buttons.forEach((btn) => {
      const searchTerm = btn.dataset.searchTerm || '';
      const matches = !normalizedTerm || searchTerm.includes(normalizedTerm);
      btn.parentElement.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    // Show/hide category headers based on visible items
    const categories = sidebarNav.querySelectorAll('.nav-category');
    categories.forEach((cat) => {
      let next = cat.nextElementSibling;
      let hasVisible = false;
      while (next && !next.classList.contains('nav-category')) {
        if (next.style.display !== 'none') hasVisible = true;
        next = next.nextElementSibling;
      }
      cat.style.display = hasVisible ? '' : 'none';
    });

    const totalItems = normalizedTerm
      ? Object.values(dadosPorSecao).reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0)
      : condicoes.length;
    navEmpty.hidden = visibleCount > 0 || totalItems === 0;
    if (visibleCount === 0 && totalItems > 0) {
      navEmpty.textContent = 'Nenhum resultado encontrado.';
    }
  };

  // =============================================
  // CONTENT RENDERING
  // =============================================
  const renderMarkdownInline = (text) => {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  };

  const renderConduta = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="list-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const ol = document.createElement('ol');
    ol.className = 'conduta-steps';
    ol.setAttribute('role', 'list');

    secao.itens.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'conduta-step';
      li.innerHTML = renderMarkdownInline(item);
      ol.appendChild(li);
    });

    card.appendChild(ol);
    return card;
  };

  const renderReceituario = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="medical-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const ol = document.createElement('ol');
    ol.className = 'conduta-steps';
    ol.setAttribute('role', 'list');

    secao.itens.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'conduta-step';
      li.innerHTML = renderMarkdownInline(item);
      ol.appendChild(li);
    });

    card.appendChild(ol);

    // Render orientações if present
    if (secao.orientacoes && secao.orientacoes.length > 0) {
      const orTitle = document.createElement('h3');
      orTitle.className = 'section-subtitle';
      orTitle.innerHTML = `<ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon> Orientações`;
      card.appendChild(orTitle);

      const ul = document.createElement('ul');
      ul.className = 'orientacoes-list';
      ul.setAttribute('role', 'list');

      secao.orientacoes.forEach((item) => {
        const li = document.createElement('li');
        li.innerHTML = renderMarkdownInline(item);
        ul.appendChild(li);
      });

      card.appendChild(ul);
    }

    return card;
  };

  const renderDiluicao = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card section-card--vaso';

    const title = document.createElement('h2');
    title.className = 'section-title section-title--vaso';
    title.innerHTML = `<ion-icon name="flask-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'vaso-list';
    secao.itens.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = renderMarkdownInline(item);
      ul.appendChild(li);
    });

    card.appendChild(ul);
    return card;
  };

  const renderConcentracao = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card section-card--vaso';

    const title = document.createElement('h2');
    title.className = 'section-title section-title--vaso';
    title.innerHTML = `<ion-icon name="analytics-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'vaso-list';
    secao.itens.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = renderMarkdownInline(item);
      ul.appendChild(li);
    });

    card.appendChild(ul);
    return card;
  };

  const renderDose = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card section-card--dose';

    const title = document.createElement('h2');
    title.className = 'section-title section-title--dose';
    title.innerHTML = `<ion-icon name="speedometer-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'dose-list';
    secao.itens.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = renderMarkdownInline(item);
      ul.appendChild(li);
    });

    card.appendChild(ul);
    return card;
  };

  const renderTabelaFarmacos = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="medical-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const wrapper = document.createElement('div');
    wrapper.className = 'drug-table-wrapper';

    const table = document.createElement('table');
    table.className = 'drug-table';
    table.setAttribute('role', 'table');

    const caption = document.createElement('caption');
    caption.className = 'sr-only';
    caption.textContent = secao.titulo;
    table.appendChild(caption);

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    secao.colunas.forEach((col) => {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.textContent = col;
      headerRow.appendChild(th);
    });
    const thSus = document.createElement('th');
    thSus.setAttribute('scope', 'col');
    thSus.textContent = 'Disponibilidade';
    headerRow.appendChild(thSus);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    secao.dados.forEach((dado) => {
      const row = document.createElement('tr');

      const tdNome = document.createElement('td');
      const nomeDiv = document.createElement('div');
      nomeDiv.className = 'drug-name';
      nomeDiv.textContent = dado.nome;
      tdNome.appendChild(nomeDiv);
      row.appendChild(tdNome);

      const tdApresentacao = document.createElement('td');
      tdApresentacao.textContent = dado.apresentacao;
      row.appendChild(tdApresentacao);

      const tdDiluicao = document.createElement('td');
      tdDiluicao.textContent = dado.diluicao;
      row.appendChild(tdDiluicao);

      const tdDose = document.createElement('td');
      tdDose.innerHTML = renderMarkdownInline(dado.dose);
      row.appendChild(tdDose);

      const tdSus = document.createElement('td');
      if (dado.sus) {
        const badge = document.createElement('span');
        badge.className = `badge badge-${dado.sus}`;
        const labels = {
          rename: 'RENAME', ceaf: 'CEAF', basico: 'Básico', comercial: 'Comercial'
        };
        badge.textContent = labels[dado.sus] || dado.sus;
        badge.setAttribute('aria-label', `Disponibilidade SUS: ${labels[dado.sus] || dado.sus}`);
        tdSus.appendChild(badge);
      }
      row.appendChild(tdSus);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    wrapper.appendChild(table);
    card.appendChild(wrapper);
    return card;
  };

  const renderEscoreTable = (escore) => {
    const div = document.createElement('div');
    div.className = 'score-card';

    const name = document.createElement('div');
    name.className = 'score-name';
    name.textContent = escore.nome;
    div.appendChild(name);

    if (escore.descricao) {
      const desc = document.createElement('div');
      desc.className = 'score-desc';
      desc.textContent = escore.descricao;
      div.appendChild(desc);
    }

    const table = document.createElement('table');
    table.className = 'score-table';
    table.setAttribute('role', 'table');

    const thead = document.createElement('thead');
    const hRow = document.createElement('tr');
    escore.colunas.forEach((col) => {
      const th = document.createElement('th');
      th.setAttribute('scope', 'col');
      th.textContent = col;
      hRow.appendChild(th);
    });
    thead.appendChild(hRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    escore.dados.forEach((row) => {
      const tr = document.createElement('tr');
      row.forEach((cell, i) => {
        const td = document.createElement('td');
        if (i === 0) td.setAttribute('scope', 'row');
        td.innerHTML = renderMarkdownInline(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    div.appendChild(table);
    return div;
  };

  const renderTargets = (alvos) => {
    if (!alvos || alvos.length === 0) return null;

    const grid = document.createElement('div');
    grid.className = 'targets-grid';
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-label', 'Alvos terapêuticos');

    alvos.forEach(([label, value]) => {
      const item = document.createElement('div');
      item.className = 'target-item';
      item.setAttribute('role', 'listitem');

      const labelEl = document.createElement('span');
      labelEl.className = 'target-label';
      labelEl.textContent = label;

      const valueEl = document.createElement('span');
      valueEl.className = 'target-value';
      valueEl.textContent = value;

      item.appendChild(labelEl);
      item.appendChild(valueEl);
      grid.appendChild(item);
    });

    return grid;
  };

  const renderEscoreSection = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="analytics-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    if (secao.escores) {
      secao.escores.forEach((escore) => {
        card.appendChild(renderEscoreTable(escore));
        const calcEl = renderCalculadoraEscore(escore);
        if (calcEl) card.appendChild(calcEl);
      });
    }

    if (secao.alvos) {
      const targetsGrid = renderTargets(secao.alvos);
      if (targetsGrid) {
        const alvoTitle = document.createElement('h3');
        alvoTitle.className = 'score-name';
        alvoTitle.style.marginTop = '16px';
        alvoTitle.textContent = 'Alvos Terapêuticos';
        card.appendChild(alvoTitle);
        card.appendChild(targetsGrid);
      }
    }

    return card;
  };

  const renderCalculadoraEscore = (escore) => {
    const calc = escore.calculadora_escore;
    if (!calc) return null;

    const card = document.createElement('div');
    card.className = 'section-card section-card--escore-calc';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', `Calculadora: ${escore.nome}`);

    const title = document.createElement('h3');
    title.className = 'section-title section-title--escore-calc';
    title.innerHTML = `<ion-icon name="calculator-outline" aria-hidden="true"></ion-icon> Calculadora: ${escore.nome}`;
    card.appendChild(title);

    const form = document.createElement('div');
    form.className = 'escore-calc-form';

    calc.inputs.forEach((input) => {
      const opt = document.createElement('label');
      opt.className = 'escore-calc-option';

      const inputEl = document.createElement('input');
      inputEl.type = input.tipo;
      inputEl.name = input.grupo
        ? `escore-${escore.nome.replace(/\s/g, '-')}-${input.grupo}`
        : `escore-${escore.nome.replace(/\s/g, '-')}`;
      inputEl.value = input.pontos;
      inputEl.className = 'escore-calc-input';
      inputEl.dataset.inputId = input.id;
      if (input.padrao) inputEl.checked = true;

      const text = document.createElement('span');
      text.className = 'escore-calc-label';
      text.textContent = input.label;

      opt.appendChild(inputEl);
      opt.appendChild(text);
      form.appendChild(opt);
    });

    card.appendChild(form);

    if (calc.nota) {
      const nota = document.createElement('div');
      nota.className = 'escore-calc-nota';
      nota.innerHTML = `<ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon> ${calc.nota}`;
      card.appendChild(nota);
    }

    const resultBox = document.createElement('div');
    resultBox.className = 'escore-calc-result';
    resultBox.setAttribute('role', 'status');
    resultBox.setAttribute('aria-live', 'polite');
    card.appendChild(resultBox);

    const calculate = () => {
      let total = 0;
      const inputs = form.querySelectorAll('.escore-calc-input');

      if (calc.tipo === 'contagem') {
        inputs.forEach((inp) => {
          if (inp.checked) total += parseFloat(inp.value);
        });
      } else {
        inputs.forEach((inp) => {
          if (inp.checked) total = parseFloat(inp.value);
        });
      }

      let interp = null;
      for (const i of calc.resultado.interpretacoes) {
        if (total >= i.min && total <= i.max) {
          interp = i;
          break;
        }
      }

      resultBox.innerHTML = '';
      if (calc.tipo === 'contagem' || inputs.length > 0) {
        const valueEl = document.createElement('div');
        valueEl.className = 'escore-calc-value';
        valueEl.innerHTML = `<span class="escore-calc-number">${total}</span> <span class="escore-calc-score-name">${calc.resultado.titulo}</span>`;
        resultBox.appendChild(valueEl);
      }

      if (interp) {
        const interpEl = document.createElement('div');
        interpEl.className = 'escore-calc-interpretation';
        interpEl.style.borderLeftColor = interp.cor;
        interpEl.innerHTML = `<strong style="color:${interp.cor}">${interp.label}</strong>`;
        resultBox.appendChild(interpEl);
      } else {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'escore-calc-interpretation escore-calc-empty';
        emptyEl.textContent = 'Selecione os critérios';
        resultBox.appendChild(emptyEl);
      }
    };

    form.addEventListener('change', calculate);
    calculate();

    return card;
  };

  const renderCausasReversiveis = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="warning-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'causes-grid';

    if (secao.cinco_h) {
      const col = document.createElement('div');
      col.className = 'causes-column';
      const h4 = document.createElement('h4');
      h4.textContent = '5H';
      col.appendChild(h4);
      secao.cinco_h.forEach(([causa, conduta]) => {
        const item = document.createElement('div');
        item.className = 'cause-item';
        item.innerHTML = `<strong>${causa}</strong> ${conduta}`;
        col.appendChild(item);
      });
      grid.appendChild(col);
    }

    if (secao.cinco_t) {
      const col = document.createElement('div');
      col.className = 'causes-column';
      const h4 = document.createElement('h4');
      h4.textContent = '5T';
      col.appendChild(h4);
      secao.cinco_t.forEach(([causa, conduta]) => {
        const item = document.createElement('div');
        item.className = 'cause-item';
        item.innerHTML = `<strong>${causa}</strong> ${conduta}`;
        col.appendChild(item);
      });
      grid.appendChild(col);
    }

    card.appendChild(grid);
    return card;
  };

  // =============================================
  // CALCULADORA DE DOSES (Vasoativa)
  // =============================================
  const calcMLH = (dose, peso, conc, unidade) => {
    switch (unidade) {
      case 'mcg/kg/min': return (dose * peso * 60) / conc;
      case 'mcg/kg/h': return (dose * peso) / conc;
      case 'mg/kg/h': return (dose * peso) / conc;
      case 'mcg/min': return (dose * 60) / conc;
      case 'mcg/h': return dose / conc;
      case 'mg/h': return dose / conc;
      case 'UI/min': return (dose * 60) / conc;
      default: return 0;
    }
  };

  const calcDoseFromMLH = (mlh, peso, conc, unidade) => {
    switch (unidade) {
      case 'mcg/kg/min': return (mlh * conc) / (peso * 60);
      case 'mcg/kg/h': return (mlh * conc) / peso;
      case 'mg/kg/h': return (mlh * conc) / peso;
      case 'mcg/min': return (mlh * conc) / 60;
      case 'mcg/h': return mlh * conc;
      case 'mg/h': return mlh * conc;
      case 'UI/min': return (mlh * conc) / 60;
      default: return 0;
    }
  };

  const calcAbsoluto = (dose, peso, unidade) => {
    switch (unidade) {
      case 'mcg/kg/min': return dose * peso;
      case 'mcg/kg/h': return dose * peso;
      case 'mg/kg/h': return dose * peso;
      default: return dose;
    }
  };

  const calcUnidadeAbs = (unidade) => {
    switch (unidade) {
      case 'mcg/kg/min': return 'mcg/min';
      case 'mcg/kg/h': return 'mcg/h';
      case 'mg/kg/h': return 'mg/h';
      default: return unidade;
    }
  };

  const fmtNum = (n) => {
    if (n >= 1000) return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    if (n >= 100) return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    if (n >= 10) return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };

  const renderCalculadora = (cond) => {
    const calc = cond.calculadora;
    if (!calc) return null;

    const card = document.createElement('div');
    card.className = 'section-card section-card--calculadora';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'Calculadora de doses');

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="calculator-outline" aria-hidden="true"></ion-icon> Calculadora de Doses`;
    card.appendChild(title);

    // --- Row 1: Peso ---
    const pesoRow = document.createElement('div');
    pesoRow.className = 'calc-input-row';
    const pesoLabel = document.createElement('label');
    pesoLabel.className = 'calc-label';
    pesoLabel.setAttribute('for', 'calc-peso');
    pesoLabel.innerHTML = `<ion-icon name="person-outline" aria-hidden="true"></ion-icon> Peso`;
    const pesoWrap = document.createElement('div');
    pesoWrap.className = 'calc-input-wrap';
    const pesoInput = document.createElement('input');
    pesoInput.type = 'number';
    pesoInput.id = 'calc-peso';
    pesoInput.className = 'calc-input';
    pesoInput.min = '20';
    pesoInput.max = '300';
    pesoInput.step = '1';
    pesoInput.value = '70';
    pesoInput.setAttribute('aria-label', 'Peso do paciente em quilogramas');
    const pesoUnit = document.createElement('span');
    pesoUnit.className = 'calc-unit';
    pesoUnit.textContent = 'kg';
    pesoWrap.appendChild(pesoInput);
    pesoWrap.appendChild(pesoUnit);
    pesoRow.appendChild(pesoLabel);
    pesoRow.appendChild(pesoWrap);
    card.appendChild(pesoRow);

    // --- Row 2: Diluição (select) ---
    const dilRow = document.createElement('div');
    dilRow.className = 'calc-input-row';
    const dilLabel = document.createElement('label');
    dilLabel.className = 'calc-label';
    dilLabel.setAttribute('for', 'calc-diluicao');
    dilLabel.innerHTML = `<ion-icon name="flask-outline" aria-hidden="true"></ion-icon> Diluição`;
    const dilSelect = document.createElement('select');
    dilSelect.id = 'calc-diluicao';
    dilSelect.className = 'calc-select';
    dilSelect.setAttribute('aria-label', 'Diluição preparada');
    calc.diluicoes.forEach((dil, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${dil.rotulo} (${fmtNum(dil.concentracao)} ${calc.concentracao_unidade})`;
      dilSelect.appendChild(opt);
    });
    dilRow.appendChild(dilLabel);
    dilRow.appendChild(dilSelect);
    card.appendChild(dilRow);

    // --- Row 3: Velocimetro (mL/h atual) ---
    const velRow = document.createElement('div');
    velRow.className = 'calc-input-row';
    const velLabel = document.createElement('label');
    velLabel.className = 'calc-label';
    velLabel.setAttribute('for', 'calc-mlh');
    velLabel.innerHTML = `<ion-icon name="speedometer-outline" aria-hidden="true"></ion-icon> Bomba`;
    const velWrap = document.createElement('div');
    velWrap.className = 'calc-input-wrap';
    const velInput = document.createElement('input');
    velInput.type = 'number';
    velInput.id = 'calc-mlh';
    velInput.className = 'calc-input calc-input--mlh';
    velInput.min = '0';
    velInput.max = '500';
    velInput.step = '0.1';
    velInput.value = '5';
    velInput.setAttribute('aria-label', 'Velocidade da bomba de infusão em mL por hora');
    const velUnit = document.createElement('span');
    velUnit.className = 'calc-unit';
    velUnit.textContent = 'mL/h';
    velWrap.appendChild(velInput);
    velWrap.appendChild(velUnit);
    velRow.appendChild(velLabel);
    velRow.appendChild(velWrap);
    card.appendChild(velRow);

    // --- Readout: Dose atual ---
    const readout = document.createElement('div');
    readout.className = 'calc-readout';
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    card.appendChild(readout);

    // --- Referencia table ---
    const refTitle = document.createElement('h3');
    refTitle.className = 'calc-ref-title';
    refTitle.innerHTML = `<ion-icon name="list-outline" aria-hidden="true"></ion-icon> Referência`;
    card.appendChild(refTitle);

    const refContainer = document.createElement('div');
    refContainer.className = 'calc-results';
    card.appendChild(refContainer);

    // --- Recalculate on any change ---
    const renderAll = () => {
      const peso = parseFloat(pesoInput.value) || 70;
      const mlh = parseFloat(velInput.value) || 0;
      const dilIdx = parseInt(dilSelect.value) || 0;
      const dil = calc.diluicoes[dilIdx];

      // Reverse calculation: mL/h → dose
      const doseAtual = calcDoseFromMLH(mlh, peso, dil.concentracao, calc.unidade);
      const absAtual = calcAbsoluto(doseAtual, peso, calc.unidade);

      // Readout
      readout.innerHTML = '';
      if (mlh > 0) {
        const readoutInner = document.createElement('div');
        readoutInner.className = 'calc-readout-inner';

        const doseBig = document.createElement('div');
        doseBig.className = 'calc-readout-dose';
        if (calc.dose_fixa) {
          const valorFixo = typeof calc.dose_fixa === 'number'
            ? calc.dose_fixa
            : (dil.doses && dil.doses[0] ? dil.doses[0].dose_min : doseAtual);
          doseBig.innerHTML = `<span class="calc-readout-value">${fmtNum(valorFixo)}</span> <span class="calc-readout-unit">${calc.unidade} (fixo)</span>`;
        } else {
          doseBig.innerHTML = `<span class="calc-readout-value">${fmtNum(doseAtual)}</span> <span class="calc-readout-unit">${calc.unidade}</span>`;
        }

        const absLine = document.createElement('div');
        absLine.className = 'calc-readout-abs';
        if (!calc.dose_fixa && calc.unidade !== calcUnidadeAbs(calc.unidade)) {
          absLine.textContent = `= ${fmtNum(absAtual)} ${calcUnidadeAbs(calc.unidade)}`;
        } else {
          absLine.innerHTML = `Concentração: <strong>${fmtNum(dil.concentracao)} ${calc.concentracao_unidade}</strong>`;
        }

        readoutInner.appendChild(doseBig);
        readoutInner.appendChild(absLine);
        readout.appendChild(readoutInner);
      } else {
        readout.innerHTML = '<div class="calc-readout-empty">Insira a velocidade da bomba para ver a dose atual</div>';
      }

      // Reference table
      refContainer.innerHTML = '';
      const table = document.createElement('table');
      table.className = 'calc-table';
      table.setAttribute('role', 'table');

      const thead = document.createElement('thead');
      const hRow = document.createElement('tr');
      ['Faixa', calc.unidade, 'mL/h'].forEach((col) => {
        const th = document.createElement('th');
        th.setAttribute('scope', 'col');
        th.textContent = col;
        hRow.appendChild(th);
      });
      thead.appendChild(hRow);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      dil.doses.forEach((dose) => {
        const mlhMin = calcMLH(dose.dose_min, peso, dil.concentracao, calc.unidade);
        const mlhMax = calcMLH(dose.dose_max, peso, dil.concentracao, calc.unidade);

        const tr = document.createElement('tr');

        const tdLabel = document.createElement('td');
        tdLabel.className = 'calc-dose-label';
        tdLabel.textContent = dose.rotulo;
        tr.appendChild(tdLabel);

        const tdDose = document.createElement('td');
        tdDose.className = 'calc-dose-range';
        if (calc.dose_fixa) {
          tdDose.textContent = `${fmtNum(dose.dose_min)} ${calc.unidade}`;
        } else {
          tdDose.textContent = `${fmtNum(dose.dose_min)} – ${fmtNum(dose.dose_max)}`;
        }
        tr.appendChild(tdDose);

        const tdMlh = document.createElement('td');
        tdMlh.className = 'calc-mlh';
        if (mlhMin === mlhMax || calc.dose_fixa) {
          tdMlh.innerHTML = `<strong>${fmtNum(mlhMin)} mL/h</strong>`;
        } else {
          tdMlh.innerHTML = `<strong>${fmtNum(mlhMin)} – ${fmtNum(mlhMax)} mL/h</strong>`;
        }
        tr.appendChild(tdMlh);

        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      refContainer.appendChild(table);
    };

    pesoInput.addEventListener('input', renderAll);
    velInput.addEventListener('input', renderAll);
    dilSelect.addEventListener('change', renderAll);
    renderAll();

    return card;
  };

  const renderOrientacoesEnfermagem = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card section-card--orientacoes';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const ul = document.createElement('ul');
    ul.className = 'orientacoes-list';
    ul.setAttribute('role', 'list');

    secao.itens.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = renderMarkdownInline(item);
      ul.appendChild(li);
    });

    card.appendChild(ul);
    return card;
  };

  const renderUrgencia = (secao) => {
    const card = document.createElement('div');
    card.className = 'section-card';
    card.style.borderLeftColor = 'var(--info)';
    card.style.borderLeftWidth = '4px';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.innerHTML = `<ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon> ${secao.titulo}`;
    card.appendChild(title);

    const ul = document.createElement('ul');
    ul.style.paddingLeft = '20px';
    secao.itens.forEach((item) => {
      const li = document.createElement('li');
      li.style.marginBottom = '8px';
      li.innerHTML = renderMarkdownInline(item);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    return card;
  };

  const renderCondition = (cond) => {
    conditionTitle.textContent = cond.titulo;
    conditionCid.textContent = cond.cid ? `CID-10: ${cond.cid}` : '';
    conditionCid.style.display = cond.cid ? '' : 'none';

    conditionSections.innerHTML = '';

    // Drug header card for vasoativa section
    if (secaoAtual === 'vasoativa-sedacao' && (cond.apresentacao || cond.sinonimos)) {
      const headerCard = document.createElement('div');
      headerCard.className = 'section-card section-card--drug-header';
      headerCard.style.borderLeftColor = cond.cor || 'var(--brand)';
      headerCard.style.borderLeftWidth = '4px';

      const drugName = document.createElement('h2');
      drugName.className = 'drug-header-name';
      drugName.textContent = cond.titulo;
      headerCard.appendChild(drugName);

      if (cond.apresentacao) {
        const pres = document.createElement('div');
        pres.className = 'drug-header-detail';
        pres.innerHTML = `<strong>Apresentação:</strong> ${cond.apresentacao}`;
        headerCard.appendChild(pres);
      }

      if (cond.sinonimos) {
        const sin = document.createElement('div');
        sin.className = 'drug-header-detail';
        sin.innerHTML = `<strong>Nomes comerciais:</strong> ${cond.sinonimos}`;
        headerCard.appendChild(sin);
      }

      conditionSections.appendChild(headerCard);

      // Add dose calculator
      const calcEl = renderCalculadora(cond);
      if (calcEl) conditionSections.appendChild(calcEl);
    }

    cond.secoes.forEach((secao) => {
      let el;
      switch (secao.tipo) {
        case 'conduta':
          el = renderConduta(secao);
          break;
        case 'receituario':
          el = renderReceituario(secao);
          break;
        case 'diluicao':
          el = renderDiluicao(secao);
          break;
        case 'concentracao':
          el = renderConcentracao(secao);
          break;
        case 'dose':
          el = renderDose(secao);
          break;
        case 'tabela_farmacos':
          el = renderTabelaFarmacos(secao);
          break;
        case 'escores':
          el = renderEscoreSection(secao);
          break;
        case 'causas_reversiveis':
          el = renderCausasReversiveis(secao);
          break;
        case 'orientacoes':
          el = renderOrientacoesEnfermagem(secao);
          break;
        case 'urgencia':
          el = renderUrgencia(secao);
          break;
        default:
          console.warn('Tipo de seção desconhecido:', secao.tipo);
          return;
      }
      if (el) conditionSections.appendChild(el);
    });

    // Render fontes (source citations)
    if (cond.fontes && cond.fontes.length > 0) {
      const fontesCard = document.createElement('div');
      fontesCard.className = 'section-card section-card--fontes';

      const fontesTitle = document.createElement('h2');
      fontesTitle.className = 'section-title section-title--fontes';
      fontesTitle.innerHTML = `<ion-icon name="book-outline" aria-hidden="true"></ion-icon> Fontes`;
      fontesCard.appendChild(fontesTitle);

      const fontesList = document.createElement('ul');
      fontesList.className = 'fontes-list';
      fontesList.setAttribute('role', 'list');
      fontesList.setAttribute('aria-label', 'Fontes de referência');

      cond.fontes.forEach((fonte) => {
        const li = document.createElement('li');
        li.className = 'fonte-item';
        li.textContent = fonte;
        fontesList.appendChild(li);
      });

      fontesCard.appendChild(fontesList);
      conditionSections.appendChild(fontesCard);
    }

    contentPlaceholder.hidden = true;
    contentDisplay.hidden = false;

    // Update active nav
    sidebarNav.querySelectorAll('.nav-btn').forEach((btn) => {
      const isActive = btn.dataset.id === cond.id;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  // =============================================
  // CONDITION SELECTION
  // =============================================
  const selectCondition = (id) => {
    // Find the condition in current section or all sections
    let cond = condicoes.find((c) => c.id === id);

    // If not found in current section, search all sections and switch
    if (!cond) {
      for (const [secId, items] of Object.entries(dadosPorSecao)) {
        if (Array.isArray(items)) {
          const found = items.find((c) => c.id === id);
          if (found) {
            switchSection(secId);
            cond = condicoes.find((c) => c.id === id);
            break;
          }
        }
      }
    }

    if (!cond) return;
    condicaoAtual = cond;
    renderCondition(cond);
    closeSidebarMobile();

    // Scroll content to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const main = document.getElementById('conteudo-principal');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      localStorage.setItem('guia-condicao', id);
    } catch (e) { /* noop */ }
  };

  // =============================================
  // COPY / EXPORT / PRINT
  // =============================================
  const buildPlainText = () => {
    if (!condicaoAtual) return '';
    const lines = [];
    lines.push(condicaoAtual.titulo);
    if (condicaoAtual.cid) lines.push(`CID-10: ${condicaoAtual.cid}`);
    lines.push('');

    condicaoAtual.secoes.forEach((secao) => {
      lines.push(`--- ${secao.titulo} ---`);
      lines.push('');

      if (secao.tipo === 'conduta' || secao.tipo === 'receituario' || secao.tipo === 'diluicao' || secao.tipo === 'concentracao' || secao.tipo === 'dose') {
        secao.itens.forEach((item, i) => {
          lines.push(`${i + 1}. ${item.replace(/\*\*/g, '')}`);
        });
        if (secao.orientacoes && secao.orientacoes.length > 0) {
          lines.push('');
          lines.push('--- Orientações ---');
          secao.orientacoes.forEach((item) => {
            lines.push(`- ${item.replace(/\*\*/g, '')}`);
          });
        }
      } else if (secao.tipo === 'tabela_farmacos') {
        lines.push(secao.colunas.join(' | '));
        lines.push(secao.colunas.map(() => '---').join(' | '));
        secao.dados.forEach((dado) => {
          const susLabel = { rename: 'RENAME', ceaf: 'CEAF', basico: 'Básico', comercial: 'Comercial' }[dado.sus] || '';
          lines.push(`${dado.nome} | ${dado.apresentacao} | ${dado.diluicao} | ${dado.dose} | ${susLabel}`);
        });
      } else if (secao.tipo === 'escores') {
        if (secao.escores) {
          secao.escores.forEach((escore) => {
            lines.push(`  ${escore.nome}:`);
            if (escore.descricao) lines.push(`  ${escore.descricao}`);
            escore.dados.forEach((row) => {
              lines.push(`    ${row[0]}: ${row[1]}`);
            });
          });
        }
        if (secao.alvos) {
          lines.push('  Alvos Terapêuticos:');
          secao.alvos.forEach(([label, value]) => {
            lines.push(`    ${label}: ${value}`);
          });
        }
      } else if (secao.tipo === 'causas_reversiveis') {
        lines.push('  5H:');
        if (secao.cinco_h) secao.cinco_h.forEach(([c, v]) => lines.push(`    ${c}: ${v}`));
        lines.push('  5T:');
        if (secao.cinco_t) secao.cinco_t.forEach(([c, v]) => lines.push(`    ${c}: ${v}`));
      } else if (secao.tipo === 'urgencia') {
        secao.itens.forEach((item) => lines.push(`- ${item.replace(/\*\*/g, '')}`));
      } else if (secao.tipo === 'orientacoes') {
        lines.push(`  ${secao.titulo || 'Orientações de Enfermagem'}:`);
        secao.itens.forEach((item) => lines.push(`- ${item.replace(/\*\*/g, '')}`));
      }
      lines.push('');
    });

    lines.push('---');
    lines.push(`Exportado em: ${new Date().toLocaleString('pt-BR')}`);

    if (condicaoAtual.fontes && condicaoAtual.fontes.length > 0) {
      lines.push('');
      lines.push('--- Fontes ---');
      condicaoAtual.fontes.forEach((f) => lines.push(`- ${f}`));
    }

    return lines.join('\n');
  };

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText());
      copyBtn.querySelector('span').textContent = 'Copiado!';
      copyBtn.querySelector('ion-icon').setAttribute('name', 'checkmark-outline');
      setTimeout(() => {
        copyBtn.querySelector('span').textContent = 'Copiar';
        copyBtn.querySelector('ion-icon').setAttribute('name', 'copy-outline');
      }, 2000);
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = buildPlainText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const exportContent = () => {
    const text = buildPlainText();
    if (!text.trim()) return;

    const safeTitle = (condicaoAtual?.titulo || 'guia')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\-\s]/g, '').trim()
      .replace(/\s+/g, '-').toLowerCase();

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle || 'guia'}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const printContent = () => {
    window.print();
  };

  // =============================================
  // EVENT LISTENERS
  // =============================================
  menuBtn.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('open', isOpen);
    sidebarOverlay.setAttribute('aria-hidden', !isOpen);
    menuBtn.setAttribute('aria-expanded', isOpen);
  });

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
    sidebarOverlay.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
  });

  searchInput.addEventListener('input', (e) => {
    buscaTermo = e.target.value;
    filterSidebar(buscaTermo);
    clearSearchBtn.classList.toggle('visible', buscaTermo.length > 0);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    buscaTermo = '';
    filterSidebar('');
    clearSearchBtn.classList.remove('visible');
    searchInput.focus();
  });

  sidebarNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (btn && btn.dataset.id) {
      selectCondition(btn.dataset.id);
    }
  });

  copyBtn.addEventListener('click', copyContent);
  exportBtn.addEventListener('click', exportContent);
  printBtn.addEventListener('click', printContent);
  themeToggle.addEventListener('click', toggleTheme);

  // Section tabs
  tabBtnSala.addEventListener('click', () => switchSection('sala-vermelha'));
  tabBtnPorta.addEventListener('click', () => switchSection('condutas-porta'));
  tabBtnVaso.addEventListener('click', () => switchSection('vasoativa-sedacao'));

  // Back to top button
  if (backToTopBtn) {
    const updateBackToTop = () => {
      if (window.scrollY > 300) {
        backToTopBtn.hidden = false;
        requestAnimationFrame(() => backToTopBtn.classList.add('visible'));
      } else {
        backToTopBtn.classList.remove('visible');
        backToTopBtn.hidden = true;
      }
    };

    window.addEventListener('scroll', updateBackToTop, { passive: true });
    backToTopBtn.addEventListener('click', () => {
      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }

    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      toggleTheme();
    }

    if (e.key === 'Escape' && window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
      sidebarOverlay.setAttribute('aria-hidden', 'true');
      menuBtn.setAttribute('aria-expanded', 'false');
    }

    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.tagName !== 'INPUT') {
      e.preventDefault();
      if (!condicoes || condicoes.length === 0) return;
      const currentIdx = condicaoAtual
        ? condicoes.findIndex((c) => c.id === condicaoAtual.id)
        : -1;
      let nextIdx;
      if (e.key === 'ArrowDown') {
        nextIdx = currentIdx < condicoes.length - 1 ? currentIdx + 1 : 0;
      } else {
        nextIdx = currentIdx > 0 ? currentIdx - 1 : condicoes.length - 1;
      }
      selectCondition(condicoes[nextIdx].id);
    }
  });

  // Ctrl/Cmd+K focuses search
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const cmdK = isMac ? e.metaKey && e.key.toLowerCase() === 'k' : e.ctrlKey && e.key.toLowerCase() === 'k';
    if (cmdK) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // =============================================
  // INIT
  // =============================================
  const init = async () => {
    initTheme();
    showLoading(true);

    try {
      // Load all data files
      const [salaRes, portaRes, vasoRes] = await Promise.all([
        fetch('data/guia-sala-vermelha.json', { cache: 'no-store' }),
        fetch('data/condutas-porta.json', { cache: 'no-store' }),
        fetch('data/vasoativa-sedacao.json', { cache: 'no-store' })
      ]);

      if (!salaRes.ok) throw new Error(`Falha ao carregar Sala Vermelha (${salaRes.status})`);
      dadosPorSecao['sala-vermelha'] = await salaRes.json();

      if (portaRes.ok) {
        dadosPorSecao['condutas-porta'] = await portaRes.json();
      } else {
        dadosPorSecao['condutas-porta'] = [];
      }

      if (vasoRes.ok) {
        dadosPorSecao['vasoativa-sedacao'] = await vasoRes.json();
      } else {
        dadosPorSecao['vasoativa-sedacao'] = [];
      }

      // Restore section from localStorage or default to sala-vermelha
      let savedSection = 'sala-vermelha';
      try {
        const s = localStorage.getItem('guia-secao');
        if (s === 'condutas-porta' || s === 'sala-vermelha' || s === 'vasoativa-sedacao') savedSection = s;
      } catch (e) { /* noop */ }

      switchSection(savedSection);

      // Restore last selected condition
      try {
        const savedId = localStorage.getItem('guia-condicao');
        if (savedId && condicoes.some((c) => c.id === savedId)) {
          selectCondition(savedId);
        }
      } catch (e) { /* noop */ }

    } catch (error) {
      console.error('Erro ao carregar guia:', error);
      navEmpty.textContent = 'Erro ao carregar dados. Use um servidor HTTP local.';
      navEmpty.hidden = false;
    } finally {
      showLoading(false);
    }
  };

  init();
})();
