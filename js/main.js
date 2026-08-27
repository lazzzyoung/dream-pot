/**
 * main.js — entry point and screen routing.
 *
 * No goal registered -> search. Goal registered -> the shop.
 * The shop itself is assembled in step 4; for now it shows the drawing and
 * the numbers the store is holding, so the flow can be walked end to end.
 */

import { renderSearch } from './screens/search.js';
import { initConfirm } from './screens/confirm.js';
import { renderBlueprint, applyOwnership } from './ui/blueprint.js';
import * as store from './store.js';
import * as parts from './parts.js';

const screen = document.getElementById('screen');
initConfirm(document.body, route);

// Step 2/3 are verified from the console.
window.__shop = { store, parts };

function route() {
  const s = store.getState();
  screen.innerHTML = '';
  if (!s.goal) renderSearch(screen);
  else renderStub(screen, s);
}

/* --- TEMPORARY: stands in for the shop until step 4 --- */
function renderStub(mount, s) {
  const { have, total, pct } = parts.progress(s.goal.partSetId, s.owned);
  const status = store.currentDepositStatus();
  const months = parts.monthsToComplete(s.goal.totalPrice, s.goal.monthlyDeposit);

  mount.innerHTML = `
    <section class="screen">
      <div class="board-wrap">
        <div class="board">
          <div class="board__svg" id="board"></div>
          <div class="board__meta">
            <div class="board__pct num">${pct}<sup>%</sup></div>
            <div class="board__count">${have} / ${total}</div>
          </div>
        </div>
      </div>

      <div class="plate plate--riveted stub">
        <span class="stamp">등록된 목표 — 상점은 4단계에서</span>
        <div class="stub__rows">
          <div class="stub__row"><span>${s.goal.name}</span>
            <span class="num">${parts.formatWon(s.goal.totalPrice)}원</span></div>
          <div class="stub__row"><span>매달</span>
            <span class="num">${parts.formatWon(s.goal.monthlyDeposit)}원 · ${parts.formatCoin(parts.wonToCoin(s.goal.monthlyDeposit))}코인</span></div>
          <div class="stub__row"><span>시작일</span><span class="num">${s.goal.startDate}</span></div>
          <div class="stub__row"><span>완성 예상</span>
            <span>${parts.formatMonths(months)} 뒤 · ${parts.completionDate(s.goal.startDate, months)}</span></div>
          <div class="stub__row"><span>코인 잔액</span>
            <span class="coin-amt"><i class="coin"></i><span class="num">${parts.formatCoin(s.coins)}</span></span></div>
          <div class="stub__row"><span>다음 인증</span>
            <span class="num">${status.canCertify ? `지금 ${status.due}회 가능` : `${status.nextDate} (${status.daysUntil}일 뒤)`}</span></div>
        </div>
        <button class="key key--quiet" type="button" id="over">처음부터 다시</button>
      </div>
    </section>`;

  const svg = renderBlueprint(mount.querySelector('#board'), s.goal.partSetId);
  applyOwnership(svg, s.owned);
  mount.querySelector('#over').addEventListener('click', () => {
    store.startOver();
    route();
  });
}

store.subscribe((s, e) => { if (e.type === 'reset') route(); });
route();
