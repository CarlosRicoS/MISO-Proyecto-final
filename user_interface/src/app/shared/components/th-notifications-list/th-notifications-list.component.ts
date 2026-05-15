import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { NotificationGroup, NotificationItem, NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'th-notifications-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './th-notifications-list.component.html',
  styleUrls: ['./th-notifications-list.component.scss'],
})
export class ThNotificationsListComponent {
  @Input() notificationGroups: NotificationGroup[] = [];

  constructor(public notificationService: NotificationService, private router: Router) {}

  onNotificationTap(notification: NotificationItem): void {
    const data = notification?.data || {};
    const bookingIdRaw =
      (data['bookingId'] as string | number | undefined) ??
      (data['reservationId'] as string | number | undefined) ??
      (data['id'] as string | number | undefined);
    const bookingId = bookingIdRaw !== undefined && bookingIdRaw !== null ? String(bookingIdRaw).trim() : '';

    if (!bookingId) {
      return;
    }

    void this.router.navigate(['/booking-detail'], {
      queryParams: { bookingId },
      state: { bookingId },
    });
  }
}
