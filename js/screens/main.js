/**
 * screens/main.js — the shop floor.
 * Drawing on the wall, coins and the certification card on the counter,
 * parts on the shelf. Step 4 switches state immediately; step 5 adds the
 * purchase sequence.
 */

import { renderBlueprint, applyOwnership } from '../ui/blueprint.js';
import { renderShop, partIcon } from '../ui/shop.js';
import { renderDeposit, extraAmount, adjustedAmount } from '../ui/deposit.js';
import * as store from '../store.js';
import {
  progress, formatWon, formatCoin, coinToWon, pricedParts, ownedOf,
  nextGap, wonToCoin,
} from '../parts.js';

let svg = null;

export function renderMain(mount) {
  mount.innerHTML = `
    <section class="screen">
      <div class="board-wrap">
        <div class="board">
          <div class="board__svg" id="board"></div>
          <div class="board__meta">
            <div class="board__pct num" id="pct">0<sup>%</sup></div>
            <div class="board__count" id="count">0 / 29</div>
          </div>
        </div>
      </div>

      <div class="counterrow">
        <div class="plate plate--riveted counter" id="counter"></div>
        <div class="plate plate--riveted saving" id="deposit"></div>
      </div>

      <div class="plate plate--riveted shop" id="shop"></div>

      <footer class="foot">
        <span class="foot__goal" id="foot-goal"></span>
        <button class="key key--quiet" type="button" id="over">처음부터 다시</button>
      </footer>
    </section>`;

  svg = renderBlueprint(mount.querySelector('#board'), store.getState().goal.partSetId);

  mount.addEventListener('click', onClick);
  draw(mount);
  return () => mount.removeEventListener('click', onClick);
}

function draw(mount) {
  const s = store.getState();
  const { have, total, pct } = progress(s.goal.partSetId, s.owned);

  applyOwnership(svg, s.owned);
  mount.querySelector('#pct').innerHTML = `${pct}<sup>%</sup>`;
  mount.querySelector('#count').textContent = `${have} / ${total}`;

  mount.querySelector('#counter').innerHTML = `
    <span class="stamp">코인</span>
    <div class="counter__val coin-amt"><i class="coin"></i><span class="num" id="coin-val">${formatCoin(s.coins)}</span></div>
    <div class="counter__won num">${formatWon(coinToWon(s.coins))}원</div>
    <div class="counter__rate">1 코인 = <span class="num">1,000</span>원</div>`;

  renderDeposit(
    mount.querySelector('#deposit'),
    s,
    store.currentPaydayStatus(),
    nextGap(s.goal.partSetId, s.goal.totalPrice, s.owned, s.coins));
  renderShop(mount.querySelector('#shop'), s);

  mount.querySelector('#foot-goal').textContent =
    `${s.goal.name} · ${formatWon(s.goal.totalPrice)}원`;
}

function onClick(e) {
  const mount = e.currentTarget;

  const dep = mount.querySelector('#deposit');

  if (e.target.closest('#collect')) {
    store.collectAuto(adjustedAmount(dep));
    draw(mount);
    return;
  }

  if (e.target.closest('#extra-go')) {
    const won = extraAmount(dep);
    if (won > 0) store.addExtra(won);
    draw(mount);
    return;
  }

  if (e.target.closest('#plan-edit')) { askPlan(mount); return; }

  const buy = e.target.closest('[data-buy]');
  if (buy && !buy.disabled) { askBuy(mount, buy.dataset.buy); return; }

  if (e.target.closest('#over')) askStartOver();
}

/* ---- a sheet that asks one question ---- */

