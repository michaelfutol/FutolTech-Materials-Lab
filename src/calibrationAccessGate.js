const params = new URLSearchParams(window.location.search);
const STORAGE_KEY = 'ft-calibration-unlocked-v1';
const PASSWORD_SHA256 = 'd9ddac2113d432d6f2b888b79a05e7e1d9382e0ed0f4e94a4b763d25632f1861';

function unlock(reason) {
  document.documentElement.dataset.calibrationUnlocked = 'true';
  document.documentElement.dataset.calibrationAccess = reason;
  document.querySelector('.ft-calibration-gate')?.remove();
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function mountGate() {
  const style = document.createElement('style');
  style.id = 'ft-calibration-access-style';
  style.textContent = `
    .ft-calibration-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:#06151e;color:#eef8fb;font-family:system-ui,sans-serif}
    .ft-calibration-gate__card{width:min(520px,100%);padding:28px;border:1px solid rgba(93,224,197,.45);border-radius:18px;background:#0b202a;box-shadow:0 24px 80px rgba(0,0,0,.5)}
    .ft-calibration-gate__card h1{margin:.25rem 0 .6rem;font-size:1.7rem}.ft-calibration-gate__card p{line-height:1.5;color:#b7cbd4}
    .ft-calibration-gate__form{display:grid;gap:.7rem;margin-top:1rem}.ft-calibration-gate__form input{width:100%;box-sizing:border-box;min-height:46px;padding:.7rem .85rem;border:1px solid #4d6975;border-radius:10px;background:#06151e;color:#fff;font:inherit}
    .ft-calibration-gate__actions{display:flex;gap:.6rem;flex-wrap:wrap}.ft-calibration-gate__actions button,.ft-calibration-gate__actions a{min-height:42px;padding:.65rem .95rem;border:1px solid #5de0c5;border-radius:999px;background:transparent;color:#eef8fb;text-decoration:none;font-weight:800;cursor:pointer}.ft-calibration-gate__actions button{background:#176a60}
    .ft-calibration-gate__error{min-height:1.2em;color:#ff8f8f;font-weight:800}.ft-calibration-gate__notice{margin-top:1rem;padding:.75rem;border-left:4px solid #f2be4f;background:rgba(242,190,79,.08);font-size:.86rem}
  `;
  document.head.appendChild(style);

  const gate = document.createElement('div');
  gate.className = 'ft-calibration-gate';
  gate.innerHTML = `<section class="ft-calibration-gate__card" role="dialog" aria-modal="true" aria-labelledby="ft-calibration-gate-title">
    <p class="eyebrow">ADVANCED / R&D · CAL-001</p>
    <h1 id="ft-calibration-gate-title">Test Data Validation</h1>
    <p>Compare physical test evidence with solver predictions. This is an advanced validation workspace, not part of the normal public member-comparison workflow.</p>
    <form class="ft-calibration-gate__form">
      <label>R&D access password<input type="password" autocomplete="current-password" data-calibration-password autofocus /></label>
      <div class="ft-calibration-gate__error" data-calibration-gate-error aria-live="polite"></div>
      <div class="ft-calibration-gate__actions"><button type="submit">UNLOCK R&D TOOL</button><a href="./index.html">HOME</a></div>
    </form>
    <p class="ft-calibration-gate__notice"><strong>Privacy boundary:</strong> this is a soft client-side gate on a public GitHub Pages site. It discourages casual access but is not confidential authentication. Real private access requires server-side identity/authentication later.</p>
  </section>`;
  document.body.appendChild(gate);

  const form = gate.querySelector('form');
  const input = gate.querySelector('[data-calibration-password]');
  const error = gate.querySelector('[data-calibration-gate-error]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    const enteredHash = await sha256(input.value);
    if (enteredHash !== PASSWORD_SHA256) {
      error.textContent = 'Incorrect R&D password.';
      input.select();
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, '1');
    unlock('session-password');
  });
}

if (params.get('build') === 'ci') {
  unlock('ci-bypass');
} else if (sessionStorage.getItem(STORAGE_KEY) === '1') {
  unlock('session-password');
} else {
  mountGate();
}
