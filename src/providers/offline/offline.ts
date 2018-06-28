export class OfflineUtils {
  protected _db: any
  protected _remoteDB: any
  // Esta variable se encarga de mostrar el estado de la bd en el menu
  public statusDB: boolean = false

  /************************ Metodos online First ***************************** */
  /**
   * Los metodos acontinuacion los uso para usar alguna clase de implementacion
   * de online first, lo q significa que primero intento consultar los datos
   * en la base de datos remota, pero si estos aun no estan disponibles, entonces
   * consulto la base de datos en local
   */

  protected async _doLocalFirst (dbFun) {
    // hit the remote DB first; if it 404s, then hit the local
    try {
      return await dbFun(this._remoteDB)
    } catch (err) {
      return dbFun(this._db)
    }
  }

  protected async _getManyByIds (db, ids): Promise<any> {
    if (! this.statusDB && !db._remote) {
      throw new Error('No se ha completado la replicacion')
    }
    let res = await db.allDocs({
      include_docs : true,
      keys         : ids
    })
    return res
  }

  protected async _upsert (db, id, callback): Promise<any> {
    if (!this.statusDB && !db._remote) {
      throw new Error('No se ha completado la replicacion')
    }
    // El cliente que recibe el callback es cliente que esta actualmente en la bd/couchdb
    let res = await db.upsert(id, callback)
    return res
  }

  /******************** FIN Metodos Offline First ***************************** */
}
