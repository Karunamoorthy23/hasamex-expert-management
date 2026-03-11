/**
 * Hasamex Expert Database — Frontend Sample
 * Debounced search, filters, pagination, view toggle
 */

// ============================================
// Sample Data (from HEB Excel)
// ============================================
const SAMPLE_EXPERTS = [
  {
    id: '1',
    expert_id: 'EX-00001',
    first_name: 'Syamal',
    last_name: 'Ram Kishore',
    primary_email: 'syamalram@gmail.com',
    linkedin_url: 'https://www.linkedin.com/in/syamal-ram-kishore-a3a99319/',
    location: 'Hyderabad, Telangana, India',
    region: 'APAC',
    primary_sector: 'Healthcare & Life Sciences',
    expert_status: 'Active T&Cs (Call Completed)',
    current_employment_status: 'Currently Employed',
    seniority: 'Founder',
    title_headline: 'Co-Founder & Partner, Hexawel Healthcare',
    company_role: 'Manufacturer',
    expert_function: 'Strategy',
  },
  {
    id: '2',
    expert_id: 'EX-00002',
    first_name: 'Ravinder',
    last_name: 'Singh',
    primary_email: 'ravinder.co.in@gmail.com',
    linkedin_url: 'https://www.linkedin.com/in/ravinder-singh-251a0974/',
    location: 'Gurgaon, Haryana, India',
    region: 'APAC',
    primary_sector: 'Energy',
    expert_status: 'Active T&Cs (Call Completed)',
    current_employment_status: 'Currently Employed',
    seniority: 'Senior Manager',
    title_headline: 'Solar PV, Wind & BESS Tech. Professional',
    company_role: 'Operator',
    expert_function: 'Engineering',
  },
  {
    id: '3',
    expert_id: 'EX-00003',
    first_name: 'Siriwat',
    last_name: 'Wangsook',
    primary_email: 'siriwatw@lighting.co.th',
    linkedin_url: 'https://th.linkedin.com/in/siriwat-wangsook-6b2a5550',
    location: 'Bangkok, Bangkok City, Thailand',
    region: 'APAC',
    primary_sector: 'Industrials',
    expert_status: 'Active T&Cs (Call Completed)',
    current_employment_status: 'Currently Employed',
    seniority: 'Director',
    title_headline: 'Business Development Director — Head of Lighting Design Team',
    company_role: 'Service Provider',
    expert_function: 'Engineering',
  },
  {
    id: '4',
    expert_id: 'EX-00004',
    first_name: 'Maria',
    last_name: 'Fernandez',
    primary_email: 'maria.f@consulting.com',
    linkedin_url: 'https://www.linkedin.com/in/maria-fernandez',
    location: 'Madrid, Spain',
    region: 'EMEA',
    primary_sector: 'Financials',
    expert_status: 'Lead',
    current_employment_status: 'Independent',
    seniority: 'Director',
    title_headline: 'Senior Consultant, Financial Strategy',
    company_role: 'Advisor / Consultant',
    expert_function: 'Strategy',
  },
  {
    id: '5',
    expert_id: 'EX-00005',
    first_name: 'James',
    last_name: 'Chen',
    primary_email: 'j.chen@techcorp.com',
    linkedin_url: 'https://www.linkedin.com/in/james-chen-tech',
    location: 'San Francisco, CA, USA',
    region: 'Americas',
    primary_sector: 'TMT',
    expert_status: 'Active T&Cs (No Call Yet)',
    current_employment_status: 'Currently Employed',
    seniority: 'VP',
    title_headline: 'VP of Product, Enterprise Software',
    company_role: 'Technology Provider',
    expert_function: 'Product',
  },
  {
    id: '6',
    expert_id: 'EX-00006',
    first_name: 'Anna',
    last_name: 'Kowalski',
    primary_email: 'anna.k@pharma.eu',
    linkedin_url: 'https://www.linkedin.com/in/anna-kowalski-pharma',
    location: 'Warsaw, Poland',
    region: 'EMEA',
    primary_sector: 'Healthcare & Life Sciences',
    expert_status: 'Active T&Cs (Call Completed)',
    current_employment_status: 'Currently Employed',
    seniority: 'Senior Manager',
    title_headline: 'Regulatory Affairs Lead',
    company_role: 'Manufacturer / OEM',
    expert_function: 'Regulatory',
  },
  {
    id: '7',
    expert_id: 'EX-00007',
    first_name: 'David',
    last_name: 'Okonkwo',
    primary_email: 'd.okonkwo@energy.co.za',
    linkedin_url: 'https://www.linkedin.com/in/david-okonkwo',
    location: 'Johannesburg, South Africa',
    region: 'EMEA',
    primary_sector: 'Energy',
    expert_status: 'Expired T&Cs',
    current_employment_status: 'Currently Employed',
    seniority: 'Director',
    title_headline: 'Director, Renewable Energy Projects',
    company_role: 'Operator',
    expert_function: 'Operations',
  },
  {
    id: '8',
    expert_id: 'EX-00008',
    first_name: 'Sarah',
    last_name: 'Mitchell',
    primary_email: 'sarah.m@consumer.com',
    linkedin_url: 'https://www.linkedin.com/in/sarah-mitchell-consumer',
    location: 'London, UK',
    region: 'EMEA',
    primary_sector: 'Consumer',
    expert_status: 'Lead',
    current_employment_status: 'Board Member',
    seniority: 'Board',
    title_headline: 'Non-Executive Director, Retail',
    company_role: 'Board / Governance',
    expert_function: 'Board Governance',
  },
  {
    id: '9',
    expert_id: 'EX-00009',
    first_name: 'Raj',
    last_name: 'Patel',
    primary_email: 'raj.patel@industrials.in',
    linkedin_url: 'https://www.linkedin.com/in/raj-patel-industrials',
    location: 'Mumbai, India',
    region: 'APAC',
    primary_sector: 'Industrials',
    expert_status: 'Active T&Cs (Call Completed)',
    current_employment_status: 'Currently Employed',
    seniority: 'Manager',
    title_headline: 'Supply Chain Director',
    company_role: 'Manufacturer / OEM',
    expert_function: 'Supply Chain',
  },
  {
    id: '10',
    expert_id: 'EX-00010',
    first_name: 'Elena',
    last_name: 'Vasquez',
    primary_email: 'elena.v@education.mx',
    linkedin_url: 'https://www.linkedin.com/in/elena-vasquez-edu',
    location: 'Mexico City, Mexico',
    region: 'Americas',
    primary_sector: 'Education',
    expert_status: 'Active T&Cs (No Call Yet)',
    current_employment_status: 'Currently Employed',
    seniority: 'Academic',
    title_headline: 'Professor, Business Strategy',
    company_role: 'Service Provider',
    expert_function: 'Strategy',
  },
];

