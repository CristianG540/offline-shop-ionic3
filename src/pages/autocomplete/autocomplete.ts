import { Component, NgZone } from "@angular/core";
import { IonicPage, ViewController } from 'ionic-angular';
import _ from "lodash";

import { ClientesProvider } from "../../providers/clientes/clientes";
import { Config } from "../../providers/config/config";

@IonicPage()
@Component({
  selector: "page-autocomplete",
  templateUrl: "autocomplete.html"
})
export class AutocompletePage {
  private autocompleteItems;

  constructor(
    public viewCtrl: ViewController,
    private clienteServ: ClientesProvider,
    private util : Config,
    private zone: NgZone
  ) {
    this.autocompleteItems = [];
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  chooseItem(item: any) {
    this.viewCtrl.dismiss(item.nit);
  }

  updateSearch(ev: any) {
    let loading = this.util.showLoading();
    // set val to the value of the searchbar
    let val = ev.target.value;
    if (val == "") {
      loading.dismiss();
      this.autocompleteItems = [];
      return;
    }
    this.clienteServ.searchCliente(val)
      .then( res => {
        loading.dismiss();
        console.log("Resultados busqueda clientes",res)
        this.autocompleteItems = _.map(res.rows, (row: any) => {
          return {
            nit  : row.doc._id,
            name : row.highlighting.nombre_cliente.toLowerCase()
          }
        });
      })
      .catch(err => this.util.errorHandler(err.message, err, loading))
  }
}
