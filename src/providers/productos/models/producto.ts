export class Producto {
  constructor(
    public _id: string,
    public titulo: string,
    public aplicacion: string | null,
    public imagen: string,
    public categoria: string,
    public marcas: string,
    public unidad: string,
    public existencias: number,
    public precio: number,
    public _rev ?: string
  ) { }
}
