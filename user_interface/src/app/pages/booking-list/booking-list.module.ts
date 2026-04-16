import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { BookingListPageRoutingModule } from './booking-list-routing.module';
import { BookingListPage } from './booking-list.page';
import { ThFilterSummaryComponent } from '../../shared/components/th-filter-summary/th-filter-summary.component';
import { ThHotelCardComponent } from '../../shared/components/th-hotel-card/th-hotel-card.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    ThFilterSummaryComponent,
    ThHotelCardComponent,
    BookingListPageRoutingModule,
  ],
  declarations: [BookingListPage],
})
export class BookingListPageModule {}
