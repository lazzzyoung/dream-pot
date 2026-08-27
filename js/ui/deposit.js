/**
 * deposit.js — 저금 카드. Two lanes.
 *
 * 정기: a standing amount that lands on payday. Nothing to type — it is
 *       already decided. When it has landed it waits to be collected, so
 *       opening the app on payday still has a moment in it.
 * 추가: any amount, any time. Offers to fill exactly the gap to the cheapest
 *       part you cannot afford, because being 5 coins short for a month is
 *       the fastest way to lose someone.
 */

import { formatWon, formatCoin, wonToCoin, parseDate } from '../parts.js';

const dayLabel = (iso) => {
  const d = parseDate(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

function log(deposits) {
  if (!deposits.length) return '';
  const rows = deposits.slice().reverse().slice(0, 40).map((d) => `
    <li class="log__row">
      <span class="num">${d.date}</span>
      <span class="log__kind">${d.kind === 'extra' ? '추가' : '정기'}</span>
      <span class="num">${formatWon(d.amount)}원</span>
      <span class="coin-amt"><i class="coin"></i><span class="num">${formatCoin(d.coins)}</span></span>
    </li>`).join('');
  return `
    <details class="log">
      <summary>저금 기록 <span class="num">${deposits.length}</span>건</summary>
      <ul class="log__list">${rows}</ul>
    </details>`;
}

/* ---- 정기 lane ---- */

function autoLane(goal, status) {
  const plan = `<button class="linkbtn" type="button" id="plan-edit">정기 저금 바꾸기</button>`;

  if (!status.ready) {
    return `
      <div class="lane">
        <span class="stamp">정기 저금</span>
        <p class="lane__line">
          다음 월급날 <b>${dayLabel(status.nextDate)}</b>에
          <span class="coin-amt"><i class="coin"></i><span class="num">${formatCoin(wonToCoin(goal.monthlyDeposit))}</span></span> 들어옵니다
        </p>
        <p class="lane__sub num">${status.daysUntil}일 남음 · ${formatWon(goal.monthlyDeposit)}원 자동</p>
        ${plan}
      </div>`;
  }

  return `
    <div class="lane lane--ready">
      <span class="stamp">정기 저금 · 도착</span>
      <p class="lane__line">
        ${status.due > 1
          ? `밀린 월급날 <b>${status.due}번</b>치가 쌓여 있습니다`
          : `<b>${dayLabel(status.nextDate)}</b> 월급날 저금이 들어왔습니다`}
      </p>
      <p class="lane__sub num">${formatWon(status.won)}원</p>
      <button class="key key--go key--wide" type="button" id="collect">
        <span class="num">${formatCoin(status.coins)}</span>코인 받기
      </button>
      ${status.due === 1 ? `
        <button class="linkbtn" type="button" id="adjust">금액이 달랐어요</button>
        <div class="adjust" id="adjust-box" hidden>
          <div class="field field--num">
            <input id="adjust-amt" type="text" inputmode="numeric" value="${formatWon(goal.monthlyDeposit)}">
            <span class="field__unit">원</span>
          </div>
        </div>` : plan}
    </div>`;
}

/* ---- 추가 lane ---- */

function extraLane(gap) {
  const chip = gap ? `
    <button class="chip" type="button" id="fill-gap">
      <span class="chip__lead">${gap.part.name}까지</span>
      <span class="chip__main coin-amt"><i class="coin"></i><span class="num">${formatCoin(gap.coins)}</span></span>
      <span class="chip__sub num">${formatWon(gap.won)}원 넣기</span>
    </button>` : '';

  return `
    <div class="lane">
      <span class="stamp">추가 저금</span>
      ${chip}
      <div class="extra__row">
        <div class="field field--num">
          <input id="extra-amt" type="text" inputmode="numeric" placeholder="0">
          <span class="field__unit">원</span>
        </div>
        <button class="key key--go" type="button" id="extra-go" disabled>넣기</button>
      </div>
      <p class="lane__sub" id="extra-hint">넣는 만큼 바로 코인이 됩니다</p>
    </div>`;
}

export function renderDeposit(mount, state, status, gap) {
  mount.innerHTML = `
    <div class="lanes">
      ${autoLane(state.goal, status)}
      ${extraLane(gap)}
    </div>
    ${log(state.deposits)}`;

  const amt = mount.querySelector('#extra-amt');
  const go = mount.querySelector('#extra-go');
  const hint = mount.querySelector('#extra-hint');

  amt.addEventListener('input', () => {
    const n = Number(amt.value.replace(/[^\d]/g, '')) || 0;
    amt.value = n ? formatWon(n) : '';
    go.disabled = n <= 0;
    hint.innerHTML = n
      ? `<span class="coin-amt"><i class="coin"></i><span class="num">${formatCoin(wonToCoin(n))}</span></span> 생깁니다`
      : '넣는 만큼 바로 코인이 됩니다';
  });

  const adjust = mount.querySelector('#adjust');
  if (adjust) {
    adjust.addEventListener('click', () => {
      const box = mount.querySelector('#adjust-box');
      box.hidden = !box.hidden;
      adjust.hidden = true;
      if (!box.hidden) box.querySelector('input').focus();
    });
    mount.querySelector('#adjust-amt').addEventListener('input', (e) => {
      const n = Number(e.target.value.replace(/[^\d]/g, '')) || 0;
      e.target.value = n ? formatWon(n) : '';
      const label = mount.querySelector('#collect .num');
      if (label) label.textContent = formatCoin(wonToCoin(n));
    });
  }

  const fill = mount.querySelector('#fill-gap');
  if (fill && gap) {
    fill.addEventListener('click', () => {
      amt.value = formatWon(gap.won);
      amt.dispatchEvent(new Event('input'));
      amt.focus();
    });
  }
}

/** Whatever the extra field is holding. */
export function extraAmount(mount) {
  const el = mount.querySelector('#extra-amt');
  return el ? Number(el.value.replace(/[^\d]/g, '')) || 0 : 0;
}

/** The adjusted payday amount, or null when the user did not touch it. */
export function adjustedAmount(mount) {
  const box = mount.querySelector('#adjust-box');
  if (!box || box.hidden) return null;
  return Number(box.querySelector('input').value.replace(/[^\d]/g, '')) || 0;
}
