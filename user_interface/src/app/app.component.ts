import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  showNavbar = true;
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.setPlatformClass();
    this.updateNavbarVisibility();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateNavbarVisibility());
  }

  private setPlatformClass(): void {
    const isNativePlatform = Capacitor.isNativePlatform();
    const bodyClassList = this.document.body.classList;

    bodyClassList.remove('app-platform-native', 'app-platform-web');
    bodyClassList.add(isNativePlatform ? 'app-platform-native' : 'app-platform-web');
  }

  private updateNavbarVisibility(): void {
    let route = this.activatedRoute;

    while (route.firstChild) {
      route = route.firstChild;
    }

    this.showNavbar = route.snapshot.data['hideNavbar'] !== true;
  }
}
