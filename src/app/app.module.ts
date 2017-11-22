import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { IonicStorageModule } from '@ionic/storage';
import { Network } from '@ionic-native/network';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

//Pagaes without lazy loading
import { HomePage } from '../pages/home/home';
import { LoginPage } from '../pages/login/login';

import { MyApp } from './app.component';
import { CarritoProvider } from '../providers/carrito/carrito';
import { ProductosProvider } from '../providers/productos/productos';
import { UsuarioProvider } from '../providers/usuario/usuario';
import { Config } from '../providers/config/config';
import { ClientesProvider } from '../providers/clientes/clientes';
import { OrdenProvider } from '../providers/orden/orden';
import { AuthProvider } from '../providers/auth/auth';
import { DbProvider } from '../providers/db/db';
import { SentryErrorHandler } from '../providers/error-handler/sentry-errorhandler';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    LoginPage
  ],
  imports: [
    BrowserModule,
    HttpModule,
    BrowserAnimationsModule,
    IonicModule.forRoot(MyApp),
    IonicStorageModule.forRoot({
      name: '_ionicstorage',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    LoginPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Network,
    {provide: ErrorHandler, useClass: SentryErrorHandler},
    CarritoProvider,
    ProductosProvider,
    UsuarioProvider,
    Config,
    ClientesProvider,
    OrdenProvider,
    AuthProvider,
    DbProvider
  ]
})
export class AppModule {}
