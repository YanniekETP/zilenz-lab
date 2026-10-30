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
    if (!v.thickness || !v.density) return 'Selecteer dikte en dichtheid voor passend productadvies.';
    const thickness = v.thickness >= 80
      ? 'Royale absorberende laag: een interessante keuze wanneer ook lagere tonen aandacht vragen en voldoende ruimte beschikbaar is.'
      : v.thickness >= 50
        ? 'Extra absorptiedikte: een logische stap omhoog voor wie meer breedbandige geluidsabsorptie nastreeft.'
        : v.thickness >= 40
          ? 'Veelzijdige middenmaat: een stap boven de dunne basisplaten met meer materiaal in de dikte.'
          : 'Slanke oplossing voor toepassingen met beperkte inbouwruimte. Meer ruimte? Bekijk ook 50 of 80 mm.';
    const density = v.density >= 80
      ? 'Hoogste dichtheidsklasse: meer vezelmassa per m² en een robuustere materiaalkeuze.'
      : v.density >= 60
        ? 'Verzwaarde uitvoering: meer vezelmassa per m² dan de 40 kg/m³-variant.'
        : 'Lichtste dichtheidsklasse: praktisch wanneer materiaalgewicht een rol speelt.';
    return thickness + ' ' + density;
  }
  function upgradeSuggestions(value) {
    const v = normalizeSelection(value);
    if (!v.thickness || !v.density) return [];
    const suggestions = [];
    if (v.thickness < 80) {
      const next = THICKNESSES.find(x => x > v.thickness);
      suggestions.push({ kind:'thickness', target:next, label:'Bekijk ' + next + ' mm', text:'Meer absorberende laag, vooral interessant bij lagere frequenties.' });
    }
    if (v.density < 80) {
      const next = DENSITIES.find(x => x > v.density);
      suggestions.push({ kind:'density', target:next, label:'Bekijk ' + next + ' kg/m³', text:'Meer vezelmateriaal per m² en een zwaardere uitvoering.' });
    }
    if (v.pack === 'plaat') suggestions.push({ kind:'pack', target:'doos', label:'Bekijk dozen', text:'Handige afnamevorm bij meerdere platen en grotere projecten.' });
    else if (v.pack === 'doos') suggestions.push({ kind:'pack', target:'pallet', label:'Bekijk pallets', text:'Afnamevorm voor grotere projecthoeveelheden.' });
    return suggestions;
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
    sanitizeCart, addToCart, readQuery, writeQuery, massPerSquareMeter, materialGuidance, upgradeSuggestions };
});
