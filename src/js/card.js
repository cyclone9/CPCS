// Draws the card as an inline SVG. The same SVG is serialised for the PNG, so layout lives only here.

const NS = 'http://www.w3.org/2000/svg';
export const CARD_W = 856;
export const CARD_H = 540;
const RADIUS = 32;
const PAD = 56;
const RIGHT = CARD_W - PAD;
const FONT = 'Vazirmatn';

const LOGO_TOP = 50;
const LOGO_MAX_H = 84;
const LOGO_MAX_W = 220;
// The «نواری» template: a light card with the colour as a band across the top, the logo centred in it.
const BAND_H = 162;
const BAND_LOGO_TOP = (BAND_H - LOGO_MAX_H) / 2;

const logoCache = new Map();

/** Loads a single-path bank logo from assets/banks/ (same origin) as {viewBox, d}. */
export async function loadLogo(name) {
  if (!name) return null;
  if (!logoCache.has(name)) {
    logoCache.set(name, (async () => {
      const res = await fetch(`assets/banks/${name}.svg`);
      if (!res.ok) throw new Error(`logo ${name}: ${res.status}`);
      const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
      const svg = doc.documentElement;
      const path = svg.querySelector('path');
      const vb = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
      if (!path || vb?.length !== 4) throw new Error(`logo ${name}: unexpected SVG`);
      return { viewBox: vb, d: path.getAttribute('d') };
    })());
  }
  return logoCache.get(name);
}

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node;
}

function text(parent, content, attrs) {
  const t = el('text', { 'font-family': FONT, ...attrs }, parent);
  t.textContent = content;
  return t;
}

const RTL_CHARS = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/** Right-aligned text whose base direction follows its first strong character, Persian or Latin. */
function rightAligned(parent, content, x, attrs) {
  const firstStrong = content.match(/[A-Za-zÀ-ɏ֐-ࣿיִ-﷿ﹰ-﻿]/)?.[0] ?? '';
  const rtl = RTL_CHARS.test(firstStrong) || (!firstStrong && RTL_CHARS.test(content));
  // With direction="rtl", text-anchor "start" is the right end; with "ltr", "end" is.
  return text(parent, content, {
    x,
    direction: rtl ? 'rtl' : 'ltr',
    'unicode-bidi': 'embed',
    'text-anchor': rtl ? 'start' : 'end',
    ...attrs,
  });
}

