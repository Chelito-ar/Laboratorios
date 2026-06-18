/* ================================================================
   INTA LABORATORIOS – app.js
   Lógica de búsqueda, filtrado y paginación (client-side)
   ================================================================ */

(function () {
  'use strict';

  // ── CONSTANTES ─────────────────────────────────────────────────
  const PAGE_SIZE = 20;

  // ── ESTADO ─────────────────────────────────────────────────────
  const state = {
    query: '',
    centro: '',
    unidad: '',
    terceros: '',
    sort: 'lab-asc',
    page: 1,
  };

  // ── ELEMENTOS DOM ──────────────────────────────────────────────
  const $ = id => document.getElementById(id);

  const elSearch      = $('search-input');
  const elBtnClear    = $('btn-clear-search');
  const elCentro      = $('filter-centro');
  const elUnidad      = $('filter-unidad');
  const elSort        = $('sort-select');
  const elLabList     = $('lab-list');
  const elCount       = $('results-count');
  const elEmptyState  = $('empty-state');
  const elPagination  = $('pagination');
  const elBtnPrev     = $('btn-prev');
  const elBtnNext     = $('btn-next');
  const elPages       = $('pagination-pages');
  const elFooterTotal = $('footer-count-total');

  // ── INICIALIZACIÓN ─────────────────────────────────────────────
  function init() {
    populateCentroFilter();
    attachEventListeners();
    render();

    // Footer: total de registros en la base
    elFooterTotal.textContent =
      `${LAB_DATA.length} laboratorios registrados`;
  }

  // ── POBLAR FILTRO CENTRO ────────────────────────────────────────
  function populateCentroFilter() {
    const centros = [...new Set(LAB_DATA.map(d => d.centro))].sort(
      (a, b) => a.localeCompare(b, 'es')
    );
    centros.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      elCentro.appendChild(opt);
    });
  }

  // ── POBLAR FILTRO UNIDAD (condicional) ─────────────────────────
  function populateUnidadFilter(centro) {
    // Vaciar
    elUnidad.innerHTML = '<option value="">Todas las unidades</option>';

    const source = centro
      ? LAB_DATA.filter(d => d.centro === centro)
      : LAB_DATA;

    const unidades = [...new Set(source.map(d => d.unidad))].sort(
      (a, b) => a.localeCompare(b, 'es')
    );

    if (unidades.length === 0) {
      elUnidad.disabled = true;
      return;
    }
    elUnidad.disabled = false;

    unidades.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u;
      opt.textContent = u;
      elUnidad.appendChild(opt);
    });
  }

  // ── EVENT LISTENERS ────────────────────────────────────────────
  function attachEventListeners() {
    // Búsqueda con debounce
    let debounceTimer;
    elSearch.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.query = elSearch.value.trim();
        elBtnClear.hidden = state.query === '';
        resetPage();
        render();
      }, 200);
    });

    elBtnClear.addEventListener('click', () => {
      elSearch.value = '';
      state.query = '';
      elBtnClear.hidden = true;
      resetPage();
      render();
      elSearch.focus();
    });

    // Filtro Centro
    elCentro.addEventListener('change', () => {
      state.centro = elCentro.value;
      state.unidad = '';
      populateUnidadFilter(state.centro);
      elUnidad.value = '';
      resetPage();
      render();
    });

    // Filtro Unidad
    elUnidad.addEventListener('change', () => {
      state.unidad = elUnidad.value;
      resetPage();
      render();
    });

    // Toggles de terceros
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => {
          b.classList.remove('toggle-btn--active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('toggle-btn--active');
        btn.setAttribute('aria-pressed', 'true');
        state.terceros = btn.dataset.terceros;
        resetPage();
        render();
      });
    });

    // Ordenamiento
    elSort.addEventListener('change', () => {
      state.sort = elSort.value;
      resetPage();
      render();
    });

    // Botones reset
    $('btn-reset-all').addEventListener('click', resetAllFilters);
    $('btn-reset-empty').addEventListener('click', resetAllFilters);

    // Paginación
    elBtnPrev.addEventListener('click', () => {
      if (state.page > 1) { state.page--; render(); scrollToTop(); }
    });
    elBtnNext.addEventListener('click', () => {
      const total = getFiltered().length;
      const maxPage = Math.ceil(total / PAGE_SIZE);
      if (state.page < maxPage) { state.page++; render(); scrollToTop(); }
    });
  }

  // ── FILTRADO ───────────────────────────────────────────────────
  function getFiltered() {
    const q = normalizeText(state.query);

    return LAB_DATA.filter(lab => {
      // Filtro Centro Regional
      if (state.centro && lab.centro !== state.centro) return false;

      // Filtro Unidad
      if (state.unidad && lab.unidad !== state.unidad) return false;

      // Filtro Terceros
      if (state.terceros !== '') {
        if (normalizeText(lab.terceros) !== normalizeText(state.terceros)) return false;
      }

      // Búsqueda de texto
      if (q) {
        const haystack = normalizeText(
          [lab.laboratorio, lab.responsable, lab.analisis].join(' ')
        );
        // Soporte multi-palabra: todas las palabras deben aparecer
        return q.split(/\s+/).every(word => haystack.includes(word));
      }

      return true;
    });
  }

  // ── ORDENAMIENTO ───────────────────────────────────────────────
  function getSorted(data) {
    const compare = (a, b, key) =>
      (a[key] || '').localeCompare(b[key] || '', 'es');

    switch (state.sort) {
      case 'lab-asc':     return [...data].sort((a,b) => compare(a,b,'laboratorio'));
      case 'lab-desc':    return [...data].sort((a,b) => compare(b,a,'laboratorio'));
      case 'centro-asc':  return [...data].sort((a,b) => compare(a,b,'centro'));
      case 'unidad-asc':  return [...data].sort((a,b) => compare(a,b,'unidad'));
      default:            return data;
    }
  }

  // ── RENDER PRINCIPAL ───────────────────────────────────────────
  function render() {
    const filtered = getSorted(getFiltered());
    const total    = filtered.length;
    const maxPage  = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // Corregir página si quedó fuera de rango
    if (state.page > maxPage) state.page = maxPage;

    const start   = (state.page - 1) * PAGE_SIZE;
    const slice   = filtered.slice(start, start + PAGE_SIZE);

    // Count
    renderCount(total, start, slice.length);

    // Cards
    renderCards(slice);

    // Empty state
    if (total === 0) {
      elEmptyState.hidden = false;
      elPagination.hidden = true;
    } else {
      elEmptyState.hidden = true;
      elPagination.hidden = total <= PAGE_SIZE;
      renderPagination(total, maxPage);
    }
  }

  // ── RENDER COUNT ───────────────────────────────────────────────
  function renderCount(total, start, shown) {
    if (total === 0) {
      elCount.innerHTML = 'Sin resultados para los filtros aplicados';
      return;
    }
    const from = start + 1;
    const to   = start + shown;
    elCount.innerHTML =
      `Mostrando <strong>${from}–${to}</strong> de <strong>${total}</strong> laboratorio${total !== 1 ? 's' : ''}`;
  }

  // ── RENDER CARDS ───────────────────────────────────────────────
  function renderCards(labs) {
    elLabList.innerHTML = '';

    labs.forEach((lab, idx) => {
      const card = buildCard(lab, idx);
      elLabList.appendChild(card);
    });
  }

  function buildCard(lab, idx) {
    const esTerceros  = normalizeText(lab.terceros) === 'si';
    const esAcreditado = normalizeText(lab.acreditado) === 'acreditado';
    const tieneRedlabSenasa = normalizeText(lab.redlabSenasa || '') === 'autorizado';

    const article = document.createElement('article');
    article.className = `lab-card${esTerceros ? ' lab-card--terceros' : ''}`;
    article.setAttribute('role', 'listitem');
    article.setAttribute('aria-label', lab.laboratorio);
    article.style.animationDelay = `${idx * 18}ms`;

    // Badges
    const badges = [];
    if (esTerceros) {
      badges.push(`<span class="badge badge--terceros">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        Presta a terceros
      </span>`);
    }
    if (esAcreditado) {
      badges.push(`<span class="badge badge--acreditado">✓ OAA</span>`);
    }
    if (tieneRedlabSenasa) {
      badges.push(`<span class="badge badge--redlab">REDLAB (SENASA)</span>`);
    }
    if (!esTerceros) {
      badges.push(`<span class="badge badge--no-terceros">Solo uso interno</span>`);
    }

    // Highlight helper
    const hl = text => highlightQuery(escHtml(String(text || '')), state.query);

    article.innerHTML = `
      <div class="lab-card__header">
        <div class="lab-card__title-block">
          <div class="lab-card__name">${hl(lab.laboratorio)}</div>
          <div class="lab-card__breadcrumb">
            <span>${escHtml(lab.centro)}</span>
            <span class="lab-card__breadcrumb-sep">›</span>
            <span>${escHtml(lab.unidad)}</span>
          </div>
        </div>
        <div class="lab-card__badges">${badges.join('')}</div>
      </div>

      <div class="lab-card__body">
        <div class="lab-card__field">
          <div class="lab-card__field-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Responsable
          </div>
          <div class="lab-card__field-value">${hl(lab.responsable)}</div>
        </div>

        <div class="lab-card__field">
          <div class="lab-card__field-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Correo electrónico
          </div>
          <div class="lab-card__field-value lab-card__field-value--correo">${escHtml(lab.correo || '—')}</div>
        </div>

        <div class="lab-card__field">
          <div class="lab-card__field-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg>
            Matriz
          </div>
          <div class="lab-card__field-value">${escHtml(lab.matriz || '—')}</div>
        </div>

        <div class="lab-card__field lab-card__field--wide">
          <div class="lab-card__field-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            Análisis / Servicios
          </div>
          <div class="lab-card__field-value">${hl(lab.analisis)}</div>
        </div>
      </div>
    `;

    return article;
  }

  // ── RENDER PAGINACIÓN ──────────────────────────────────────────
  function renderPagination(total, maxPage) {
    elBtnPrev.disabled = state.page <= 1;
    elBtnNext.disabled = state.page >= maxPage;

    // Páginas visibles: siempre 1, siempre last, y window de ±2 alrededor de current
    const pages = buildPageWindow(state.page, maxPage);

    elPages.innerHTML = '';
    pages.forEach(p => {
      if (p === '…') {
        const el = document.createElement('span');
        el.className = 'pagination__ellipsis';
        el.textContent = '…';
        el.setAttribute('aria-hidden', 'true');
        elPages.appendChild(el);
      } else {
        const btn = document.createElement('button');
        btn.className = `pagination__page-btn${p === state.page ? ' active' : ''}`;
        btn.textContent = p;
        btn.setAttribute('aria-label', `Página ${p}`);
        btn.setAttribute('aria-current', p === state.page ? 'page' : 'false');
        btn.addEventListener('click', () => {
          state.page = p;
          render();
          scrollToTop();
        });
        elPages.appendChild(btn);
      }
    });
  }

  function buildPageWindow(current, max) {
    if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);

    const result = new Set([1, max, current]);
    for (let i = Math.max(2, current - 2); i <= Math.min(max - 1, current + 2); i++) {
      result.add(i);
    }

    const sorted = [...result].sort((a, b) => a - b);
    const withEllipsis = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) withEllipsis.push('…');
      withEllipsis.push(p);
      prev = p;
    }
    return withEllipsis;
  }

  // ── HELPERS ────────────────────────────────────────────────────
  function normalizeText(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function highlightQuery(escapedHtml, query) {
    if (!query) return escapedHtml;
    const words = normalizeText(query)
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (words.length === 0) return escapedHtml;

    // Highlight sobre texto plano normalizado, luego re-mapear posiciones
    // Approach simple: reemplazar en el HTML escapado (sin riesgo de XSS ya que está escapado)
    let result = escapedHtml;
    words.forEach(word => {
      // Crear regex que sea insensible a acentos es complejo; usamos heurística
      const re = new RegExp(`(${word})`, 'gi');
      result = result.replace(re, '<mark class="hl">$1</mark>');
    });
    return result;
  }

  function resetPage() { state.page = 1; }

  function resetAllFilters() {
    elSearch.value = '';
    elBtnClear.hidden = true;
    elCentro.value = '';
    populateUnidadFilter('');
    elUnidad.value = '';
    state.query   = '';
    state.centro  = '';
    state.unidad  = '';
    state.terceros = '';

    // Reset toggles
    document.querySelectorAll('.toggle-btn').forEach(b => {
      b.classList.remove('toggle-btn--active');
      b.setAttribute('aria-pressed', 'false');
    });
    $('btn-todos').classList.add('toggle-btn--active');
    $('btn-todos').setAttribute('aria-pressed', 'true');

    resetPage();
    render();
  }

  function scrollToTop() {
    document.getElementById('lab-list').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ── ARRANQUE ───────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
