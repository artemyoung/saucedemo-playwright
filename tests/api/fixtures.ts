import { test as base, expect } from '@playwright/test';
import { BookingClient } from '../../api/BookingClient';

type ApiFixtures = {
  booker: BookingClient;
  /** Токен адміністратора, отриманий через POST /auth */
  token: string;
};

export const test = base.extend<ApiFixtures>({
  booker: async ({ request }, use) => use(new BookingClient(request)),
  token: async ({ booker }, use) => use(await booker.token()),
});

export { expect };
