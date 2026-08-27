/**
 * confirm.js — 등록 확인 시트 (PRD 6.2)
 * Amount, monthly deposit and start date are all editable; the sheet tells you
 * what those numbers mean before you commit to them.
 */

import {
  formatWon, formatCoin, wonToCoin, monthsToComplete, formatMonths,
  completionDate, todayISO, parseDate, affordableCount, cheapestPart, nthPayday,
  PAINTS, getPaint,
} from '../parts.js';
import { createGoal } from '../store.js';
import { MODEL3_SVG } from '../../svg/model3.js';

const DEFAULT_MONTHLY = 600000;

let root = null;
let onDone = () => {};

export function initConfirm(mount, done) {
  onDone = done || (() => {});
  root = document.createElement('div');
  root.className = 'scrim';
  root.hidden = true;
  mount.appendChild(root);
  return root;
}

const digits = (v) => Number(String(v).replace(/[^\d]/g, '')) || 0;

export function openConfirm(item) {
  const state = {
    price: item.basePrice,
    monthly: DEFAULT_MONTHLY,
    start: todayISO(),
    payday: parseDate(todayISO()).getDate(),
    paint: 'pearl',
    setId: item.partSetId || 'model3',
  };

  root.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-name">
      <div class="sheet__grip"></div>
      <div class="sheet__art">${MODEL3_SVG}</div>
      <h2 class="sheet__name" id="sheet-name">${item.name}</h2>
      <p class="sheet__note">${item.note} · 참고가입니다. 금액은 고쳐도 됩니다.</p>

      <div class="rows">
        <div>
          <div class="row__head">
            <span class="stamp">목표 금액</span>
            <span class="row__sub coin-amt"><i class="coin"></i><span class="num" id="v-price-coin"></span> 코인</span>
          </div>
          <div class="field field--num">
            <input id="f-price" type="text" inputmode="numeric">
            <span class="field__unit">원</span>
          </div>
        </div>

        <div>
          <div class="row__head">
            <span class="stamp">월급날 자동으로 저금할 금액</span>
            <span class="row__sub coin-amt"><i class="coin"></i><span class="num" id="v-monthly-coin"></span> 코인</span>
          </div>
          <div class="field field--num">
            <input id="f-monthly" type="text" inputmode="numeric">
            <span class="field__unit">원</span>
          </div>
        </div>

        <div>
          <div class="row__head">
            <span class="stamp">월급날</span>
            <span class="row__sub" id="v-firstpay"></span>
          </div>
          <div class="field field--num">
            <input id="f-payday" type="text" inputmode="numeric">
            <span class="field__unit">일</span>
          </div>
        </div>
        <div>
          <div class="row__head">
            <span class="stamp">색상</span>
            <span class="row__sub" id="v-paint">${getPaint('pearl').name}</span>
          </div>
          <div class="paints__row">
            ${PAINTS.map((p) => `
              <button class="swatch" type="button" data-pick-paint="${p.id}"
                      style="--sw:${p.body}" title="${p.name}" aria-label="${p.name}"
                      aria-pressed="${p.id === 'pearl'}"></button>`).join('')}
          </div>
        </div>
      </div>

      <div class="verdict">
        <p class="verdict__main">이 속도면 <b id="v-months"></b> 뒤 완성</p>
        <p class="verdict__sub" id="v-when"></p>
        <p class="verdict__first" id="v-first"></p>
      </div>

      <div class="sheet__actions">
        <button class="key key--quiet" type="button" data-close>돌아가기</button>
        <button class="key key--go" type="button" data-go>등록하기</button>
      </div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const price = $('#f-price'), monthly = $('#f-monthly'), payday = $('#f-payday');
  price.value = formatWon(state.price);
  monthly.value = formatWon(state.monthly);
  payday.value = String(state.payday);

  function sync() {
    state.price = digits(price.value);
    state.monthly = digits(monthly.value);
    state.payday = Math.min(31, Math.max(1, digits(payday.value) || 1));

    $('#v-price-coin').textContent = formatCoin(wonToCoin(state.price));
    $('#v-monthly-coin').textContent = formatCoin(wonToCoin(state.monthly));

    const first = nthPayday({ startDate: state.start, payday: state.payday }, 0);
    $('#v-firstpay').textContent = `첫 저금 ${first.getMonth() + 1}월 ${first.getDate()}일`;

    const months = monthsToComplete(state.price, state.monthly);
    $('#v-months').textContent = formatMonths(months);
    const end = completionDate(state.start, months);
    $('#v-when').textContent = end
      ? `${parseDate(end).getFullYear()}년 ${parseDate(end).getMonth() + 1}월 완성 예정`
      : '매달 저축할 금액을 적어 주세요';

    // What the very first certification actually buys — no forced first part,
    // so this is the number that decides whether month one feels like anything.
    const firstCoins = wonToCoin(state.monthly);
    const kinds = affordableCount(state.setId, state.price, firstCoins);
    const cheapest = cheapestPart(state.setId, state.price);
    const head = `첫 월급날에 <b>${formatCoin(firstCoins)}코인</b> — `;
    if (kinds > 1) {
      $('#v-first').innerHTML = head + `부품 <b>${kinds}종</b> 중에서 골라 삽니다`;
    } else if (kinds === 1) {
      $('#v-first').innerHTML = head + `<b>${cheapest.name}</b>부터 살 수 있습니다`;
    } else {
      const rounds = Math.ceil(cheapest.unitCoin / (firstCoins || 1));
      $('#v-first').innerHTML = head
        + `가장 싼 ${cheapest.name}이 <b>${formatCoin(cheapest.unitCoin)}코인</b>, <b>${rounds}달</b>째에 첫 부품`;
    }

    $('[data-go]').disabled = !(state.price > 0 && state.monthly > 0);
  }

  [price, monthly].forEach((el) => el.addEventListener('input', () => {
    const n = digits(el.value);
    el.value = n ? formatWon(n) : '';
    sync();
  }));
  root.addEventListener('click', (e) => {
    const sw = e.target.closest('[data-pick-paint]');
    if (!sw) return;
    state.paint = sw.dataset.pickPaint;
    root.querySelectorAll('[data-pick-paint]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.pickPaint === state.paint)));
    $('#v-paint').textContent = getPaint(state.paint).name;
  });

  payday.addEventListener('input', () => {
    payday.value = payday.value.replace(/[^\d]/g, '').slice(0, 2);
    sync();
  });

  $('[data-close]').addEventListener('click', closeConfirm);
  $('[data-go]').addEventListener('click', () => {
    createGoal({
      id: item.id, name: item.name, totalPrice: state.price,
      partSetId: state.setId, monthlyDeposit: state.monthly,
      payday: state.payday, startDate: state.start, paintColor: state.paint,
    });
    closeConfirm();
    onDone();
  });
  root.addEventListener('click', (e) => { if (e.target === root) closeConfirm(); });
  document.addEventListener('keydown', escClose);

  root.hidden = false;
  sync();
  requestAnimationFrame(() => $('.sheet').classList.add('is-in'));
  $('[data-go]').focus();
}

function escClose(e) { if (e.key === 'Escape') closeConfirm(); }

export function closeConfirm() {
  if (!root) return;
  root.hidden = true;
  root.innerHTML = '';
  document.removeEventListener('keydown', escClose);
}
