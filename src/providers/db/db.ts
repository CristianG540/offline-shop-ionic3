import { Injectable } from '@angular/core';
import { Events } from 'ionic-angular';
import PouchDB from 'pouchdb';

@Injectable()
export class DbProvider {

  private _db: any;
  private _remoteDB: any;

  constructor(
    public evts: Events
  ) {
  }

  public init(urlDB: string): void {
    this._db = new PouchDB('db_averno');
    this._remoteDB = new PouchDB(urlDB);
    let replicationOptions = {
      live: true,
      retry: true
    };
    this._db.sync(this._remoteDB, replicationOptions)
      .on('paused', function (info) {
        console.log("db_averno-replication was paused,usually because of a lost connection", info);
      }).on('active', function (info) {
        console.log("db_averno-replication was resumed", info);
      }).on('denied', function (err) {
        console.error("db_averno-a document failed to replicate (e.g. due to permissions)", err);
      }).on('error', function (err) {
        console.error("db_averno-totally unhandled error (shouldn't happen)", err);
      });

    this._reactToChanges();

    this.evts.publish('db:init');
  }

  /** *************** Manejo de el estado de la ui    ********************** */
  private _reactToChanges(): void {
    this._db.changes({
      live: true,
      since: 'now',
      include_docs: true
    })
    .on( 'change', change => {

      if (change.deleted) {
        // change.id holds the deleted id
        this._onDeleted(change.doc);
      } else { // updated/inserted
        // change.doc holds the new doc
        this._onUpdatedOrInserted(change.doc);
      }

    })
    .on( 'error', console.log.bind(console));
  }

  private _onDeleted(doc: any): void {
    switch (doc.type) {
      case "orden":
      this.evts.publish('orden:deleted', doc);
        break;
      default:
        break;
    }
  }

  private _onUpdatedOrInserted(doc: any): void {
    switch (doc.type) {
      case "orden":
      this.evts.publish('orden:changed', doc);
        break;
      default:
        break;
    }
  }
  /** *********** Fin Manejo de el estado de la ui    ********************** */

  public get db() : any {
    if(this._db){
      return this._db;
    }else{
      console.log("No se ha iniciado la base de datos");
      return null;
    }
  }

  public destroyDB(): void{
    this._db.destroy().then(() => {
      console.log("database removed");
    });
  }

}
