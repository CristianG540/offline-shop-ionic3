import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, MenuController } from 'ionic-angular';
import { FormGroup, FormBuilder, Validators  } from "@angular/forms";

//Providers
import { AuthProvider } from '../../providers/auth/auth';
import { DbProvider } from "../../providers/db/db";
import { Config as cg } from "../../providers/config/config";
import { CarritoProvider } from '../../providers/carrito/carrito';


@IonicPage()
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
})
export class LoginPage {

  private loginForm: FormGroup;
  private username: string;
  private password: string;

  private backgroundImage = 'assets/img/background/background-3.jpg';

  constructor(
    private navCtrl: NavController,
    private menuCtrl: MenuController,
    private fb: FormBuilder,
    private navParams: NavParams,
    private authService: AuthProvider,
    private dbServ: DbProvider,
    private cartServ: CarritoProvider,
    private util: cg
  ) {
    this.menuCtrl.enable(false);
  }

  //Runs when the page is about to enter and become the active page.
  ionViewWillLoad() {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  private login(): void {
    let loading = this.util.showLoading();
    let formModel = JSON.parse(JSON.stringify(this.loginForm.value));
    let credentials = {
      username: formModel.username,
      password: formModel.password
    };

    this.authService.login(credentials)
    .then(res=>{
      console.log(res);
      this.dbServ.init(res.userDBs.supertest);
      this.cartServ.initDB();
      this.navCtrl.setRoot('TabsPage');
      return this.authService.getTokenJosefa();
    })
    .then( () => {
      loading.dismiss();
    } )
    .catch( err => this.util.errorHandler(err.message, err, loading) )
  }


  private loginJosefa(): void {
    let loading = this.util.showLoading();
    this.authService.getTokenJosefa()

    .catch(err=>{
      this.util.errorHandler(err.message, err, loading);
    })
  }

  private launchSignup(): void {
    this.navCtrl.push('SignupPage');
  }

}
