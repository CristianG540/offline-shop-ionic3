import { Injectable } from '@angular/core';
import { Geolocation, GeolocationOptions } from '@ionic-native/geolocation';
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
//Libs terceros
import _ from 'lodash';

@Injectable()
export class GeolocationProvider {
  private _isGpsEnabled: boolean;
  private _coords: Coordinates;
  constructor(
    private geolocation: Geolocation,
    private diagnostic: Diagnostic,
    private locationAccuracy: LocationAccuracy
  ) {}

  public async getCurrentPosition(): Promise<Coordinates> {
    let geoLocOpts: GeolocationOptions = {
      maximumAge: 3000,
      timeout: 20000,
      enableHighAccuracy : true
    };
    this._isGpsEnabled = await this.diagnostic.isGpsLocationEnabled();
    if(this._isGpsEnabled){

      let geoRes = await this.geolocation.getCurrentPosition(geoLocOpts);
      this._coords = geoRes.coords;

      if(this._coords.accuracy > 50){
        throw new Error("Por favor active el wifi y los datos antes de marcar la ubicacion.");
      }

      return this._coords;

    }else{
      let res = await this._askForTurnOnGps();
      if(_.has(res, 'code') && res.code == 1) {

        let geoRes = await this.geolocation.getCurrentPosition(geoLocOpts);
        this._coords = geoRes.coords;
        return this._coords;

      }else{
        throw new Error(`Error inesperado al recuperar la posicion: ${JSON.stringify(res)}`);
      }
    }

  }

  private async _askForTurnOnGps(): Promise<any> {
    let canRequest: boolean = await this.locationAccuracy.canRequest();
    if (canRequest) {
      let res = await this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY)
      return res;
    } else {
      throw new Error('No se pudo obtener la unicacion, puede que el gps este apagado');
    }
  }

}
