import { Injectable } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation';
import { Diagnostic } from '@ionic-native/diagnostic';
import { LocationAccuracy } from '@ionic-native/location-accuracy';

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

    this._isGpsEnabled = await this.diagnostic.isGpsLocationEnabled();
    if(this._isGpsEnabled){
      let geoRes = await this.geolocation.getCurrentPosition({
        maximumAge: 3000,
        timeout: 60000,
        enableHighAccuracy : true
      });
      this._coords = geoRes.coords;
      return this._coords;
    }else{

      let res = await this._askForTurnOnGps();
      debugger;
    }

  }

  private async _askForTurnOnGps(): Promise<any> {
    let canRequest: boolean = await this.locationAccuracy.canRequest();
    if (canRequest) {
      try {
        let res = await this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY)
        return res;
      } catch (error) {
        throw new Error('Ocurrio un error al solicitar el gps: '+JSON.stringify(error) );
      }
    } else {
      throw new Error('No se pudo obtener la unicacion, puede que el gps este apagado');
    }
  }

}
