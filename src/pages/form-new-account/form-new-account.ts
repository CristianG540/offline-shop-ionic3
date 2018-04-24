import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { FormGroup, FormArray, FormBuilder, Validators  } from "@angular/forms";

@IonicPage()
@Component({
  selector: 'page-form-new-account',
  templateUrl: 'form-new-account.html',
})
export class FormNewAccountPage {

  private newAccountForm: FormGroup;

  constructor(
    private navCtrl: NavController,
    private navParams: NavParams,
    private fb: FormBuilder
  ) {
  }

  ionViewWillLoad() {
    this.newAccountForm = this.fb.group({
      nombre: ['', Validators.required],
      eMail: ['', Validators.required],
      nit: ['', Validators.required],
      telefono: ['', Validators.required],
      ciudad: ['', Validators.required],
      motivoContacto: ['no tengo usuario y contraseña', Validators.required],
      observacion: ['', Validators.required],
    })
  }

}
