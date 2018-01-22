import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ClienteInfoPage } from './cliente-info';
import { AgmCoreModule } from '@agm/core';
import { Config as cg } from "../../providers/config/config";

@NgModule({
  declarations: [
    ClienteInfoPage,
  ],
  imports: [
    IonicPageModule.forChild(ClienteInfoPage),
    AgmCoreModule.forRoot({
      apiKey: cg.G_MAPS_KEY
    })
  ],
})
export class ClienteInfoPageModule {}
