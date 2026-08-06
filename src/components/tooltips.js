const tooltip = document.createElement('div');
tooltip.className = 'app-tooltip';
tooltip.setAttribute('role', 'tooltip');
tooltip.setAttribute('aria-hidden', 'true');
document.body.append(tooltip);

let activeTarget = null;

function placeTooltip(target) {
  const rect = target.getBoundingClientRect();
  const gap = 10;
  const margin = 12;
  tooltip.style.maxWidth = `${Math.min(360, window.innerWidth - margin * 2)}px`;
  tooltip.style.left = '0px';
  tooltip.style.top = '0px';

  const tooltipRect = tooltip.getBoundingClientRect();
  let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
  left = Math.max(margin, Math.min(left, window.innerWidth - tooltipRect.width - margin));

  let top = rect.bottom + gap;
  if (top + tooltipRect.height > window.innerHeight - margin) {
    top = rect.top - tooltipRect.height - gap;
  }
  top = Math.max(margin, top);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showTooltip(target) {
  const text = target?.dataset?.help;
  if (!text) return;
  activeTarget = target;
  tooltip.textContent = text;
  tooltip.setAttribute('aria-hidden', 'false');
  tooltip.classList.add('is-visible');
  requestAnimationFrame(() => placeTooltip(target));
}

function hideTooltip(target = null) {
  if (target && activeTarget && target !== activeTarget) return;
  activeTarget = null;
  tooltip.classList.remove('is-visible');
  tooltip.setAttribute('aria-hidden', 'true');
}

function helpTarget(event) {
  return event.target instanceof Element ? event.target.closest('[data-help]') : null;
}

document.addEventListener('pointerover', (event) => {
  const target = helpTarget(event);
  if (target) showTooltip(target);
});

document.addEventListener('pointerout', (event) => {
  const target = helpTarget(event);
  if (!target) return;
  const related = event.relatedTarget instanceof Element ? event.relatedTarget.closest('[data-help]') : null;
  if (related !== target) hideTooltip(target);
});

document.addEventListener('focusin', (event) => {
  const target = helpTarget(event);
  if (target) showTooltip(target);
});

document.addEventListener('focusout', (event) => {
  const target = helpTarget(event);
  if (target) hideTooltip(target);
});

window.addEventListener('scroll', () => {
  if (activeTarget) placeTooltip(activeTarget);
}, true);
window.addEventListener('resize', () => {
  if (activeTarget) placeTooltip(activeTarget);
});
