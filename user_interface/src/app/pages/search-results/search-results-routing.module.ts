import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SearchResultsPage } from './search-results.page';

const routes: Routes = [
  {
    path: '',
    component: SearchResultsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SearchResultsPageRoutingModule {}
