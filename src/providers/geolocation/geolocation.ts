import { Injectable } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation';

@Injectable()
export class GeolocationProvider {

  constructor(
    private geolocation: Geolocation
  ) {}

}
