export class Cartera {
  constructor(
    public _id: string,
    public valor: number,
    public valor_total: number,
    public cod_cliente: string,
    public cod_vendedor: number,
    public fecha_emision: string,
    public fecha_vencimiento: string,
    public _rev?: string
  ) {}
}
