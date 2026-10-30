const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('producten zoeken en filteren via echte browser', async ({ page }) => {
  await expect(page.locator('#productGrid .card')).toHaveCount(6);
  await page.locator('#category').selectOption('pallet');
  await expect(page.locator('#productGrid .card')).toHaveCount(2);
  await page.locator('#search').fill('100 mm');
  await expect(page.locator('#productGrid .card')).toHaveCount(1);
  await expect(page.locator('#productGrid')).toContainText('Polyesterwol pallet 100 mm');
});

test('details openen, toevoegen, aantal aanpassen en verwijderen', async ({ page }) => {
  await page.locator('[data-detail="P01"]').click();
  await expect(page.locator('#productOverlay')).toHaveClass(/open/);
  await page.locator('#detailAdd').click();
  await expect(page.locator('#cartCount')).toHaveText('1');
  await page.locator('#cartOpen').click();
  await page.locator('#modalCartLines [data-plus="P01"]').click();
  await expect(page.locator('#cartCount')).toHaveText('2');
  await page.locator('#modalCartLines [data-minus="P01"]').click();
  await expect(page.locator('#cartCount')).toHaveText('1');
  await page.locator('#modalCartLines [data-remove="P01"]').click();
  await expect(page.locator('#cartCount')).toHaveText('0');
});

test('winkelmandje blijft bewaard na pagina vernieuwen', async ({ page }) => {
  await page.locator('[data-add="D01"]').click();
  await page.reload();
  await expect(page.locator('#cartCount')).toHaveText('1');
  await expect(page.locator('#cartLines')).toContainText('Polyesterwol doos 50 mm');
});

test('staffelprijzen worden zichtbaar bij 10 stuks en offertecalculator werkt', async ({ page }) => {
  await page.locator('#quoteProduct').selectOption('P01');
  await page.locator('#quoteQty').fill('10');
  await page.locator('#quoteForm button[type=submit]').click();
  await expect(page.locator('#quoteResult')).toContainText('5%');
  await expect(page.locator('#quoteResult')).toContainText('€ 228,00');
  await page.locator('#quoteQty').fill('50');
  await page.locator('#quoteForm button[type=submit]').click();
  await expect(page.locator('#quoteResult')).toContainText('10%');
});

test('fictieve checkout toont overzicht en maakt mandje leeg', async ({ page }) => {
  await page.locator('[data-add="D02"]').click();
  await page.locator('#checkoutForm [name=name]').fill('Testklant');
  await page.locator('#checkoutForm button[type=submit]').click();
  await expect(page.locator('#orderResult')).toContainText('niets verzonden of betaald');
  await expect(page.locator('#orderSummary')).toContainText('Polyesterwol doos 100 mm');
  await expect(page.locator('#orderSummary')).toContainText('Totaal');
  await expect(page.locator('#cartCount')).toHaveText('0');
});

test('lege checkout toont melding en maakt geen bestelling', async ({ page }) => {
  await page.locator('#checkoutForm [name=name]').fill('Testklant');
  await page.locator('#checkoutForm button[type=submit]').click();
  await expect(page.locator('#orderResult')).toContainText('Voeg eerst minimaal één product');
});

test('mobiele navigatie blijft zichtbaar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.nav')).toBeVisible();
  await expect(page.locator('.nav a')).toHaveCount(3);
  await page.locator('.nav a[href="#zakelijk"]').click();
  await expect(page).toHaveURL(/#zakelijk$/);
});

test('productkaarten tonen m² prijs, verpakking en vier staffels', async ({page}) => {
  const card=page.locator('#productGrid .card').filter({hasText:'Polyesterwol doos 50 mm'});
  await expect(card.locator('.sqm-price')).toContainText('/ m²');
  await expect(card.locator('.pack-info')).toContainText('10 platen per doos');
  await expect(card.locator('.tiers .tier')).toHaveCount(4);
});
test('offerte rekent doosoppervlak uit en kan aantallen toevoegen aan mandje', async ({page}) => {
  await page.locator('#quoteProduct').selectOption('D01');
  await expect(page.locator('#quotePackInfo')).toContainText('7,2 m²');
  await page.locator('#quoteQty').fill('50');
  await page.locator('#quoteForm button[type=submit]').click();
  await expect(page.locator('#quoteBreakdown')).toContainText('360 m²');
  await expect(page.locator('#quoteBreakdown')).toContainText('10%');
  await expect(page.locator('#quoteBreakdown')).toContainText('Btw 21%');
  await page.locator('#quoteAdd').click();
  await expect(page.locator('#cartCount')).toHaveText('50');
  await page.locator('#quoteReset').click();
  await expect(page.locator('#quoteBreakdown')).toBeHidden();
});
test('offerte valideert hoeveelheid zonder echte aanvraag te versturen', async ({page}) => {
  await page.locator('#quoteQty').fill('10000');
  await page.locator('#quoteAdd').click();
  await expect(page.locator('#quoteResult')).toContainText('geldig aantal');
  await expect(page.locator('#cartCount')).toHaveText('0');
});

test('zakelijke homepage gebruikt productgerichte teksten en één discrete testmelding', async ({page}) => { await expect(page.locator('h1')).toContainText('Akoestische isolatie'); await expect(page.locator('.env-note')).toHaveCount(1); await expect(page.locator('.banner')).not.toContainText('FICTIEVE'); await expect(page.locator('.logo')).not.toContainText('LAB'); });
