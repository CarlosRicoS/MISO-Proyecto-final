import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { IonicModule, AlertController } from '@ionic/angular';
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
  seasonalPageSize = 10;
  seasonalCurrentPage = 1;
  isEditPriceModalOpen = false;
  selectedRoomRateRow: RoomRateRow | null = null;
  editBaseRateValue = '';
  isPriceEditorSaving = false;
  isEditSeasonalModalOpen = false;
  selectedSeasonalRuleRow: SeasonalRuleRow | null = null;
  editSeasonalModifierValue = '';
  editDateRangeStart = '';
  editDateRangeEnd = '';
  editGuestsMin = '';
  editGuestsMax = '';
  isSeasonalEditorSaving = false;

  constructor(
    private readonly authSession: AuthSessionService,
    private readonly pricingEngineService: PricingEngineService,
    private readonly config: ConfigService,
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
    private readonly alertController: AlertController,
  ) {}

  ngOnInit(): void {
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

  get filteredSeasonalRulesRows(): SeasonalRuleRow[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.seasonalRulesRows;
    }

    return this.seasonalRulesRows.filter((row) =>
      row.propertyName.toLowerCase().includes(search)
    );
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

  get totalSeasonalPages(): number {
    return Math.ceil(this.filteredSeasonalRulesRows.length / this.seasonalPageSize);
  }

  get paginatedSeasonalRulesRows(): SeasonalRuleRow[] {
    const filteredRows = this.filteredSeasonalRulesRows;
    const startIndex = (this.seasonalCurrentPage - 1) * this.seasonalPageSize;
    const endIndex = startIndex + this.seasonalPageSize;
    return filteredRows.slice(startIndex, endIndex);
  }

  get seasonalPageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalSeasonalPages; i++) {
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
      return 'portal-hoteles-pricing-badge portal-hoteles-pricing-badge--success';
    }

    return 'portal-hoteles-pricing-badge portal-hoteles-pricing-badge--danger';
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
    this.seasonalCurrentPage = 1;
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
    return row.id;
  }

  goToSeasonalPage(page: number): void {
    if (page >= 1 && page <= this.totalSeasonalPages) {
      this.seasonalCurrentPage = page;
      this.cdr.markForCheck();
    }
  }

  openSeasonalEditor(row: SeasonalRuleRow): void {
    this.selectedSeasonalRuleRow = row;
    this.editSeasonalModifierValue = row.modifier.toString();
    this.editDateRangeStart = row.dateRangeStart ? this.formatDateForInput(row.dateRangeStart) : '';
    this.editDateRangeEnd = row.dateRangeEnd ? this.formatDateForInput(row.dateRangeEnd) : '';
    this.editGuestsMin = row.guestsMin !== null ? row.guestsMin.toString() : '';
    this.editGuestsMax = row.guestsMax !== null ? row.guestsMax.toString() : '';
    this.isEditSeasonalModalOpen = true;
    this.cdr.markForCheck();
  }

  closeSeasonalEditor(): void {
    this.isEditSeasonalModalOpen = false;
    this.selectedSeasonalRuleRow = null;
    this.editSeasonalModifierValue = '';
    this.editDateRangeStart = '';
    this.editDateRangeEnd = '';
    this.editGuestsMin = '';
    this.editGuestsMax = '';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  onEditSeasonalModifierInput(value: string | null | undefined): void {
    this.editSeasonalModifierValue = value ?? '';
    this.cdr.markForCheck();
  }

  onEditDateRangeStartChange(value: string | null | undefined): void {
    this.editDateRangeStart = value ?? '';
    this.cdr.markForCheck();
  }

  onEditDateRangeEndChange(value: string | null | undefined): void {
    this.editDateRangeEnd = value ?? '';
    this.cdr.markForCheck();
  }

  onEditGuestsMinChange(value: string | null | undefined): void {
    this.editGuestsMin = value ?? '';
    this.cdr.markForCheck();
  }

  onEditGuestsMaxChange(value: string | null | undefined): void {
    this.editGuestsMax = value ?? '';
    this.cdr.markForCheck();
  }

  get canSaveEditedSeasonalModifier(): boolean {
    if (!this.selectedSeasonalRuleRow || this.isSeasonalEditorSaving) {
      return false;
    }

    const nextModifier = Number(this.editSeasonalModifierValue);
    if (!Number.isFinite(nextModifier) || nextModifier < -100 || nextModifier > 100) {
      return false;
    }

    // Price adjustment must not be 0
    if (nextModifier === 0) {
      return false;
    }

    // If one date field has a value, the other must also have a value
    if ((this.editDateRangeStart && !this.editDateRangeEnd) || (!this.editDateRangeStart && this.editDateRangeEnd)) {
      return false;
    }

    // Validate dates
    if (this.editDateRangeStart && this.editDateRangeEnd) {
      const startDate = new Date(this.editDateRangeStart);
      const endDate = new Date(this.editDateRangeEnd);

      if (startDate > endDate) {
        return false;
      }
    }

    // Validate guests range
    const guestsMin = this.editGuestsMin ? Number(this.editGuestsMin) : null;
    const guestsMax = this.editGuestsMax ? Number(this.editGuestsMax) : null;

    if (guestsMin !== null && guestsMax !== null && guestsMin > guestsMax) {
      return false;
    }

    if (guestsMin !== null && guestsMin < 0) {
      return false;
    }

    if (guestsMax !== null && guestsMax < 0) {
      return false;
    }

    return true;
  }

  async saveSeasonalChanges(): Promise<void> {
    if (!this.selectedSeasonalRuleRow) {
      return;
    }

    const nextModifier = Number(this.editSeasonalModifierValue);
    if (!Number.isFinite(nextModifier) || nextModifier < -100 || nextModifier > 100) {
      return;
    }

    // Validate price adjustment is not 0
    if (nextModifier === 0) {
      this.errorMessage = this.translate.instant('PRICING.MODIFIER_MUST_NOT_BE_ZERO');
      this.cdr.markForCheck();
      return;
    }

    // Validate dates: if one has value, other must too
    if ((this.editDateRangeStart && !this.editDateRangeEnd) || (!this.editDateRangeStart && this.editDateRangeEnd)) {
      this.errorMessage = this.translate.instant('PRICING.DATE_RANGE_BOTH_REQUIRED');
      this.cdr.markForCheck();
      return;
    }

    // Validate date range
    if (this.editDateRangeStart && this.editDateRangeEnd) {
      const startDate = new Date(this.editDateRangeStart);
      const endDate = new Date(this.editDateRangeEnd);

      if (startDate > endDate) {
        this.errorMessage = this.translate.instant('PRICING.DATE_RANGE_ERROR');
        this.cdr.markForCheck();
        return;
      }
    }

    // Parse guests range
    const guestsMin = this.editGuestsMin ? Number(this.editGuestsMin) : null;
    const guestsMax = this.editGuestsMax ? Number(this.editGuestsMax) : null;

    // Validate guests range
    if (guestsMin !== null && guestsMax !== null && guestsMin > guestsMax) {
      this.errorMessage = this.translate.instant('PRICING.GUESTS_RANGE_ERROR');
      this.cdr.markForCheck();
      return;
    }

    this.isSeasonalEditorSaving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const baseUrl = (this.config.apiBaseUrl || '').replace(/\/$/, '');
      const rulesPath = 'pricing-engine/api/propertyprice/pricing';
      const baseRulesUrl = baseUrl ? `${baseUrl}/${rulesPath}` : `/${rulesPath}`;

      const updateUrl = `${baseRulesUrl}/${this.selectedSeasonalRuleRow.priceId}/rules/${this.selectedSeasonalRuleRow.id}`;

      const requestBody = {
        dateInit: this.editDateRangeStart ? new Date(this.editDateRangeStart).toISOString() : null,
        dateFinish: this.editDateRangeEnd ? new Date(this.editDateRangeEnd).toISOString() : null,
        minGuests: guestsMin,
        maxGuests: guestsMax,
        percentage: nextModifier,
      };

      await firstValueFrom(this.http.put<any>(updateUrl, requestBody));

      // Update the local row data
      this.selectedSeasonalRuleRow.modifier = nextModifier;
      this.selectedSeasonalRuleRow.modifierLabel = this.formatModifier(nextModifier);
      this.selectedSeasonalRuleRow.modifierClass = this.getModifierClass(nextModifier);

      // Update dates
      if (this.editDateRangeStart) {
        this.selectedSeasonalRuleRow.dateRangeStart = new Date(this.editDateRangeStart).toISOString();
      }
      if (this.editDateRangeEnd) {
        this.selectedSeasonalRuleRow.dateRangeEnd = new Date(this.editDateRangeEnd).toISOString();
      }
      this.selectedSeasonalRuleRow.dateRange = this.formatDateRange(
        this.selectedSeasonalRuleRow.dateRangeStart,
        this.selectedSeasonalRuleRow.dateRangeEnd
      );

      // Update guests range
      this.selectedSeasonalRuleRow.guestsMin = guestsMin;
      this.selectedSeasonalRuleRow.guestsMax = guestsMax;

      this.isSeasonalEditorSaving = false;
      this.closeSeasonalEditor();
      this.cdr.markForCheck();
    } catch (error) {
      this.isSeasonalEditorSaving = false;
      this.errorMessage = this.translate.instant('PRICING.EDIT_SEASONAL_ERROR');
      this.cdr.markForCheck();
    }
  }

  deleteSeasonalRule(row: SeasonalRuleRow): void {
    void this.showDeleteConfirmation(row);
  }

  private async showDeleteConfirmation(row: SeasonalRuleRow): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('PRICING.DELETE_SEASONAL_CONFIRM_TITLE'),
      message: this.translate.instant('PRICING.DELETE_SEASONAL_CONFIRM_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('COMMON.CANCEL'),
          role: 'cancel',
          handler: () => {
            // No action on cancel
          },
        },
        {
          text: this.translate.instant('PRICING.DELETE_SEASONAL_CONFIRM_YES'),
          role: 'destructive',
          handler: () => {
            void this.performDeleteSeasonalRule(row);
          },
        },
      ],
    });

    await alert.present();
  }

  private async performDeleteSeasonalRule(row: SeasonalRuleRow): Promise<void> {
    try {
      const baseUrl = (this.config.apiBaseUrl || '').replace(/\/$/, '');
      const rulesPath = 'pricing-engine/api/propertyprice/pricing';
      const baseRulesUrl = baseUrl ? `${baseUrl}/${rulesPath}` : `/${rulesPath}`;

      const deleteUrl = `${baseRulesUrl}/${row.priceId}/rules/${row.id}`;

      await firstValueFrom(this.http.delete<any>(deleteUrl));

      // Remove the row from the table
      const index = this.seasonalRulesRows.findIndex((r) => r.id === row.id);
      if (index >= 0) {
        this.seasonalRulesRows.splice(index, 1);
        if (this.seasonalCurrentPage > this.totalSeasonalPages && this.seasonalCurrentPage > 1) {
          this.seasonalCurrentPage = this.totalSeasonalPages;
        }
        this.cdr.markForCheck();
      }
    } catch (error) {
      this.errorMessage = this.translate.instant('PRICING.DELETE_SEASONAL_ERROR');
      this.cdr.markForCheck();
    }
  }

  private async loadSeasonalRules(pricingEntries: any[], propMap: Map<string, any>): Promise<void> {
    try {
      const baseUrl = (this.config.apiBaseUrl || '').replace(/\/$/, '');
      const rulesPath = 'pricing-engine/api/propertyprice/pricing';
      const baseRulesUrl = baseUrl ? `${baseUrl}/${rulesPath}` : `/${rulesPath}`;

      const allRules: SeasonalRuleRow[] = [];

      for (const pricingEntry of Array.isArray(pricingEntries) ? pricingEntries : []) {
        const pricingId = pricingEntry?.id;
        if (!pricingId) continue;

        try {
          const rulesUrl = `${baseRulesUrl}/${pricingId}/rules`;
          const rules = await firstValueFrom(this.http.get<any[]>(rulesUrl));

          if (Array.isArray(rules)) {
            const prop = propMap.get(pricingEntry.propertyId);
            const propertyName = prop?.name || '';
            const propertyCity = prop?.city || '';

            const mappedRules = rules.map((rule: any) => ({
              id: rule.id ? String(rule.id) : '',
              ruleId: rule.id ? String(rule.id) : '',
              priceId: rule.priceId ? String(rule.priceId) : '',
              propertyName: propertyName,
              propertyCity: propertyCity,
              propertyId: pricingEntry.propertyId,
              season: this.generateSeasonLabel(rule.dateInit, rule.dateFinish),
              description: '',
              dateRangeStart: rule.dateInit ? new Date(rule.dateInit).toISOString() : null,
              dateRangeEnd: rule.dateFinish ? new Date(rule.dateFinish).toISOString() : null,
              dateRange: this.formatDateRange(rule.dateInit, rule.dateFinish),
              helperDateRange: '',
              guestsMin: rule.minGuests ?? null,
              guestsMax: rule.maxGuests ?? null,
              modifier: Number(rule.percentage) || 0,
              modifierLabel: this.formatModifier(Number(rule.percentage) || 0),
              modifierClass: this.getModifierClass(Number(rule.percentage) || 0),
              status: this.translate.instant('PRICING.STATUS_ACTIVE'),
              statusClass: this.getStatusClass('Active'),
            } as SeasonalRuleRow));

            allRules.push(...mappedRules);
          }
        } catch (err) {
          // Continue loading other rules if one fails
          console.warn(`Failed to load rules for pricing ${pricingId}:`, err);
        }
      }

      this.seasonalRulesRows = allRules;
      this.seasonalCurrentPage = 1;
    } catch (err) {
      console.error('Error loading seasonal rules:', err);
      this.seasonalRulesRows = [];
    }
  }

  private generateSeasonLabel(dateInit: any, dateFinish: any): string {
    if (!dateInit || !dateFinish) {
      return this.translate.instant('PRICING.SEASON_CUSTOM');
    }
    // You can add more sophisticated logic here based on the dates
    return this.translate.instant('PRICING.SEASON_CUSTOM');
  }

  private formatDateRange(dateInit: any, dateFinish: any): string {
    if (!dateInit && !dateFinish) {
      return '-';
    }

    if (typeof dateInit === 'string' && !dateFinish && dateInit.includes(' - ')) {
      return dateInit;
    }

    const formatDate = (date: any): string => {
      if (!date) return '';
      try {
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
          return typeof date === 'string' ? date : '';
        }

        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: '2-digit',
          timeZone: 'UTC',
        }).format(d);
      } catch {
        return typeof date === 'string' ? date : '';
      }
    };

    const startStr = formatDate(dateInit);
    const endStr = formatDate(dateFinish);

    if (startStr && endStr) {
      return `${startStr} - ${endStr}`;
    } else if (startStr) {
      return `From ${startStr}`;
    } else if (endStr) {
      return `Until ${endStr}`;
    }
    return '-';
  }

  formatGuestsRange(minGuests: number | null, maxGuests: number | null): string {
    if (minGuests !== null && maxGuests !== null) {
      return this.translate.instant('PRICING.GUESTS_RANGE', { min: minGuests, max: maxGuests });
    }

    if (minGuests !== null) {
      return this.translate.instant('PRICING.GUESTS_RANGE_MIN_ONLY', { min: minGuests });
    }

    if (maxGuests !== null) {
      return this.translate.instant('PRICING.GUESTS_RANGE_MAX_ONLY', { max: maxGuests });
    }

    return '-';
  }

  private formatDateForInput(dateStr: string | null): string {
    if (!dateStr) {
      return '';
    }

    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return '';
      }

      // Format as YYYY-MM-DD for input[type="date"]
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
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
      // Load seasonal rules for each pricing entry
      await this.loadSeasonalRules(pricingEntries, propMap);

      this.currentPage = 1;
      this.cdr.markForCheck();
    } catch (err) {
      this.errorMessage = this.translate.instant('PRICING.ERROR');
      this.cdr.markForCheck();
    } finally {
      this.isLoading = false;
    }
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
  id: string;
  ruleId: string;
  priceId: string;
  propertyName: string;
  propertyCity: string;
  propertyId: string;
  season: string;
  description: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  dateRange: string;
  helperDateRange: string;
  guestsMin: number | null;
  guestsMax: number | null;
  modifier: number;
  modifierLabel: string;
  modifierClass: string;
  status: string;
  statusClass: string;
}
