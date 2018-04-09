import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ToastController
} from "ionic-angular";
import { Producto } from '../../providers/productos/models/producto';
import { CarritoProvider } from "../../providers/carrito/carrito";
import { Config } from "../../providers/config/config";
import { AuthProvider } from '../../providers/auth/auth';

@IonicPage()
@Component({
  selector: 'page-producto',
  templateUrl: 'producto.html',
})
export class ProductoPage {

  private producto: Producto;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private util: Config,
    private navParams: NavParams,
    private cartService: CarritoProvider,
    private authService: AuthProvider
  ) {
    this.producto = this.navParams.data;
  }

  private addProd(): void {


    this.util.promptAlertCant(d => {
      if( d.txtCantidad && this.producto.existencias >= d.txtCantidad ){

        let loading = this.util.showLoading();
        this.cartService.pushItem({
          _id: this.producto._id,
          cantidad: d.txtCantidad,
          totalPrice: this.producto.precio * d.txtCantidad,
          titulo: this.producto.titulo
        }).then(res=>{
          loading.dismiss();
          this.showToast(`El producto ${res.id} se agrego correctamente`);
          this.navCtrl.popToRoot();
        }).catch(err=>{

          if(err=="duplicate"){
            loading.dismiss();
            this.showToast(`El producto ya esta en el carrito`);
          }else if(err=="no_timsum_llantas"){
            loading.dismiss();
            this.util.showToast(`No puede agregar llantas timsum a este pedido`);
          }else if(err=="timsum_llantas"){
            loading.dismiss();
            this.util.showToast(`Solo puede agregar llantas timsum a este pedido`);
          }else{
            this.util.errorHandler(err.message, err, loading);
          }

        })

      }else{
        this.showToast(`Hay ${this.producto.existencias} productos, ingrese una cantidad valida.`);
        return false;
      }
    });

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
