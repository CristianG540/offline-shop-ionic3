import { Component, ViewChild } from '@angular/core'
import {
  Platform,
  AlertController,
  NavController,
  MenuController,
  Events
} from 'ionic-angular'
import { StatusBar } from '@ionic-native/status-bar'
import { SplashScreen } from '@ionic-native/splash-screen'
import { Network } from '@ionic-native/network'
import { BackgroundMode } from '@ionic-native/background-mode'
import _ from 'lodash'
import Raven from 'raven-js'

// Providers
import { Config } from '../providers/config/config'
import { ClientesProvider } from '../providers/clientes/clientes'
import { AuthProvider } from '../providers/auth/auth'
import { DbProvider } from '../providers/db/db'
import { OrdenProvider } from '../providers/orden/orden'
import { CarritoProvider } from '../providers/carrito/carrito'
import { ProductosProvider } from '../providers/productos/productos'
import { PushNotificationProvider } from '../providers/push-notification/push-notification'

// Pages
import { LoginPage } from '../pages/login/login'

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  private appVer: string = Config.APP_VER
  rootPage: any = LoginPage
  @ViewChild('content') content: NavController

  // guardo el estado del boton para verficar las ordenes
  // si alguien lo clickea este deshabilita hasta que las ordenes
  // se envien y sap responda, esto para evitar que envien las ordenes
  // muchas veces
  private btnVerifOrdState: boolean = false

  constructor (
    platform: Platform,
    statusBar: StatusBar,
    splashScreen: SplashScreen,
    private network: Network,
    private alertCtrl: AlertController,
    private menuCrl: MenuController,
    private clienteServ: ClientesProvider,
    private authService: AuthProvider,
    private dbServ: DbProvider,
    private ordenServ: OrdenProvider,
    private cartServ: CarritoProvider,
    private prodServ: ProductosProvider,
    private util: Config,
    private pushNotification: PushNotificationProvider,
    private backgroundMode: BackgroundMode,
    private evts: Events
  ) {

    if (this.authService.isLogged) {

      /* Valido que haya conexion a internet */
      if (this.util.onlineOffline) {
        // Valido que el token de la sesion siga siendo valido
        this.authService.validateSession()
        .then(res => {
          console.log('la sesion sigue siendo valida', res)
        })
        .catch(err => {
          if (err === 'Unauthorized') {
            this.logout()
          }
        })

        this.util.checkToken().then(res => {
          console.log('estado del api josefa', res)
        }).catch((e: Error) => {
          console.error('error en el api josefa', e)
          if (e.message === 'Unauthorized') {
            this.logout()
          }
        })
      }
      console.warn('El nit cliente es: ' + this.authService.nitCliente)

      // Inicio la base de datos del usuario, en esta bd es en las que guardan
      // las ordenes, la crea automaticamente superlogin y me envia la url
      console.log('los datos de la bd son', this.authService.dbUrl)
      this.dbServ.init(this.authService.dbUrl, this.authService.userId).then(info => {
        console.warn('DbAverno- First Replication complete')
      }).catch(err => {
        console.error("DbAverno-totally unhandled error (shouldn't happen)", err)
        Raven.captureException(new Error(`DbAverno- Error en la bd local no deberia pasar 😫: ${JSON.stringify(err)}`), {
          extra: err
        })
      })

      /**
       * Aqui le digo a sentry cual es el usuario q esta usando la app
       */
      Raven.setUserContext({
        username: this.authService.userId,
        email: this.authService.userEmail,
        id: this.authService.asesorId
      })

      this.ordenServ.setIntervalOrdersSap() // Creo un setinterval que verifica las ordenes cada X tiempo
      this.util.setTimerCheckJosefa() // Creo un setinterval que verifica el token de josefa

      this.rootPage = 'TabsPage'

    } else {
      this.rootPage = LoginPage
    }

    platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault()
      splashScreen.hide()

      // watch network for a disconnect
      let disconnectSubscription = this.network.onDisconnect().subscribe(() => {
        this.util.onlineOffline = false
      })

      // watch network for a connection
      let connectSubscription = this.network.onConnect().subscribe(() => {
        this.util.onlineOffline = true
      })

      this.pushNotification.init(this.content)

      this.backgroundMode.enable()
      // this.backgroundMode.overrideBackButton();

      this.evts.subscribe('timer:checkTokenJosefa', () => {
        this.logout()
      })

    })
  }

  private indexDb (): void {

    this.clienteServ
      .indexDbClientes()
      .then(res => {
        this.util.showToast('Indice construido')
      })
      .catch(err => {
        this.util.errorHandler(err.message, err)
      })
  }

  private logout (): void {

    this.authService.logout().then(() => {
      this.cargarPagina(LoginPage)
      clearInterval(this.ordenServ.intervalValOrders) // Paro el timer que verifica las ordenes
      clearInterval(this.util.timerCheckTokenJose) // Paro el timer que verifica el token de josefa no este vencido
      this.ordenServ.destroyDB()
      this.cartServ.destroyDB()
    })

  }

  private verificarOrdenes (): void {

    if (this.ordenServ.ordenesPendientes.length > 0) {
      this.btnVerifOrdState = true
      this.ordenServ.sendOrdersSap()
      .then(responses => {
        let failOrders = _.filter(responses.apiRes, (res: any) => {
          return res.responseApi.code >= 400
        })
        if (failOrders.length > 0) {
          this.alertCtrl.create({
            title: 'Advertencia.',
            message: failOrders.length + ' ordenes no se han podido subir a sap, verifique su conexion a internet y vuelva a intentarlo',
            buttons: ['Ok']
          }).present()
        } else {
          this.alertCtrl.create({
            title: 'Info.',
            message: 'Las ordenes se subieron correctamente a sap.',
            buttons: ['Ok']
          }).present()
        }
        console.warn('RESPUESTA DE LAS ORDENES ', responses)
        this.btnVerifOrdState = false
      })
      .catch(err => {
        this.btnVerifOrdState = false
        this.util.errorHandler(err.message, err)
      })
    }

  }

  private cargarPagina (pagina: any): void {
    this.content.setRoot(pagina)
    this.menuCrl.close()
  }

  private reloadApp (): void {
    window.location.reload()
  }

  /**
   * Se encarga de mostrar el eggster egg del kirby bailando :3
   *
   * @private
   * @param {any} e
   * @memberof MyApp
   */
  private pressToEgg (e) {
    this.util.countPush++
    console.log('Se presiono', this.util.countPush)
    if (this.util.countPush === 4) {
      this.util.eggsterFlag = !this.util.eggsterFlag
      this.util.countPush = 0
    }
  }

}
