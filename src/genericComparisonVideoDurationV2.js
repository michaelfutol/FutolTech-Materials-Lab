const BUILD = new URLSearchParams(window.location.search).get('build') || '';
const DEFAULT_DURATION_S = 16;
let recording = false;

function waitFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitFrames(count = 2) {
  for (let i = 0; i < count; i += 1) await waitFrame();
}

function modeNow() {
  return document.getElementById('compareColumnModeButton')?.classList.contains('is-active') ? 'compression' : 'beam';
}

function themeNow() {
  return document.documentElement.dataset.ftTheme === 'paper-matte' ? 'paper-matte' : 'lab-dark';
}

function installDurationControl(section) {
  if (section.querySelector('[data-generic-record-duration]')) return;
  const actions = section.querySelector('.generic-comparison-video__actions');
  if (!actions) return;
  const label = document.createElement('label');
  label.className = 'generic-comparison-video__duration';
  label.innerHTML = `<span>Recording duration</span><select data-generic-record-duration aria-label="Generic comparison recording duration"><option value="8">Medium · 8 s</option><option value="16" selected>Slow · 16 s</option><option value="24">Very slow · 24 s</option></select>`;
  actions.prepend(label);
  const style = document.createElement('style');
  style.id = 'ft-generic-record-duration-v2';
  style.textContent = `
    .generic-comparison-video__duration{display:grid;gap:.2rem;min-width:150px;font-size:.85rem}
    .generic-comparison-video__duration select{min-height:38px}
  `;
  if (!document.getElementById(style.id)) document.head.appendChild(style);
  section.dataset.defaultRecordDuration = String(DEFAULT_DURATION_S);
}

function dispatchScrub(scrub, progress) {
  scrub.value = String(Math.round(Math.max(0, Math.min(1, progress)) * 1000));
  scrub.dispatchEvent(new Event('input', { bubbles:true }));
  window.__FT_GENERIC_COMPARISON_VIDEO__?.redraw?.();
}

async function recordFixedDuration(button) {
  if (recording) return;
  const section = button.closest('[data-generic-comparison-video]');
  const canvas = section?.querySelector('[data-generic-video-canvas]');
  const playback = document.querySelector('[data-comparison-playback]');
  const reset = playback?.querySelector('[data-cp-reset]');
  const scrub = playback?.querySelector('[data-cp-scrub]');
  const durationSelect = section?.querySelector('[data-generic-record-duration]');
  if (!section || !canvas || !reset || !scrub || !durationSelect) throw new Error('Generic comparison recording controls are unavailable.');
  if (!window.MediaRecorder || typeof canvas.captureStream !== 'function') throw new Error('This browser does not support canvas WebM recording.');

  const requestedDurationS = Number(durationSelect.value) || DEFAULT_DURATION_S;
  const wallDurationMs = BUILD === 'general-video-ci' ? 1200 : requestedDurationS * 1000;
  recording = true;
  button.disabled = true;
  button.textContent = `RECORDING ${requestedDurationS}s…`;
  section.dataset.recordingDuration = String(requestedDurationS);

  try {
    reset.click();
    dispatchScrub(scrub, 0);
    await waitFrames(3);

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8'
        : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => { if (event.data?.size) chunks.push(event.data); });
    const stopped = new Promise((resolve) => recorder.addEventListener('stop', resolve, { once:true }));
    recorder.start(200);

    const startedAt = performance.now();
    let progress = 0;
    while (progress < 1) {
      const now = await waitFrame();
      progress = Math.min(1, (now - startedAt) / wallDurationMs);
      dispatchScrub(scrub, progress);
    }
    dispatchScrub(scrub, 1);
    await waitFrames(3);
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());

    const blob = new Blob(chunks, { type:mimeType });
    if (!blob.size) throw new Error('Recorded comparison video was empty.');
    const mode = modeNow();
    const theme = themeNow();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `futoltech-general-${mode}-${theme}-${requestedDurationS}s-load-test-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    window.__FT_LAST_GENERIC_COMPARISON_VIDEO__ = { size:blob.size, theme, mode, durationSeconds:requestedDurationS };
    section.dataset.lastRecordedDuration = String(requestedDurationS);
  } finally {
    recording = false;
    button.disabled = false;
    button.textContent = 'RECORD + DOWNLOAD VIDEO';
  }
}

function install() {
  const section = document.querySelector('[data-generic-comparison-video]');
  if (!section) return false;
  installDurationControl(section);
  document.documentElement.dataset.genericComparisonRecorder = 'fixed-duration-v2';
  return true;
}

if (!install()) {
  const observer = new MutationObserver(() => {
    if (install()) observer.disconnect();
  });
  observer.observe(document.body, { childList:true, subtree:true });
  window.setTimeout(() => observer.disconnect(), 15000);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-generic-record]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  recordFixedDuration(button).catch((error) => {
    recording = false;
    button.disabled = false;
    button.textContent = 'RECORD + DOWNLOAD VIDEO';
    console.error(error);
    alert(error.message || String(error));
  });
}, true);
