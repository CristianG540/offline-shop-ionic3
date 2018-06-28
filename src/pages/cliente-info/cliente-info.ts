import { Component } from '@angular/core'
import { IonicPage, NavController, NavParams, ModalController, AlertController } from 'ionic-angular'

// librerias terceros
import _ from 'lodash'
import Raven from 'raven-js'

// Providers
import { Config as cg } from '../../providers/config/config'
import { ClientesProvider } from '../../providers/clientes/clientes'
import { GeolocationProvider } from '../../providers/geolocation/geolocation'

// Models
import { Cliente } from '../../providers/clientes/models/cliente'

@IonicPage()
@Component({
  selector: 'page-cliente-info',
  templateUrl: 'cliente-info.html'
})
export class ClienteInfoPage {

  private cliente: Cliente
  private zoom: number = 16

  constructor (
    private navCtrl: NavController,
    private navParams: NavParams,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private geolocation: GeolocationProvider,
    private clienteServ: ClientesProvider,
    private utils: cg
  ) {}

  ionViewDidEnter () {
    this.cliente = this.navParams.data
  }

  private showCarteraModal (): void {
    this.modalCtrl.create('CarteraPage', this.cliente).present()
  }

  private askForLocation (): void {

    this.alertCtrl.create({
      title: 'Alerta',
      message: 'Esta seguro de que desea marcar la ubicacion de este cliente?',
      enableBackdropDismiss: false,
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Si',
          handler: () => { this.setLocation() }
        }
      ]
    }).present()

  }

  private setLocation (): void {
    let loading = this.utils.showLoading()
    // get current position
    this.geolocation.getCurrentPosition().then(pos => {
      return this.clienteServ.updateLocation(this.cliente._id, pos.latitude, pos.longitude, pos.accuracy)
    }).then(res => {
      return this.clienteServ.getClientesByIds([res.id])
    }).then(res => {
      loading.dismiss()
      console.log('Respueta getCurrentPosition: ', res)
      this.navCtrl.popToRoot()
    }).catch((err) => {
      loading.dismiss()
      console.error('error gps', err)
      if (_.has(err, 'code') && err.code === 4 || err.code === 1) {
        this.alertCtrl.create({
          title: 'Error.',
          message: 'Por favor habilite el uso del gps, para poder marcar la posicion del cliente',
          buttons: ['Ok']
        }).present()
      } else {
        Raven.captureException(new Error(`GPS- Error al marcar la posicion del cliente 😫: ${JSON.stringify(err)}`), {
          extra: err
        })
      }
    })
  }

}
