import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ConfigService } from './core/services/config.service';
import { ThNavbarComponent } from './shared/components/th-navbar/th-navbar.component';
import { SharedCommonModule } from './shared/common/common.module';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, HttpClientModule, IonicModule.forRoot(), AppRoutingModule, ThNavbarComponent, SharedCommonModule],
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
