import { Component, NgZone } from '@angular/core'
import { IonicPage, ViewController, NavParams, NavController } from 'ionic-angular'
import _ from 'lodash'

import { ClientesProvider } from '../../providers/clientes/clientes'
import { Config } from '../../providers/config/config'

@IonicPage()
@Component({
  selector: 'page-autocomplete',
  templateUrl: 'autocomplete.html'
})
export class AutocompletePage {
  private autocompleteItems
  private clienteInfoPage = 'ClienteInfoPage'

  constructor (
    public viewCtrl: ViewController,
    private navParams: NavParams,
    private navCtrl: NavController,
    private clienteServ: ClientesProvider,
    private util: Config,
    private zone: NgZone
  ) {
    this.autocompleteItems = []
  }

  dismiss () {
    this.viewCtrl.dismiss()
  }

  chooseItem (item: any) {
    if (this.navParams.get('type') === 'page') {

      this.clienteServ.getClientesByIds([item.nit]).then(res => {
        this.navCtrl.push(this.clienteInfoPage, res[0].doc)
      }).catch(err => {
        console.error('error chooseItem() pages - autocomplete.ts', err)
        this.util.errorHandler(err.message, err)
      })

    } else {
      this.viewCtrl.dismiss(item)
    }
  }

  updateSearch (ev: any) {
    let loading = this.util.showLoading()
    // set val to the value of the searchbar
    let val = ev.target.value
    if (val === '') {
      loading.dismiss()
      this.autocompleteItems = []
      return
    }
    this.clienteServ.searchCliente(val)
      .then(res => {
        loading.dismiss()
        console.log('Resultados busqueda clientes',res)
        this.autocompleteItems = _.map(res.rows, (row: any) => {
          let name: string = _.has(row, 'highlighting') ? row.highlighting.nombre_cliente : row.doc.nombre_cliente
          return {
            nit    : row.doc._id,
            name   : name.toLowerCase() + ' - ' + row.doc._id,
            transp : row.doc.transportadora,
            data   : row.doc
          }
        })
      })
      .catch(err => this.util.errorHandler(err.message, err, loading))
  }
}
