import { Injectable } from '@angular/core';
import { Events, AlertController } from 'ionic-angular';

// libs terceros
import PouchDB from 'pouchdb';
import Raven from 'raven-js';
import _ from 'lodash';

@Injectable()
export class DbProvider {

  private _db: any;
  private _remoteDB: any;

  private _replication: any;
  private _sync: any;

  constructor(
    private evts: Events,
    private alertCtrl: AlertController,
  ) {
  }

  public init(urlDB: string): Promise<any> {
    return new Promise( (resolve, reject) => {
      this._db = new PouchDB('db_averno');
      this._remoteDB = new PouchDB(urlDB, {
        ajax: {
          timeout: 60000
        }
      });

      this._replication = PouchDB.replicate(this._remoteDB, this._db, { batch_size : 500 })
      .on('change', function (info) {
        console.warn("Orders-Primera replicada change", info);
      })
      .on("complete", info => {
        this.syncDB();
        resolve(info);
      })
      .on("error", err => {
        this.syncDB();
        reject(err);
      });


    })
  }

  private syncDB(): void {

    let replicationOptions = {
      live: true,
      retry: true
    };


    this._sync = PouchDB.sync(this._remoteDB, this._db, replicationOptions)
    .on('paused', function (info) {
      console.log("db_averno-replication was paused,usually because of a lost connection", info);
    }).on('active', function () {
      console.log("db_averno-replication was resumed");
    }).on('denied', function (err) {
      console.error("db_averno-a document failed to replicate (e.g. due to permissions)", err);
      Raven.captureException( new Error(`db_averno - No se pudo replicar la BD con las ordenes debido a permisos 👮: ${JSON.stringify(err)}`), {
        extra: err
      } );
    }).on('error', (err: any) => {
      console.error("db_averno-totally unhandled error (shouldn't happen)", err);

      if(_.has(err, 'error')){
        if(err.error == "unauthorized"){
          this.alertCtrl.create({
            title: "Session caducada.",
            message: "Para que los pedidos puedan subirse a SAP por favor cierra la sesion he inicie de nuevo.",
            buttons: ['Ok'],
            enableBackdropDismiss: false,
          }).present();
        }
      }

      Raven.captureException( new Error(`db_averno - Error con la BD de las ordenes que no deberia pasar 😫: ${JSON.stringify(err)}`), {
        extra: err
      } );

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

  public destroyDB(): Promise<any> {
    this._replication.cancel();
    this._sync.cancel();
    return this._db.destroy().then(() => {
      console.log(" db_averno - database removed");
    }).catch(err=>{
      Raven.captureException( new Error(`db_averno - Error al eliminar la bd 😫: ${JSON.stringify(err)}`), {
        extra: err
      } );
    });
  }

}
