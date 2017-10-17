import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import _ from 'lodash';
import PouchDB from 'pouchdb';

//Providers
import { Config as cg } from "../config/config";

//Models
import { Producto } from "../productos/models/producto";
import { CarItem } from "./models/carItem";


@Injectable()
export class CarritoProvider {

  private _db: any;
  private _carItems: CarItem[] = [];

  constructor(
    public evts: Events,
    private util : cg
  ) {
    if(!this._db){
      this.initDB();
    }
  }

  public initDB(){
    let loading = this.util.showLoading();
    this._db = new PouchDB('cart');
    this.fetchAndRenderAllDocs()
      .then( res => {
        this._reactToChanges()
        loading.dismiss()
      })
      .catch(err => this.util.errorHandler(err.message, err, loading) );
  }

  /** *************** Manejo de el estado de la ui    ********************** */

  public fetchAndRenderAllDocs(): Promise<any> {

    return this._db.allDocs({
      include_docs: true
    }).then( res => {
      this._carItems = res.rows.map((row) => {
        return new CarItem(
          row.doc._id,
          row.doc.cantidad,
          row.doc.totalPrice,
          row.doc._rev
        );
      });
      console.log("_all_docs carrito pouchDB", res)
      return res;
    });

  }

  private _reactToChanges(): void {
    this._db.changes({
      live: true,
      since: 'now',
      include_docs: true
    })
    .on( 'change', change => {

      if (change.deleted) {
        // change.id holds the deleted id
        this._onDeleted(change.id);
      } else { // updated/inserted
        // change.doc holds the new doc
        this._onUpdatedOrInserted(new CarItem(
          change.doc._id,
          change.doc.cantidad,
          change.doc.totalPrice,
          change.doc._rev
        ));
      }
      console.log("Items del carrito change", this.carItems);
    })
    .on( 'error', console.log.bind(console));
  }

  private _onDeleted(id: string): void {
    let index: number = cg.binarySearch(
      this._carItems,
      '_id',
      id
    );
    let doc = this._carItems[index];
    if (doc && doc._id == id) {
      this._carItems.splice(index, 1);
      //lanzo este evento para actualizar la pagina cuando un item
      //del carrito se elimina
      this.evts.publish('cart:change');
    }
  }

  private _onUpdatedOrInserted(newDoc: CarItem): void {
    let index: number = cg.binarySearch(
      this._carItems,
      '_id',
      newDoc._id
    );
    let doc = this._carItems[index];
    if (doc && doc._id == newDoc._id) { // update
      this._carItems[index] = newDoc;
    } else { // insert
      this._carItems.splice(index, 0, newDoc);
    }
  }

  /** *********** Fin Manejo de el estado de la ui    ********************** */


  public pushItem(item: CarItem) : Promise<any>{

    return new Promise( (resolve, reject) => {
      /**
       * hago una busqueda binaria para saber si el producto esta en el carrito
       * si ya esta en el carrito, le informo al usuario q no lo puede agregar
       */
      let indexPrevItem: number = cg.binarySearch(
        this._carItems,
        '_id',
        item._id
      );
      let prevItem: CarItem = this._carItems[indexPrevItem];
      if( prevItem && prevItem._id == item._id ){
        reject("duplicate");
      }else{
        /**
         * inserto los datos en la bd local
         */
        this._db.put(item)
          .then(res=>{
            /**
             * Lo que hago aqui es usar la funcion "sortedLastIndexBy" de lodash
             * mas info aqui: "https://lodash.com/docs/4.17.4#sortedLastIndexBy"
             * con este codigo lo q hago conservar el orden de los productos cada
             * vez que los voy ingresando, asi a la hora de leerlos ya estan ordenados
             * y la busqueda binaria funciona full HD
             */
            //let i = _.sortedLastIndexBy(this._carItems, item, v => v._id );
            //this._carItems.splice(i, 0, item);
            resolve(res);
          })
          .catch(err=>{
            reject(err);
          })
      }

    })

  }

  public deleteItem(prod: Producto): Promise<any>{
    // Mirar aqui mostro
    let carItemIndex = cg.binarySearch(
      this._carItems,
      '_id',
      prod._id
    );
    return this._db.remove(this._carItems[carItemIndex])
      .then(res=>{
        return res;
      });
  }

  /**
   * Busco el producto en los items del carrito para saber la cantidad que se ha
   * pedido de cada producto
   *
   * @private
   * @param {Producto} prod
   * @returns {number}
   * @memberof CarritoPage
   */
  public getProdCant(prod: Producto): number{
    let carItemIndex = cg.binarySearch(
      this.carItems,
      '_id',
      prod._id
    );
    try {
      return this.carItems[carItemIndex].cantidad
    } catch (err) {
      console.log("err getProdCant",err)
      return 0
    }

  }

  public setProdCant(cantPedido : number, prod: Producto): void {

    let carItemIndex = cg.binarySearch(
      this.carItems,
      '_id',
      prod._id
    );
    this._carItems[carItemIndex].cantidad = cantPedido;
    this._carItems[carItemIndex].totalPrice = prod.precio * cantPedido;
    this._db.put(this._carItems[carItemIndex])
      .then(res => {
        console.log("couch put res carrito prov", res)
      })
      .catch(console.log.bind(console))
  }

  /**
   * Esta funcion se encarga de eliminar la base datos del carrito
   * se usa en varias ocaciones como al finalizar un pedido o al cerrar
   * la sesion, el parametro init sirve para iniciar de nuevo la base de datos
   * esto sirve por ejemplo al terminar el pedido que se borra la bd pero se crea
   * de nuevo para seguir haciendo pedidos
   *
   * @param {boolean} [init=false]
   * @memberof CarritoProvider
   */
  public destroyDB(init: boolean = false): void{
    this._db.destroy().then(() => {
      this._carItems = [];
      if(init){
        return this.initDB();
      }
    })
    .catch(console.log.bind(console));
  }

  ///////////////////////// GETTERS and SETTERS ////////////////////

  /**
   * Getter que me trae todos los productos en el carrito
   * un array q contiene objetos con el sku del producto
   * y la cantidad de productos q se van a pedir
   *
   * @readonly
   * @type {CarItem[]}
   * @memberof CarritoProvider
   */
  public get carItems() : CarItem[] {
    return JSON.parse(JSON.stringify(this._carItems));
  }

  /**
   * Este Getter me trae un array con todos los skus de los productos
   * en el carrito, este lo uso para hacer una busqueda en couchdb y traer
   * los productos del carrito
   *
   * @readonly
   * @type {*}
   * @memberof CarritoProvider
   */
  public get carIdItems(): any {
    return _.map(this._carItems, "_id");
  }

  /**
   * Getter que me trae el total del pedido sin en el iva
   *
   * @readonly
   * @type {number}
   * @memberof CarritoProvider
   */
  public get subTotalPrice() : number {
    return _.reduce(this._carItems, (acum, item: CarItem )=>{
      return acum + item.totalPrice;
    }, 0);
  }

  /**
   * getter recupera el iva del pedido
   *
   * @readonly
   * @type {number}
   * @memberof CarritoProvider
   */
  public get ivaPrice() : number {
    return this.subTotalPrice*19/100;
  }

  /**
   * Getter que me recupera el total del valor de los productos en el carrito
   * incluyendo el iva
   *
   * @readonly
   * @type {number}
   * @memberof CarritoProvider
   */
  public get totalPrice() : number {
    return this.subTotalPrice + this.ivaPrice;
  }


}
