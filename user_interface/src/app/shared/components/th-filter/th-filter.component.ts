import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'th-filter',
  templateUrl: './th-filter.component.html',
  styleUrls: ['./th-filter.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class ThFilterComponent {
  @Input() locationLabel = 'Location';
  @Input() locationPlaceholder = 'Where are you going?';
  @Input() locationValue = '';

  @Input() checkInLabel = 'Check in';
  @Input() checkInPlaceholder = 'Add date';
  @Input() checkInValue = '';

  @Input() checkOutLabel = 'Check out';
  @Input() checkOutPlaceholder = 'Add date';
  @Input() checkOutValue = '';

  @Input() guestsLabel = 'Guests';
  @Input() guestsPlaceholder = 'Add guests';
  @Input() guestsValue = '';

  @Input() actionLabel = 'Search';
  @Input() actionDisabled = false;

  @Output() locationValueChange = new EventEmitter<string>();
  @Output() checkInClicked = new EventEmitter<void>();
  @Output() checkOutClicked = new EventEmitter<void>();
  @Output() guestsValueChange = new EventEmitter<string>();
  @Output() action = new EventEmitter<void>();

  onGuestsInput(value: string | null | undefined): void {
    const raw = value ?? '';
    const sanitized = raw.replace(/\D+/g, '');
    this.guestsValueChange.emit(sanitized);
  }
}
