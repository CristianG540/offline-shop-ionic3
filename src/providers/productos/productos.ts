import { Injectable, ApplicationRef } from '@angular/core';
import { Http, RequestOptions, Response, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
/* librerias de terceros */
import Raven from "raven-js";
import _ from 'lodash';
import PouchDB from 'pouchdb';
import PouchUpsert from 'pouchdb-upsert';
import PouchLoad from 'pouchdb-load';

//import cordovaSqlitePlugin from 'pouchdb-adapter-cordova-sqlite';
//Providers
import { Config } from '../config/config'
// Models
import { Producto } from './models/producto';
import { Categoria } from './models/categoria';
import { CarItem } from "../carrito/models/carItem";
// Info del por que hago esto https://github.com/domiSchenk/PouchDB-typescript-definitions/issues/4
declare var emit:any;

@Injectable()
export class ProductosProvider {

  private _db: any;
  private _remoteDB: any;
  private _prods: Producto[] = [];
  private _categorias: Categoria[] = [];
  private _prodsByCat: Producto[] = [];

  /* parametros usados por couchdb para la paginacion de los productos */
  /* mas info: https://pouchdb.com/2014/04/14/pagination-strategies-with-pouchdb.html */
  private cantProdsPag:number = 10;
  private skip:number = 0;
  /**
   * este starkey lo uso para paginar los resultados de "_all_docs"
   */
  private startkey:string = '';
  /**
   * http://docs.couchdb.org/en/2.0.0/couchapp/views/pagination.html
   */
  private skipByCat:number = 0;


  constructor(
    public http: Http,
    private appRef: ApplicationRef, // lo uso para actualizar la UI cuando se hace un cambio fiera de la ngZone
    private util: Config
  ) {}

  public initDB(): Promise<any>{
    PouchDB.plugin(PouchUpsert);
    PouchDB.plugin(PouchLoad);
    //PouchDB.plugin(cordovaSqlitePlugin);
    return new Promise( (resolve, reject) => {

      //this._db = new PouchDB("productos.db", {adapter: 'cordova-sqlite'});
      this._db = new PouchDB("productos_prod", {revs_limit: 5, auto_compaction: true});
      this._remoteDB = new PouchDB(Config.CDB_URL, {
        auth: {
          username: "3ea7c857-8a2d-40a3-bfe6-970ddf53285a-bluemix",
          password: "42d8545f6e5329d97b9c77fbe14f8e6579cefb7d737bdaa0bae8500f5d8d567e"
        },
        ajax: {
          timeout: 60000
        }
      });

      this._db.replicate.from(this._remoteDB, { batch_size : 100 })
      .on('change', info => {
        console.warn("Primera replicada change", info);
        this.util.setLoadingText( `Cargando productos y sus cambios: ${info.docs_written.toString()}` );
      })
      .on("complete", info => {
        //Si la primera replicacion se completa con exito sincronizo la db
        //y de vuelvo la info sobre la sincronizacion
        this.syncDB();
        resolve(info);
      })
      .on("error", err => {
        //Me preguntare a mi mismo en el futuro por que mierda pongo a sincronizar
        //La base de datos si la primera sincronisacion falla, lo pongo aqui por q
        //si el usuario cierra la app y la vuelve a iniciar, el evento de initdb
        //se ejecutaria de nuevo y si por algun motivo no tiene internet entonces
        // la replicacion nunca se va completar y la base de datos
        //no se va a sincronizar, por eso lo lanzo de nuevo aqui el sync
        this.syncDB();
        reject(err);
      });

    })

  }

  private syncDB(): void {
    let replicationOptions = {
      live       : true,
      retry      : true,
      batch_size : 500
    };
    PouchDB.sync(this._db, this._remoteDB, replicationOptions)
    .on("denied", err => {
      console.log("Prods-a failed to replicate due to permissions",err);
    })
    .on("error", err => {
      console.log("Prods-totally unhandled error (shouldn't happen)", err);
    });
    this._reactToChanges();
  }

  /********************** Cosas para replica local *************** */

  /**
   * Para mas info sobre lo q hago aqui, revisar el sgte articulo
   * http://www.pocketjavascript.com/blog/2015/11/23/introducing-pokedex-org
   * y el siguinte archivo en el github del proyecto
   * https://github.com/nolanlawson/pokedex.org/blob/master/src/js/worker/databaseService.js
   */

  /**
   * DESHABILITADA GASTA DEMACIADA MEMORIA EN LOS CELULARES
   * LA DEJO SOLO CON VALOR EDUCATIVO
   *
   * Esta funcion se encarga de replicar los datos por primera vez desde un
   * archivo txt con una carga inicial de los productos
   *
   * @param {any} db
   * @param {any} filename
   * @param {any} [numFiles]
   * @returns {Promise<any>}
   * @memberof ProductosProvider
   */
  private async replicateDB(db, filename, numFiles?): Promise<any> {

    if (await this.checkReplicated(db)) {
      console.log(`${filename}: replication already done`);
      return;
    }

    console.log(`${filename}: started replication`);

    if (numFiles) {
      for (var i = 1; i <= numFiles; i++) {
        // file was broken up into smaller files
        try {
          await db.load(filename.replace('.txt', `-${i}.txt`), {
            proxy: Config.CDB_LOAD_PROXY
          });
        }catch(err){
          console.error("Error al cargar el dump", err);
          Raven.captureException( new Error(`error al cargar el dump 🐛: ${JSON.stringify(err)}`) );
        }
      }
    } else {

      try {
        await db.load(filename, {
          proxy: Config.CDB_LOAD_PROXY
        });
      }catch(err){
        console.error("Error al cargar el dump", err);
        Raven.captureException( new Error(`error al cargar el dump 🐛: ${JSON.stringify(err)}`) );
      }

    }
    console.log(`${filename}: done replicating`);

    try{
      await this.markReplicated(db);
    } catch (err) {
      console.error("Error al marcar la replica", err);
      Raven.captureException( new Error(`Error al marcar la replica 🐛: ${JSON.stringify(err)}`) );
    }
  }

  /**
   * Esta funciontrata de recuperar un documento local de couchdb/pouchdb
   * si el doc existe significa que ya se hizo la replicacion de los datos
   * desde el archivo local y no es necesario hacer la replicacion local de nuevo
   * si el archivo no exste entonces devuelve false y se replica la bd desde el
   * archivo local.
   *
   * @private
   * @param {any} db
   * @returns {Promise<boolean>}
   * @memberof ProductosProvider
   */
  private async checkReplicated(db): Promise<boolean> {
    try {
      await db.get('_local/v1-load-complete');
      return true;
    } catch (err) {
      console.log("Error al recuperar doc local", err);
      return false;
    }
  }

  /**
   * Esta funcion es la que se encarga de crear el documento local que marca
   * si la replicacion local ya se realizo o si es la primera vez, en esta funcion
   * hago uso del plugin "upsert" de pouchdb
   *
   * @private
   * @param {any} db
   * @returns {Promise<any>}
   * @memberof ProductosProvider
   */
  private async markReplicated(db): Promise<any> {
    return await db.putIfNotExists({
      _id: '_local/v1-load-complete'
    });
  }

  /****************************** fin replica local ******************** */

  /**
   * Basandome en este articulo "http://acdcjunior.github.io/querying-couchdb-pouchdb-map-reduce-group-by-example.html"
   * creo una vista map/reduce en couchdb que me agrupa los productos por categoria y me cuenta las
   * cantidades de productos por cada categoria
   *
   * @returns {Promise<any>}
   * @memberof ProductosProvider
   */
  public fetchCategorias(): Promise<any> {
    // create a design doc
    var ddoc = {
      _id: '_design/categoriaview',
      views: {
        categoriaview: {
          map : function (doc) {
            if(parseInt(doc.existencias)>0 && doc.marcas){
              emit(doc.marcas, 1);
            }
          }.toString(), // The .toString() at the end of the map function is necessary to prep the object for becoming valid JSON.
          reduce: '_sum'
        },
        producto_categoria: {
          map : function (doc) {
            if(doc.marcas && parseInt(doc.existencias)>0){
              emit(doc.marcas.toLowerCase(), null);
            }
          }.toString() // The .toString() at the end of the map function is necessary to prep the object for becoming valid JSON.
        }
      }
    }

    // save the design doc
    return this._db.put(ddoc).catch(err => {
      if (err.name !== 'conflict') {
        throw err;
      }
      // ignore if doc already exists
    }).then( () => {
      return this._db.query('categoriaview', {
        group_level : 1,
        group       : true,
        reduce      : true
      });
    }).then(res => {
      if (res && res.rows.length > 0) {
        this._categorias = _.map(res.rows, (v: any, k: number) => {
          return new Categoria(
            v.key,
            v.value
          );
        });
      }
      return this._categorias;
    })


    /**
     * otra forma de hacer todo lo anterior es la sgte
     */
    /*
    let mapReduceFun = {
      map : function (doc) {
        if(parseInt(doc.existencias)>0 && doc.marcas){
          emit(doc.marcas, 1);
        }
      },
      reduce: '_sum'
    };

   return this._db.query(mapReduceFun, {
        group_level : 1,
        group       : true,
        reduce      : true
    }).then(res => {
      if (res && res.rows.length > 0) {
        this._categorias = _.map(res.rows, (v: any, k: number) => {
          return new Categoria(
            v.key,
            v.value
          );
        });
      }
      return this._categorias;
    })
    */

  }

  private async allDocs(db, options): Promise<any> {
    let res = await db.allDocs(options);
    if(res && res.rows.length > 0){
      return res;
    }else{
      throw new Error('No se encontraron docs');
    }
  }

  private async doLocalFirst(dbFun) {
    // hit the local DB first; if it 404s, then hit the remote
    try {
      return await dbFun(this._db);
    } catch (err) {
      return await dbFun(this._remoteDB);
    }
  }

  /**
   * Esta funcion es la que rcupera los productos del infinite scroll
   * de la pagina principal
   */
  public async recuperarPagSgte(): Promise<any> {

    let res = await this.doLocalFirst(db => {
      return this.allDocs(db, {
        include_docs : true,
        limit        : this.cantProdsPag,
        skip         : this.skip,
        startkey     : this.startkey
      })
    });

    if (res && res.rows.length > 0) {
      this.startkey = res.rows[res.rows.length - 1].key;
      this.skip = 1;
      let prods: Producto[] = _.map(res.rows, (v: any, k: number) => {
        // El precio llega en un formato como "$20.200" entonces lo saneo para que quede "20200"
        let precio = (_.has(v.doc, 'precio')) ? v.doc.precio : 0;
        precio = parseInt( (precio[0]=='$') ? precio.substring(1) : precio );
        return new Producto(
          v.doc._id,
          v.doc.titulo,
          v.doc.aplicacion,
          v.doc.imagen,
          v.doc.categoria,
          v.doc.marcas,
          v.doc.unidad,
          parseInt(v.doc.existencias),
          precio,
          v.doc._rev
        );
      });
      this._prods.push(...prods );
    }
    console.log("prodsProvider-recuperarPagSgte",this._prods);
    return res;

  }

  /**
   * utlizo una vista oara hacer un map/reduce "https://stackoverflow.com/questions/24909317/how-to-write-wildcard-search-query-in-couchdb-where-name-like-a"
   * Para buscar los productos por categoria, tener muy encuenta que para
   * usar este query antes hay q crear la vista
   * @param {string} categoria
   * @returns {*}
   * @memberof ProductosProvider
   */
  public fetchNextPagByCategoria(categoria : string): any {

    categoria = categoria.toLocaleLowerCase();

    return this._db.query('categoriaview/producto_categoria', {
        key          : categoria,
        skip         : this.skipByCat,
        limit        : this.cantProdsPag,
        include_docs : true
    }).then(res => {

      if (res && res.rows.length > 0) {
        this.skipByCat += this.cantProdsPag;
        let prods: Producto[] = _.map(res.rows, (v: any, k: number) => {
          let precio = (_.has(v.doc, 'precio')) ? v.doc.precio : 0;
          precio = parseInt( (precio[0]=='$') ? precio.substring(1) : precio );
          return new Producto(
            v.doc._id,
            v.doc.titulo,
            v.doc.aplicacion,
            v.doc.imagen,
            v.doc.categoria,
            v.doc.marcas,
            v.doc.unidad,
            v.doc.existencias,
            precio,
            v.doc._rev
          );
        });
        this._prodsByCat.push(...prods );
      }
      return res;
    });

  }

  public fetchProdsByids( ids: any ): Promise<any>{

    return this._db.allDocs({
      include_docs : true,
      keys         : ids
    }).then(res => {

      console.log("all_docs ids", res)
      if (res && res.rows.length > 0) {
        return _.map(res.rows, (v: any) => {
          let precio: number = 0;
          /**
           * esta validacion la hago por si se elimina un producto de la bd
           * por falta de existencias, a veces pasaba que si habia un producto
           * en el carrito y casualmente se elimina, ocurria un error donde
           * no se encontraba el _id
           */
          if(_.has(v.doc, 'precio')){
            precio = v.doc.precio;
            return new Producto(
              v.doc._id,
              v.doc.titulo,
              v.doc.aplicacion,
              v.doc.imagen,
              v.doc.categoria,
              v.doc.marcas,
              v.doc.unidad,
              parseInt(v.doc.existencias),
              precio,
              v.doc._rev
            );
          }else{
            return new Producto(
              v.id,
              'producto agotado',
              'producto agotado',
              'https://www.igbcolombia.com/app/www/assets/img/logo/logo_igb_small.png',
              null,
              '',
              'UND',
              0,
              0,
              ''
            );
          }
        }) ;
      }else{
        return [];
      }
    })

  }

  /**
   *
   * este metodo es el encargado de hacer funcionar la busqueda de los productos
   * mediante el sku
   *
   * @param {string} query
   * @memberof ProductosProvider
   */
  public searchAutocomplete(query: string): Promise<any> {
    /**
     * Para mas informacion sobre este plugin la pagina principal:
     * https://github.com/pouchdb-community/pouchdb-quick-search
     */
    query = (query) ? query.toUpperCase() : "";
    return this._db.allDocs({
      include_docs : true,
      startkey     : query,
      endkey       : query+"\uffff",
      limit        : 30
    }).then(res => {

      if (res && res.rows.length > 0) {
        return _.map(res.rows, (v: any) => {
          let precio: number = 0;
          if(_.has(v.doc, 'precio')){
            precio = v.doc.precio;
            return new Producto(
              v.doc._id,
              v.doc.titulo,
              v.doc.aplicacion,
              v.doc.imagen,
              v.doc.categoria,
              v.doc.marcas,
              v.doc.unidad,
              parseInt(v.doc.existencias),
              precio,
              v.doc._rev
            );
          }
        }) ;
      }else{
        return [];
      }

    });

  }

  public updateQuantity(carItems: CarItem[] ) : Promise<any> {

    let prodsId = _.map(carItems, "_id");
    return this.fetchProdsByids(prodsId)
    .then((prods: Producto[])=>{
      let prodsToUpdate = _.map(prods, (prod: Producto)=>{
        let itemId = Config.binarySearch(carItems, '_id', prod._id);
        prod.existencias -= carItems[itemId].cantidad;
        return prod;
      });
      return prodsToUpdate;
    })
    .then( prodsToUpdate => {
      return this._db.bulkDocs(prodsToUpdate)
    })

  }

  /**
   * Lo siguiente lo hago para resetear las variables que almacenan los datos
   * al mostrar los productos por categoria, si no las reseteo los productos solo
   * se apiñarian uno tras otro y continuarian desde el ultimo producto paginado
   */
  public resetProdsByCat(): void {
    this._prodsByCat = [];
    this.skipByCat = 0;
  }

   /**
   * ESTA MIERDA LA TENGO QUITAR SEGURO SE PUEDE HACER MEJOR !!!!!!!
   * Lo siguiente lo hago para resetear las variables que almacenan los datos
   * al mostrar los productos por categoria, si no las reseteo los productos solo
   * se apiñarian uno tras otro y continuarian desde el ultimo producto paginado
   */
  public resetProds(): void {
    this._prods= [];
    this.startkey = '';
    this.skip = 0;
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
        this._onDeleted(change.doc._id);
      } else { // updated/inserted
        // change.doc holds the new doc
        this._onUpdatedOrInserted(change.doc);
      }

    })
    .on( 'error', console.log.bind(console));
  }

  private _onDeleted(id: string): void {
    let index: number = Config.binarySearch(
      this._prods,
      '_id',
      id
    );
    let doc = this._prods[index];
    if (doc && doc._id == id) {
      this._prods.splice(index, 1);
    }
    /**
     * Actualiza la interfaz de usuario
     * https://angular.io/api/core/ApplicationRef
     * https://goo.gl/PDi6iM
     */
    this.appRef.tick();
  }

  private _onUpdatedOrInserted(newDoc: Producto): void {
    let index: number = Config.binarySearch(
      this._prods,
      '_id',
      newDoc._id
    );
    let doc = this._prods[index];
    if (doc && doc._id == newDoc._id) { // update
      this._prods[index] = newDoc;
    } else { // insert
      /**
       * Comento esta parte del codigo, no por que este mala,
       * la comento por que por el momento no me interesa que ingrese
       * los productos a los que se ven en el home, por ejemplo en el home se ven 5
       * si se modfica un producto en couch, se agrega al y serian 5
       */
      //this._prods.splice(index, 0, newDoc);
    }
    this.appRef.tick();
  }
  /** *********** Fin Manejo de el estado de la ui    ********************** */

  ///////////////////////// GETTERS and SETTERS ////////////////////

  public get prods() : Producto[] {
    return JSON.parse(JSON.stringify(this._prods));
  }

  public get prodsByCat() : Producto[] {
    return JSON.parse(JSON.stringify(this._prodsByCat));
  }

  public set prodsByCat(v : Producto[]) {
    this._prodsByCat = v;
  }

  public get categorias() : Categoria[] {
    return JSON.parse(JSON.stringify(this._categorias));
  }

}
