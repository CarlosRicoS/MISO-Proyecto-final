import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthSessionService } from '@travelhub/core/services/auth-session.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  showNavbar = false;
  private routerEventsSub?: Subscription;

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authSession: AuthSessionService,
  ) {}

  ngOnInit(): void {
    this.updateNavbarVisibility();
    this.routerEventsSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateNavbarVisibility());
  }

  ngOnDestroy(): void {
    this.routerEventsSub?.unsubscribe();
  }

  onLogout(): void {
    this.authSession.clearSession();
    void this.router.navigate(['/login']);
  }

  private updateNavbarVisibility(): void {
    const activeRoute = this.getDeepestChild(this.route);
    const routeChain = activeRoute.pathFromRoot ?? [activeRoute];
    const hideNavbar = routeChain.some((route) => Boolean(route.snapshot.data?.['hideNavbar']));
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