/** Shrinks a text element until it fits maxWidth, then squeezes as a last resort. */
function fit(node, maxWidth, size, minSize) {
  node.setAttribute('font-size', size);
  node.removeAttribute('textLength');
  node.removeAttribute('lengthAdjust');
  const width = node.getComputedTextLength();
  if (width <= maxWidth || width === 0) return;
  const next = Math.max(minSize, Math.floor((size * maxWidth) / width));
  node.setAttribute('font-size', next);
  if (node.getComputedTextLength() > maxWidth) {
    node.setAttribute('textLength', maxWidth);
    node.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
}

/**
 * @param {SVGSVGElement} svg
 * @param {{template: 'full'|'band'|'gradient', color: string, fg: string, body: string, ink: string,
 *   logo: {viewBox: number[], d: string}|null, bankName: string, groups: string[], iban: string|null,
 *   name: string, nameIsPlaceholder: boolean, title: string}} m
 *   fg is the text colour on m.color; body and ink are the band template's card and text colours
 */
export function renderCard(svg, m) {
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${CARD_W} ${CARD_H}`);
  svg.setAttribute('direction', 'ltr');
  el('title', {}, svg).textContent = m.title;

  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: 'cpcs-card-clip' }, defs);
  el('rect', { width: CARD_W, height: CARD_H, rx: RADIUS }, clip);

  const band = m.template === 'band';
  // Text on the card's colour (the bank row) and text on the card's body (number, IBAN, name).
  const bodyFg = band ? m.ink : m.fg;
  if (band) {
    el('rect', { width: CARD_W, height: CARD_H, rx: RADIUS, fill: m.body }, svg);
    el('rect', { width: CARD_W, height: BAND_H, fill: m.color, 'clip-path': 'url(#cpcs-card-clip)' }, svg);
  } else if (m.template === 'gradient') {
    // Lighter where the logo sits (top right, read first in RTL), darker at the bottom left. No overlay:
    // the arc would lift the dark corner the gradient is there to give.
    const tones = gradientTones(m.color, m.fg);
    const grad = el('linearGradient', { id: 'cpcs-card-gradient', gradientUnits: 'userSpaceOnUse', x1: CARD_W, y1: 0, x2: 0, y2: CARD_H }, defs);
    el('stop', { offset: 0, 'stop-color': tones.top }, grad);
    el('stop', { offset: 1, 'stop-color': tones.bottom }, grad);
    el('rect', { width: CARD_W, height: CARD_H, rx: RADIUS, fill: 'url(#cpcs-card-gradient)' }, svg);
  } else {
    el('rect', { width: CARD_W, height: CARD_H, rx: RADIUS, fill: m.color }, svg);
    // The one tonal overlay: a wide arc from the lower left, a few percent of the text colour.
    el('circle', { cx: 40, cy: 640, r: 470, fill: m.fg, 'fill-opacity': 0.05, 'clip-path': 'url(#cpcs-card-clip)' }, svg);
  }

  const logoTop = band ? BAND_LOGO_TOP : LOGO_TOP;
  let nameRight = RIGHT;
  let nameMax = CARD_W - 2 * PAD;
  let nameY = logoTop + LOGO_MAX_H / 2;
  let nameSize = 38;
  if (m.logo) {
    const [vx, vy, vw, vh] = m.logo.viewBox;
    const w = Math.min(LOGO_MAX_W, (LOGO_MAX_H * vw) / vh);
    const h = (w * vh) / vw;
    const logo = el('svg', { x: RIGHT - w, y: logoTop + (LOGO_MAX_H - h) / 2, width: w, height: h, viewBox: `${vx} ${vy} ${vw} ${vh}` }, svg);
    el('path', { d: m.logo.d, fill: m.fg }, logo);
    nameRight = RIGHT - w - 22;
    nameMax = nameRight - PAD;
    nameSize = 30;
  }
  if (m.bankName) {
    const bank = rightAligned(svg, m.bankName, nameRight, { y: nameY, 'dominant-baseline': 'central', 'font-weight': 700, fill: m.fg });
    fit(bank, nameMax, nameSize, 18);
  }

  const numberY = m.iban ? 288 : 304;
  const step = 186;
  m.groups.forEach((g, i) => {
    text(svg, g, {
      x: CARD_W / 2 + (i - 1.5) * step,
      y: numberY,
      'text-anchor': 'middle',
      direction: 'ltr',
      'font-size': 58,
      'font-weight': 500,
      fill: bodyFg,
    });
  });

  if (m.iban) {
    const iban = text(svg, m.iban, { x: CARD_W / 2, y: 360, 'text-anchor': 'middle', direction: 'ltr', 'unicode-bidi': 'embed', 'font-weight': 400, fill: bodyFg, 'fill-opacity': 0.92 });
    fit(iban, CARD_W - 2 * PAD, 30, 20);
  }

  const name = rightAligned(svg, m.name, RIGHT, { y: 474, 'font-weight': 500, fill: bodyFg, 'fill-opacity': m.nameIsPlaceholder ? 0.5 : 1 });
  fit(name, CARD_W - 2 * PAD, 36, 20);

  // Drawn last and inset half a stroke, so the light card keeps its edge on a light page and in the PNG.
  if (band) {
    el('rect', { x: 0.5, y: 0.5, width: CARD_W - 1, height: CARD_H - 1, rx: RADIUS - 0.5, fill: 'none', stroke: m.ink, 'stroke-opacity': 0.16, 'stroke-width': 1 }, svg);
  }
}

/** Relative luminance (WCAG 2) of #RRGGBB. */
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Whichever of light and dark has the higher contrast against the card colour. */
export function pickForeground(color, light, dark) {
  return contrast(color, light) >= contrast(color, dark) ? light : dark;
}

/** Mixes #RRGGBB toward white (amount > 0) or black (amount < 0) by |amount|, 0 to 1, in sRGB. */
export function tone(hex, amount) {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return '#' + [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c + (target - c) * t).toString(16).padStart(2, '0');
  }).join('').toUpperCase();
}

// In whole percent, so the 1% steps below stay exact.
const GRADIENT_LIGHTEN = 12;
const GRADIENT_DARKEN = 30;
const MIN_CONTRAST = 4.5;

/**
 * The «گرادیان» template's two ends, as #RRGGBB: top (lighter) and bottom (darker).
 * The end that moves toward fg is pulled back in 1% steps until fg keeps 4.5:1 there, past the flat colour
 * if it must (Melli's red already sits below 4.5:1) but never past the other end. The colour between the two
 * ends changes monotonically, so the number in the middle reads at least as well as the worse end.
 */
export function gradientTones(color, fg) {
  let top = GRADIENT_LIGHTEN;
  let bottom = -GRADIENT_DARKEN;
  if (luminance(fg) > luminance(color)) {
    while (top > bottom && contrast(tone(color, top / 100), fg) < MIN_CONTRAST) top--;
  } else {
    while (bottom < top && contrast(tone(color, bottom / 100), fg) < MIN_CONTRAST) bottom++;
  }
  return { top: tone(color, top / 100), bottom: tone(color, bottom / 100) };
}
