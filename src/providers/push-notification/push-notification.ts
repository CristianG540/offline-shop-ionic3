import { Injectable } from '@angular/core'
import { OneSignal, OSNotificationOpenedResult } from '@ionic-native/onesignal'
import { Platform, AlertController } from 'ionic-angular'

// Providers
import { AuthProvider } from '../auth/auth'
import { OrdenProvider } from '../orden/orden'
import { CarritoProvider } from '../carrito/carrito'

// Pages
import { LoginPage } from '../../pages/login/login'

@Injectable()
export class PushNotificationProvider {

  constructor (
    private platform: Platform,
    private oneSignal: OneSignal,
    private alertCtrl: AlertController,
    private authService: AuthProvider,
    private ordenServ: OrdenProvider,
    private cartServ: CarritoProvider
  ) {
  }

  init (content): void {

    if (this.platform.is('cordova')) {
      this.oneSignal.startInit('814e5429-29eb-47e5-907b-6d91f905e5b9', '87020249419')

      this.oneSignal.inFocusDisplaying(this.oneSignal.OSInFocusDisplayOption.InAppAlert)

      this.oneSignal.handleNotificationReceived().subscribe(() => {
        // do something when notification is received
      })

      this.oneSignal.handleNotificationOpened().subscribe((data: OSNotificationOpenedResult) => {
        console.log('Datos de la notificacion: ', data)
        if (data.notification.payload.title === 'reset' && data.notification.payload.additionalData.user_id === this.authService.asesorId) {

          this.authService.logout().then(() => {
            content.setRoot(LoginPage)
            // Paro el timer que verifica las ordenes
            clearInterval(this.ordenServ.intervalValOrders)
            this.ordenServ.destroyDB()
            this.cartServ.destroyDB()
          })

        } else {
          this.alertCtrl.create({
            title: data.notification.payload.title,
            message: data.notification.payload.body,
            buttons: ['Ok']
          }).present()
        }
      })

      this.oneSignal.endInit()
    }

  }

}