// ============================================
// State
// ============================================
let state = {
  experts: [...SAMPLE_EXPERTS],
  filteredExperts: [...SAMPLE_EXPERTS],
  page: 1,
  limit: 5,
  search: '',
  // Multi-select filters (arrays)
  filters: { region: [], sector: [], status: [], employment: [] },
  view: 'table', // 'table' | 'cards'
  selectedIds: new Set(),
  isLoading: false,
};

// ============================================
// Debounce Utility
// ============================================
function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ============================================
// Filtering Logic (simulates server-side)
// ============================================
function applyFiltersAndSearch() {
  let result = [...state.experts];

  // Search
  if (state.search.trim()) {
    const q = state.search.toLowerCase().trim();
    result = result.filter((e) => {
      const searchStr = [
        e.first_name,
        e.last_name,
        e.title_headline,
        e.primary_sector,
        e.location,
        e.linkedin_url,
        e.company_role,
        e.expert_function,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchStr.includes(q);
    });
  }

  // Filters
  if (state.filters.region?.length) {
    result = result.filter((e) => state.filters.region.includes(e.region));
  }
  if (state.filters.sector?.length) {
    result = result.filter((e) => state.filters.sector.includes(e.primary_sector));
  }
  if (state.filters.status?.length) {
    result = result.filter((e) => state.filters.status.includes(e.expert_status));
  }
  if (state.filters.employment?.length) {
    result = result.filter((e) => state.filters.employment.includes(e.current_employment_status));
  }

  state.filteredExperts = result;
  state.page = 1;
}

function getPaginatedExperts() {
  const start = (state.page - 1) * state.limit;
  return state.filteredExperts.slice(start, start + state.limit);
}

function getTotalPages() {
  return Math.ceil(state.filteredExperts.length / state.limit) || 1;
}

// ============================================
// DOM Elements
// ============================================
const el = {
  searchInput: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  btnFilters: document.getElementById('btnFilters'),
  filtersCount: document.getElementById('filtersCount'),
  filtersPanel: document.getElementById('filtersPanel'),
  filtersClose: document.getElementById('filtersClose'),
  filtersClearAll: document.getElementById('filtersClearAll'),
  btnAddExpert: document.getElementById('btnAddExpert'),
  btnImport: document.getElementById('btnImport'),
  btnExport: document.getElementById('btnExport'),
  viewTable: document.getElementById('viewTable'),
  viewCards: document.getElementById('viewCards'),
  bulkBar: document.getElementById('bulkBar'),
  bulkCount: document.getElementById('bulkCount'),
  bulkEmail: document.getElementById('bulkEmail'),
  bulkExportSelected: document.getElementById('bulkExportSelected'),
  bulkClear: document.getElementById('bulkClear'),
  selectAll: document.getElementById('selectAll'),
  tableBody: document.getElementById('tableBody'),
  cardGridBody: document.getElementById('cardGridBody'),
  tableView: document.getElementById('tableView'),
  cardView: document.getElementById('cardView'),
  skeletonView: document.getElementById('skeletonView'),
  emptyState: document.getElementById('emptyState'),
  pagination: document.getElementById('pagination'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageInfo: document.getElementById('pageInfo'),
  expertModal: document.getElementById('expertModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('modalBody'),
  modalClose: document.getElementById('modalClose'),
};

// track which filter dropdown is open inside the panel
let openFilterDropdown = null; // 'region' | 'sector' | 'status' | 'employment' | null

// ============================================
// Filter Options (derived from data)
// ============================================
function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getFilterOptions() {
  return {
    region: uniqueSorted(state.experts.map((e) => e.region)),
    sector: uniqueSorted(state.experts.map((e) => e.primary_sector)),
    status: uniqueSorted(state.experts.map((e) => e.expert_status)),
    employment: uniqueSorted(state.experts.map((e) => e.current_employment_status)),
  };
}

function activeFiltersCount() {
  return Object.values(state.filters).reduce((acc, v) => acc + (Array.isArray(v) ? v.length : 0), 0);
}

function updateFiltersButtonUI() {
  const count = activeFiltersCount();
  if (el.filtersCount) {
    el.filtersCount.textContent = String(count);
    el.filtersCount.hidden = count === 0;
  }
  if (el.btnFilters) {
    const expanded = el.filtersPanel && !el.filtersPanel.hidden;
    el.btnFilters.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
}

function updateFilterDropdownCountsUI() {
  if (!el.filtersPanel) return;
  const categories = ['region', 'sector', 'status', 'employment'];
  categories.forEach((cat) => {
    const countEl = el.filtersPanel.querySelector(`[data-filter-count="${cat}"]`);
    if (!countEl) return;
    const count = (state.filters?.[cat] || []).length;
    countEl.textContent = String(count);
    countEl.hidden = count === 0;
  });
}

function closeAllFilterDropdowns() {
  if (!el.filtersPanel) return;
  el.filtersPanel.querySelectorAll('[data-filter-popover]').forEach((p) => (p.hidden = true));
  el.filtersPanel.querySelectorAll('[data-filter-trigger]').forEach((t) => t.setAttribute('aria-expanded', 'false'));
  openFilterDropdown = null;
}

function openFilterDropdownFor(cat) {
  if (!el.filtersPanel) return;
  if (openFilterDropdown === cat) {
    closeAllFilterDropdowns();
    return;
  }
  closeAllFilterDropdowns();
  const pop = el.filtersPanel.querySelector(`[data-filter-popover="${cat}"]`);
  const trig = el.filtersPanel.querySelector(`[data-filter-trigger="${cat}"]`);
  if (pop) pop.hidden = false;
  if (trig) trig.setAttribute('aria-expanded', 'true');
  openFilterDropdown = cat;
}

function renderFiltersPanel() {
  if (!el.filtersPanel) return;
  const opts = getFilterOptions();

  const categories = /** @type {const} */ (['region', 'sector', 'status', 'employment']);
  categories.forEach((cat) => {
    const list = el.filtersPanel.querySelector(`[data-filter-list="${cat}"]`);
    if (!list) return;
    const selected = new Set(state.filters[cat] || []);

    list.innerHTML = (opts[cat] || [])
      .map((value) => {
        const id = `ms_${cat}_${cssSafeId(value)}`;
        const checked = selected.has(value) ? 'checked' : '';
        return `
          <label class="ms__item" for="${id}">
            <input id="${id}" type="checkbox" data-filter-cat="${cat}" data-filter-value="${escapeAttr(value)}" ${checked}>
            <span class="ms__value">${escapeHtml(value)}</span>
          </label>
        `;
      })
      .join('') || `<div class="ms__empty">No options</div>`;

    list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', handleMultiSelectChange);
    });
  });

  // bind dropdown triggers once per render
  el.filtersPanel.querySelectorAll('[data-filter-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => openFilterDropdownFor(btn.dataset.filterTrigger));
  });

  updateFilterDropdownCountsUI();
}

function cssSafeId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(s) {
  // minimal attribute escaping
  return escapeHtml(s);
}

function handleMultiSelectChange(e) {
  const cat = e.target.dataset.filterCat;
  const value = e.target.dataset.filterValue;
  if (!cat || !value) return;

  const current = new Set(state.filters[cat] || []);
  if (e.target.checked) current.add(value);
  else current.delete(value);
  state.filters[cat] = [...current];

  render(); // re-filter and redraw
  updateFiltersButtonUI();
  updateFilterDropdownCountsUI();
}

function bindFiltersPanelSearch() {
  if (!el.filtersPanel) return;
  el.filtersPanel.querySelectorAll('[data-filter-search]').forEach((input) => {
    input.addEventListener('input', () => {
      const cat = input.dataset.filterSearch;
      const q = input.value.toLowerCase().trim();
      const list = el.filtersPanel.querySelector(`[data-filter-list="${cat}"]`);
      if (!list) return;

      list.querySelectorAll('.ms__item').forEach((item) => {
        const text = item.textContent?.toLowerCase() || '';
        item.style.display = text.includes(q) ? '' : 'none';
      });
    });
  });
}

function clearAllFilters() {
  state.filters = { region: [], sector: [], status: [], employment: [] };
  if (el.filtersPanel) {
    el.filtersPanel.querySelectorAll('[data-filter-search]').forEach((i) => (i.value = ''));
  }
  renderFiltersPanel();
  render();
  updateFiltersButtonUI();
  updateFilterDropdownCountsUI();
}

function toggleFiltersPanel(forceOpen) {
  if (!el.filtersPanel) return;
  const open = typeof forceOpen === 'boolean' ? forceOpen : el.filtersPanel.hidden;
  el.filtersPanel.hidden = !open;
  if (open) {
    renderFiltersPanel();
    closeAllFilterDropdowns();
  }
  updateFiltersButtonUI();
}

// ============================================
// Render Functions
// ============================================
function renderTable(experts) {
  el.tableBody.innerHTML = experts
    .map(
      (e) => `
    <tr>
      <td class="col-check">
        <input type="checkbox" class="expert-checkbox" data-id="${e.id}" ${state.selectedIds.has(e.id) ? 'checked' : ''}>
      </td>
      <td class="col-id">${e.expert_id}</td>
      <td class="col-name">
        <a href="#" class="expert-name" data-id="${e.id}">${e.first_name} ${e.last_name}</a>
      </td>
      <td class="col-title">${truncate(e.title_headline, 50)}</td>
      <td class="col-sector">${e.primary_sector || '—'}</td>
      <td class="col-region">${e.region || '—'}</td>
      <td class="col-status">${e.expert_status || '—'}</td>
      <td class="col-actions">
        <a href="${e.linkedin_url}" target="_blank" rel="noopener" class="action-link">LinkedIn</a>
      </td>
    </tr>
  `
    )
    .join('');

  // Attach event listeners
  el.tableBody.querySelectorAll('.expert-checkbox').forEach((cb) => {
    cb.addEventListener('change', handleSelectExpert);
  });
  el.tableBody.querySelectorAll('.expert-name').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      openExpertModal(a.dataset.id);
    });
  });
}

