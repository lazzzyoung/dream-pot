/**
 * store.js — the only module that touches localStorage.
 *
 * Everything else reads state through getState() and changes it through the
 * actions here. The store publishes on every change; UI modules subscribe and
 * redraw. Global redraw is fine until it isn't.
 */

import {
  getPartSet, pricedParts, buyState, ownedOf, isComplete,
  paydayStatus, nthPayday as nthPaydayOf, wonToCoin, unitPriceWon,
  todayISO, parseDate, formatDate, BUY,
} from './parts.js';

const KEY = 'parts-shop:v1';
const VERSION = 2;

const emptyState = () => ({
  version: VERSION,
  goal: null,
  coins: 0,
  owned: {},
  deposits: [],
  completedAt: null,
});

/* ------------------------------------------------------------
   persistence
   ------------------------------------------------------------ */

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyState();
  const s = { ...emptyState(), ...raw, version: VERSION };
  s.owned = (raw.owned && typeof raw.owned === 'object') ? { ...raw.owned } : {};
  s.deposits = Array.isArray(raw.deposits) ? raw.deposits.slice() : [];
  s.coins = Number(raw.coins) || 0;

  // v1 -> v2: saving split into an auto lane and an extra lane.
  // Everything recorded under v1 was a scheduled monthly deposit.
  if ((Number(raw.version) || 1) < 2) {
    s.deposits = s.deposits.map((d) => ({ ...d, kind: d.kind || 'auto' }));
    if (s.goal && !s.goal.payday) {
      s.goal = { ...s.goal, payday: parseDate(s.goal.startDate).getDate() };
    }
  }
  return s;
}

function read() {
  try {
    const text = localStorage.getItem(KEY);
    return text ? migrate(JSON.parse(text)) : emptyState();
  } catch (err) {
    console.warn('[store] 저장된 상태를 읽지 못해 새로 시작합니다.', err);
    return emptyState();
  }
}

function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (err) {
    console.warn('[store] 저장 실패.', err);
  }
}

/* ------------------------------------------------------------
   state + subscription
   ------------------------------------------------------------ */

let state = read();
const listeners = new Set();

export function getState() { return state; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Apply a mutation, persist, then tell everyone what happened. */
function commit(next, event) {
  state = next;
  write(state);
  listeners.forEach((fn) => fn(state, event));
  return event;
}

/* ------------------------------------------------------------
   actions
   ------------------------------------------------------------ */

/** Register the one goal. Replaces any previous run entirely. */
export function createGoal({ id, name, totalPrice, partSetId = 'model3',
                             monthlyDeposit, payday, startDate }) {
  const start = startDate || todayISO();
  const goal = {
    id,
    name,
    totalPrice: Math.round(Number(totalPrice)),
    partSetId,
    monthlyDeposit: Math.round(Number(monthlyDeposit)),  // the auto lane
    payday: Math.min(31, Math.max(1, Math.round(Number(payday)) || parseDate(start).getDate())),
    startDate: start,
    createdAt: new Date().toISOString(),
  };
  return commit({ ...emptyState(), goal }, { type: 'goal:created', goal });
}

const autoCount = (s) => s.deposits.filter((d) => d.kind !== 'extra').length;

/**
 * Collect every payday that has landed. One tap takes the whole backlog, but
 * each payday still gets its own record.
 * `overrideWon` adjusts a single payday when the real transfer differed.
 */
export function collectAuto(overrideWon = null, now = new Date()) {
  if (!state.goal) return { ok: false, reason: 'no_goal' };

  const status = paydayStatus(state.goal, autoCount(state), now);
  if (!status.ready) return { ok: false, reason: 'not_due', status };

  const paid = autoCount(state);
  const entries = [];
  for (let i = 0; i < status.due; i++) {
    const won = (status.due === 1 && overrideWon != null)
      ? Math.max(0, Math.round(Number(overrideWon)))
      : state.goal.monthlyDeposit;
    entries.push({
      date: formatDate(nthPaydayOf(state.goal, paid + i)),
      amount: won,
      coins: wonToCoin(won),
      kind: 'auto',
    });
  }
  const coins = entries.reduce((n, e) => n + e.coins, 0);

  commit({
    ...state,
    coins: state.coins + coins,
    deposits: [...state.deposits, ...entries],
  }, { type: 'deposit:added', entries, coins, lane: 'auto' });

  return { ok: true, entries, coins, months: entries.length };
}

/**
 * Put in extra, right now. This is the release valve: nobody should wait a
 * month because they are 5 coins short of a door.
 */
export function addExtra(amountWon, now = new Date()) {
  if (!state.goal) return { ok: false, reason: 'no_goal' };
  const won = Math.max(0, Math.round(Number(amountWon)));
  if (won <= 0) return { ok: false, reason: 'empty' };

  const entry = { date: formatDate(now), amount: won, coins: wonToCoin(won), kind: 'extra' };
  commit({
    ...state,
    coins: state.coins + entry.coins,
    deposits: [...state.deposits, entry],
  }, { type: 'deposit:added', entries: [entry], coins: entry.coins, lane: 'extra' });

  return { ok: true, entry, coins: entry.coins };
}

/** Change the standing plan — a raise, a new payday, a tighter month. */
export function updatePlan({ monthlyDeposit, payday }) {
  if (!state.goal) return { ok: false, reason: 'no_goal' };
  const goal = {
    ...state.goal,
    monthlyDeposit: Math.max(0, Math.round(Number(monthlyDeposit))),
    payday: Math.min(31, Math.max(1, Math.round(Number(payday)))),
  };
  commit({ ...state, goal }, { type: 'plan:updated', goal });
  return { ok: true, goal };
}

/**
 * Buy one unit of a part.
 * Returns the unit index that was bought — the purchase animation needs it
 * to know which slot on the drawing to fill.
 */
export function buyPart(partId) {
  if (!state.goal) return { ok: false, reason: 'no_goal' };

  const { partSetId, totalPrice } = state.goal;
  const reason = buyState(partSetId, partId, state.owned, state.coins, totalPrice);
  if (reason !== BUY.OK) return { ok: false, reason };

  const part = getPartSet(partSetId).parts.find((p) => p.id === partId);
  const priceCoin = wonToCoin(unitPriceWon(totalPrice, part));
  const unitIndex = ownedOf(state.owned, partId);

  const owned = { ...state.owned, [partId]: unitIndex + 1 };
  const finished = isComplete(partSetId, owned);

  commit({
    ...state,
    coins: state.coins - priceCoin,
    owned,
    completedAt: finished ? (state.completedAt || new Date().toISOString()) : state.completedAt,
  }, { type: 'part:bought', partId, unitIndex, priceCoin, finished });

  return { ok: true, partId, unitIndex, priceCoin, part, finished };
}

/** "처음부터 다시" — wipe everything and go back to the search screen. */
export function startOver() {
  return commit(emptyState(), { type: 'reset' });
}

/* ------------------------------------------------------------
   derived views (thin wrappers so screens don't juggle goal fields)
   ------------------------------------------------------------ */

export function currentPaydayStatus(now = new Date()) {
  if (!state.goal) return null;
  return paydayStatus(state.goal, autoCount(state), now);
}

export function currentPrices() {
  if (!state.goal) return [];
  return pricedParts(state.goal.partSetId, state.goal.totalPrice);
}

export function totalSaved() {
  return state.deposits.reduce((n, d) => n + (Number(d.amount) || 0), 0);
}

export const STORAGE_KEY = KEY;
