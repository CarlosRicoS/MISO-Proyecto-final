import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthSessionService } from './core/services/auth-session.service';
import { ThNavbarMode } from './shared/components/th-navbar/th-navbar.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  showNavbar = true;
  isMobileLayout = false;
  navbarMode: ThNavbarMode = 'auth';

  private readonly mobileBreakpoint = 720;
  private routerEventsSub?: Subscription;
  private authStateSub?: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authSessionService: AuthSessionService
  ) {}

  ngOnInit(): void {
    this.updateNavbarVisibility();
    this.navbarMode = this.authSessionService.isLoggedIn ? 'full' : 'auth';
    this.authStateSub = this.authSessionService.state$.subscribe((state) => {
      this.navbarMode = state.loggedIn ? 'full' : 'auth';
    });
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
    this.authStateSub?.unsubscribe();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  get isPropertyDetailRoute(): boolean {
    return this.router.url.startsWith('/propertydetail');
  }

  get isSearchResultsRoute(): boolean {
    return this.router.url.startsWith('/search-results');
  }

  get showMobileTopBar(): boolean {
    return this.showNavbar || this.isSearchResultsRoute || this.isPropertyDetailRoute;
  }

  get hasTopBar(): boolean {
    return this.showNavbar || (this.isMobileLayout && this.showMobileTopBar);
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
    const routeChain = activeRoute.pathFromRoot ?? [activeRoute];
    const hideNavbar = routeChain.some((route) =>
      Boolean(route.snapshot.data?.['hideNavbar'])
    );
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
