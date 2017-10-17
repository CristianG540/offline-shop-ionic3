import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Loading, AlertController, LoadingController } from 'ionic-angular';

import { ProductosProvider } from '../../providers/productos/productos';

@IonicPage()
@Component({
  selector: 'page-productos-categoria',
  templateUrl: 'productos-categoria.html',
})
export class ProductosCategoriaPage {

  private loading: Loading;
  private productoPage: string = 'ProductoPage';

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private navParams: NavParams,
    private prodsService: ProductosProvider
  ) {
    /**
     * Lo siguiente lo hago para resetear las variables que almacenan los datos
     * al mostrar los productos por categoria, si no las reseteo los productos solo
     * se apiñarian uno tras otro y continuarian desde el ultimo producto paginado
     */
    this.prodsService.resetProdsByCat();

    this.showLoading();
    this.prodsService.fetchNextPagByCategoria(this.navParams.get('nombre'))
      .then( () => this.loading.dismiss() )
      .catch( err => this.errorHandler(err.message, err) );
  }

  private doInfinite(infiniteScroll): void {
    this.prodsService.fetchNextPagByCategoria(this.navParams.get('nombre'))
      .then( (res) => {
        if (res && res.rows.length > 0) {
          infiniteScroll.complete()
        }else{
          infiniteScroll.enable(false);
        }
      })
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

  private showLoading(): void {
    this.loading = this.loadingCtrl.create({
      content: 'Espere por favor...'
    });
    this.loading.present();
  }

}
