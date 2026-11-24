import { sessionTest as test, expect } from './fixtures';

test.describe('Каталог і сортування', () => {
  test('TC-02: каталог показує 6 товарів з назвою, ціною і кнопкою', async ({ loggedIn }) => {
    await expect(loggedIn.items).toHaveCount(6);

    for (const item of await loggedIn.items.all()) {
      await expect(item.getByTestId('inventory-item-name')).not.toBeEmpty();
      await expect(item.getByTestId('inventory-item-price')).toHaveText(/^\$\d+\.\d{2}$/);
      await expect(item.getByRole('button', { name: 'Add to cart' })).toBeVisible();
    }
  });

  test('TC-03: сортування за всіма 4 варіантами (A→Z, Z→A, ціна ↑, ціна ↓)', async ({ loggedIn }) => {
    await expect(loggedIn.items).toHaveCount(6);

    await loggedIn.sortBy('za');
    const za = await loggedIn.names();
    expect(za).toEqual([...za].sort((a, b) => b.localeCompare(a)));

    await loggedIn.sortBy('az');
    const az = await loggedIn.names();
    expect(az).toEqual([...az].sort((a, b) => a.localeCompare(b)));

    await loggedIn.sortBy('lohi');
    const lohi = await loggedIn.prices();
    expect(lohi).toEqual([...lohi].sort((a, b) => a - b));

    await loggedIn.sortBy('hilo');
    const hilo = await loggedIn.prices();
    expect(hilo).toEqual([...hilo].sort((a, b) => b - a));
  });

  test('TC-12: сторінка товару — валідний id і неіснуючий id=999', async ({ page, loggedIn, productPage }) => {
    // Валідний товар: перехід з каталогу по назві
    await page.getByTestId('item-4-title-link').click();
    await expect(page).toHaveURL(/inventory-item\.html\?id=4$/);
    // SPA: URL змінюється раніше за DOM — чекаємо елемент, який є лише на сторінці товару
    await expect(productPage.backButton).toBeVisible();
    await expect(productPage.name).toHaveText('Sauce Labs Backpack');
    await expect(productPage.price).toHaveText('$29.99');

    // Граничний випадок: id, якого немає в каталозі
    await productPage.goto(999);
    await expect(productPage.backButton).toBeVisible();
    await expect(productPage.name).toHaveText('ITEM NOT FOUND');
    // Ціна на "заглушці" не є валідною сумою у форматі $X.XX
    await expect(productPage.price).not.toHaveText(/^\$\d+\.\d{2}$/);

    // З "битої" сторінки можна повернутися до каталогу
    await productPage.backButton.click();
    await expect(page).toHaveURL(/inventory\.html$/);
    await expect(loggedIn.items).toHaveCount(6);
  });
});
