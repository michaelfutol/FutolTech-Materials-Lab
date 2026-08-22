const PRIMARY_ITEMS = [
  ['index.html', 'HOME'],
  ['compare.html', 'Materials Comparison'],
  ['c-purlin-test.html', 'C-Purlin Test'],
  ['c-purlin-load-cases.html', 'Roof Load Cases'],
  ['roof-bay.html', 'Roof Bay'],
  ['advanced.html', 'Advanced / R&D']
];

function currentPath() {
  return (location.pathname.split('/').pop() || 'index.html').toLowerCase();
}

function injectStyles() {
  if (document.getElementById('ft-primary-nav-style')) return;
  const style = document.createElement('style');
  style.id = 'ft-primary-nav-style';
  style.textContent = `
    .ft-primary-nav{display:flex;gap:.45rem;align-items:center;overflow-x:auto;padding:.55rem .75rem;border-bottom:1px solid var(--border);background:rgba(5,18,26,.96);position:sticky;top:0;z-index:50;scrollbar-width:thin}
    .ft-primary-nav a,.ft-primary-nav span{white-space:nowrap;padding:.48rem .68rem;border:1px solid var(--border);border-radius:999px;text-decoration:none;color:var(--muted);font-size:.78rem;font-weight:800;letter-spacing:.02em}
    .ft-primary-nav a:hover{color:var(--text);border-color:var(--accent)}.ft-primary-nav .is-active{color:var(--accent);border-color:rgba(83,224,197,.55);background:rgba(83,224,197,.08)}
    html[data-ft-theme="paper-matte"] .ft-primary-nav{background:#f4eadb}html[data-ft-theme="paper-matte"] .ft-primary-nav a,html[data-ft-theme="paper-matte"] .ft-primary-nav span{color:#536067;border-color:#a99a82}html[data-ft-theme="paper-matte"] .ft-primary-nav .is-active{color:#176a60;border-color:#176a60;background:#eef4eb}
    @media print{.ft-primary-nav{display:none!important}}
  `;
  document.head.appendChild(style);
}

export function mountPrimaryNav() {
  if (document.querySelector('[data-ft-primary-nav]')) return;
  injectStyles();
  const nav = document.createElement('nav');
  nav.className = 'ft-primary-nav';
  nav.dataset.ftPrimaryNav = 'true';
  nav.setAttribute('aria-label', 'FutolTech Structural Lab primary workflow');
  const active = currentPath();
  for (const [path, label] of PRIMARY_ITEMS) {
    const current = active === path.toLowerCase();
    const item = document.createElement(current ? 'span' : 'a');
    if (!current) item.href = `./${path}`;
    item.textContent = label;
    if (current) item.classList.add('is-active');
    nav.appendChild(item);
  }
  const header = document.querySelector('header.topbar, .topbar');
  if (header) header.insertAdjacentElement('afterend', nav);
  else document.body.prepend(nav);
}

mountPrimaryNav();
