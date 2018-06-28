/**
 *  Todo lo que hice en este archivo lo tome de un buen tutorial
 *  que pongo acontinuacion:
 *  https://gonehybrid.com/how-to-log-errors-in-your-ionic-2-app-with-sentry/
 *  basicamente lo que hago es cambiar el handler de errores de ionic por uno
 *  propio que se conecta con sentry para hacer un seguimiento de errores
 *  algo asi mas o menos se puede decir :p
 */

import Raven from 'raven-js'
import { IonicErrorHandler } from 'ionic-angular'

import { Config } from '../config/config'

Raven
  .config('https://fe7ba4a5cedd4b828f9c5e5ab35b8da0@sentry.io/239622', {
    release: Config.APP_VER,
    allowSecretKey: true,
    dataCallback: data => {
      if (data.culprit) {
        data.culprit = data.culprit.substring(data.culprit.lastIndexOf('/'))
      }

      let stacktrace =
        data.stacktrace ||
        (data.exception && data.exception.values[0].stacktrace)

      if (stacktrace) {
        stacktrace.frames.forEach(function (frame) {
          frame.filename = frame.filename.substring(
            frame.filename.lastIndexOf('/')
          )
        })
      }
    }
  })
  .install()

export class SentryErrorHandler extends IonicErrorHandler {

  handleError (err: any): void {
    super.handleError(err)

    try {
      Raven.captureException(err.originalError || err)
    } catch (e) {
      console.error(e)
    }
  }

}
