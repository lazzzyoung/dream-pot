/**
 * parts.js — part set definitions and pure price math.
 * Knows nothing about the DOM or localStorage.
 *
 * Weights are a share of the goal price (%), so changing the goal price
 * repriced every part automatically. They must sum to exactly 100.
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
    // chassis first: the shop keeper refuses to sell anything else until
    // there is a frame to bolt it to.
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
