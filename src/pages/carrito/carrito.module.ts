import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { CarritoPage } from './carrito';
import { NumberPickerComponent } from "../../components/number-picker/number-picker";

@NgModule({
  declarations: [
    CarritoPage,
    NumberPickerComponent
  ],
  imports: [
    IonicPageModule.forChild(CarritoPage),
  ],
})
export class CarritoPageModule {}
