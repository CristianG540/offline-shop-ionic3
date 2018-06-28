import { Component } from '@angular/core'
import {
  NavController,
  Loading,
  ToastController,
  MenuController
} from 'ionic-angular'

/* Models */
import { Producto } from '../../providers/productos/models/producto'

/*Providers */
import { ProductosProvider } from '../../providers/productos/productos'
import { CarritoProvider } from '../../providers/carrito/carrito'
import { Config as Cg } from '../../providers/config/config'

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private loading: Loading
  private pushPage: string = 'ProductoPage'

  constructor (
    public navCtrl: NavController,
    private menuCtrl: MenuController,
    private toastCtrl: ToastController,
    private prodsService: ProductosProvider,
    private cartService: CarritoProvider,
    private util: Cg
  ) {
    this.menuCtrl.enable(true)
  }

  ionViewDidLoad () {

    this.prodsService.initDB()

    let loading = this.util.showLoading()
    this.prodsService.resetProds()
    this.prodsService.recuperarPagSgte()
      .then(() => {
        loading.dismiss()
      })
      .catch(err => this.util.errorHandler(err.message, err, loading))

  }

  private doInfinite (infiniteScroll): void {
    this.prodsService.recuperarPagSgte()
      .then(() => infiniteScroll.complete())
      .catch(err => this.util.errorHandler(err.message, err))
  }

  private addProd (producto: Producto): void {

    this.util.promptAlertCant(d => {

      if (d.txtCantidad && producto.existencias >= d.txtCantidad) {
        let loading = this.util.showLoading()

        this.cartService.pushItem({
          _id: producto._id,
          cantidad: d.txtCantidad,
          totalPrice: producto.precio * d.txtCantidad,
          titulo: producto.titulo
        }).then(res => {
          loading.dismiss()
          this.showToast(`El producto ${res.id} se agrego correctamente`)
        }).catch(err => {

          if (err === 'duplicate') {
            loading.dismiss()
            this.showToast(`El producto ya esta en el carrito`)
          } else if (err === 'no_timsum_llantas') {
            loading.dismiss()
            this.util.showToast(`No puede agregar llantas timsum a este pedido`)
          } else if (err === 'timsum_llantas') {
            loading.dismiss()
            this.util.showToast(`Solo puede agregar llantas timsum a este pedido`)
          } else {
            this.util.errorHandler(err.message, err, loading)
          }

        })
      } else {
        this.showToast(`Hay ${producto.existencias} productos, ingrese una cantidad valida.`)
        return false
      }

    })

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

  private trackByProds (index: number, prod: Producto): string {
    return prod._id
  }

}
