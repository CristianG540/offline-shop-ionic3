import Raven from 'raven-js';
import { IonicErrorHandler } from 'ionic-angular';

Raven
  .config('https://fe7ba4a5cedd4b828f9c5e5ab35b8da0@sentry.io/239622')
  .install();

export class SentryErrorHandler extends IonicErrorHandler {

  handleError(err:any) : void {
    super.handleError(err);

    try {
      Raven.captureException(err.originalError || err);
    }
    catch(e) {
      console.error(e);
    }
  }

}
