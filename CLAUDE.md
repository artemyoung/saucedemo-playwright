# CLAUDE.md

Навчальний репозиторій автотестів: Playwright Test + TypeScript.
- **UI**: https://www.saucedemo.com (проєкт `chromium`), Page Object.
- **API**: https://restful-booker.herokuapp.com (проєкт `api`, без браузера).

Спілкування, назви тестів, коментарі та README пишуться українською. Ідентифікатори коду та повідомлення комітів пишуться англійською.

## Команди

```bash
npm run typecheck                       # tsc, має бути без помилок
npm test                                # усе: UI + API
npm run test:saucedemo                  # лише UI
npm run test:api                        # лише API
npx playwright test -g "TC-05"          # один тест
npx playwright test --repeat-each=5     # перевірка стабільності
SLOWMO=700 npx playwright test --headed # візуальний перегляд
```

## Архітектура

- `pages/`: page objects для saucedemo. Тести не звертаються до селекторів напряму, лише через методи й локатори page objects.
- `api/BookingClient.ts`: клієнт restful-booker. Методи повертають сирий `APIResponse`, а статуси перевіряє тест.
- `tests/fixtures.ts`: дві фабрики тестів.
  - `test`: чистий контекст на кожен тест. Фікстура `loggedIn` логінить через UI.
  - `sessionTest`: **одна залогінена сесія на воркер** (worker-scoped `sessionPage`). Перевизначений `page` перед кожним тестом очищає `localStorage['cart-contents']` і відкриває `/inventory.html`.
- `tests/api/`: API-тести з фікстурами `booker` і `token`.
- `playwright.config.ts`: `workers: 1` і `fullyParallel: false`, бо від цього залежить спільна сесія. Проєкт `chromium` ігнорує `tests/api/`, проєкт `api` бере тільки його.

## Правила для тестів

- **Вибір фабрики.** `sessionTest` підходить для тестів, яким потрібен залогінений `standard_user` і які не руйнують сесію. Тести логіну, доступу без логіну, logout та інших користувачів пиши через `test`.
- **Селектори.** Використовуй `getByTestId(...)`: у конфігу `testIdAttribute: 'data-test'`. `getByRole` годиться для кнопок за текстом. CSS-класи та XPath не використовуй.
- **Перевірки.** Використовуй web-first assertions (`toHaveText`, `toHaveCount`, `toHaveURL`). `allTextContents()`, `count()` та `textContent()` не чекають, тому перед ними має стояти явне очікування стану.
- **SPA-пастка.** На saucedemo URL змінюється раніше за DOM. Після `toHaveURL` чекай елемент, який є тільки на новій сторінці (наприклад, `back-to-products`), інакше буде strict-mode violation на локаторах, що збігаються зі старою сторінкою.
- **Цикли.** Не пиши цикли `while (await x.count() > 0) click()`. Використовуй цикл з відомою кількістю ітерацій і `toHaveCount(n)` після кожної дії.
- **Назви тестів.** Формат `TC-NN: опис` для UI і `TC-API-NN: опис` для API. Номери наскрізні, нові тести продовжують нумерацію.
- **API.** Тест прибирає створені ним дані (`afterEach` з DELETE). Тестові дані генеруються через `newBooking()` з унікальним прізвищем.
- **Нестандартні відповіді API** перевіряються як фактична поведінка, з коментарем `// Особливість API: ...`. Зараз це 200 на bad credentials, 201 на DELETE, 405 на дії з видаленим бронюванням і 500 на невалідне тіло. Не «виправляй» тест під стандартний HTTP без перевірки на живому API.

## Перед тим як сказати «готово»

1. Перевір поведінку на живому сайті або API (Playwright-скрипт чи curl), а не з пам'яті. Тексти помилок копіюй дослівно.
2. `npm run typecheck` має пройти без помилок.
3. Нові або змінені тести прожени з `--repeat-each=5`: усі прогони мають бути зелені.
4. Онови README: таблицю покриття і розділ з описом сценарію (кроки + поведінка системи).
5. Коміть і пуш роби лише на явний запит користувача.

## CI

`.github/workflows/playwright.yml` запускає typecheck і всі тести на кожен push у будь-яку гілку, а також вручну (`workflow_dispatch`). HTML-звіт зберігається як артефакт `playwright-report`, а при падінні ще й `test-results` (трейси, скріншоти). Обидва зберігаються 14 днів. У CI вмикаються `retries: 1`, `forbidOnly` і репортер `github`.

## Тестові стенди

- Обидва стенди публічні. Облікові дані взято з самих сайтів: `standard_user` / `secret_sauce`, `admin` / `password123`. Це не секрети.
- restful-booker періодично скидає дані, тож не покладайся на бронювання, які створив не тест.
- Cookie сесії saucedemo живе близько 10 хвилин. Після цього `resetSession` логіниться повторно.
