import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, AlertController } from 'ionic-angular';
import { FormGroup, FormArray, FormBuilder, Validators  } from "@angular/forms";

//libs terceros
import Raven from 'raven-js';

//Providers
import { AuthProvider } from '../../providers/auth/auth';
import { Config } from '../../providers/config/config';

@IonicPage()
@Component({
  selector: 'page-form-new-account',
  templateUrl: 'form-new-account.html',
})
export class FormNewAccountPage {

  private newAccountForm: FormGroup;

  constructor(
    private alertCtrl: AlertController,
    private navCtrl: NavController,
    private navParams: NavParams,
    private authServ: AuthProvider,
    private util: Config,
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
      observacion: [''],
    })
  }

  private enviar() {
    let loading = this.util.showLoading();
    let formModel = JSON.parse(JSON.stringify(this.newAccountForm.value));

    this.authServ.requestAccount({
      nombre      : formModel.nombre,
      email       : formModel.eMail,
      nit         : formModel.nit,
      telefono    : formModel.telefono,
      ciudad      : formModel.ciudad,
      motivo      : formModel.motivoContacto,
      observacion : formModel.observacion
    }).then( res => {
      this.util.showToast("La solicitud se ha enviado correctamente");
      console.log("data peticion cuenta: ", res);
      this.navCtrl.popToRoot();
      loading.dismiss();
    }).catch( err => {
      console.error("Error al solicitar la cuenta de usuario", err);
      this.alertCtrl.create({
        title: "Ocurrio un error 😫",
        message: JSON.stringify(err),
        buttons: ['Ok']
      }).present();
      Raven.captureException( new Error(`Error al solicitar la cuenta de usuario 😫: ${JSON.stringify(err)}`), {
        extra: err
      });
      loading.dismiss();
    })
  }

}
