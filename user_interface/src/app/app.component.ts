import { Component } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  showNavbar = true;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.updateNavbarVisibility();

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateNavbarVisibility());
  }

  private updateNavbarVisibility(): void {
    let route = this.activatedRoute;

    while (route.firstChild) {
      route = route.firstChild;
    }

    this.showNavbar = route.snapshot.data['hideNavbar'] !== true;
  }
}
