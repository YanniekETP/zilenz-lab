const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
async function pick(page,key,value) {
  await page.locator('[data-pick="'+key+'"][data-value="'+value+'"]').click();
}
async function select(page,thickness,density,color,pack='plaat') {
  await pick(page,'thickness',String(thickness));
  await pick(page,'density',String(density));
  await pick(page,'color',color);
  await pick(page,'pack',pack);
}
test('homepage toont merk en versienummer direct naast het logo', async ({ page }) => {
  await expect(page.locator('.identity .brand')).toContainText('zilen');
  await expect(page.locator('.identity .version')).toBeVisible();
  await expect(page.locator('.identity .version')).toHaveText('V3.0');
  await expect(page.locator('h1')).toContainText('Polyesterwol');
});
test('configurator bevat alle materiaaleigenschappen en verpakkingen', async ({ page }) => {
  await expect(page.locator('#thicknessOptions button')).toHaveCount(5);
  await expect(page.locator('#densityOptions button')).toHaveCount(3);
  await expect(page.locator('#colorOptions button')).toHaveCount(3);
  await expect(page.locator('#packOptions button')).toHaveCount(3);
  await expect(page.locator('#addToQuote')).toBeDisabled();
});
test('selectie toont gekozen materiaal, kleur en verpakking', async ({ page }) => {
  await select(page,50,60,'grijs','doos');
  await expect(page.locator('#summaryThickness')).toHaveText('50 mm');
  await expect(page.locator('#summaryDensity')).toHaveText('60 kg/m³');
  await expect(page.locator('#summaryColor')).toHaveText('Grijs');
  await expect(page.locator('#summaryPack')).toHaveText('Dozen');
  await expect(page.locator('#addToQuote')).toBeEnabled();
});
test('vergelijk twee materialen op gewicht en eigenschappen zonder onbewezen dempingsclaim', async ({ page }) => {
  await select(page,20,40,'wit');
  await page.locator('#addToCompare').click();
  await select(page,80,80,'zwart');
  await page.locator('#addToCompare').click();
  await expect(page.locator('#compareTable thead th')).toHaveCount(3);
  await expect(page.locator('#compareTable')).toContainText('0,8 kg/m²');
  await expect(page.locator('#compareTable')).toContainText('6,4 kg/m²');
  await expect(page.locator('#compareTable')).toContainText('Op aanvraag');
  await expect(page.locator('#compareTable')).not.toContainText('dB');
});
test('vergelijking staat maximaal drie unieke uitvoeringen toe', async ({ page }) => {
  for(const [t,d,c] of [[20,40,'wit'],[30,40,'wit'],[40,40,'wit']]) {
    await select(page,t,d,c); await page.locator('#addToCompare').click();
  }
  await select(page,50,40,'wit');
  await page.locator('#addToCompare').click();
  await expect(page.locator('#selectionFeedback')).toContainText('Maximaal drie');
  await expect(page.locator('#compareTable thead th')).toHaveCount(4);
  await page.locator('#clearCompare').click();
  await expect(page.locator('#compareTable thead th')).toHaveCount(0);
});
test('offerteoverzicht bewaart geselecteerde varianten en aantallen', async ({ page }) => {
  await select(page,30,60,'grijs','pallet');
  await page.locator('#quantity').fill('3');
  await page.locator('#addToQuote').click();
  await expect(page.locator('#cartCount')).toHaveText('3');
  await expect(page.locator('#quoteLines')).toContainText('30 mm');
  await expect(page.locator('#quoteLines')).toContainText('Grijs');
  await page.reload();
  await expect(page.locator('#cartCount')).toHaveText('3');
});
test('offerte voegt identieke regels samen en kan regels verwijderen', async ({ page }) => {
  await select(page,50,80,'zwart','doos');
  await page.locator('#quantity').fill('2');
  await page.locator('#addToQuote').click();
  await page.locator('#addToQuote').click();
  await expect(page.locator('#cartCount')).toHaveText('4');
  await expect(page.locator('#quoteLines .quote-line')).toHaveCount(1);
  await page.locator('#quoteLines [data-remove-quote]').click();
  await expect(page.locator('#cartCount')).toHaveText('0');
});
test('onjuist aantal kan niet aan offerte worden toegevoegd', async ({ page }) => {
  await select(page,40,40,'wit');
  await page.locator('#quantity').fill('0');
  await expect(page.locator('#addToQuote')).toBeDisabled();
  await page.locator('#quantity').fill('2.5');
  await expect(page.locator('#addToQuote')).toBeDisabled();
  await expect(page.locator('#cartCount')).toHaveText('0');
});
test('deelbare links herstellen dikte, dichtheid kleur en verpakking', async ({ page }) => {
  await page.goto('/?dikte=80&dichtheid=60&kleur=zwart&verpakking=doos#samenstellen');
  await expect(page.locator('#summaryThickness')).toHaveText('80 mm');
  await expect(page.locator('#summaryDensity')).toHaveText('60 kg/m³');
  await expect(page.locator('#summaryColor')).toHaveText('Zwart');
  await expect(page.locator('#summaryPack')).toHaveText('Dozen');
  await expect(page.locator('#addToQuote')).toBeEnabled();
});
test('verpakkingskaart kiest direct de juiste verpakking', async ({ page }) => {
  await page.locator('[data-select-pack="pallet"]').click();
  await expect(page.locator('#summaryPack')).toHaveText('Pallets');
  await expect(page).toHaveURL(/verpakking=pallet/);
});
test('mobiel blijven navigatie, versie en configurator bruikbaar', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.identity .version')).toBeVisible();
  await expect(page.locator('nav a')).toHaveCount(3);
  await select(page,20,40,'grijs','plaat');
  await expect(page.locator('#addToQuote')).toBeEnabled();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
});
