import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { CarritoPage } from './carrito';
import { NumberPickerComponent } from "../../components/number-picker/number-picker";
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [
    CarritoPage,
    NumberPickerComponent
  ],
  imports: [
    IonicPageModule.forChild(CarritoPage),
    IonicImageLoader
  ],
})
export class CarritoPageModule {}
