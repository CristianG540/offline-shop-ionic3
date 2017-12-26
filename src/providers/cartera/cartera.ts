import { Injectable } from '@angular/core';

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
  private _dbLocal: any;
  private _remoteDB: any;
  private replicationWorker: Worker;

  constructor(
    private util: cg,
    private authService: AuthProvider,
    private storage: Storage
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
          //this._replicateDB(d)
          break;

        case "sync":
          console.error("Cartera- Error en sincronizacion 🐛", d.info);
          Raven.captureException( new Error(`Cartera- Error en sincronizacion 🐛: ${JSON.stringify(d.info)}`) );
          break;

        case "changes":
         // this._reactToChanges(d);
          break;

        default:
          break;
      }
    }

    if (!this._db) {

      // Base de datos remota en couchdb
      this._remoteDB = new PouchDB(cg.CDB_URL_CLIENTES, {
        auth: {
          username: "3ea7c857-8a2d-40a3-bfe6-970ddf53285a-bluemix",
          password: "42d8545f6e5329d97b9c77fbe14f8e6579cefb7d737bdaa0bae8500f5d8d567e"
        }
      });
      /**
       * Base de datos local en pouch, lo diferente de esta BD
       * es que se mantiene en memoria, creo q es mucho mas rapida
       * que una que almacene en el dispositivo, pero lo malo es que
       * los datos se pierden si la app se cierra
       */
      this._db = new PouchDB("cliente_mem", {adapter: 'memory', auto_compaction: true});
      /**
       * Base de datos local en pouch, esta BD almacena los datos en
       * el dispositivo usando IndexDB, la ventaja es q los datos se mantienen
       * si la app se cierra, la desventaja es que creo q es mas lenta
       * que la BD en memoria
       */
      this._dbLocal = new PouchDB("cliente",{revs_limit: 5, auto_compaction: true});

      /**
       * postMessage se encarga de enviar un mensaje al worker
       * yo aqui lo uso para enviarle los datos de la bd de la que quiero q se
       * encargue, le mando los datos de la bd local y de la remota para q se encargue
       * de la replicacion y la sincronizacion
       */
      this.replicationWorker.postMessage({
        db: "clientes",
        local: {
          name: "cliente",
          options: {revs_limit: 5, auto_compaction: true}
        },
        remote: {
          name: cg.CDB_URL_CLIENTES,
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

  }



}
