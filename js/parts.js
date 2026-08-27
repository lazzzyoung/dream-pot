/**
 * parts.js — part set definitions and every pure calculation in the app.
 * Knows nothing about the DOM or localStorage. Amounts are integer KRW.
 *
 * Weights are a share of the goal price (%), so changing the goal price
 * reprices every part automatically. They must sum to exactly 100.
 */

export const COIN_WON = 1000; // 1 coin = 1,000 KRW, fixed

export const PART_SETS = {
  model3: {
    id: 'model3',
    // order = drawing order / natural assembly order
    parts: [
      { id: 'chassis',    name: '섀시 프레임',              count: 1, weight: 10 },
      { id: 'battery',    name: '배터리팩',                 count: 1, weight: 24 },
      { id: 'motor',      name: '구동 모터',                count: 1, weight: 9  },
      { id: 'paint',      name: '도색 · 마감',              count: 1, weight: 12 },
      { id: 'door',       name: '도어',                     count: 4, weight: 8,
        units: ['앞문', '뒷문', '반대편 앞문', '반대편 뒷문'] },
      { id: 'wheel',      name: '휠 · 타이어',              count: 4, weight: 6,
        units: ['앞바퀴', '뒷바퀴', '반대편 앞바퀴', '반대편 뒷바퀴'] },
      { id: 'suspension', name: '서스펜션',                 count: 4, weight: 6,
        units: ['앞 서스펜션', '뒤 서스펜션', '반대편 앞 서스펜션', '반대편 뒤 서스펜션'] },
      { id: 'seat',       name: '시트',                     count: 5, weight: 6,
        units: ['운전석 시트', '뒷좌석 시트', '조수석 시트', '반대편 뒷좌석 시트', '가운데 뒷좌석 시트'] },
      { id: 'sensor',     name: '오토파일럿 센서',          count: 1, weight: 4  },
      { id: 'hood',       name: '후드 · 트렁크',            count: 2, weight: 4,
        units: ['후드', '트렁크 리드'] },
      { id: 'glass',      name: '윈드실드 · 사이드 글라스', count: 1, weight: 3  },
      { id: 'lamp',       name: '헤드램프 · 테일램프',      count: 2, weight: 3,
        units: ['헤드램프', '테일램프'] },
      { id: 'dash',       name: '대시보드 · 스티어링',      count: 1, weight: 3  },
      { id: 'display',    name: '센터 디스플레이',          count: 1, weight: 2  },
    ],
  },
};

/* ============================================================
   paint — the one thing about the car the owner actually chooses.
   Picked at registration, applied the moment 도색 · 마감 is bought.
   Descriptive colour names; the other materials stay warm so the
   blueprint/real contrast survives even under a cool body colour.
   ============================================================ */

export const PAINTS = [
  { id: 'pearl',  name: '펄 화이트',      body: '#dcd8d0', panel: '#cfcac1', panel2: '#e6e2db', edgeLt: '#7d766c' },
  { id: 'black',  name: '솔리드 블랙',    body: '#2b2d2f', panel: '#242628', panel2: '#35383b', edgeLt: '#5f6467' },
  { id: 'silver', name: '미드나이트 실버', body: '#9a9791', panel: '#8e8b85', panel2: '#a8a5a0', edgeLt: '#55524e' },
  { id: 'blue',   name: '딥 블루',        body: '#294769', panel: '#23405f', panel2: '#325378', edgeLt: '#5e81a6' },
  { id: 'red',    name: '레드',           body: '#9c2a2a', panel: '#8b2424', panel2: '#ae3636', edgeLt: '#cf6b6b' },
];

export const getPaint = (id) => PAINTS.find((p) => p.id === id) || PAINTS[0];

/** What to call one unit of a part. Falls back to the part's own name. */
export function unitLabel(part, index) {
  return (part.units && part.units[index]) || part.name;
}

