import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

export interface FilterSummaryParams {
  locationLabel?: string;
  locationValue?: string;
  checkInLabel?: string;
  checkInValue?: string;
  checkOutLabel?: string;
  checkOutValue?: string;
  guestsLabel?: string;
  guestsValue?: string;
}

@Component({
  selector: 'th-filter-summary',
  templateUrl: './th-filter-summary.component.html',
  styleUrls: ['./th-filter-summary.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class ThFilterSummaryComponent {
  @Input() alt = 'Filter summary';
  @Input() filterParams: FilterSummaryParams | null = null;

  get resolvedAlt(): string {
    if (this.alt && this.alt !== 'Filter summary') {
      return this.alt;
    }

    if (!this.filterParams) {
      return this.alt;
    }

    const labels = {
      location: this.filterParams.locationLabel ?? 'Destination',
      checkIn: this.filterParams.checkInLabel ?? 'Check-in',
      checkOut: this.filterParams.checkOutLabel ?? 'Check-out',
      guests: this.filterParams.guestsLabel ?? 'Guests',
    };

    const values = {
      location: this.filterParams.locationValue ?? '-',
      checkIn: this.filterParams.checkInValue ?? '-',
      checkOut: this.filterParams.checkOutValue ?? '-',
      guests: this.filterParams.guestsValue ?? '-',
    };

    return `${labels.location}: ${values.location}, ${labels.checkIn}: ${values.checkIn}, ${labels.checkOut}: ${values.checkOut}, ${labels.guests}: ${values.guests}`;
  }
}
