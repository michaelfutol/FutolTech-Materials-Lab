import { MATERIALS } from './data/materials.js';
import { PH_BAMBOO_MATERIALS } from './data/phBambooMaterials.js';
import { presetsForFamily } from './data/sectionPresets.js';
import { sectionSketchSvg } from './components/sectionSketch.js';
import { compareMemberCandidates } from './solver/memberComparison.js';
import { convertLoadToKN, loadEquivalentsFromKN } from './utils/loadUnits.js';

const ACTIVE_MATERIALS = [...MATERIALS, ...PH_BAMBOO_MATERIALS];
const ROOT_FLAG = '__FT_BEAM_CLARITY_V1__';
const EPS = 1e-9;

function compact(value, decimals = 2) {
  return Number.isFinite(value)
    ? Number(value).toFixed(decimals).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
    : '—';
}

function materialById(id) {
  return ACTIVE_MATERIALS.find((material) => material.id === id) ?? null;
}

function presetById(material, id) {
  return presetsForFamily(material.family).find((preset) => preset.id === id) ?? null;
}

function isBeamMode() {
  return !document.getElementById('compareColumnModeButton')?.classList.contains('is-active');
}

function currentSelections() {
  const cards = [...document.querySelectorAll('#compareSelectors .compare-selector-card')]
    .filter((card) => !card.classList.contains('is-disabled'));
  return cards.map((card) => {
    const materialSelect = card.querySelector('[data-slot-material]');
    const presetSelect = card.querySelector('[data-slot-preset]');
    const orientationSelect = card.querySelector('[data-slot-orientation]');
    if (!materialSelect || !presetSelect || !orientationSelect) throw new Error('Comparison selection is incomplete.');
    const index = Number(presetSelect.dataset.slotPreset);
    const material = materialById(materialSelect.value);
    const preset = material ? presetById(material, presetSelect.value) : null;
    if (!material || !preset) throw new Error(`Member ${index + 1} could not be resolved.`);
    return {
      id: `member-${String.fromCharCode(97 + index)}`,
      label: `Member ${String.fromCharCode(65 + index)}`,
      material,
      preset,
      orientation: orientationSelect.value
    };
  });
}

function currentBeamConditions() {
  return {
    lengthM: Number(document.getElementById('compareLengthInput')?.value ?? 0),
    loadPositionM: Number(document.getElementById('compareLoadPositionInput')?.value ?? 0),
    boundary: document.getElementById('compareBoundarySelect')?.value ?? 'simply-supported',
    deflectionDivisor: Number(document.getElementById('compareDeflectionSelect')?.value ?? 360)
  };
}

function inputLoadKN() {
  try {
    return convertLoadToKN(
      Number(document.getElementById('compareLoadInput')?.value ?? 0),
      document.getElementById('compareLoadUnitSelect')?.value ?? 'kN'
    );
  } catch {
    return 0;
  }
}

function thresholdBasis(record) {
  if (record.family === 'steel') return 'First-yield estimate';
  if (record.family === 'bamboo') return 'Characteristic bending estimate';
  return 'Published rupture estimate';
}

function signature() {
  const values = [
    isBeamMode(),
    document.getElementById('compareLengthInput')?.value,
    document.getElementById('compareLoadPositionInput')?.value,
    document.getElementById('compareBoundarySelect')?.value,
    document.getElementById('compareDeflectionSelect')?.value,
    ...[...document.querySelectorAll('#compareSelectors [data-slot-material], #compareSelectors [data-slot-preset], #compareSelectors [data-slot-orientation]')]
      .map((node) => node.value),
    ...[...document.querySelectorAll('#compareSelectors .compare-selector-card')].map((card) => !card.classList.contains('is-disabled'))
  ];
  return JSON.stringify(values);
}

