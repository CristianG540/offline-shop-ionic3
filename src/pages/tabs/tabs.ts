import { Component } from '@angular/core';
import { IonicPage, NavController } from 'ionic-angular';
import { CarritoProvider } from "../../providers/carrito/carrito";

@IonicPage()
@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html'
})
export class TabsPage {

  home = 'HomePage'
  categorias = 'CategoriasPage'
  ordenes = 'OrdenesPage'
  carrito = 'CarritoPage'
  buscar = 'SearchProdPage'

  constructor(
    public navCtrl: NavController,
    private cartService: CarritoProvider
  ) {
  }

  public get itemsCart() : number {
    return this.cartService.carItems.length;
  }


}
