import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'portal-hoteles-side-nav',
  templateUrl: './portal-hoteles-side-nav.component.html',
  styleUrls: ['./portal-hoteles-side-nav.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
})
export class PortalHotelesSideNavComponent {
  @Output() logoutClicked = new EventEmitter<void>();

  readonly menuItems = [
    { label: 'Dashboard', icon: 'grid-outline', route: '/dashboard', exact: false },
    { label: 'Pricing', icon: 'pricetag-outline', route: '/pricing', exact: true },
    { label: 'Reports', icon: 'document-text-outline', route: '/reports', exact: true },
  ];
}
