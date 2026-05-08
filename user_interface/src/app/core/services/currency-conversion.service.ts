import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppCacheService } from './app-cache.service';
import type { SupportedCurrencyCode } from '@travelhub/shared/pipes/th-currency.pipe';

interface FrankfurterRateResponse {
  amount: number;
  date: string;
  base: 'USD';
  rates: Partial<Record<Exclude<SupportedCurrencyCode, 'USD'>, number>>;
}

interface FrankfurterQuoteRateEntry {
  date: string;
  base: 'USD';
  quote: Exclude<SupportedCurrencyCode, 'USD'>;
  rate: number;
}

interface CurrencyConversionCache {
  baseCurrency: 'USD';
  fetchedAt: string;
  rates: Record<SupportedCurrencyCode, number>;
}

@Injectable({ providedIn: 'root' })
export class CurrencyConversionService {
  private readonly storageKey = 'th_currency_conversion_rates';
  private readonly apiBaseUrl = 'https://api.frankfurter.dev/v2';
  private cachedRates = this.readCachedRates();
  private inFlightLoad?: Promise<void>;

  constructor(
    private readonly http: HttpClient,
    private readonly cache: AppCacheService,
  ) {}

  ensureRatesLoaded(): Promise<void> {
    if (this.cachedRates) {
      return Promise.resolve();
    }

    if (this.inFlightLoad) {
      return this.inFlightLoad;
    }

    this.inFlightLoad = this.loadRates().finally(() => {
      this.inFlightLoad = undefined;
    });

    return this.inFlightLoad;
  }

  convertAmount(amount: number | string | null | undefined, targetCurrency: SupportedCurrencyCode): number {
    const numericAmount = this.toNumericValue(amount);
    if (targetCurrency === 'USD') {
      return numericAmount;
    }

    const rate = this.cachedRates?.rates[targetCurrency];
    return typeof rate === 'number' && Number.isFinite(rate) && rate > 0
      ? numericAmount * rate
      : numericAmount;
  }

  getCachedRates(): CurrencyConversionCache | null {
    return this.cachedRates;
  }

  private async loadRates(): Promise<void> {
    try {
      const url = `${this.apiBaseUrl}/rates?base=USD&quotes=EUR,COP`;
      const response = await firstValueFrom(
        this.http.get<FrankfurterRateResponse | FrankfurterQuoteRateEntry[]>(url),
      );
      const rates = this.buildRates(response);

      if (!rates) {
        return;
      }

      this.cachedRates = {
        baseCurrency: 'USD',
        fetchedAt: new Date().toISOString(),
        rates,
      };

      this.cache.write(this.storageKey, this.cachedRates);
    } catch {
      // Keep the previous cache if the refresh fails.
    }
  }

  private buildRates(
    response: FrankfurterRateResponse | FrankfurterQuoteRateEntry[],
  ): Record<SupportedCurrencyCode, number> | null {
    const rates: Record<SupportedCurrencyCode, number> = {
      COP: 0,
      USD: 1,
      EUR: 0,
    };

    if (Array.isArray(response)) {
      for (const entry of response) {
        if (entry?.base !== 'USD' || (entry.quote !== 'COP' && entry.quote !== 'EUR')) {
          continue;
        }

        rates[entry.quote] = this.toNumericValue(entry.rate);
      }
    } else {
      if (response?.base !== 'USD') {
        return null;
      }

      rates.COP = this.toNumericValue(response.rates?.COP);
      rates.EUR = this.toNumericValue(response.rates?.EUR);
    }

    if (!this.isValidRatePair(rates.COP, rates.EUR)) {
      return null;
    }

    return rates;
  }

  private readCachedRates(): CurrencyConversionCache | null {
    const cached = this.cache.read<CurrencyConversionCache>(this.storageKey);
    if (!this.isValidCachedRates(cached)) {
      this.cache.remove(this.storageKey);
      return null;
    }

    return cached;
  }

  private isValidCachedRates(cacheValue: CurrencyConversionCache | null): cacheValue is CurrencyConversionCache {
    if (!cacheValue || cacheValue.baseCurrency !== 'USD') {
      return false;
    }

    const usdRate = cacheValue.rates?.USD;
    const eurRate = cacheValue.rates?.EUR;
    const copRate = cacheValue.rates?.COP;

    if (!Number.isFinite(usdRate) || usdRate !== 1) {
      return false;
    }

    if (!this.isValidRatePair(copRate, eurRate)) {
      return false;
    }

    return true;
  }

  private isValidRatePair(copRate: number, eurRate: number): boolean {
    if (!Number.isFinite(copRate) || copRate <= 0) {
      return false;
    }

    if (!Number.isFinite(eurRate) || eurRate <= 0) {
      return false;
    }

    return true;
  }

  private toNumericValue(value: number | string | null | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const parsed = Number.parseFloat(String(value ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
}