function renderCards(experts) {
  el.cardGridBody.innerHTML = experts
    .map((e) => {
      const initials = (e.first_name?.[0] || '') + (e.last_name?.[0] || '');
      return `
    <div class="expert-card">
      <div class="expert-card__header">
        <input type="checkbox" class="expert-checkbox expert-card__checkbox" data-id="${e.id}" ${state.selectedIds.has(e.id) ? 'checked' : ''}>
        <div class="expert-card__avatar">${initials}</div>
        <div>
          <h3 class="expert-card__name">${e.first_name} ${e.last_name}</h3>
          <span class="expert-card__id">${e.expert_id}</span>
        </div>
      </div>
      <div class="expert-card__meta">
        <span class="expert-card__badge">${e.primary_sector || '—'}</span>
        <span class="expert-card__badge">${e.region || '—'}</span>
      </div>
      <p class="expert-card__title">${truncate(e.title_headline, 80)}</p>
      <div class="expert-card__actions">
        <a href="#" class="action-link expert-view" data-id="${e.id}">View</a>
        <a href="${e.linkedin_url}" target="_blank" rel="noopener" class="action-link">LinkedIn</a>
      </div>
    </div>
  `;
    })
    .join('');

  el.cardGridBody.querySelectorAll('.expert-checkbox').forEach((cb) => {
    cb.addEventListener('change', handleSelectExpert);
  });
  el.cardGridBody.querySelectorAll('.expert-view').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      openExpertModal(a.dataset.id);
    });
  });
}

