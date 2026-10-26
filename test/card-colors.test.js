import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tone, gradientTones, contrast, pickForeground } from '../src/js/card.js';
import { banks } from './helpers.js';

// The app's text colours and the default card colour (assets/tokens.css: --cpcs-white, --cpcs-ink, --cpcs-slate).
const WHITE = '#FFFFFF';
const INK = '#1B1417';
const SLATE = '#2A1C21';

test('tone mixes toward white or black', () => {
  assert.equal(tone('#000000', 0.5), '#808080');
  assert.equal(tone('#FFFFFF', -0.5), '#808080');
  assert.equal(tone('#014687', 0), '#014687');
  assert.equal(tone('#014687', 1), '#FFFFFF');
  assert.equal(tone('#014687', -1), '#000000');
  assert.equal(tone('#e95b00', 0.1), '#EB6B1A');
});

const colors = [...new Set([...banks.filter((b) => b.color).map((b) => b.color.toUpperCase()), SLATE])];

test('gradient: the top end is lighter than the bottom end', () => {
  for (const color of colors) {
    const { top, bottom } = gradientTones(color, pickForeground(color, WHITE, INK));
    assert.ok(contrast(top, '#000000') > contrast(bottom, '#000000'), color);
  }
});

test('gradient: text keeps 4.5:1 at both ends for every bank colour and Slate', () => {
  for (const color of colors) {
    const fg = pickForeground(color, WHITE, INK);
    const { top, bottom } = gradientTones(color, fg);
    assert.ok(contrast(top, fg) >= 4.5, `${color} top ${top}`);
    assert.ok(contrast(bottom, fg) >= 4.5, `${color} bottom ${bottom}`);
  }
});

test('gradient: an end only moves back as far as the other end', () => {
  // A text colour no tone can reach 4.5:1 against: the gradient flattens at the lighter end instead of looping.
  const { top, bottom } = gradientTones('#808080', '#808080');
  assert.equal(top, bottom);
  assert.equal(top, tone('#808080', 0.12));
});
