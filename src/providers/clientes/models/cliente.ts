export class Cliente {
  constructor(
    public _id: string,
    public asesor: number,
    public asesor_nombre: string,
    public ciudad: string,
    public direccion: string,
    public nombre_cliente: string,
    public transportadora: number,
    public _rev?: string
  ) {}
}
