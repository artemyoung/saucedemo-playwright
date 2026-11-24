import { test, expect } from './fixtures';
import { ADMIN, Booking, newBooking } from '../../api/BookingClient';

test.describe('Restful-booker API', () => {
  test('TC-API-01: авторизація → створення → зміна → видалення → бронювання відсутнє', async ({ booker }) => {
    const booking = newBooking();
    let token = '';
    let id = 0;

    await test.step('POST /auth — отримати токен', async () => {
      const response = await booker.auth();
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.token).toMatch(/^\w+$/);
      token = body.token;
    });

    await test.step('POST /booking — створити бронювання', async () => {
      const response = await booker.create(booking);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.bookingid).toEqual(expect.any(Number));
      expect(body.booking).toEqual(booking);
      id = body.bookingid;

      // Перевіряємо, що бронювання справді збережене
      const stored = await booker.get(id);
      expect(stored.status()).toBe(200);
      expect(await stored.json()).toEqual(booking);
    });

    await test.step('PUT /booking/:id — повністю змінити бронювання', async () => {
      const updated: Booking = {
        ...booking,
        firstname: 'Updated',
        totalprice: 200,
        depositpaid: false,
        bookingdates: { checkin: '2026-12-02', checkout: '2026-12-06' },
        additionalneeds: 'Dinner',
      };
      const response = await booker.update(id, updated, token);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual(updated);
      expect(await (await booker.get(id)).json()).toEqual(updated);
    });

    await test.step('PATCH /booking/:id — частково змінити (лише ціну)', async () => {
      const response = await booker.patch(id, { totalprice: 250 }, token);
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.totalprice).toBe(250);
      expect(body.firstname).toBe('Updated'); // інші поля не зачеплені
    });

    await test.step('DELETE /booking/:id — видалити', async () => {
      const response = await booker.delete(id, token);
      // Особливість API: успішне видалення повертає 201 Created
      expect(response.status()).toBe(201);
    });

    await test.step('GET /booking/:id — бронювання більше немає', async () => {
      const response = await booker.get(id);
      expect(response.status()).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });
  });

  test('TC-API-02: авторизація з невірними даними не видає токен', async ({ booker }) => {
    for (const [username, password] of [
      [ADMIN.username, 'wrong_password'],
      ['unknown_user', ADMIN.password],
      ['', ''],
    ]) {
      const response = await booker.auth(username, password);
      // Особливість API: помилка авторизації приходить зі статусом 200
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ reason: 'Bad credentials' });
      expect(body.token).toBeUndefined();
    }
  });

  test.describe('з тестовим бронюванням', () => {
    let id: number;
    let original: Booking;

    test.beforeEach(async ({ booker }) => {
      original = newBooking();
      const response = await booker.create(original);
      expect(response.status()).toBe(200);
      id = (await response.json()).bookingid;
    });

    test.afterEach(async ({ booker, token }) => {
      await booker.delete(id, token); // прибираємо за собою; 405, якщо тест уже видалив
    });

    test('TC-API-03: зміна і видалення без токена або з невалідним токеном заборонені', async ({ booker }) => {
      const changed = { ...original, firstname: 'Hacked' };

      for (const token of [undefined, 'invalid-token']) {
        const put = await booker.update(id, changed, token);
        expect(put.status()).toBe(403);
        expect(await put.text()).toBe('Forbidden');

        const patch = await booker.patch(id, { totalprice: 1 }, token);
        expect(patch.status()).toBe(403);

        const del = await booker.delete(id, token);
        expect(del.status()).toBe(403);
      }

      // Дані не змінилися, бронювання на місці
      const stored = await booker.get(id);
      expect(stored.status()).toBe(200);
      expect(await stored.json()).toEqual(original);
    });

    test('TC-API-04: дії з неіснуючим або вже видаленим бронюванням', async ({ booker, token }) => {
      // Неіснуючі ідентифікатори
      expect((await booker.get(999999999)).status()).toBe(404);
      expect((await booker.get('abc')).status()).toBe(404);

      // Вже видалене бронювання
      expect((await booker.delete(id, token)).status()).toBe(201);
      expect((await booker.get(id)).status()).toBe(404);
      // Особливість API: повторні PUT/DELETE повертають 405, а не 404
      expect((await booker.update(id, original, token)).status()).toBe(405);
      expect((await booker.delete(id, token)).status()).toBe(405);
    });
  });

  test('TC-API-05: створення з неповним тілом запиту відхиляється', async ({ booker }) => {
    // Немає обов'язкових firstname, totalprice, bookingdates...
    const response = await booker.create({ lastname: 'OnlyLastname' });
    // Особливість API: замість 400 Bad Request сервер відповідає 500
    expect(response.status()).toBe(500);
    expect(response.ok()).toBe(false);
  });
});
