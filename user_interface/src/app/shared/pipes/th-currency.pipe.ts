import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyConversionService } from '@travelhub/core/services/currency-conversion.service';
import { LocaleService } from '@travelhub/core/services/locale.service';

export type SupportedCurrencyCode = 'USD' | 'EUR' | 'COP';

@Pipe({
  name: 'thCurrency',
  standalone: true,
  pure: false,
})
export class ThCurrencyPipe implements PipeTransform {
  private readonly localeService = inject(LocaleService);
  private readonly currencyConversionService = inject(CurrencyConversionService);

  transform(value: number | string | null | undefined, currencyCode: SupportedCurrencyCode = 'USD'): string {
    const amount = this.currencyConversionService.convertAmount(value, currencyCode);
    const fractionDigits = currencyCode === 'COP' ? 0 : 2;

    try {
      return new Intl.NumberFormat(this.localeService.localeCode, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(amount);
    } catch {
      return `${currencyCode} ${amount}`;
    }
  }

}