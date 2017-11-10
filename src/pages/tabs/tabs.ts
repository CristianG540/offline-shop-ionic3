import { Component } from '@angular/core';
import { CarritoProvider } from "../../providers/carrito/carrito";

import { HomePage } from '../home/home';
import { IonicPage } from 'ionic-angular';

@IonicPage()
@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html'
})
export class TabsPage {

  home: any = HomePage
  categorias: any = 'CategoriasPage'
  ordenes: any = 'OrdenesPage'
  carrito: any = 'CarritoPage'
  buscar: any = 'SearchProdPage'

  constructor(
    private cartService: CarritoProvider
  ) {
  }

  public get itemsCart() : number {
    return this.cartService.carItems.length;
  }


}
