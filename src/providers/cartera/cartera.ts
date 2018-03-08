import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Response } from '@angular/http/src/static_response';
import { Observable } from 'rxjs/Observable';
import { map, catchError, timeout } from 'rxjs/operators';
import 'rxjs/add/operator/toPromise';

// lib terceros
import _ from 'lodash';
import PouchDB from 'pouchdb';
import Raven from 'raven-js';

//Providers
import { AuthProvider } from '../auth/auth';
import { Config as cg } from "../config/config";

//Models
import { Cartera } from "./models/cartera_mdl";
import { WorkerRes } from "../config/models/workerRes"

@Injectable()
export class CarteraProvider {

  private _db: any;
  private _remoteDB: any;
  private _cartera: Cartera[] = [];
  private replicationWorker: Worker;
  //Esta variable se encarga de mostrar el estado de la bd en el menu
  private statusDB: boolean = false;

  constructor(
    private util: cg,
    private authService: AuthProvider,
    private storage: Storage,
    private http: HttpClient
  ) {
    /*** Intento eliminar la bd anterior */
    const oldDB: PouchDB.Database = new PouchDB("cartera", {revs_limit: 5, auto_compaction: true});
    oldDB.destroy();
    /*********************************** */
  }

  /**
   * Esta funcion se encarga de buscar la cartera del cliente, segun el asesor
   * actualmente logueado en la app, los busca por el NIT del cliente
   * con el motor de busqueda lucene de cloudant, este metodo tambien hace
   * uso del api async/await de ecmascript 7 si no estoy mal
   *
   * @param {string} nitCliente
   * @returns {Promise<any>}
   * @memberof CarteraProvider
   */
  public async searchCartera(nitCliente: string): Promise<any> {
    try {
    let token = await this.storage.get('josefa-token');
    /**
     * Bueno aqui hago todo lo contrario a lo que hago con los productos
     * en vez de hacer un offline first (que deberia ser lo correcto)
     * hago un online first por asi decirlo, lo que hago es buscar primero
     * en cloudant/couchdb por los clientes, si por algun motivo no los puedo
     * traer digace fallo de conexion o lo que sea, entonces busco los clientes
     * en la base de datos local
     */
    let url: string = cg.JOSEFA_URL+'/sap/cartera';
    let options = {
      headers: new HttpHeaders({
        'Accept'       : 'application/json',
        'Content-Type' : 'application/json',
        'Authorization': 'Bearer ' + token
      })
    };
    let body: string = JSON.stringify({
      and : {
        codCliente : nitCliente
      }
    });

    /**
     * aqui haciendo uso del async/await hago un try/catch que primero
     * intenta traer los datos mediante http de cloudant, si por algun motivo
     * la petcion falla entonces el catch se encarga de buscar los clientes
     * en la bd local
     */


      let res = await this.http.post( url, body, options ).pipe(
        map((res: Response) => {
          return res;
        }),
        timeout(7000)
      ).toPromise();

      return res;

    } catch (error) {
      console.error("Error al buscar en cartera", error);
      throw "Error en cartera debido a un fallo con la conexion, verifique los datos o busque una red wifi: "+JSON.stringify(error);
    }

  }



}
