import { PH_PRICE_OBSERVATIONS, PRICE_SOURCE_POLICY } from './data/phPriceObservations.js';
import { SECTION_PRESETS } from './data/sectionPresets.js';
import {
  PRICE_OVERRIDE_SCHEMA,
  buildPriceLedger,
  effectivePriceForPreset,
  memberProcurementEconomics
} from './solver/priceIntelligence.js';

const STORAGE_KEY = 'futoltech.structuralLab.priceOverrides.v1';
const PANEL_ID = 'compareEconomicsPanel';
const EPS = 1e-9;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function format(value, decimals = 2) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(Number(value));
}
function peso(value) {
  if (!Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number(value));
}
function allPresets() {
  return Object.values(SECTION_PRESETS).flat().filter((preset) => preset?.id && preset.id !== 'custom');
}
function presetById(id) { return allPresets().find((preset) => preset.id === id) ?? null; }
function loadOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveOverrides(records) { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
function selectedSlots() {
  const selectorRoot = document.getElementById('compareSelectors');
  if (!selectorRoot) return [];
  return [...selectorRoot.querySelectorAll('[data-slot-preset]')]
    .filter((select) => !select.disabled)
    .map((select) => {
      const index = Number(select.dataset.slotPreset);
      const material = selectorRoot.querySelector(`[data-slot-material="${index}"]`);
      return {
        index,
        label: ['Member A', 'Member B', 'Member C'][index] ?? `Member ${index + 1}`,
        preset: presetById(select.value),
        materialId: material?.value ?? null
      };
    })
    .filter((item) => item.preset);
}
function currentLengthM() {
  const value = Number(document.getElementById('compareLengthInput')?.value);
  return Number.isFinite(value) && value > 0 ? value : 3;
}
function effectiveLedger() {
  return buildPriceLedger({
    observations: PH_PRICE_OBSERVATIONS,
    overrides: loadOverrides(),
    asOf: new Date().toISOString(),
    staleAfterDays: PRICE_SOURCE_POLICY.staleAfterDays
  });
}
function slotEconomics(slot, ledger, lengthM) {
  const effectivePrice = effectivePriceForPreset({ preset: slot.preset, ledger });
  const economics = memberProcurementEconomics({
    preset: slot.preset,
    requiredLengthM: lengthM,
    massPerM: Number.isFinite(slot.preset.publishedMassKgM) ? slot.preset.publishedMassKgM : null,
    effectivePrice
  });
  return { ...slot, effectivePrice, economics };
}
function sourceBadge(item) {
  const status = item.effectivePrice.status;
  if (status === 'MANUAL_OVERRIDE') return '<span class="price-badge price-badge--manual">MANUAL / PROJECT</span>';
  if (status === 'WEB_OBSERVED') return '<span class="price-badge price-badge--web">WEB OBSERVED</span>';
  if (status === 'STALE_WEB_OBSERVATION') return '<span class="price-badge price-badge--stale">STALE WEB</span>';
  return '<span class="price-badge">NO PRICE</span>';
}
function sourceLine(item) {
  const selected = item.effectivePrice.selected;
  if (!selected) return 'No matching current price observation. Enter a project/supplier price below.';
  const age = selected.ageDays == null ? '' : ` · ${format(selected.ageDays, 1)} day${selected.ageDays > 1 ? 's' : ''} old`;
  const availability = selected.availability ? ` · ${selected.availability}` : '';
  return `${selected.supplier}${selected.supplierProduct ? ` · ${selected.supplierProduct}` : ''}${availability}${age}`;
}
function overrideForPreset(presetId) { return loadOverrides().find((item) => item.presetId === presetId) ?? null; }

function ensureStyles() {
  if (document.getElementById('comparisonEconomicsStyles')) return;
  const style = document.createElement('style');
  style.id = 'comparisonEconomicsStyles';
  style.textContent = `
    .compare-economics{margin-top:1rem;padding-top:1rem;border-top:1px solid var(--line,#c9c1ad)}
    .compare-economics-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem;margin-top:.8rem}
    .compare-economics-card{border:1px solid var(--line,#c9c1ad);border-radius:10px;padding:.9rem;background:color-mix(in srgb,var(--paper,#fff) 92%,transparent)}
    .compare-economics-card h4{margin:.15rem 0 .45rem;font-size:1rem}.compare-economics-card dl{display:grid;grid-template-columns:1fr auto;gap:.3rem .7rem;margin:.6rem 0}
    .compare-economics-card dt{font-size:.78rem;opacity:.78}.compare-economics-card dd{margin:0;font-weight:700;text-align:right}
    .price-badge{display:inline-flex;border:1px solid currentColor;border-radius:999px;padding:.12rem .45rem;font-size:.68rem;font-weight:800;letter-spacing:.04em}.price-badge--manual{color:#835a05}.price-badge--web{color:#126b5f}.price-badge--stale{color:#9a4b22}
    .price-source{font-size:.75rem;line-height:1.35;opacity:.78;min-height:2.3rem}.price-override-grid{display:grid;grid-template-columns:1fr 1fr;gap:.45rem}.price-override-grid label{font-size:.72rem}.price-override-grid input{width:100%}
    .price-override-actions{display:flex;gap:.4rem;margin-top:.55rem;flex-wrap:wrap}.price-override-actions button{font-size:.75rem;padding:.35rem .55rem}
    .price-policy{font-size:.78rem;opacity:.82;margin:.65rem 0 0}.price-cheapest{outline:2px solid currentColor;outline-offset:2px}
    @media(max-width:900px){.compare-economics-grid{grid-template-columns:1fr}}
    @media print{.price-override-grid,.price-override-actions{display:none!important}}
  `;
  document.head.append(style);
}

function renderPanel() {
  ensureStyles();
  const membersSection = document.querySelector('.compare-members');
  if (!membersSection) return;
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'compare-economics';
    panel.setAttribute('aria-label', 'Price intelligence and procurement economics');
    membersSection.append(panel);
  }
  const ledger = effectiveLedger();
  const lengthM = currentLengthM();
  const items = selectedSlots().map((slot) => slotEconomics(slot, ledger, lengthM));
  const priced = items.filter((item) => Number.isFinite(item.economics.procurementCost));
  const cheapest = priced.reduce((best, item) => (!best || item.economics.procurementCost < best.economics.procurementCost - EPS ? item : best), null);
  panel.innerHTML = `
    <div class="panel-heading"><div><p class="eyebrow">Economics · Price Intelligence v1</p><h3>Material procurement comparison</h3></div><span class="status-pill">price ≠ engineering evidence</span></div>
    <p class="price-policy">${esc(PRICE_SOURCE_POLICY.note)} Economics v1 covers material stock-piece purchase cost only; labor, delivery, tax, fabrication, installation, connections and lifecycle cost remain separate.</p>
    <div class="compare-economics-grid">${items.map((item) => {
      const selected = item.effectivePrice.selected;
      const override = overrideForPreset(item.preset.id);
      const isCheapest = cheapest?.preset.id === item.preset.id;
      return `<article class="compare-economics-card ${isCheapest ? 'price-cheapest' : ''}" data-price-card="${esc(item.preset.id)}">
        <div>${sourceBadge(item)}${isCheapest ? ' <span class="compare-winner-chip">Lowest current material cost</span>' : ''}</div>
        <h4>${esc(item.label)} · ${esc(item.preset.label ?? item.preset.id)}</h4>
        <p class="price-source">${esc(sourceLine(item))}</p>
        <dl>
          <dt>Effective price / stock piece</dt><dd>${selected ? peso(selected.unitPrice) : '—'}</dd>
          <dt>Stock length</dt><dd>${selected ? `${format(selected.stockLengthM, 2)} m` : '—'}</dd>
          <dt>Pieces to purchase</dt><dd>${item.economics.stockPieces ?? '—'}</dd>
          <dt>Procurement material cost</dt><dd>${peso(item.economics.procurementCost)}</dd>
          <dt>Purchased length</dt><dd>${Number.isFinite(item.economics.purchasedLengthM) ? `${format(item.economics.purchasedLengthM, 2)} m` : '—'}</dd>
          <dt>Visible stock-length excess</dt><dd>${Number.isFinite(item.economics.wasteLengthM) ? `${format(item.economics.wasteLengthM, 2)} m` : '—'}</dd>
        </dl>
        <div class="price-override-grid">
          <label>Override ₱ / stock piece<input type="number" min="0.01" step="0.01" data-price-value="${esc(item.preset.id)}" value="${override?.unitPrice ?? ''}" placeholder="e.g. 620" /></label>
          <label>Stock length, m<input type="number" min="0.1" step="0.1" data-price-length="${esc(item.preset.id)}" value="${override?.stockLengthM ?? selected?.stockLengthM ?? item.preset.maxLengthM ?? 6}" /></label>
          <label>Supplier<input type="text" data-price-supplier="${esc(item.preset.id)}" value="${esc(override?.supplier ?? '')}" placeholder="supplier / hardware" /></label>
          <label>Quote / source ref<input type="text" data-price-source="${esc(item.preset.id)}" value="${esc(override?.sourceReference ?? '')}" placeholder="quote no., receipt, call/date" /></label>
        </div>
        <div class="price-override-actions"><button class="button" type="button" data-price-save="${esc(item.preset.id)}">Use my actual price</button>${override ? `<button class="button" type="button" data-price-clear="${esc(item.preset.id)}">Return to web price</button>` : ''}</div>
      </article>`;
    }).join('')}</div>`;

  panel.querySelectorAll('[data-price-save]').forEach((button) => button.addEventListener('click', () => {
    const presetId = button.dataset.priceSave;
    const price = Number(panel.querySelector(`[data-price-value="${CSS.escape(presetId)}"]`)?.value);
    const stockLengthM = Number(panel.querySelector(`[data-price-length="${CSS.escape(presetId)}"]`)?.value);
    const supplier = panel.querySelector(`[data-price-supplier="${CSS.escape(presetId)}"]`)?.value.trim();
    const sourceReference = panel.querySelector(`[data-price-source="${CSS.escape(presetId)}"]`)?.value.trim();
    if (!(price > 0) || !(stockLengthM > 0) || !sourceReference) {
      alert('Enter a positive actual price, stock length, and a quote/source reference.');
      return;
    }
    const existing = loadOverrides().filter((item) => item.presetId !== presetId);
    existing.push({
      schemaVersion: PRICE_OVERRIDE_SCHEMA,
      id: `manual-${presetId}`,
      presetId,
      supplier: supplier || 'Manual / project override',
      supplierProduct: presetById(presetId)?.label ?? presetId,
      sourceReference,
      enteredAt: new Date().toISOString(),
      unitPrice: price,
      stockLengthM,
      availability: 'user-confirmed / verify before PO',
      note: 'Manual price entered in Structural Member Comparison.'
    });
    saveOverrides(existing);
    renderEconomics();
  }));
  panel.querySelectorAll('[data-price-clear]').forEach((button) => button.addEventListener('click', () => {
    saveOverrides(loadOverrides().filter((item) => item.presetId !== button.dataset.priceClear));
    renderEconomics();
  }));
  renderTableEconomics(items);
}

