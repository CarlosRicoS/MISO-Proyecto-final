import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { Hotel } from '../../core/models/hotel.model';
import { HotelsService } from '../../core/services/hotels.service';
import { LocaleService } from '../../core/services/locale.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  hotels: Hotel[] = [];
  isLoading = false;
  errorMessage = '';
  searchCity = '';
  searchStartDate = '';
  searchEndDate = '';
  searchCapacity = 0;

  showCheckInModal = false;
  showCheckOutModal = false;
  tempDate: string | null = null;
  readonly checkInMinDate = this.getTodayIsoDate();

  // PlatformTextDirective inputs receive raw strings, so they cannot rely on
  // the translate pipe. We resolve them via TranslateService.instant() and
  // refresh on every language change.
  heroSubtitleWeb = '';
  heroSubtitleMobile = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private hotelsService: HotelsService,
    private router: Router,
    private translate: TranslateService,
    private localeService: LocaleService,
  ) {}

  ngOnInit(): void {
    this.refreshHeroSubtitles();
    this.localeService.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshHeroSubtitles());

    void this.loadHotels();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get guestsLabelValue(): string {
    return `${this.searchCapacity} ${this.searchCapacity === 1 ? 'Guest' : 'Guests'}`;
  }

  get guestsInputValue(): string {
    return this.searchCapacity < 1 ? '' : String(this.searchCapacity);
  }

  get isSearchDisabled(): boolean {
    return false;
  }

  async loadHotels(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      this.hotels = await firstValueFrom(this.hotelsService.getHotelsWithPricing());
    } catch (error) {
      this.errorMessage = this.translate.instant('HOME.ERROR');
      this.hotels = [];
    } finally {
      this.isLoading = false;
    }
  }

  onLocationChanged(value: string): void {
    this.searchCity = value.trim();
  }

  onCheckInClicked(): void {
    this.tempDate = this.convertDDMMYYYYToISO(this.searchStartDate);
    this.showCheckInModal = true;
  }

  onCheckInConfirmed(date: Date): void {
    this.searchStartDate = this.convertDateToDDMMYYYY(date);
    this.showCheckInModal = false;
    this.tempDate = null;
    // If checkout is now <= checkin, advance checkout by 1 day
    if (this.compareDates(this.searchEndDate, this.searchStartDate) <= 0) {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      this.searchEndDate = this.convertDateToDDMMYYYY(nextDay);
    }
  }

  onCheckInCancelled(): void {
    this.showCheckInModal = false;
    this.tempDate = null;
  }

  onCheckOutClicked(): void {
    this.tempDate = this.convertDDMMYYYYToISO(this.searchEndDate);
    this.showCheckOutModal = true;
  }

  onCheckOutConfirmed(date: Date): void {
    this.searchEndDate = this.convertDateToDDMMYYYY(date);
    this.showCheckOutModal = false;
    this.tempDate = null;
  }

  onCheckOutCancelled(): void {
    this.showCheckOutModal = false;
    this.tempDate = null;
  }

  convertDDMMYYYYToISO(ddmmyyyy: string): string | null {
    const parts = ddmmyyyy.split('/');
    if (parts.length !== 3) {
      return null;
    }
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  }

  private getTodayIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  convertDateToDDMMYYYY(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  compareDates(ddmmyyyy1: string, ddmmyyyy2: string): number {
    const parts1 = ddmmyyyy1.split('/');
    const parts2 = ddmmyyyy2.split('/');
    if (parts1.length !== 3 || parts2.length !== 3) return 0;
    const date1 = new Date(Number(parts1[2]), Number(parts1[1]) - 1, Number(parts1[0]));
    const date2 = new Date(Number(parts2[2]), Number(parts2[1]) - 1, Number(parts2[0]));
    return date1.getTime() - date2.getTime();
  }

  onGuestsChanged(value: string): void {
    const parsedGuests = Number.parseInt(value, 10);
    this.searchCapacity = Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : 0;
  }

  async onSearchHotels(): Promise<void> {
    if (this.isSearchDisabled) {
      return;
    }

    const params = {
      ...(this.searchStartDate ? { startDate: this.searchStartDate } : {}),
      ...(this.searchEndDate ? { endDate: this.searchEndDate } : {}),
      ...(this.searchCity ? { city: this.searchCity } : {}),
      ...(this.searchCapacity > 0 ? { capacity: this.searchCapacity } : {}),
    };

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const results = await firstValueFrom(
        Object.keys(params).length ? this.hotelsService.getHotelsWithPricing(params) : this.hotelsService.getHotelsWithPricing()
      );

      this.hotels = results;

      await this.router.navigate(['/search-results'], {
        queryParams: params,
        state: {
          hotels: results,
        },
      });
    } catch (error) {
      this.errorMessage = this.translate.instant('HOME.ERROR');
    } finally {
      this.isLoading = false;
    }
  }

  getHotelLocation(hotel: Hotel): string {
    const parts = [hotel.city, hotel.country].filter((part) => Boolean(part));
    return parts.length ? parts.join(', ') : 'Location unavailable';
  }

  getHotelPrice(hotel: Hotel): string {
    return this.localeService.formatCurrency(hotel.pricePerNight ?? 0);
  }

  getHotelRating(hotel: Hotel): string {
    return Number.isFinite(hotel.rating) ? hotel.rating.toFixed(1) : 'N/A';
  }

  private refreshHeroSubtitles(): void {
    this.heroSubtitleWeb = this.translate.instant('HOME.HERO_SUBTITLE_WEB');
    this.heroSubtitleMobile = this.translate.instant('HOME.HERO_SUBTITLE_MOBILE');
  }
}
