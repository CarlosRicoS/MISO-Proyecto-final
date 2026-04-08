import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PropertydetailPage } from './propertydetail.page';

const routes: Routes = [
  {
    path: '',
    component: PropertydetailPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PropertydetailPageRoutingModule {}
