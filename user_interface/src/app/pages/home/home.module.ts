import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { ThDatetimeModalComponent } from '../../shared/components/th-datetime-modal/th-datetime-modal.component';
import { ThFilterComponent } from '../../shared/components/th-filter/th-filter.component';
import { ThHotelCardComponent } from '../../shared/components/th-hotel-card/th-hotel-card.component';
import { SharedCommonModule } from '../../shared/common/common.module';

import { HomePageRoutingModule } from './home-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedCommonModule,
    ThDatetimeModalComponent,
    ThFilterComponent,
    ThHotelCardComponent,
    HomePageRoutingModule
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
