import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChoices } from '../src/js/model.js';

const ALLOWED = {
  digits: ['fa', 'en'],
  template: ['gradient', 'full', 'band'],
  size: ['1', '2'],
  smaller: [true, false],
};

test('valid stored choices come back', () => {
  const choices = { digits: 'en', template: 'band', size: '2', smaller: true };
  assert.deepEqual(parseChoices(JSON.stringify(choices), ALLOWED), choices);
  assert.deepEqual(parseChoices('{"smaller":false}', ALLOWED), { smaller: false });
});

test('nothing stored or bad JSON gives no choices', () => {
  for (const raw of [null, undefined, '', '{bad json', 'null', '5', '"fa"', '[]', 'true']) {
    assert.deepEqual(parseChoices(raw, ALLOWED), {}, String(raw));
  }
});

test('a value no longer offered is dropped and the rest are kept', () => {
  assert.deepEqual(parseChoices('{"template":"removed","digits":"en"}', ALLOWED), { digits: 'en' });
  assert.deepEqual(parseChoices('{"size":"9","smaller":"yes"}', ALLOWED), {});
  assert.deepEqual(parseChoices('{"size":2,"digits":null,"template":["band"]}', ALLOWED), {});
});

test('keys outside the allowed list never come through', () => {
  const raw = '{"number":"1111222233334444","name":"made up","iban":"IR00","bank":"x","color":"#000000","__proto__":{"digits":"en"},"digits":"fa"}';
  const choices = parseChoices(raw, ALLOWED);
  assert.deepEqual(Object.keys(choices), ['digits']);
  assert.equal(choices.digits, 'fa');
});
