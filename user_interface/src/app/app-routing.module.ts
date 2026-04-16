import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { bookingListAuthGuard } from './core/guards/booking-list-auth.guard';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'search-results',
    loadChildren: () => import('./pages/search-results/search-results.module').then( m => m.SearchResultsPageModule)
  },
  {
    path: 'booking-list',
    canActivate: [bookingListAuthGuard],
    loadChildren: () => import('./pages/booking-list/booking-list.module').then( m => m.BookingListPageModule)
  },
  {
    path: 'propertydetail',
    loadChildren: () => import('./pages/propertydetail/propertydetail.module').then(m => m.PropertydetailPageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'login',
    data: { hideNavbar: true },
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'register',
    data: { hideNavbar: true },
    loadComponent: () => import('./pages/register/register.page').then( m => m.RegisterPage)
  },


];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
