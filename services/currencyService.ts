
import { CurrencyConfig } from '../types';

const STORAGE_KEY_CURRENCY = 'iht_currency_rates';
const BASE_CURRENCY_CODE = 'INR';

// Single Currency Enforcement
const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 1, isBase: true, isActive: true },
];

class CurrencyService {
  private currencies: CurrencyConfig[];
  private lastUpdated: number;

  constructor() {
    // Force reset to INR only, ignoring local storage if it had old USD data
    this.currencies = DEFAULT_CURRENCIES;
    this.lastUpdated = Date.now();
  }

  save() {
    // No-op: We don't want to save/load dynamic rates anymore. 
    // State is static INR.
  }

  getCurrencies(): CurrencyConfig[] {
    return this.currencies;
  }

  updateRate(code: string, newRate: number) {
    // Disabled
    console.warn("Multi-currency disabled. System is INR only.");
  }

  /**
   * Normalize any amount to the Base Currency (INR).
   * Since we are INR-only, this just returns the amount.
   */
  convertToBase(amount: number, fromCurrency: string): number {
      return amount; 
  }

  /**
   * Convert from Base Currency (INR) to Target Currency.
   * Since we are INR-only, this just returns the amount.
   */
  convertFromBase(amountInBase: number, toCurrency: string): number {
      return amountInBase;
  }

  /**
   * Cross-Currency Conversion
   * STRICT RULE: System is INR Only.
   */
  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    return amount;
  }

  getSymbol(code: string): string {
    return '₹';
  }
}

export const currencyService = new CurrencyService();
