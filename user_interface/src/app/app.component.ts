import { DOCUMENT } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
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
  readonly isNativePlatform = Capacitor.isNativePlatform();
  isMobileLayout = false;
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.updateLayoutMode();
    this.setPlatformClass();
    this.updateNavbarVisibility();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateNavbarVisibility());
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateLayoutMode();
  }

  private updateLayoutMode(): void {
    const isMobileViewport = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;
    this.isMobileLayout = this.isNativePlatform || isMobileViewport;
  }

  private setPlatformClass(): void {
    const bodyClassList = this.document.body.classList;

    bodyClassList.remove('app-platform-native', 'app-platform-web');
    bodyClassList.add(this.isNativePlatform ? 'app-platform-native' : 'app-platform-web');
  }

  private updateNavbarVisibility(): void {
    const hideByRouteData = this.routeTreeHasHideNavbar(this.activatedRoute.root);
    const hideByUrl = this.router.url.startsWith('/login');
    this.showNavbar = !(hideByRouteData || hideByUrl);
  }

  private routeTreeHasHideNavbar(route: ActivatedRoute): boolean {
    if (route.snapshot.data['hideNavbar'] === true) {
      return true;
    }

    return route.firstChild ? this.routeTreeHasHideNavbar(route.firstChild) : false;
  }
}
