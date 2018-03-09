import { CarItem } from "../../carrito/models/carItem";

interface Coordenadas {
  lat: number,
  lon: number
}

export class Orden {
  constructor(
    public _id: string, // El id de la orden es un timestamp de esta forma garantizo q sea unico y diferente
    public observaciones: string,
    public items: CarItem[],
    public total: number,
    public transp?: number,
    public docEntry?: string, // Aqui va el id del pedido que sap me devuelve del webservice
    public nitCliente?: string,
    public newClient?: any, // Aqui meto el cliente nuevo en caso de que el perro exista
    public error?: string, // Si se presenta algun error al enviar la orden, aqui lo guardo para tener registro
    public estado: any = false, // Estado de la orden, esto me dice si ya fue enviada a SAP o si esta pendiente por enviar
    public type: string = "orden",
    public updated_at?: string , // bueno, guardo un timestamp de la ultima vez que se modifico la voltereta
    public _rev?: string,
    public location?: Coordenadas,
    public accuracy?: number
  ) {}
}
