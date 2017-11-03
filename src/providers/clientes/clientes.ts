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
import { Cliente } from "./models/cliente";

@Injectable()
export class ClientesProvider {
  private _db: any;
  private _dbLocal: any;
  private _remoteDB: any;
  private _clientes: Cliente[] = [];

  constructor(
    private util: cg,
    private authService: AuthProvider,
  ) {
    PouchDB.plugin(require("pouchdb-quick-search"));
    PouchDB.plugin(pouchAdapterMem);
    if (!this._db) {
      let replicationOptions = {
        live: true,
        retry: true
      };
      // Base de datos remota en couchdb
      this._remoteDB = new PouchDB(cg.CDB_URL_CLIENTES, {
        auth: {
          username: "admin",
          password: "admin"
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

      // Sincronizo los datos de la BD remota con la local, cualquier cambio
      // en la base de datos remota afecta la local y viceversa
      this._dbLocal
        .sync(this._remoteDB, replicationOptions)
        .on("paused", function(info) {
          console.log(
            "Client-replication was paused,usually because of a lost connection",
            info
          );
        })
        .on("active", function(info) {
          console.log("Client-replication was resumed", info);
        })
        .on("denied", function(err) {
          console.error(
            "Client-a document failed to replicate (e.g. due to permissions)",
            err
          );
          Raven.captureException( new Error(`ClientesBD - No se pudo replicar debido a permisos 👮: ${JSON.stringify(err)}`), {
            extra: err
          } );
        })
        .on("error", function(err) {
          console.error("Client-totally unhandled error (shouldn't happen)", err);
          Raven.captureException( new Error(`ClientesBD - Error que no deberia pasar 😫: ${JSON.stringify(err)}`), {
            extra: err
          } );
        });
    }
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

  /** *************** Manejo de el estado de la ui    ********************** */

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

  private _reactToChanges(): void {
    this._db
      .changes({
        live: true,
        since: "now",
        include_docs: true
      })
      .on("change", change => {
        if (change.deleted) {
          // change.id holds the deleted id
          this._onDeleted(change.id);
        } else {
          // updated/inserted
          // change.doc holds the new doc
          this._onUpdatedOrInserted(
            new Cliente(
              change.doc._id,
              change.doc.asesor,
              change.doc.asesor_nombre,
              change.doc.ciudad,
              change.doc.direccion,
              change.doc.nombre_cliente,
              change.doc.transportadora,
              change.doc._rev
            )
          );
        }
        console.log("clientes change", this._clientes);
      })
      .on("error", console.log.bind(console));
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
