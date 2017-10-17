import { CarItem } from "../../carrito/models/carItem";

export class Orden {
  constructor(
    public _id: string,
    public observaciones: string,
    public items: CarItem[],
    public total: number,
    public docEntry?: string, // Aqui va el id del pedido que sap me devuelve del webservice
    public nitCliente?: string,
    public newClient?: any, // Aqui meto el cliente nuevo en caso de que el perro exista
    public error?: string, // Si se presenta algun error al enviar la orden, aqui lo guardo para tener registro
    public estado: boolean = false, // Estado de la orden, esto me dice si ya fue enviada a SAP o si esta pendiente por enviar
    public type: string = "orden",
    public _rev?: string,
  ) {}
}
