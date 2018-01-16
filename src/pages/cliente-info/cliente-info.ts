import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ModalController } from 'ionic-angular';

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
    private modalCtrl: ModalController
  ) {}

  ionViewDidEnter(){
    this.cliente = this.navParams.data;
  }

  private showCarteraModal(): void {
    this.modalCtrl.create("CarteraPage", this.cliente).present();
  }

  private setLocation(): void {

  }

}
