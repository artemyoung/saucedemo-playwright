import { sessionTest as test, expect } from './fixtures';

const BACKPACK = 'Sauce Labs Backpack';
const BIKE_LIGHT = 'Sauce Labs Bike Light';

test.describe('Кошик і чекаут', () => {
  test('TC-04: додавання і видалення товарів у кошику', async ({ page, loggedIn, cartPage }) => {
    await loggedIn.addToCart(BACKPACK);
    await loggedIn.addToCart(BIKE_LIGHT);
    await expect(loggedIn.cartBadge).toHaveText('2');

    await loggedIn.openCart();
    await expect(page).toHaveURL(/cart\.html/);
    await expect(cartPage.itemNames).toHaveText([BACKPACK, BIKE_LIGHT]);

    await cartPage.remove(BACKPACK);
    await expect(cartPage.itemNames).toHaveText([BIKE_LIGHT]);
    await expect(loggedIn.cartBadge).toHaveText('1');
  });

  test('TC-05: повний чекаут — суми збігаються, замовлення оформлено', async ({ page, loggedIn, cartPage, checkoutPage }) => {
    await loggedIn.addToCart(BACKPACK);
    await loggedIn.addToCart(BIKE_LIGHT);
    await loggedIn.openCart();
    await cartPage.checkout();

    await checkoutPage.fillInfo('Test', 'User', '01001');
    await expect(page).toHaveURL(/checkout-step-two\.html/);
    // allTextContents() не чекає автоматично — спершу дочекаємось рендеру товарів і сум
    await expect(checkoutPage.itemPrices).toHaveCount(2);
    await expect(checkoutPage.total).toContainText('$');

    const { itemsSum, subtotal, tax, total } = await checkoutPage.summary();
    expect(subtotal).toBeCloseTo(itemsSum, 2);
    expect(total).toBeCloseTo(subtotal + tax, 2);

    await checkoutPage.finishButton.click();
    await expect(page).toHaveURL(/checkout-complete\.html/);
    await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
    await expect(loggedIn.cartBadge).toHaveCount(0);
  });

  test('TC-08: чекаут з порожніми полями показує помилки валідації', async ({ page, loggedIn, cartPage, checkoutPage }) => {
    await loggedIn.addToCart(BACKPACK);
    await loggedIn.openCart();
    await cartPage.checkout();

    await checkoutPage.continueButton.click();
    await expect(checkoutPage.error).toHaveText('Error: First Name is required');

    await checkoutPage.firstName.fill('Test');
    await checkoutPage.lastName.fill('User');
    await checkoutPage.continueButton.click();
    await expect(checkoutPage.error).toHaveText('Error: Postal Code is required');
    await expect(page).toHaveURL(/checkout-step-one\.html/);
  });

  test('TC-10: межі кошика — усі 6 товарів, збереження після reload, повне очищення', async ({ page, loggedIn, cartPage }) => {
    await expect(loggedIn.items).toHaveCount(6);
    const allNames = await loggedIn.names();

    // Верхня межа: додати весь асортимент
    for (const name of allNames) await loggedIn.addToCart(name);
    await expect(loggedIn.cartBadge).toHaveText('6');
    await expect(page.getByRole('button', { name: 'Add to cart' })).toHaveCount(0);

    // Стан кошика переживає перезавантаження сторінки
    await page.reload();
    await expect(loggedIn.cartBadge).toHaveText('6');

    await loggedIn.openCart();
    await expect(cartPage.itemNames).toHaveText(allNames);

    // Нижня межа: видалити все → кошик порожній, бейджа немає
    for (let left = allNames.length - 1; left >= 0; left--) {
      await cartPage.removeButtons.first().click();
      await expect(cartPage.items).toHaveCount(left);
    }
    await expect(cartPage.items).toHaveCount(0);
    await expect(loggedIn.cartBadge).toHaveCount(0);
  });
});
