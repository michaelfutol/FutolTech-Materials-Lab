import { customRoofBayPurlinLayout } from './solver/roofBay.js';

const root = document.querySelector('[data-roof-bay-app]');

function parseStations(text) {
  return String(text ?? '')
    .trim()
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);
}

function formatStations(stations = []) {
  return stations.map((value) => Number(value).toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?[1-9])0+$/, '$1')).join(', ');
}

if (root) {
  const spacing = root.querySelector('[data-rb-spacing]');
  const length = root.querySelector('[data-rb-length]');
  const reset = root.querySelector('[data-rb-reset]');
  const spacingLabel = spacing?.closest('label');

  if (spacing && length && spacingLabel) {
    const modeLabel = document.createElement('label');
    modeLabel.innerHTML = '<span>Purlin layout mode</span><select data-rb-layout-mode><option value="equal-max-spacing" selected>Equalized maximum spacing</option><option value="custom-stations">Custom station list</option></select>';

    const customLabel = document.createElement('label');
    customLabel.innerHTML = '<span>Custom stations along slope, m</span><input data-rb-custom-stations type="text" inputmode="decimal" placeholder="0, 0.65, 1.40, 2.30, 3.20, 4.00" disabled /><small data-rb-layout-status style="color:var(--muted);line-height:1.35">Equalized layout active.</small>';

    spacingLabel.insertAdjacentElement('afterend', modeLabel);
    modeLabel.insertAdjacentElement('afterend', customLabel);

    const mode = modeLabel.querySelector('[data-rb-layout-mode]');
    const custom = customLabel.querySelector('[data-rb-custom-stations]');
    const status = customLabel.querySelector('[data-rb-layout-status]');
    let lastValid = null;

    function show(message, ok = true) {
      status.textContent = message;
      status.style.color = ok ? 'var(--muted)' : '#ff7777';
    }

    function applyCustom({ seedFromModel = false, trigger = false } = {}) {
      if (mode.value !== 'custom-stations') {
        window.__FT_ROOF_BAY_CUSTOM_STATIONS__ = null;
        lastValid = null;
        spacing.disabled = false;
        custom.disabled = true;
        show('Equalized layout active. Requested spacing remains the maximum.');
        if (trigger) spacing.dispatchEvent(new Event('input', { bubbles:true }));
        return true;
      }

      spacing.disabled = true;
      custom.disabled = false;
      if (seedFromModel && !custom.value.trim()) {
        const current = window.__FT_ROOF_BAY_MODEL__?.geometry?.stationsM;
        if (Array.isArray(current) && current.length >= 2) custom.value = formatStations(current);
      }

      const stations = parseStations(custom.value);
      try {
        const layout = customRoofBayPurlinLayout(Number(length.value), stations);
        lastValid = [...layout.stationsM];
        window.__FT_ROOF_BAY_CUSTOM_STATIONS__ = [...layout.stationsM];
        show(`Custom layout applied · ${layout.stationsM.length} rows · gaps ${formatStations([layout.minSpacingM, layout.maxSpacingM])} m.`);
        if (trigger) spacing.dispatchEvent(new Event('input', { bubbles:true }));
        return true;
      } catch (error) {
        if (lastValid) window.__FT_ROOF_BAY_CUSTOM_STATIONS__ = [...lastValid];
        show(`${error.message} Edit not applied; last valid layout remains active.`, false);
        return false;
      }
    }

    mode.addEventListener('change', () => applyCustom({ seedFromModel:true, trigger:true }));
    custom.addEventListener('input', () => applyCustom());
    custom.addEventListener('change', () => applyCustom({ trigger:true }));
    length.addEventListener('input', () => {
      if (mode.value === 'custom-stations') applyCustom();
    }, true);
    reset?.addEventListener('click', () => {
      mode.value = 'equal-max-spacing';
      custom.value = '';
      lastValid = null;
      window.__FT_ROOF_BAY_CUSTOM_STATIONS__ = null;
      spacing.disabled = false;
      custom.disabled = true;
      show('Equalized layout active.');
    });

    window.__FT_ROOF_BAY_LAYOUT_UI__ = {
      mode,
      custom,
      status,
      apply: () => applyCustom({ trigger:true })
    };
  }
}
