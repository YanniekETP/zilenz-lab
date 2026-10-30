'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ZilenzCatalog = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const THICKNESSES = Object.freeze([20, 30, 40, 50, 80]);
  const DENSITIES = Object.freeze([40, 60, 80]);
  const COLORS = Object.freeze([
    { id: 'zwart', name: 'Zwart' },
    { id: 'wit', name: 'Wit' },
    { id: 'grijs', name: 'Grijs' }
  ]);
  const PACKS = Object.freeze([
    { id: 'plaat', name: 'Losse platen', hint: 'Flexibel voor maatwerk en kleinere aantallen' },
    { id: 'doos', name: 'Dozen', hint: 'Gebundeld bestellen voor projecten' },
    { id: 'pallet', name: 'Pallets', hint: 'Grotere volumes voor zakelijke afname' }
  ]);
  const DEFAULT_SELECTION = Object.freeze({ thickness: null, density: null, color: null, pack: 'plaat' });
  const MAX_QUANTITY = 9999;

  function normalizeSelection(value) {
    const v = value || {};
    const thickness = Number(v.thickness);
    const density = Number(v.density);
    return {
      thickness: THICKNESSES.includes(thickness) ? thickness : null,
      density: DENSITIES.includes(density) ? density : null,
      color: COLORS.some(c => c.id === v.color) ? v.color : null,
      pack: PACKS.some(p => p.id === v.pack) ? v.pack : 'plaat'
    };
  }
  function isComplete(v) {
    const n = normalizeSelection(v);
    return n.thickness !== null && n.density !== null && n.color !== null;
  }
  function code(v) {
    const n = normalizeSelection(v);
    if (!isComplete(n)) return null;
    return 'PW-' + n.thickness + '-' + n.density + '-' + n.color.toUpperCase() + '-' + n.pack.toUpperCase();
  }
  function description(v) {
    const n = normalizeSelection(v);
    if (!isComplete(n)) return 'Kies eerst dikte, dichtheid en kleur';
    return 'Polyesterwol ' + n.thickness + ' mm · ' + n.density + ' kg/m³ · ' +
      COLORS.find(c => c.id === n.color).name + ' · ' + PACKS.find(p => p.id === n.pack).name;
  }
  function massPerSquareMeter(value) {
    const v = normalizeSelection(value);
    if (!v.thickness || !v.density) return null;
    return v.thickness / 1000 * v.density;
  }
  function materialGuidance(value) {
    const v = normalizeSelection(value);
    if (!v.thickness || !v.density) return 'Kies dikte en dichtheid voor een materiaalindicatie.';
    const thickness = v.thickness <= 30
      ? 'Relatief dun: neemt weinig inbouwruimte in.'
      : v.thickness >= 50
        ? 'Dikkere laag: kan bij gelijke opbouw ook lagere tonen beter absorberen.'
        : 'Middeldikke laag: balans tussen inbouwruimte en materiaalvolume.';
    return thickness + ' Meer dichtheid betekent niet automatisch meer geluidsabsorptie.';
  }
  function quantity(value) {
    const q = Number(value);
    return Number.isInteger(q) && q >= 1 && q <= MAX_QUANTITY ? q : null;
  }
  function makeItem(selection, amount) {
    const n = normalizeSelection(selection);
    const q = quantity(amount);
    return isComplete(n) && q !== null ? { ...n, quantity: q } : null;
  }
  function sanitizeCart(raw) {
    if (!Array.isArray(raw)) return [];
    const result = [];
    for (const entry of raw) {
      const item = makeItem(entry, entry?.quantity);
      if (!item) continue;
      const existing = result.find(row => code(row) === code(item));
      if (existing) existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + item.quantity);
      else result.push(item);
    }
    return result.slice(0, 100);
  }
  function addToCart(items, selection, amount) {
    const item = makeItem(selection, amount);
    const rows = sanitizeCart(items);
    if (!item) return rows;
    const found = rows.find(row => code(row) === code(item));
    if (found) found.quantity = Math.min(MAX_QUANTITY, found.quantity + item.quantity);
    else rows.push(item);
    return rows;
  }
  function readQuery(search) {
    const p = new URLSearchParams(search || '');
    return normalizeSelection({
      thickness: p.get('dikte'), density: p.get('dichtheid'),
      color: p.get('kleur'), pack: p.get('verpakking')
    });
  }
  function writeQuery(selection, search) {
    const n = normalizeSelection(selection);
    const p = new URLSearchParams(search || '');
    for (const key of ['dikte','dichtheid','kleur','verpakking']) p.delete(key);
    if (n.thickness !== null) p.set('dikte', String(n.thickness));
    if (n.density !== null) p.set('dichtheid', String(n.density));
    if (n.color !== null) p.set('kleur', n.color);
    p.set('verpakking', n.pack);
    return '?' + p.toString();
  }
  return { THICKNESSES, DENSITIES, COLORS, PACKS, DEFAULT_SELECTION, MAX_QUANTITY,
    normalizeSelection, isComplete, code, description, quantity, makeItem,
    sanitizeCart, addToCart, readQuery, writeQuery, massPerSquareMeter, materialGuidance };
});
