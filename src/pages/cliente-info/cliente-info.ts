import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController, AlertController } from 'ionic-angular';
import { Geolocation } from '@ionic-native/geolocation';

// Providers
import { Config as cg } from "../../providers/config/config";
import { ClientesProvider } from "../../providers/clientes/clientes";

//Models
import { Cliente } from '../../providers/clientes/models/cliente';

@IonicPage()
@Component({
  selector: 'page-cliente-info',
  templateUrl: 'cliente-info.html',
})
export class ClienteInfoPage {

  private cliente: Cliente;

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private geolocation: Geolocation,
    private clienteServ: ClientesProvider,
    private utils: cg
  ) {}

  ionViewDidEnter(){
    this.cliente = this.navParams.data;
  }

  private showCarteraModal(): void {
    this.modalCtrl.create("CarteraPage", this.cliente).present();
  }

  private setLocation(): void {

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
          handler: () => {

            let loading = this.utils.showLoading();
            // get current position
            this.geolocation.getCurrentPosition({
              maximumAge: 3000,
              timeout: 60000,
              enableHighAccuracy : true
            }).then(pos => {
              return this.clienteServ.updateLocation(this.cliente._id, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
            }).then(res => {
              return this.clienteServ.getClientesByIds([res.id])
            }).then(res => {
              loading.dismiss();
              console.log("Su madre en bragas: ", res)
              alert(`Las cordenadas son ${res[0].doc.ubicacion.latitud}, ${res[0].doc.ubicacion.longitud} - precision: ${res[0].doc.ubicacion.accuracy}`)
            }).catch(err => {
              loading.dismiss();
              console.log('su puta madre', err)
            });

          }
        }
      ]
    }).present();

  }

}
