import { Component, Input } from '@angular/core';

export type ThNavbarMode = 'full' | 'auth';
export type ThNavbarLayout = 'auto' | 'desktop' | 'mobile';

@Component({
  selector: 'th-navbar',
  templateUrl: './th-navbar.component.html',
  styleUrls: ['./th-navbar.component.scss'],
  standalone: false
})
export class ThNavbarComponent {
  @Input() mode: ThNavbarMode = 'full';
  @Input() layout: ThNavbarLayout = 'auto';
  @Input() logoSrc = 'assets/logos/portal_web.svg';
  @Input() logoAlt = 'TravelHub';
  @Input() showCurrency = true;
}
