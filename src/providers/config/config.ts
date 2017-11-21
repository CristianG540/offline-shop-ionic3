import { Injectable } from '@angular/core';
import { Headers, RequestOptions, Response } from '@angular/http';
import {
  Loading,
  AlertController,
  LoadingController,
  ToastController
} from "ionic-angular";

//libs terceros
import Raven from "raven-js";

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

  static readonly SUPERLOGIN_URL: string = 'https://www.gatortyres.com:3443';

  /* **************************** Cosas de JOSEFA  *************************** */
  static readonly JOSEFA_URL: string = 'https://gatortyres.com';
  //static readonly JOSEFA_URL: string = 'http://josefa2.igb';
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
  static readonly CDB_URL: string = 'https://www.gatortyres.com:6984/productos_prod';
  static readonly CDB_URL_CLIENTES: string = 'https://www.gatortyres.com:6984/clientes';

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

  /**
   * A ver, hay veces que al recibir la respuesta de un api esta no viene totalmente
   * en un formato json, puede ser que por ejemplo haya un error y la api devuelve
   * una porsion de html, al intentar hacer el res.json() la app saca un error como * "SyntaxError: Unexpected token < in JSON at position 0 at JSON.parse"
   * esta funcion se encarga de atraparme ese error y de notificarme cuando pasa
   *
   * @static
   * @param {Response} res
   * @returns {*}
   * @memberof Config
   */
  static safeJsonParse(res: Response): any {
    try{
      return res.json();
    }catch(err){
      return {
        data : {
          msg : res,
          err : err
        },
        code : 400
      }
    }
  }
  /**
   * Esta funcion me crea una alerta con un input para preguntarle al
   * usuario cuantas unidades del producto va a agregar al carrito
   *
   * @param {*} handler este parametro recibe una funcion con un parametro data que recibe
   * la cantidad que el usuario ingreso en el input
   * @memberof Config
   */
  public promptAlertCant(handler: any): void {
    this.alertCtrl.create({
      title: 'Agregar cantidad',
      enableBackdropDismiss: false,
      inputs: [{
        name: 'txtCantidad',
        id: 'idTxtCant',
        type: 'number',
        placeholder: 'Cantidad'
      }],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Agregar',
          handler: handler
        }
      ]
    })
    .present()
    .then( ()=>{
      const firstInput: any = document.querySelector('ion-alert input');
      firstInput.focus();
      return;
    });
  }

  public errorHandler(err: string, errObj?: any, loading?: Loading): void {
    if(loading){ loading.dismiss() }
    this.alertCtrl.create({
      title: "Ocurrio un error.",
      message: err,
      buttons: ['Ok']
    }).present();
    console.error("Se presento el error: ",errObj);
    Raven.captureException( new Error(`Se presento el error 🐛: ${JSON.stringify(errObj)}`), {
      extra: errObj
    });
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
      showCloseButton: false,
      closeButtonText: "cerrar"
    }).present();
  }

}
