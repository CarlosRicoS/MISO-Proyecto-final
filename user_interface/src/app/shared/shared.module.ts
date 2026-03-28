import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ThButtonComponent } from './components/th-button/th-button.component';
import { ThInputComponent } from './components/th-input/th-input.component';
import { ThBadgeComponent } from './components/th-badge/th-badge.component';
import { ThNavbarComponent } from './components/th-navbar/th-navbar.component';
import { ThHotelCardComponent } from './components/th-hotel-card/th-hotel-card.component';
import { ThDatetimeModalComponent } from './components/th-datetime-modal/th-datetime-modal.component';
import { ThFilterComponent } from './components/th-filter/th-filter.component';
import { PlatformTextDirective } from './directives/platform-text.directive';

@NgModule({
  declarations: [ThButtonComponent, ThInputComponent, ThBadgeComponent, ThNavbarComponent, ThHotelCardComponent, ThDatetimeModalComponent, ThFilterComponent],
  imports: [CommonModule, FormsModule, IonicModule, PlatformTextDirective],
  exports: [ThButtonComponent, ThInputComponent, ThBadgeComponent, ThNavbarComponent, ThHotelCardComponent, ThDatetimeModalComponent, ThFilterComponent, PlatformTextDirective]
})
export class SharedModule {}
