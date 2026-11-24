import { test, expect } from './fixtures';
import { USERS } from '../pages/users';

test.describe('Логін', () => {
  test('TC-01: успішний логін standard_user відкриває каталог', async ({ page, loginPage, inventoryPage }) => {
    await loginPage.goto();
    await loginPage.login(USERS.standard);

    await expect(page).toHaveURL(/\/inventory\.html$/);
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.cartLink).toBeVisible();
  });

  test('TC-06: заблокований користувач і невірний пароль не можуть увійти', async ({ page, loginPage }) => {
    await loginPage.goto();

    await loginPage.login(USERS.lockedOut);
    await expect(loginPage.error).toHaveText('Epic sadface: Sorry, this user has been locked out.');
    await expect(page).not.toHaveURL(/inventory/);

    await loginPage.login(USERS.standard, 'wrong_password');
    await expect(loginPage.error).toHaveText(
      'Epic sadface: Username and password do not match any user in this service',
    );
    await expect(page).not.toHaveURL(/inventory/);
  });

  test('TC-07: відкриття каталогу без логіну редиректить на логін з помилкою', async ({ page, inventoryPage, loginPage }) => {
    await inventoryPage.goto();

    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.error).toHaveText(
      "Epic sadface: You can only access '/inventory.html' when you are logged in.",
    );
  });

  test('TC-09: валідація форми логіну — порожні поля, закриття помилки, регістр логіна', async ({ page, loginPage }) => {
    await loginPage.goto();

    // Клас `input_error` у поля є завжди; помилку позначає окремий клас `error`
    const highlighted = /(^|\s)error(\s|$)/;

    // Обидва поля порожні → спершу вимагається username, поля підсвічуються
    await loginPage.loginButton.click();
    await expect(loginPage.error).toHaveText('Epic sadface: Username is required');
    await expect(loginPage.username).toHaveClass(highlighted);
    await expect(loginPage.password).toHaveClass(highlighted);

    // Кнопка "×" прибирає повідомлення і підсвітку
    await loginPage.errorCloseButton.click();
    await expect(loginPage.error).toHaveCount(0);
    await expect(loginPage.username).not.toHaveClass(highlighted);

    // Логін є, пароля немає
    await loginPage.login(USERS.standard, '');
    await expect(loginPage.error).toHaveText('Epic sadface: Password is required');

    // Логін чутливий до регістру
    await loginPage.login('Standard_User');
    await expect(loginPage.error).toHaveText(
      'Epic sadface: Username and password do not match any user in this service',
    );
    await expect(page).not.toHaveURL(/inventory/);
  });

  test('TC-11: після logout захищені сторінки недоступні', async ({ page, loggedIn, loginPage, cartPage }) => {
    await loggedIn.logout();
    await expect(page).toHaveURL(/saucedemo\.com\/$/);
    await expect(loginPage.loginButton).toBeVisible();

    // Пряме відкриття кошика після виходу
    await cartPage.goto();
    await expect(loginPage.error).toHaveText(
      "Epic sadface: You can only access '/cart.html' when you are logged in.",
    );

    // Пряме відкриття першого кроку чекауту після виходу
    await page.goto('/checkout-step-one.html');
    await expect(loginPage.error).toHaveText(
      "Epic sadface: You can only access '/checkout-step-one.html' when you are logged in.",
    );
    await expect(loginPage.loginButton).toBeVisible();
  });
});
