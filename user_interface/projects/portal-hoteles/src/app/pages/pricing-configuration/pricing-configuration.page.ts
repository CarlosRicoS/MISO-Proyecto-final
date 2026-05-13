import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';
import { PortalHotelesGridCardComponent } from '@travelhub/shared/components/portal-hoteles/grid-card/grid-card.component';
import { RouterModule } from '@angular/router';
import { PricingEngineService } from '@travelhub/core/services/pricing-engine.service';
import { PricingPropertyResponse } from '@travelhub/core/models/platform-api.model';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '@travelhub/core/services/config.service';

@Component({
  selector: 'portal-hoteles-pricing-configuration',
  templateUrl: './pricing-configuration.page.html',
  styleUrls: ['./pricing-configuration.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, RouterModule, TranslateModule, PortalHotelesGridCardComponent],
})
export class PortalHotelesPricingConfigurationPage implements OnInit {

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

  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  isEditPriceModalOpen = false;
  selectedRoomRateRow: RoomRateRow | null = null;
  editBaseRateValue = '';
  isPriceEditorSaving = false;

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly pricingEngineService: PricingEngineService,
    private readonly config: ConfigService,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.seasonalRulesRows = this.buildSeasonalRuleRows();
    void this.loadTableData();
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

  get totalPages(): number {
    const filteredRows = this.roomRateRows.filter((row) =>
      row.propertyName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    return Math.ceil(filteredRows.length / this.pageSize);
  }

  get paginatedRoomRateRows(): RoomRateRow[] {
    const filteredRows = this.roomRateRows.filter((row) =>
      row.propertyName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return filteredRows.slice(startIndex, endIndex);
  }

  get filteredRoomRateRows(): RoomRateRow[] {
    return this.roomRateRows.filter((row) =>
      row.propertyName.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
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
    return row.propertyId;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.markForCheck();
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  get canSaveEditedPrice(): boolean {
    if (!this.selectedRoomRateRow || this.isPriceEditorSaving) {
      return false;
    }

    const nextBaseRate = Number(this.editBaseRateValue);
    return Number.isFinite(nextBaseRate) && nextBaseRate >= 0;
  }

  openPriceEditor(row: RoomRateRow): void {
    this.selectedRoomRateRow = row;
    this.editBaseRateValue = row.baseRate.toFixed(2);
    this.isEditPriceModalOpen = true;
    this.cdr.markForCheck();
  }

  closePriceEditor(): void {
    this.isEditPriceModalOpen = false;
    this.selectedRoomRateRow = null;
    this.editBaseRateValue = '';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  onEditBaseRateInput(value: string | null | undefined): void {
    this.editBaseRateValue = value ?? '';
    this.cdr.markForCheck();
  }

  async savePriceChanges(): Promise<void> {
    if (!this.selectedRoomRateRow) {
      return;
    }

    const nextBaseRate = Number(this.editBaseRateValue);
    if (!Number.isFinite(nextBaseRate) || nextBaseRate < 0) {
      return;
    }

    if (!this.selectedRoomRateRow.pricingRecordId) {
      this.errorMessage = this.translate.instant('PRICING.ERROR');
      this.cdr.markForCheck();
      return;
    }

    this.isPriceEditorSaving = true;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(
        this.pricingEngineService.updatePropertyPrice(
          this.selectedRoomRateRow.pricingRecordId,
          this.selectedRoomRateRow.propertyId,
          nextBaseRate,
        ),
      );
    } catch {
      this.isPriceEditorSaving = false;
      this.errorMessage = this.translate.instant('PRICING.EDIT_PRICE_ERROR');
      this.cdr.markForCheck();
      return;
    }

    this.selectedRoomRateRow.baseRate = nextBaseRate;
    this.selectedRoomRateRow.baseRateLabel = this.formatRate(nextBaseRate, this.currencyFilter);
    this.isPriceEditorSaving = false;
    this.closePriceEditor();
    this.cdr.markForCheck();
  }

  trackBySeason(_index: number, row: SeasonalRuleRow): string {
    return row.season;
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

  async loadTableData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const baseUrl = (this.config.apiBaseUrl || '').replace(/\/$/, '');

      const pricingPath = 'pricing-engine/api/propertyprice/pricing';
      const pricingUrl = baseUrl ? `${baseUrl}/${pricingPath}` : `/${pricingPath}`;

      const propertyPath = this.config.propertyApiPath?.replace(/^\//, '') || 'poc-properties/api/property';
      const propertiesUrl = baseUrl ? `${baseUrl}/${propertyPath}?size=140` : `/${propertyPath}?size=140`;

      const pricingEntries = await firstValueFrom(this.http.get<any[]>(pricingUrl));
      const properties = await firstValueFrom(this.http.get<any[]>(propertiesUrl));

      const propMap = new Map(properties.map((p: any) => [p.id, p]));

      this.roomRateRows = (Array.isArray(pricingEntries) ? pricingEntries : [])
        .filter((entry: any) => propMap.has(entry.propertyId))
        .map((entry: any) => {
          const prop = propMap.get(entry.propertyId);
          const capacity = prop?.maxCapacity ?? 0;
          return {
            pricingRecordId: entry.id ? String(entry.id) : '',
            propertyName: prop.name,
            propertyId: prop.id,
            propertyCity: prop.city || '',
            guestsCapacityLabel: this.translate.instant('PRICING.CAPACITY_LABEL', { count: capacity }),
            guestsCapacity: capacity,
            baseRateLabel: this.formatRate(Number(entry.basePrice) || 0, this.currencyFilter),
            baseRate: Number(entry.basePrice) || 0,
          } as RoomRateRow;
        });
      this.currentPage = 1;
      this.cdr.markForCheck();
    } catch (err) {
      this.errorMessage = this.translate.instant('PRICING.ERROR');
      this.cdr.markForCheck();
    } finally {
      this.isLoading = false;
    }
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
}

interface RoomRateRow {
  pricingRecordId: string;
  propertyName: string;
  propertyId: string;
  propertyCity: string;
  guestsCapacityLabel: string;
  guestsCapacity: number;
  baseRateLabel: string;
  baseRate: number;
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
