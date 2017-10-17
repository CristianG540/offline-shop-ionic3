import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import _ from "lodash";

//Providers
import { ProductosProvider } from "../../providers/productos/productos";
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
    private navParams: NavParams,
    private prodsService: ProductosProvider,
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

}
