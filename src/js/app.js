// Wires the form to the card. Card data lives only in these variables and the DOM: never stored, sent or logged.
import { S } from './strings.js';
import { digitsOnly, ibanDigits, groupFour, toPersianDigits, CARD_LENGTH, IBAN_DIGITS } from './validate.js';
import { selectable, formerName } from './banks.js';
import { assess } from './model.js';
import { renderCard, loadLogo, pickForeground } from './card.js';
import { exportPng } from './export.js';
import { createBankPicker } from './bank-picker.js';
import { yearRange } from './years.js';

const $ = (id) => document.getElementById(id);
const ui = {
  card: $('card'),
  preview: document.querySelector('.preview'),
  number: $('card-number'),
  numberStatus: $('card-status'),
  bank: $('bank'),
  bankList: $('bank-list'),
  bankCombo: $('bank-combo'),
  bankStatus: $('bank-status'),
  holder: $('holder'),
  ibanOn: $('iban-on'),
  ibanBox: $('iban-box'),
  iban: $('iban'),
  ibanStatus: $('iban-status'),
  ibanMatch: $('iban-match'),
  color: $('color'),
  colorReset: $('color-reset'),
  smaller: $('smaller'),
  download: $('download'),
  share: $('share'),
  copy: $('copy'),
  exportStatus: $('export-status'),
  theme: $('theme-toggle'),
  toTop: $('to-top'),
  top: $('top'),
};

const clearable = [ui.number, ui.holder, ui.iban].map((input) => ({ input, button: $(`${input.id}-clear`) }));

const SIZES = { 1: [1080, 681], 2: [2160, 1362] };

const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const INK = token('--cpcs-ink');
const WHITE = token('--cpcs-white');
const SLATE = token('--cpcs-slate');

let banks = [];
let picker = null;
let customColor = null;
let png = null; // {blob, name} for the current state; dropped on every change
let renderSeq = 0;

function setStatus(node, message, tone = '') {
  node.textContent = message ?? '';
  if (tone) node.dataset.tone = tone;
  else delete node.dataset.tone;
}

const radio = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
const shown = (s) => (radio('digits') === 'fa' ? toPersianDigits(s) : s);

/**
 * Reformats an input in place and keeps the caret after the same number of digits.
 * Deleting across a group space removes the digit next to it instead of doing nothing.
 */
function reformat(input, extract, format, event) {
  const prev = input.dataset.prev ?? '';
  let caret = input.selectionStart ?? input.value.length;
  let raw = extract(input.value);
  let before = extract(input.value.slice(0, caret)).length;
  if (event?.inputType?.startsWith('delete') && raw === extract(prev) && raw.length) {
    const at = event.inputType === 'deleteContentForward' ? before : before - 1;
    if (at >= 0 && at < raw.length) {
      raw = raw.slice(0, at) + raw.slice(at + 1);
      before = at;
    }
  }
  const value = format(raw);
  input.value = value;
  input.dataset.prev = value;
  if (document.activeElement === input) {
    let pos = 0;
    for (let seen = 0; pos < value.length && seen < before; pos++) if (/[0-9]/.test(value[pos])) seen++;
    input.setSelectionRange(pos, pos);
  }
}

const cardFormat = (d) => groupFour(d);
const cardExtract = (s) => digitsOnly(s).slice(0, CARD_LENGTH);
const ibanFormat = (d) => (d ? groupFour('IR' + d) : '');
const ibanExtract = (s) => ibanDigits(s);

function readInputs() {
  return { number: ui.number.value, ibanOn: ui.ibanOn.checked, iban: ui.iban.value, manualKey: picker?.key() ?? '' };
}