function openSheet(bodyHtml, confirmLabel, onConfirm, onReady) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `
    <div class="sheet sheet--buy" role="dialog" aria-modal="true" aria-labelledby="sheet-q">
      <div class="sheet__grip"></div>
      ${bodyHtml}
      <div class="sheet__actions">
        <button class="key key--quiet" type="button" data-cancel>그만두기</button>
        <button class="key key--go" type="button" data-confirm>${confirmLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(scrim);

  const close = () => { document.removeEventListener('keydown', esc); scrim.remove(); };
  const esc = (ev) => { if (ev.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  scrim.addEventListener('click', (ev) => {
    if (ev.target === scrim || ev.target.closest('[data-cancel]')) { close(); return; }
    if (ev.target.closest('[data-confirm]')) {
      const sheet = scrim.querySelector('.sheet');
      onConfirm(sheet);
      close();
    }
  });

  if (onReady) onReady(scrim.querySelector('.sheet'));
  requestAnimationFrame(() => scrim.querySelector('.sheet').classList.add('is-in'));
  scrim.querySelector('[data-confirm]').focus();
}

function askPlan(mount) {
  const g = store.getState().goal;
  openSheet(`
    <h2 class="sheet__name" id="sheet-q">정기 저금</h2>
    <p class="sheet__note">월급날마다 이 금액이 자동으로 들어옵니다.</p>
    <div class="rows">
      <div>
        <div class="row__head">
          <span class="stamp">매달 저금할 금액</span>
          <span class="row__sub coin-amt"><i class="coin"></i><span class="num" id="plan-coin">${formatCoin(wonToCoin(g.monthlyDeposit))}</span> 코인</span>
        </div>
        <div class="field field--num">
          <input id="plan-amt" type="text" inputmode="numeric" value="${formatWon(g.monthlyDeposit)}">
          <span class="field__unit">원</span>
        </div>
      </div>
      <div>
        <div class="row__head"><span class="stamp">월급날</span></div>
        <div class="field field--num">
          <input id="plan-day" type="text" inputmode="numeric" value="${g.payday}">
          <span class="field__unit">일</span>
        </div>
      </div>
    </div>`, '이렇게 바꾸기', (sheet) => {
      store.updatePlan({
        monthlyDeposit: Number(sheet.querySelector('#plan-amt').value.replace(/[^\d]/g, '')) || 0,
        payday: Number(sheet.querySelector('#plan-day').value.replace(/[^\d]/g, '')) || g.payday,
      });
      draw(mount);
    }, (sheet) => {
      const amt = sheet.querySelector('#plan-amt');
      amt.addEventListener('input', () => {
        const n = Number(amt.value.replace(/[^\d]/g, '')) || 0;
        amt.value = n ? formatWon(n) : '';
        sheet.querySelector('#plan-coin').textContent = formatCoin(wonToCoin(n));
      });
    });
}

function askStartOver() {
  const s = store.getState();
  const { have, total } = progress(s.goal.partSetId, s.owned);
  openSheet(`
    <h2 class="sheet__name" id="sheet-q">처음부터 다시 할까요?</h2>
    <p class="sheet__note">되돌릴 수 없습니다.</p>
    <p class="buy__left">
      사 둔 부품 <b class="num">${have}</b>/${total}개, 남은 코인
      <b class="num">${formatCoin(s.coins)}</b>개, 인증 기록
      <b class="num">${s.deposits.length}</b>건이 전부 사라집니다.
    </p>`, '전부 지우고 다시 시작', () => store.startOver());
}

/* ---- purchase confirmation (PRD 6.5) ---- */

function askBuy(mount, partId) {
  const s = store.getState();
  const part = pricedParts(s.goal.partSetId, s.goal.totalPrice).find((p) => p.id === partId);
  const have = ownedOf(s.owned, partId);
  const left = s.coins - part.unitCoin;

  openSheet(`
    <div class="buy__art">${partIcon(s.goal.partSetId, partId, true)}</div>
    <h2 class="sheet__name" id="sheet-q">${part.name}</h2>
    <p class="sheet__note">${part.count > 1 ? `${have + 1}번째 · 전체 ${part.count}개 중` : '하나뿐인 부품'}</p>
    <div class="buy__price">
      <span class="coin-amt"><i class="coin"></i><span class="num">${formatCoin(part.unitCoin)}</span></span>
      <span class="buy__won num">${formatWon(part.unitWon)}원</span>
    </div>
    <p class="buy__left">사고 나면 <b class="num">${formatCoin(left)}</b>코인 남습니다</p>`,
    '구매하기', () => { store.buyPart(partId); draw(mount); });
}
