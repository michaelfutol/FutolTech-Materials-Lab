import { convertLoadToKN, formatLoadEquivalents } from '../utils/loadUnits.js';

const configurations = [
  { inputId: 'loadInput', fixedUnit: 'kN' },
  { inputId: 'yieldPeakLoadInput', fixedUnit: 'kN' },
  { inputId: 'spliceLoadInput', fixedUnit: 'kN' },
  { inputId: 'recommendLoadInput', unitSelectId: 'recommendLoadUnitSelect' }
];

function installDisplay({ inputId, fixedUnit = null, unitSelectId = null }) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const unitSelect = unitSelectId ? document.getElementById(unitSelectId) : null;
  const container = input.closest('label') ?? input.parentElement;
  if (!container) return;

  const output = document.createElement('small');
  output.className = 'load-equivalent';
  output.id = `${inputId}Equivalent`;
  output.setAttribute('aria-live', 'polite');
  container.appendChild(output);

  const update = () => {
    try {
      const value = Number(input.value);
      const unit = unitSelect?.value ?? fixedUnit ?? 'kN';
      const loadKN = convertLoadToKN(value, unit);
      output.textContent = `${formatLoadEquivalents(loadKN)} · kgf = familiar weight-equivalent`;
      output.classList.remove('load-equivalent--error');
    } catch (error) {
      output.textContent = error instanceof Error ? error.message : String(error);
      output.classList.add('load-equivalent--error');
    }
  };

  input.addEventListener('input', update);
  input.addEventListener('change', update);
  unitSelect?.addEventListener('input', update);
  unitSelect?.addEventListener('change', update);
  update();
}

configurations.forEach(installDisplay);
