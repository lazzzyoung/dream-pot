/**
 * model3.js — Model 3 side elevation as an inline SVG string.
 *
 * Structure contract (blueprint.js depends on it):
 *   <g class="part" data-part="<id>" data-count="<total>">
 *     <g class="unit" data-index="0"> ... </g>   // one per VISIBLE unit
 *   </g>
 *
 * data-count is the part's total quantity from the PRD table.
 * A part may draw fewer units than data-count: a side elevation only shows
 * one side of the car. Units are filled visible-first, so buying 2 wheels
 * lights up exactly 2 wheels on the drawing.
 *
 * Every shape carries a mat-* class. In blueprint state those fills are
 * suppressed; owning the unit turns them on. All styling lives in CSS.
 *
 * Geometry — scaled from the real car at 0.155 px/mm, car facing left:
 *   viewBox 0 0 820 360   ground y=300   nose x=46   tail x=768
 *   length 4694mm = 722px   height 1443mm = 224px   wheelbase 2875mm = 446px
 *   wheel centres (180, 246) and (626, 246), tire r=54, arch r=62
 *   rocker y=258   beltline y=140   roof y=74
 */

export const MODEL3_VIEWBOX = '0 0 820 360';

/** Wheel — tire, rim, five aero spokes, hub. */
function wheel(cx, cy) {
  const spokes = [];
  for (let i = 0; i < 5; i++) {
    const a = (i * 72 - 72) * Math.PI / 180;
    const x1 = (cx + Math.cos(a) * 14).toFixed(1), y1 = (cy + Math.sin(a) * 14).toFixed(1);
    const x2 = (cx + Math.cos(a) * 31).toFixed(1), y2 = (cy + Math.sin(a) * 31).toFixed(1);
    spokes.push(`<path class="mat-none" d="M ${x1} ${y1} L ${x2} ${y2}"/>`);
  }
  return `
      <circle class="mat-rubber" cx="${cx}" cy="${cy}" r="54"/>
      <circle class="mat-metal"  cx="${cx}" cy="${cy}" r="34"/>
      ${spokes.join('\n      ')}
      <circle class="mat-metal-d" cx="${cx}" cy="${cy}" r="9"/>`;
}

/** Suspension — top mount, strut, coil, lower control arm. */
function suspension(cx) {
  const coil = [];
  for (let i = 0; i < 7; i++) coil.push(`${cx + (i % 2 ? 12 : -10)} ${193 + i * 6}`);
  return `
      <path class="mat-none" d="M ${cx - 12} 190 L ${cx + 14} 190"/>
      <path class="mat-none" d="M ${cx + 1} 190 L ${cx + 1} 240"/>
      <path class="mat-none" d="M ${coil.join(' L ')}"/>
      <path class="mat-metal-d" d="M ${cx - 38} 246 L ${cx} 237 L ${cx + 38} 246 L ${cx + 36} 251 L ${cx} 243 L ${cx - 36} 251 Z"/>`;
}

/** The bare silhouette. Also used as a thumbnail on catalog cards. */
export const MODEL3_OUTLINE =
  'M 68 258 L 119 258 A 62 62 0 0 1 241 258 L 565 258 A 62 62 0 0 1 687 258 L 750 258 C 762 257 768 250 768 240 L 768 172 C 767 160 764 152 758 146 L 706 132 C 656 116 600 94 542 82 C 508 76 470 73 440 74 C 410 75 380 80 352 90 L 246 138 C 192 152 128 166 84 178 C 64 183 48 192 46 208 L 46 238 C 46 250 56 258 68 258 Z';

/* --- shared outlines: the paint shell cuts these out, the panels fill them --- */
const D_HOOD  = 'M 84 178 C 128 166 192 152 246 138 L 250 156 C 196 170 134 184 90 196 Z';
const D_TRUNK = 'M 706 132 L 758 146 C 764 152 767 160 768 172 L 748 174 C 746 163 743 157 738 153 L 696 143 Z';
const D_DOOR_F = 'M 288 141 L 450 139 L 450 254 L 294 254 Z';
const D_DOOR_R = 'M 454 139 L 564 137 L 558 254 L 454 254 Z';
const D_GLASSHOUSE =
  'M 256 140 L 358 96 C 384 86 412 82 440 83 C 472 82 506 88 538 98 C 594 114 646 128 690 140 Z';

