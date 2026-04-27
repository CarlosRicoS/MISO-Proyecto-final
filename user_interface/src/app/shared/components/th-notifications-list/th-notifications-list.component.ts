import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { NotificationGroup, NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'th-notifications-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './th-notifications-list.component.html',
  styleUrls: ['./th-notifications-list.component.scss'],
})
export class ThNotificationsListComponent {
  @Input() notificationGroups: NotificationGroup[] = [];

  constructor(public notificationService: NotificationService) {}
}
