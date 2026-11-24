import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly items: Locator;
  readonly itemNames: Locator;
  readonly checkoutButton: Locator;
  readonly removeButtons: Locator;

  constructor(private readonly page: Page) {
    this.items = page.getByTestId('inventory-item');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.checkoutButton = page.getByTestId('checkout');
    this.removeButtons = page.getByRole('button', { name: 'Remove' });
  }

  async remove(productName: string) {
    await this.page.getByTestId(`remove-${productName.replace(/\s+/g, '-').toLowerCase()}`).click();
  }

  async goto() {
    await this.page.goto('/cart.html');
  }

  async checkout() {
    await this.checkoutButton.click();
  }
}
