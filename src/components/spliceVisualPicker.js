import { getMaterial } from '../data/materials.js';
import { getSpliceCatalogItem, spliceCatalogForFamily } from '../data/spliceCatalog.js';

const materialSelect = document.getElementById('spliceMaterialSelect');
const typeSelect = document.getElementById('spliceTypeSelect');
const picker = document.getElementById('spliceVisualPicker');
const detail = document.getElementById('spliceVisualDetail');

if (!materialSelect || !typeSelect || !picker || !detail) {
  throw new Error('Visual splice picker cannot find its required controls.');
}

function activeFamily() {
  try {
    return getMaterial(materialSelect.value).family;
  } catch {
    return null;
  }
}

function availableOptionValues() {
  return new Set([...typeSelect.options].map((option) => option.value));
}

function renderDetail(item) {
  if (!item) {
    detail.innerHTML = '<p>Select a splice diagram to see its intended force path and current modelling boundary.</p>';
    return;
  }

  detail.innerHTML = `
    <div class="splice-visual-detail__diagram">${item.svg}</div>
    <div>
      <p class="eyebrow">Selected splice concept</p>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <p><strong>Watch:</strong> ${item.caution}</p>
      <div class="splice-tag-row">${item.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
    </div>
  `;
}

function selectCard(value, { dispatch = true } = {}) {
  if (!availableOptionValues().has(value)) return;
  typeSelect.value = value;
  for (const card of picker.querySelectorAll('.splice-choice-card')) {
    const selected = card.dataset.value === value;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-checked', selected ? 'true' : 'false');
    card.tabIndex = selected ? 0 : -1;
  }
  renderDetail(getSpliceCatalogItem(value));
  if (dispatch) typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
}

function cardMarkup(item, selected) {
  return `
    <button
      type="button"
      class="splice-choice-card${selected ? ' is-selected' : ''}"
      role="radio"
      aria-checked="${selected ? 'true' : 'false'}"
      tabindex="${selected ? '0' : '-1'}"
      data-value="${item.id}"
    >
      <span class="splice-choice-card__image">${item.svg}</span>
      <span class="splice-choice-card__copy">
        <strong>${item.title}</strong>
        <small>${item.subtitle}</small>
      </span>
      <span class="splice-choice-card__check" aria-hidden="true">✓</span>
    </button>
  `;
}

function renderPicker() {
  const family = activeFamily();
  if (!family) return;
  const supported = availableOptionValues();
  const cards = spliceCatalogForFamily(family).filter((item) => supported.has(item.id));
  if (cards.length === 0) return;

  const currentValue = supported.has(typeSelect.value) ? typeSelect.value : cards[0].id;
  picker.innerHTML = cards.map((item) => cardMarkup(item, item.id === currentValue)).join('');
  picker.setAttribute('aria-label', `${family === 'wood' ? 'Timber' : 'Steel'} splice concepts`);
  selectCard(currentValue, { dispatch: false });
}

picker.addEventListener('click', (event) => {
  const card = event.target.closest('.splice-choice-card');
  if (!card) return;
  selectCard(card.dataset.value);
});

picker.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const cards = [...picker.querySelectorAll('.splice-choice-card')];
  if (cards.length === 0) return;
  const currentIndex = Math.max(0, cards.findIndex((card) => card.dataset.value === typeSelect.value));
  let nextIndex = currentIndex;
  if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = cards.length - 1;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + cards.length) % cards.length;
  else nextIndex = (currentIndex + 1) % cards.length;
  event.preventDefault();
  selectCard(cards[nextIndex].dataset.value);
  cards[nextIndex].focus();
});

typeSelect.addEventListener('change', () => selectCard(typeSelect.value, { dispatch: false }));
materialSelect.addEventListener('change', () => requestAnimationFrame(renderPicker));
new MutationObserver(renderPicker).observe(typeSelect, { childList: true });

requestAnimationFrame(renderPicker);