function renderTableEconomics(items) {
  const body = document.getElementById('compareTableBody');
  if (!body) return;
  body.querySelectorAll('[data-economics-row]').forEach((row) => row.remove());
  const byIndex = new Map(items.map((item) => [item.index, item]));
  const priced = items.filter((item) => Number.isFinite(item.economics.procurementCost));
  const cheapest = priced.reduce((best, item) => (!best || item.economics.procurementCost < best.economics.procurementCost - EPS ? item : best), null);
  const cells = [0, 1, 2].map((index) => {
    const item = byIndex.get(index);
    if (!item) return '<td class="is-hidden-column">—</td>';
    const winning = cheapest?.index === index;
    const source = item.effectivePrice.selected;
    return `<td class="${winning ? 'is-metric-winner' : ''}">${winning ? '★ ' : ''}${peso(item.economics.procurementCost)}<small>${source ? `${item.economics.stockPieces} × ${peso(source.unitPrice)} · ${esc(item.effectivePrice.status.replaceAll('_', ' '))}` : 'price unavailable / enter override'}</small></td>`;
  }).join('');
  const row = document.createElement('tr');
  row.dataset.economicsRow = 'procurement-cost';
  row.innerHTML = `<th><span class="help-term" tabindex="0" data-help="Material purchase cost from the current selected stock-piece price and required stock pieces. It does not change engineering PASS/FAIL and excludes labor, delivery, tax, fabrication, installation and connection cost.">Procurement material cost <span class="help-icon" aria-hidden="true">i</span></span></th>${cells}`;
  body.append(row);
}

let scheduled = false;
function renderEconomics() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    renderPanel();
  });
}

function installObservers() {
  const selectors = document.getElementById('compareSelectors');
  const tableBody = document.getElementById('compareTableBody');
  if (selectors) new MutationObserver(renderEconomics).observe(selectors, { childList: true, subtree: true });
  if (tableBody) new MutationObserver(() => {
    if (!tableBody.querySelector('[data-economics-row]')) renderEconomics();
  }).observe(tableBody, { childList: true });
  document.addEventListener('change', (event) => {
    if (event.target.closest?.('#compareSelectors') || event.target.id === 'compareLengthInput') renderEconomics();
  });
  document.getElementById('compareLengthInput')?.addEventListener('input', renderEconomics);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { installObservers(); renderEconomics(); }, { once: true });
} else {
  installObservers();
  renderEconomics();
}