export const MODEL3_SVG = `
<svg class="bp" viewBox="${MODEL3_VIEWBOX}" role="img"
     aria-label="테슬라 모델3 측면 설계도" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="bp-grid-pat" width="20" height="20" patternUnits="userSpaceOnUse">
      <path class="bp-grid" d="M 20 0 L 0 0 L 0 20"/>
    </pattern>
    <pattern id="bp-grid-fine" width="4" height="4" patternUnits="userSpaceOnUse">
      <circle class="bp-grid-dot" cx="0" cy="0" r="0.4"/>
    </pattern>
  </defs>

  <!-- ---------- sheet ---------- -->
  <g class="bp-sheet" aria-hidden="true">
    <rect x="0" y="0" width="820" height="360" fill="url(#bp-grid-fine)"/>
    <rect x="0" y="0" width="820" height="360" fill="url(#bp-grid-pat)"/>
    <rect class="bp-frame" x="10" y="10" width="800" height="340"/>
    <g class="bp-titleblock">
      <rect class="bp-frame" x="22" y="22" width="196" height="42"/>
      <path class="bp-frame" d="M 22 43 L 218 43"/>
      <text class="bp-tb-main" x="32" y="37">MODEL 3 · RWD</text>
      <text class="bp-tb-sub"  x="32" y="57">측면도 / SIDE ELEV.</text>
      <text class="bp-tb-sub"  x="168" y="57">1:20</text>
    </g>
  </g>

  <!-- ---------- dimensions ---------- -->
  <g class="bp-dims" aria-hidden="true">
    <path class="bp-ground" d="M 24 300 L 796 300"/>

    <path class="bp-ext" d="M 180 252 L 180 320"/>
    <path class="bp-ext" d="M 626 252 L 626 320"/>
    <path class="bp-dimline" d="M 180 314 L 626 314"/>
    <path class="bp-tick" d="M 180 310 L 180 318 M 626 310 L 626 318"/>
    <text class="bp-dimtext" x="403" y="311" text-anchor="middle">2,875</text>

    <path class="bp-ext" d="M 46 264 L 46 336"/>
    <path class="bp-ext" d="M 768 264 L 768 336"/>
    <path class="bp-dimline" d="M 46 330 L 768 330"/>
    <path class="bp-tick" d="M 46 326 L 46 334 M 768 326 L 768 334"/>
    <text class="bp-dimtext" x="407" y="327" text-anchor="middle">4,694</text>

    <path class="bp-ext" d="M 440 74 L 34 74"/>
    <path class="bp-dimline" d="M 40 74 L 40 300"/>
    <path class="bp-tick" d="M 36 74 L 44 74 M 36 300 L 44 300"/>
    <text class="bp-dimtext" x="36" y="187" text-anchor="middle"
          transform="rotate(-90 36 187)">1,443</text>
  </g>

  <!-- ---------- parts, back to front ---------- -->
  <g class="bp-parts">

    <g class="part" data-part="chassis" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-metal" d="M 96 254 L 96 240 L 168 238 L 196 220 L 284 218 L 546 218 L 618 220 L 646 238 L 736 240 L 736 254 L 646 252 L 618 234 L 546 232 L 284 232 L 196 234 L 168 252 Z"/>
        <path class="mat-none" d="M 328 220 L 328 230 M 412 220 L 412 230 M 496 220 L 496 230"/>
        <path class="mat-metal-d" d="M 138 226 L 194 224 L 194 238 L 138 240 Z"/>
        <path class="mat-metal-d" d="M 620 226 L 684 228 L 684 242 L 620 240 Z"/>
      </g>
    </g>

    <g class="part" data-part="battery" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-dark" d="M 282 234 L 546 234 L 546 254 L 282 254 Z"/>
        <path class="mat-none" d="M 320 235 L 320 253 M 358 235 L 358 253 M 396 235 L 396 253 M 434 235 L 434 253 M 472 235 L 472 253 M 510 235 L 510 253"/>
      </g>
    </g>

    <g class="part" data-part="motor" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-metal" d="M 590 218 L 652 218 C 660 218 664 224 664 232 L 664 244 C 664 252 660 256 652 256 L 590 256 C 584 256 582 250 582 242 L 582 232 C 582 224 584 218 590 218 Z"/>
        <circle class="mat-metal-d" cx="624" cy="237" r="13"/>
        <path class="mat-none" d="M 598 226 L 598 248 M 608 224 L 608 250"/>
      </g>
    </g>

    <g class="part" data-part="suspension" data-count="4">
      <g class="unit" data-index="0">${suspension(180)}
      </g>
      <g class="unit" data-index="1">${suspension(626)}
      </g>
    </g>

    <g class="part" data-part="seat" data-count="5">
      <g class="unit" data-index="0">
        <path class="mat-dark" d="M 354 226 L 369 226 L 374 158 L 359 156 Z"/>
        <path class="mat-dark" d="M 352 222 L 396 225 L 396 235 L 352 235 Z"/>
        <path class="mat-dark" d="M 358 152 L 373 150 L 374 125 L 359 127 Z"/>
      </g>
      <g class="unit" data-index="1">
        <path class="mat-dark" d="M 464 226 L 479 226 L 486 162 L 471 160 Z"/>
        <path class="mat-dark" d="M 462 222 L 506 225 L 506 235 L 462 235 Z"/>
        <path class="mat-dark" d="M 470 157 L 485 155 L 486 130 L 471 132 Z"/>
      </g>
    </g>

    <g class="part" data-part="dash" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-dark" d="M 256 132 L 304 126 L 308 146 L 260 154 Z"/>
        <circle class="mat-dark" cx="300" cy="152" r="15"/>
        <path class="mat-none" d="M 300 143 L 300 161 M 292 156 L 308 156"/>
        <path class="mat-none" d="M 292 142 L 282 136"/>
      </g>
    </g>

    <g class="part" data-part="display" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-lamp" d="M 318 124 L 329 122 L 329 156 L 318 158 Z"/>
      </g>
    </g>

    <g class="part" data-part="paint" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-body" fill-rule="evenodd" d="
          ${MODEL3_OUTLINE}
          ${D_GLASSHOUSE}
          ${D_HOOD}
          ${D_DOOR_F}
          ${D_DOOR_R}
          ${D_TRUNK}
        "/>
        <path class="mat-none" d="M 46 230 L 84 226 M 736 232 L 768 234 M 294 254 L 558 252"/>
      </g>
    </g>

    <g class="part" data-part="hood" data-count="2">
      <g class="unit" data-index="0">
        <path class="mat-panel-2" d="${D_HOOD}"/>
        <path class="mat-none" d="M 112 174 C 162 162 208 152 242 143"/>
      </g>
      <g class="unit" data-index="1">
        <path class="mat-panel-2" d="${D_TRUNK}"/>
        <path class="mat-none" d="M 704 140 L 750 154"/>
      </g>
    </g>

    <g class="part" data-part="door" data-count="4">
      <g class="unit" data-index="0">
        <path class="mat-panel" d="${D_DOOR_F}"/>
        <path class="mat-none" d="M 296 198 C 336 195 400 192 448 190"/>
        <path class="mat-metal-d" d="M 402 156 L 436 154 L 436 162 L 402 164 Z"/>
      </g>
      <g class="unit" data-index="1">
        <path class="mat-panel" d="${D_DOOR_R}"/>
        <path class="mat-none" d="M 456 195 C 492 193 530 190 556 188"/>
        <path class="mat-metal-d" d="M 510 154 L 544 152 L 544 160 L 510 162 Z"/>
      </g>
    </g>

    <g class="part" data-part="glass" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-glass" d="M 260 139 L 360 98 L 384 94 L 292 138 Z"/>
        <path class="mat-glass" d="M 298 137 L 390 93 C 404 89 420 86 436 85 L 436 136 Z"/>
        <path class="mat-glass" d="M 442 136 L 442 85 C 468 85 496 89 518 96 L 534 133 Z"/>
        <path class="mat-glass" d="M 542 133 L 526 96 C 574 108 630 124 678 138 L 546 138 Z"/>
      </g>
    </g>

    <g class="part" data-part="lamp" data-count="2">
      <g class="unit" data-index="0">
        <path class="mat-lamp" d="M 52 194 L 90 182 L 98 192 L 58 204 Z"/>
      </g>
      <g class="unit" data-index="1">
        <path class="mat-lamp" d="M 738 180 L 766 183 L 766 199 L 736 195 Z"/>
      </g>
    </g>

    <g class="part" data-part="sensor" data-count="1">
      <g class="unit" data-index="0">
        <path class="mat-dark" d="M 356 106 L 376 102 L 378 110 L 358 114 Z"/>
        <circle class="mat-dark" cx="439" cy="118" r="3"/>
        <circle class="mat-dark" cx="234" cy="154" r="3"/>
        <circle class="mat-dark" cx="676" cy="134" r="3"/>
        <path class="mat-dark" d="M 48 222 L 64 220 L 64 229 L 48 231 Z"/>
      </g>
    </g>

    <g class="part" data-part="wheel" data-count="4">
      <g class="unit" data-index="0">${wheel(180, 246)}
      </g>
      <g class="unit" data-index="1">${wheel(626, 246)}
      </g>
    </g>

  </g>
</svg>`;
