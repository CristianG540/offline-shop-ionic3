import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { OrdenesDetallePage } from './ordenes-detalle';
import { AccordionComponent } from '../../components/accordion/accordion';

@NgModule({
  declarations: [
    OrdenesDetallePage,
    AccordionComponent
  ],
  imports: [
    IonicPageModule.forChild(OrdenesDetallePage),
  ],
})
export class OrdenesDetallePageModule {}
