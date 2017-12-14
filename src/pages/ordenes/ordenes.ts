import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Events } from 'ionic-angular';

//Providers
import { OrdenProvider } from "../../providers/orden/orden";
import { Config } from '../../providers/config/config';

//Models
import { Orden } from '../../providers/orden/models/orden';

@IonicPage()
@Component({
  selector: 'page-ordenes',
  templateUrl: 'ordenes.html',
})
export class OrdenesPage {

  private appVer: string = Config.APP_VER;
  private ordenesDetallePage = 'OrdenesDetallePage';

  private _ordenes: Orden[] = [];

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private ordenServ: OrdenProvider,
    private evts: Events,
    private util: Config
  ) {
    /**
     * Antes para tener en tiempo real las ordenes lo que hacia era
     * usar el getter de las ordenes directamente en el for que las pinta
     * en la vista, el problema con eso es que por algun motivo tenia un
     * problema de rendimiento enorme, no paraba de llamar el getter
     * por lo q tome la desicion de usar los eventos en la pagina de las ordenes
     * y asignar a una variable local los valores del getter de esta manera el getter
     * solo se llama cuando se necesita y el performance aumenta mucho
     */
    this.evts.subscribe('orden:changed', (doc: Orden) => {
      this._ordenes = this.ordenServ.ordenesDesc;
    });
    this.evts.subscribe('orden:deleted', (doc: Orden) => {
      this._ordenes = this.ordenServ.ordenesDesc;
    });
  }

  ionViewDidEnter() {
    this._ordenes = this.ordenServ.ordenesDesc;
  }

  public iconOrden(orden: Orden) : string {
    if(orden.estado == "seen"){
      return 'eye'
    }
    if(orden.error){
      return 'warning'
    }
    return (orden.estado) ? 'checkmark' : 'time';
  }

  private trackById(index: number, orden: Orden): string {
    return orden._id;
  }


}
