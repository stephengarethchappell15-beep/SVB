// Multi-Currency and Live Exchange Rate Engine
export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  defaultRate: number; // relative to 1 USD
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', defaultRate: 1.0 },
  { code: 'EUR', name: 'Euro', symbol: '€', defaultRate: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', defaultRate: 0.78 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', defaultRate: 155.0 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', defaultRate: 1500.0 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', defaultRate: 1.36 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', defaultRate: 1.52 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', defaultRate: 0.89 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', defaultRate: 83.5 },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', defaultRate: 0.000015 },
  { code: 'USDT', name: 'Tether', symbol: '₮', defaultRate: 1.0 },
];

let liveRatesCache: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 155.0,
  NGN: 1500.0,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.89,
  INR: 83.5,
  BTC: 0.000015,
  USDT: 1.0,
};

let ratesFetched = false;

export async function fetchLiveExchangeRates(): Promise<Record<string, number>> {
  if (ratesFetched) return liveRatesCache;
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        liveRatesCache = {
          ...liveRatesCache,
          ...data.rates,
        };
        ratesFetched = true;
      }
    }
  } catch (e) {
    // API network request offline or blocked, use fallback
  }
  return liveRatesCache;
}

export function getCurrencySymbol(code: string): string {
  const item = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  return item ? item.symbol : '$';
}

export function convertAmount(amountInUSD: number, targetCurrency: string): number {
  const rate = liveRatesCache[targetCurrency] || SUPPORTED_CURRENCIES.find((c) => c.code === targetCurrency)?.defaultRate || 1.0;
  return amountInUSD * rate;
}

export function formatConvertedCurrency(amountInUSD: number, targetCurrency: string): string {
  const converted = convertAmount(amountInUSD, targetCurrency);
  const symbol = getCurrencySymbol(targetCurrency);

  if (targetCurrency === 'JPY') {
    return `${symbol}${Math.round(converted).toLocaleString('en-US')}`;
  }
  if (targetCurrency === 'BTC') {
    return `${symbol}${converted.toFixed(6)}`;
  }
  return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
