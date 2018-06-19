import { Injectable, ApplicationRef } from '@angular/core';
import { Http, RequestOptions, Response, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import { Storage } from '@ionic/storage';

/* librerias de terceros */
import Raven from "raven-js";
import _ from 'lodash';
import PouchDB from 'pouchdb';
//import PouchUpsert from 'pouchdb-upsert';
//import PouchLoad from 'pouchdb-load';

//Providers
import { Config } from '../config/config'
// Models
import { Producto } from './models/producto';
import { Categoria } from './models/categoria';
import { CarItem } from "../carrito/models/carItem";
import { WorkerRes } from "../config/models/workerRes"
// Info del por que hago esto https://github.com/domiSchenk/PouchDB-typescript-definitions/issues/4
declare var emit:any;

@Injectable()
export class ProductosProvider {

  private _db: any;
  private _remoteDB: any;
  private _prods: Producto[] = [];
  private _categorias: Categoria[] = [];
  private _prodsByCat: Producto[] = [];
  private replicationWorker: Worker;
  public statusDB: boolean = false;

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
    private util: Config,
    private storage: Storage
  ) {
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
          console.error("Prods- Error en sincronizacion 🐛", d.info);
          Raven.captureException( new Error(`Prods- Error en sincronizacion 🐛: ${JSON.stringify(d.info)}`) );
          break;
        case "changes":
          this._reactToChanges(d);
          break;
        default:
          break;
      }

    }

  }

  public initDB(): void {
    //PouchDB.plugin(PouchUpsert);
    //PouchDB.plugin(PouchLoad);
    const replication_opt = {
      auth: {
        username: Config.CDB_USER,
        password: Config.CDB_PASS
      },
      ajax: {
        timeout: 60000
      }
    };

    /*** Intento eliminar la bd anterior */
    const oldDB: PouchDB.Database = new PouchDB("producto_2", {revs_limit: 5, auto_compaction: true});
    oldDB.destroy();
    /*********************************** */

    this._db = new PouchDB("producto_3", {revs_limit: 5, auto_compaction: true});
    this._remoteDB = new PouchDB(Config.CDB_URL, replication_opt);

    /**
     * postMessage se encarga de enviar un mensaje al worker
     * yo aqui lo uso para enviarle los datos de la bd de la que quiero q se
     * encargue, le mando los datos de la bd local y de la remota para q se encargue
     * de la replicacion y la sincronizacion
     */
    this.replicationWorker.postMessage({
      db: "productos",
      local: {
        name: "producto_3",
        options: {revs_limit: 5, auto_compaction: true}
      },
      remote: {
        name: Config.CDB_URL,
        options : replication_opt
      }
    });

  }

  private _replicateDB(d: WorkerRes): void {
    switch (d.event) {
      /**
       * Esto lo comento por que el enviar muchos mensajes al hilo
       * principal hace q se bloquee el dom entonces hay q tratat
       * de enviar la menor cantidad posible de mensajes
      **/
      /*case "change":
        console.warn("Primera replicada change", d.info);
        this.util.setLoadingText( `Cargando productos y sus cambios: ${d.info.docs_written.toString()}` );
        break;*/
      case "complete":
        /**
         * Cuando la bd se termina de replicar y esta disponible local
         * creo una bandera en el storage que me indica que ya esta lista
         */
        this.storage.set('prods-status', true).catch(err => {
          Raven.captureException( new Error(`Productos- Error al guardar la bandera estado de la bd😫: ${JSON.stringify(err)}`), { extra: err } );
        });
        this.statusDB = true;
        console.warn('Prods- First Replication complete', d.info);
        break;
      case "error":
        console.error("Prods-totally unhandled error (shouldn't happen)", d.info);
        Raven.captureException( new Error(`Prods- Error en la bd local no deberia pasar 😫: ${JSON.stringify(d.info)}`), { extra: d.info } );

        break;

      default:
        break;
    }
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
  /*
  private async loadDB(db, filename, numFiles?): Promise<any> {

    if (await this.checkReplicated(db)) {
      console.log(filename+": replication already done");
      return;
    }

    console.log(filename+": started replication");

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
  */

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

  /************************ Metodos Offline First ***************************** */

  /**
   * Los metodos acontinuacion los uso para usar alguna clase de implementacion
   * de Offline first, lo qsignifica que primero intento consultar los datos
   * en la base de datos local, pero si estos aun no estan disponibles, entonces
   * consulto la base de datos en linea
   */

  private async allDocs(db, options): Promise<any> {
    let res = await db.allDocs(options);
    /**
     * si la base de datos aun no se ha replicado y si la bd
     * a la que se le esta haciendo la consulta es la local
     * entonces lanzo un error para que el metodo doLocalFirst
     * intente de nuevo la consulta pero con la bd remota
     */
    if(! await this.storage.get('prods-status') && !db._remote ){
      throw new Error('No se ha completado la replicacion');
    }
    return res;
  }

  private async getManyByIds(db, ids): Promise<any> {
    let res = await db.allDocs({
      include_docs : true,
      keys         : ids
    });
    if(! await this.storage.get('prods-status') && !db._remote ){

      throw new Error('No se ha completado la replicacion');
    }

    return res;
  }

  private async designDocCategoriaView(db): Promise<any>{
    let res = await db.query('categoriaview', {
      group_level : 1,
      group       : true,
      reduce      : true
    });
    if(! await this.storage.get('prods-status') && !db._remote ){
      throw new Error('No se ha completado la replicacion');
    }
    return res;
  }

  private async queryCategoriaView(db, categoria): Promise<any>{
    let res = await db.query('categoriaview/producto_categoria', {
      key          : categoria,
      skip         : this.skipByCat,
      limit        : this.cantProdsPag,
      include_docs : true
    })
    if(! await this.storage.get('prods-status') && !db._remote ){
      throw new Error('No se ha completado la replicacion');
    }
    return res;
  }

  private async doLocalFirst(dbFun) {
    // hit the remote DB first; if it 404s, then hit the local
    try {
      return await dbFun(this._remoteDB);
    } catch (err) {
      return await dbFun(this._db);
    }
  }

  /******************** FIN Metodos Offline First ***************************** */

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
      return this.doLocalFirst( db => this.designDocCategoriaView(db) );
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

    return this.doLocalFirst( db => this.queryCategoriaView(db, categoria) )
    .then(res => {
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

    return this.doLocalFirst( db => this.getManyByIds(db, ids) )
    .then(res => {
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
  public async searchAutocomplete(query: string): Promise<any> {
    query = (query) ? query.toUpperCase() : "";

    let res = await this.doLocalFirst(db => {
      return this.allDocs(db, {
        include_docs : true,
        startkey     : query,
        endkey       : query+"\uffff",
        limit        : 30
      })
    });

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

  }

  public updateQuantity(carItems: CarItem[] ) : Promise<any> {

    let prodsId = _.map(carItems, "_id");
    return this.fetchProdsByids(prodsId)
    .then((prods: Producto[])=>{

      let prodsToUpdate = _.map(prods, (prod: Producto)=>{
        let itemId = Config.binarySearch(carItems, '_id', prod._id);
        prod.existencias -= carItems[itemId].cantidad;
        prod.origen = 'app';
        prod.updated_at = Date.now();
        return prod;
      });
      return prodsToUpdate;
    })
    .then( prodsToUpdate => {

      return this.doLocalFirst( db => db.bulkDocs(prodsToUpdate) )
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
  private _reactToChanges(d: WorkerRes): void {
    switch (d.event) {
      case "deleted":
        // change.id holds the deleted id
        this._onDeleted(d.info.doc._id);
        break;
      case "upsert":
        // updated/inserted
        // change.doc holds the new doc
        this._onUpdatedOrInserted(d.info.doc);
        break;
      case "error":
        console.error("Prods- Error react to changes 🐛", d.info);
        Raven.captureException( new Error(`Prods- Error react to changes 🐛: ${JSON.stringify(d.info)}`) );
        break;
      default:
        break;
    }
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
