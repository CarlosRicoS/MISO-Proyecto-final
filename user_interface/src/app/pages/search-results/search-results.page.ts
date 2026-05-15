import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InfiniteScrollCustomEvent, IonContent, ScrollCustomEvent } from '@ionic/angular';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { Hotel } from '../../core/models/hotel.model';
import { HotelsService } from '../../core/services/hotels.service';
import { LocaleService } from '../../core/services/locale.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { FilterSummaryParams } from '../../shared/components/th-filter-summary/th-filter-summary.component';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.page.html',
  styleUrls: ['./search-results.page.scss'],
  standalone: false,
})
export class SearchResultsPage implements OnInit, OnDestroy {
  private readonly pageSize = 10;
  private readonly windowSize = 20;
  private readonly topScrollThreshold = 24;
  private readonly bottomScrollThreshold = 120;
  private windowStartPage = 0;
  private readonly destroy$ = new Subject<void>();

  @ViewChild(IonContent) content?: IonContent;
  hotels: Hotel[] = [];
  minPrice: number | null = null;
  maxPrice: number | null = null;
  minGuests: number | null = null;
  isLoading = false;
  isPaging = false;
  canLoadNext = true;
  canLoadPrevious = false;
  errorMessage = '';

  searchCity = '';
  searchStartDate = '';
  searchEndDate = '';
  searchCapacity = 1;
  private baseSearchParams: {
    startDate?: string;
    endDate?: string;
    city?: string;
    capacity?: number;
  } = {};

  filterSummaryParams: FilterSummaryParams = {
    locationLabel: '',
    locationValue: '',
    checkInLabel: '',
    checkInValue: '',
    checkOutLabel: '',
    checkOutValue: '',
    guestsLabel: '',
    guestsValue: '',
  };

  filterSummaryTopActionLabel = '';
  filterSummarySortLabel = '';
  filterSummaryMobileFiltersLabel = '';
  filterSummaryMobilePriceLabel = '';
  filterSummaryMobileRatingLabel = '';

  constructor(
    private hotelsService: HotelsService,
    private propertyDetailService: PropertyDetailService,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService,
    private localeService: LocaleService,
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async ngOnInit(): Promise<void> {
    this.refreshFilterSummaryLabels();

    // Force change detection on language switch so getHotelPrice() re-emits.
    this.localeService.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.hotels = [...this.hotels];
        this.refreshFilterSummaryLabels();
      });

    this.readSearchParamsFromQuery();

    const navState = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    const stateHotels = Array.isArray(navState?.['hotels']) ? (navState['hotels'] as Hotel[]) : null;

    if (stateHotels) {
      this.hotels = stateHotels.slice(0, this.pageSize);
      this.windowStartPage = 0;
      this.canLoadPrevious = false;
      this.canLoadNext = stateHotels.length === this.pageSize;
      return;
    }

