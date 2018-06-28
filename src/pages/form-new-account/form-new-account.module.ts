import { NgModule } from '@angular/core'
import { IonicPageModule } from 'ionic-angular'
import { FormNewAccountPage } from './form-new-account'

@NgModule({
  declarations: [
    FormNewAccountPage
  ],
  imports: [
    IonicPageModule.forChild(FormNewAccountPage)
  ]
})
export class FormNewAccountPageModule {}
