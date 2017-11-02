import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

//Providers
import { OrdenProvider } from "../../providers/orden/orden";

//Models
import { Orden } from '../../providers/orden/models/orden';

@IonicPage()
@Component({
  selector: 'page-ordenes',
  templateUrl: 'ordenes.html',
})
export class OrdenesPage {

  private ordenesDetallePage = 'OrdenesDetallePage';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private ordenServ: OrdenProvider
  ) {
  }

  public iconOrden(orden) : string {
    if(orden.error){
      return 'warning'
    }
    return (orden.estado) ? 'checkmark' : 'time';
  }

  private trackById(index: number, orden: Orden): string {
    return orden._id;
  }


}
