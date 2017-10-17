import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ViewController,
  ToastController,
  Events
} from "ionic-angular";
import { CarritoProvider } from "../../providers/carrito/carrito";
import { Producto } from "../../providers/productos/models/producto";
import { ProductosProvider } from '../../providers/productos/productos';
import { Config } from "../../providers/config/config";

@IonicPage()
@Component({
  selector: 'page-carrito',
  templateUrl: 'carrito.html',
})
export class CarritoPage {

  private _prods: Producto[] = [];
  private confirmarOrdenPage: string = 'ConfirmarOrdenPage';

  constructor(
    public navCtrl: NavController,
    private viewCtrl: ViewController,
    private toastCtrl: ToastController,
    public navParams: NavParams,
    public evts: Events,
    private cartServ: CarritoProvider,
    private prodServ: ProductosProvider,
    private util: Config
  ) {

    this.evts.subscribe('cart:change', () => {
      this.reloadProds();
      console.log("se lanzo el evento change");
    });
  }

  ionViewDidEnter() {
    this.reloadProds();
  }

  private logCarItems(): void {
    console.log("Los items del carrito: ", this.cartServ.carItems);
  }

  private deleteItem(prod: Producto): void {
    let loading = this.util.showLoading();
    this.cartServ.deleteItem(prod)
      .then(res=>{
        loading.dismiss();
        this.showToast(`El producto ${res.id} se elimino de carrito correctamente`);
        console.log("prod eliminado carrito", res);
      })
      .catch(err=>{
        this.util.errorHandler(err.message, err, loading);
      })
  }

  private reloadProds(): void {
    let prodsId = this.cartServ.carIdItems;
    this.prodServ.fetchProdsByids(prodsId)
      .then((prods: Producto[])=>{
        this._prods = prods;
        console.log("prods carrito", this._prods);
      })
      .catch(console.log.bind(console))
  }

  private showToast(msg:string): void {
    this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'top',
      showCloseButton: true,
      closeButtonText: "cerrar"
    }).present();
  }

}
