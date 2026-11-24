import { APIRequestContext, APIResponse } from '@playwright/test';

export interface BookingDates {
  checkin: string;
  checkout: string;
}

export interface Booking {
  firstname: string;
  lastname: string;
  totalprice: number;
  depositpaid: boolean;
  bookingdates: BookingDates;
  additionalneeds?: string;
}

export interface CreatedBooking {
  bookingid: number;
  booking: Booking;
}

export const ADMIN = { username: 'admin', password: 'password123' } as const;

/** Тонка обгортка над restful-booker API. Повертає сирі APIResponse, щоб тести перевіряли статуси самі. */
export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  auth(username: string = ADMIN.username, password: string = ADMIN.password): Promise<APIResponse> {
    return this.request.post('/auth', { data: { username, password } });
  }

  /** Логін адміністратора; повертає токен для заголовка Cookie */
  async token(): Promise<string> {
    const response = await this.auth();
    const body = await response.json();
    if (!body.token) throw new Error(`Не вдалося отримати токен: ${JSON.stringify(body)}`);
    return body.token;
  }

  create(booking: Partial<Booking>): Promise<APIResponse> {
    return this.request.post('/booking', { data: booking });
  }

  get(id: number | string): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  update(id: number | string, booking: Booking, token?: string): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, { data: booking, headers: authHeader(token) });
  }

  patch(id: number | string, fields: Partial<Booking>, token?: string): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, { data: fields, headers: authHeader(token) });
  }

  delete(id: number | string, token?: string): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, { headers: authHeader(token) });
  }
}

const authHeader = (token?: string): Record<string, string> => (token ? { Cookie: `token=${token}` } : {});

/** Тестові дані бронювання; унікальне прізвище, щоб не плутати з чужими записами на публічному стенді */
export const newBooking = (overrides: Partial<Booking> = {}): Booking => ({
  firstname: 'Test',
  lastname: `Auto-${Date.now()}`,
  totalprice: 150,
  depositpaid: true,
  bookingdates: { checkin: '2026-12-01', checkout: '2026-12-05' },
  additionalneeds: 'Breakfast',
  ...overrides,
});
