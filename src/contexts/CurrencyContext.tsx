import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CURRENCIES, CURRENCY_RATES } from "@/lib/constants";

interface CurrencyContextType {
  currency: typeof CURRENCIES[number];
  setCurrencyCode: (code: string) => void;
  /** Convert an amount from any source currency to the user's selected currency */
  convert: (amount: number, fromCurrency?: string) => number;
  /** Format a price in the user's selected currency (symbol + converted amount) */
  formatPrice: (amount: number, fromCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState(() => localStorage.getItem('nfs_currency') || 'GBP');
  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  const setCurrencyCode = (c: string) => {
    setCode(c);
    localStorage.setItem('nfs_currency', c);
  };

  const convert = useCallback((amount: number, fromCurrency = 'GBP') => {
    const fromRate = CURRENCY_RATES[fromCurrency] || 1;
    const toRate = CURRENCY_RATES[currency.code] || 1;
    // Convert: source → GBP → target
    return Math.round((amount / fromRate) * toRate);
  }, [currency.code]);

  const formatPrice = useCallback((amount: number, fromCurrency = 'GBP') => {
    return `${currency.symbol}${convert(amount, fromCurrency).toLocaleString()}`;
  }, [currency.symbol, convert]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, convert, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
