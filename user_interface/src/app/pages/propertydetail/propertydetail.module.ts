import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PropertydetailPageRoutingModule } from './propertydetail-routing.module';
import { PropertydetailPage } from './propertydetail.page';
import { ThAmenitiesSummaryComponent } from '../../shared/components/th-amenities-summary/th-amenities-summary.component';
import { ThBadgeComponent } from '../../shared/components/th-badge/th-badge.component';
import { ThDetailSummaryComponent } from '../../shared/components/th-detail-summary/th-detail-summary.component';
import { ThPaymentSummaryComponent } from '../../shared/components/th-payment-summary/th-payment-summary.component';
import { ThDetailsMosaicComponent } from '../../shared/components/th-details-mosaic/th-details-mosaic.component';
import { ThPopupComponent } from '../../shared/components/th-popup/th-popup.component';
import { ThPropertyDescriptionSummaryComponent } from '../../shared/components/th-property-description-summary/th-property-description-summary.component';
import { ThPropertyReviewSummaryComponent } from '../../shared/components/th-property-review-summary/th-property-review-summary.component';

@NgModule({
  declarations: [PropertydetailPage],
  imports: [
    CommonModule,
    IonicModule,
    ThAmenitiesSummaryComponent,
    ThBadgeComponent,
    ThDetailSummaryComponent,
    ThPaymentSummaryComponent,
    ThDetailsMosaicComponent,
    ThPopupComponent,
    ThPropertyDescriptionSummaryComponent,
    ThPropertyReviewSummaryComponent,
    PropertydetailPageRoutingModule,
  ],
})
export class PropertydetailPageModule {}
