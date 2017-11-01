import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { OrdenesDetallePage } from './ordenes-detalle';
import { AccordionComponent } from '../../components/accordion/accordion';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [
    OrdenesDetallePage,
    AccordionComponent
  ],
  imports: [
    IonicPageModule.forChild(OrdenesDetallePage),
    IonicImageLoader
  ],
})
export class OrdenesDetallePageModule {}
