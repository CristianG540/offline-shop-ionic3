import { Component } from '@angular/core'
import {
  IonicPage,
  NavController,
  ModalController,
  AlertController
} from 'ionic-angular'
import { FormGroup, FormBuilder, Validators } from '@angular/forms'

// Libs terceros
import _ from 'lodash'
import Raven from 'raven-js'

// Providers
import { CarritoProvider } from '../../providers/carrito/carrito'
import { OrdenProvider } from '../../providers/orden/orden'
import { ProductosProvider } from '../../providers/productos/productos'
import { GeolocationProvider } from '../../providers/geolocation/geolocation'
import { AuthProvider } from '../../providers/auth/auth'
import { Config as cg } from '../../providers/config/config'

// Models
import { Orden } from '../../providers/orden/models/orden'
import { CarItem } from '../../providers/carrito/models/carItem'

@IonicPage()
@Component({
  selector: 'page-confirmar-orden',
  templateUrl: 'confirmar-orden.html'
})
export class ConfirmarOrdenPage {

  private ordenForm: FormGroup
  private newClient: FormGroup
  private newClientFlag: boolean = false
  private transportadora: number

  constructor (
    private navCtrl: NavController,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private fb: FormBuilder,
    private authService: AuthProvider,
    private cartServ: CarritoProvider,
    private ordenServ: OrdenProvider,
    private prodServ: ProductosProvider,
    private geolocation: GeolocationProvider,
    private util: cg
  ) {
  }

  // Runs when the page is about to enter and become the active page.
  ionViewWillLoad () {
    this.initializeForm()
  }

  private initializeForm (): void {

    this.ordenForm = this.fb.group({
      observaciones: [''],
      cliente: [this.authService.nitCliente, Validators.required]
    })

    if (this.authService.nitCliente) {

      this.ordenForm = this.fb.group({
        observaciones: [''],
        cliente: ['C' + this.authService.nitCliente, Validators.required]
      })
    } else {

      this.ordenForm = this.fb.group({
        observaciones: [''],
        cliente: [this.authService.nitCliente, Validators.required]
      })
    }

    this.newClient = this.fb.group({
      nombre: ['', Validators.required],
      codCliente: ['', Validators.required]
    })
  }

  showAddressModal () {
    let modal = this.modalCtrl.create('AutocompletePage')
    modal.onDidDismiss(data => {
      if (data) {
        this.ordenForm.controls['cliente'].setValue(data.nit)
        this.transportadora = data.transp
      }
    })
    modal.present()
  }

  private onSubmit (): void {
    let loading = this.util.showLoading()

    // get current position
    this.geolocation.getCurrentPosition().then(pos => {

      this.procesarOrden({
        lat: pos.latitude,
        lon: pos.longitude,
        accuracy: pos.accuracy
      })
      loading.dismiss()
    }).catch((err) => {

      loading.dismiss()
      console.error('error gps', err)
      if (_.has(err, 'code') && err.code === 4 || err.code === 1) {
        this.alertCtrl.create({
          title: 'Error.',
          message: 'Por favor habilite el uso del gps, para poder marcar la posicion del pedido',
          buttons: ['Ok']
        }).present()

      } else {
        this.procesarOrden()
        console.error('GPS- Error al marcar la posicion de pedido 😫: ' + err)
        Raven.captureException(new Error(`GPS- Error al marcar la posicion de pedido 😫: ${JSON.stringify(err)}`), {
          extra: err
        })
      }
    })

  }

  /**
   * Se encarga de procesar la orden, enviarla a sap, guardarla en el registro en mysql
   * y guardarla en CouchDB
   *
   * @private
   * @param {any} [position=""] Recibe un objeto con la latitud, longitud y presicion sacada de la
   * posicion gps del celular, si no se ingresa el objeto el default es un objeto vacio
   * {
   *    lat: 213,
   *    lon: 321,
   *    accuracy : 20
   * }
   * @memberof ConfirmarOrdenPage
   */
  private procesarOrden (position: any = ''): void {

    let loading = this.util.showLoading()
    /**
     * recupero los items del carrito para guardarlos en la orden
     */
    let carItems: CarItem[] = this.cartServ.carItems
    let orden: Orden
    let observaciones = this.ordenForm.get('observaciones').value
    /**
     * Si el cliente no es nuevo ya sea porque se sabia el nit y lo
     * ingreso manualmente o desde el buscador de clientes entonces recupero
     * la info desde el form de estandar y se la asigno a la orden
     */
    if (!this.newClientFlag && this.ordenForm.valid) {

      let form = JSON.parse(JSON.stringify(this.ordenForm.value))
      orden = {
        _id : Date.now().toString(),
        nitCliente: form.cliente,
        observaciones: observaciones,
        items: carItems,
        total: this.cartServ.totalPrice,
        transp: this.transportadora,
        estado: false,
        type: 'orden',
        location: {
          lat : position.lat,
          lon : position.lon
        },
        accuracy: position.accuracy
      }
    }
    /**
     * Si le dio click a la opcion de nuevo cliente entonces oculto el buscador de clientes
     * y se despliega le formulario para clientes nuevos, que pide el nombre y el nit
     * recupero los datos y se los asigno a la orden
     */
    if (this.newClientFlag && this.newClient.valid) {

      let form = JSON.parse(JSON.stringify(this.newClient.value))
      orden = {
        _id : Date.now().toString(),
        newClient : form,
        observaciones: observaciones,
        items: carItems,
        total: this.cartServ.totalPrice,
        estado: false,
        type: 'orden',
        location: {
          lat : position.lat,
          lon : position.lon
        },
        accuracy: position.accuracy
      }
    }

    /**
     * Guardo la orden en la base de datos
     */
    this.ordenServ.pushItem(orden)
      .then(res => {

        // Actualizo la cantidad de los productos que se ordenaron
        return this.prodServ.updateQuantity(carItems)
      })
      .then(res => {

        /** Vacio el carrito y envio el usuario al tab de ordenes */
        this.cartServ.destroyDB(true)
        this.navCtrl.popToRoot()
        this.navCtrl.parent.select(5)
        /** *** *** *** *** *** *** *** *** *** *** *** *** ***   */

        loading.dismiss()

        return this.ordenServ.sendOrdersSap()

      })
      .then(responses => {

        let failOrders = _.filter(responses.apiRes, (res: any) => {
          return res.responseApi.code >= 400
        })
        if (failOrders.length > 0) {
          this.alertCtrl.create({
            title: 'Advertencia.',
            message: failOrders.length + ' ordenes no se han podido subir a sap, verifique su conexion a internet y vuelva a intentarlo',
            buttons: ['Ok']
          }).present()
        } else {
          this.alertCtrl.create({
            title: 'Info.',
            message: 'Las ordenes se subieron correctamente a sap.',
            buttons: ['Ok']
          }).present()
        }
      })
      .catch(err => {
        this.util.errorHandler(err.message, err)
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
  public get formStatus (): boolean {
    if (this.newClientFlag) {
      return this.newClient.valid
    } else {
      return this.ordenForm.valid
    }
  }

}
