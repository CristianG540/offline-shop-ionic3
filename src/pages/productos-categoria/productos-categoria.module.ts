import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ProductosCategoriaPage } from './productos-categoria';

@NgModule({
  declarations: [
    ProductosCategoriaPage,
  ],
  imports: [
    IonicPageModule.forChild(ProductosCategoriaPage),
  ],
})
export class ProductosCategoriaPageModule {}
