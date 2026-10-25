// The bank field: an editable combobox over the supported banks (WAI-ARIA APG, list autocomplete).
// DOM focus stays on the input; the active option is pointed at with aria-activedescendant.
import { S } from './strings.js';
import { searchBanks, keyOf } from './banks.js';

const NS = 'http://www.w3.org/2000/svg';
const AUTO = '';

/**
 * @param {{input: HTMLInputElement, list: HTMLUListElement, root: HTMLElement,
 *   banks: import('./banks.js').Bank[], loadLogo: (name: string) => Promise<{viewBox: number[], d: string}|null>,
 *   onChange: () => void}} opts  banks: the selectable ones, in display order
 */
export function createBankPicker({ input, list, root, banks, loadLogo, onChange }) {
  let selected = AUTO;
  let detected = null;
  let options = []; // [{key, node}] currently shown
  let active = -1;

  const byKey = (key) => banks.find((b) => keyOf(b) === key) ?? null;
  const optionId = (key) => `bank-opt-${key || 'auto'}`;
  const isOpen = () => !list.hidden;

  function display() {
    const bank = byKey(selected);
    if (bank) return bank.fa;
    return detected ? S.bankAutoDetected(detected.fa) : S.bankAuto;
  }

  function logoSlot(bank) {
    const slot = document.createElement('span');
    slot.className = 'combo-logo';
    slot.setAttribute('aria-hidden', 'true');
    if (bank?.logo) {
      loadLogo(bank.logo).then((logo) => {
        if (!logo) return;
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', logo.viewBox.join(' '));
        svg.setAttribute('focusable', 'false');
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', logo.d);
        path.setAttribute('fill', 'currentColor');
        svg.appendChild(path);
        slot.appendChild(svg);
      }).catch(() => {});
    }
    return slot;
  }

  function optionNode(key, label, bank) {
    const li = document.createElement('li');
    li.id = optionId(key);
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', 'false');
    li.className = 'combo-option';
    if (key === selected) li.classList.add('is-current');
    const text = document.createElement('span');
    text.textContent = label;
    li.append(logoSlot(bank), text);
    return li;
  }

  function render(query) {
    const found = searchBanks(banks, query);
    const rows = [];
    if (!query.trim()) rows.push({ key: AUTO, label: S.bankAuto, bank: null });
    for (const b of found) rows.push({ key: keyOf(b), label: b.fa, bank: b });
    options = rows.map((r) => ({ key: r.key, node: optionNode(r.key, r.label, r.bank) }));
    const nodes = options.map((o) => o.node);
    if (!options.length) {
      const empty = document.createElement('li');
      empty.className = 'combo-empty';
      empty.setAttribute('role', 'option');
      empty.setAttribute('aria-disabled', 'true');
      empty.textContent = S.bankNone;
      nodes.push(empty);
    }
    list.replaceChildren(...nodes);
  }

  function setActive(i) {
    if (options[active]) options[active].node.setAttribute('aria-selected', 'false');
    active = options.length ? i : -1;
    const o = options[active];
    if (!o) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    o.node.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', o.node.id);
    o.node.scrollIntoView({ block: 'nearest' });
  }

  // On a phone the keyboard takes the lower half: bring the field up so the list shows above it.
  function fitAboveKeyboard() {
    if (!isOpen()) return;
    const vv = window.visualViewport;
    const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    if (list.getBoundingClientRect().bottom > bottom) input.scrollIntoView({ block: 'start' });
  }

  function open(query = '') {
    render(query);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    const current = options.findIndex((o) => o.key === selected);
    setActive(query.trim() ? 0 : Math.max(current, 0));
    requestAnimationFrame(fitAboveKeyboard);
  }

  function close() {
    if (!isOpen()) return;
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
    input.value = display();
  }

  function choose(key) {
    const changed = key !== selected;
    selected = key;
    close();
    if (changed) onChange();
  }

  input.addEventListener('click', () => {
    if (isOpen()) return;
    open();
    input.select();
  });
  input.addEventListener('input', () => {
    if (isOpen()) {
      render(input.value);
      setActive(input.value.trim() ? 0 : options.findIndex((o) => o.key === selected));
    } else {
      open(input.value);
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const n = options.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const down = e.key === 'ArrowDown';
      if (!isOpen()) {
        open();
        input.select();
        if (!e.altKey && !down) setActive(options.length - 1);
        return;
      }
      if (n) setActive(active < 0 ? (down ? 0 : n - 1) : (active + (down ? 1 : -1) + n) % n);
    } else if (e.key === 'Enter') {
      if (!isOpen()) return;
      e.preventDefault();
      if (options[active]) choose(options[active].key);
      else close();
    } else if (e.key === 'Escape') {
      if (!isOpen()) return;
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  });
  input.addEventListener('blur', close);
  // Keep focus in the input while an option is pressed, so the click lands before blur closes the list.
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.combo-option');
    const o = li && options.find((x) => x.node === li);
    if (o) choose(o.key);
  });
  // iOS Safari doesn't always blur an input when the page around it is tapped.
  document.addEventListener('pointerdown', (e) => {
    if (isOpen() && !root.contains(e.target)) close();
  });
  window.visualViewport?.addEventListener('resize', fitAboveKeyboard);

  input.value = display();

  return {
    /** '' for automatic, else the chosen bank's key. */
    key: () => selected,
    /** The bank found from the card number, shown in the field while it is on automatic. */
    setDetected(bank) {
      detected = bank;
      if (!isOpen()) input.value = display();
    },
  };
}
