import { Component, ViewChild } from "@angular/core";
import {
  Platform,
  AlertController,
  NavController,
  MenuController
} from "ionic-angular";
import { StatusBar } from "@ionic-native/status-bar";
import { SplashScreen } from "@ionic-native/splash-screen";
import { Network } from '@ionic-native/network';
import { Keyboard } from '@ionic-native/keyboard';
import { ImageLoaderConfig } from 'ionic-image-loader';
import _ from "lodash";
import Raven from "raven-js";

//Providers
import { Config } from "../providers/config/config";
import { ClientesProvider } from "../providers/clientes/clientes";
import { AuthProvider } from "../providers/auth/auth";
import { DbProvider } from '../providers/db/db';
import { OrdenProvider } from "../providers/orden/orden";
import { CarritoProvider } from "../providers/carrito/carrito";
import { error } from "util";

@Component({
  templateUrl: "app.html",
  providers: [Keyboard]
})
export class MyApp {
  rootPage: any = "LoginPage";
  @ViewChild('content') content: NavController;

  // guardo el estado del boton para verficar las ordenes
  // si alguien lo clickea este deshabilita hasta que las ordenes
  // se envien y sap responda, esto para evitar que envien las ordenes
  // muchas veces
  private btnVerifOrdState: boolean = false;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    splashScreen: SplashScreen,
    private network: Network,
    private keyboard: Keyboard,
    private alertCtrl: AlertController,
    private menuCrl: MenuController,
    private clienteServ: ClientesProvider,
    private authService: AuthProvider,
    private dbServ: DbProvider,
    private ordenServ: OrdenProvider,
    private cartServ: CarritoProvider,
    private util: Config,
    private imageLoaderConfig: ImageLoaderConfig
  ) {
    /* start config ionic image loader  https://github.com/zyra/ionic-image-loader */
    //this.imageLoaderConfig.setImageReturnType('base64'); // descomentar para q funcione con el live reload
    this.imageLoaderConfig.setFallbackUrl('assets/img/logo/logo_igb_small.png');
    this.imageLoaderConfig.enableFallbackAsPlaceholder(true);
    /**  fin config image loader */

    if( this.authService.isLogged ){

      /* Valido que haya conexion a internet */
      if(this.util.onlineOffline){
        //Valido que el token de la sesion siga siendo valido
        this.authService.validateSession()
        .then(res=>{
          console.log("la sesion sigue siendo valida", res);
        })
        .catch(err => {
          if(err == "Unauthorized"){
            this.logout();
          }
        });
      }

      // Inicio la base de datos del usuario, en esta bd es en las que guardan
      // las ordenes, la crea automaticamente superlogin y me envia la url
      console.log("los datos de la bd son", this.authService.dbUrl);
      this.dbServ.init( this.authService.dbUrl );
      this.rootPage = 'TabsPage';

      /**
       * Aqui le digo a sentry cual es el usuario q esta usando la app
       */
      Raven.setUserContext({
        username: this.authService.userId,
        email: this.authService.userEmail,
        id: this.authService.asesorId
      });

    }else{
      this.rootPage = 'LoginPage';
    }

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();

      // watch network for a disconnect
      let disconnectSubscription = this.network.onDisconnect().subscribe(() => {
        this.util.onlineOffline = false;
      });

      // watch network for a connection
      let connectSubscription = this.network.onConnect().subscribe(() => {
        this.util.onlineOffline = true;
      });

      keyboard.hideKeyboardAccessoryBar(false);

    });
  }

  private indexDb(): void {
    let loading = this.util.showLoading();
    this.clienteServ
      .indexDbClientes()
      .then(res => {
        loading.dismiss();
        this.util.showToast("Indice construido");
      })
      .catch(err => {
        this.util.errorHandler(err.message, err, loading);
      });
  }

  private logout(): void {
    let loading = this.util.showLoading();

    this.authService.isOnline()
      .then(res=>{
        if( _.has(res, 'status') && res.status == 'ok' ){
          return this.authService.logout()
        }else{
          throw "El api de autenticacion no esta disponible";
        }
      })
      .then( () => {
        return this.authService.removeTokenJosefa()
      })
      .then( () => {
        this.ordenServ.destroyDB();
        this.cartServ.destroyDB();
        this.cargarPagina('LoginPage');
        Raven.setUserContext();
        loading.dismiss();
      })
      .catch(err=>{
        loading.dismiss();
        console.error('error en el logout',err);
        Raven.captureException( new Error(`error en el logout: ${JSON.stringify(err)}`), {
          extra: err
        } );
        //if(err.ok == false || err.message == "Network Error"){
          this.alertCtrl.create({
            title: "Ocurrio un error.",
            message: "Debe estar conectado a la red para desconectarse.",
            buttons: ['Ok']
          }).present();
        //}
      })
  }

  private verificarOrdenes(): void {

    if(this.ordenServ.ordenesPendientes.length > 0){
      this.btnVerifOrdState = true;
      this.ordenServ.sendOrdersSap()
      .then(responses=>{
        let failOrders = _.filter(responses.apiRes, (res: any) => {
          return res.responseApi.code == 400;
        })
        if(failOrders.length > 0){
          this.alertCtrl.create({
            title: "Advertencia.",
            message: failOrders.length+' ordenes no se han podido subir a sap, verifique su conexion a internet y vuelva a intentarlo',
            buttons: ['Ok']
          }).present();
        }else{
          this.alertCtrl.create({
            title: "Info.",
            message: "Las ordenes se subieron correctamente a sap.",
            buttons: ['Ok']
          }).present();
        }
        console.warn("RESPUESTA DE LAS ORDENES ", responses);
        this.btnVerifOrdState = false;
      })
      .catch(err=>{
        this.btnVerifOrdState = false;
        this.util.errorHandler(err.message, err);
      })
    }

  }

  private cargarPagina(pagina: any): void {
    this.content.setRoot(pagina);
    this.menuCrl.close();
  }
}
