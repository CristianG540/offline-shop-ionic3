import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ProductoPage } from './producto';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [
    ProductoPage,
  ],
  imports: [
    IonicPageModule.forChild(ProductoPage),
    IonicImageLoader
  ],
})
export class ProductoPageModule {}
