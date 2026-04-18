import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ConfigService } from '@travelhub/core/services/config.service';
import { PortalHotelesHeaderBarComponent } from '../../../../src/app/shared/components/portal-hoteles/header-bar/portal-hoteles-header-bar.component';
import { PortalHotelesSideNavComponent } from '../../../../src/app/shared/components/portal-hoteles/side-nav/portal-hoteles-side-nav.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, IonicModule.forRoot(), AppRoutingModule, PortalHotelesHeaderBarComponent, PortalHotelesSideNavComponent],
  providers: [
    ConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: (config: ConfigService) => () => config.load(),
      deps: [ConfigService],
      multi: true,
    },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
