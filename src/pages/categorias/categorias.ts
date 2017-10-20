import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Loading, AlertController, LoadingController } from 'ionic-angular';
import { ProductosProvider } from '../../providers/productos/productos';

@IonicPage()
@Component({
  selector: 'page-categorias',
  templateUrl: 'categorias.html',
})
export class CategoriasPage {

  private loading: Loading;
  private productosCategoriaPage: string = 'ProductosCategoriaPage';

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private navParams: NavParams,
    private prodsService: ProductosProvider
  ) {}

  ionViewDidLoad(){
    this.prodsService.fetchCategorias()
      .catch( err => this.errorHandler(err.message, err) );
  }

  private errorHandler(err: string, errObj?: any): void {
    if(this.loading){ this.loading.dismiss(); }
    this.alertCtrl.create({
      title: "Ocurrio un error.",
      message: err,
      buttons: ['Ok']
    }).present();
    if(err){ console.error(err) }
  }

}
