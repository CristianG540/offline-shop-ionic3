import { Injectable } from '@angular/core'
import { Storage } from '@ionic/storage'
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'
import { map, timeout } from 'rxjs/operators'
import 'rxjs/add/operator/toPromise'

// lib terceros
import _ from 'lodash'
import PouchDB from 'pouchdb'
import PouchUpsert from 'pouchdb-upsert'
import Raven from 'raven-js'

// Providers
import { AuthProvider } from '../auth/auth'
import { Config as cg } from '../config/config'
import { OfflineUtils } from '../offline/offline'

// Models
import { Cliente } from './models/cliente'
import { WorkerRes } from '../config/models/workerRes'

@Injectable()
export class ClientesProvider extends OfflineUtils {

  private _clientes: Cliente[] = []
  private replicationWorker: Worker

  constructor (
    private authService: AuthProvider,
    private storage: Storage,
    private http: HttpClient
  ) {
    super()
    PouchDB.plugin(require('pouchdb-quick-search'))
    PouchDB.plugin(PouchUpsert)

    /**
     * Creo un nuevo worker desde el bundle que hago con webpack en los assets
     * este worker se encarga de todo lo que este relacionado con la replicacion
     * y la sincroniazion de las bd mediante pouchdb
     */
    this.replicationWorker = new Worker('./assets/js/pouch_replication_worker/dist/bundle.js')
    /**
     * bueno esto es parecido a un observable, lo que hace es recibir una funcion
     * que se ejecuta cada vez que llegue un mensaje desde el worker
     */
    this.replicationWorker.onmessage = (event) => {
      // saco los datos que vienen en el evento
      let d: WorkerRes = event.data

      /**
       * con este switch verifico que clase de mensaje envie desde el
       * worker, y asi realizo la accion indicada, que se peude hacer mejor
       * yo creo q si, si sabe como hagalo usted
       */
      switch (d.method) {

        case 'replicate':
          this._replicateDB(d)
          break

        case 'sync':
          console.error('Clientes- Error en sincronizacion 🐛', d.info)
          Raven.captureException(new Error(`Clientes- Error en sincronizacion 🐛: ${JSON.stringify(d.info)}`))
          break

        case 'changes':
          this._reactToChanges(d)
          break

        default:
          break
      }

    }

    // Base de datos remota en couchdb
    this._remoteDB = new PouchDB(cg.CDB_URL_CLIENTES, {
      auth: {
        username: cg.CDB_USER,
        password: cg.CDB_PASS
      }
    })

    /**
     * Base de datos local en pouch, esta BD almacena los datos en
     * el dispositivo usando IndexDB, la ventaja es q los datos se mantienen
     * si la app se cierra, la desventaja es que creo q es mas lenta
     * que la BD en memoria
     */
    this._db = new PouchDB('cliente',{ revs_limit: 5, auto_compaction: true })

    /**
     * postMessage se encarga de enviar un mensaje al worker
     * yo aqui lo uso para enviarle los datos de la bd de la que quiero q se
     * encargue, le mando los datos de la bd local y de la remota para q se encargue
     * de la replicacion y la sincronizacion
     */
    this.replicationWorker.postMessage({
      db: 'clientes',
      local: {
        name: 'cliente',
        options: { revs_limit: 5, auto_compaction: true }
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
    })

  }

  private _replicateDB (d): void {
    switch (d.event) {

      case 'complete':
        /**
         * Cuando la bd se termina de replicar y esta disponible local
         * creo una bandera en el storage que me indica que ya esta lista
         */
        this.storage.set('clientes-db-status', true).catch(err => {
          Raven.captureException(new Error(`Clientes- Error al guardar la bandera del estado de la bd😫: ${JSON.stringify(err)}`), { extra: err })
        })
        this.statusDB = true
        console.warn('Clientes-Primera replicada completa', d.info)

        break

      case 'error':
        console.error("Clientes- first replication totally unhandled error (shouldn't happen)", d.info)
        Raven.captureException(new Error(`Clientes - Primera replica error que no deberia pasar 😫: ${JSON.stringify(d.info)}`), { extra: d.info })

        break

      default:
        break
    }
  }

  /**
   * Esta funcion se encarga de buscar los clientes del asesor
   * actualmente logueado en la app, los busca por el nombre del cliente
   * con el motor de busqueda lucene de cloudant, este metodo tambien hace
   * uso del api async/await de ecmascript 7 si no estoy mal
   *
   * @param {string} query
   * @returns {Promise<any>}
   * @memberof ClientesProvider
   */
  public async searchCliente (query: string): Promise<any> {
    /**
     * Bueno aqui hago todo lo contrario a lo que hago con los productos
     * en vez de hacer un offline first (que deberia ser lo correcto)
     * hago un online first por asi decirlo, lo que hago es buscar primero
     * en el api csv para los clientes de igb, si por algun motivo no los puedo
     * traer digace fallo de conexion o lo que sea, entonces busco los clientes
     * en la base de datos local
     */
    let url: string = cg.SEARCH_CLIENTS_URL
    let params = new HttpParams()
      .set('keyword', query)
      .set('asesor', String(this.authService.asesorId))
    let options = {
      headers: new HttpHeaders({
        'Accept'       : 'application/json',
        'Content-Type' : 'application/json'
      }),
      params: params
    }

    /**
     * aqui haciendo uso del async/await hago un try/catch que primero
     * intenta traer los datos mediante http de elsaticsearch, si por algun motivo
     * la petcion falla entonces el catch se encarga de buscar los clientes
     * en la bd local pouchdb
     */
    try {

      let res = await this.http.get(url, options).pipe(
        map((res: any) => {
          return res
        }),
        timeout(5000)
      ).toPromise()

      let data = { rows: [] }
      data.rows = _.map(res, (hit: any) => {
        return {
          doc : hit
        }
      })

      return data

    } catch (error) {
      console.error('Error buscando clientes online: ', error)
      /**
       * Para mas informacion sobre este plugin la pagina principal:
       * https://github.com/pouchdb-community/pouchdb-quick-search
       */
      return this._db.search({
        query: query,
        fields: ['nombre_cliente'],
        filter: doc => {
          return doc.asesor === this.authService.asesorId // solo los del asesor en sesion
        },
        limit: 50,
        include_docs: true,
        highlighting: true
        // stale: 'update_after'
      })
    }

  }

  public indexDbClientes (): any {
    return this._db.search({
      fields: ['nombre_cliente'],
      filter: doc => {
        return doc.asesor === this.authService.asesorId // solo los del asesor en sesion
      },
      build: true
    })
  }

  public destroyDB (): void {
    this._db.destroy().then(() => {
      this._clientes = []
      console.log('database removed')
    })
    .catch(console.log.bind(console))
  }

  public fetchAndRenderAllDocs (): Promise<any> {

    return this._db.allDocs({
      include_docs: true
    }).then(res => {
      this._clientes = res.rows.map((row): Cliente => {
        return {
          _id            : row.doc._id,
          asesor         : row.doc.asesor,
          asesor_nombre  : row.doc.asesor_nombre,
          ciudad         : row.doc.ciudad,
          direccion      : row.doc.direccion,
          nombre_cliente : row.doc.nombre_cliente,
          transportadora : row.doc.transportadora,
          telefono       : row.doc.telefono,
          _rev           : row.doc._rev
        }
      })
      console.log('_all_docs clientes pouchDB', res.total_rows)
      return res
    })
  }

  /** *************** Manejo de el estado de la ui    ********************** */

  private _reactToChanges (d: WorkerRes): void {

    switch (d.event) {

      case 'deleted':
        // change.id holds the deleted id
        this._onDeleted(d.info.doc._id)
        break

      case 'upsert':
        // updated/inserted
        // change.doc holds the new doc
        this._onUpdatedOrInserted({
          _id              : d.info.doc._id,
          asesor         : d.info.doc.asesor,
          asesor_nombre  : d.info.doc.asesor_nombre,
          ciudad         : d.info.doc.ciudad,
          direccion      : d.info.doc.direccion,
          nombre_cliente : d.info.doc.nombre_cliente,
          transportadora : d.info.doc.transportadora,
          telefono       : d.info.doc.telefono,
          _rev           : d.info.doc._rev
        })
        break

      case 'error':
        console.error('Clientes- Error react to changes 🐛', d.info)
        Raven.captureException(new Error(`Clientes- Error react to changes 🐛: ${JSON.stringify(d.info)}`))
        break

      default:
        break
    }

  }

  private _onDeleted (id: string): void {
    let index: number = cg.binarySearch(this._clientes, '_id', id)
    let doc = this._clientes[index]
    if (doc && doc._id === id) {
      this._clientes.splice(index, 1)
    }
  }

  private _onUpdatedOrInserted (newDoc: Cliente): void {
    let index: number = cg.binarySearch(this._clientes, '_id', newDoc._id)
    let doc = this._clientes[index]
    if (doc && doc._id === newDoc._id) {
      // update
      this._clientes[index] = newDoc
    } else {
      // insert
      this._clientes.splice(index, 0, newDoc)
    }
  }
  // *********** Fin Manejo de el estado de la ui    **********************

  /**
   * Esta funcion se encarga de actualizar la posicion geografica del cliente
   * de esta forma puedo mostrar la ubicacion del cliente en un mapa de gmaps
   *
   * @param {any} id
   * @param {number} lat
   * @param {number} long
   * @param {number} accuracy
   * @returns {Promise<any>}
   * @memberof ClientesProvider
   */
  public async updateLocation (id, lat: number, long: number, accuracy: number): Promise<any> {
    /**
     * Bueno esto se ve complejo pero no lo es tanto, primero llamo la funcion
     * "doLocalFirst" que se encarga de ejcutar la funcion que se le manda como parametro
     * en la bd local, si algo falla al ejecutar la bd local entonces ejecuta la bd remota
     *
     * dentro de la funcion que se le pasa a "doLocalFirst" hago un upsert que me modifica el cliente
     */
    return this._doLocalFirst(db => {
      return this._upsert(db, id, (cliente: Cliente) => {
        cliente.ubicacion = {
          latitud: lat,
          longitud: long,
          accuracy: accuracy
        }
        cliente.updated_at = Date.now()
        return cliente
      })
    })

  }

  public async getClientesByIds (ids: any[]): Promise<any> {
    let res = await this._doLocalFirst(db => this._getManyByIds(db, ids))
    if (res && res.rows.length > 0) {
      return res.rows
    } else {
      return []
    }
  }

}
