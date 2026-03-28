import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SearchResultsPageRoutingModule } from './search-results-routing.module';
import { SearchResultsPage } from './search-results.page';
import { ThFilterSummaryComponent } from '../../shared/components/th-filter-summary/th-filter-summary.component';
import { ThHotelCardComponent } from '../../shared/components/th-hotel-card/th-hotel-card.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ThFilterSummaryComponent,
    ThHotelCardComponent,
    SearchResultsPageRoutingModule,
  ],
  declarations: [SearchResultsPage],
})
export class SearchResultsPageModule {}
