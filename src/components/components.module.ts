import { NgModule } from '@angular/core';
import { NumberPickerComponent } from './number-picker/number-picker';
import { Autosize } from "./autosize/autosize";
import { AccordionComponent } from './accordion/accordion';
@NgModule({
  declarations: [NumberPickerComponent, Autosize,
    AccordionComponent],
  imports: [],
  exports: [NumberPickerComponent, Autosize,
    AccordionComponent]
})
export class ComponentsModule {}
