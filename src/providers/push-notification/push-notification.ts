import { Injectable } from '@angular/core';
import { OneSignal } from '@ionic-native/onesignal';
import { Platform } from 'ionic-angular';


@Injectable()
export class PushNotificationProvider {

  constructor(
    private platform: Platform,
    private oneSignal: OneSignal
  ) {
    console.log('Hello PushNotificationProvider Provider');
  }

  init () : void {

    if( this.platform.is('cordova') ){
      this.oneSignal.startInit('814e5429-29eb-47e5-907b-6d91f905e5b9', '87020249419');

      this.oneSignal.inFocusDisplaying(this.oneSignal.OSInFocusDisplayOption.InAppAlert);

      this.oneSignal.handleNotificationReceived().subscribe(() => {
        // do something when notification is received
      });

      this.oneSignal.handleNotificationOpened().subscribe(() => {
        // do something when a notification is opened
      });

      this.oneSignal.endInit();
    }

  }

}
