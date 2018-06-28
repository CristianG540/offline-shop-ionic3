import { Component } from '@angular/core'
import {
  IonicPage,
  NavParams
} from 'ionic-angular'

// Providers
import { ProductosProvider } from '../../providers/productos/productos'
import { Config } from '../../providers/config/config'

@IonicPage()
@Component({
  selector: 'page-categorias',
  templateUrl: 'categorias.html'
})
export class CategoriasPage {

  private productosCategoriaPage: string = 'ProductosCategoriaPage'

  constructor (
    private navParams: NavParams,
    private prodsService: ProductosProvider,
    private util: Config
  ) {}

  ionViewDidLoad () {
    this.prodsService.fetchCategorias()
      .catch(err => this.util.errorHandler(err.message, err))
  }

}
