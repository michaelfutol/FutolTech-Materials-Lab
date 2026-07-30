import { MATERIAL_LIBRARY, SECTION_LIBRARY, sectionLibraryCategories } from './data/libraryCatalog.js';
import { SECTION_CATEGORY_LABELS } from './data/sectionTaxonomy.js';
import { sectionSketchSvg } from './components/sectionSketch.js';

const elements = Object.fromEntries([
  'sectionsTab', 'materialsTab', 'librarySearchInput', 'libraryCategorySelect',
  'libraryStatusSelect', 'librarySummary', 'libraryHeading', 'libraryGrid',
  'libraryDetail', 'clearSelectionButton', 'categoryFilterLabel'
].map((id) => [id, document.getElementById(id)]));

let view = 'sections';
let selectedSectionId = new URLSearchParams(window.location.search).get('section');

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function format(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: decimals }).format(value);
}

function statusGroup(record) {
  const text = `${record.marketStatus ?? ''} ${record.analysisStatus ?? ''} ${record.source?.sourceStatus ?? ''} ${record.source?.technicalStatus ?? ''} ${record.source?.status ?? ''}`.toLowerCase();
  if (text.includes('research') || text.includes('study') || text.includes('peer-reviewed')) return 'research';
  if (text.includes('official') || text.includes('confirmed') || text.includes('published')) return 'confirmed';
  return 'provisional';
}

