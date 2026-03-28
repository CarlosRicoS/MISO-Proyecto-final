import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { IonDatetime } from '@ionic/angular';

@Component({
  selector: 'th-datetime-modal',
  templateUrl: './th-datetime-modal.component.html',
  styleUrls: ['./th-datetime-modal.component.scss'],
  standalone: false
})
export class ThDatetimeModalComponent {
  @ViewChild('datetimePicker') datetimePicker!: IonDatetime;

  @Input() isOpen = false;
  @Input() title = 'Select Date & Time';
  @Input() selectedDate: string | null = null;  // ISO format YYYY-MM-DD
  @Input() minDate: string | null = null;  // ISO format YYYY-MM-DD, blocks earlier dates
  @Input() maxDate: string | null = null;  // ISO format YYYY-MM-DD, blocks later dates
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  
  @Output() confirmed = new EventEmitter<Date>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    if (this.selectedDate) {
      // selectedDate from ion-datetime is ISO string (YYYY-MM-DD)
      // Parse it and create a Date object at midnight UTC
      const [year, month, day] = this.selectedDate.split('T')[0].split('-');
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      this.confirmed.emit(date);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(): void {
    this.cancelled.emit();
  }
}
