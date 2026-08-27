/**
 * main.js — entry point and screen routing.
 *
 * No goal registered -> search. Goal registered -> the shop.
 */

import { renderSearch } from './screens/search.js';
import { initConfirm } from './screens/confirm.js';
import { renderMain } from './screens/main.js';
import * as store from './store.js';
import * as parts from './parts.js';

const screen = document.getElementById('screen');
initConfirm(document.body, route);

// Handy from the console while prototyping.
window.__shop = { store, parts };

function route() {
  const s = store.getState();
  screen.innerHTML = '';
  if (!s.goal) renderSearch(screen);
  else renderMain(screen);
}

store.subscribe((s, e) => { if (e.type === 'reset') route(); });
route();
