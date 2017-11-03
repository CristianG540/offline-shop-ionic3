import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Loading, AlertController, LoadingController } from 'ionic-angular';

// Providers
import { ProductosProvider } from '../../providers/productos/productos';
import { Producto } from '../../providers/productos/models/producto';
import { Config } from '../../providers/config/config';

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
    private prodsService: ProductosProvider,
    private util: Config
  ) {

  }

  ionViewDidLoad(){
     /**
     * Lo siguiente lo hago para resetear las variables que almacenan los datos
     * al mostrar los productos por categoria, si no las reseteo los productos solo
     * se apiñarian uno tras otro y continuarian desde el ultimo producto paginado
     */
    this.prodsService.resetProdsByCat();

    this.showLoading();
    this.prodsService.fetchNextPagByCategoria(this.navParams.get('nombre'))
      .then( () => this.loading.dismiss() )
      .catch( err => this.util.errorHandler(err.message, err) );
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
      .catch( err => this.util.errorHandler(err.message, err) );
  }

  private showLoading(): void {
    this.loading = this.loadingCtrl.create({
      content: 'Espere por favor...'
    });
    this.loading.present();
  }

  private trackByProds(index: number, producto: Producto): string {
    return producto._id;
  }

}
