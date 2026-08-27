/**
 * purchase.js — the 1.2 seconds this whole app is built around.
 *
 *   1  the card takes a stamp and presses down
 *   2  the coin counter runs down
 *   3  the card's part flies to its place on the drawing
 *   4  that part's line draws itself on, then the surface fills
 *   5  a short toast: 앞바퀴를 손에 넣었습니다
 *
 * Any click or key skips straight to the end state.
 * prefers-reduced-motion skips the whole thing and just changes state.
 */

import { unitAnchor } from './blueprint.js';
import { formatCoin } from '../parts.js';

const T = {
  stamp: 170,
  coinDelay: 110, coin: 430,
  flyDelay: 210, fly: 520,
  drawDelay: 690, draw: 380,
  fill: 220,
  toastDelay: 1010,
};

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/* ---------- toast ---------- */

let liveToast = null;

export function toast(text) {
  if (liveToast) liveToast.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  liveToast = el;

  setTimeout(() => el.classList.add('is-in'), 16);
  const hide = setTimeout(() => {
    el.classList.remove('is-in');
    setTimeout(() => { el.remove(); if (liveToast === el) liveToast = null; }, 260);
  }, 1700);
  el.addEventListener('remove', () => clearTimeout(hide));
}

/* ---------- the drawing writes itself on ---------- */

function startDrawOn(unit, ms) {
  const shapes = [...unit.children];
  shapes.forEach((el) => {
    let len = 0;
    try { len = el.getTotalLength(); } catch (err) { len = 0; }
    if (!len) return;
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
  });

  unit.classList.add('is-owned', 'is-drawing');
  void unit.getBoundingClientRect();          // commit the dash offsets

  shapes.forEach((el) => {
    if (!el.style.strokeDasharray) return;
    el.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.3,.7,.3,1)`;
    el.style.strokeDashoffset = '0';
  });
}

function endDrawOn(unit) {
  unit.classList.remove('is-drawing');
  [...unit.children].forEach((el) => {
    el.style.strokeDasharray = '';
    el.style.strokeDashoffset = '';
    el.style.transition = '';
  });
}

/* ---------- the card flies to the drawing ---------- */

function launchFlyer(card, svg, partId, unitIndex) {
  const icon = card && card.querySelector('.card__icon svg');
  const target = unitAnchor(svg, partId, unitIndex);
  if (!icon || !target) return null;

  const from = icon.getBoundingClientRect();
  if (!from.width || !target.rect.width) return null;

  const flyer = document.createElement('div');
  flyer.className = 'flyer';
  flyer.style.cssText =
    `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;

  const clone = icon.cloneNode(true);
  clone.querySelectorAll('.unit').forEach((u) => u.classList.add('is-owned'));
  flyer.appendChild(clone);
  document.body.appendChild(flyer);

  const scale = Math.max(0.2, Math.min(3, target.rect.width / from.width));
  const dx = target.x - (from.left + from.width / 2);
  const dy = target.y - (from.top + from.height / 2);

  setTimeout(() => {
    flyer.style.transition =
      `transform ${T.fly}ms cubic-bezier(.45,.02,.2,1), opacity 160ms ${T.fly - 150}ms linear`;
    flyer.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    flyer.style.opacity = '0';
  }, 16);
  return flyer;
}

/* ---------- the whole sequence ---------- */

export function playPurchase({ card, svg, partId, unitIndex, coinEl, from, to, label }) {
  return new Promise((resolve) => {
    const unit = svg.querySelector(
      `[data-part="${partId}"] .unit[data-index="${unitIndex}"]`);
    const timers = [];
    let flyer = null;
    let coinFrame = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(coinFrame);
      document.removeEventListener('pointerdown', finish, true);
      document.removeEventListener('keydown', finish, true);

      if (flyer) flyer.remove();
      if (coinEl) coinEl.textContent = formatCoin(to);
      if (card) card.classList.remove('is-stamping');
      if (unit) { unit.classList.add('is-owned'); endDrawOn(unit); }
      resolve();
    };

    if (reduced()) { finish(); toast(label); return; }

    document.addEventListener('pointerdown', finish, true);
    document.addEventListener('keydown', finish, true);
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));

    // 1 — the stamp
    if (card) {
      card.classList.add('is-stamping');
      at(T.stamp, () => card.classList.remove('is-stamping'));
    }

    // 2 — the counter runs down
    if (coinEl && from !== to) {
      at(T.coinDelay, () => {
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / T.coin);
          coinEl.textContent = formatCoin(Math.round(from + (to - from) * easeOut(k)));
          if (k < 1) coinFrame = requestAnimationFrame(step);
        };
        coinFrame = requestAnimationFrame(step);
      });
    }

    // 3 — the part flies home
    at(T.flyDelay, () => { flyer = launchFlyer(card, svg, partId, unitIndex); });

    // 4 — line, then surface
    at(T.drawDelay, () => { if (unit) startDrawOn(unit, T.draw); });
    at(T.drawDelay + T.draw, () => { if (unit) endDrawOn(unit); });

    // 5 — say what happened
    at(T.toastDelay, () => toast(label));
    at(T.drawDelay + T.draw + T.fill, finish);
  });
}
