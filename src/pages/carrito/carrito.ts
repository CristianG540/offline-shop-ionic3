import { Component, ViewChild } from '@angular/core'
import {
  IonicPage,
  NavParams,
  ToastController,
  Events,
  Content,
  AlertController
} from 'ionic-angular'
import { CarritoProvider } from '../../providers/carrito/carrito'
import { Producto } from '../../providers/productos/models/producto'
import { ProductosProvider } from '../../providers/productos/productos'
import { Config } from '../../providers/config/config'

@IonicPage()
@Component({
  selector: 'page-carrito',
  templateUrl: 'carrito.html'
})
export class CarritoPage {
  @ViewChild('content') content: Content
  private _prods: Producto[] = []
  private confirmarOrdenPage: string = 'ConfirmarOrdenPage'
  private productoPage: string = 'ProductoPage'

  constructor (
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private navParams: NavParams,
    private evts: Events,
    private cartServ: CarritoProvider,
    private prodServ: ProductosProvider,
    private util: Config
  ) {

    this.evts.subscribe('cart:change', () => {
      this.reloadProds()
      console.log('se lanzo el evento change')
    })
  }

  ionViewDidEnter () {

    /**
     * Esta vuelta corrige un error donde el contenido de la
     * app se esconde bajo el header, mas info sobre esta mierda aqui
     * https://github.com/ionic-team/ionic/issues/13028 y aqui
     * https://github.com/ionic-team/ionic/issues/13183
     */
    this.content.resize()
    this.reloadProds()
  }

  private deleteItem (prod: Producto): void {
    let loading = this.util.showLoading()
    this.cartServ.deleteItem(prod)
      .then(res => {
        loading.dismiss()
        this.showToast(`El producto ${res.id} se elimino de carrito correctamente`)
        console.log('prod eliminado carrito', res)
      })
      .catch(err => {
        this.util.errorHandler(err.message, err, loading)
      })
  }

  private reloadProds (): void {
    let prodsId = this.cartServ.carIdItems
    this.prodServ.fetchProdsByids(prodsId)
      .then((prods: Producto[]) => {
        this._prods = prods.filter(Boolean)
        console.log('prods carrito', this._prods)
      })
      .catch(console.log.bind(console))
  }

  private showToast (msg: string): void {
    this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'top',
      showCloseButton: true,
      closeButtonText: 'cerrar'
    }).present()
  }

  private deleteDb (): void {

    this.alertCtrl.create({
      title: 'Esta seguro de borrar todo el carrito ?',
      enableBackdropDismiss: false,
      buttons: [
        {
          text: 'No',
          role: 'cancel'
        },
        {
          text: 'Si',
          handler: () => {
            this.cartServ.destroyDB(true)
          }
        }
      ]
    }).present()

  }

  private trackByProds (index: number, prod: Producto): string {
    return prod._id
  }

}
