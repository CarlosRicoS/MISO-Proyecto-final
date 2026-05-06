import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { LocaleService } from '../../../../core/services/locale.service';

@Component({
  selector: 'portal-hoteles-header-bar',
  templateUrl: './portal-hoteles-header-bar.component.html',
  styleUrls: ['./portal-hoteles-header-bar.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, TranslateModule],
})
export class PortalHotelesHeaderBarComponent {
  @Input() hotelName = 'Grand Plaza Hotel';
  @Input() location = 'Downtown Location';
  @Input() userName = 'John Smith';
  @Input() userRole = 'Hotel Manager';
  @Input() notificationCount = 3;

  private readonly localeService = inject(LocaleService);

  constructor(private platform: Platform) {}

  get avatarInitials(): string {
    return this.userName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  get isMobileNative(): boolean {
    return this.platform.is('capacitor');
  }

  get currentLang(): string {
    return this.localeService.currentLang;
  }

  toggleLanguage(): void {
    this.localeService.toggle();
  }
}
