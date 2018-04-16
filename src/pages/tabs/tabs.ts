import { Component } from '@angular/core';

import { CarritoProvider } from "../../providers/carrito/carrito";
import { AuthProvider } from '../../providers/auth/auth';

import { HomePage } from '../home/home';
import { OrdenesPage } from '../ordenes/ordenes'
import { IonicPage } from 'ionic-angular';


@IonicPage()
@Component({
  selector: 'page-tabs',
  templateUrl: 'tabs.html'
})
export class TabsPage {

  home: any = HomePage
  categorias: any = 'CategoriasPage'
  ordenes: any = OrdenesPage
  carrito: any = 'CarritoPage'
  buscar: any = 'SearchProdPage'
  clientes: any = 'ClientesPage'
  carteraPage = 'CarteraPage';

  constructor(
    private cartService: CarritoProvider,
    private authService: AuthProvider,
  ) {
  }

  public get itemsCart() : number {
    return this.cartService.carItems.length;
  }


}
