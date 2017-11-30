import { Component } from '@angular/core';
import {
  NavController,
  Loading,
  LoadingController,
  AlertController,
  IonicPage,
  ToastController,
  Platform,
  MenuController
} from "ionic-angular";
import { Storage } from '@ionic/storage';

/* Libs Terceros */
import Raven from "raven-js";
import _ from 'lodash';

/* Models */
import { Producto } from '../../providers/productos/models/producto';

/*Providers */
import { ProductosProvider } from '../../providers/productos/productos';
import { CarritoProvider } from "../../providers/carrito/carrito";
import { Config as Cg} from '../../providers/config/config';
import { ClientesProvider } from '../../providers/clientes/clientes';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  private loading: Loading;
  private pushPage: string = 'ProductoPage';

  constructor(
    private platform: Platform,
    public navCtrl: NavController,
    private menuCtrl: MenuController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private prodsService: ProductosProvider,
    private cartService: CarritoProvider,
    private clienteServ: ClientesProvider,
    private util: Cg,
    private storage: Storage
  ) {
    this.menuCtrl.enable(true);
  }

  ionViewDidLoad(){

    this.prodsService.initDB()
    .then( info => {
      console.warn('Prods- First Replication complete');
    }).catch( err => {
      console.error("Prods-totally unhandled error (shouldn't happen)", err);
      Raven.captureException( new Error(`Prods- Error en la bd local no deberia pasar 😫: ${JSON.stringify(err)}`), {
        extra: err
      } );
      /**
       * si algun error se presenta recargo la aplicacion,
       * a menos que sea un error de conexion por falta de datos o de conexion
       * en ese caso no la recargo por q entra en un loop infinito cuando el celular
       * no tiene conexion
       */
      if(_.has(err, 'message') && err.message != "getCheckpoint rejected with " ){
        window.location.reload();
      }

    })

    let loading = this.util.showLoading();
    this.prodsService.resetProds();
    this.prodsService.recuperarPagSgte()
      .then(()=>{
        loading.dismiss();
      })
      .catch( err => this.util.errorHandler(err.message, err, loading) );

  }

  private doInfinite(infiniteScroll): void {
    this.prodsService.recuperarPagSgte()
      .then( () => infiniteScroll.complete() )
      .catch( err => this.util.errorHandler(err.message, err) );
  }

  private addProd(producto: Producto): void {

    this.util.promptAlertCant(d => {

      if( d.txtCantidad && producto.existencias >= d.txtCantidad ){
        let loading = this.util.showLoading();

        this.cartService.pushItem({
          _id: producto._id,
          cantidad: d.txtCantidad,
          totalPrice: producto.precio * d.txtCantidad
        }).then(res=>{
          loading.dismiss();
          this.showToast(`El producto ${res.id} se agrego correctamente`);
        }).catch(err=>{
          if(err=="duplicate"){
            loading.dismiss();
            this.showToast(`El producto ya esta en el carrito`);
          }else{
            this.util.errorHandler(err.message, err);
          }

        })
      }else{
        this.showToast(`Hay ${producto.existencias} productos, ingrese una cantidad valida.`);
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

  private trackByProds(index: number, prod: Producto): string {
    return prod._id;
  }

}
