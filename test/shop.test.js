import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sniffLogo, claimedTypes, svgBox, pngFit, PNG_MAX_W, PNG_MAX_H } from '../src/js/shop-logo.js';
import { wrapLines } from '../src/js/card.js';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46]);
const bytes = (s) => new TextEncoder().encode(s);
const SVG = bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');

test('PNG and SVG pass when the name or type and the bytes agree', () => {
  assert.equal(sniffLogo(PNG, 'shop.png', 'image/png'), 'png');
  assert.equal(sniffLogo(PNG, 'SHOP.PNG', ''), 'png');
  assert.equal(sniffLogo(PNG, 'shop', 'image/png'), 'png');
  assert.equal(sniffLogo(SVG, 'shop.svg', 'image/svg+xml'), 'svg');
  assert.equal(sniffLogo(SVG, 'shop.svg', ''), 'svg');
  assert.equal(sniffLogo(bytes('﻿  <svg>\n</svg>'), 'shop.svg', ''), 'svg');
});

test('anything else is refused, even under a PNG or SVG name', () => {
  assert.equal(sniffLogo(JPEG, 'shop.jpg', 'image/jpeg'), null);
  assert.equal(sniffLogo(JPEG, 'shop.png', 'image/png'), null);
  assert.equal(sniffLogo(PNG, 'shop.svg', 'image/svg+xml'), null);
  assert.equal(sniffLogo(SVG, 'shop.png', 'image/png'), null);
  assert.equal(sniffLogo(SVG, 'shop.html', 'text/html'), null);
  assert.equal(sniffLogo(bytes('<html><body>svg</body></html>'), 'shop.svg', 'image/svg+xml'), null);
  assert.equal(sniffLogo(bytes('just text <svg>'), 'shop.svg', ''), null);
  assert.equal(sniffLogo(new Uint8Array(), 'shop.png', 'image/png'), null);
  assert.equal(claimedTypes('shop.jpg', 'image/jpeg').size, 0);
  assert.equal(claimedTypes('shop.gif', '').size, 0);
});

test('the SVG box comes from viewBox, or from plain numeric width and height', () => {
  assert.deepEqual(svgBox('0 0 200 80', null, null), { x: 0, y: 0, w: 200, h: 80 });
  assert.deepEqual(svgBox('-5,-5,10,20', '100%', null), { x: -5, y: -5, w: 10, h: 20 });
  assert.deepEqual(svgBox(null, '120', '40px'), { x: 0, y: 0, w: 120, h: 40 });
  assert.deepEqual(svgBox('0 0 0 10', '12.5', '5'), { x: 0, y: 0, w: 12.5, h: 5 });
  assert.equal(svgBox(null, '100%', '100%'), null);
  assert.equal(svgBox(null, '10cm', '5cm'), null);
  assert.equal(svgBox(null, null, null), null);
  assert.equal(svgBox('0 0 10', '10', null), null);
});

test('a PNG larger than three times the logo box is scaled to fit inside it', () => {
  assert.deepEqual(pngFit(200, 100), { w: 200, h: 100, scaled: false });
  assert.deepEqual(pngFit(PNG_MAX_W, PNG_MAX_H), { w: PNG_MAX_W, h: PNG_MAX_H, scaled: false });
  assert.deepEqual(pngFit(2000, 200), { w: 660, h: 66, scaled: true });
  assert.deepEqual(pngFit(1000, 1000), { w: 252, h: 252, scaled: true });
  assert.equal(pngFit(100000, 10).h, 1);
});

// Every character is 10 units wide, spaces included.
const measure = (s) => s.length * 10;

test('a name that fits stays on one line', () => {
  assert.deepEqual(wrapLines('فروشگاه نمونه', 200, 1, measure), { lines: ['فروشگاه نمونه'], fits: true });
  assert.deepEqual(wrapLines('  Sample   Shop ', 200, 1, measure), { lines: ['Sample Shop'], fits: true });
});

test('a longer name wraps greedily at spaces', () => {
  assert.deepEqual(wrapLines('aaa bbb ccc ddd', 70, 2, measure), { lines: ['aaa bbb', 'ccc ddd'], fits: true });
  assert.deepEqual(wrapLines('aaa bbb ccc ddd', 70, 1, measure), { lines: ['aaa bbb ccc ddd'], fits: false });
  assert.deepEqual(wrapLines('aa bb cc dd ee ff', 50, 3, measure), { lines: ['aa bb', 'cc dd', 'ee ff'], fits: true });
});

test('what overflows the last line joins it and does not fit', () => {
  assert.deepEqual(wrapLines('aa bb cc dd ee ff gg', 50, 3, measure), { lines: ['aa bb', 'cc dd', 'ee ff gg'], fits: false });
});

test('a word wider than the space gets a line of its own and does not fit', () => {
  assert.deepEqual(wrapLines('aa verylongword bb', 60, 3, measure), { lines: ['aa', 'verylongword', 'bb'], fits: false });
  assert.deepEqual(wrapLines('verylongword', 60, 2, measure), { lines: ['verylongword'], fits: false });
});

test('an empty name gives no lines', () => {
  assert.deepEqual(wrapLines('   ', 60, 2, measure), { lines: [], fits: true });
});
