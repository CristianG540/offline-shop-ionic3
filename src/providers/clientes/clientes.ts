import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

// lib terceros
import _ from 'lodash';
import PouchDB from 'pouchdb';
import pouchAdapterMem from 'pouchdb-adapter-memory';
import Raven from 'raven-js';

//Providers
import { AuthProvider } from '../auth/auth';
import { Config as cg } from "../config/config";

//Models
import { Cliente } from "./models/cliente";
import { WorkerRes } from "../config/models/workerRes"

@Injectable()
export class ClientesProvider {
  private _db: any;
  private _dbLocal: any;
  private _remoteDB: any;
  private _clientes: Cliente[] = [];
  public statusDB: boolean = false;
  private replicationWorker: Worker;

  constructor(
    private util: cg,
    private authService: AuthProvider,
    private storage: Storage
  ) {
    this.replicationWorker = new Worker('./assets/js/pouch_replication_worker/dist/bundle.js');
    this.replicationWorker.onmessage = (event) => {
      let d: WorkerRes = event.data;
      switch (d.method) {
        case "replicate":
          this._replicateDB(d)
          break;
        case "sync":
          console.error("Clientes- Error en sincronizacion 🐛", d.info);
          Raven.captureException( new Error(`Clientes- Error en sincronizacion 🐛: ${JSON.stringify(d.info)}`) );
          break;
        case "changes":
          this._reactToChanges(d);
          break;
        default:
          break;
      }
    }
    PouchDB.plugin(require("pouchdb-quick-search"));
    PouchDB.plugin(pouchAdapterMem);
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
      this._dbLocal = new PouchDB("cliente",{revs_limit: 10, auto_compaction: true});

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
              username: "3ea7c857-8a2d-40a3-bfe6-970ddf53285a-bluemix",
              password: "42d8545f6e5329d97b9c77fbe14f8e6579cefb7d737bdaa0bae8500f5d8d567e"
            },
            ajax: {
              timeout: 60000
            }
          }
        }
      });

    }
  }

  private _replicateDB(d): void {
    switch (d.event) {
      case "complete":
        /**
         * Cuando la bd se termina de replicar y esta disponible local
         * creo una bandera en el storage que me indica que ya esta lista
         */
        this.storage.set('clientes-db-status', true).catch(err => {
          Raven.captureException( new Error(`Clientes- Error al guardar la bandera del estado de la bd😫: ${JSON.stringify(err)}`), { extra: err } );
        });
        this.statusDB = true;
        console.warn("Clientes-Primera replicada completa", d.info);
        this.syncDB();
        break;
      case "error":
        console.error("Clientes- first replication totally unhandled error (shouldn't happen)", d.info);
        Raven.captureException( new Error(`Clientes - Primera replica error que no deberia pasar 😫: ${JSON.stringify(d.info)}`), { extra: d.info } );
        /**
         * si algun error se presenta recargo la aplicacion,
         * a menos que sea un error de conexion por falta de datos o de conexion
         * en ese caso no la recargo por q entra en un loop infinito cuando el celular
         * no tiene conexion
         */
        if(_.has(d.info, 'message') && d.info.message != "getCheckpoint rejected with " ){
          window.location.reload();
        }
        this.syncDB();
        break;

      default:
        break;
    }
  }

  private syncDB(): void {
    let replicationOptions = {
      live: true,
      retry: true
    };
    /**
     * Que mierda estoy haciendo aqui me preguntare cuando se me olvide esto,
     * como la bd en memoria es muy rapida pero no conserva los datos, y como
     * la bd normal si los almacena pero es mas lenta, entonces lo que hago
     * es replicar los datos de una a la otra, asi puedo hacer las operaciones
     * CRUD por asi decirlo en la de memoria que es muy rapida, y replicar los
     * datos a la otra para que los preserve, en teoria deberia funcionar como
     * una especia de ram o cache algo asi.
     */
    PouchDB.sync(this._dbLocal, this._db, replicationOptions)
    .on("denied", err => {
      console.error("Clientes*inMemory - a failed to replicate due to permissions",err);
      Raven.captureException( new Error(`Clientes*inMemory - No se pudo replicar debido a permisos 👮: ${JSON.stringify(err)}`), {
        extra: err
      } );
    })
    .on("error", err => {
      console.error("Clientes*inMemory - totally unhandled error (shouldn't happen)", err);
      Raven.captureException( new Error(`Clientes*inMemory - Error que no deberia pasar 😫: ${JSON.stringify(err)}`), {
        extra: err
      } );
    });

  }

  public searchCliente(query: string): Promise<any> {

    /**
     * Para mas informacion sobre este plugin la pagina principal:
     * https://github.com/pouchdb-community/pouchdb-quick-search
     */
    return this._db.search({
      query: query,
      fields: ["nombre_cliente"],
      filter: doc => {
        return doc.asesor == this.authService.asesorId; // solo los del asesor en sesion
      },
      limit: 50,
      include_docs: true,
      highlighting: true
      //stale: 'update_after'
    });
  }

  public indexDbClientes(): any {
    return this._db.search({
      fields: ["nombre_cliente"],
      filter: doc => {
        return doc.asesor == this.authService.asesorId; // solo los del asesor en sesion
      },
      build: true
    });
  }

  public destroyDB(): void{
    this._db.destroy().then(() => {
      this._clientes = [];
      console.log("database removed");
    })
    .catch(console.log.bind(console));
  }

  public fetchAndRenderAllDocs(): Promise<any> {

    return this._db.allDocs({
        include_docs: true
      }).then(res => {
        this._clientes = res.rows.map(row => {
          return new Cliente(
            row.doc._id,
            row.doc.asesor,
            row.doc.asesor_nombre,
            row.doc.ciudad,
            row.doc.direccion,
            row.doc.nombre_cliente,
            row.doc.transportadora,
            row.doc._rev
          );
        });
        console.log("_all_docs clientes pouchDB", res.total_rows);
        return res;
      });
  }

  /** *************** Manejo de el estado de la ui    ********************** */

  private _reactToChanges(d: WorkerRes): void {
    switch (d.event) {
      case "deleted":
        // change.id holds the deleted id
        this._onDeleted(d.info.doc._id);
        break;
      case "upsert":
        // updated/inserted
        // change.doc holds the new doc
        this._onUpdatedOrInserted(
          new Cliente(
            d.info.doc._id,
            d.info.doc.asesor,
            d.info.doc.asesor_nombre,
            d.info.doc.ciudad,
            d.info.doc.direccion,
            d.info.doc.nombre_cliente,
            d.info.doc.transportadora,
            d.info.doc._rev
          )
        );
        break;
      case "error":
        console.error("Clientes- Error react to changes 🐛", d.info);
        Raven.captureException( new Error(`Clientes- Error react to changes 🐛: ${JSON.stringify(d.info)}`) );
        break;
      default:
        break;
    }
  }

  private _onDeleted(id: string): void {
    let index: number = cg.binarySearch(this._clientes, "_id", id);
    let doc = this._clientes[index];
    if (doc && doc._id == id) {
      this._clientes.splice(index, 1);
    }
  }

  private _onUpdatedOrInserted(newDoc: Cliente): void {
    let index: number = cg.binarySearch(this._clientes, "_id", newDoc._id);
    let doc = this._clientes[index];
    if (doc && doc._id == newDoc._id) {
      // update
      this._clientes[index] = newDoc;
    } else {
      // insert
      this._clientes.splice(index, 0, newDoc);
    }
  }
  /** *********** Fin Manejo de el estado de la ui    ********************** */
}