function searchMatches(record, query) {
  if (!query) return true;
  const haystack = JSON.stringify(record).toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function sourceText(record) {
  if (!record.source) return record.marketStatus ?? 'Source details pending';
  return [record.source.organization, record.source.standard, record.source.sourceStatus ?? record.source.technicalStatus]
    .filter(Boolean).join(' · ');
}

function sectionCard(record) {
  const properties = record.properties;
  const pipeClass = record.category === 'steel-pipe' ? ' library-chip--pipe' : '';
  const familyClass = record.family === 'bamboo' ? ' library-chip--bamboo' : record.family === 'wood' ? ' library-chip--wood' : ' library-chip--steel';
  return `<article class="library-card ${record.id === selectedSectionId ? 'is-selected' : ''}" data-library-section="${esc(record.id)}">
    <div class="library-card__visual">${sectionSketchSvg(record.section, record.family)}</div>
    <div class="library-card__body">
      <div class="library-card__meta"><span class="library-chip${familyClass}">${esc(record.family)}</span><span class="library-chip${pipeClass}">${esc(record.categoryLabel)}</span></div>
      <h3>${esc(record.label)}</h3>
      <p><strong>${esc(record.dimensions)}</strong></p>
      <p>${record.publishedMassKgM != null ? `${format(record.publishedMassKgM, 3)} kg/m published mass` : properties ? `${format(properties.areaMm2, 1)} mm² gross area` : 'Section properties pending'}</p>
      <p class="candidate-source">${esc(record.marketStatus)}</p>
      <button class="library-card__action button button--ghost" type="button" data-open-section="${esc(record.id)}">View properties & source</button>
    </div>
  </article>`;
}

function representativeSection(material) {
  if (material.family === 'wood') return { type: 'rectangle', widthMm: 50, depthMm: 100, label: material.name };
  if (material.family === 'bamboo') return { type: 'chs', diameterMm: 91.2, thicknessMm: 10, productCategory: 'round-bamboo', label: material.name };
  return { type: 'custom', widthMm: 150, depthMm: 300, webThicknessMm: 7, flangeThicknessMm: 11, productCategory: 'rolled-h', label: material.name };
}

function materialCard(material) {
  return `<article class="library-card material-card">
    <div class="library-card__visual">${sectionSketchSvg(representativeSection(material), material.family)}</div>
    <div class="library-card__body">
      <div class="library-card__meta"><span class="library-chip ${material.family === 'steel' ? 'library-chip--steel' : material.family === 'bamboo' ? 'library-chip--bamboo' : 'library-chip--wood'}">${esc(material.familyLabel)}</span><span class="library-chip">${esc(material.source?.confidence ?? material.source?.status ?? 'verify')}</span></div>
      <h3>${esc(material.name)}</h3>
      <p>${esc(material.source?.label ?? 'Source pending')}</p>
      <div class="material-strengths">
        <div><span>Elastic modulus E</span><strong>${format(material.elasticModulusMPa / 1000, 2)} GPa</strong></div>
        <div><span>Density</span><strong>${format(material.densityKgM3, 0)} kg/m³</strong></div>
        <div><span>Bending reference</span><strong>${format(material.bendingReferenceMPa ?? material.yieldStrengthMPa, 2)} MPa</strong></div>
        <div><span>Physical/ultimate</span><strong>${format(material.ultimateBendingMPa ?? material.yieldStrengthMPa, 2)} MPa</strong></div>
      </div>
      <p class="candidate-source">${esc(material.source?.note ?? material.strengthReferenceLabel ?? '')}</p>
    </div>
  </article>`;
}

function renderDetail(record) {
  if (!record) {
    elements.libraryDetail.classList.add('is-hidden');
    elements.clearSelectionButton.classList.add('is-hidden');
    return;
  }
  const p = record.properties;
  elements.libraryDetail.innerHTML = `<div class="library-detail__layout">
    <div class="library-card__visual">${sectionSketchSvg(record.section, record.family, { title: record.label })}</div>
    <div>
      <p class="eyebrow">${esc(record.categoryLabel)}</p>
      <h3>${esc(record.label)}</h3>
      <p><strong>${esc(record.dimensions)}</strong> · ${esc(record.marketStatus)}</p>
      <p>${esc(record.analysisStatus ?? '')}</p>
      <p><strong>Source:</strong> ${esc(sourceText(record))}</p>
      <dl>
        <div><dt>Gross area</dt><dd>${p ? `${format(p.areaMm2, 1)} mm²` : '—'}</dd></div>
        <div><dt>Iₓ / Iᵧ</dt><dd>${p ? `${format(p.ixMm4, 0)} / ${format(p.iyMm4, 0)} mm⁴` : '—'}</dd></div>
        <div><dt>Zₓ / Zᵧ</dt><dd>${p ? `${format(p.zxMm3, 0)} / ${format(p.zyMm3, 0)} mm³` : '—'}</dd></div>
        <div><dt>Published mass</dt><dd>${record.publishedMassKgM != null ? `${format(record.publishedMassKgM, 3)} kg/m` : 'species/material dependent'}</dd></div>
        <div><dt>Listed max length</dt><dd>${record.maxLengthM != null ? `${format(record.maxLengthM, 2)} m` : 'not verified'}</dd></div>
        <div><dt>Library ID</dt><dd>${esc(record.id)}</dd></div>
      </dl>
    </div>
  </div>`;
  elements.libraryDetail.classList.remove('is-hidden');
  elements.clearSelectionButton.classList.remove('is-hidden');
}

function filteredSections() {
  const query = elements.librarySearchInput.value.trim();
  const category = elements.libraryCategorySelect.value;
  const status = elements.libraryStatusSelect.value;
  return SECTION_LIBRARY.filter((record) => (
    (category === 'all' || record.category === category)
    && (status === 'all' || statusGroup(record) === status)
    && searchMatches(record, query)
  ));
}

function filteredMaterials() {
  const query = elements.librarySearchInput.value.trim();
  const status = elements.libraryStatusSelect.value;
  return MATERIAL_LIBRARY.filter((record) => (
    (status === 'all' || statusGroup(record) === status)
    && searchMatches(record, query)
  ));
}

function render() {
  const sectionsMode = view === 'sections';
  elements.sectionsTab.classList.toggle('is-active', sectionsMode);
  elements.materialsTab.classList.toggle('is-active', !sectionsMode);
  elements.sectionsTab.setAttribute('aria-selected', String(sectionsMode));
  elements.materialsTab.setAttribute('aria-selected', String(!sectionsMode));
  elements.categoryFilterLabel.classList.toggle('is-hidden', !sectionsMode);
  elements.libraryHeading.textContent = sectionsMode ? 'Structural sections' : 'Material property datasets';

  if (sectionsMode) {
    const records = filteredSections();
    elements.libraryGrid.innerHTML = records.length ? records.map(sectionCard).join('') : '<div class="library-empty">No section matches the current filters.</div>';
    elements.librarySummary.innerHTML = `<p class="eyebrow">Section library</p><strong>${records.length} of ${SECTION_LIBRARY.length} records shown</strong><p>Includes ${SECTION_LIBRARY.filter((r) => r.category === 'steel-pipe').length} steel pipes, ${SECTION_LIBRARY.filter((r) => r.category === 'shs' || r.category === 'rhs').length} SHS/RHS sections, ${SECTION_LIBRARY.filter((r) => r.category === 'rolled-h').length} H sections, ${SECTION_LIBRARY.filter((r) => r.family === 'wood').length} sawn-size presets, and ${SECTION_LIBRARY.filter((r) => r.family === 'bamboo').length} round-bamboo geometries.</p>`;
    renderDetail(records.find((record) => record.id === selectedSectionId) ?? null);
  } else {
    const records = filteredMaterials();
    elements.libraryGrid.innerHTML = records.length ? records.map(materialCard).join('') : '<div class="library-empty">No material dataset matches the current filters.</div>';
    elements.librarySummary.innerHTML = `<p class="eyebrow">Material library</p><strong>${records.length} of ${MATERIAL_LIBRARY.length} datasets shown</strong><p>These are property datasets, separate from product shapes. A steel grade can be paired with a pipe, SHS/RHS, or rolled H section only after the actual product certificate and standard are verified.</p>`;
    renderDetail(null);
  }
}

function selectSection(id) {
  selectedSectionId = id;
  const url = new URL(window.location.href);
  url.searchParams.set('section', id);
  window.history.replaceState({}, '', url);
  render();
  elements.libraryDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

for (const category of sectionLibraryCategories()) {
  const option = document.createElement('option');
  option.value = category;
  option.textContent = SECTION_CATEGORY_LABELS[category] ?? category;
  elements.libraryCategorySelect.append(option);
}

elements.sectionsTab.addEventListener('click', () => { view = 'sections'; render(); });
elements.materialsTab.addEventListener('click', () => { view = 'materials'; render(); });
for (const element of [elements.librarySearchInput, elements.libraryCategorySelect, elements.libraryStatusSelect]) {
  element.addEventListener('input', render);
  element.addEventListener('change', render);
}
elements.libraryGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-open-section]');
  if (button) selectSection(button.dataset.openSection);
});
elements.clearSelectionButton.addEventListener('click', () => {
  selectedSectionId = null;
  const url = new URL(window.location.href);
  url.searchParams.delete('section');
  window.history.replaceState({}, '', url);
  render();
});

render();