function renderSkeleton() {
  el.skeletonView.innerHTML = `
    <div class="skeleton-table">
      ${Array(5)
        .fill('<div class="skeleton-row"></div>')
        .join('')}
    </div>
  `;
}

function truncate(str, len) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function getInitials(e) {
  return (e.first_name?.[0] || '') + (e.last_name?.[0] || '');
}

// ============================================
// Main Render
// ============================================
function render() {
  applyFiltersAndSearch();
  const experts = getPaginatedExperts();
  const totalPages = getTotalPages();

  // Show/hide empty state
  if (state.filteredExperts.length === 0) {
    el.tableView.hidden = true;
    el.cardView.hidden = true;
    el.skeletonView.hidden = true;
    el.emptyState.hidden = false;
    el.pagination.hidden = true;
    return;
  }

  el.emptyState.hidden = true;
  el.pagination.hidden = false;

  // Render content based on view
  if (state.view === 'table') {
    el.tableView.hidden = false;
    el.cardView.hidden = true;
    renderTable(experts);
  } else {
    el.tableView.hidden = true;
    el.cardView.hidden = false;
    renderCards(experts);
  }

  el.skeletonView.hidden = true;

  // Pagination
  el.prevPage.disabled = state.page <= 1;
  el.nextPage.disabled = state.page >= totalPages;
  el.pageInfo.textContent = `Page ${state.page} of ${totalPages} (${state.filteredExperts.length} experts)`;

  // Bulk bar
  updateBulkBar();
}

