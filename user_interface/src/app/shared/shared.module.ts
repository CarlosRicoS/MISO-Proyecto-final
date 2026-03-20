import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ThButtonComponent } from './components/th-button/th-button.component';
import { ThInputComponent } from './components/th-input/th-input.component';
import { ThBadgeComponent } from './components/th-badge/th-badge.component';

@NgModule({
  declarations: [ThButtonComponent, ThInputComponent, ThBadgeComponent],
  imports: [CommonModule, IonicModule],
  exports: [ThButtonComponent, ThInputComponent, ThBadgeComponent]
})
export class SharedModule {}
