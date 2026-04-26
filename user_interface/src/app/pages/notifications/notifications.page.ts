import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Observable, tap } from 'rxjs';
import { NotificationGroup, NotificationService } from '../../core/services/notification.service';
import { ThNotificationsListComponent } from '../../shared/components/th-notifications-list/th-notifications-list.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, IonicModule, ThNotificationsListComponent],
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage {
  readonly notificationGroups$: Observable<NotificationGroup[]> = this.notificationService.groupedNotifications$.pipe(
    tap((groups) => {
      console.info(`[NotificationsPage] Rendering ${groups.length} notification groups.`);
      groups.forEach((group) => console.info(`[NotificationsPage] group=${group.title} count=${group.items.length}`));
    })
  );

  constructor(private notificationService: NotificationService) {}
}
