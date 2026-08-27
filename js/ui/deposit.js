/**
 * deposit.js — 저축 인증 카드 (PRD 6.4)
 *
 * The schedule runs off the goal's start day, one due date per month. Missed
 * months are certified one at a time so each gets its own record. The amount is
 * editable — bonus months and lean months both happen.
 */

import { formatWon, formatCoin, wonToCoin, parseDate } from '../parts.js';

const dayLabel = (iso) => {
  const d = parseDate(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

function log(deposits) {
  if (!deposits.length) return '';
  const rows = deposits.slice().reverse().map((d) => `
    <li class="log__row">
      <span class="num">${d.date}</span>
      <span class="num">${formatWon(d.amount)}원</span>
      <span class="coin-amt"><i class="coin"></i><span class="num">${formatCoin(d.coins)}</span></span>
    </li>`).join('');
  return `
    <details class="log">
      <summary>지난 인증 <span class="num">${deposits.length}</span>건</summary>
      <ul class="log__list">${rows}</ul>
    </details>`;
}

export function renderDeposit(mount, state, status) {
  const { monthlyDeposit } = state.goal;

  if (!status.canCertify) {
    mount.innerHTML = `
      <span class="stamp">다음 인증</span>
      <p class="deposit__wait">
        <b class="num">${dayLabel(status.nextDate)}</b>에 다시 오세요
      </p>
      <p class="deposit__sub num">${status.daysUntil}일 남음</p>
      <button class="key key--go key--wide" type="button" disabled>인증하기</button>
      ${log(state.deposits)}`;
    return;
  }

  const many = status.due > 1;
  mount.innerHTML = `
    <span class="stamp">${many ? `밀린 인증 ${status.due}회` : '이번 달 인증'}</span>
    <p class="deposit__ask">
      <b>${dayLabel(status.nextDate)}</b>분, 얼마 저축했나요?
    </p>
    <div class="field field--num">
      <input id="dep-amt" type="text" inputmode="numeric" value="${formatWon(monthlyDeposit)}">
      <span class="field__unit">원</span>
    </div>
    <button class="key key--go key--wide" type="button" id="dep-go">
      인증하고 <span class="num" id="dep-coin">${formatCoin(wonToCoin(monthlyDeposit))}</span>코인 받기
    </button>
    ${many ? `<p class="deposit__sub">인증하면 ${status.due - 1}회가 더 남습니다</p>` : ''}
    ${log(state.deposits)}`;

  const amt = mount.querySelector('#dep-amt');
  const coin = mount.querySelector('#dep-coin');
  const go = mount.querySelector('#dep-go');

  amt.addEventListener('input', () => {
    const n = Number(amt.value.replace(/[^\d]/g, '')) || 0;
    amt.value = n ? formatWon(n) : '';
    coin.textContent = formatCoin(wonToCoin(n));
    go.disabled = n <= 0;
  });
}

/** What the certify button is currently holding. */
export function depositAmount(mount) {
  const el = mount.querySelector('#dep-amt');
  return el ? Number(el.value.replace(/[^\d]/g, '')) || 0 : 0;
}
