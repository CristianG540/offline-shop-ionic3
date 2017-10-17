import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';

//Providers
import { OrdenProvider } from "../../providers/orden/orden";

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

  ionViewDidLoad() {
    this.ordenServ.fetchAndRenderAllDocs()
      .catch(console.log.bind(console))
  }

  public deleteDB(): void {
    this.ordenServ.destroyDB();
  }


  public iconOrden(orden) : string {
    if(orden.error){
      return 'warning'
    }
    return (orden.estado) ? 'checkmark' : 'time';
  }


}
