import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PlatformTextDirective } from '../directives/platform-text.directive';

@NgModule({
  imports: [PlatformTextDirective, TranslateModule],
  exports: [PlatformTextDirective, TranslateModule],
})
export class SharedCommonModule {}
