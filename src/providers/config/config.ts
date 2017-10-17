import { Injectable } from '@angular/core';
import { Headers, RequestOptions } from '@angular/http';
import {
  Loading,
  AlertController,
  LoadingController,
  ToastController
} from "ionic-angular";

@Injectable()
export class Config {
  public loading: Loading;
  public onlineOffline: boolean = navigator.onLine;
  constructor(
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ){
    window.addEventListener('online', () => {
      this.onlineOffline = true;
    });
    window.addEventListener('offline', () => {
      this.onlineOffline = false;
    });
  }

  static readonly SUPERLOGIN_URL: string = 'http://192.168.11.29:3000';

  /* **************************** Cosas de JOSEFA  *************************** */
  static readonly JOSEFA_URL: string = 'http://gatortyres.com/';
  static JOSEFA_OPTIONS(auth: string): RequestOptions{
    let headers = new Headers({
      'Accept'       : 'application/json',
      'Content-Type' : 'application/json',
      'Authorization': auth
    });
    let options = new RequestOptions({
      headers: headers
    });
    return options;
  }

  /* ************************* Fin Cosas de JOSEFA *****************************/




  /* **************************** Cosas de CouchDB  *************************** */
  // Url base de la BD en couch
  static readonly CDB_URL: string = 'http://192.168.11.29:5984/productos';
  static readonly CDB_URL_CLIENTES: string = 'http://45.77.74.23:5984/clientes';

  //Headers y otras opciones basicas para las peticiones a couchdb mdiante angular http
  //el header de autotizacion creoq se puede hacer de una forma mejor
  static CDB_OPTIONS(): RequestOptions{
    let headers = new Headers({
      'Accept'       : 'application/json',
      'Content-Type' : 'application/json',
      'Authorization': 'Basic ' + btoa('admin:admin')
    });
    let options = new RequestOptions({
      headers: headers
    });
    return options;
  }
  /* ************************* Fin Cosas de CouchDB *****************************/
  // Esta es una version mas rapida del "_.find" de lodash :3
  // Gracias a https://pouchdb.com/2015/02/28/efficiently-managing-ui-state-in-pouchdb.html
  static binarySearch(arr: any, property: string, search: any): number {
    let low: number = 0;
    let high:number = arr.length;
    let mid:number;
    while (low < high) {
      mid = (low + high) >>> 1; // faster version of Math.floor((low + high) / 2)
      arr[mid][property] < search ? low = mid + 1 : high = mid
    }
    return low;
  }

  public errorHandler(err: string, errObj?: any, loading?: Loading): void {
    if(loading){ loading.dismiss() }
    this.alertCtrl.create({
      title: "Ocurrio un error.",
      message: err,
      buttons: ['Ok']
    }).present();
    if(err){ console.error("Se presento el error: ",err) }
  }

  public showLoading(): Loading {
    let loading: Loading = this.loadingCtrl.create({
      content: 'Espere por favor...'
    });
    loading.present();
    return loading;
  }

  public showToast(msg:string): void {
    this.toastCtrl.create({
      message: msg,
      duration: 3000,
      position: 'top',
      showCloseButton: true,
      closeButtonText: "cerrar"
    }).present();
  }

}
