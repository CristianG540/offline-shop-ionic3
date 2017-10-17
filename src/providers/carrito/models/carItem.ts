export class CarItem {
  constructor(
    public _id: string,
    public cantidad: number,
    public totalPrice?: number,
    public _rev?: string
  ) {}
}
