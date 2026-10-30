'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../catalog.js');

test('assortiment heeft vijf diktes, drie dichtheden en drie kleuren', () => {
  assert.deepEqual(C.THICKNESSES, [20,30,40,50,80]);
  assert.deepEqual(C.DENSITIES, [40,60,80]);
  assert.deepEqual(C.COLORS.map(x=>x.id), ['zwart','wit','grijs']);
});
test('selectie valideert dikte dichtheid en kleur', () => {
  const valid={thickness:50,density:60,color:'grijs',pack:'doos'};
  assert.equal(C.isComplete(valid),true);
  assert.equal(C.isComplete({...valid,thickness:25}),false);
  assert.equal(C.isComplete({...valid,density:100}),false);
  assert.equal(C.isComplete({...valid,color:'blauw'}),false);
  assert.equal(C.normalizeSelection({thickness:25,density:500,color:'rood'}).pack,'plaat');
});
test('artikelnummers volgen de gespecificeerde uitvoering', () => {
  const v={thickness:80,density:40,color:'zwart',pack:'pallet'};
  assert.equal(C.code(v),'PW-80-40-ZWART-PALLET');
  assert.match(C.description(v),/80 mm/);
  assert.match(C.description(v),/Zwart/);
  assert.equal(C.code({}),null);
});
test('materiaalgewicht per m² volgt dikte in meter maal dichtheid in kg/m³', () => {
  assert.equal(C.massPerSquareMeter({thickness:20,density:40}),0.8);
  assert.equal(C.massPerSquareMeter({thickness:80,density:80}),6.4);
  assert.equal(C.massPerSquareMeter({thickness:40,density:60}),2.4);
  assert.equal(C.massPerSquareMeter({thickness:25,density:60}),null);
});
test('akoestische keuzehulp claimt geen automatische betere absorptie door dichtheid', () => {
  const a=C.materialGuidance({thickness:20,density:80});
  const b=C.materialGuidance({thickness:80,density:40});
  assert.match(a,/niet automatisch/);
  assert.match(b,/lagere tonen/);
  assert.doesNotMatch(a+b,/NRC|αw/);
});
test('aantal valideert 1 tot 9999 en weigert decimalen', () => {
  for(const v of [0,-1,1.5,10000,'',null]) assert.equal(C.quantity(v),null);
  assert.equal(C.quantity('10'),10);
  assert.equal(C.quantity(9999),9999);
});
test('offerte verzamelt uitvoeringen, telt identieke regels en scheidt kleur', () => {
  const a={thickness:50,density:60,color:'wit',pack:'doos'};
  const b={...a,color:'zwart'};
  let cart=C.addToCart([],a,2);
  cart=C.addToCart(cart,a,3);
  cart=C.addToCart(cart,b,1);
  assert.equal(cart.length,2);
  assert.equal(cart[0].quantity,5);
  assert.equal(cart[1].quantity,1);
});
test('offerte limiteert samenvoeging tot 9999 en negeert ongeldige data', () => {
  const v={thickness:20,density:40,color:'grijs',pack:'plaat'};
  const cart=C.addToCart(C.addToCart([],v,9998),v,10);
  assert.equal(cart[0].quantity,9999);
  assert.equal(C.addToCart([],v,0).length,0);
  assert.equal(C.addToCart([],{...v,color:'rood'},3).length,0);
});
test('opgeslagen offerte wordt veilig ingelezen', () => {
  assert.deepEqual(C.sanitizeCart({bad:true}),[]);
  const rows=C.sanitizeCart([null,{thickness:40,density:60,color:'wit',pack:'plaat',quantity:2},{thickness:40,density:60,color:'wit',pack:'plaat',quantity:3},{thickness:99,density:60,color:'wit',pack:'plaat',quantity:4}]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].quantity,5);
});
test('deelbare link herstelt de gekozen variant', () => {
  const selected={thickness:50,density:80,color:'zwart',pack:'pallet'};
  const url=C.writeQuery(selected,'?utm_source=search');
  assert.match(url,/utm_source=search/);
  assert.deepEqual(C.readQuery(url),selected);
});
