/**
 * store.js — the only module that touches localStorage.
 *
 * Everything else reads state through getState() and changes it through the
 * actions here. The store publishes on every change; UI modules subscribe and
 * redraw. Global redraw is fine until it isn't.
 */

import {
  getPartSet, pricedParts, buyState, ownedOf, isComplete,
  depositStatus, wonToCoin, unitPriceWon, todayISO, BUY,
} from './parts.js';

const KEY = 'parts-shop:v1';
const VERSION = 1;

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
  // v1 is the first schema. Future versions add cases here.
  const s = { ...emptyState(), ...raw, version: VERSION };
  s.owned = (raw.owned && typeof raw.owned === 'object') ? { ...raw.owned } : {};
  s.deposits = Array.isArray(raw.deposits) ? raw.deposits.slice() : [];
  s.coins = Number(raw.coins) || 0;
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
                             monthlyDeposit, startDate }) {
  const goal = {
    id,
    name,
    totalPrice: Math.round(Number(totalPrice)),
    partSetId,
    monthlyDeposit: Math.round(Number(monthlyDeposit)),
    startDate: startDate || todayISO(),
    createdAt: new Date().toISOString(),
  };
  return commit({ ...emptyState(), goal }, { type: 'goal:created', goal });
}

/**
 * Certify one month of saving. `amount` overrides the plan for this month
 * (bonus months, lean months). Coins are amount / 1,000.
 */
export function certify(amount, now = new Date()) {
  if (!state.goal) return { ok: false, reason: 'no_goal' };

  const status = depositStatus(state.goal, state.deposits.length, now);
  if (!status.canCertify) return { ok: false, reason: 'not_due', status };

  const won = Math.max(0, Math.round(Number(amount)));
  const coins = wonToCoin(won);
  const entry = { date: status.nextDate, amount: won, coins };

  commit({
    ...state,
    coins: state.coins + coins,
    deposits: [...state.deposits, entry],
  }, { type: 'deposit:added', entry, coinsAfter: state.coins + coins });

  return { ok: true, entry, coins };
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

export function currentDepositStatus(now = new Date()) {
  if (!state.goal) return null;
  return depositStatus(state.goal, state.deposits.length, now);
}

export function currentPrices() {
  if (!state.goal) return [];
  return pricedParts(state.goal.partSetId, state.goal.totalPrice);
}

export function totalSaved() {
  return state.deposits.reduce((n, d) => n + (Number(d.amount) || 0), 0);
}

export const STORAGE_KEY = KEY;
