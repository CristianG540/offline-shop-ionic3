import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import _ from "lodash";

//Providers
import { ProductosProvider } from "../../providers/productos/productos";
import { Config as cg} from "../../providers/config/config";
//Models
import { Producto } from "../../providers/productos/models/producto";
import { CarItem } from "../../providers/carrito/models/carItem";

@IonicPage()
@Component({
  selector: 'page-ordenes-detalle',
  templateUrl: 'ordenes-detalle.html',
})
export class OrdenesDetallePage {

  private _prods: any = [];
  private _itemsOrder: CarItem[] = [];
  private _total: number = 0;
  private _cliente: string;
  private _observacion: string;
  private _codSap: string;
  private _error: string;

  constructor(
    private navParams: NavParams,
    private prodServ: ProductosProvider,
    private util: cg
  ) {
  }

  ionViewDidLoad() {
    let loading = this.util.showLoading();
    console.log('ionViewDidLoad OrdenesDetallePage', this.navParams.data);
    this._itemsOrder = this.navParams.data.items;
    this._total = this.navParams.data.total;
    this._cliente = (this.navParams.data.nitCliente) ? this.navParams.data.nitCliente : this.navParams.data.newClient.codCliente;
    this._observacion = this.navParams.data.observaciones;
    this._codSap = this.navParams.data.docEntry;
    this._error = this.navParams.data.error;
    let prodsId = _.map(this._itemsOrder, "_id");

    this.prodServ.fetchProdsByids(prodsId)
      .then((prods: Producto[])=>{

        this._prods = _.map(prods, (prod: Producto) => {
          let itemId = cg.binarySearch(this._itemsOrder, '_id', prod._id);
          return {
            _id    : prod._id,
            titulo : prod.titulo,
            imagen : prod.imagen,
            cant   : this._itemsOrder[itemId].cantidad,
            total  : this._itemsOrder[itemId].totalPrice
          }
        });
        loading.dismiss();
      })
      .catch(err=>{
        this.util.errorHandler(err.message, err, loading);
      })
  }



}