function update() {
  png = null;
  setStatus(ui.exportStatus, '');

  const a = assess(banks, readInputs());
  const { card, cardMatch, bank } = a;
  const fa = (n) => toPersianDigits(String(n));

  if (card.state === 'empty') setStatus(ui.numberStatus, S.cardEmpty);
  else if (card.state === 'short') setStatus(ui.numberStatus, S.cardShort(fa(card.digits.length)));
  else if (card.state === 'luhn') setStatus(ui.numberStatus, S.cardLuhn, 'error');
  else setStatus(ui.numberStatus, S.cardValid, 'ok');

  if (a.cardUnsupported) setStatus(ui.bankStatus, S.cardUnsupported(formerName(cardMatch.bank), cardMatch.successor?.fa), 'warning');
  else if (picker.key()) setStatus(ui.bankStatus, '');
  else if (a.cardUnknown) setStatus(ui.bankStatus, S.bankUnknown, 'warning');
  else setStatus(ui.bankStatus, '');

  picker.setDetected(cardMatch?.supported ? cardMatch.bank : null);

  ui.ibanBox.hidden = !ui.ibanOn.checked;
  setStatus(ui.ibanMatch, '');
  if (a.ibanCheck) {
    const { state, iban } = a.ibanCheck;
    const m = a.ibanMatch;
    if (state === 'empty') setStatus(ui.ibanStatus, S.ibanEmpty);
    else if (state === 'short') setStatus(ui.ibanStatus, S.ibanShort(fa(iban.length - 2)));
    else if (state === 'checksum') setStatus(ui.ibanStatus, S.ibanChecksum, 'error');
    else if (a.ibanUnsupported) setStatus(ui.ibanStatus, S.ibanUnsupported(formerName(m.bank), m.successor?.fa), 'warning');
    else setStatus(ui.ibanStatus, S.ibanValid(m?.bank.fa), 'ok');
    if (a.mismatch) setStatus(ui.ibanMatch, S.ibanMismatch(m.bank.fa, bank.fa), 'warning');
  }

  const color = customColor ?? bank?.color ?? SLATE;
  ui.color.value = color.toLowerCase();
  ui.colorReset.disabled = !customColor;

  ui.download.disabled = !a.ready;
  ui.share.disabled = !a.ready;
  ui.copy.disabled = !a.ready;
  for (const { input, button } of clearable) button.hidden = !input.value;

  const groups = groupFour(card.digits.padEnd(CARD_LENGTH, '•')).split(' ').map(shown);
  const ibanText = a.ibanCheck ? shown(groupFour('IR' + ibanDigits(ui.iban.value).padEnd(IBAN_DIGITS, '•'))) : null;
  const holder = ui.holder.value.trim().replace(/\s+/g, ' ');
  draw({
    template: radio('template'),
    color,
    body: WHITE,
    ink: INK,
    fg: pickForeground(color, WHITE, INK),
    logoName: bank?.logo ?? null,
    bankName: bank?.fa ?? '',
    groups,
    iban: ibanText,
    name: holder || S.nameOnCard,
    nameIsPlaceholder: !holder,
    title: S.cardTitle,
  });
}

async function draw(model) {
  const seq = ++renderSeq;
  let logo = null;
  try {
    logo = await loadLogo(model.logoName);
  } catch {
    logo = null; // a missing logo falls back to the bank's name, which is drawn anyway
  }
  if (seq !== renderSeq) return;
  renderCard(ui.card, { ...model, logo });
}

function fileName(bank) {
  return bank ? `cpcs-${bank.slug.toLowerCase().replace(/_/g, '-')}.png` : 'cpcs-card.png';
}

async function makePng() {
  if (png) return png;
  const [width, height] = SIZES[radio('size')];
  ui.download.disabled = ui.share.disabled = ui.copy.disabled = true;
  setStatus(ui.exportStatus, S.working);
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
  const seq = renderSeq;
  try {
    const blob = await exportPng(ui.card, { width, height, smaller: ui.smaller.checked });
    const { bank, ready } = assess(banks, readInputs());
    if (!ready) return null;
    const result = { blob, name: fileName(bank) };
    if (seq === renderSeq) png = result;
    setStatus(ui.exportStatus, S.fileSize(toPersianDigits(Math.round(blob.size / 1024).toLocaleString('en-US').replace(/,/g, '٬'))), 'ok');
    return result;
  } catch {
    setStatus(ui.exportStatus, S.exportFailed, 'error');
    return null;
  } finally {
    ui.download.disabled = ui.share.disabled = ui.copy.disabled = !assess(banks, readInputs()).ready;
  }
}

