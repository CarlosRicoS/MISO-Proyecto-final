import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule, PopoverController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { ThNotificationsListComponent } from '../th-notifications-list/th-notifications-list.component';

export type ThNavbarMode = 'full' | 'auth';
export type ThNavbarLayout = 'auto' | 'desktop' | 'mobile';

@Component({
  selector: 'th-navbar',
  templateUrl: './th-navbar.component.html',
  styleUrls: ['./th-navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule]
})
export class ThNavbarComponent {
  @Input() mode: ThNavbarMode = 'auth';
  @Input() layout: ThNavbarLayout = 'auto';
  @Input() logoSrc = 'assets/logos/portal_web.svg';
  @Input() logoAlt = 'TravelHub';
  @Input() showCurrency = true;

  constructor(private router: Router, private popoverController: PopoverController, private platform: Platform) {}

  get isSearchResults(): boolean {
    return this.router.url.startsWith('/search-results');
  }

  get isBookingList(): boolean {
    return this.router.url.startsWith('/booking-list');
  }

  get isSearchLikeRoute(): boolean {
    return this.isSearchResults || this.isBookingList || this.isNotificationsRoute;
  }

  get isNotificationsRoute(): boolean {
    return this.router.url.startsWith('/notifications');
  }

  get mobileTitle(): string {
    if (this.isNotificationsRoute) {
      return 'Notifications';
    }

    if (this.isBookingList) {
      return 'My Reservations';
    }

    return 'Search Results';
  }

  async onNotificationsClick(event: Event): Promise<void> {
    event.stopPropagation();

    if (this.layout !== 'desktop') {
      await this.router.navigate(['/notifications']);
      return;
    }

    const popover = await this.popoverController.create({
      component: ThNotificationsListComponent,
      event,
      translucent: true,
      cssClass: 'th-notifications-popover',
    });

    await popover.present();
  }

  get isPropertyDetail(): boolean {
    return this.router.url.startsWith('/propertydetail');
  }

  get isBookingDetail(): boolean {
    return this.router.url.startsWith('/booking-detail');
  }

  get isMobileNative(): boolean {
    return this.platform.is('capacitor');
  }

  get isDetailRoute(): boolean {
    return this.isPropertyDetail || this.isBookingDetail;
  }

  get detailBackLink(): string {
    if (this.isBookingDetail) {
      return '/booking-list';
    }

    return '/search-results';
  }

  get showDetailFavoriteAction(): boolean {
    return !this.isBookingDetail;
  }
}
