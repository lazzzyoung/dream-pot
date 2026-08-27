/**
 * shop.js — the part shelf.
 *
 * Card icons are cut straight out of the drawing: the same <g> that will fill
 * in up top is what you see on the card, so a card is visibly the thing it
 * bolts onto. Not owned -> drawn as a blueprint. Owned -> real material.
 */

import { MODEL3_SVG } from '../../svg/model3.js';
import { shopOrder, formatWon, formatCoin, BUY } from '../parts.js';

/* ---- icon geometry, measured once from an offscreen copy of the drawing --- */
const iconCache = new Map();

function iconsFor(partSetId) {
  if (iconCache.has(partSetId)) return iconCache.get(partSetId);

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-4000px;top:0;opacity:0;pointer-events:none';
  host.innerHTML = MODEL3_SVG;
  const svg = host.querySelector('svg');
  svg.style.width = '820px';
  document.body.appendChild(host);

  const map = new Map();
  svg.querySelectorAll('.part').forEach((part) => {
    const unit = part.querySelector('.unit');
    const b = frameOf(unit);
    const pad = Math.max(5, Math.max(b.width, b.height) * 0.16);
    map.set(part.dataset.part, {
      viewBox: `${(b.x - pad).toFixed(1)} ${(b.y - pad).toFixed(1)} ` +
               `${(b.width + pad * 2).toFixed(1)} ${(b.height + pad * 2).toFixed(1)}`,
      inner: unit.outerHTML,
    });
  });

  host.remove();
  iconCache.set(partSetId, map);
  return map;
}

/**
 * What to frame in an icon. A whole unit's bounding box is wrong for parts
 * whose pieces are scattered across the car (the sensors sit on the nose, the
 * pillar and the tail) — that frames the entire car and the icon becomes
 * three specks. So: find the biggest piece, then take in whatever sits near it.
 */
function frameOf(unit) {
  const boxes = [...unit.children].map((el) => el.getBBox())
    .filter((b) => b.width > 0 || b.height > 0);
  if (!boxes.length) return unit.getBBox();

  const main = boxes.reduce((a, b) =>
    (b.width * b.height > a.width * a.height ? b : a));
  const reach = Math.max(main.width, main.height) * 0.9;
  const near = { x: main.x - reach, y: main.y - reach,
                 r: main.x + main.width + reach, b: main.y + main.height + reach };

  let box = main;
  boxes.forEach((n) => {
    const hits = n.x < near.r && n.x + n.width > near.x
              && n.y < near.b && n.y + n.height > near.y;
    if (!hits) return;
    const x = Math.min(box.x, n.x), y = Math.min(box.y, n.y);
    box = {
      x, y,
      width: Math.max(box.x + box.width, n.x + n.width) - x,
      height: Math.max(box.y + box.height, n.y + n.height) - y,
    };
  });
  return box;
}

export function partIcon(partSetId, partId, real) {
  const geo = iconsFor(partSetId).get(partId);
  if (!geo) return '';
  const inner = real ? geo.inner.replace('class="unit"', 'class="unit is-owned"') : geo.inner;
  return `<svg class="bp part-icon" viewBox="${geo.viewBox}" aria-hidden="true">${inner}</svg>`;
}

/* ---- cards ---- */

function card(p, setId, coins) {
  const real = p.have > 0;
  const short = Math.max(0, p.unitCoin - coins);
  const foot = p.state === BUY.SOLD_OUT
    ? '<span class="card__done">전부 확보</span>'
    : p.state === BUY.NO_COINS
      ? `<span class="card__short num">${formatCoin(short)}코인 더</span>`
      : `<span class="card__won num">${formatWon(p.unitWon)}원</span>`;

  return `
    <button class="card" type="button" data-buy="${p.id}" data-state="${p.state}"
            ${p.state === BUY.OK ? '' : 'disabled'}
            aria-label="${p.name} ${p.unitCoin}코인, ${p.have}/${p.count} 보유">
      <span class="card__icon">${partIcon(setId, p.id, real)}</span>
      <span class="card__qty num" data-full="${p.have >= p.count}">${p.have}/${p.count}</span>
      <span class="card__name">${p.name}</span>
      <span class="card__price coin-amt"><i class="coin"></i><span class="num">${formatCoin(p.unitCoin)}</span></span>
      ${foot}
      ${p.state === BUY.SOLD_OUT ? '<span class="card__stamp">확보</span>' : ''}
    </button>`;
}

export function renderShop(mount, state) {
  const { partSetId, totalPrice } = state.goal;
  const list = shopOrder(partSetId, totalPrice, state.owned, state.coins);
  const buyable = list.filter((p) => p.state === BUY.OK).length;

  mount.innerHTML = `
    <div class="shelf__head">
      <span class="stamp">부품 상점</span>
      <span class="shelf__count">${buyable ? `지금 살 수 있는 것 <b class="num">${buyable}</b>` : '살 수 있는 게 없습니다'}</span>
    </div>
    <div class="cards">${list.map((p) => card(p, partSetId, state.coins)).join('')}</div>`;

  return list;
}