async function onDownload() {
  const result = await makePng();
  if (!result) return;
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function onShare() {
  const hadPng = Boolean(png);
  const result = await makePng();
  if (!result) return;
  const file = new File([result.blob], result.name, { type: 'image/png' });
  try {
    await navigator.share({ files: [file] });
  } catch (err) {
    if (err?.name === 'AbortError') return;
    // Encoding can outlast the click's user activation; the PNG is kept, so a second tap works.
    setStatus(ui.exportStatus, !hadPng && err?.name === 'NotAllowedError' ? S.shareRetry : S.shareFailed, 'info');
  }
}

// Safari wants the ClipboardItem made and write() called inside the click itself, so the PNG goes in as a
// promise instead of being awaited first (Chrome 98+, Firefox 127+ and Safari 13.1+ accept a Promise<Blob>).
function onCopy() {
  const seq = renderSeq;
  let noPng = false; // makePng has already said why, or the input changed under it
  const blob = makePng().then((result) => {
    if (!result) {
      noPng = true;
      throw new Error('no image');
    }
    return result.blob;
  });
  blob.catch(() => {}); // reported through write() below, even when the constructor throws first
  let write;
  try {
    write = navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  } catch (err) {
    write = Promise.reject(err);
  }
  write.then(
    () => { if (seq === renderSeq) setStatus(ui.exportStatus, S.copied, 'ok'); },
    () => { if (!noPng && seq === renderSeq) setStatus(ui.exportStatus, S.copyFailed, 'info'); },
  );
}

// ClipboardItem.supports() is newer than ClipboardItem (Safari 18.4); image/png is always supported where it exists.
function canCopyImage() {
  return window.isSecureContext
    && typeof navigator.clipboard?.write === 'function'
    && typeof window.ClipboardItem === 'function'
    && (window.ClipboardItem.supports?.('image/png') ?? true);
}

function canShareFiles() {
  try {
    const probe = new File([new Uint8Array(8)], 'cpcs.png', { type: 'image/png' });
    return Boolean(navigator.canShare?.({ files: [probe] }));
  } catch {
    return false;
  }
}

function setupTheme() {
  const label = () => {
    const light = document.documentElement.dataset.theme === 'light';
    const text = light ? ui.theme.dataset.dark : ui.theme.dataset.light;
    ui.theme.setAttribute('aria-label', text);
    ui.theme.title = text;
  };
  ui.theme.addEventListener('click', () => {
    const light = document.documentElement.dataset.theme !== 'light';
    if (light) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem('cpcs-theme', light ? 'light' : 'dark');
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
    label();
  });
  label();
}

// An empty dir="auto" field resolves to LTR, which puts the Persian placeholder on the left; decide here instead.
function textDir(value) {
  const strong = value.match(/[A-Za-z\u00C0-\u024F\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/);
  return strong && /[A-Za-z\u00C0-\u024F]/.test(strong[0]) ? 'ltr' : 'rtl';
}

function setupToTop() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = () => document.querySelectorAll('main input, main select, main button, .bottom a');
  const GAP = 8;
  let queued = false;

  // Shown once the card preview has scrolled out of sight (on a phone it sits above the form; on a wide
  // screen it is sticky, so never), but never over a control: on a phone the fields span the full width.
  function place() {
    queued = false;
    let show = ui.preview.getBoundingClientRect().bottom < 0;
    if (show && document.activeElement !== ui.toTop) {
      const r = ui.toTop.getBoundingClientRect();
      for (const c of controls()) {
        const b = c.getBoundingClientRect();
        if (!b.width) continue;
        if (b.left < r.right + GAP && b.right > r.left - GAP && b.top < r.bottom + GAP && b.bottom > r.top - GAP) {
          show = false;
          break;
        }
      }
    }
    ui.toTop.classList.toggle('is-shown', show);
  }
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(place);
    }
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  new ResizeObserver(queue).observe(document.body);

  ui.toTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
    ui.top.focus({ preventScroll: true });
  });
  queue();
}

async function start() {
  $('copyright-years').textContent = yearRange(new Date().getFullYear());
  setupTheme();
  setupToTop();
  const fa = (n) => toPersianDigits(String(n));
  $('size-1').textContent = S.size1x(fa(SIZES[1][0]), fa(SIZES[1][1]));
  $('size-2').textContent = S.size2x(fa(SIZES[2][0]), fa(SIZES[2][1]));

  const res = await fetch('data/banks.json');
  banks = await res.json();
  picker = createBankPicker({ input: ui.bank, list: ui.bankList, root: ui.bankCombo, banks: selectable(banks), loadLogo, onChange: update });

  ui.number.addEventListener('input', (e) => { reformat(ui.number, cardExtract, cardFormat, e); update(); });
  ui.iban.addEventListener('input', (e) => { reformat(ui.iban, ibanExtract, ibanFormat, e); update(); });
  for (const node of [ui.holder, ui.ibanOn, ui.smaller, ...document.querySelectorAll('input[name="template"], input[name="digits"], input[name="size"]')]) {
    node.addEventListener(node === ui.holder ? 'input' : 'change', update);
  }
  ui.holder.addEventListener('input', () => { ui.holder.dir = textDir(ui.holder.value); });
  // Goes through the input listeners above, so everything resets as if the text had been deleted by hand.
  for (const { input, button } of clearable) {
    const clear = () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    };
    button.addEventListener('click', clear);
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || e.isComposing || !input.value) return;
      e.preventDefault();
      clear();
    });
  }
  ui.color.addEventListener('input', () => { customColor = ui.color.value.toUpperCase(); update(); });
  ui.colorReset.addEventListener('click', () => { customColor = null; update(); });
  ui.download.addEventListener('click', onDownload);
  if (canCopyImage()) {
    ui.copy.hidden = false;
    ui.copy.addEventListener('click', onCopy);
  }
  if (canShareFiles()) {
    ui.share.hidden = false;
    ui.share.addEventListener('click', onShare);
  }
  $('editor').addEventListener('submit', (e) => e.preventDefault());

  // Text is fitted by measuring it, so measure again once Vazirmatn has arrived.
  update();
  try {
    await Promise.all(['400', '500', '700'].map((w) => document.fonts.load(`${w} 32px Vazirmatn`, 'آ1')));
  } catch {
    // Font failed to load: the fallback font is already measured.
  }
  update();
}

start();
