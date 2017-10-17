import { Injectable, ApplicationRef } from "@angular/core";
import { Http, RequestOptions, Response, URLSearchParams } from '@angular/http';
import { Storage } from '@ionic/storage';
import { Events } from 'ionic-angular';

/* Maricadas de Rxjs */
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/of';

/* Librerias de terceros */
import PouchDB from 'pouchdb';
import _ from 'lodash';
import * as moment from 'moment';

//Providers
import { Config as cg } from "../config/config";
import { DbProvider } from "../db/db";
//Models
import { Orden } from './models/orden';
import { CarItem } from "../carrito/models/carItem";

@Injectable()
export class OrdenProvider {

  private _db: any;
  private _ordenes: Orden[] = [];

  constructor(
    private appRef: ApplicationRef, // lo uso para actualizar la UI cuando se hace un cambio fiera de la ngZone
    public dbServ: DbProvider,
    private evts: Events,
    private util : cg,
    private http: Http,
    private storage: Storage
  ) {
    this.evts.subscribe('db:init', () => {
      this.initDB();
    });

    /** *************** Manejo de el estado de la ui    ********************** */
    this.evts.subscribe('orden:changed', (doc: Orden) => {
      this._onUpdatedOrInserted(doc);
    });
    this.evts.subscribe('orden:deleted', (doc: Orden) => {
      /**
       * Para que esto funcione, se deben eliminar los datos en couchdb
       * agregando "_deleted" : true al documento, osea eliminando el doc
       * usando el api de modificar de couch, no la de eliminar
       */
      this._onDeleted(doc._id);
    });
  }

  public initDB(){
    let loading = this.util.showLoading();
    this._db = this.dbServ.db;
    this.fetchAndRenderAllDocs()
      .then( res => {
        loading.dismiss()
      })
      .catch( err => this.util.errorHandler(err.message, err, loading) );
  }

  public fetchAndRenderAllDocs(): Promise<any> {

    return this._db.allDocs({
      include_docs: true
    }).then( res => {
      this._ordenes = res.rows.map((row) => {
        return row.doc;
      });
      console.log("_all_docs ordenes pouchDB", res)
      return res;
    });

  }

  public pushItem(orden: Orden) : Promise<any>{
    return this._db.put(orden);
  }

  public destroyDB(): void{
    this._db.destroy().then(() => {
      this._ordenes = [];
      console.log("database removed");
    })
    .catch(console.log.bind(console));
  }


  public sendOrdersSap(): Promise<any> {

    if(!this.util.onlineOffline){
      return Promise.reject({
        message: "No hay conexión, su pedido quedara almacenado en el dispositivo."
      });
    }

    return new Promise( (resolve, reject) => {

      this.storage.get('josefa-token').then((token: string) => {

        let options:RequestOptions = cg.JOSEFA_OPTIONS('Bearer ' + token);
          /**
           * guardo un array de observables cada uno con una peticion
           * post al api qur manda las ordenes pendientes a sap
           */
          let ordenesCalls: Observable<any>[] = _.map(this.ordenesPendientes, (orden: Orden) => {

            //mapeo los productos de la orden segun el formato del api
            let items: any = _.map( orden.items, (item: CarItem) => {
              return {
                referencia : item._id,
                cantidad   : item.cantidad,
                descuento  : 0
              }
            });
            // url y cuerpo de la peticion
            let url: string = cg.JOSEFA_URL+'/sap/order';
            let body: string = JSON.stringify({
              id             : orden._id,
              fecha_creacion : moment(parseInt(orden._id)).format("YYYY-MM-DD"),
              nit_cliente    : orden.nitCliente,
              comentarios    : orden.observaciones,
              productos      : items
            });

            return this.http.post(url, body, options).map( (res: Response) => {
              /**
               * Si la respuesta de la api no tiene ningun error, y la orden se crea
               * y entra correctamente a sap devuelvo entonces la respuesta y la orden
               */
              return {
                orden       : orden,
                responseApi : res.json()
              }
            }).catch( (res: Response) => {
              /**
               * Si la respuesta de la api falla, y la orden no se crea
               * correctamente en sap devuelvo entonces la respuesta del error y la orden en un observable
               */
              return Observable.of({
                orden       : orden,
                responseApi : res.json()
              })
            })

          });

          Observable.forkJoin(ordenesCalls).subscribe(
            res => {

              let responsesApi = res; // Guardo las respuestas que me delvuelve el api sobre los pedidos hechos
              /**
               * Lo que hago aqui es actualizar cada una de las ordenes que sap recibio correctamente
               * paso el estado de cada una de esas ordenes a enviado (true),  y le asigno a la orden
               * el DocEntry que sap me devuelve
               */
              Promise.all(responsesApi.map( (res: any) => {
                  if (res.responseApi.code == 201 && _.has(res.responseApi, 'data.DocumentParams.DocEntry') ) {
                    res.orden.estado = true;
                    res.orden.error = '';
                    res.orden.docEntry = res.responseApi.data.DocumentParams.DocEntry;
                    return this.pushItem(res.orden)
                  }else{
                    res.orden.error = JSON.stringify(res.responseApi.data);
                    return this.pushItem(res.orden)
                  }
                })
              ).then(res=>{
                resolve({
                  apiRes     : responsesApi,
                  localdbRes : res
                })
              }).catch(err => {
                reject(err)
              })

            },
            err => {
              reject(err)
            }
          )

      }).catch(err => {
        reject(err)
      });

    });

  }

  /** *************** Manejo de el estado de la ui    ********************** */

  private _onDeleted(id: string): void {
    let index: number = cg.binarySearch(
      this._ordenes,
      '_id',
      id
    );
    let doc = this._ordenes[index];
    if (doc && doc._id == id) {
      this._ordenes.splice(index, 1);
    }
    /**
     * Actualiza la interfaz de usuario
     * https://angular.io/api/core/ApplicationRef
     * https://goo.gl/PDi6iM
     */
    this.appRef.tick();
  }

  private _onUpdatedOrInserted(newDoc: Orden): void {
    let index: number = cg.binarySearch(
      this._ordenes,
      '_id',
      newDoc._id
    );
    let doc = this._ordenes[index];
    if (doc && doc._id == newDoc._id) { // update
      this._ordenes[index] = newDoc;
    } else { // insert
      this._ordenes.splice(index, 0, newDoc);
    }
    this.appRef.tick();
  }
  /** *********** Fin Manejo de el estado de la ui    ********************** */


  ///////////////////////// GETTERS and SETTERS ////////////////////

  /**
   * Getter que me trae todas los ordenes
   *
   * @readonly
   * @type {Orden[]}
   * @memberof OrdenProvider
   */
  public get ordenes() : Orden[] {
    return JSON.parse(JSON.stringify( _.orderBy(this._ordenes, '_id', 'desc') ));
  }

  /**
   * Getter que me trae las ordenes pendientes
   *
   * @readonly
   * @type {Orden[]}
   * @memberof OrdenProvider
   */
  public get ordenesPendientes() : Orden[] {
    return JSON.parse( JSON.stringify( _.filter(this._ordenes, ['estado', false]) ) );
  }


}