/** 을/를. Korean UI deserves the right particle. */
export function objectParticle(word) {
  const code = String(word).charCodeAt(String(word).length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return '를';
  return (code - 0xAC00) % 28 ? '을' : '를';
}

export function getPartSet(id) {
  return PART_SETS[id] || PART_SETS.model3;
}

/** Every unit of every part, counted. */
export function totalUnits(setId) {
  return getPartSet(setId).parts.reduce((n, p) => n + p.count, 0);
}

/* ============================================================
   money
   ============================================================ */

export const wonToCoin = (won) => Math.round(won / COIN_WON);
export const coinToWon = (coin) => coin * COIN_WON;

/** Price of ONE unit of a part, in KRW. */
export function unitPriceWon(totalPrice, part) {
  return Math.round(totalPrice * part.weight / 100 / part.count);
}

/** Every part with its unit price attached. */
export function pricedParts(setId, totalPrice) {
  return getPartSet(setId).parts.map((p) => {
    const won = unitPriceWon(totalPrice, p);
    return { ...p, unitWon: won, unitCoin: wonToCoin(won) };
  });
}

export const formatWon  = (n) => Math.round(n).toLocaleString('ko-KR');
export const formatCoin = (n) => Math.round(n).toLocaleString('ko-KR');

/** 46,990,000 -> "4,699만". Used where an exact figure would be noise. */
export function formatManWon(won) {
  return `${Math.round(won / 10000).toLocaleString('ko-KR')}만`;
}

/* ============================================================
   buying
   ============================================================ */

export const BUY = {
  OK: 'ok',
  SOLD_OUT: 'sold_out',   // every unit already owned
  NO_COINS: 'no_coins',
};

/**
 * Why can (or can't) this part be bought right now?
 * Pure: takes the numbers, returns a reason code.
 * There is no forced first purchase — the shop is open from day one and the
 * customer picks whatever they can afford.
 */
export function buyState(setId, partId, owned, coins, totalPrice) {
  const set = getPartSet(setId);
  const part = set.parts.find((p) => p.id === partId);
  if (!part) return BUY.SOLD_OUT;

  const have = ownedOf(owned, partId);
  if (have >= part.count) return BUY.SOLD_OUT;

  if (coins < wonToCoin(unitPriceWon(totalPrice, part))) return BUY.NO_COINS;
  return BUY.OK;
}

export const ownedOf = (owned, partId) => Number(owned?.[partId]) || 0;

/**
 * Shop order (PRD 6.5): buyable first, then cheapest first.
 * Sold-out parts sink to the bottom.
 */
export function shopOrder(setId, totalPrice, owned, coins) {
  const rank = { [BUY.OK]: 0, [BUY.NO_COINS]: 1, [BUY.SOLD_OUT]: 2 };
  return pricedParts(setId, totalPrice)
    .map((p) => ({ ...p, state: buyState(setId, p.id, owned, coins, totalPrice),
                   have: ownedOf(owned, p.id) }))
    .sort((a, b) => (rank[a.state] - rank[b.state]) || (a.unitCoin - b.unitCoin));
}

/** How many distinct parts a given coin balance could buy from scratch. */
export function affordableCount(setId, totalPrice, coins) {
  return pricedParts(setId, totalPrice).filter((p) => p.unitCoin <= coins).length;
}

/** The cheapest part in the set — what the first purchase will realistically be. */
export function cheapestPart(setId, totalPrice) {
  return pricedParts(setId, totalPrice)
    .reduce((a, b) => (b.unitCoin < a.unitCoin ? b : a));
}

/** Owned units / total units, and the percentage the drawing represents. */
export function progress(setId, owned) {
  const total = totalUnits(setId);
  const have = getPartSet(setId).parts
    .reduce((n, p) => n + Math.min(ownedOf(owned, p.id), p.count), 0);
  return { have, total, pct: total ? Math.round((have / total) * 100) : 0 };
}

export function isComplete(setId, owned) {
  return getPartSet(setId).parts.every((p) => ownedOf(owned, p.id) >= p.count);
}

/* ============================================================
   dates — local time only, never UTC. 'YYYY-MM-DD' in, 'YYYY-MM-DD' out.
   ============================================================ */

export function parseDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDate(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Same day-of-month n months on, clamped (Jan 31 + 1 month -> Feb 28). */
export function addMonths(date, n) {
  const first = new Date(date.getFullYear(), date.getMonth() + n, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(date.getDate(), lastDay));
  return first;
}

const DAY = 86400000;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function daysUntil(from, to) {
  return Math.round((midnight(to) - midnight(from)) / DAY);
}

export function todayISO(now = new Date()) {
  return formatDate(now);
}

/* ============================================================
   saving — two lanes.
   AUTO  : a fixed amount that lands every payday. The user sets it once.
   EXTRA : any amount, any time. This is what closes a 5-coin gap so nobody
           waits a month over pocket change.
   ============================================================ */

/** The `day`-th of a month, pulled back to the last day when short. */
export function dayInMonth(year, month, day) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

/** The n-th payday of this goal (0 = the first one on or after the start). */
export function nthPayday(goal, n) {
  const start = parseDate(goal.startDate);
  const day = goal.payday || start.getDate();
  let month = start.getMonth();
  if (dayInMonth(start.getFullYear(), month, day) < start) month += 1;
  return dayInMonth(start.getFullYear(), month + n, day);
}

/**
 * Where the auto lane stands. `collected` is how many paydays have already
 * been paid out. Missed paydays stack up and are collected together.
 */
export function paydayStatus(goal, collected, now = new Date()) {
  const next = nthPayday(goal, collected);
  let due = 0;
  while (due < 600 && daysUntil(now, nthPayday(goal, collected + due)) <= 0) due++;

  return {
    nextDate: formatDate(next),
    daysUntil: daysUntil(now, next),   // <= 0 means it has already landed
    due,                                // paydays waiting to be collected
    ready: due > 0,
    coins: due * wonToCoin(goal.monthlyDeposit),
    won: due * goal.monthlyDeposit,
  };
}

/**
 * The cheapest part still out of reach, and the gap to it.
 * This is what the extra-saving field offers to fill in one tap.
 */
export function nextGap(setId, totalPrice, owned, coins) {
  const wanted = pricedParts(setId, totalPrice)
    .filter((p) => ownedOf(owned, p.id) < p.count && p.unitCoin > coins)
    .sort((a, b) => a.unitCoin - b.unitCoin)[0];
  if (!wanted) return null;
  const short = wanted.unitCoin - coins;
  return { part: wanted, coins: short, won: coinToWon(short) };
}

/* ============================================================
   projection — "이 속도면 N년 M개월 뒤 완성" (PRD 6.2)
   ============================================================ */

export function monthsToComplete(totalPrice, monthlyDeposit) {
  if (!monthlyDeposit || monthlyDeposit <= 0) return Infinity;
  return Math.ceil(totalPrice / monthlyDeposit);
}

/** 94 -> "7년 10개월", 12 -> "1년", 5 -> "5개월" */
export function formatMonths(months) {
  if (!Number.isFinite(months)) return '—';
  const y = Math.floor(months / 12), m = months % 12;
  if (y && m) return `${y}년 ${m}개월`;
  if (y) return `${y}년`;
  return `${m}개월`;
}

export function completionDate(startISO, months) {
  if (!Number.isFinite(months)) return null;
  return formatDate(addMonths(parseDate(startISO), months));
}
