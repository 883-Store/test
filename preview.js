'use strict';
const sizes = { phone: '390 × 844', tablet: '820 × 1180', landscape: '1180 × 820', desktop: '1440 × 900' };
document.querySelector('nav').addEventListener('click', event => {
  const button = event.target.closest('[data-size]');
  if (!button) return;
  document.querySelector('.device').dataset.size = button.dataset.size;
  document.querySelectorAll('nav button').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
  document.getElementById('dimensions').textContent = sizes[button.dataset.size];
});
