'use strict';
(() => {
  const C = window.ZilenzCatalog;
  if (!C) throw new Error('Productcatalogus ontbreekt');
  const $ = id => document.getElementById(id);
  const colorNames = Object.fromEntries(C.COLORS.map(c => [c.id, c.name]));
  const packNames = Object.fromEntries(C.PACKS.map(p => [p.id, p.name]));
  const packUnits = { plaat: 'platen', doos: 'dozen', pallet: 'pallets' };
  const number = n => n.toLocaleString('nl-NL', { maximumFractionDigits: 2 });
  const clone = v => ({ thickness: v.thickness, density: v.density, color: v.color, pack: v.pack });
  let selection = C.readQuery(location.search);
  let compare = [];
  try {
    const stored = JSON.parse(localStorage.getItem('zilenz-compare-v3') || '[]');
    if (Array.isArray(stored)) compare = stored.map(C.normalizeSelection).filter(C.isComplete).filter((v,i,arr) => arr.findIndex(x => C.code(x) === C.code(v)) === i).slice(0,3);
  } catch (_) { compare = []; }
  let quote = [];
  try { quote = C.sanitizeCart(JSON.parse(localStorage.getItem('zilenz-quote-v3') || '[]')); }
  catch (_) { quote = []; }
  function setStatus(id, message) { $(id).textContent = message; }
  function persistQuote() {
    try { localStorage.setItem('zilenz-quote-v3', JSON.stringify(quote)); } catch (_) {}
  }
  function persistCompare() {
    try { localStorage.setItem('zilenz-compare-v3', JSON.stringify(compare)); } catch (_) {}
  }
  function syncUrl() {
    try { history.replaceState(null, '', location.pathname + C.writeQuery(selection, location.search) + location.hash); }
    catch (_) {}
  }
  function options(container, key, values, display) {
    $(container).innerHTML = values.map(value => {
      const v = typeof value === 'object' ? value.id : value;
      const label = display(value);
      const active = String(selection[key]) === String(v);
      const swatch = key === 'color' ? '<span class="swatch" style="--swatch:' +
        ({ zwart:'#222627', wit:'#fff', grijs:'#999f9c' }[v]) + '"></span>' : '';
      return '<button type="button" class="option' + (key === 'color' ? ' color' : '') +
        '" data-pick="' + key + '" data-value="' + v + '" aria-pressed="' + active +
        '">' + swatch + label + '</button>';
    }).join('');
  }
  function renderOptions() {
    options('thicknessOptions', 'thickness', C.THICKNESSES, v => v + ' mm');
    options('densityOptions', 'density', C.DENSITIES, v => v + ' kg/m³');
    options('colorOptions', 'color', C.COLORS, v => v.name);
    options('packOptions', 'pack', C.PACKS, v => v.name);
  }
  function renderSummary() {
    $('summaryThickness').textContent = selection.thickness ? selection.thickness + ' mm' : 'Nog kiezen';
    $('summaryDensity').textContent = selection.density ? selection.density + ' kg/m³' : 'Nog kiezen';
    $('summaryColor').textContent = colorNames[selection.color] || 'Nog kiezen';
    $('summaryPack').textContent = packNames[selection.pack];
    const qty = C.quantity($('quantity').value);
    $('summaryQuantity').textContent = qty === null ? 'Ongeldig aantal' : qty + ' ' + packUnits[selection.pack];
    $('quantityUnit').textContent = packUnits[selection.pack];
    const valid = C.isComplete(selection) && qty !== null;
    $('addToQuote').disabled = !valid;
    $('addToCompare').disabled = !C.isComplete(selection);
    if (!C.isComplete(selection)) setStatus('selectionFeedback', 'Kies dikte, dichtheid en kleur.');
    else if (qty === null) setStatus('selectionFeedback', 'Kies een geheel aantal van 1 tot en met 9999.');
    else setStatus('selectionFeedback', 'Klaar om te vergelijken of aan je offerteoverzicht toe te voegen.');
  }
  function renderSelection() { renderOptions(); renderSummary(); }
  function setSelection(key, value) {
    const input = { ...selection, [key]: value };
    selection = C.normalizeSelection(input);
    renderSelection();
    syncUrl();
  }
  function renderCompare() {
    $('compareStatus').textContent = compare.length + ' van maximaal 3 uitvoeringen gekozen.';
    if (!compare.length) {
      $('compareTable').innerHTML = '<p class="compare-note">Kies hierboven een uitvoering en klik op ‘Vergelijk uitvoering’.</p>';
      return;
    }
    const columns = compare.map((v,i) => '<th scope="col">Uitvoering ' + (i+1) +
      '<br><small>' + C.code(v) + '</small><br><button type="button" class="secondary" data-remove-compare="' + i +
      '" style="margin-top:8px;padding:7px 10px;font-size:12px">Verwijder</button><br><button type="button" class="secondary" data-select-compare="' + i + '" style="margin-top:6px;padding:7px 10px;font-size:12px">Selecteer</button></th>').join('');
    const rows = [
      ['Dikte', v => v.thickness + ' mm'],
      ['Dichtheid', v => v.density + ' kg/m³'],
      ['Kleur', v => colorNames[v.color]],
      ['Verpakking', v => packNames[v.pack]],
      ['Materiaalgewicht / m²', v => number(C.massPerSquareMeter(v)) + ' kg/m²'],
      ['Materiaalvolume / m²', v => number(v.thickness) + ' liter'],
      ['Prijs / m²', () => 'Op aanvraag'],
      ['Akoestische keuzehulp', v => C.materialGuidance(v)]
    ].map(([name,read]) => {
      const values = compare.map(read);
      const different = new Set(values).size > 1;
      return '<tr class="' + (different ? 'diff-row' : '') + '"><th scope="row">' + name + (different ? ' <span class="diff-marker" aria-label="Verschilt per uitvoering">●</span>' : '') + '</th>' +
        values.map(value => '<td>' + value + '</td>').join('') + '</tr>';
    }).join('');
    $('compareTable').innerHTML = '<div class="compare-wrap"><table class="compare-table"><caption>Vergelijking van polyesterwol uitvoeringen</caption><thead><tr><th scope="col">Eigenschap</th>' +
      columns + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function renderQuote() {
    const count = quote.reduce((total, item) => total + item.quantity, 0);
    $('cartCount').textContent = count;
    $('copyQuote').disabled = !quote.length;
    $('clearQuote').disabled = !quote.length;
    if (!quote.length) {
      $('quoteLines').innerHTML = '<p>Je overzicht is nog leeg. Stel eerst een product samen.</p>';
      return;
    }
    $('quoteLines').innerHTML = quote.map(item => '<div class="quote-line"><div><strong>' +
      C.description(item) + '</strong><small>Artikelkeuze ' + C.code(item) + ' · Aantal ' +
      item.quantity + ' ' + packUnits[item.pack] + ' · Prijs op aanvraag</small></div>' +
      '<button type="button" data-remove-quote="' + C.code(item) + '">Verwijder</button></div>').join('');
  }
  async function copyText(value, feedback) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(feedback, 'Gekopieerd naar het klembord.');
    } catch (_) {
      setStatus(feedback, 'Kopiëren is niet toegestaan in deze browser. Gebruik de productlink in de adresbalk.');
    }
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    const d = button.dataset;
    if (d.pick) {
      const value = ['thickness','density'].includes(d.pick) ? Number(d.value) : d.value;
      setSelection(d.pick, value);
    }
    if (d.selectPack) {
      setSelection('pack', d.selectPack);
      $('samenstellen').scrollIntoView({ behavior: 'smooth' });
    }
    if (d.removeCompare !== undefined) {
      compare.splice(Number(d.removeCompare), 1);
      persistCompare(); renderCompare();
    }
    if (d.selectCompare !== undefined) {
      const chosen = compare[Number(d.selectCompare)];
      if (chosen) {
        selection = C.normalizeSelection(chosen);
        renderSelection(); syncUrl();
        $('samenstellen').scrollIntoView({ behavior: 'smooth' });
        setStatus('selectionFeedback', 'Uitvoering uit vergelijking geselecteerd.');
      }
    }
    if (d.removeQuote) {
      quote = quote.filter(item => C.code(item) !== d.removeQuote);
      persistQuote();
      renderQuote();
    }
  });
  $('quantity').addEventListener('input', renderSummary);
  $('addToCompare').addEventListener('click', () => {
    if (!C.isComplete(selection)) return;
    if (compare.some(v => C.code(v) === C.code(selection))) {
      setStatus('selectionFeedback', 'Deze uitvoering staat al in de vergelijking.');
      return;
    }
    if (compare.length >= 3) {
      setStatus('selectionFeedback', 'Maximaal drie uitvoeringen vergelijken. Verwijder eerst een andere uitvoering.');
      return;
    }
    compare.push(clone(selection));
    persistCompare(); renderCompare();
    setStatus('selectionFeedback', 'Uitvoering toegevoegd aan de vergelijking.');
  });
  $('clearCompare').addEventListener('click', () => { compare = []; persistCompare(); renderCompare(); });
  $('addToQuote').addEventListener('click', () => {
    const qty = C.quantity($('quantity').value);
    if (!C.isComplete(selection) || qty === null) return;
    quote = C.addToCart(quote, selection, qty);
    persistQuote(); renderQuote();
    setStatus('selectionFeedback', 'Uitvoering toegevoegd aan je offerteoverzicht.');
  });
  $('clearQuote').addEventListener('click', () => {
    quote = []; persistQuote(); renderQuote(); setStatus('quoteFeedback', 'Offerteoverzicht gewist.');
  });
  $('copyQuote').addEventListener('click', () => {
    if (!quote.length) return;
    const lines = ['Zilenz – materiaalaanvraag', ''];
    quote.forEach(item => lines.push(item.quantity + ' × ' + C.description(item) + ' [' + C.code(item) + ']'));
    lines.push('', 'Prijs, verpakkingsinhoud en beschikbaarheid op aanvraag.');
    copyText(lines.join('\n'), 'quoteFeedback');
  });
  $('shareSelection').addEventListener('click', () => {
    const url = location.origin + location.pathname + C.writeQuery(selection, location.search) + '#samenstellen';
    copyText(url, 'selectionFeedback');
  });
  renderSelection();
  renderCompare();
  renderQuote();
})();
