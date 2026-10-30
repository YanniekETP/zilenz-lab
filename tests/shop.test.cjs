'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Inline webshop JavaScript moet bestaan');

function setup() {
  const elements = new Map();
  const listeners = {};
  const storage = new Map();
  const el = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id, value: id === 'category' ? 'all' : id === 'quoteQty' ? '10' : '',
        hidden: false, innerHTML: '', textContent: '',
        classList: { add() {}, remove() {} },
        scrollIntoView() {}, focus() {}, reset() {},
        addEventListener(type, cb) { listeners[id + ':' + type] = cb; }
      });
    }
    return elements.get(id);
  };
  const document = {
    getElementById: el,
    addEventListener(type, cb) { listeners[type] = cb; }
  };
  class FormDataStub {
    constructor(form) { this.form = form; }
    get(key) { return this.form.fields?.[key] ?? ''; }
  }
  const context = vm.createContext({
    document, localStorage: {
      getItem: k => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v)
    },
    Intl, JSON, Math, Object, Number, String, Date,
    FormData: FormDataStub, setTimeout() {}
  });
  vm.runInContext(script, context, { filename: 'index.html' });
  return { run: code => vm.runInContext(code, context), el, storage, listeners };
}

test('staffels op de grenzen: 1, 9, 10, 49, 50, 199, 200', () => {
  const s = setup();
  for (const [q, expected] of [[1,0],[9,0],[10,.05],[49,.05],[50,.10],[199,.10],[200,.15]]) {
    assert.equal(s.run('discount(' + q + ')'), expected, 'aantal ' + q);
  }
});

test('producten en productfilter zijn aanwezig', () => {
  const s = setup();
  assert.equal(s.run('PRODUCTS.length'), 6);
  s.el('category').value = 'pallet';
  s.run('renderProducts()');
  assert.match(s.el('productGrid').innerHTML, /PL01/);
  assert.doesNotMatch(s.el('productGrid').innerHTML, /D01/);
});

test('winkelmandje toevoegen en optellen met staffelkorting en btw', () => {
  const s = setup();
  s.run("add('P01', 10)");
  assert.equal(s.run("cart['P01']"), 10);
  assert.equal(s.el('cartCount').textContent, 10);
  assert.ok(Math.abs(s.run('calc().subtotal') - 228) < 1e-8);
  assert.ok(Math.abs(s.run('calc().total') - 275.88) < 1e-8);
});

test('staffelkorting wordt per productregel berekend', () => {
  const s = setup();
  s.run("add('P01', 9); add('P02', 1)");
  assert.equal(s.run('calc().subtotal'), 254);
});

test('winkelmandje wordt opgeslagen en hersteld na herladen', () => {
  const s = setup();
  s.run("add('D01', 2)");
  assert.equal(JSON.parse(s.storage.get('zilenz-lab-cart-v2')).D01, 2);
  s.run("cart = {}; const savedAgain = JSON.parse(localStorage.getItem('zilenz-lab-cart-v2')); cart = savedAgain; renderCart()");
  assert.equal(s.el('cartCount').textContent, 2);
});

test('aantal kan omlaag en producten kunnen verwijderd worden', () => {
  const s = setup();
  s.run("add('P01', 2)");
  s.listeners.click({target: {closest: () => ({dataset: {minus: 'P01'}})}});
  assert.equal(s.run("cart['P01']"), 1);
  s.listeners.click({target: {closest: () => ({dataset: {remove: 'P01'}})}});
  assert.equal(s.run("Object.keys(cart).length"), 0);
});

test('checkout blokkeert een leeg winkelmandje', () => {
  const s = setup();
  s.el('checkoutForm').fields = { name: 'Testklant' };
  s.el('checkoutForm').onsubmit({ preventDefault() {}, target: s.el('checkoutForm') });
  assert.match(s.el('orderResult').textContent, /Voeg eerst minimaal één product/);
});

test('fictieve checkout geeft bevestiging en leegt het mandje', () => {
  const s = setup();
  s.run("add('D02', 2)");
  s.el('checkoutForm').fields = { name: 'Testklant', email: 'test@example.com' };
  s.el('checkoutForm').onsubmit({ preventDefault() {}, target: s.el('checkoutForm') });
  assert.match(s.el('orderResult').textContent, /Testbestelling TEST-/);
  assert.match(s.el('orderResult').textContent, /niets verzonden of betaald/);
  assert.equal(s.run('Object.keys(cart).length'), 0);
  assert.equal(s.el('cartCount').textContent, 0);
});

test('offertecalculator toont staffelkorting en verstuurt niets', () => {
  const s = setup();
  s.el('quoteProduct').value = 'PL01';
  s.el('quoteQty').value = '50';
  s.el('quoteForm').onsubmit({ preventDefault() {} });
  assert.match(s.el('quoteResult').textContent, /10%/);
  assert.match(s.el('quoteResult').textContent, /Niets verzonden/);
});
