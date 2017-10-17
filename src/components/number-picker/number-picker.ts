import {
  Component,
  Input,
  Output,
  EventEmitter
} from "@angular/core";

@Component({
  selector: 'number-picker',
  templateUrl: 'number-picker.html'
})
export class NumberPickerComponent {
  private _num: number = 1;

  @Input('min') private min: number = 1;
  @Input('max') private max: number;
  @Output() private numChange = new EventEmitter();

  constructor() {
  }

  private inputNumChange(event) {
    this.num = parseInt(event.target.value);
    /**
     * Tengo que usar este timeout por q por algun perro motivo de mierda
     * el angular no me actualiza el valor del input, ni usando ngZone ni usando
     * applicationRef
     */
    setTimeout(()=>{
      if ( (this.num <= this.min) || (!this.num) ) {
        this.num = this.min;
      } else if (this.num >= this.max) {
        this.num = this.max;
      }
      this.numChange.emit(this.num);
    }, 50)

  }

  /**
   * Esta funcion se encarga de sumar o restar el valor del picker
   * al presional el boton mas o el menos
   *
   * @private
   * @memberof NumberPickerComponent
   */
  private plusMinus(operation: string){
    (operation == "+") ? this._num++ : this._num--;
    this.numChange.emit(this.num);
  }

  /**
   * Esta funcion getter se encarga de revisar que el numero del picker
   * no este por encima ni por debajo del valor minimo y maximo
   * si esto pasa desactiva el boton pertinente o el input en si
   *
   * @private
   * @returns {*} Regresa un array de dos valores boleanos, el primer
   * valor es el correspondiente al boton de menos, y el segundo es el
   * correspondiente al boton de mas
   * @memberof NumberPickerComponent
   */
  public get btnState() : any {
    let minus: boolean = false;
    let plus: boolean = false;
    if ( (this.num <= this.min) || (!this.num) ) {
      minus = true;
    }
    if (this.num >= this.max) {
      plus = true;
    }
    return [minus, plus];
  }

  @Input()
  get num() {
    return JSON.parse(JSON.stringify(this._num));
  }

  set num(val) {
    this._num = val;
  }

}
