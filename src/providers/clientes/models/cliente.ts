interface Coordenadas {
  latitud: number,
  longitud: number,
  accuracy: number
}

export class Cliente {
  constructor(
    public _id: string,
    public asesor: number,
    public asesor_nombre: string,
    public ciudad: string,
    public direccion: string,
    public nombre_cliente: string,
    public transportadora: number,
    public telefono: string,
    public _rev?: string,
    public ubicacion?: Coordenadas, //Ubicacion en coordenadas del cliente
    public updated_at?: number
  ) {}
}
