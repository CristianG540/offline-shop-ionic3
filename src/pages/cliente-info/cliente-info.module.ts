import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ClienteInfoPage } from './cliente-info';

@NgModule({
  declarations: [
    ClienteInfoPage,
  ],
  imports: [
    IonicPageModule.forChild(ClienteInfoPage),
  ],
})
export class ClienteInfoPageModule {}
