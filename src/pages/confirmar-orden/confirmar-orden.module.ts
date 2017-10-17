import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ConfirmarOrdenPage } from './confirmar-orden';
import { Autosize } from "../../components/autosize/autosize";
import { TooltipsModule } from 'ionic-tooltips';

@NgModule({
  declarations: [
    ConfirmarOrdenPage,
    Autosize
  ],
  imports: [
    IonicPageModule.forChild(ConfirmarOrdenPage),
    TooltipsModule
  ],
})
export class ConfirmarOrdenPageModule {}
