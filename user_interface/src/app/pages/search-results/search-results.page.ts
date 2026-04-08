import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Hotel } from '../../core/models/hotel.model';
import { HotelsService } from '../../core/services/hotels.service';
import { PropertyDetailService } from '../../core/services/property-detail.service';
import { FilterSummaryParams } from '../../shared/components/th-filter-summary/th-filter-summary.component';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.page.html',
  styleUrls: ['./search-results.page.scss'],
  standalone: false,
})
export class SearchResultsPage implements OnInit {
  hotels: Hotel[] = [];
  isLoading = false;
  errorMessage = '';

  searchCity = '';
  searchStartDate = '';
  searchEndDate = '';
  searchCapacity = 1;

  filterSummaryParams: FilterSummaryParams = {
    locationLabel: 'Destination',
    locationValue: '',
    checkInLabel: 'Check-in',
    checkInValue: '',
    checkOutLabel: 'Check-out',
    checkOutValue: '',
    guestsLabel: 'Guests',
    guestsValue: '',
  };

  constructor(
    private hotelsService: HotelsService,
    private propertyDetailService: PropertyDetailService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    this.readSearchParamsFromQuery();

    const navState = this.router.getCurrentNavigation()?.extras.state ?? history.state;
    const stateHotels = Array.isArray(navState?.['hotels']) ? (navState['hotels'] as Hotel[]) : null;

    if (stateHotels) {
      this.hotels = stateHotels;
      return;
    }

    await this.loadHotelsFromApi();
  }

  async loadHotelsFromApi(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const params = {
        ...(this.searchStartDate ? { startDate: this.searchStartDate } : {}),
        ...(this.searchEndDate ? { endDate: this.searchEndDate } : {}),
        ...(this.searchCity ? { city: this.searchCity } : {}),
        ...(this.searchCapacity > 0 ? { capacity: this.searchCapacity } : {}),
      };

      this.hotels = await firstValueFrom(
        Object.keys(params).length ? this.hotelsService.getHotels(params) : this.hotelsService.getHotels()
      );
    } catch (error) {
      this.errorMessage = 'Unable to load hotels.';
    } finally {
      this.isLoading = false;
    }
  }

  getHotelLocation(hotel: Hotel): string {
    const parts = [hotel.city, hotel.country].filter((part) => Boolean(part));
    return parts.length ? parts.join(', ') : 'Location unavailable';
  }

  getHotelPrice(hotel: Hotel): string {
    const currency = hotel.currency || '$';
    const price = hotel.pricePerNight ?? 0;
    return `${currency}${price}`;
  }

  getHotelRating(hotel: Hotel): string {
    return Number.isFinite(hotel.rating) ? hotel.rating.toFixed(1) : 'N/A';
  }

  async viewDetails(hotel: Hotel): Promise<void> {
    if (!hotel?.id) {
      this.errorMessage = 'Unable to load property details.';
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
      this.errorMessage = 'Unable to load property details.';
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

    if (hasAnyFilter) {
      this.filterSummaryParams = {
        ...this.filterSummaryParams,
        locationValue: this.searchCity,
        checkInValue: this.searchStartDate,
        checkOutValue: this.searchEndDate,
        guestsValue: this.searchCapacity
          ? `${this.searchCapacity} ${this.searchCapacity === 1 ? 'Guest' : 'Guests'}`
          : '',
      };
    }
  }
}