function updateBulkBar() {
  const count = state.selectedIds.size;
  if (count > 0) {
    el.bulkBar.hidden = false;
    el.bulkCount.textContent = `${count} selected`;
  } else {
    el.bulkBar.hidden = true;
  }
}

// ============================================
// Event Handlers
// ============================================
function handleSelectExpert(ev) {
  const id = ev.target.dataset.id;
  if (state.selectedIds.has(id)) {
    state.selectedIds.delete(id);
  } else {
    state.selectedIds.add(id);
  }
  el.selectAll.checked = state.selectedIds.size === state.filteredExperts.length && state.filteredExperts.length > 0;
  updateBulkBar();
}

function handleSelectAll(ev) {
  const checked = ev.target.checked;
  const experts = getPaginatedExperts();
  if (checked) {
    experts.forEach((e) => state.selectedIds.add(e.id));
  } else {
    experts.forEach((e) => state.selectedIds.delete(e.id));
  }
  render();
}

function handleSearch(value) {
  state.search = value;
  render();
}

function handleViewToggle(view) {
  state.view = view;
  el.viewTable.classList.toggle('view-btn--active', view === 'table');
  el.viewTable.setAttribute('aria-pressed', view === 'table');
  el.viewCards.classList.toggle('view-btn--active', view === 'cards');
  el.viewCards.setAttribute('aria-pressed', view === 'cards');
  render();
}

function handlePrevPage() {
  if (state.page > 1) {
    state.page--;
    render();
  }
}

function handleNextPage() {
  if (state.page < getTotalPages()) {
    state.page++;
    render();
  }
}

function handleBulkClear() {
  state.selectedIds.clear();
  el.selectAll.checked = false;
  updateBulkBar();
  render();
}

