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
      { id: 'door',       name: '도어',                     count: 4, weight: 8  },
      { id: 'wheel',      name: '휠 · 타이어',              count: 4, weight: 6  },
      { id: 'suspension', name: '서스펜션',                 count: 4, weight: 6  },
      { id: 'seat',       name: '시트',                     count: 5, weight: 6  },
      { id: 'sensor',     name: '오토파일럿 센서',          count: 1, weight: 4  },
      { id: 'hood',       name: '후드 · 트렁크',            count: 2, weight: 4  },
      { id: 'glass',      name: '윈드실드 · 사이드 글라스', count: 1, weight: 3  },
      { id: 'lamp',       name: '헤드램프 · 테일램프',      count: 2, weight: 3  },
      { id: 'dash',       name: '대시보드 · 스티어링',      count: 1, weight: 3  },
      { id: 'display',    name: '센터 디스플레이',          count: 1, weight: 2  },
    ],
    // chassis first: nothing else can be bolted on until there is a frame.
    requiresFirst: 'chassis',
  },
};

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
  LOCKED: 'locked',       // chassis not owned yet
  SOLD_OUT: 'sold_out',   // every unit already owned
  NO_COINS: 'no_coins',
};

/**
 * Why can (or can't) this part be bought right now?
 * Pure: takes the numbers, returns a reason code.
 */
export function buyState(setId, partId, owned, coins, totalPrice) {
  const set = getPartSet(setId);
  const part = set.parts.find((p) => p.id === partId);
  if (!part) return BUY.SOLD_OUT;

  const have = ownedOf(owned, partId);
  if (have >= part.count) return BUY.SOLD_OUT;

  const gate = set.requiresFirst;
  if (gate && partId !== gate && ownedOf(owned, gate) < 1) return BUY.LOCKED;

  if (coins < wonToCoin(unitPriceWon(totalPrice, part))) return BUY.NO_COINS;
  return BUY.OK;
}

export const ownedOf = (owned, partId) => Number(owned?.[partId]) || 0;

/**
 * Shop order (PRD 6.5): buyable first, then cheapest first.
 * Sold-out parts sink to the bottom; locked parts sit above them.
 */
export function shopOrder(setId, totalPrice, owned, coins) {
  const rank = { [BUY.OK]: 0, [BUY.NO_COINS]: 1, [BUY.LOCKED]: 2, [BUY.SOLD_OUT]: 3 };
  return pricedParts(setId, totalPrice)
    .map((p) => ({ ...p, state: buyState(setId, p.id, owned, coins, totalPrice),
                   have: ownedOf(owned, p.id) }))
    .sort((a, b) => (rank[a.state] - rank[b.state]) || (a.unitCoin - b.unitCoin));
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
   deposits — the certification schedule (PRD 6.4)
   ============================================================ */

/**
 * Where the user stands against the monthly schedule.
 * Due dates are startDate, +1 month, +2 months … one per deposit made.
 * Several missed months each get their own certification.
 */
export function depositStatus(goal, depositCount, now = new Date()) {
  const start = parseDate(goal.startDate);
  const nextDate = addMonths(start, depositCount);
  const days = daysUntil(now, nextDate);

  let due = 0;
  while (due < 600 && daysUntil(now, addMonths(start, depositCount + due)) <= 0) due++;

  return {
    nextDate: formatDate(nextDate),
    daysUntil: days,        // <= 0 means it is already due
    due,                    // how many months are certifiable right now
    canCertify: due > 0,
  };
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
