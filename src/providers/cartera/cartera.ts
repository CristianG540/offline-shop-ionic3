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
import pouchAdapterMem from 'pouchdb-adapter-memory';
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
    PouchDB.plugin(require("pouchdb-quick-search"));
    PouchDB.plugin(pouchAdapterMem);

    /**
     * Creo un nuevo worker desde el bundle que hago con webpack en los assets
     * este worker se encarga de todo lo que este relacionado con la replicacion
     * y la sincroniazion de las bd mediante pouchdb
     */
    this.replicationWorker = new Worker('./assets/js/pouch_replication_worker/dist/bundle.js');
    /**
     * bueno esto es parecido a un observable, lo que hace es recibir una funcion
     * que se ejecuta cada vez que llegue un mensaje desde el worker
     */
    this.replicationWorker.onmessage = (event) => {
      //saco los datos que vienen en el evento
      let d: WorkerRes = event.data;
      /**
       * con este switch verifico que clase de mensaje envie desde el
       * worker, y asi realizo la accion indicada, que se peude hacer mejor
       * yo creo q si, si sabe como hagalo usted
       */
      switch (d.method) {
        case "replicate":
          this._replicateDB(d)
          break;

        case "sync":
          console.error("Cartera- Error en sincronizacion 🐛", d.info);
          Raven.captureException( new Error(`Cartera- Error en sincronizacion 🐛: ${JSON.stringify(d.info)}`) );
          break;

        case "changes":
          /**
           * en este modulo de cartera no es necesario estar pendiente de los cambios
           * ya que no necesito cambiar nada en tiempo real ni cosas del estilo
           */
          // this._reactToChanges(d);
          break;

        default:
          break;
      }
    }

    if (!this._db) {

      // Base de datos remota en couchdb
      this._remoteDB = new PouchDB(cg.CDB_URL_CARTERA, {
        auth: {
          username: cg.CDB_USER,
          password: cg.CDB_PASS
        }
      });
      /**
       * Base de datos local en pouch
       */
      this._db = new PouchDB("cartera",{revs_limit: 5, auto_compaction: true});

      /**
       * postMessage se encarga de enviar un mensaje al worker
       * yo aqui lo uso para enviarle los datos de la bd de la que quiero q se
       * encargue, le mando los datos de la bd local y de la remota para q se encargue
       * de la replicacion y la sincronizacion
       */
      this.replicationWorker.postMessage({
        db: "cartera",
        local: {
          name: "cartera",
          options: {revs_limit: 5, auto_compaction: true}
        },
        remote: {
          name: cg.CDB_URL_CARTERA,
          options : {
            auth: {
              username: cg.CDB_USER,
              password: cg.CDB_PASS
            },
            ajax: {
              timeout: 60000
            }
          }
        }
      });

    }

  } // Fin constructor

  private _replicateDB(d: WorkerRes): void {
    switch (d.event) {

      case "complete":
        /**
         * Cuando la bd se termina de replicar y esta disponible local
         * creo una bandera en el storage que me indica que ya esta lista
         */
        this.storage.set('cartera-db-status', true).catch(err => {
          Raven.captureException( new Error(`Cartera- Error al guardar la bandera del estado de la bd😫: ${JSON.stringify(err)}`), { extra: err } );
        });
        this.statusDB = true;
        console.warn("Cartera-Primera replicada completa", d.info);
        break;

      case "error":
        console.error("Cartera- first replication totally unhandled error (shouldn't happen)", d.info);
        Raven.captureException( new Error(`Cartera - Primera replica error que no deberia pasar 😫: ${JSON.stringify(d.info)}`), { extra: d.info } );
        /**
         * si algun error se presenta recargo la aplicacion,
         * a menos que sea un error de conexion por falta de datos o de conexion
         * en ese caso no la recargo por q entra en un loop infinito cuando el celular
         * no tiene conexion
         */
        let error;
        try {
          error = d.info.message;
        } catch (e) {
          error = "";
        }
        if(error != "getCheckpoint rejected with " ){
          window.location.reload();
        }
        break;

      default:
        break;
    }
  }

  public destroyDB(): void{
    this._db.destroy().then(() => {
      this.
      _cartera = [];
      console.log("database removed");
    })
    .catch(console.log.bind(console));
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
    /**
     * Bueno aqui hago todo lo contrario a lo que hago con los productos
     * en vez de hacer un offline first (que deberia ser lo correcto)
     * hago un online first por asi decirlo, lo que hago es buscar primero
     * en cloudant/couchdb por los clientes, si por algun motivo no los puedo
     * traer digace fallo de conexion o lo que sea, entonces busco los clientes
     * en la base de datos local
     */
    let url: string = "https://3ea7c857-8a2d-40a3-bfe6-970ddf53285a-bluemix.cloudant.com/cartera/_design/app/_search/get_cartera";
    let params = new HttpParams()
      .set('q', `cod_cliente:"${nitCliente}"~ AND cod_vendedor:"${this.authService.asesorId}"`)
      .set('include_docs', "true");
    let options = {
      headers: new HttpHeaders({
        'Accept'       : 'application/json',
        'Content-Type' : 'application/json',
        'Authorization': 'Basic ' + btoa(`${cg.CDB_USER}:${cg.CDB_PASS}`)
      }),
      params: params
    };

    /**
     * aqui haciendo uso del async/await hago un try/catch que primero
     * intenta traer los datos mediante http de cloudant, si por algun motivo
     * la petcion falla entonces el catch se encarga de buscar los clientes
     * en la bd local
     */
    try {

      let res = await this.http.get( url, options ).pipe(
        map((res: Response) => {
          return res;
        }),
        timeout(5000)
      ).toPromise();

      return res;

    } catch (error) {
      console.error("Error buscando clientes online: ", error)
      /**
       * Para mas informacion sobre este plugin la pagina principal:
       * https://github.com/pouchdb-community/pouchdb-quick-search
       */
      let res = await this._db.search({
        query: nitCliente,
        fields: ["cod_cliente"],
        filter: doc => {
          return doc.cod_vendedor == this.authService.asesorId; // solo los del asesor en sesion
        },
        include_docs: true
        //stale: 'update_after'
      });

      return res;
    }

  }



}
