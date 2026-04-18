import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { portalHotelesAuthGuard } from '@travelhub/core/guards/portal-hoteles-auth.guard';

const routes: Routes = [
  {
    path: 'login',
    data: { hideNavbar: true },
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.PortalHotelesLoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [portalHotelesAuthGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.PortalHotelesDashboardPage),
  },
  {
    path: 'dashboard/:reservationId',
    canActivate: [portalHotelesAuthGuard],
    loadComponent: () =>
      import('./pages/dashboard-reservation/dashboard-reservation.page').then(
        (m) => m.PortalHotelesDashboardReservationPage,
      ),
  },
  {
    path: 'home',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
