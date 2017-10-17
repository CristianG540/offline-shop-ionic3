import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import _ from 'lodash';
import PouchDB from 'pouchdb';
import 'rxjs/add/operator/map';

//Providers
import { AuthProvider } from '../auth/auth';
import { Config as cg } from "../config/config";

//Models
import { Cliente } from "./models/cliente";

@Injectable()
export class ClientesProvider {
  private _db: any;
  private _remoteDB: any;
  private _clientes: Cliente[] = [];

  constructor(
    public http: Http,
    private util: cg,
    private authService: AuthProvider,
  ) {
    PouchDB.plugin(require("pouchdb-quick-search"));
    if (!this._db) {
      this._db = new PouchDB("cliente");
      this._remoteDB = new PouchDB(cg.CDB_URL_CLIENTES, {
        auth: {
          username: "admin",
          password: "admin"
        }
      });
      let replicationOptions = {
        live: true,
        retry: true
      };
      this._db
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
          console.log(
            "Client-a document failed to replicate (e.g. due to permissions)",
            err
          );
        })
        .on("error", function(err) {
          console.log("Client-totally unhandled error (shouldn't happen)", err);
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
      highlighting: true,
      stale: 'ok'
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
