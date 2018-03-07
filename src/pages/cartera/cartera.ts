import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController } from 'ionic-angular';
import { FormGroup, FormArray, FormBuilder, Validators  } from "@angular/forms";

//Libs terceros
import _ from 'lodash';
import * as moment from 'moment';

//Providers
import { CarteraProvider } from '../../providers/cartera/cartera';
import { Config as cg} from '../../providers/config/config';

//Models
import { Cartera } from "../../providers/cartera/models/cartera_mdl";


@IonicPage()
@Component({
  selector: 'page-cartera',
  templateUrl: 'cartera.html',
})
export class CarteraPage {

  private searchForm: FormGroup;
  private carteraItems: Cartera[] = [];
  private totalCliente: number = 0;
  private loading: boolean = false;

  constructor(
    public viewCtrl: ViewController,
    public navCtrl: NavController,
    public navParams: NavParams,
    private fb: FormBuilder,
    private carteraServ: CarteraProvider,
    private util : cg,
  ) {}

  ionViewWillLoad() {
    this.initializeForm();
  }

  private initializeForm(): void {
    if(this.navParams.get('_id')){
      this.searchForm = this.fb.group({
        cliente: [this.navParams.get('_id'), Validators.required]
      });
      this.onSubmit();
    }else{
      this.searchForm = this.fb.group({
        cliente: ['', Validators.required]
      });
    }

  }

  private onSubmit(): void {
    let form = JSON.parse(JSON.stringify(this.searchForm.value));

    if(form.cliente){
      this.totalCliente = 0;
      this.loading = true;
      this.carteraServ.searchCartera(form.cliente).then(res=>{
        this.loading = false;

        this.carteraItems = _.chain(res.data)
          .map((row: any): Cartera => {
            this.totalCliente += parseInt(row.valor);
            row.valor = parseInt(row.valor);
            row.valor_total = parseInt(row.valor_total);
            row.fecha_emision = moment(row.fecha_emision).format("YYYY-MM-DD");
            row.fecha_vencimiento = moment(row.fecha_vencimiento).format("YYYY-MM-DD");
            return row;
          })
          .orderBy(['fecha_emision'], ['asc'])
          .value();

      }).catch( err => {
        this.loading = false;
        this.util.errorHandler(err.message, err);
      })
    }

  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

}
