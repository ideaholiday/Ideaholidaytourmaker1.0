
import { CurrencyConfig } from '../types';

const STORAGE_KEY_CURRENCY = 'iht_currency_rates';

const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1, isBase: true, isActive: true },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.5, isBase: false, isActive: true },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rate: 3.67, isBase: false, isActive: true },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', rate: 36.5, isBase: false, isActive: true },
  { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.92, isBase: false, isActive: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79, isBase: false, isActive: true },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.35, isBase: false, isActive: true },
];

class CurrencyService {
  private currencies: CurrencyConfig[];

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY_CURRENCY);
    this.currencies = stored ? JSON.parse(stored) : DEFAULT_CURRENCIES;
  }

  save() {
    localStorage.setItem(STORAGE_KEY_CURRENCY, JSON.stringify(this.currencies));
  }

  getCurrencies(): CurrencyConfig[] {
    return this.currencies.filter(c => c.isActive);
  }

  updateRate(code: string, newRate: number) {
    const currency = this.currencies.find(c => c.code === code);
    if (currency && !currency.isBase) {
      currency.rate = newRate;
      this.save();
    }
  }

  // Convert amount from Source Currency to Target Currency
  convert(amount: number, fromCurrency: string, toCurrency: string): number {
    const fromRate = this.currencies.find(c => c.code === fromCurrency)?.rate || 1;
    const toRate = this.currencies.find(c => c.code === toCurrency)?.rate || 1;

    // Formula: (Amount / FromRate) * ToRate
    // E.g. 100 THB to INR (Base USD)
    // 100 / 36.5 (USD val) * 83.5 (INR val) = ~228 INR
    
    if (fromCurrency === toCurrency) return amount;
    
    const amountInBase = amount / fromRate;
    return amountInBase * toRate;
  }

  // Get symbol
  getSymbol(code: string): string {
    return this.currencies.find(c => c.code === code)?.symbol || code;
  }
}

export const currencyService = new CurrencyService();
