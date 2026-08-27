/**
 * main.js — entry point.
 * STEP 1: renders the blueprint alone, with a temporary ownership probe
 * so the blueprint <-> real contrast can be judged before wiring the app.
 */

import { renderBlueprint, applyOwnership } from './ui/blueprint.js';
import { getPartSet, totalUnits } from './parts.js';
import * as store from './store.js';
import * as partsApi from './parts.js';

// Step 2 is verified from the console, not the UI.
window.__shop = { store, parts: partsApi };

const set = getPartSet('model3');
const svg = renderBlueprint(document.getElementById('board'), set.id);

const owned = Object.create(null);

function refresh() {
  applyOwnership(svg, owned);

  const have = set.parts.reduce((n, p) => n + (owned[p.id] || 0), 0);
  const all = totalUnits(set.id);
  document.getElementById('pct').innerHTML =
    `${Math.round((have / all) * 100)}<sup>%</sup>`;
  document.getElementById('count').textContent = `${have} / ${all}`;

  document.querySelectorAll('[data-probe]').forEach((btn) => {
    const p = set.parts.find((x) => x.id === btn.dataset.probe);
    const n = owned[p.id] || 0;
    btn.setAttribute('aria-pressed', String(n > 0));
    btn.querySelector('.num').textContent = `${n}/${p.count}`;
  });
}

// --- temporary probe UI ------------------------------------------------
const probe = document.getElementById('probe');
probe.innerHTML = set.parts.map((p) => `
  <button class="probe__row" type="button" data-probe="${p.id}" aria-pressed="false">
    <span>${p.name}</span><span class="num">0/${p.count}</span>
  </button>`).join('');

probe.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-probe]');
  if (!btn) return;
  const p = set.parts.find((x) => x.id === btn.dataset.probe);
  owned[p.id] = ((owned[p.id] || 0) + 1) % (p.count + 1); // cycle 0..count
  refresh();
});

document.getElementById('all').addEventListener('click', () => {
  set.parts.forEach((p) => { owned[p.id] = p.count; });
  refresh();
});
document.getElementById('none').addEventListener('click', () => {
  set.parts.forEach((p) => { owned[p.id] = 0; });
  refresh();
});

refresh();
