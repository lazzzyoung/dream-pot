/**
 * confirm.js — 등록 확인 시트 (PRD 6.2)
 * Amount, monthly deposit and start date are all editable; the sheet tells you
 * what those numbers mean before you commit to them.
 */

import {
  formatWon, formatCoin, wonToCoin, monthsToComplete, formatMonths,
  completionDate, todayISO, parseDate, affordableCount, cheapestPart,
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
            <span class="stamp">매달 저축할 금액</span>
            <span class="row__sub coin-amt"><i class="coin"></i><span class="num" id="v-monthly-coin"></span> 코인</span>
          </div>
          <div class="field field--num">
            <input id="f-monthly" type="text" inputmode="numeric">
            <span class="field__unit">원</span>
          </div>
        </div>

        <div>
          <div class="row__head"><span class="stamp">시작일</span></div>
          <div class="field">
            <input id="f-start" type="date">
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
  const price = $('#f-price'), monthly = $('#f-monthly'), start = $('#f-start');
  price.value = formatWon(state.price);
  monthly.value = formatWon(state.monthly);
  start.value = state.start;

  function sync() {
    state.price = digits(price.value);
    state.monthly = digits(monthly.value);
    state.start = start.value || todayISO();

    $('#v-price-coin').textContent = formatCoin(wonToCoin(state.price));
    $('#v-monthly-coin').textContent = formatCoin(wonToCoin(state.monthly));

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
    const head = `첫 인증에 <b>${formatCoin(firstCoins)}코인</b> — `;
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
  start.addEventListener('change', sync);

  $('[data-close]').addEventListener('click', closeConfirm);
  $('[data-go]').addEventListener('click', () => {
    createGoal({
      id: item.id, name: item.name, totalPrice: state.price,
      partSetId: state.setId, monthlyDeposit: state.monthly, startDate: state.start,
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
