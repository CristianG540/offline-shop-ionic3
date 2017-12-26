import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ClientesPage } from './clientes';

@NgModule({
  declarations: [
    ClientesPage,
  ],
  imports: [
    IonicPageModule.forChild(ClientesPage),
  ],
})
export class ClientesPageModule {}
