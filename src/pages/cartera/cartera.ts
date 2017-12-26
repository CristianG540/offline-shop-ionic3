import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { FormGroup, FormArray, FormBuilder, Validators  } from "@angular/forms";

@IonicPage()
@Component({
  selector: 'page-cartera',
  templateUrl: 'cartera.html',
})
export class CarteraPage {

  private searchForm: FormGroup;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    private fb: FormBuilder
  ) {}

  ionViewWillLoad() {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.searchForm = this.fb.group({
      cliente: ['', Validators.required]
    });
  }

  private onSubmit(): void {

  }

}
