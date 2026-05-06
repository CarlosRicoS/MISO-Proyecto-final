import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsCO from '@angular/common/locales/es-CO';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { ConfigService } from './core/services/config.service';
import { LocaleService } from './core/services/locale.service';
import { ThNavbarComponent } from './shared/components/th-navbar/th-navbar.component';
import { SharedCommonModule } from './shared/common/common.module';

// Register Colombian Spanish locale data so CurrencyPipe / Intl.NumberFormat
// with the 'es-CO' locale string does not throw at runtime.
registerLocaleData(localeEsCO, 'es-CO');

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    ThNavbarComponent,
    SharedCommonModule,
    TranslateModule.forRoot({
      defaultLanguage: 'es',
      fallbackLang: 'es',
    }),
  ],
  providers: [
    ConfigService,
    ...provideTranslateHttpLoader({ prefix: './assets/i18n/', suffix: '.json' }),
    {
      provide: APP_INITIALIZER,
      useFactory: (config: ConfigService) => () => config.load(),
      deps: [ConfigService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (locale: LocaleService) => () => locale.init(),
      deps: [LocaleService],
      multi: true,
    },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
