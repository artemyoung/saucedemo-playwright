import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { ProductPage } from '../pages/ProductPage';
import { USERS } from '../pages/users';

type Pages = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  productPage: ProductPage;
  /** Інвентар після логіну під standard_user */
  loggedIn: InventoryPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  loggedIn: async ({ page, loginPage, inventoryPage }, use) => {
    await loginPage.goto();
    await loginPage.login(USERS.standard);
    await expect(page).toHaveURL(/inventory\.html/);
    await use(inventoryPage);
  },
});

export { expect };

/**
 * Спільна сесія: один логін на воркер (при workers: 1 — на весь прогін).
 *
 * `sessionPage` живе весь час роботи воркера. Перевизначений `page` віддає цю ж
 * сторінку кожному тесту, тому всі page objects автоматично працюють у спільній сесії.
 * Перед кожним тестом стан скидається: кошик очищається, відкривається каталог.
 *
 * Використовувати лише для тестів, яким потрібен залогінений користувач і які
 * не руйнують сесію (logout, логін під іншим користувачем — через `test`).
 */
export const sessionTest = test.extend<{}, { sessionPage: Page }>({
  sessionPage: [
    async ({ browser }, use, workerInfo) => {
      const { baseURL, viewport } = workerInfo.project.use;
      const context = await browser.newContext({ baseURL, viewport });
      const page = await context.newPage();
      await new LoginPage(page).goto();
      await new LoginPage(page).login(USERS.standard);
      await expect(page).toHaveURL(/inventory\.html/);
      await use(page);
      await context.close();
    },
    { scope: 'worker' },
  ],

  page: async ({ sessionPage }, use) => {
    await resetSession(sessionPage);
    await use(sessionPage);
  },

  // Логін уже виконано в sessionPage — тут лише відкритий каталог
  loggedIn: async ({ inventoryPage }, use) => use(inventoryPage),
});

/** Повертає спільну сесію до чистого стану: порожній кошик, сторінка каталогу. */
async function resetSession(page: Page) {
  // Saucedemo зберігає кошик у localStorage під ключем `cart-contents`
  await page.evaluate(() => localStorage.removeItem('cart-contents'));
  await page.goto('/inventory.html');

  // Страховка: якщо cookie сесії протухла (живе ~10 хв), логінимося повторно
  const loginButton = page.getByTestId('login-button');
  const firstItem = page.getByTestId('inventory-item').first();
  await expect(loginButton.or(firstItem)).toBeVisible();
  if (await loginButton.isVisible()) {
    await new LoginPage(page).login(USERS.standard);
    await expect(firstItem).toBeVisible();
  }
}
