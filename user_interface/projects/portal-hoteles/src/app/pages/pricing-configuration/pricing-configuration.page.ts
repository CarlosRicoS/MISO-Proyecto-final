import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { PortalHotelesGridCardComponent } from '@travelhub/shared/components/portal-hoteles/grid-card/grid-card.component';
import { RouterModule } from '@angular/router';
import { PricingEngineService } from '@travelhub/core/services/pricing-engine.service';
import { PricingPropertyResponse } from '@travelhub/core/models/platform-api.model';

@Component({
  selector: 'portal-hoteles-pricing-configuration',
  templateUrl: './pricing-configuration.page.html',
  styleUrls: ['./pricing-configuration.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule, PortalHotelesGridCardComponent],
})
export class PortalHotelesPricingConfigurationPage implements OnInit {
  private readonly defaultPropertyId = '7b2f2f2f-8a9b-4f25-ae6d-1d2a1f0c1c33';

  private readonly translate = inject(TranslateService);

  @Input() propertyId = '';
  @Input() guests = 1;
  @Input() dateInit = '';
  @Input() dateFinish = '';
  @Input() currencyFilter = '$';

  pricingData: PricingPropertyResponse = {
    id: '',
    name: '',
    city: '',
    country: '',
    price: 0,
    maxCapacity: 0,
    description: '',
    urlBucketPhotos: '',
    checkInTime: '',
    checkOutTime: '',
    adminGroupId: '',
  };

  isLoading = false;
  errorMessage = '';

  roomRateRows: RoomRateRow[] = [];
  seasonalRulesRows: SeasonalRuleRow[] = [];

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly pricingEngineService: PricingEngineService,
  ) {}

  ngOnInit(): void {
    this.refreshRoomRateRows();
    this.seasonalRulesRows = this.buildSeasonalRuleRows();
    this.loadPricingData();
  }

  get operatorName(): string {
    return this.authSession.userEmail || 'Hotel Manager';
  }

  get visibleRangeLabel(): string {
    if (!this.hasPricingData) {
      return this.translate.instant('PRICING.VISIBLE_NONE');
    }

    return this.translate.instant('PRICING.VISIBLE_ONE');
  }

  get hasPricingData(): boolean {
    return Boolean(this.pricingData.id && this.pricingData.price && this.pricingData.name);
  }

  getStatusClass(status: string): string {
    const normalizedStatus = (status || '').trim().toLowerCase();
    const activeLabel = this.translate.instant('PRICING.STATUS_ACTIVE').toLowerCase();
    if (normalizedStatus === 'active' || normalizedStatus === activeLabel) {
      return 'portal-hoteles-pricing-status portal-hoteles-pricing-status--active';
    }
    return 'portal-hoteles-pricing-status portal-hoteles-pricing-status--inactive';
  }

  formatRate(rate: number, currency: string): string {
    const formattedRate = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rate) + currency;

    return `${currency}${formattedRate.replace(currency, '')}`;
  }

  formatDiscount(discount: number | undefined): string {
    if (discount == null || discount === 0) {
      return this.translate.instant('PRICING.DISCOUNT_NONE');
    }

    const percentage = Math.abs(discount).toFixed(2);
    const sign = discount < 0 ? '-' : '+';
    return this.translate.instant('PRICING.DISCOUNT_OFF', { sign, percent: percentage });
  }

  formatModifier(modifier: number): string {
    const sign = modifier >= 0 ? '+' : '-';
    return `${sign}${Math.abs(modifier)}%`;
  }

  getModifierClass(modifier: number): string {
    if (modifier >= 0) {
      return 'portal-hoteles-pricing-badge portal-hoteles-pricing-badge--danger';
    }

    return 'portal-hoteles-pricing-badge portal-hoteles-pricing-badge--success';
  }

  trackByRoomType(_index: number, row: RoomRateRow): string {
    return row.roomTypeId;
  }

  trackBySeason(_index: number, row: SeasonalRuleRow): string {
    return row.season;
  }

  private buildRoomRateRows(): RoomRateRow[] {
    const baseRate = this.pricingData.price && this.pricingData.price > 0 ? this.pricingData.price : 240;
    const activeStatus = this.translate.instant('PRICING.STATUS_ACTIVE');

    return [
      {
        roomType: this.translate.instant('PRICING.ROOM_SUPERIOR_DOUBLE'),
        roomTypeId: 'Room Type 101',
        capacityLabel: this.translate.instant('PRICING.CAPACITY_LABEL', { count: 2 }),
        baseRateLabel: this.formatRate(baseRate, this.currencyFilter),
        discount: -15,
        discountLabel: this.formatDiscount(-15),
        discountClass: this.getModifierClass(-15),
        finalRateLabel: this.formatRate(this.calculateFinalRate(baseRate, -15), this.currencyFilter),
        status: activeStatus,
        statusClass: this.getStatusClass('Active'),
      },
      {
        roomType: this.translate.instant('PRICING.ROOM_DELUXE_SUITE'),
        roomTypeId: 'Room Type 201',
        capacityLabel: this.translate.instant('PRICING.CAPACITY_LABEL', { count: 4 }),
        baseRateLabel: this.formatRate(420, this.currencyFilter),
        discount: 0,
        discountLabel: this.formatDiscount(0),
        discountClass: this.getModifierClass(0),
        finalRateLabel: this.formatRate(420, this.currencyFilter),
        status: activeStatus,
        statusClass: this.getStatusClass('Active'),
      },
      {
        roomType: this.translate.instant('PRICING.ROOM_STANDARD'),
        roomTypeId: 'Room Type 001',
        capacityLabel: this.translate.instant('PRICING.CAPACITY_LABEL', { count: 2 }),
        baseRateLabel: this.formatRate(180, this.currencyFilter),
        discount: -10,
        discountLabel: this.formatDiscount(-10),
        discountClass: this.getModifierClass(-10),
        finalRateLabel: this.formatRate(this.calculateFinalRate(180, -10), this.currencyFilter),
        status: activeStatus,
        statusClass: this.getStatusClass('Active'),
      },
      {
        roomType: this.translate.instant('PRICING.ROOM_JUNIOR_SUITE'),
        roomTypeId: 'Room Type 301',
        capacityLabel: this.translate.instant('PRICING.CAPACITY_LABEL', { count: 3 }),
        baseRateLabel: this.formatRate(320, this.currencyFilter),
        discount: -20,
        discountLabel: this.formatDiscount(-20),
        discountClass: this.getModifierClass(-20),
        finalRateLabel: this.formatRate(this.calculateFinalRate(320, -20), this.currencyFilter),
        status: activeStatus,
        statusClass: this.getStatusClass('Active'),
      },
    ];
  }

  private buildSeasonalRuleRows(): SeasonalRuleRow[] {
    const activeStatus = this.translate.instant('PRICING.STATUS_ACTIVE');

    return [
      {
        season: this.translate.instant('PRICING.HIGH_SEASON'),
        description: this.translate.instant('PRICING.SEASON_HIGH_DESC'),
        dateRange: 'Dec 15 - Jan 15',
        helperDateRange: 'Jun 15 - Aug 31',
        modifier: 35,
        modifierLabel: this.formatModifier(35),
        modifierClass: this.getModifierClass(35),
        status: activeStatus,
        statusClass: this.getStatusClass('Active'),
      },
      {
        season: this.translate.instant('PRICING.LOW_SEASON'),
        description: this.translate.instant('PRICING.SEASON_LOW_DESC'),
        dateRange: 'Feb 1 - May 31',
        helperDateRange: 'Sep 15 - Nov 30',
        modifier: -20,
        modifierLabel: this.formatModifier(-20),
        modifierClass: this.getModifierClass(-20),
        status: activeStatus,
        statusClass: this.getStatusClass('Active'),
      },
    ];
  }

  private refreshRoomRateRows(): void {
    this.roomRateRows = this.buildRoomRateRows();
  }

  private calculateFinalRate(baseRate: number, discount: number): number {
    if (!discount) {
      return baseRate;
    }

    return Math.round(baseRate * (1 + discount / 100));
  }

  formatDateRange(dateRange: string): string {
    if (!dateRange) {
      return '-';
    }
    try {
      const parts = dateRange.split(' - ');
      if (parts.length === 2) {
        const start = new Date(parts[0]);
        const end = new Date(parts[1]);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const startMonth = months[start.getMonth()];
        const endMonth = months[end.getMonth()];
        return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`;
      }
    } catch {
      // Ignore errors
    }
    return dateRange || '-';
  }

  async loadPricingData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const params = this.buildPricingQuery();

      const data = await firstValueFrom(
        this.pricingEngineService.getPropertyPricing(params),
      );

      this.pricingData = data as PricingPropertyResponse;
      this.refreshRoomRateRows();
    } catch {
      this.errorMessage = this.translate.instant('PRICING.ERROR');
      this.pricingData = {
        id: '',
        name: '',
        city: '',
        country: '',
        price: 0,
        maxCapacity: 0,
        description: '',
        urlBucketPhotos: '',
        checkInTime: '',
        checkOutTime: '',
        adminGroupId: '',
      };
      this.refreshRoomRateRows();
    } finally {
      this.isLoading = false;
    }
  }

  private buildPricingQuery(): {
    propertyId: string;
    guests: number;
    dateInit: string;
    dateFinish: string;
  } {
    return {
      propertyId: this.propertyId || this.defaultPropertyId,
      guests: this.guests > 0 ? this.guests : 1,
      dateInit: this.dateInit || this.todayIsoDate(),
      dateFinish: this.dateFinish || this.tomorrowIsoDate(),
    };
  }

  private todayIsoDate(): string {
    const currentDate = new Date();
    return currentDate.toISOString().slice(0, 10);
  }

  private tomorrowIsoDate(): string {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);
    return currentDate.toISOString().slice(0, 10);
  }
}

interface RoomRateRow {
  roomType: string;
  roomTypeId: string;
  capacityLabel: string;
  baseRateLabel: string;
  discount: number;
  discountLabel: string;
  discountClass: string;
  finalRateLabel: string;
  status: string;
  statusClass: string;
}

interface SeasonalRuleRow {
  season: string;
  description: string;
  dateRange: string;
  helperDateRange: string;
  modifier: number;
  modifierLabel: string;
  modifierClass: string;
  status: string;
  statusClass: string;
}
