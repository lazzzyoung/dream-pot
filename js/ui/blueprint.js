/**
 * blueprint.js — renders the SVG drawing and reflects part ownership on it.
 *
 * The drawing is the progress bar. Nothing else in this module knows about
 * money, coins or the store; it takes a plain { partId: ownedCount } map.
 */

import { MODEL3_SVG } from '../../svg/model3.js';
import { getPaint } from '../parts.js';

const SETS = { model3: MODEL3_SVG };

/**
 * Push the chosen body colour into the material variables. Set on :root so the
 * drawing, the card icons and the purchase sheet all repaint together.
 * Only the painted panels change — metal, rubber and interior stay warm.
 */
export function applyPaint(paintId) {
  const p = getPaint(paintId);
  const r = document.documentElement.style;
  r.setProperty('--real-body', p.body);
  r.setProperty('--real-panel', p.panel);
  r.setProperty('--real-panel-2', p.panel2);
  r.setProperty('--real-edge-lt', p.edgeLt);
}

/** Draw the blueprint into `mount`. Returns the <svg> element. */
export function renderBlueprint(mount, partSetId = 'model3') {
  mount.innerHTML = SETS[partSetId] || SETS.model3;
  return mount.querySelector('svg');
}

/** How many units of this part the side elevation actually draws. */
export function visibleUnitCount(svg, partId) {
  return svg.querySelectorAll(`[data-part="${partId}"] .unit`).length;
}

/**
 * Turn owned units from blueprint into real material.
 * Units fill visible-first: owning 2 of 4 wheels lights up both drawn wheels.
 */
export function applyOwnership(svg, owned = {}) {
  svg.querySelectorAll('.part').forEach((part) => {
    const id = part.dataset.part;
    const total = Number(part.dataset.count) || 1;
    const units = part.querySelectorAll('.unit');
    const have = Math.max(0, Math.min(Number(owned[id]) || 0, total));
    // Spread ownership across the units we can actually see.
    const litUnits = have >= total ? units.length
      : Math.min(units.length, have);

    units.forEach((u, i) => u.classList.toggle('is-owned', i < litUnits));
    part.classList.toggle('is-owned', have > 0);
    part.classList.toggle('is-complete', have >= total);
  });
  svg.classList.toggle('is-finished', isFullyOwned(svg, owned));
}

function isFullyOwned(svg, owned) {
  return [...svg.querySelectorAll('.part')].every((p) => {
    const total = Number(p.dataset.count) || 1;
    return (Number(owned[p.dataset.part]) || 0) >= total;
  });
}

/** Flip one unit on immediately — used as the end state of the buy sequence. */
export function markUnitOwned(svg, partId, unitIndex) {
  const unit = svg.querySelector(
    `[data-part="${partId}"] .unit[data-index="${unitIndex}"]`);
  if (unit) unit.classList.add('is-owned');
}

/**
 * Screen-space centre of the unit that a purchase should fly into.
 * Falls back to the part's own box when that unit isn't drawn.
 */
export function unitAnchor(svg, partId, unitIndex = 0) {
  const target =
    svg.querySelector(`[data-part="${partId}"] .unit[data-index="${unitIndex}"]`) ||
    svg.querySelector(`[data-part="${partId}"]`);
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
}
