import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SearchProdPage } from './search-prod';
import { IonicImageLoader } from 'ionic-image-loader';

@NgModule({
  declarations: [
    SearchProdPage,
  ],
  imports: [
    IonicPageModule.forChild(SearchProdPage),
    IonicImageLoader
  ],
})
export class SearchProdPageModule {}
