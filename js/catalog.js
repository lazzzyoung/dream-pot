/**
 * catalog.js — the shop's stock list.
 * Hard-coded reference prices. No live quotes, no network. (PRD 6.1)
 */

export const CATALOG = [
  {
    id: 'model3-standard',
    name: '테슬라 모델3 스탠다드 RWD',
    note: '신차',
    basePrice: 46990000,
    partSetId: 'model3',
    keywords: ['테슬라', '모델3', '모델 3', 'tesla', 'model3', 'model 3', '전기차', 'rwd'],
  },
  {
    id: 'model3-long',
    name: '테슬라 모델3 롱레인지',
    note: '신차',
    basePrice: 59990000,
    partSetId: 'model3',
    keywords: ['테슬라', '모델3', 'tesla', 'model3', '롱레인지', 'long range', '전기차'],
  },
  {
    id: 'model3-used22',
    name: '테슬라 모델3',
    note: '중고 · 2022년식',
    basePrice: 30300000,
    partSetId: 'model3',
    keywords: ['테슬라', '모델3', 'tesla', 'model3', '중고', '전기차'],
  },
  {
    id: 'modely-premium',
    name: '테슬라 모델Y 프리미엄 RWD',
    note: '신차',
    basePrice: 49990000,
    partSetId: 'model3',
    keywords: ['테슬라', '모델y', '모델 y', 'tesla', 'modely', 'model y', '전기차', 'suv'],
  },
];

const norm = (s) => String(s).toLowerCase().replace(/\s+/g, '');

/** Empty query shows the whole shelf. */
export function searchCatalog(query) {
  const q = norm(query || '');
  if (!q) return CATALOG.slice();
  return CATALOG.filter((item) =>
    norm(item.name).includes(q) ||
    item.keywords.some((k) => norm(k).includes(q) || q.includes(norm(k))));
}