function handleBulkEmail() {
  const selected = state.filteredExperts.filter((e) => state.selectedIds.has(e.id));
  alert(`Email-ready export for ${selected.length} expert(s).\n\nIn production, this would open a formatted view or download.`);
}

function openExpertModal(id) {
  const expert = state.experts.find((e) => e.id === id);
  if (!expert) return;

  el.modalTitle.textContent = `${expert.first_name} ${expert.last_name} — ${expert.expert_id}`;
  el.modalBody.innerHTML = `
    <dl class="modal-dl">
      <dt>Email</dt><dd><a href="mailto:${expert.primary_email}">${expert.primary_email}</a></dd>
      <dt>LinkedIn</dt><dd><a href="${expert.linkedin_url}" target="_blank" rel="noopener">${expert.linkedin_url}</a></dd>
      <dt>Location</dt><dd>${expert.location || '—'}</dd>
      <dt>Region</dt><dd>${expert.region || '—'}</dd>
      <dt>Sector</dt><dd>${expert.primary_sector || '—'}</dd>
      <dt>Title</dt><dd>${expert.title_headline || '—'}</dd>
      <dt>Status</dt><dd>${expert.expert_status || '—'}</dd>
    </dl>
  `;
  el.expertModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeExpertModal() {
  el.expertModal.hidden = true;
  document.body.style.overflow = '';
}

// ============================================
// Simulated Loading (for demo)
// ============================================
function showLoading() {
  el.tableView.hidden = true;
  el.cardView.hidden = true;
  el.emptyState.hidden = true;
  el.skeletonView.hidden = false;
  renderSkeleton();
}

// ============================================
// Init
// ============================================
function init() {
  // Debounced search (400ms)
  const debouncedSearch = debounce(handleSearch, 400);
  el.searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    debouncedSearch(val);
    if (el.searchClear) el.searchClear.hidden = !val.trim();
  });

  // Filters panel (Employee app style)
  if (el.btnFilters) {
    el.btnFilters.addEventListener('click', () => toggleFiltersPanel());
  }
  if (el.filtersClose) {
    el.filtersClose.addEventListener('click', () => {
      toggleFiltersPanel(false);
      closeAllFilterDropdowns();
    });
  }
  if (el.filtersClearAll) {
    el.filtersClearAll.addEventListener('click', clearAllFilters);
  }
  bindFiltersPanelSearch();

  // Close dropdowns when clicking outside the filters panel
  document.addEventListener('click', (e) => {
    if (!el.filtersPanel || el.filtersPanel.hidden) return;
    const withinPanel = el.filtersPanel.contains(e.target);
    if (!withinPanel) closeAllFilterDropdowns();
  });

  // View toggle
  el.viewTable.addEventListener('click', () => handleViewToggle('table'));
  el.viewCards.addEventListener('click', () => handleViewToggle('cards'));

  // Pagination
  el.prevPage.addEventListener('click', handlePrevPage);
  el.nextPage.addEventListener('click', handleNextPage);

  // Select all
  el.selectAll.addEventListener('change', handleSelectAll);

  // Search clear
  if (el.searchClear) {
    el.searchClear.addEventListener('click', () => {
      el.searchInput.value = '';
      handleSearch('');
      el.searchClear.hidden = true;
    });
  }

  // Action bar buttons
  if (el.btnAddExpert) {
    el.btnAddExpert.addEventListener('click', () => alert('Add Expert — In production, opens create form or navigates to /experts/new'));
  }
  if (el.btnImport) {
    el.btnImport.addEventListener('click', () => alert('Import — In production, opens bulk import modal for Excel upload'));
  }
  if (el.btnExport) {
    el.btnExport.addEventListener('click', () => alert(`Export — In production, downloads Excel with ${state.filteredExperts.length} experts (HEB format)`));
  }

  // Bulk actions
  el.bulkClear.addEventListener('click', handleBulkClear);
  el.bulkEmail.addEventListener('click', handleBulkEmail);
  if (el.bulkExportSelected) {
    el.bulkExportSelected.addEventListener('click', handleBulkEmail);
  }

  // Modal
  el.modalClose.addEventListener('click', closeExpertModal);
  el.expertModal.querySelector('.modal__backdrop').addEventListener('click', closeExpertModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeExpertModal();
  });

  // Initial render
  render();
  updateFiltersButtonUI();
}

init();
