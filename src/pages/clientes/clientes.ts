import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-clientes',
  templateUrl: 'clientes.html',
})
export class ClientesPage {

  private carteraPage = 'CarteraPage';
  private searchClientPage = 'AutocompletePage';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams
  ) {}

}
