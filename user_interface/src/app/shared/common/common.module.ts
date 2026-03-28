import { NgModule } from '@angular/core';
import { PlatformTextDirective } from '../directives/platform-text.directive';

@NgModule({
  imports: [PlatformTextDirective],
  exports: [PlatformTextDirective],
})
export class SharedCommonModule {}