function injectStyles() {
  if (document.getElementById('ft-beam-clarity-v1-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-beam-clarity-v1-style';
  style.textContent = `
    .comparison-response-svg .ft-point-load-arrow { stroke:#ffd36a; stroke-width:2.4; fill:none; }
    .comparison-response-svg .ft-point-load-arrowhead { fill:#ffd36a; }
    .comparison-response-svg .ft-point-load-label { fill:#ffd36a; font:700 9px system-ui,sans-serif; }
    html[data-ft-theme="paper-matte"] .comparison-response-svg .ft-point-load-arrow { stroke:#8b4f00; }
    html[data-ft-theme="paper-matte"] .comparison-response-svg .ft-point-load-arrowhead,
    html[data-ft-theme="paper-matte"] .comparison-response-svg .ft-point-load-label { fill:#8b4f00; }
    .beam-strength-progression { margin-top:1rem; padding:1rem; border:1px solid rgba(93,224,197,.40); border-radius:14px; background:rgba(4,18,27,.62); }
    .beam-strength-progression__head { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; flex-wrap:wrap; }
    .beam-strength-progression__head h3 { margin:.15rem 0; }
    .beam-strength-progression__note { max-width:72rem; opacity:.82; }
    .beam-strength-progression__controls { display:grid; grid-template-columns:minmax(150px,220px) minmax(150px,220px) 1fr; gap:.65rem; align-items:end; margin:.8rem 0; }
    .beam-strength-progression__controls label { display:grid; gap:.3rem; }
    .beam-strength-progression__buttons { display:flex; gap:.45rem; flex-wrap:wrap; }
    .beam-strength-progression__timeline { display:grid; grid-template-columns:auto 1fr auto; gap:.65rem; align-items:center; }
    .beam-strength-progression__timeline input { width:100%; }
    .beam-strength-progression__cards { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.65rem; margin-top:.8rem; }
    .beam-strength-card { min-width:0; border:1px solid rgba(132,164,177,.35); border-radius:12px; padding:.7rem; background:rgba(2,13,20,.48); }
    .beam-strength-card.is-service-exceeded { border-color:rgba(242,190,79,.70); }
    .beam-strength-card.is-limit { border-color:rgba(255,118,118,.78); }
    .beam-strength-card.is-last { box-shadow:inset 0 0 0 1px rgba(93,224,197,.65); }
    .beam-strength-card__head { display:grid; grid-template-columns:76px 1fr; gap:.55rem; align-items:center; }
    .beam-strength-card__head svg { width:72px; height:68px; }
    .beam-strength-card__status { font-weight:900; letter-spacing:.04em; }
    .beam-strength-card__status.is-active { color:#5de0c5; }
    .beam-strength-card__status.is-service { color:#f2be4f; }
    .beam-strength-card__status.is-limit { color:#ff7676; }
    .beam-strength-card__visual { width:100%; height:128px; display:block; margin:.45rem 0; }
    .beam-strength-card__visual .base { stroke:#728694; stroke-width:1; stroke-dasharray:5 5; }
    .beam-strength-card__visual .beam { stroke:#5de0c5; stroke-width:3; fill:none; }
    .beam-strength-card__visual .load { stroke:#ffd36a; stroke-width:3; }
    .beam-strength-card__visual .load-head { fill:#ffd36a; }
    .beam-strength-card__visual .load-text { fill:#ffd36a; font:700 11px system-ui,sans-serif; }
    .beam-strength-card__visual .support { stroke:#728694; stroke-width:1.4; fill:none; }
    .beam-strength-card__metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.35rem; }
    .beam-strength-card__metrics div { border:1px solid rgba(132,164,177,.22); border-radius:8px; padding:.38rem .45rem; }
    .beam-strength-card__metrics small { display:block; opacity:.7; }
    .beam-strength-progression__boundary { margin:.75rem 0 0; opacity:.8; font-size:.9em; }
    .threshold-clarity-note { margin:.65rem 0; padding:.7rem .8rem; border-left:3px solid rgba(93,224,197,.7); background:rgba(93,224,197,.07); }
    @media (max-width:1000px) { .beam-strength-progression__cards { grid-template-columns:1fr; } .beam-strength-progression__controls { grid-template-columns:1fr; } }
    @media print { .beam-strength-progression { display:none !important; } }
  `;
  document.head.appendChild(style);
}

function patchSharedBeamArrows() {
  if (!isBeamMode()) return;
  const conditions = currentBeamConditions();
  if (!(conditions.lengthM > 0)) return;
  const ratio = Math.max(0, Math.min(1, conditions.loadPositionM / conditions.lengthM));
  const x = 10 + ratio * 240;
  document.querySelectorAll('.comparison-playback-card .comparison-response-svg').forEach((svg) => {
    if (svg.querySelector('[data-ft-point-load-arrow]')) return;
    svg.insertAdjacentHTML('beforeend', `
      <g data-ft-point-load-arrow aria-label="Point load location">
        <line class="ft-point-load-arrow" x1="${x.toFixed(2)}" y1="4" x2="${x.toFixed(2)}" y2="24"/>
        <path class="ft-point-load-arrowhead" d="M ${(x - 5).toFixed(2)} 19 L ${x.toFixed(2)} 29 L ${(x + 5).toFixed(2)} 19 Z"/>
        <text class="ft-point-load-label" x="${Math.min(244, x + 7).toFixed(2)}" y="12">P</text>
      </g>`);
  });
}

function replaceTerminology(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const before = node.nodeValue;
    const after = before
      .replace(/Highest physical threshold/g, 'Highest strength-limit estimate')
      .replace(/Highest threshold/g, 'Highest strength-limit estimate')
      .replace(/Physical threshold load/g, 'Strength-limit estimate');
    if (after !== before) node.nodeValue = after;
  }
  root.querySelectorAll?.('[data-help]').forEach((node) => {
    const help = node.getAttribute('data-help') || '';
    if (help.includes('Estimated load corresponding to first steel yield')) {
      node.setAttribute('data-help', 'Source-specific strength-limit estimate: first steel yield for steel and the selected characteristic/rupture bending reference for natural materials. It is separate from shared-load serviceability PASS/FAIL and is not automatically an allowable design load.');
    }
  });
}

function maintainClarityNote() {
  const summary = document.getElementById('compareSummary');
  if (!summary || !isBeamMode()) return;
  let note = summary.parentElement?.querySelector('[data-threshold-clarity-note]');
  if (!note) {
    note = document.createElement('div');
    note.className = 'threshold-clarity-note';
    note.dataset.thresholdClarityNote = 'true';
    summary.insertAdjacentElement('afterend', note);
  }
  note.innerHTML = '<strong>Two different questions:</strong> PASS/FAIL above is acceptance at the selected shared service/design load. The strength-limit estimate below is a separate source-specific physical reference used only for progressive last-to-limit comparison.';
}

function solveProbe() {
  const selections = currentSelections();
  const conditions = currentBeamConditions();
  const probeLoad = Math.max(0.25, inputLoadKN(), EPS);
  const result = compareMemberCandidates({
    selections,
    lengthM: conditions.lengthM,
    loadKN: probeLoad,
    loadPositionM: conditions.loadPositionM,
    boundary: conditions.boundary,
    deflectionDivisor: conditions.deflectionDivisor
  });
  const records = result.records.map((record) => ({
    ...record,
    strengthLimitKN: record.physicalThresholdLoadKN,
    serviceLimitKN: Number.isFinite(record.deflectionRatio) && record.deflectionRatio > 0
      ? probeLoad / record.deflectionRatio
      : null,
    limitBasis: thresholdBasis(record),
    probeLoadKN: probeLoad
  }));
  const finite = records.filter((record) => Number.isFinite(record.strengthLimitKN) && record.strengthLimitKN > 0);
  const ordered = [...finite].sort((a, b) => a.strengthLimitKN - b.strengthLimitKN);
  const maxStrengthKN = ordered.at(-1)?.strengthLimitKN ?? 0;
  const orderById = Object.fromEntries(ordered.map((record, index) => [record.comparisonId, index + 1]));
  return { selections, conditions, records, maxStrengthKN, orderById };
}

function scaledSeries(record, memberLoadKN) {
  const factor = record.probeLoadKN > 0 ? memberLoadKN / record.probeLoadKN : 0;
  const series = Array.isArray(record.result?.deflectionSeries) ? record.result.deflectionSeries : [];
  return series.map((point) => ({ xM: point.xM, displacementMm: point.displacementMm * factor }));
}

function beamSvg(record, memberLoadKN, conditions, scale) {
  const series = scaledSeries(record, memberLoadKN);
  const x0 = 24, x1 = 276, y0 = 78;
  const lengthM = conditions.lengthM || 1;
  const path = series.length >= 2
    ? series.map((point, index) => {
      const x = x0 + (point.xM / lengthM) * (x1 - x0);
      const y = y0 - point.displacementMm * scale;
      return `${index ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ')
    : `M ${x0} ${y0} L ${x1} ${y0}`;
  const loadRatio = Math.max(0, Math.min(1, conditions.loadPositionM / lengthM));
  const loadX = x0 + loadRatio * (x1 - x0);
  let nearestY = y0;
  if (series.length) {
    let nearest = series[0];
    for (const point of series) if (Math.abs(point.xM - conditions.loadPositionM) < Math.abs(nearest.xM - conditions.loadPositionM)) nearest = point;
    nearestY = y0 - nearest.displacementMm * scale;
  }
  const label = `P = ${compact(loadEquivalentsFromKN(memberLoadKN).kgf, 0)} kgf`;
  return `<svg class="beam-strength-card__visual" viewBox="0 0 300 128" role="img" aria-label="Progressive point-load bending response">
    <line class="base" x1="24" y1="78" x2="276" y2="78"/>
    <path class="beam" d="${path}"/>
    <line class="load" x1="${loadX.toFixed(2)}" y1="18" x2="${loadX.toFixed(2)}" y2="${Math.max(33, nearestY - 2).toFixed(2)}"/>
    <path class="load-head" d="M ${(loadX - 7).toFixed(2)} ${(Math.max(34, nearestY - 14)).toFixed(2)} L ${loadX.toFixed(2)} ${Math.max(35, nearestY).toFixed(2)} L ${(loadX + 7).toFixed(2)} ${(Math.max(34, nearestY - 14)).toFixed(2)} Z"/>
    <text class="load-text" x="${Math.min(205, loadX + 9).toFixed(2)}" y="15">${label}</text>
    <path class="support" d="M 24 79 l -9 15 h 18 z M 276 79 l -9 15 h 18 z"/>
  </svg>`;
}

function mountProgression(playback) {
  if (playback.querySelector('[data-beam-strength-progression]')) return;
  const section = document.createElement('section');
  section.className = 'beam-strength-progression';
  section.dataset.beamStrengthProgression = 'true';
  section.innerHTML = `
    <div class="beam-strength-progression__head">
      <div><p class="eyebrow">STRENGTH-LIMIT-001 · independent virtual specimens</p><h3>Progressive strength-limit test</h3><p class="beam-strength-progression__note">Each member is loaded independently along the same virtual ramp. When its source-specific strength limit is reached, that specimen freezes at its own final point load. The last specimen to reach its strength limit therefore carries the largest displayed final load.</p></div>
    </div>
    <div class="beam-strength-progression__controls">
      <label><span>Virtual loading rate, kN/s</span><input type="number" min="0.001" step="0.05" value="0.5" data-strength-rate></label>
      <label><span>Playback speed</span><select data-strength-speed><option value="1">×1</option><option value="5">×5</option><option value="10" selected>×10</option><option value="25">×25</option></select></label>
      <div class="beam-strength-progression__buttons"><button type="button" class="button" data-strength-play>PLAY TO STRENGTH LIMITS</button><button type="button" class="button button--ghost" data-strength-reset>RESET</button></div>
    </div>
    <div class="beam-strength-progression__timeline"><span data-strength-time>t = 0.00 s</span><input type="range" min="0" max="1000" step="1" value="0" data-strength-scrub aria-label="Progressive strength-limit progress"><span data-strength-load>Ramp P = 0 kN</span></div>
    <div class="beam-strength-progression__cards" data-strength-cards></div>
    <p class="beam-strength-progression__boundary">This is a source-specific strength-limit comparison, not the shared-load serviceability PASS/FAIL test above and not an allowable-design or certified rupture test. Steel stops at first-yield estimate; natural materials stop at the available characteristic/rupture bending reference. Service-limit crossing is shown separately and does not stop this strength-limit playback.</p>`;
  playback.appendChild(section);

  const session = { progress: 0, playing: false, lastStamp: null, data: null, signature: '' };
  const rateInput = section.querySelector('[data-strength-rate]');
  const speedSelect = section.querySelector('[data-strength-speed]');
  const scrub = section.querySelector('[data-strength-scrub]');
  const playButton = section.querySelector('[data-strength-play]');

  function rate() {
    const value = Number(rateInput.value);
    return Number.isFinite(value) && value > 0 ? value : 0.5;
  }

  function refreshData(force = false) {
    const nextSignature = signature();
    if (!force && nextSignature === session.signature && session.data) return;
    session.signature = nextSignature;
    session.progress = 0;
    session.playing = false;
    session.lastStamp = null;
    scrub.value = '0';
    try { session.data = isBeamMode() ? solveProbe() : null; }
    catch (error) {
      session.data = null;
      section.querySelector('[data-strength-cards]').innerHTML = `<p>${error.message || String(error)}</p>`;
    }
  }

  function render() {
    section.hidden = !isBeamMode();
    if (section.hidden) return;
    refreshData();
    const data = session.data;
    if (!data || !(data.maxStrengthKN > 0)) return;
    const rampLoadKN = session.progress * data.maxStrengthKN;
    const timeS = rampLoadKN / rate();
    section.querySelector('[data-strength-time]').textContent = `t = ${compact(timeS,2)} s`;
    section.querySelector('[data-strength-load]').textContent = `Ramp P = ${compact(rampLoadKN,3)} kN`;
    scrub.value = String(Math.round(session.progress * 1000));

    const current = data.records.map((record) => {
      const limit = Number.isFinite(record.strengthLimitKN) ? record.strengthLimitKN : 0;
      const memberLoadKN = Math.min(rampLoadKN, limit || rampLoadKN);
      const factor = record.probeLoadKN > 0 ? memberLoadKN / record.probeLoadKN : 0;
      return {
        record,
        memberLoadKN,
        deflectionMm: (record.result?.maxDeflectionMm ?? 0) * factor,
        stressMPa: (record.result?.maxBendingStressMPa ?? 0) * factor,
        momentKNm: (record.result?.maxMomentKNm ?? 0) * factor
      };
    });
    const maxDef = Math.max(0.001, ...current.map((item) => Math.abs(item.deflectionMm)));
    const commonScale = Math.min(28 / maxDef, 12);

    section.querySelector('[data-strength-cards]').innerHTML = current.map((item) => {
      const { record, memberLoadKN } = item;
      const strengthReached = Number.isFinite(record.strengthLimitKN) && rampLoadKN + 1e-8 >= record.strengthLimitKN;
      const serviceExceeded = Number.isFinite(record.serviceLimitKN) && rampLoadKN + 1e-8 >= record.serviceLimitKN;
      const isLast = record.comparisonId === data.records.reduce((best, candidate) => {
        if (!Number.isFinite(candidate.strengthLimitKN)) return best;
        if (!best || candidate.strengthLimitKN > best.strengthLimitKN) return candidate;
        return best;
      }, null)?.comparisonId;
      const status = strengthReached ? 'STRENGTH LIMIT REACHED' : serviceExceeded ? 'SERVICE LIMIT EXCEEDED · STILL LOADING' : 'BELOW SERVICE LIMIT';
      const statusClass = strengthReached ? 'is-limit' : serviceExceeded ? 'is-service' : 'is-active';
      const cardClass = `${strengthReached ? 'is-limit' : serviceExceeded ? 'is-service-exceeded' : ''} ${isLast ? 'is-last' : ''}`;
      const order = data.orderById[record.comparisonId];
      const finalKgf = Number.isFinite(record.strengthLimitKN) ? loadEquivalentsFromKN(record.strengthLimitKN).kgf : null;
      return `<article class="beam-strength-card ${cardClass}">
        <div class="beam-strength-card__head"><div>${sectionSketchSvg(record.section, record.family)}</div><div><p class="eyebrow">${record.comparisonLabel}${isLast ? ' · LAST TO STRENGTH LIMIT' : ''}</p><strong>${record.sectionLabel.replace(/ —.*/, '')}</strong><div class="beam-strength-card__status ${statusClass}">${status}</div></div></div>
        ${beamSvg(record, memberLoadKN, data.conditions, commonScale)}
        <div class="beam-strength-card__metrics">
          <div><small>Current specimen load</small><strong>${compact(memberLoadKN,3)} kN · ≈ ${compact(loadEquivalentsFromKN(memberLoadKN).kgf,0)} kgf</strong></div>
          <div><small>Strength-limit estimate</small><strong>${compact(record.strengthLimitKN,3)} kN · ≈ ${compact(finalKgf,0)} kgf</strong></div>
          <div><small>Limit basis</small><strong>${record.limitBasis}</strong></div>
          <div><small>Order to strength limit</small><strong>${order ? `${order} of ${Object.keys(data.orderById).length}` : '—'}${isLast ? ' · last' : ''}</strong></div>
          <div><small>Service-limit load</small><strong>${compact(record.serviceLimitKN,3)} kN</strong></div>
          <div><small>Time to strength limit</small><strong>${Number.isFinite(record.strengthLimitKN) ? `${compact(record.strengthLimitKN / rate(),2)} s` : '—'}</strong></div>
          <div><small>Deflection at current load</small><strong>${compact(item.deflectionMm,2)} mm</strong></div>
          <div><small>Stress at current load</small><strong>${compact(item.stressMPa,1)} MPa</strong></div>
        </div>
      </article>`;
    }).join('');
  }

  playButton.addEventListener('click', () => {
    refreshData();
    if (!session.data?.maxStrengthKN) return;
    if (session.progress >= 0.9999) session.progress = 0;
    session.playing = !session.playing;
    session.lastStamp = null;
    playButton.textContent = session.playing ? 'PAUSE' : 'PLAY TO STRENGTH LIMITS';
  });
  section.querySelector('[data-strength-reset]').addEventListener('click', () => {
    session.progress = 0;
    session.playing = false;
    session.lastStamp = null;
    playButton.textContent = 'PLAY TO STRENGTH LIMITS';
    render();
  });
  scrub.addEventListener('input', () => {
    session.progress = Number(scrub.value) / 1000;
    session.playing = false;
    session.lastStamp = null;
    playButton.textContent = 'PLAY TO STRENGTH LIMITS';
    render();
  });
  rateInput.addEventListener('input', render);
  speedSelect.addEventListener('change', render);

  function loop(stamp) {
    if (session.playing && session.data?.maxStrengthKN) {
      if (session.lastStamp == null) session.lastStamp = stamp;
      const dt = Math.max(0, (stamp - session.lastStamp) / 1000);
      session.lastStamp = stamp;
      const speed = Number(speedSelect.value) || 1;
      session.progress = Math.min(1, session.progress + dt * rate() * speed / session.data.maxStrengthKN);
      if (session.progress >= 1) {
        session.playing = false;
        playButton.textContent = 'REPLAY TO STRENGTH LIMITS';
      }
    }
    render();
    requestAnimationFrame(loop);
  }
  refreshData(true);
  requestAnimationFrame(loop);
}

function maintainSharedPlaybackLanguage() {
  const playback = document.querySelector('[data-comparison-playback]');
  if (!playback) return;
  const intro = playback.querySelector('.comparison-playback__head p:not(.eyebrow)');
  if (intro && isBeamMode()) intro.textContent = 'Shared-load playback: one identical point load history is applied to every selected member for service/design acceptance comparison.';
  const boundary = playback.querySelector('.comparison-playback__boundary');
  if (boundary && isBeamMode()) boundary.textContent = 'Shared-load playback answers whether each member is acceptable at the selected common load. It is separate from the progressive strength-limit test below, which independently loads each specimen until its source-specific strength limit.';
}

function boot() {
  if (window[ROOT_FLAG]) return;
  window[ROOT_FLAG] = true;
  injectStyles();
  const timer = setInterval(() => {
    const playback = document.querySelector('[data-comparison-playback]');
    replaceTerminology(document.getElementById('compareSummary'));
    replaceTerminology(document.getElementById('compareResultCards'));
    replaceTerminology(document.getElementById('compareTableBody'));
    maintainClarityNote();
    patchSharedBeamArrows();
    maintainSharedPlaybackLanguage();
    if (playback && !playback.querySelector('[data-beam-strength-progression]')) mountProgression(playback);
  }, 180);
  window.addEventListener('beforeunload', () => clearInterval(timer), { once:true });
  document.documentElement.dataset.beamClarity = 'v1';
}

boot();
