import { Component } from '@angular/core';
import {
  IonicPage,
  NavController,
  NavParams,
  ModalController
} from "ionic-angular";
import { FormGroup, FormArray, FormBuilder, Validators  } from "@angular/forms";

//Providers
import { CarritoProvider } from "../../providers/carrito/carrito";
import { ClientesProvider } from "../../providers/clientes/clientes";
import { OrdenProvider } from "../../providers/orden/orden";
import { ProductosProvider } from "../../providers/productos/productos";
import { Config as cg } from "../../providers/config/config";

//Models
import { Orden } from "../../providers/orden/models/orden";
import { CarItem } from '../../providers/carrito/models/carItem';

@IonicPage()
@Component({
  selector: 'page-confirmar-orden',
  templateUrl: 'confirmar-orden.html',
})
export class ConfirmarOrdenPage {

  private ordenForm: FormGroup;
  private newClient: FormGroup;
  private newClientFlag: boolean = false;

  constructor(
    public navCtrl: NavController,
    private modalCtrl: ModalController,
    public navParams: NavParams,
    private fb: FormBuilder,
    private cartServ: CarritoProvider,
    private clienteServ: ClientesProvider,
    private ordenServ: OrdenProvider,
    private prodServ: ProductosProvider,
    private util: cg
  ) {
  }

  //Runs when the page is about to enter and become the active page.
  ionViewWillLoad() {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.ordenForm = this.fb.group({
      observaciones: [''],
      cliente: ['', Validators.required]
    });

    this.newClient = this.fb.group({
      nombre: ['', Validators.required],
      codCliente: ['', Validators.required]
    })
  }

  showAddressModal () {
    let modal = this.modalCtrl.create("AutocompletePage");
    let me = this;
    modal.onDidDismiss(data => {
      if(data){
        this.ordenForm.controls['cliente'].setValue(data);
      }
    });
    modal.present();
  }

  private onSubmit(): void {
    let loading = this.util.showLoading();
    /**
     * recupero los items del carrito para guardarlos en la orden
     */
    let carItems: CarItem[] = this.cartServ.carItems;
    let orden: Orden;
    let observaciones = this.ordenForm.get('observaciones').value;

    /**
     * Si el cliente no es nuevo ya sea porque se sabia el nit y lo
     * ingreso manualmente o desde el buscador de clientes entonces recupero
     * la info desde el form de estandar y se la asigno a la orden
     */
    if (!this.newClientFlag && this.ordenForm.valid) {
      let form = JSON.parse(JSON.stringify(this.ordenForm.value));
      orden = {
        _id : Date.now().toString(),
        nitCliente: form.cliente,
        observaciones: observaciones,
        items: carItems,
        total: this.cartServ.totalPrice,
        estado: false,
        type: "orden"
      }
    }
    /**
     * Si le dio click a la opcion de nuevo cliente entonces oculto el buscador de clientes
     * y se despliega le formulario para clientes nuevos, que pide el nombre y el nit
     * recupero los datos y se los asigno a la orden
     */
    if (this.newClientFlag && this.newClient.valid) {
      let form = JSON.parse(JSON.stringify(this.newClient.value));
      orden = {
        _id : Date.now().toString(),
        newClient : form,
        observaciones: observaciones,
        items: carItems,
        total: this.cartServ.totalPrice,
        estado: false,
        type: "orden"
      }
    }

    /**
     * Guardo la orden en la base de datos
     */
    this.ordenServ.pushItem(orden)
      .then(res=>{
        // Actualizo la cantidad de los productos que se ordenaron
        return this.prodServ.updateQuantity(carItems)
      })
      .then(res=>{
        /** Vacio el carrito y envio el usuario al tab de ordenes */
        this.cartServ.destroyDB(true);
        this.navCtrl.popToRoot();
        this.navCtrl.parent.select(3);
        /** *** *** *** *** *** *** *** *** *** *** *** *** ***   */
        loading.dismiss();

        return this.ordenServ.sendOrdersSap();

      })
      .then(res=>{
        console.warn("RESPUESTA DE LAS ORDENES ", res);
      })
      .catch(err=>{
        debugger;
        this.util.errorHandler(err.message, err);
      })
  }

  /**
   * este getter lo uso en la vista de este pagina, se encarga de informar
   * el estado de los datos de la orden por asi decirlo, debido a que
   * se usan dos forms diferentes uno si el cliente es nuevo y otro si el
   * cliente es viejo, entonces esto me devuelve el estado del formulario activo
   * y asi puedo deshabilitar el boton de finalizar la orden si el fomrulario activo
   * es invalido
   *
   * @readonly
   * @type {boolean}
   * @memberof ConfirmarOrdenPage
   */
  public get formStatus() : boolean {
    if (this.newClientFlag) {
      return this.newClient.valid;
    }else{
      return this.ordenForm.valid;
    }
  }

}
