import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ProductosCategoriaPage } from './productos-categoria';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [
    ProductosCategoriaPage,
  ],
  imports: [
    IonicPageModule.forChild(ProductosCategoriaPage),
    IonicImageLoader
  ],
})
export class ProductosCategoriaPageModule {}
