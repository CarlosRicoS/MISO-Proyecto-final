import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

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
  @Input() mode: ThNavbarMode = 'full';
  @Input() layout: ThNavbarLayout = 'auto';
  @Input() logoSrc = 'assets/logos/portal_web.svg';
  @Input() logoAlt = 'TravelHub';
  @Input() showCurrency = true;

  constructor(private router: Router) {}

  get isSearchResults(): boolean {
    return this.router.url.startsWith('/search-results');
  }

  get isPropertyDetail(): boolean {
    return this.router.url.startsWith('/propertydetail');
  }
}
