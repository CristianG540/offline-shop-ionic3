import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SearchProdPage } from './search-prod';

@NgModule({
  declarations: [
    SearchProdPage,
  ],
  imports: [
    IonicPageModule.forChild(SearchProdPage),
  ],
})
export class SearchProdPageModule {}
