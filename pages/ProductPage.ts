import { Page, Locator } from '@playwright/test';

/** Сторінка окремого товару: /inventory-item.html?id=N */
export class ProductPage {
  readonly name: Locator;
  readonly description: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;
  readonly backButton: Locator;

  constructor(private readonly page: Page) {
    this.name = page.getByTestId('inventory-item-name');
    this.description = page.getByTestId('inventory-item-desc');
    this.price = page.getByTestId('inventory-item-price');
    this.addToCartButton = page.getByTestId('add-to-cart');
    this.backButton = page.getByTestId('back-to-products');
  }

  async goto(id: number) {
    await this.page.goto(`/inventory-item.html?id=${id}`);
  }
}
