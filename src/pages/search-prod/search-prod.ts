import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';
import _ from "lodash";

//Providers
import { ProductosProvider } from "../../providers/productos/productos";
import { CarritoProvider } from '../../providers/carrito/carrito';
import { Config as cg } from "../../providers/config/config";
//Models
import { Producto } from "../../providers/productos/models/producto";

@IonicPage()
@Component({
  selector: 'page-search-prod',
  templateUrl: 'search-prod.html',
})
export class SearchProdPage {

  private autocompleteItems = [];
  private productoPage = 'ProductoPage';

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private navParams: NavParams,
    private prodsService: ProductosProvider,
    private cartService: CarritoProvider,
    private util: cg
  ) {
  }

  updateSearch(ev: any) {
    let loading = this.util.showLoading();
    // set val to the value of the searchbar
    let val = ev.target.value;
    if (val == "") {
      loading.dismiss();
      this.autocompleteItems = [];
      return;
    }
    this.prodsService.searchAutocomplete(val)
      .then( (prods: Producto[]) => {
        loading.dismiss();
        console.log("Resultados busqueda prods",prods)
        this.autocompleteItems = prods;
      }).catch( err => this.util.errorHandler(err.message, err, loading) )

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
          this.util.showToast(`El producto ${res.id} se agrego correctamente`);
        }).catch(err=>{
          if(err=="duplicate"){
            loading.dismiss();
            this.util.showToast(`El producto ya esta en el carrito`);
          }else{
            this.util.errorHandler(err.message, err, loading);
          }

        })
      }else{
        this.util.showToast(`Hay ${producto.existencias} productos, ingrese una cantidad valida.`);
        return false;
      }

    });

  }

}
