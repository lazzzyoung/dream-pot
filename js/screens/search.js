/**
 * search.js — "저축해서 사고 싶은 것" (PRD 6.1)
 * Filters the local catalog as you type. Nothing here talks to the network.
 */

import { searchCatalog, CATALOG } from '../catalog.js';
import { formatManWon, formatCoin, wonToCoin } from '../parts.js';
import { MODEL3_OUTLINE } from '../../svg/model3.js';
import { openConfirm } from './confirm.js';

// Body silhouette plus the two wheels the side elevation shows.
const thumb = `<svg viewBox="34 58 750 224" aria-hidden="true">
  <path d="${MODEL3_OUTLINE}"/>
  <circle cx="180" cy="246" r="50"/><circle cx="626" cy="246" r="50"/>
</svg>`;

function itemRow(item) {
  return `
    <li>
      <button class="item" type="button" data-pick="${item.id}">
        <span class="item__mark">${thumb}</span>
        <span class="item__body">
          <span class="item__name">${item.name}</span>
          <span class="item__meta"><span class="tag">참고가</span>${item.note}</span>
        </span>
        <span class="item__price">
          <span class="item__won num">${formatManWon(item.basePrice)}원</span>
          <span class="item__coin coin-amt"><i class="coin"></i><span class="num">${formatCoin(wonToCoin(item.basePrice))}</span></span>
        </span>
      </button>
    </li>`;
}

function customBlock(query) {
  return `
    <div class="plate plate--riveted custom">
      <span class="stamp">직접 등록하기</span>
      <p class="custom__lead">이름과 금액을 적으면 그대로 목표가 됩니다.</p>
      <div class="custom__rows">
        <div>
          <span class="stamp">이름</span>
          <div class="field"><input id="custom-name" type="text"
            placeholder="사고 싶은 것" value="${query.replace(/"/g, '&quot;')}"></div>
        </div>
        <div>
          <span class="stamp">예상 금액</span>
          <div class="field field--num">
            <input id="custom-price" type="text" inputmode="numeric" placeholder="0">
            <span class="field__unit">원</span>
          </div>
        </div>
        <button class="key key--go key--wide" type="button" id="custom-go">이 물건으로 등록하기</button>
      </div>
    </div>`;
}

export function renderSearch(mount) {
  mount.innerHTML = `
    <section class="screen">
      <div class="plate plate--riveted">
        <label class="stamp search__label" for="q">저축해서 사고 싶은 것</label>
        <div class="field field--big">
          <svg class="field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor"
               stroke-width="1.6" aria-hidden="true">
            <circle cx="9" cy="9" r="6"/><path d="M13.5 13.5 L17.5 17.5"/>
          </svg>
          <input id="q" type="search" autocomplete="off" placeholder="테슬라">
        </div>
      </div>
      <div class="shelf__wrap">
        <div class="shelf__head" style="margin-top:var(--sp-5)">
          <span class="stamp">취급 품목</span>
          <span class="shelf__count num" id="shelf-count">${CATALOG.length}</span>
        </div>
        <ul class="shelf" id="results"></ul>
        <div id="fallback"></div>
      </div>
    </section>`;

  const input = mount.querySelector('#q');
  const results = mount.querySelector('#results');
  const fallback = mount.querySelector('#fallback');
  const count = mount.querySelector('#shelf-count');

  function draw() {
    const q = input.value.trim();
    const hits = searchCatalog(q);
    results.innerHTML = hits.map(itemRow).join('');
    count.textContent = String(hits.length);
    fallback.innerHTML = hits.length ? '' : customBlock(q);
  }

  input.addEventListener('input', draw);

  mount.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-pick]');
    if (pick) {
      const item = CATALOG.find((c) => c.id === pick.dataset.pick);
      openConfirm(item);
      return;
    }
    if (e.target.closest('#custom-go')) {
      const name = mount.querySelector('#custom-name').value.trim();
      const price = Number(mount.querySelector('#custom-price').value.replace(/[^\d]/g, ''));
      if (!name || !price) return;
      // Prototype: anything custom borrows the model3 part set. (PRD 6.1)
      openConfirm({ id: `custom-${Date.now()}`, name, note: '직접 등록',
                    basePrice: price, partSetId: 'model3' });
    }
  });

  draw();
  return () => {};
}
