import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Loading, LoadingController } from 'ionic-angular';

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
      password: this.password,
      confirmPassword: this.confirmPassword
    };

    this.authService.register(user)
    .then(res=>{
      console.log(res);
      this.loading.dismiss();
      this.dbServ.init(res.userDBs.supertest);
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
