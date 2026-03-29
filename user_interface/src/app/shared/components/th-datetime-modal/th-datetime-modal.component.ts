import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonDatetime, IonicModule } from '@ionic/angular';

@Component({
  selector: 'th-datetime-modal',
  templateUrl: './th-datetime-modal.component.html',
  styleUrls: ['./th-datetime-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
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
  @Output() dateSelected = new EventEmitter<Date>();
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

  onDateChange(value: string | string[] | null | undefined): void {
    const resolved = Array.isArray(value) ? value[0] : value;

    if (!resolved) {
      return;
    }

    const date = this.parseIsoDate(resolved);

    if (!date) {
      return;
    }

    this.confirmed.emit(date);
    this.dateSelected.emit(date);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(): void {
    this.cancelled.emit();
  }

  private parseIsoDate(value: string): Date | null {
    const datePart = value.split('T')[0];
    const [year, month, day] = datePart.split('-');

    if (!year || !month || !day) {
      return null;
    }

    return new Date(Number(year), Number(month) - 1, Number(day));
  }
}
