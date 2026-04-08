import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  showNavbar = true;
  isMobileLayout = false;

  private readonly mobileBreakpoint = 720;
  private routerEventsSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.updateNavbarVisibility();
    this.updateLayout();
    this.routerEventsSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateNavbarVisibility();
        this.updateLayout();
      });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  get isPropertyDetailRoute(): boolean {
    return this.router.url.startsWith('/propertydetail');
  }

  private handleResize = (): void => {
    this.updateLayout();
  };

  private updateLayout(): void {
    if (typeof window === 'undefined') {
      this.isMobileLayout = false;
      return;
    }

    if (typeof window.matchMedia === 'function') {
      this.isMobileLayout = window.matchMedia(
        `(max-width: ${this.mobileBreakpoint}px)`
      ).matches;
      return;
    }

    this.isMobileLayout = window.innerWidth <= this.mobileBreakpoint;
  }

  private updateNavbarVisibility(): void {
    const activeRoute = this.getDeepestChild(this.route);
    const hideNavbar = Boolean(activeRoute.snapshot.data?.['hideNavbar']);
    this.showNavbar = !hideNavbar;
  }

  private getDeepestChild(route: ActivatedRoute): ActivatedRoute {
    let currentRoute = route;
    while (currentRoute.firstChild) {
      currentRoute = currentRoute.firstChild;
    }
    return currentRoute;
  }
}
