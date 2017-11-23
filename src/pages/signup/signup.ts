import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Loading, LoadingController } from 'ionic-angular';

//Libs terceros
import Raven from 'raven-js';

// Providers
import { DbProvider } from '../../providers/db/db';
import { AuthProvider } from '../../providers/auth/auth';

@IonicPage()
@Component({
  selector: 'page-signup',
  templateUrl: 'signup.html',
})
export class SignupPage {

  private name: string;
  private username: string;
  private asesor_id: number;
  private email: string;
  private password: string;
  private confirmPassword: string;

  private loading: Loading;

  constructor(
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private navParams: NavParams,
    private authService: AuthProvider,
    private dbServ: DbProvider
  ) {
  }

  private register(): void {
    this.showLoading();
    let user = {
      name: this.name,
      username: this.username,
      email: this.email,
      profile: {
        asesor_id: this.asesor_id,
        email: this.email
      },
      asesor_id: this.asesor_id,
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    this.authService.register(user)
    .then(res=>{
      console.log(res);
      this.loading.dismiss();

      this.dbServ.init(res.userDBs.supertest).then( info => {
        console.warn('DbAverno- First Replication complete');
      }).catch( err => {
        console.error("DbAverno-totally unhandled error (shouldn't happen)", err);
        Raven.captureException( new Error(`DbAverno- Error en la bd local no deberia pasar 😫: ${JSON.stringify(err)}`), {
          extra: err
        } );
      });;

      this.navCtrl.setRoot('TabsPage');
    }).catch(err=>{
      console.log(err);
      this.loading.dismiss();
    })

  }

  private showLoading(): void {
    this.loading = this.loadingCtrl.create({
      content: 'Loading...'
    });
    this.loading.present();
  }

}
