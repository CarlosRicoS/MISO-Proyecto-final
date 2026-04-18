import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'portal-hoteles-header-bar',
  templateUrl: './portal-hoteles-header-bar.component.html',
  styleUrls: ['./portal-hoteles-header-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class PortalHotelesHeaderBarComponent {
  @Input() hotelName = 'Grand Plaza Hotel';
  @Input() location = 'Downtown Location';
  @Input() userName = 'John Smith';
  @Input() userRole = 'Hotel Manager';
  @Input() notificationCount = 3;

  get avatarInitials(): string {
    return this.userName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
