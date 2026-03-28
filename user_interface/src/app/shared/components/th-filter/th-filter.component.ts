import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'th-filter',
  templateUrl: './th-filter.component.html',
  styleUrls: ['./th-filter.component.scss'],
  standalone: false
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

  @Output() locationClicked = new EventEmitter<void>();
  @Output() checkInClicked = new EventEmitter<void>();
  @Output() checkOutClicked = new EventEmitter<void>();
  @Output() guestsClicked = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
}