    await this.loadHotelsFromApi();
  }

  async loadHotelsFromApi(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.windowStartPage = 0;
    this.canLoadNext = true;
    this.canLoadPrevious = false;

    try {
      const hotels = await this.fetchHotelsPage(this.windowStartPage);
      this.hotels = hotels;
      this.canLoadNext = hotels.length === this.pageSize;
    } catch (error) {
      this.errorMessage = this.translate.instant('SEARCH.ERROR');
      this.canLoadNext = false;
    } finally {
      this.isLoading = false;
    }
  }

  async loadMoreHotels(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.loadNextPage();
    event.target.complete();
    event.target.disabled = !this.canLoadNext;
  }

  async onContentScroll(event: ScrollCustomEvent): Promise<void> {
    const currentScrollTop = event.detail.scrollTop;

    if (currentScrollTop <= this.topScrollThreshold) {
      await this.loadPreviousPage();
      return;
    }

    if (!(await this.isNearBottom(currentScrollTop))) {
      return;
    }

    await this.loadNextPage();
  }

  private async loadNextPage(): Promise<void> {
    if (this.isLoading || this.isPaging || !this.canLoadNext) {
      return;
    }

    this.isPaging = true;
    const nextPage = this.windowStartPage + Math.ceil(this.hotels.length / this.pageSize);

    try {
      const hotels = await this.fetchHotelsPage(nextPage);

      if (!hotels.length) {
        this.canLoadNext = false;
      } else {
        const mergedHotels = [...this.hotels, ...hotels];
        const hasExceededWindow = mergedHotels.length > this.windowSize;

        this.hotels = hasExceededWindow
          ? mergedHotels.slice(this.pageSize)
          : mergedHotels;

        if (hasExceededWindow) {
          this.windowStartPage += 1;
        }

        this.canLoadPrevious = this.windowStartPage > 0;
        this.canLoadNext = hotels.length === this.pageSize;

        if (this.hotels.length > this.pageSize) {
          await this.scrollToWindowMiddle();
        }
      }
    } catch (error) {
      this.errorMessage = this.translate.instant('SEARCH.ERROR');
    } finally {
      this.isPaging = false;
    }
  }

  private async loadPreviousPage(): Promise<void> {
    if (this.isLoading || this.isPaging || !this.canLoadPrevious) {
      return;
    }

    this.isPaging = true;
    const previousPage = this.windowStartPage - 1;

    try {
      const hotels = await this.fetchHotelsPage(previousPage);

      if (!hotels.length) {
        this.canLoadPrevious = previousPage > 0;
      } else {
        const mergedHotels = [...hotels, ...this.hotels];
        const hasExceededWindow = mergedHotels.length > this.windowSize;

        this.hotels = hasExceededWindow
          ? mergedHotels.slice(0, this.windowSize)
          : mergedHotels;

        this.windowStartPage = previousPage;
        this.canLoadPrevious = this.windowStartPage > 0;
        this.canLoadNext = true;

        if (this.hotels.length > this.pageSize || hasExceededWindow) {
          await this.scrollToWindowMiddle();
        }
      }
    } catch (error) {
      this.errorMessage = this.translate.instant('SEARCH.ERROR');
    } finally {
      this.isPaging = false;
    }
  }

  get filteredHotels(): Hotel[] {
    return this.hotels.filter((hotel) => {
      const price = hotel.pricePerNight ?? 0;
      if (this.minPrice !== null && Number.isFinite(this.minPrice) && price < this.minPrice) {
        return false;
      }
      if (this.maxPrice !== null && Number.isFinite(this.maxPrice) && price > this.maxPrice) {
        return false;
      }
      if (this.minGuests !== null && Number.isFinite(this.minGuests)) {
        const capacity = (hotel as Hotel & { capacity?: number }).capacity;
        if (typeof capacity === 'number' && capacity < this.minGuests) {
          return false;
        }
      }
      return true;
    });
  }

  onMinPriceChange(value: string): void {
    const parsed = Number.parseFloat(value);
    this.minPrice = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  onMaxPriceChange(value: string): void {
    const parsed = Number.parseFloat(value);
    this.maxPrice = Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  onMinGuestsChange(value: string): void {
    const parsed = Number.parseInt(value, 10);
    this.minGuests = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  clearFilters(): void {
    this.minPrice = null;
    this.maxPrice = null;
    this.minGuests = null;
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

  get currentPageLabel(): string {
    const pagesInView = Math.max(1, Math.ceil(this.hotels.length / this.pageSize));
    const firstPage = this.windowStartPage + 1;
    const lastPage = this.windowStartPage + pagesInView;

    return firstPage === lastPage
      ? `Page ${firstPage}`
      : `Pages ${firstPage}-${lastPage}`;
  }

  async viewDetails(hotel: Hotel): Promise<void> {
    if (!hotel?.id) {
      this.errorMessage = this.translate.instant('PROPERTY.ERROR');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const propertyDetail = await firstValueFrom(
        this.propertyDetailService.getPropertyDetail(hotel.id)
      );

      await this.router.navigate(['/propertydetail', hotel.id], {
        state: {
          hotel,
          propertyDetail,
          search: {
            startDate: this.searchStartDate,
            endDate: this.searchEndDate,
            capacity: this.searchCapacity,
          },
        },
      });
    } catch (error) {
      this.errorMessage = this.translate.instant('PROPERTY.ERROR');
    } finally {
      this.isLoading = false;
    }
  }

  private readSearchParamsFromQuery(): void {
    const params = this.route.snapshot.queryParamMap;

    this.searchCity = params.get('city') ?? '';
    this.searchStartDate = params.get('startDate') ?? '';
    this.searchEndDate = params.get('endDate') ?? '';

    const capacityParam = params.get('capacity');
    const parsedCapacity = capacityParam ? Number.parseInt(capacityParam, 10) : 0;
    this.searchCapacity = Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : 0;

    const hasAnyFilter = Boolean(
      this.searchCity || this.searchStartDate || this.searchEndDate || this.searchCapacity > 0
    );

    this.baseSearchParams = {
      ...(this.searchStartDate ? { startDate: this.searchStartDate } : {}),
      ...(this.searchEndDate ? { endDate: this.searchEndDate } : {}),
      ...(this.searchCity ? { city: this.searchCity } : {}),
      ...(this.searchCapacity > 0 ? { capacity: this.searchCapacity } : {}),
    };

    if (hasAnyFilter) {
      this.filterSummaryParams = {
        ...this.filterSummaryParams,
        locationValue: this.searchCity,
        checkInValue: this.searchStartDate,
        checkOutValue: this.searchEndDate,
        guestsValue: this.searchCapacity
          ? this.translate.instant(this.searchCapacity === 1 ? 'SEARCH.GUEST_ONE' : 'SEARCH.GUESTS', {
              count: this.searchCapacity,
            })
          : '',
      };
    }
  }

  private fetchHotelsPage(page: number): Promise<Hotel[]> {
    const params = {
      ...this.baseSearchParams,
      page,
      size: this.pageSize,
    };

    return firstValueFrom(this.hotelsService.getHotels(params));
  }

  private async scrollToWindowMiddle(): Promise<void> {
    const scrollElement = await this.content?.getScrollElement();

    if (!scrollElement) {
      return;
    }

    await this.content?.scrollToPoint(0, scrollElement.scrollHeight / 2, 0);
  }

  private async isNearBottom(currentScrollTop: number): Promise<boolean> {
    const scrollElement = await this.content?.getScrollElement();

    if (!scrollElement) {
      return false;
    }

    return currentScrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - this.bottomScrollThreshold;
  }

  private refreshFilterSummaryLabels(): void {
    this.filterSummaryParams = {
      ...this.filterSummaryParams,
      locationLabel: this.translate.instant('SEARCH.FILTER_DESTINATION'),
      checkInLabel: this.translate.instant('SEARCH.FILTER_CHECKIN'),
      checkOutLabel: this.translate.instant('SEARCH.FILTER_CHECKOUT'),
      guestsLabel: this.translate.instant('SEARCH.FILTER_GUESTS'),
    };
    this.filterSummaryTopActionLabel = this.translate.instant('SEARCH.FILTER_ACTION');
    this.filterSummarySortLabel = this.translate.instant('SEARCH.SORT_ACTION');
    this.filterSummaryMobileFiltersLabel = this.translate.instant('SEARCH.FILTERS_ACTION');
    this.filterSummaryMobilePriceLabel = this.translate.instant('SEARCH.PRICE_ACTION');
    this.filterSummaryMobileRatingLabel = this.translate.instant('SEARCH.RATING_ACTION');
  }
}
